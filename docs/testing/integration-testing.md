# Integration Testing Guide

Integration testing ensures that different parts of your plugin work together correctly. This guide covers testing strategies for API integrations, database interactions, and end-to-end workflows.

## Table of Contents

- [Integration Test Setup](#integration-test-setup)
- [API Integration Testing](#api-integration-testing)
- [Database Integration Testing](#database-integration-testing)
- [Plugin Runtime Testing](#plugin-runtime-testing)
- [End-to-End Workflows](#end-to-end-workflows)
- [Test Environment Management](#test-environment-management)

## Integration Test Setup

### Test Environment Configuration

```typescript
// tests/integration/setup.ts
import { PluginRuntimeContext } from '@qirvo/plugin-sdk';

export interface TestEnvironment {
  context: PluginRuntimeContext;
  cleanup: () => Promise<void>;
}

export async function createTestEnvironment(): Promise<TestEnvironment> {
  // Create test storage
  const testStorage = new Map<string, any>();
  
  // Create mock context
  const context: PluginRuntimeContext = {
    plugin: {
      id: 'weather-test',
      name: 'Weather Plugin Test',
      version: '1.0.0',
      permissions: ['network-access', 'storage-read', 'storage-write']
    },
    config: {
      apiKey: process.env.TEST_API_KEY || 'test-api-key',
      baseUrl: process.env.TEST_API_URL || 'https://api.test-weather.com'
    },
    storage: {
      get: async (key: string) => testStorage.get(key),
      set: async (key: string, value: any) => { testStorage.set(key, value); },
      delete: async (key: string) => { testStorage.delete(key); },
      keys: async () => Array.from(testStorage.keys()),
      clear: async () => { testStorage.clear(); }
    },
    user: {
      id: 'test-user-123',
      email: 'test@example.com'
    },
    api: {
      http: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
      }
    }
  };

  const cleanup = async () => {
    testStorage.clear();
    jest.clearAllMocks();
  };

  return { context, cleanup };
}
```

### Test Database Setup

```typescript
// tests/integration/database.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

export class TestDatabase {
  private mongoServer?: MongoMemoryServer;
  private client?: MongoClient;
  private db?: Db;

  async start(): Promise<void> {
    this.mongoServer = await MongoMemoryServer.create();
    const uri = this.mongoServer.getUri();
    
    this.client = new MongoClient(uri);
    await this.client.connect();
    
    this.db = this.client.db('test-plugin-db');
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not initialized. Call start() first.');
    }
    return this.db;
  }

  async seedData(collection: string, data: any[]): Promise<void> {
    const db = this.getDb();
    await db.collection(collection).insertMany(data);
  }

  async clearData(collection: string): Promise<void> {
    const db = this.getDb();
    await db.collection(collection).deleteMany({});
  }
}
```

## API Integration Testing

### HTTP Client Integration

```typescript
// src/services/httpClient.ts
export class HttpClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

```typescript
// tests/integration/httpClient.test.ts
import { HttpClient } from '../../src/services/httpClient';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock server setup
const server = setupServer(
  rest.get('https://api.test-weather.com/current', (req, res, ctx) => {
    const location = req.url.searchParams.get('location');
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }

    if (!location) {
      return res(ctx.status(400), ctx.json({ error: 'Location required' }));
    }

    return res(ctx.json({
      temperature: 22,
      description: 'Sunny',
      location: location
    }));
  }),

  rest.post('https://api.test-weather.com/alerts', (req, res, ctx) => {
    return res(ctx.json({ id: 'alert-123', status: 'created' }));
  })
);

describe('HttpClient Integration', () => {
  let client: HttpClient;

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    client = new HttpClient('https://api.test-weather.com', 'test-api-key');
  });

  describe('GET requests', () => {
    it('should make successful GET request with parameters', async () => {
      const result = await client.get('/current', { location: 'London' });

      expect(result).toEqual({
        temperature: 22,
        description: 'Sunny',
        location: 'London'
      });
    });

    it('should handle authentication errors', async () => {
      const unauthorizedClient = new HttpClient('https://api.test-weather.com', '');

      await expect(client.get('/current', { location: 'London' }))
        .rejects
        .toThrow('HTTP 401: Unauthorized');
    });

    it('should handle validation errors', async () => {
      await expect(client.get('/current'))
        .rejects
        .toThrow('HTTP 400: Bad Request');
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const alertData = { location: 'London', type: 'storm' };
      
      const result = await client.post('/alerts', alertData);

      expect(result).toEqual({
        id: 'alert-123',
        status: 'created'
      });
    });
  });
});
```

### Rate Limiting Integration

```typescript
// src/services/rateLimiter.ts
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  async waitForSlot(): Promise<void> {
    while (!(await this.checkLimit())) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

```typescript
// tests/integration/rateLimiter.test.ts
import { RateLimiter } from '../../src/services/rateLimiter';

describe('RateLimiter Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow requests within limit', async () => {
    const limiter = new RateLimiter(3, 1000); // 3 requests per second

    expect(await limiter.checkLimit()).toBe(true);
    expect(await limiter.checkLimit()).toBe(true);
    expect(await limiter.checkLimit()).toBe(true);
  });

  it('should block requests exceeding limit', async () => {
    const limiter = new RateLimiter(2, 1000); // 2 requests per second

    expect(await limiter.checkLimit()).toBe(true);
    expect(await limiter.checkLimit()).toBe(true);
    expect(await limiter.checkLimit()).toBe(false);
  });

  it('should reset limit after window expires', async () => {
    const limiter = new RateLimiter(2, 1000);

    // Use up the limit
    await limiter.checkLimit();
    await limiter.checkLimit();
    expect(await limiter.checkLimit()).toBe(false);

    // Advance time past window
    jest.advanceTimersByTime(1001);

    // Should be able to make requests again
    expect(await limiter.checkLimit()).toBe(true);
  });

  it('should wait for available slot', async () => {
    const limiter = new RateLimiter(1, 1000);
    
    // Use up the limit
    await limiter.checkLimit();
    
    // Start waiting for slot
    const waitPromise = limiter.waitForSlot();
    
    // Advance time to free up slot
    jest.advanceTimersByTime(1001);
    
    // Should resolve
    await expect(waitPromise).resolves.toBeUndefined();
  });
});
```

## Database Integration Testing

### Storage Service Integration

```typescript
// src/services/storageService.ts
export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export class DatabaseStorageService implements StorageService {
  constructor(private db: Db) {}

  async get<T>(key: string): Promise<T | null> {
    const doc = await this.db.collection('storage').findOne({ _id: key });
    return doc ? doc.value : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.db.collection('storage').replaceOne(
      { _id: key },
      { _id: key, value, updatedAt: new Date() },
      { upsert: true }
    );
  }

  async delete(key: string): Promise<void> {
    await this.db.collection('storage').deleteOne({ _id: key });
  }

  async keys(): Promise<string[]> {
    const docs = await this.db.collection('storage').find({}, { projection: { _id: 1 } }).toArray();
    return docs.map(doc => doc._id);
  }

  async clear(): Promise<void> {
    await this.db.collection('storage').deleteMany({});
  }
}
```

```typescript
// tests/integration/storageService.test.ts
import { DatabaseStorageService } from '../../src/services/storageService';
import { TestDatabase } from './database';

describe('DatabaseStorageService Integration', () => {
  let testDb: TestDatabase;
  let storageService: DatabaseStorageService;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.start();
    storageService = new DatabaseStorageService(testDb.getDb());
  });

  afterAll(async () => {
    await testDb.stop();
  });

  beforeEach(async () => {
    await testDb.clearData('storage');
  });

  describe('basic operations', () => {
    it('should store and retrieve data', async () => {
      const testData = { name: 'John', age: 30 };
      
      await storageService.set('user:123', testData);
      const result = await storageService.get('user:123');
      
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await storageService.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete data', async () => {
      await storageService.set('temp', 'value');
      await storageService.delete('temp');
      
      const result = await storageService.get('temp');
      expect(result).toBeNull();
    });

    it('should list all keys', async () => {
      await storageService.set('key1', 'value1');
      await storageService.set('key2', 'value2');
      await storageService.set('key3', 'value3');
      
      const keys = await storageService.keys();
      
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should clear all data', async () => {
      await storageService.set('key1', 'value1');
      await storageService.set('key2', 'value2');
      
      await storageService.clear();
      
      const keys = await storageService.keys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('data types', () => {
    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string', value: 'hello world' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'array', value: [1, 2, 3] },
        { key: 'object', value: { nested: { data: 'test' } } },
        { key: 'null', value: null }
      ];

      // Store all test data
      for (const testCase of testCases) {
        await storageService.set(testCase.key, testCase.value);
      }

      // Verify all test data
      for (const testCase of testCases) {
        const result = await storageService.get(testCase.key);
        expect(result).toEqual(testCase.value);
      }
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent writes', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(storageService.set(`concurrent:${i}`, `value${i}`));
      }
      
      await Promise.all(promises);
      
      // Verify all data was stored
      for (let i = 0; i < 10; i++) {
        const result = await storageService.get(`concurrent:${i}`);
        expect(result).toBe(`value${i}`);
      }
    });
  });
});
```

## Plugin Runtime Testing

### Full Plugin Integration

```typescript
// tests/integration/weatherPlugin.test.ts
import { WeatherPlugin } from '../../src/weatherPlugin';
import { createTestEnvironment, TestEnvironment } from './setup';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('https://api.test-weather.com/current', (req, res, ctx) => {
    const location = req.url.searchParams.get('location');
    return res(ctx.json({
      temperature: 25,
      description: 'Clear sky',
      location: location
    }));
  })
);

describe('WeatherPlugin Integration', () => {
  let testEnv: TestEnvironment;
  let plugin: WeatherPlugin;

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(async () => {
    testEnv = await createTestEnvironment();
    plugin = new WeatherPlugin();
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe('plugin lifecycle', () => {
    it('should initialize and enable successfully', async () => {
      await plugin.onInstall(testEnv.context);
      await plugin.onEnable(testEnv.context);
      
      expect(plugin.isEnabled()).toBe(true);
    });

    it('should handle configuration validation', async () => {
      const invalidContext = {
        ...testEnv.context,
        config: { apiKey: '' } // Invalid config
      };

      await expect(plugin.onEnable(invalidContext))
        .rejects
        .toThrow('API key is required');
    });

    it('should clean up on disable', async () => {
      await plugin.onEnable(testEnv.context);
      await plugin.onDisable();
      
      expect(plugin.isEnabled()).toBe(false);
    });
  });

  describe('weather functionality', () => {
    beforeEach(async () => {
      await plugin.onInstall(testEnv.context);
      await plugin.onEnable(testEnv.context);
    });

    it('should fetch and cache weather data', async () => {
      const weather1 = await plugin.getCurrentWeather('London');
      const weather2 = await plugin.getCurrentWeather('London');
      
      expect(weather1).toEqual({
        temperature: 25,
        description: 'Clear sky',
        location: 'London'
      });
      
      // Second call should use cache (same result)
      expect(weather2).toEqual(weather1);
      
      // Verify cache was used (only one API call)
      expect(server.listHandlers()).toHaveLength(1);
    });

    it('should persist user preferences', async () => {
      await plugin.setUserPreference('units', 'fahrenheit');
      await plugin.setUserPreference('refreshInterval', 300);
      
      const units = await plugin.getUserPreference('units');
      const interval = await plugin.getUserPreference('refreshInterval');
      
      expect(units).toBe('fahrenheit');
      expect(interval).toBe(300);
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        rest.get('https://api.test-weather.com/current', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
        })
      );

      await expect(plugin.getCurrentWeather('London'))
        .rejects
        .toThrow('Weather API error: 500');
    });
  });
});
```

## End-to-End Workflows

### User Journey Testing

```typescript
// tests/integration/userJourney.test.ts
import { WeatherPlugin } from '../../src/weatherPlugin';
import { createTestEnvironment, TestEnvironment } from './setup';

describe('Weather Plugin User Journey', () => {
  let testEnv: TestEnvironment;
  let plugin: WeatherPlugin;

  beforeEach(async () => {
    testEnv = await createTestEnvironment();
    plugin = new WeatherPlugin();
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  it('should complete full user onboarding flow', async () => {
    // Step 1: Plugin installation
    await plugin.onInstall(testEnv.context);
    expect(plugin.getState()).toBe('installed');

    // Step 2: Initial configuration
    const configResult = await plugin.validateConfiguration({
      apiKey: 'user-api-key',
      defaultLocation: 'New York',
      units: 'imperial'
    });
    expect(configResult.valid).toBe(true);

    // Step 3: Plugin enablement
    await plugin.onEnable({
      ...testEnv.context,
      config: {
        apiKey: 'user-api-key',
        defaultLocation: 'New York',
        units: 'imperial'
      }
    });
    expect(plugin.isEnabled()).toBe(true);

    // Step 4: First weather request
    const weather = await plugin.getCurrentWeather('New York');
    expect(weather.location).toBe('New York');

    // Step 5: Preference customization
    await plugin.setUserPreference('theme', 'dark');
    await plugin.setUserPreference('notifications', true);

    // Step 6: Verify preferences persist
    const theme = await plugin.getUserPreference('theme');
    const notifications = await plugin.getUserPreference('notifications');
    
    expect(theme).toBe('dark');
    expect(notifications).toBe(true);
  });

  it('should handle plugin update workflow', async () => {
    // Initial installation
    await plugin.onInstall(testEnv.context);
    await plugin.onEnable(testEnv.context);

    // Store some user data
    await plugin.setUserPreference('favoriteLocation', 'Paris');

    // Simulate plugin update
    await plugin.onUpdate(testEnv.context, '1.0.0', '1.1.0');

    // Verify data migration
    const favoriteLocation = await plugin.getUserPreference('favoriteLocation');
    expect(favoriteLocation).toBe('Paris');

    // Verify new features work
    expect(plugin.getVersion()).toBe('1.1.0');
  });

  it('should handle error recovery workflow', async () => {
    await plugin.onInstall(testEnv.context);
    await plugin.onEnable(testEnv.context);

    // Simulate network error
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    // First request should fail
    await expect(plugin.getCurrentWeather('London'))
      .rejects
      .toThrow('Network error');

    // Restore network
    global.fetch = originalFetch;

    // Subsequent request should work
    const weather = await plugin.getCurrentWeather('London');
    expect(weather).toBeDefined();
  });
});
```

## Test Environment Management

### Environment Configuration

```typescript
// tests/integration/config.ts
export interface TestConfig {
  apiUrl: string;
  apiKey: string;
  database: {
    url: string;
    name: string;
  };
  timeout: number;
}

export function getTestConfig(): TestConfig {
  return {
    apiUrl: process.env.TEST_API_URL || 'https://api.test-weather.com',
    apiKey: process.env.TEST_API_KEY || 'test-api-key',
    database: {
      url: process.env.TEST_DB_URL || 'mongodb://localhost:27017',
      name: process.env.TEST_DB_NAME || 'test-plugin-db'
    },
    timeout: parseInt(process.env.TEST_TIMEOUT || '30000')
  };
}
```

### Test Data Management

```typescript
// tests/integration/fixtures.ts
export const weatherFixtures = {
  london: {
    temperature: 18,
    description: 'Partly cloudy',
    location: 'London',
    humidity: 65,
    windSpeed: 12
  },
  
  paris: {
    temperature: 22,
    description: 'Sunny',
    location: 'Paris',
    humidity: 45,
    windSpeed: 8
  },
  
  invalidLocation: {
    error: 'Location not found',
    code: 'LOCATION_NOT_FOUND'
  }
};

export const userFixtures = {
  testUser: {
    id: 'test-user-123',
    email: 'test@example.com',
    preferences: {
      units: 'metric',
      theme: 'light',
      notifications: true
    }
  }
};
```

### Cleanup and Teardown

```typescript
// tests/integration/cleanup.ts
export class TestCleanup {
  private cleanupTasks: (() => Promise<void>)[] = [];

  addTask(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  async runAll(): Promise<void> {
    const errors: Error[] = [];

    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.cleanupTasks = [];

    if (errors.length > 0) {
      throw new Error(`Cleanup failed: ${errors.map(e => e.message).join(', ')}`);
    }
  }
}

// Global cleanup for all integration tests
const globalCleanup = new TestCleanup();

afterAll(async () => {
  await globalCleanup.runAll();
});

export { globalCleanup };
```

This comprehensive integration testing guide ensures your Qirvo plugins work correctly across all system boundaries and real-world scenarios.

---

**Next**: [E2E Testing](./e2e-testing.md)
