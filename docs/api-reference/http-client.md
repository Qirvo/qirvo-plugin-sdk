# HTTP Client API

The HTTP Client API provides secure, permission-controlled access to external APIs and web services. This guide covers all HTTP capabilities, patterns, and best practices.

## Table of Contents

- [HTTP Client Interface](#http-client-interface)
- [Basic Requests](#basic-requests)
- [Advanced Features](#advanced-features)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)

## HTTP Client Interface

### PluginHTTPAPI Definition

```typescript
interface PluginHTTPAPI {
  get(url: string, options?: RequestInit): Promise<Response>;
  post(url: string, data: any, options?: RequestInit): Promise<Response>;
  put(url: string, data: any, options?: RequestInit): Promise<Response>;
  patch(url: string, data: any, options?: RequestInit): Promise<Response>;
  delete(url: string, options?: RequestInit): Promise<Response>;
  head(url: string, options?: RequestInit): Promise<Response>;
  request(url: string, options: RequestInit): Promise<Response>;
}
```

### Required Permissions

To use the HTTP Client, your plugin must declare the `network-access` permission:

```json
{
  "permissions": ["network-access"]
}
```

## Basic Requests

### GET Requests

```typescript
export default class HTTPPlugin extends BasePlugin {
  async fetchUserData(userId: string): Promise<any> {
    try {
      const response = await this.context.api.http.get(
        `https://api.example.com/users/${userId}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      this.log('error', 'Failed to fetch user data:', error);
      throw error;
    }
  }

  async fetchWithQueryParams(): Promise<any> {
    const url = new URL('https://api.example.com/search');
    url.searchParams.set('q', 'query string');
    url.searchParams.set('limit', '10');
    url.searchParams.set('offset', '0');
    
    const response = await this.context.api.http.get(url.toString());
    return await response.json();
  }
}
```

### POST Requests

```typescript
async createUser(userData: any): Promise<any> {
  const response = await this.context.api.http.post(
    'https://api.example.com/users',
    userData
  );
  
  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }
  
  return await response.json();
}

async uploadFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', 'documents');
  
  const response = await this.context.api.http.post(
    'https://api.example.com/upload',
    formData
  );
  
  return await response.json();
}
```

### PUT and PATCH Requests

```typescript
async updateUser(userId: string, userData: any): Promise<any> {
  // PUT - Replace entire resource
  const response = await this.context.api.http.put(
    `https://api.example.com/users/${userId}`,
    userData
  );
  
  return await response.json();
}

async partialUpdateUser(userId: string, updates: any): Promise<any> {
  // PATCH - Partial update
  const response = await this.context.api.http.patch(
    `https://api.example.com/users/${userId}`,
    updates
  );
  
  return await response.json();
}
```

### DELETE Requests

```typescript
async deleteUser(userId: string): Promise<void> {
  const response = await this.context.api.http.delete(
    `https://api.example.com/users/${userId}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to delete user: ${response.statusText}`);
  }
}
```

## Advanced Features

### Custom Headers

```typescript
async authenticatedRequest(apiKey: string): Promise<any> {
  const response = await this.context.api.http.get(
    'https://api.example.com/protected',
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-API-Version': '2.0',
        'User-Agent': 'Qirvo-Plugin/1.0'
      }
    }
  );
  
  return await response.json();
}

async postWithHeaders(data: any): Promise<any> {
  const response = await this.context.api.http.post(
    'https://api.example.com/data',
    data,
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-ID': crypto.randomUUID()
      }
    }
  );
  
  return await response.json();
}
```

### Request Timeouts

```typescript
async requestWithTimeout(url: string, timeoutMs: number = 5000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await this.context.api.http.get(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    
    throw error;
  }
}
```

### Response Handling

```typescript
async handleDifferentResponseTypes(url: string): Promise<any> {
  const response = await this.context.api.http.get(url);
  
  const contentType = response.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    return await response.json();
  } else if (contentType?.includes('text/')) {
    return await response.text();
  } else if (contentType?.includes('application/octet-stream')) {
    return await response.arrayBuffer();
  } else {
    return await response.blob();
  }
}

async getResponseMetadata(url: string): Promise<any> {
  const response = await this.context.api.http.get(url);
  
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    url: response.url,
    redirected: response.redirected,
    type: response.type,
    data: await response.json()
  };
}
```

### Streaming Responses

```typescript
async streamLargeResponse(url: string): Promise<void> {
  const response = await this.context.api.http.get(url);
  
  if (!response.body) {
    throw new Error('Response body is not readable');
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      await this.processChunk(chunk);
    }
  } finally {
    reader.releaseLock();
  }
}

private async processChunk(chunk: string): Promise<void> {
  // Process streaming data chunk
  this.log('debug', `Received chunk: ${chunk.length} bytes`);
}
```

## Authentication

### API Key Authentication

```typescript
class APIKeyAuthenticator {
  constructor(private apiKey: string) {}

  addAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Key': this.apiKey
    };
  }
}

// Usage
const auth = new APIKeyAuthenticator(config.apiKey);

const response = await this.context.api.http.get(
  'https://api.example.com/data',
  {
    headers: auth.addAuthHeaders({
      'Content-Type': 'application/json'
    })
  }
);
```

### OAuth 2.0 Flow

```typescript
class OAuth2Client {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  getAuthorizationUrl(scopes: string[]): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: crypto.randomUUID()
    });
    
    return `https://oauth.example.com/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string, httpClient: PluginHTTPAPI): Promise<string> {
    const response = await httpClient.post(
      'https://oauth.example.com/token',
      {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const tokenData = await response.json();
    return tokenData.access_token;
  }

  async refreshToken(refreshToken: string, httpClient: PluginHTTPAPI): Promise<string> {
    const response = await httpClient.post(
      'https://oauth.example.com/token',
      {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      }
    );
    
    const tokenData = await response.json();
    return tokenData.access_token;
  }
}
```

### JWT Token Management

```typescript
class JWTTokenManager {
  constructor(private storage: PluginStorage) {}

  async getValidToken(): Promise<string | null> {
    const token = await this.storage.get('jwt_token');
    const expiresAt = await this.storage.get('jwt_expires_at');
    
    if (!token || !expiresAt) {
      return null;
    }
    
    // Check if token is expired (with 5 minute buffer)
    if (Date.now() > (expiresAt - 300000)) {
      await this.clearToken();
      return null;
    }
    
    return token;
  }

  async storeToken(token: string, expiresIn: number): Promise<void> {
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    await this.storage.set('jwt_token', token);
    await this.storage.set('jwt_expires_at', expiresAt);
  }

  async clearToken(): Promise<void> {
    await this.storage.delete('jwt_token');
    await this.storage.delete('jwt_expires_at');
  }

  async makeAuthenticatedRequest(
    httpClient: PluginHTTPAPI,
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getValidToken();
    
    if (!token) {
      throw new Error('No valid authentication token available');
    }
    
    return await httpClient.request(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  }
}
```

## Error Handling

### Retry Logic

```typescript
class HTTPRetryClient {
  constructor(private httpClient: PluginHTTPAPI) {}

  async requestWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.httpClient.request(url, options);
        
        // Don't retry on client errors (4xx), only server errors (5xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }
        
        if (response.ok) {
          return response;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * delay;
        await this.sleep(delay + jitter);
        
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      }
    }
    
    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime &&
           (Date.now() - this.lastFailureTime.getTime()) >= this.recoveryTimeout;
  }
}

// Usage
const circuitBreaker = new CircuitBreaker(3, 30000);

const data = await circuitBreaker.execute(async () => {
  return await this.context.api.http.get('https://api.example.com/data');
});
```

### Error Classification

```typescript
class HTTPErrorHandler {
  static classifyError(response: Response): 'client' | 'server' | 'network' {
    if (response.status >= 400 && response.status < 500) {
      return 'client';
    } else if (response.status >= 500) {
      return 'server';
    } else {
      return 'network';
    }
  }

  static shouldRetry(response: Response): boolean {
    // Retry on server errors and specific client errors
    const retryableClientErrors = [408, 429]; // Timeout, Rate Limited
    const retryableServerErrors = [500, 502, 503, 504];
    
    return retryableClientErrors.includes(response.status) ||
           retryableServerErrors.includes(response.status);
  }

  static async handleError(response: Response): Promise<never> {
    const errorType = this.classifyError(response);
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorBody = await response.text();
      if (errorBody) {
        errorMessage += ` - ${errorBody}`;
      }
    } catch {
      // Ignore error reading body
    }
    
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.type = errorType;
    error.response = response;
    
    throw error;
  }
}
```

## Performance Optimization

### Request Caching

```typescript
class HTTPCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  async cachedRequest(
    url: string,
    options: RequestInit = {},
    ttl: number = 300000 // 5 minutes
  ): Promise<any> {
    const cacheKey = this.getCacheKey(url, options);
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    
    const response = await this.httpClient.request(url, options);
    const data = await response.json();
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    return data;
  }

  private getCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const headers = JSON.stringify(options.headers || {});
    const body = options.body || '';
    
    return `${method}:${url}:${headers}:${body}`;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

### Request Batching

```typescript
class BatchHTTPClient {
  private pendingRequests = new Map<string, Promise<any>>();

  async batchRequest(requests: Array<{ url: string; options?: RequestInit }>): Promise<any[]> {
    const promises = requests.map(({ url, options }) =>
      this.context.api.http.request(url, options || {})
    );
    
    const responses = await Promise.allSettled(promises);
    
    return responses.map(async (result, index) => {
      if (result.status === 'fulfilled') {
        try {
          return await result.value.json();
        } catch {
          return await result.value.text();
        }
      } else {
        throw new Error(`Request ${index} failed: ${result.reason}`);
      }
    });
  }

  async deduplicatedRequest(url: string, options: RequestInit = {}): Promise<any> {
    const key = `${options.method || 'GET'}:${url}`;
    
    if (this.pendingRequests.has(key)) {
      return await this.pendingRequests.get(key);
    }
    
    const promise = this.context.api.http.request(url, options)
      .then(response => response.json())
      .finally(() => {
        this.pendingRequests.delete(key);
      });
    
    this.pendingRequests.set(key, promise);
    return await promise;
  }
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot(); // Recursive call after waiting
      }
    }
    
    this.requests.push(now);
  }
}

class RateLimitedHTTPClient {
  private rateLimiter: RateLimiter;

  constructor(
    private httpClient: PluginHTTPAPI,
    maxRequests: number = 100,
    windowMs: number = 60000 // 1 minute
  ) {
    this.rateLimiter = new RateLimiter(maxRequests, windowMs);
  }

  async request(url: string, options: RequestInit = {}): Promise<Response> {
    await this.rateLimiter.waitForSlot();
    return await this.httpClient.request(url, options);
  }
}
```

## Best Practices

### Security
1. **Validate URLs**: Ensure URLs are from trusted domains
2. **Sanitize Data**: Clean input data before sending
3. **Use HTTPS**: Always prefer HTTPS over HTTP
4. **Secure Headers**: Include security headers in requests

### Performance
1. **Cache Responses**: Cache frequently requested data
2. **Use Compression**: Enable gzip/deflate compression
3. **Batch Requests**: Combine multiple requests when possible
4. **Rate Limiting**: Respect API rate limits

### Error Handling
1. **Retry Logic**: Implement exponential backoff
2. **Circuit Breakers**: Prevent cascading failures
3. **Timeout Handling**: Set appropriate timeouts
4. **Error Classification**: Handle different error types appropriately

### Monitoring
1. **Log Requests**: Log important HTTP operations
2. **Track Performance**: Monitor request latency
3. **Error Tracking**: Monitor error rates and types
4. **Usage Analytics**: Track API usage patterns

---

**Next**: [Event System](./event-system.md) for plugin communication documentation.
