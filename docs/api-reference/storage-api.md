# Storage API

The Storage API provides persistent, secure key-value storage for your plugins. This guide covers all storage capabilities, patterns, and best practices.

## Table of Contents

- [Storage Interface](#storage-interface)
- [Basic Operations](#basic-operations)
- [Data Types](#data-types)
- [Storage Patterns](#storage-patterns)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)

## Storage Interface

### PluginStorage Definition

```typescript
interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
}
```

### Storage Characteristics

- **Persistent**: Data survives plugin restarts and updates
- **Isolated**: Each plugin has its own storage namespace
- **Encrypted**: Data is encrypted at rest
- **Quota Limited**: Storage has size limits per plugin
- **Async**: All operations are asynchronous

## Basic Operations

### Setting Data

```typescript
export default class StorageExamplePlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    const storage = context.storage;
    
    // Store simple values
    await storage.set('lastLogin', new Date().toISOString());
    await storage.set('userCount', 42);
    await storage.set('isEnabled', true);
    
    // Store complex objects
    await storage.set('userSettings', {
      theme: 'dark',
      notifications: true,
      language: 'en'
    });
    
    // Store arrays
    await storage.set('recentItems', [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' }
    ]);
  }
}
```

### Getting Data

```typescript
async loadData(): Promise<void> {
  const storage = this.context.storage;
  
  // Get simple values with type safety
  const lastLogin = await storage.get('lastLogin') as string;
  const userCount = await storage.get('userCount') as number;
  const isEnabled = await storage.get('isEnabled') as boolean;
  
  // Get complex objects
  const userSettings = await storage.get('userSettings') as {
    theme: string;
    notifications: boolean;
    language: string;
  };
  
  // Handle missing values
  const missingValue = await storage.get('nonexistent'); // returns null
  
  // Provide defaults
  const configValue = await storage.get('config') || { default: true };
}
```

### Checking Existence

```typescript
async checkData(): Promise<void> {
  const storage = this.context.storage;
  
  // Check if key exists
  const hasSettings = await storage.has('userSettings');
  if (hasSettings) {
    const settings = await storage.get('userSettings');
    // Use settings
  }
  
  // Alternative approach
  const settings = await storage.get('userSettings');
  if (settings !== null) {
    // Settings exist
  }
}
```

### Deleting Data

```typescript
async cleanupData(): Promise<void> {
  const storage = this.context.storage;
  
  // Delete specific key
  await storage.delete('temporaryData');
  
  // Delete multiple keys
  const keysToDelete = ['temp1', 'temp2', 'temp3'];
  for (const key of keysToDelete) {
    await storage.delete(key);
  }
  
  // Clear all data (use with caution)
  await storage.clear();
}
```

### Storage Information

```typescript
async getStorageInfo(): Promise<void> {
  const storage = this.context.storage;
  
  // Get all keys
  const allKeys = await storage.keys();
  console.log('Stored keys:', allKeys);
  
  // Get storage size
  const itemCount = await storage.size();
  console.log('Number of items:', itemCount);
  
  // List all data (for debugging)
  for (const key of allKeys) {
    const value = await storage.get(key);
    console.log(`${key}:`, value);
  }
}
```

## Data Types

### Supported Types

```typescript
interface StorageExamples {
  // Primitives
  string: string;
  number: number;
  boolean: boolean;
  
  // Objects
  object: Record<string, any>;
  array: any[];
  
  // Dates (stored as ISO strings)
  date: string;
  
  // Nested structures
  complex: {
    nested: {
      data: any[];
    };
  };
}

async storeVariousTypes(): Promise<void> {
  const storage = this.context.storage;
  
  // Primitives
  await storage.set('name', 'John Doe');
  await storage.set('age', 30);
  await storage.set('active', true);
  
  // Dates (convert to ISO string)
  await storage.set('createdAt', new Date().toISOString());
  
  // Objects
  await storage.set('user', {
    id: 123,
    name: 'John',
    email: 'john@example.com',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  });
  
  // Arrays
  await storage.set('tags', ['work', 'personal', 'urgent']);
  await storage.set('items', [
    { id: 1, title: 'First Item' },
    { id: 2, title: 'Second Item' }
  ]);
}
```

### Type-Safe Storage

```typescript
class TypedStorage<T> {
  constructor(
    private storage: PluginStorage,
    private key: string,
    private defaultValue: T
  ) {}

  async get(): Promise<T> {
    const value = await this.storage.get(this.key);
    return value !== null ? value : this.defaultValue;
  }

  async set(value: T): Promise<void> {
    await this.storage.set(this.key, value);
  }

  async delete(): Promise<void> {
    await this.storage.delete(this.key);
  }

  async exists(): Promise<boolean> {
    return await this.storage.has(this.key);
  }
}

// Usage
interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

class SettingsManager {
  private settingsStorage: TypedStorage<UserSettings>;

  constructor(storage: PluginStorage) {
    this.settingsStorage = new TypedStorage(storage, 'userSettings', {
      theme: 'light',
      language: 'en',
      notifications: true
    });
  }

  async getSettings(): Promise<UserSettings> {
    return await this.settingsStorage.get();
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    const current = await this.settingsStorage.get();
    const updated = { ...current, ...updates };
    await this.settingsStorage.set(updated);
  }
}
```

## Storage Patterns

### Caching Pattern

```typescript
class CacheManager {
  constructor(private storage: PluginStorage) {}

  async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300000 // 5 minutes
  ): Promise<T> {
    const cacheKey = `cache_${key}`;
    const timestampKey = `cache_${key}_timestamp`;
    
    // Check cache
    const cached = await this.storage.get(cacheKey);
    const timestamp = await this.storage.get(timestampKey);
    
    if (cached && timestamp) {
      const age = Date.now() - timestamp;
      if (age < ttl) {
        return cached;
      }
    }
    
    // Fetch fresh data
    const freshData = await fetchFn();
    
    // Store in cache
    await this.storage.set(cacheKey, freshData);
    await this.storage.set(timestampKey, Date.now());
    
    return freshData;
  }

  async invalidateCache(key: string): Promise<void> {
    await this.storage.delete(`cache_${key}`);
    await this.storage.delete(`cache_${key}_timestamp`);
  }

  async clearAllCache(): Promise<void> {
    const keys = await this.storage.keys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    
    for (const key of cacheKeys) {
      await this.storage.delete(key);
    }
  }
}

// Usage
const cacheManager = new CacheManager(context.storage);

const userData = await cacheManager.getCached(
  'user_123',
  () => fetchUserFromAPI('123'),
  600000 // 10 minutes
);
```

### Queue Pattern

```typescript
class StorageQueue<T> {
  constructor(
    private storage: PluginStorage,
    private queueKey: string
  ) {}

  async enqueue(item: T): Promise<void> {
    const queue = await this.getQueue();
    queue.push(item);
    await this.storage.set(this.queueKey, queue);
  }

  async dequeue(): Promise<T | null> {
    const queue = await this.getQueue();
    if (queue.length === 0) return null;
    
    const item = queue.shift();
    await this.storage.set(this.queueKey, queue);
    return item || null;
  }

  async peek(): Promise<T | null> {
    const queue = await this.getQueue();
    return queue.length > 0 ? queue[0] : null;
  }

  async size(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  async clear(): Promise<void> {
    await this.storage.set(this.queueKey, []);
  }

  private async getQueue(): Promise<T[]> {
    return await this.storage.get(this.queueKey) || [];
  }
}

// Usage
interface Task {
  id: string;
  action: string;
  data: any;
}

const taskQueue = new StorageQueue<Task>(context.storage, 'pending_tasks');

// Add task
await taskQueue.enqueue({
  id: '123',
  action: 'sync_data',
  data: { userId: '456' }
});

// Process tasks
while (await taskQueue.size() > 0) {
  const task = await taskQueue.dequeue();
  if (task) {
    await processTask(task);
  }
}
```

### Settings Management

```typescript
class PluginSettingsManager {
  constructor(private storage: PluginStorage) {}

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const settings = await this.getAllSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }

  async setSetting(key: string, value: any): Promise<void> {
    const settings = await this.getAllSettings();
    settings[key] = value;
    await this.storage.set('settings', settings);
  }

  async removeSetting(key: string): Promise<void> {
    const settings = await this.getAllSettings();
    delete settings[key];
    await this.storage.set('settings', settings);
  }

  async getAllSettings(): Promise<Record<string, any>> {
    return await this.storage.get('settings') || {};
  }

  async resetSettings(): Promise<void> {
    await this.storage.delete('settings');
  }

  async exportSettings(): Promise<string> {
    const settings = await this.getAllSettings();
    return JSON.stringify(settings, null, 2);
  }

  async importSettings(settingsJson: string): Promise<void> {
    try {
      const settings = JSON.parse(settingsJson);
      await this.storage.set('settings', settings);
    } catch (error) {
      throw new Error('Invalid settings format');
    }
  }
}
```

### Data Migration

```typescript
class DataMigration {
  constructor(private storage: PluginStorage) {}

  async migrate(): Promise<void> {
    const version = await this.getDataVersion();
    
    if (version < 1) {
      await this.migrateToV1();
    }
    
    if (version < 2) {
      await this.migrateToV2();
    }
    
    await this.setDataVersion(2);
  }

  private async migrateToV1(): Promise<void> {
    // Example: Convert old user data format
    const oldUserData = await this.storage.get('user');
    if (oldUserData && !oldUserData.version) {
      const newUserData = {
        ...oldUserData,
        version: 1,
        preferences: oldUserData.settings || {},
        createdAt: new Date().toISOString()
      };
      
      await this.storage.set('user', newUserData);
      await this.storage.delete('settings'); // Remove old key
    }
  }

  private async migrateToV2(): Promise<void> {
    // Example: Restructure cache data
    const keys = await this.storage.keys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    
    for (const key of cacheKeys) {
      const data = await this.storage.get(key);
      if (data && !data.metadata) {
        const newData = {
          value: data,
          metadata: {
            createdAt: new Date().toISOString(),
            version: 2
          }
        };
        await this.storage.set(key, newData);
      }
    }
  }

  private async getDataVersion(): Promise<number> {
    return await this.storage.get('dataVersion') || 0;
  }

  private async setDataVersion(version: number): Promise<void> {
    await this.storage.set('dataVersion', version);
  }
}
```

## Performance Optimization

### Batch Operations

```typescript
class BatchStorageOperations {
  constructor(private storage: PluginStorage) {}

  async batchSet(items: Record<string, any>): Promise<void> {
    const promises = Object.entries(items).map(([key, value]) =>
      this.storage.set(key, value)
    );
    
    await Promise.all(promises);
  }

  async batchGet(keys: string[]): Promise<Record<string, any>> {
    const promises = keys.map(async key => ({
      key,
      value: await this.storage.get(key)
    }));
    
    const results = await Promise.all(promises);
    
    return results.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, any>);
  }

  async batchDelete(keys: string[]): Promise<void> {
    const promises = keys.map(key => this.storage.delete(key));
    await Promise.all(promises);
  }
}

// Usage
const batchOps = new BatchStorageOperations(context.storage);

// Set multiple values at once
await batchOps.batchSet({
  'user_1': { name: 'John' },
  'user_2': { name: 'Jane' },
  'user_3': { name: 'Bob' }
});

// Get multiple values at once
const users = await batchOps.batchGet(['user_1', 'user_2', 'user_3']);
```

### Storage Monitoring

```typescript
class StorageMonitor {
  constructor(private storage: PluginStorage) {}

  async getStorageStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    estimatedSize: number;
  }> {
    const keys = await this.storage.keys();
    const keysByPrefix: Record<string, number> = {};
    let estimatedSize = 0;
    
    for (const key of keys) {
      // Count by prefix
      const prefix = key.split('_')[0];
      keysByPrefix[prefix] = (keysByPrefix[prefix] || 0) + 1;
      
      // Estimate size
      const value = await this.storage.get(key);
      estimatedSize += JSON.stringify(value).length;
    }
    
    return {
      totalKeys: keys.length,
      keysByPrefix,
      estimatedSize
    };
  }

  async findLargeItems(threshold: number = 10000): Promise<Array<{ key: string; size: number }>> {
    const keys = await this.storage.keys();
    const largeItems: Array<{ key: string; size: number }> = [];
    
    for (const key of keys) {
      const value = await this.storage.get(key);
      const size = JSON.stringify(value).length;
      
      if (size > threshold) {
        largeItems.push({ key, size });
      }
    }
    
    return largeItems.sort((a, b) => b.size - a.size);
  }
}
```

## Security Considerations

### Data Sanitization

```typescript
class SecureStorage {
  constructor(private storage: PluginStorage) {}

  async setSecure(key: string, value: any): Promise<void> {
    // Sanitize key
    const sanitizedKey = this.sanitizeKey(key);
    
    // Sanitize value
    const sanitizedValue = this.sanitizeValue(value);
    
    await this.storage.set(sanitizedKey, sanitizedValue);
  }

  private sanitizeKey(key: string): string {
    // Remove dangerous characters
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potential script tags
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      
      for (const [k, v] of Object.entries(value)) {
        sanitized[this.sanitizeKey(k)] = this.sanitizeValue(v);
      }
      
      return sanitized;
    }
    
    return value;
  }
}
```

### Access Control

```typescript
class AccessControlledStorage {
  constructor(
    private storage: PluginStorage,
    private permissions: string[]
  ) {}

  async get(key: string): Promise<any> {
    if (!this.canRead(key)) {
      throw new Error(`No read permission for key: ${key}`);
    }
    
    return await this.storage.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.canWrite(key)) {
      throw new Error(`No write permission for key: ${key}`);
    }
    
    await this.storage.set(key, value);
  }

  private canRead(key: string): boolean {
    return this.permissions.includes('storage-read') ||
           this.permissions.includes(`storage-read:${key}`);
  }

  private canWrite(key: string): boolean {
    return this.permissions.includes('storage-write') ||
           this.permissions.includes(`storage-write:${key}`);
  }
}
```

## Best Practices

### Storage Design
1. **Use Prefixes**: Organize keys with prefixes (e.g., `user_`, `cache_`, `settings_`)
2. **Avoid Large Objects**: Break large data into smaller chunks
3. **Version Data**: Include version information for migration support
4. **Cleanup Regularly**: Remove expired or unused data

### Performance
1. **Batch Operations**: Use Promise.all for multiple operations
2. **Cache Frequently Used Data**: Keep hot data in memory
3. **Lazy Loading**: Load data only when needed
4. **Monitor Usage**: Track storage usage and optimize

### Security
1. **Sanitize Input**: Always sanitize keys and values
2. **Validate Data**: Validate data structure before storage
3. **Encrypt Sensitive Data**: Use additional encryption for sensitive data
4. **Access Control**: Implement proper access controls

---

**Next**: [HTTP Client](./http-client.md) for network request documentation.
