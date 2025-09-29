# Code Quality Best Practices

This guide establishes standards for writing clean, maintainable, and robust Qirvo plugins. Following these practices ensures code consistency, readability, and long-term maintainability.

## Table of Contents

- [Code Organization](#code-organization)
- [TypeScript Standards](#typescript-standards)
- [Naming Conventions](#naming-conventions)
- [Documentation Standards](#documentation-standards)
- [Testing Strategies](#testing-strategies)
- [Code Review Guidelines](#code-review-guidelines)

## Code Organization

### Project Structure

```markdown
src/
├── index.ts                 # Main plugin entry point
├── types/
│   ├── index.ts            # Type definitions
│   ├── api.ts              # API-related types
│   └── config.ts           # Configuration types
├── components/
│   ├── widgets/            # UI widgets
│   ├── forms/              # Form components
│   └── common/             # Shared components
├── services/
│   ├── api.ts              # API service layer
│   ├── storage.ts          # Storage abstraction
│   └── cache.ts            # Caching service
├── utils/
│   ├── validation.ts       # Input validation
│   ├── formatting.ts       # Data formatting
│   └── helpers.ts          # General utilities
├── hooks/                  # Custom React hooks (if applicable)
├── constants/
│   ├── api.ts              # API endpoints
│   ├── config.ts           # Configuration constants
│   └── messages.ts         # User messages
└── __tests__/              # Test files
    ├── unit/
    ├── integration/
    └── fixtures/
```

### Module Organization

```typescript
// ✅ Good: Clear module structure
// services/weatherService.ts
export interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
}

export interface WeatherServiceConfig {
  apiKey: string;
  units: 'metric' | 'imperial';
  timeout: number;
}

export class WeatherService {
  constructor(private config: WeatherServiceConfig) {}
  
  async getCurrentWeather(location: string): Promise<WeatherData> {
    // Implementation
  }
}

// Export factory function for easy testing
export const createWeatherService = (config: WeatherServiceConfig): WeatherService => {
  return new WeatherService(config);
};
```

### Dependency Injection

```typescript
// ✅ Good: Dependency injection for testability
export interface PluginDependencies {
  weatherService: WeatherService;
  storageService: StorageService;
  logger: Logger;
}

export default class WeatherPlugin extends BasePlugin {
  constructor(private dependencies: PluginDependencies) {
    super();
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    const weather = await this.dependencies.weatherService.getCurrentWeather('London');
    await this.dependencies.storageService.set('lastWeather', weather);
    this.dependencies.logger.info('Weather data updated');
  }
}

// Factory function for production
export const createWeatherPlugin = (context: PluginRuntimeContext): WeatherPlugin => {
  const dependencies: PluginDependencies = {
    weatherService: createWeatherService(context.config.weather),
    storageService: createStorageService(context.storage),
    logger: createLogger(context.plugin.name)
  };
  
  return new WeatherPlugin(dependencies);
};
```

## TypeScript Standards

### Strict Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Type Definitions

```typescript
// ✅ Good: Comprehensive type definitions
export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly notifications: boolean;
  readonly refreshInterval: number;
  readonly language: string;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly message?: string;
  readonly timestamp: string;
}

export type PluginState = 
  | 'uninstalled'
  | 'installed' 
  | 'enabled'
  | 'disabled'
  | 'error';

// Use branded types for IDs
export type UserId = string & { readonly __brand: 'UserId' };
export type PluginId = string & { readonly __brand: 'PluginId' };

// Utility types for better API design
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

### Generic Constraints

```typescript
// ✅ Good: Proper generic constraints
export interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

export class PluginRepository<T extends BasePlugin> implements Repository<T> {
  async findById(id: string): Promise<T | null> {
    // Implementation
    return null;
  }

  async save(plugin: T): Promise<T> {
    // Implementation
    return plugin;
  }

  async delete(id: string): Promise<void> {
    // Implementation
  }
}

// Type-safe event system
export interface EventMap {
  'user:login': { userId: UserId; timestamp: Date };
  'plugin:installed': { pluginId: PluginId; version: string };
  'data:updated': { type: string; count: number };
}

export class TypedEventEmitter<T extends Record<string, any>> {
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    // Implementation
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    // Implementation
  }
}
```

## Naming Conventions

### Variables and Functions

```typescript
// ✅ Good: Descriptive names
const maxRetryAttempts = 3;
const apiResponseTimeout = 5000;
const userPreferencesCache = new Map<UserId, UserPreferences>();

async function fetchUserPreferences(userId: UserId): Promise<UserPreferences> {
  // Implementation
}

function validateEmailAddress(email: string): boolean {
  // Implementation
  return true;
}

function calculateTotalPrice(items: CartItem[], taxRate: number): number {
  // Implementation
  return 0;
}

// ❌ Bad: Unclear names
const max = 3;
const timeout = 5000;
const cache = new Map();

async function fetch(id: string): Promise<any> {
  // What are we fetching?
}

function validate(input: string): boolean {
  // Validate what?
}

function calc(items: any[], rate: number): number {
  // Calculate what?
}
```

### Classes and Interfaces

```typescript
// ✅ Good: Clear, descriptive names
export interface WeatherApiClient {
  getCurrentWeather(location: string): Promise<WeatherData>;
  getForecast(location: string, days: number): Promise<ForecastData[]>;
}

export class HttpWeatherApiClient implements WeatherApiClient {
  constructor(private apiKey: string, private baseUrl: string) {}
  
  async getCurrentWeather(location: string): Promise<WeatherData> {
    // Implementation
  }
  
  async getForecast(location: string, days: number): Promise<ForecastData[]> {
    // Implementation
  }
}

export abstract class BaseDataProcessor<TInput, TOutput> {
  abstract process(input: TInput): Promise<TOutput>;
  
  protected validateInput(input: TInput): void {
    // Common validation logic
  }
}

export class JsonDataProcessor extends BaseDataProcessor<string, object> {
  async process(jsonString: string): Promise<object> {
    this.validateInput(jsonString);
    return JSON.parse(jsonString);
  }
}
```

### Constants and Enums

```typescript
// ✅ Good: Descriptive constants
export const API_ENDPOINTS = {
  WEATHER: '/api/weather',
  FORECAST: '/api/forecast',
  LOCATIONS: '/api/locations'
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes
  LONG: 24 * 60 * 60 * 1000  // 24 hours
} as const;

// Use string enums for better debugging
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum PluginType {
  DASHBOARD_WIDGET = 'dashboard-widget',
  CLI_TOOL = 'cli-tool',
  BACKGROUND_SERVICE = 'background-service',
  HYBRID = 'hybrid'
}
```

## Documentation Standards

### JSDoc Comments

```typescript
/**
 * Retrieves weather data for a specific location with caching support.
 * 
 * @param location - The location to get weather for (city name or coordinates)
 * @param options - Configuration options for the request
 * @param options.units - Temperature units ('metric' | 'imperial')
 * @param options.useCache - Whether to use cached data if available
 * @param options.timeout - Request timeout in milliseconds
 * @returns Promise that resolves to weather data
 * 
 * @throws {ValidationError} When location format is invalid
 * @throws {ApiError} When the weather API request fails
 * @throws {TimeoutError} When the request times out
 * 
 * @example
 * ```typescript
 * const weather = await getWeatherData('London', {
 *   units: 'metric',
 *   useCache: true,
 *   timeout: 5000
 * });
 * console.log(`Temperature: ${weather.temperature}°C`);
 * ```
 * 
 * @since 1.2.0
 */
export async function getWeatherData(
  location: string,
  options: WeatherOptions = {}
): Promise<WeatherData> {
  // Implementation
}

/**
 * Configuration options for weather data requests.
 */
export interface WeatherOptions {
  /** Temperature units to use in the response */
  units?: 'metric' | 'imperial';
  
  /** Whether to use cached data if available (default: true) */
  useCache?: boolean;
  
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Weather data response from the API.
 */
export interface WeatherData {
  /** Current temperature in the requested units */
  temperature: number;
  
  /** Weather description (e.g., "Partly cloudy") */
  description: string;
  
  /** Humidity percentage (0-100) */
  humidity: number;
  
  /** Wind speed in the requested units */
  windSpeed: number;
  
  /** Location name as returned by the API */
  location: string;
  
  /** Timestamp when the data was retrieved */
  timestamp: Date;
}
```

### README Documentation

```markdown
# Weather Plugin

A comprehensive weather plugin for Qirvo that provides current weather data and forecasts.

## Features

- ✅ Current weather conditions
- ✅ 5-day weather forecast
- ✅ Multiple location support
- ✅ Caching for performance
- ✅ Customizable units (metric/imperial)
- ✅ Error handling and retry logic

## Installation

```bash
npm install @qirvo/weather-plugin
```

## Configuration

```json
{
  "weather": {
    "apiKey": "your-api-key",
    "units": "metric",
    "cacheTimeout": 300000,
    "locations": ["London", "New York", "Tokyo"]
  }
}
```

## Usage

### Basic Usage

```typescript
import WeatherPlugin from '@qirvo/weather-plugin';

const plugin = new WeatherPlugin(config);
await plugin.onEnable(context);

const weather = await plugin.getCurrentWeather('London');
console.log(`Temperature: ${weather.temperature}°C`);
```

### Advanced Usage

```typescript
// Get forecast with custom options
const forecast = await plugin.getForecast('New York', {
  days: 7,
  includeHourly: true,
  units: 'imperial'
});
```

## API Reference

### Methods

#### `getCurrentWeather(location: string): Promise<WeatherData>`

Retrieves current weather data for the specified location.

**Parameters:**
- `location` - City name or coordinates (lat,lng)

**Returns:**
- Promise resolving to current weather data

**Throws:**
- `ValidationError` - Invalid location format
- `ApiError` - API request failed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Testing Strategies

### Unit Testing

```typescript
// __tests__/weatherService.test.ts
import { WeatherService } from '../services/weatherService';
import { HttpClient } from '../utils/httpClient';

// Mock dependencies
jest.mock('../utils/httpClient');
const mockHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

describe('WeatherService', () => {
  let weatherService: WeatherService;
  let mockHttp: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttp = new mockHttpClient() as jest.Mocked<HttpClient>;
    weatherService = new WeatherService({
      apiKey: 'test-key',
      httpClient: mockHttp
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentWeather', () => {
    it('should return weather data for valid location', async () => {
      // Arrange
      const mockResponse = {
        temperature: 20,
        description: 'Sunny',
        humidity: 60
      };
      mockHttp.get.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await weatherService.getCurrentWeather('London');

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockHttp.get).toHaveBeenCalledWith('/weather', {
        params: { q: 'London', appid: 'test-key' }
      });
    });

    it('should throw ValidationError for empty location', async () => {
      // Act & Assert
      await expect(weatherService.getCurrentWeather(''))
        .rejects
        .toThrow('Location cannot be empty');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockHttp.get.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(weatherService.getCurrentWeather('London'))
        .rejects
        .toThrow('Failed to fetch weather data');
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/pluginIntegration.test.ts
import { WeatherPlugin } from '../../src';
import { createTestContext } from '../fixtures/testContext';

describe('WeatherPlugin Integration', () => {
  let plugin: WeatherPlugin;
  let context: PluginRuntimeContext;

  beforeEach(async () => {
    context = createTestContext({
      config: {
        apiKey: process.env.TEST_API_KEY || 'test-key',
        units: 'metric'
      }
    });
    
    plugin = new WeatherPlugin();
    await plugin.onInstall(context);
  });

  afterEach(async () => {
    await plugin.onUninstall();
  });

  it('should initialize and fetch weather data', async () => {
    // Act
    await plugin.onEnable(context);
    const weather = await plugin.getCurrentWeather('London');

    // Assert
    expect(weather).toBeDefined();
    expect(weather.temperature).toBeTypeOf('number');
    expect(weather.location).toBe('London');
  });

  it('should cache weather data correctly', async () => {
    // Act
    await plugin.onEnable(context);
    
    const weather1 = await plugin.getCurrentWeather('London');
    const weather2 = await plugin.getCurrentWeather('London');

    // Assert - Second call should be from cache
    expect(weather1).toEqual(weather2);
    expect(plugin.getCacheStats().hits).toBe(1);
  });
});
```

### Test Utilities

```typescript
// __tests__/fixtures/testContext.ts
export function createTestContext(overrides: Partial<PluginRuntimeContext> = {}): PluginRuntimeContext {
  return {
    plugin: {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      permissions: []
    },
    config: {},
    storage: createMockStorage(),
    api: createMockApi(),
    user: {
      id: 'test-user',
      email: 'test@example.com'
    },
    logger: createMockLogger(),
    bus: createMockEventBus(),
    ...overrides
  };
}

function createMockStorage(): PluginStorage {
  const storage = new Map<string, any>();
  
  return {
    get: jest.fn((key: string) => Promise.resolve(storage.get(key))),
    set: jest.fn((key: string, value: any) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    delete: jest.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    keys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
    clear: jest.fn(() => {
      storage.clear();
      return Promise.resolve();
    })
  };
}
```

## Code Review Guidelines

### Review Checklist

#### ✅ **Code Quality**
- [ ] Code follows TypeScript strict mode
- [ ] Proper error handling implemented
- [ ] No unused variables or imports
- [ ] Consistent naming conventions
- [ ] Appropriate use of types and interfaces

#### ✅ **Architecture**
- [ ] Single responsibility principle followed
- [ ] Dependencies properly injected
- [ ] Appropriate abstraction levels
- [ ] No circular dependencies
- [ ] Clean separation of concerns

#### ✅ **Performance**
- [ ] No obvious performance bottlenecks
- [ ] Appropriate caching strategies
- [ ] Memory leaks prevented
- [ ] Efficient algorithms used
- [ ] Bundle size considerations

#### ✅ **Security**
- [ ] Input validation implemented
- [ ] No hardcoded secrets
- [ ] Proper permission checks
- [ ] XSS prevention measures
- [ ] Secure communication protocols

#### ✅ **Testing**
- [ ] Unit tests cover critical paths
- [ ] Integration tests for main workflows
- [ ] Edge cases tested
- [ ] Mocks used appropriately
- [ ] Test coverage meets requirements

#### ✅ **Documentation**
- [ ] JSDoc comments for public APIs
- [ ] README updated if needed
- [ ] Breaking changes documented
- [ ] Examples provided
- [ ] Migration guide if applicable

### Review Process

1. **Automated Checks**: Ensure all CI checks pass
2. **Code Review**: At least one team member reviews
3. **Testing**: Manual testing of new features
4. **Documentation**: Verify documentation is updated
5. **Security Review**: Check for security implications
6. **Performance Review**: Assess performance impact

This comprehensive code quality guide ensures your Qirvo plugins maintain high standards of code quality, readability, and maintainability throughout their development lifecycle.

---

**Next**: [UX Best Practices](./ux-best-practices.md)
