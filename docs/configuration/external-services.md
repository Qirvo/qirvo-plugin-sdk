# External Services Integration

This guide covers how to integrate your Qirvo plugins with external APIs and third-party services securely and efficiently. Learn about authentication, rate limiting, error handling, and best practices.

## Table of Contents

- [Service Integration Overview](#service-integration-overview)
- [Authentication Methods](#authentication-methods)
- [Popular Service Integrations](#popular-service-integrations)
- [Rate Limiting & Quotas](#rate-limiting--quotas)
- [Error Handling](#error-handling)
- [Security Best Practices](#security-best-practices)

## Service Integration Overview

### Configuration Schema for External Services

Define external service configurations in your manifest:

```json
{
  "manifest_version": 1,
  "name": "Multi-Service Plugin",
  "permissions": ["network-access"],
  "configSchema": {
    "type": "object",
    "properties": {
      "services": {
        "type": "object",
        "title": "External Services",
        "properties": {
          "weather": {
            "type": "object",
            "title": "Weather Service",
            "properties": {
              "provider": {
                "type": "string",
                "enum": ["openweathermap", "weatherapi", "accuweather"],
                "title": "Weather Provider"
              },
              "apiKey": {
                "type": "string",
                "title": "API Key",
                "format": "password"
              },
              "units": {
                "type": "string",
                "enum": ["metric", "imperial", "kelvin"],
                "default": "metric"
              }
            },
            "required": ["provider", "apiKey"]
          }
        }
      }
    }
  }
}
```

### Service Manager Implementation

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

interface ServiceConfig {
  provider: string;
  apiKey?: string;
  credentials?: any;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export default class ExternalServicePlugin extends BasePlugin {
  private serviceManager: ServiceManager;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.serviceManager = new ServiceManager(context, this);
    
    // Initialize configured services
    const services = context.config.services || {};
    for (const [serviceName, config] of Object.entries(services)) {
      await this.serviceManager.registerService(serviceName, config as ServiceConfig);
    }
  }

  async onConfigChange(context: PluginRuntimeContext): Promise<void> {
    // Reinitialize services when configuration changes
    await this.serviceManager.updateServices(context.config.services || {});
  }
}

class ServiceManager {
  private services = new Map<string, ExternalService>();

  constructor(
    private context: PluginRuntimeContext,
    private plugin: BasePlugin
  ) {}

  async registerService(name: string, config: ServiceConfig): Promise<void> {
    const service = this.createService(name, config);
    this.services.set(name, service);
    
    // Test service connection
    try {
      await service.healthCheck();
      this.plugin.log('info', `Service ${name} registered successfully`);
    } catch (error) {
      this.plugin.log('error', `Failed to register service ${name}:`, error);
    }
  }

  async getService(name: string): Promise<ExternalService> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not registered`);
    }
    return service;
  }

  private createService(name: string, config: ServiceConfig): ExternalService {
    switch (name) {
      case 'weather':
        return new WeatherService(config, this.context, this.plugin);
      case 'github':
        return new GitHubService(config, this.context, this.plugin);
      default:
        return new GenericService(name, config, this.context, this.plugin);
    }
  }
}
```

## Authentication Methods

### API Key Authentication

```typescript
class ApiKeyService extends ExternalService {
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': `Qirvo-Plugin/${this.plugin.context.plugin.version}`,
      ...options.headers
    };

    const response = await this.context.api.http.request(url, {
      ...options,
      headers
    });

    return this.processResponse<T>(response);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/health');
      return true;
    } catch (error) {
      this.plugin.log('error', 'Health check failed:', error);
      return false;
    }
  }
}
```

### OAuth 2.0 Authentication

```typescript
class OAuthService extends ExternalService {
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiry?: Date;

  async authenticate(): Promise<void> {
    if (this.isTokenValid()) {
      return;
    }

    if (this.refreshToken) {
      await this.refreshAccessToken();
    } else {
      await this.performOAuthFlow();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await this.context.api.http.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.config.credentials.clientId,
        client_secret: this.config.credentials.clientSecret
      });

      const tokenData = await response.json();
      
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || this.refreshToken;
      this.tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);

      // Store tokens securely
      await this.storeTokens();
      
      this.plugin.log('info', 'Access token refreshed successfully');
    } catch (error) {
      this.plugin.log('error', 'Token refresh failed:', error);
      throw new Error('Authentication failed');
    }
  }

  private isTokenValid(): boolean {
    return this.accessToken && 
           this.tokenExpiry && 
           this.tokenExpiry > new Date();
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    await this.authenticate();

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await this.context.api.http.request(
      `${this.config.baseUrl}${endpoint}`,
      { ...options, headers }
    );

    return this.processResponse<T>(response);
  }
}
```

## Popular Service Integrations

### Weather Services

```typescript
class WeatherService extends ApiKeyService {
  constructor(config: ServiceConfig, context: PluginRuntimeContext, plugin: BasePlugin) {
    const baseUrls = {
      openweathermap: 'https://api.openweathermap.org/data/2.5',
      weatherapi: 'https://api.weatherapi.com/v1',
      accuweather: 'https://dataservice.accuweather.com'
    };

    super({
      ...config,
      baseUrl: baseUrls[config.provider] || config.baseUrl
    }, context, plugin);
  }

  async getCurrentWeather(location: string): Promise<WeatherData> {
    const cacheKey = `weather_${location}`;
    
    // Check cache first (weather data valid for 10 minutes)
    const cached = await this.getCached<WeatherData>(cacheKey, 10 * 60 * 1000);
    if (cached) {
      return cached;
    }

    let endpoint: string;
    let params: Record<string, string>;

    switch (this.config.provider) {
      case 'openweathermap':
        endpoint = '/weather';
        params = {
          q: location,
          appid: this.config.apiKey,
          units: this.config.units || 'metric'
        };
        break;
      
      case 'weatherapi':
        endpoint = '/current.json';
        params = {
          key: this.config.apiKey,
          q: location,
          aqi: 'no'
        };
        break;
      
      default:
        throw new Error(`Unsupported weather provider: ${this.config.provider}`);
    }

    const url = `${endpoint}?${new URLSearchParams(params)}`;
    const response = await this.makeRequest<any>(url);
    
    const weatherData = this.normalizeWeatherData(response.data);
    
    // Cache the result
    await this.setCached(cacheKey, weatherData, 10 * 60 * 1000);
    
    return weatherData;
  }

  private normalizeWeatherData(rawData: any): WeatherData {
    // Normalize different provider formats to a common structure
    switch (this.config.provider) {
      case 'openweathermap':
        return {
          temperature: rawData.main.temp,
          description: rawData.weather[0].description,
          humidity: rawData.main.humidity,
          windSpeed: rawData.wind.speed,
          location: rawData.name,
          timestamp: new Date()
        };
      
      case 'weatherapi':
        return {
          temperature: rawData.current.temp_c,
          description: rawData.current.condition.text,
          humidity: rawData.current.humidity,
          windSpeed: rawData.current.wind_kph,
          location: rawData.location.name,
          timestamp: new Date()
        };
      
      default:
        return rawData;
    }
  }
}

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  location: string;
  timestamp: Date;
}
```

### GitHub Integration

```typescript
class GitHubService extends ApiKeyService {
  constructor(config: ServiceConfig, context: PluginRuntimeContext, plugin: BasePlugin) {
    super({
      ...config,
      baseUrl: 'https://api.github.com'
    }, context, plugin);
  }

  async getRepositories(username: string): Promise<Repository[]> {
    const response = await this.makeRequest<Repository[]>(`/users/${username}/repos`);
    return response.data;
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    const response = await this.makeRequest<Repository>(`/repos/${owner}/${repo}`);
    return response.data;
  }

  async createIssue(owner: string, repo: string, issue: CreateIssueData): Promise<Issue> {
    const response = await this.makeRequest<Issue>(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      body: JSON.stringify(issue)
    });
    return response.data;
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    const headers = {
      'Authorization': `token ${this.config.apiKey}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': `Qirvo-Plugin/${this.plugin.context.plugin.version}`,
      ...options.headers
    };

    const response = await this.context.api.http.request(
      `${this.config.baseUrl}${endpoint}`,
      { ...options, headers }
    );

    // Handle GitHub rate limiting
    if (response.status === 403) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      if (resetTime) {
        const resetDate = new Date(parseInt(resetTime) * 1000);
        throw new Error(`Rate limit exceeded. Resets at ${resetDate.toISOString()}`);
      }
    }

    return this.processResponse<T>(response);
  }
}
```

## Rate Limiting & Quotas

### Rate Limiter Implementation

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  async waitForSlot(key: string): Promise<void> {
    while (!(await this.checkLimit(key))) {
      const requests = this.requests.get(key) || [];
      const oldestRequest = Math.min(...requests);
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}

// Usage in service
class RateLimitedService extends ExternalService {
  private rateLimiter: RateLimiter;

  constructor(config: ServiceConfig, context: PluginRuntimeContext, plugin: BasePlugin) {
    super(config, context, plugin);
    
    // Configure rate limiting based on service
    const limits = {
      github: { requests: 5000, window: 60 * 60 * 1000 }, // 5000/hour
      twitter: { requests: 300, window: 15 * 60 * 1000 },  // 300/15min
      default: { requests: 100, window: 60 * 1000 }        // 100/min
    };
    
    const limit = limits[config.provider] || limits.default;
    this.rateLimiter = new RateLimiter(limit.requests, limit.window);
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    const rateLimitKey = `${this.config.provider}_${this.config.apiKey?.slice(-4)}`;
    
    // Wait for rate limit slot
    await this.rateLimiter.waitForSlot(rateLimitKey);
    
    return await super.makeRequest<T>(endpoint, options);
  }
}
```

## Error Handling

### Service Error Handler

```typescript
class ServiceError extends Error {
  constructor(
    message: string,
    public type: string,
    public service: string,
    public operation: string,
    public retryable: boolean = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

class ServiceErrorHandler {
  static async handleError(error: any, service: string, operation: string): Promise<never> {
    let errorMessage = 'Unknown service error';
    let errorType = 'service_error';
    let retryable = false;

    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 400:
          errorMessage = 'Bad request - check your parameters';
          errorType = 'bad_request';
          break;
        case 401:
          errorMessage = 'Authentication failed - check your API key';
          errorType = 'auth_error';
          break;
        case 403:
          errorMessage = 'Access forbidden - insufficient permissions';
          errorType = 'permission_error';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded';
          errorType = 'rate_limit';
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporarily unavailable';
          errorType = 'service_unavailable';
          retryable = true;
          break;
      }
    }

    const serviceError = new ServiceError(errorMessage, errorType, service, operation, retryable);
    serviceError.originalError = error;
    
    throw serviceError;
  }
}
```

## Security Best Practices

### Secure Configuration Storage

```typescript
class SecureServiceConfig {
  constructor(private plugin: BasePlugin) {}

  async storeCredentials(service: string, credentials: any): Promise<void> {
    // Encrypt sensitive data before storage
    const encrypted = await this.encrypt(JSON.stringify(credentials));
    await this.plugin.setStorage(`credentials_${service}`, encrypted);
  }

  async getCredentials(service: string): Promise<any> {
    const encrypted = await this.plugin.getStorage(`credentials_${service}`);
    if (!encrypted) return null;
    
    const decrypted = await this.decrypt(encrypted);
    return JSON.parse(decrypted);
  }

  private async encrypt(data: string): Promise<string> {
    // In a real implementation, use proper encryption
    return btoa(data);
  }

  private async decrypt(data: string): Promise<string> {
    return atob(data);
  }
}
```

### Input Validation

```typescript
class InputValidator {
  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .substring(0, 1000);
  }

  static validateApiKey(service: string, apiKey: string): boolean {
    const patterns = {
      github: /^ghp_[a-zA-Z0-9]{36}$/,
      slack: /^xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+$/,
      weather: /^[a-zA-Z0-9]{16,}$/
    };

    const pattern = patterns[service];
    return pattern ? pattern.test(apiKey) : apiKey.length >= 8;
  }
}
```

This comprehensive guide provides everything needed to integrate external services securely and efficiently in your Qirvo plugins.

---

**Next**: [Plugin Lifecycle](../guides/plugin-lifecycle.md) for understanding plugin lifecycle management.
