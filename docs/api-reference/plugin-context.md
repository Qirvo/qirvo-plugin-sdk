# Plugin Context

The Plugin Context provides the runtime environment and services available to your plugin during execution. This guide covers the complete context interface and how to use it effectively.

## Table of Contents

- [Context Interface](#context-interface)
- [Plugin Metadata](#plugin-metadata)
- [User Information](#user-information)
- [Configuration Access](#configuration-access)
- [Service Integration](#service-integration)
- [Context Lifecycle](#context-lifecycle)

## Context Interface

### PluginRuntimeContext Definition

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
    preferences?: Record<string, any>;
  };
  bus: EventBus;
  environment: PluginEnvironment;
}
```

### InstalledPlugin Interface

```typescript
interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;
  type: PluginType;
  status: 'enabled' | 'disabled' | 'error';
  installedAt: Date;
  updatedAt: Date;
  permissions: PluginPermission[];
  manifest: PluginManifest;
}
```

## Plugin Metadata

### Accessing Plugin Information

```typescript
export default class MyPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    const plugin = context.plugin;
    
    // Basic plugin information
    this.log('info', `Plugin: ${plugin.name} v${plugin.version}`);
    this.log('info', `Author: ${plugin.author.name}`);
    this.log('info', `Type: ${plugin.type}`);
    this.log('info', `Status: ${plugin.status}`);
    
    // Installation details
    this.log('info', `Installed: ${plugin.installedAt.toISOString()}`);
    this.log('info', `Last Updated: ${plugin.updatedAt.toISOString()}`);
    
    // Permissions
    const permissions = plugin.permissions.map(p => p.type).join(', ');
    this.log('info', `Permissions: ${permissions}`);
  }
}
```

### Plugin Author Information

```typescript
interface PluginAuthor {
  name: string;
  email?: string;
  website?: string;
  avatar?: string;
}

// Usage
const author = context.plugin.author;
console.log(`Created by ${author.name}`);
if (author.website) {
  console.log(`Website: ${author.website}`);
}
```

### Plugin Permissions

```typescript
interface PluginPermission {
  type: string;
  description?: string;
  required: boolean;
  granted: boolean;
}

// Check specific permissions
function hasPermission(context: PluginRuntimeContext, permissionType: string): boolean {
  return context.plugin.permissions.some(
    p => p.type === permissionType && p.granted
  );
}

// Usage
if (hasPermission(context, 'network-access')) {
  // Make HTTP requests
  const response = await context.api.http.get('https://api.example.com');
} else {
  this.log('warn', 'Network access not granted');
}
```

## User Information

### User Context

```typescript
interface UserContext {
  id: string;
  email?: string;
  preferences?: Record<string, any>;
}

// Accessing user information
export default class UserAwarePlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    if (context.user) {
      this.log('info', `User ID: ${context.user.id}`);
      
      if (context.user.email) {
        this.log('info', `User Email: ${context.user.email}`);
      }
      
      // Access user preferences
      const preferences = context.user.preferences || {};
      const theme = preferences.theme || 'light';
      const timezone = preferences.timezone || 'UTC';
      
      this.log('info', `User Theme: ${theme}`);
      this.log('info', `User Timezone: ${timezone}`);
    } else {
      this.log('warn', 'No user context available');
    }
  }
}
```

### User Preferences

```typescript
// Working with user preferences
class PreferenceManager {
  constructor(private context: PluginRuntimeContext) {}

  getUserPreference<T>(key: string, defaultValue: T): T {
    if (!this.context.user?.preferences) {
      return defaultValue;
    }
    
    return this.context.user.preferences[key] ?? defaultValue;
  }

  // Note: User preferences are read-only from plugin context
  // To modify preferences, use the Qirvo API
  async updateUserPreference(key: string, value: any): Promise<void> {
    try {
      await this.context.api.http.post('/api/user/preferences', {
        [key]: value
      });
    } catch (error) {
      this.context.logger.error('Failed to update user preference:', error);
    }
  }
}
```

## Configuration Access

### Plugin Configuration

```typescript
// Type-safe configuration access
interface MyPluginConfig {
  apiKey: string;
  refreshInterval: number;
  enableNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  customSettings: {
    maxItems: number;
    sortOrder: 'asc' | 'desc';
  };
}

export default class ConfigurablePlugin extends BasePlugin {
  private config: MyPluginConfig;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.config = this.parseConfig(context.config);
    
    // Use configuration
    if (this.config.enableNotifications) {
      await this.setupNotifications();
    }
    
    this.startPeriodicTask(this.config.refreshInterval);
  }

  private parseConfig(rawConfig: Record<string, any>): MyPluginConfig {
    return {
      apiKey: rawConfig.apiKey || '',
      refreshInterval: rawConfig.refreshInterval || 60000,
      enableNotifications: rawConfig.enableNotifications ?? true,
      theme: rawConfig.theme || 'auto',
      customSettings: {
        maxItems: rawConfig.customSettings?.maxItems || 10,
        sortOrder: rawConfig.customSettings?.sortOrder || 'asc'
      }
    };
  }

  async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
    const newConfig = this.parseConfig(context.config);
    const oldParsedConfig = this.parseConfig(oldConfig);
    
    // Handle specific configuration changes
    if (newConfig.apiKey !== oldParsedConfig.apiKey) {
      await this.reconnectWithNewApiKey(newConfig.apiKey);
    }
    
    if (newConfig.refreshInterval !== oldParsedConfig.refreshInterval) {
      this.updateRefreshInterval(newConfig.refreshInterval);
    }
    
    this.config = newConfig;
  }
}
```

### Configuration Validation

```typescript
class ConfigValidator {
  static validate(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      errors.push('API key is required and must be a string');
    }
    
    // Type validation
    if (config.refreshInterval !== undefined && typeof config.refreshInterval !== 'number') {
      errors.push('Refresh interval must be a number');
    }
    
    // Range validation
    if (config.refreshInterval && (config.refreshInterval < 1000 || config.refreshInterval > 3600000)) {
      errors.push('Refresh interval must be between 1 second and 1 hour');
    }
    
    // Enum validation
    if (config.theme && !['light', 'dark', 'auto'].includes(config.theme)) {
      errors.push('Theme must be one of: light, dark, auto');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Usage in plugin
async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
  const validation = ConfigValidator.validate(context.config);
  
  if (!validation.valid) {
    this.log('error', 'Invalid configuration:', validation.errors);
    await this.notify('Configuration Error', validation.errors.join(', '), 'error');
    return;
  }
  
  // Configuration is valid, proceed with update
  await this.updateConfiguration(context.config);
}
```

## Service Integration

### API Service Access

```typescript
interface PluginAPI {
  http: PluginHTTPAPI;
  notifications: NotificationAPI;
  qirvo: QirvoAPI;
}

// Using API services
export default class APIIntegratedPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // HTTP API
    const httpResponse = await context.api.http.get('https://api.example.com/data');
    const data = await httpResponse.json();
    
    // Notifications API
    context.api.notifications.show({
      title: 'Plugin Enabled',
      message: 'Successfully connected to external service',
      type: 'success'
    });
    
    // Qirvo API (if available)
    if (context.api.qirvo) {
      const tasks = await context.api.qirvo.getTasks();
      this.log('info', `Found ${tasks.length} tasks`);
    }
  }
}
```

### Storage Service

```typescript
// Advanced storage patterns
class PluginDataManager {
  constructor(private storage: PluginStorage) {}

  async saveUserData(userId: string, data: any): Promise<void> {
    const key = `user_${userId}`;
    await this.storage.set(key, {
      ...data,
      lastUpdated: new Date().toISOString()
    });
  }

  async getUserData(userId: string): Promise<any | null> {
    const key = `user_${userId}`;
    return await this.storage.get(key);
  }

  async getAllUserIds(): Promise<string[]> {
    const keys = await this.storage.keys();
    return keys
      .filter(key => key.startsWith('user_'))
      .map(key => key.replace('user_', ''));
  }

  async cleanupOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const keys = await this.storage.keys();
    const now = Date.now();
    
    for (const key of keys) {
      const data = await this.storage.get(key);
      if (data?.lastUpdated) {
        const age = now - new Date(data.lastUpdated).getTime();
        if (age > maxAge) {
          await this.storage.delete(key);
        }
      }
    }
  }
}
```

## Context Lifecycle

### Context Availability

```typescript
export default class LifecycleAwarePlugin extends BasePlugin {
  private context: PluginRuntimeContext | null = null;

  async onInstall(context: PluginRuntimeContext): Promise<void> {
    // Context is available during installation
    this.context = context;
    this.log('info', 'Plugin installed with context');
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Context is updated when plugin is enabled
    this.context = context;
    this.log('info', 'Plugin enabled with updated context');
    
    // Context is fully available here
    await this.initializeWithContext();
  }

  async onDisable(): Promise<void> {
    // Context may still be available during disable
    if (this.context) {
      await this.cleanupWithContext();
    }
    
    this.context = null;
  }

  private async initializeWithContext(): Promise<void> {
    if (!this.context) {
      throw new Error('Context not available');
    }
    
    // Use context services
    const config = this.context.config;
    const storage = this.context.storage;
    const api = this.context.api;
    
    // Initialize plugin functionality
  }

  private async cleanupWithContext(): Promise<void> {
    if (!this.context) return;
    
    // Cleanup using context services
    await this.context.storage.set('lastDisabled', new Date().toISOString());
  }
}
```

### Context Validation

```typescript
class ContextValidator {
  static validateContext(context: PluginRuntimeContext): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check required properties
    if (!context.plugin) issues.push('Plugin metadata missing');
    if (!context.storage) issues.push('Storage service missing');
    if (!context.api) issues.push('API service missing');
    if (!context.logger) issues.push('Logger service missing');
    
    // Check plugin metadata
    if (context.plugin) {
      if (!context.plugin.id) issues.push('Plugin ID missing');
      if (!context.plugin.name) issues.push('Plugin name missing');
      if (!context.plugin.version) issues.push('Plugin version missing');
    }
    
    // Check API services
    if (context.api) {
      if (!context.api.http) issues.push('HTTP API missing');
      if (!context.api.notifications) issues.push('Notifications API missing');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Usage
async onEnable(context: PluginRuntimeContext): Promise<void> {
  const validation = ContextValidator.validateContext(context);
  
  if (!validation.valid) {
    this.log('error', 'Invalid context:', validation.issues);
    throw new Error(`Context validation failed: ${validation.issues.join(', ')}`);
  }
  
  // Context is valid, proceed with initialization
  await this.initialize(context);
}
```

## Best Practices

### Context Usage
1. **Always Validate**: Check context availability before use
2. **Store Reference**: Keep context reference for lifecycle methods
3. **Handle Nulls**: User context may not always be available
4. **Type Safety**: Use TypeScript interfaces for configuration

### Performance
1. **Cache Data**: Don't repeatedly access context properties
2. **Lazy Loading**: Load context-dependent resources only when needed
3. **Cleanup**: Properly cleanup context references on disable

### Security
1. **Validate Permissions**: Always check permissions before API calls
2. **Sanitize Config**: Validate and sanitize configuration values
3. **User Privacy**: Respect user privacy when accessing user context

---

**Next**: [Storage API](./storage-api.md) for detailed storage documentation.
