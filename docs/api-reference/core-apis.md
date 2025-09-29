# Core APIs Reference

The Qirvo Plugin SDK provides a comprehensive set of APIs for interacting with the Qirvo platform. This reference covers all core APIs available to plugin developers.

## Table of Contents

- [Plugin Runtime Context](#plugin-runtime-context)
- [Base Plugin Class](#base-plugin-class)
- [Storage API](#storage-api)
- [HTTP Client API](#http-client-api)
- [Notification API](#notification-api)
- [Event System](#event-system)
- [Logger API](#logger-api)
- [Configuration API](#configuration-api)

## Plugin Runtime Context

The `PluginRuntimeContext` is the primary interface between your plugin and the Qirvo platform.

### Interface Definition

```typescript
interface PluginRuntimeContext {
  plugin: InstalledPlugin;
  config: Record<string, any>;
  storage: PluginStorage;
  api: PluginAPI;
  logger: PluginLogger;
  user?: { 
    id: string; 
    email?: string; 
    preferences?: Record<string, any> 
  };
}
```

### Usage Example

```typescript
export default class MyPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Access plugin metadata
    console.log(`Plugin ${context.plugin.name} v${context.plugin.version} enabled`);
    
    // Access user information
    if (context.user) {
      this.log('info', `User ${context.user.email} enabled the plugin`);
    }
    
    // Access configuration
    const apiKey = context.config.apiKey;
    
    // Use storage
    await context.storage.set('lastEnabled', new Date().toISOString());
  }
}
```

## Base Plugin Class

The `BasePlugin` class provides the foundation for all Qirvo plugins with lifecycle hooks and utility methods.

### Class Definition

```typescript
abstract class BasePlugin {
  protected context: PluginRuntimeContext;
  
  // Lifecycle hooks
  async onInstall?(context: PluginRuntimeContext): Promise<void>;
  async onUninstall?(context: PluginRuntimeContext): Promise<void>;
  async onEnable?(context: PluginRuntimeContext): Promise<void>;
  async onDisable?(context: PluginRuntimeContext): Promise<void>;
  async onUpdate?(context: PluginRuntimeContext, oldVersion: string): Promise<void>;
  async onConfigChange?(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void>;
  
  // Utility methods
  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: any[]): void;
  protected async getConfig<T = any>(key?: string): Promise<T>;
  protected async setConfig(key: string, value: any): Promise<void>;
  protected async getStorage<T = any>(key: string): Promise<T | null>;
  protected async setStorage(key: string, value: any): Promise<boolean>;
  protected async notify(title: string, message: string, type?: NotificationType): Promise<void>;
  protected async httpGet(url: string, options?: RequestInit): Promise<Response>;
  protected async httpPost(url: string, data: any, options?: RequestInit): Promise<Response>;
}
```

### Lifecycle Hooks

#### onInstall
Called when the plugin is first installed.

```typescript
async onInstall(context: PluginRuntimeContext): Promise<void> {
  // Initialize plugin data
  await this.setStorage('installDate', new Date().toISOString());
  await this.setStorage('version', context.plugin.version);
  
  // Show welcome message
  await this.notify('Welcome!', 'Plugin installed successfully', 'success');
  
  // Perform initial setup
  await this.initializePlugin();
}
```

#### onEnable
Called when the plugin is enabled (including after installation).

```typescript
async onEnable(context: PluginRuntimeContext): Promise<void> {
  // Start services
  this.startBackgroundTasks();
  
  // Register event listeners
  this.registerEventHandlers();
  
  // Update status
  await this.setStorage('enabled', true);
  await this.setStorage('lastEnabled', new Date().toISOString());
}
```

#### onDisable
Called when the plugin is disabled.

```typescript
async onDisable(context: PluginRuntimeContext): Promise<void> {
  // Stop services
  this.stopBackgroundTasks();
  
  // Cleanup resources
  this.cleanup();
  
  // Update status
  await this.setStorage('enabled', false);
  await this.setStorage('lastDisabled', new Date().toISOString());
}
```

#### onUpdate
Called when the plugin is updated to a new version.

```typescript
async onUpdate(context: PluginRuntimeContext, oldVersion: string): Promise<void> {
  this.log('info', `Updating from version ${oldVersion} to ${context.plugin.version}`);
  
  // Perform migration if needed
  if (this.needsMigration(oldVersion, context.plugin.version)) {
    await this.migrateData(oldVersion);
  }
  
  // Update stored version
  await this.setStorage('version', context.plugin.version);
  
  // Notify user
  await this.notify('Updated', `Plugin updated to v${context.plugin.version}`, 'info');
}
```

#### onConfigChange
Called when plugin configuration is modified.

```typescript
async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
  const newConfig = context.config;
  
  // Handle API key changes
  if (oldConfig.apiKey !== newConfig.apiKey) {
    await this.validateApiKey(newConfig.apiKey);
  }
  
  // Handle refresh interval changes
  if (oldConfig.refreshInterval !== newConfig.refreshInterval) {
    this.updateRefreshInterval(newConfig.refreshInterval);
  }
  
  this.log('info', 'Configuration updated', { oldConfig, newConfig });
}
```

### Utility Methods

#### Logging

```typescript
// Log levels: 'info', 'warn', 'error', 'debug'
this.log('info', 'Plugin operation completed');
this.log('warn', 'API rate limit approaching');
this.log('error', 'Failed to fetch data', error);
this.log('debug', 'Processing item', { item });
```

#### Configuration Management

```typescript
// Get entire configuration
const config = await this.getConfig();

// Get specific configuration value
const apiKey = await this.getConfig<string>('apiKey');
const refreshInterval = await this.getConfig<number>('refreshInterval');

// Set configuration value (triggers onConfigChange)
await this.setConfig('lastSync', new Date().toISOString());
```

#### Storage Operations

```typescript
// Store data
await this.setStorage('userData', { name: 'John', preferences: {} });
await this.setStorage('cache', responseData);

// Retrieve data
const userData = await this.getStorage<UserData>('userData');
const cache = await this.getStorage('cache');

// Check if data exists
const hasCache = (await this.getStorage('cache')) !== null;
```

#### Notifications

```typescript
// Basic notification
await this.notify('Success', 'Operation completed successfully');

// Typed notifications
await this.notify('Error', 'Failed to save data', 'error');
await this.notify('Warning', 'API quota exceeded', 'warning');
await this.notify('Info', 'Sync in progress', 'info');
await this.notify('Success', 'Data synchronized', 'success');
```

#### HTTP Requests

```typescript
// GET request
const response = await this.httpGet('https://api.example.com/data');
const data = await response.json();

// POST request
const postResponse = await this.httpPost('https://api.example.com/submit', {
  name: 'John Doe',
  email: 'john@example.com'
});

// With custom headers
const authResponse = await this.httpGet('https://api.example.com/protected', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});
```

## Storage API

The Storage API provides persistent key-value storage for your plugin.

### Interface Definition

```typescript
interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}
```

### Usage Examples

```typescript
// Store different data types
await this.context.storage.set('string', 'Hello World');
await this.context.storage.set('number', 42);
await this.context.storage.set('boolean', true);
await this.context.storage.set('object', { name: 'John', age: 30 });
await this.context.storage.set('array', [1, 2, 3, 4, 5]);

// Retrieve data with type safety
const userName = await this.context.storage.get('string') as string;
const userAge = await this.context.storage.get('number') as number;
const isActive = await this.context.storage.get('boolean') as boolean;
const userObj = await this.context.storage.get('object') as { name: string; age: number };

// Handle missing keys
const missingValue = await this.context.storage.get('nonexistent'); // returns null

// Delete specific keys
await this.context.storage.delete('temporary');

// List all keys
const allKeys = await this.context.storage.keys();
console.log('Stored keys:', allKeys);

// Clear all data
await this.context.storage.clear();
```

### Storage Patterns

#### Caching Pattern

```typescript
async getCachedData(key: string, fetchFn: () => Promise<any>, ttl: number = 300000): Promise<any> {
  const cacheKey = `cache_${key}`;
  const timestampKey = `cache_${key}_timestamp`;
  
  // Check if cache exists and is valid
  const cached = await this.getStorage(cacheKey);
  const timestamp = await this.getStorage<number>(timestampKey);
  
  if (cached && timestamp && (Date.now() - timestamp) < ttl) {
    return cached;
  }
  
  // Fetch fresh data
  const freshData = await fetchFn();
  
  // Store in cache
  await this.setStorage(cacheKey, freshData);
  await this.setStorage(timestampKey, Date.now());
  
  return freshData;
}
```

#### Settings Management

```typescript
interface PluginSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  refreshInterval: number;
  apiEndpoint: string;
}

async getSettings(): Promise<PluginSettings> {
  const settings = await this.getStorage<PluginSettings>('settings');
  return {
    theme: 'light',
    notifications: true,
    refreshInterval: 60000,
    apiEndpoint: 'https://api.example.com',
    ...settings
  };
}

async updateSettings(updates: Partial<PluginSettings>): Promise<void> {
  const currentSettings = await this.getSettings();
  const newSettings = { ...currentSettings, ...updates };
  await this.setStorage('settings', newSettings);
}
```

## HTTP Client API

The HTTP Client API provides secure, permission-controlled access to external APIs.

### Interface Definition

```typescript
interface PluginHTTPAPI {
  get(url: string, options?: RequestInit): Promise<Response>;
  post(url: string, data: any, options?: RequestInit): Promise<Response>;
  put(url: string, data: any, options?: RequestInit): Promise<Response>;
  delete(url: string, options?: RequestInit): Promise<Response>;
  request?(url: string, options: RequestInit): Promise<Response>;
}
```

### Usage Examples

#### Basic Requests

```typescript
// GET request
const response = await this.context.api.http.get('https://api.example.com/users');
const users = await response.json();

// POST request
const newUser = await this.context.api.http.post('https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updatedUser = await this.context.api.http.put('https://api.example.com/users/123', {
  name: 'Jane Doe'
});

// DELETE request
await this.context.api.http.delete('https://api.example.com/users/123');
```

#### Advanced Requests

```typescript
// With custom headers
const response = await this.context.api.http.get('https://api.example.com/protected', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'X-Custom-Header': 'value'
  }
});

// With query parameters
const searchUrl = new URL('https://api.example.com/search');
searchUrl.searchParams.set('q', 'query');
searchUrl.searchParams.set('limit', '10');
const searchResults = await this.context.api.http.get(searchUrl.toString());

// With timeout
const timeoutResponse = await this.context.api.http.get('https://api.example.com/slow', {
  signal: AbortSignal.timeout(5000) // 5 second timeout
});
```

#### Error Handling

```typescript
async fetchDataWithRetry(url: string, maxRetries: number = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await this.context.api.http.get(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      this.log('warn', `Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        this.log('error', 'All retry attempts failed');
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

## Notification API

The Notification API allows plugins to display messages to users.

### Interface Definition

```typescript
interface NotificationAPI {
  show(notification: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }): void;
  schedule?(notification: {
    title: string;
    message: string;
    at: Date;
    type?: 'info' | 'success' | 'warning' | 'error';
  }): Promise<string>;
  cancel?(id: string): Promise<void>;
}
```

### Usage Examples

```typescript
// Basic notifications
this.context.api.notifications.show({
  title: 'Success',
  message: 'Data saved successfully',
  type: 'success'
});

this.context.api.notifications.show({
  title: 'Warning',
  message: 'API quota is running low',
  type: 'warning'
});

this.context.api.notifications.show({
  title: 'Error',
  message: 'Failed to connect to server',
  type: 'error'
});

// Scheduled notifications (if supported)
if (this.context.api.notifications.schedule) {
  const notificationId = await this.context.api.notifications.schedule({
    title: 'Reminder',
    message: 'Time to sync your data',
    at: new Date(Date.now() + 3600000), // 1 hour from now
    type: 'info'
  });
  
  // Cancel if needed
  if (this.context.api.notifications.cancel) {
    await this.context.api.notifications.cancel(notificationId);
  }
}
```

## Event System

The Event System enables communication between plugins and the Qirvo platform.

### Working Plugin Context Events

```typescript
interface WorkingPluginContext {
  bus: {
    emit: (event: string, data: any) => void;
    on: (event: string, handler: (data: any) => void) => () => void;
  };
}
```

### Usage Examples

```typescript
export default class EventPlugin extends BasePlugin {
  private unsubscribers: (() => void)[] = [];
  
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Subscribe to events
    const unsubscribe1 = context.bus.on('user.task.created', this.handleTaskCreated.bind(this));
    const unsubscribe2 = context.bus.on('system.sync.completed', this.handleSyncCompleted.bind(this));
    
    this.unsubscribers.push(unsubscribe1, unsubscribe2);
  }
  
  async onDisable(): Promise<void> {
    // Cleanup event subscriptions
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }
  
  private handleTaskCreated(data: { task: any }): void {
    this.log('info', 'New task created:', data.task);
    // Handle task creation
  }
  
  private handleSyncCompleted(data: { timestamp: string }): void {
    this.log('info', 'Sync completed at:', data.timestamp);
    // Handle sync completion
  }
  
  // Emit custom events
  async performAction(): Promise<void> {
    // Do something
    const result = await this.doSomething();
    
    // Emit event for other plugins
    this.context.bus.emit('myplugin.action.completed', {
      timestamp: new Date().toISOString(),
      result
    });
  }
}
```

## Logger API

The Logger API provides structured logging capabilities.

### Interface Definition

```typescript
interface PluginLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
```

### Usage Examples

```typescript
// Basic logging
this.context.logger.info('Plugin operation started');
this.context.logger.warn('Deprecated API usage detected');
this.context.logger.error('Failed to process request');
this.context.logger.debug('Processing item', { itemId: 123 });

// Structured logging with context
this.context.logger.info('User action completed', {
  userId: this.context.user?.id,
  action: 'data_export',
  timestamp: new Date().toISOString(),
  duration: Date.now() - startTime
});

// Error logging with stack traces
try {
  await this.riskyOperation();
} catch (error) {
  this.context.logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: { userId: this.context.user?.id }
  });
}
```

## Configuration API

Access and modify plugin configuration through the context.

### Usage Examples

```typescript
// Access configuration
const config = this.context.config;
const apiKey = config.apiKey;
const refreshInterval = config.refreshInterval || 60000;

// Type-safe configuration access
interface MyPluginConfig {
  apiKey: string;
  refreshInterval: number;
  enableNotifications: boolean;
  theme: 'light' | 'dark';
}

const typedConfig = this.context.config as MyPluginConfig;

// Configuration validation
private validateConfig(config: any): config is MyPluginConfig {
  return (
    typeof config.apiKey === 'string' &&
    typeof config.refreshInterval === 'number' &&
    typeof config.enableNotifications === 'boolean' &&
    ['light', 'dark'].includes(config.theme)
  );
}

async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
  if (!this.validateConfig(context.config)) {
    this.log('error', 'Invalid configuration provided');
    await this.notify('Configuration Error', 'Please check your plugin settings', 'error');
    return;
  }
  
  // Handle valid configuration change
  const config = context.config as MyPluginConfig;
  this.log('info', 'Configuration updated', { config });
}
```

---

**Next**: [Plugin Context](./plugin-context.md) for detailed context documentation.
