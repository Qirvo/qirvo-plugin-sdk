# Qirvo Plugin SDK v2.0

[![npm version](https://badge.fury.io/js/%40qirvo%2Fplugin-sdk.svg)](https://badge.fury.io/js/%40qirvo%2Fplugin-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

The comprehensive SDK for developing plugins for the Qirvo platform with **full marketplace integration**. Build powerful extensions that integrate seamlessly with Qirvo's dashboard, CLI, automation system, and plugin marketplace.

## 🆕 What's New in v2.0

- **🏪 Full Marketplace Integration**: Complete alignment with Qirvo's plugin marketplace
- **💰 Payment & Licensing**: Built-in support for paid plugins and license management
- **🔧 Enhanced API Access**: Calendar, health metrics, and extended HTTP methods
- **🏗️ Plugin Runtime Management**: Advanced plugin lifecycle and runtime control
- **🧪 Testing Framework**: Comprehensive testing utilities for plugin development
- **📊 Analytics Ready**: Plugin usage and performance tracking capabilities
- **🔐 Enhanced Permissions**: Granular permission system with detailed descriptions

## 🚀 Quick Start

### Installation

```bash
npm install @qirvo/plugin-sdk
```

### Basic Plugin Structure

```typescript
import { BasePlugin, PluginRuntimeContext, createCommand } from '@qirvo/plugin-sdk';

export default class MyPlugin extends BasePlugin {
  async onInstall(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Plugin installed successfully!');
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Plugin enabled!');
  }
}
```

## 📚 Core Concepts

### Plugin Lifecycle

Plugins have several lifecycle hooks you can implement:

- `onInstall()` - Called when plugin is first installed
- `onUninstall()` - Called when plugin is removed
- `onEnable()` - Called when plugin is enabled
- `onDisable()` - Called when plugin is disabled
- `onUpdate()` - Called when plugin is updated to new version
- `onConfigChange()` - Called when plugin configuration changes

### Plugin Runtime Context

Every plugin receives a runtime context with access to:

```typescript
interface PluginRuntimeContext {
  plugin: { id: string; name: string; version: string };
  config: Record<string, any>;
  storage: PluginStorage;
  api: PluginAPI;
  logger: PluginLogger;
}
```

### Storage API

Persistent storage for your plugin data:

```typescript
// Store data
await this.context.storage.set('key', { data: 'value' });

// Retrieve data
const data = await this.context.storage.get('key');

// Delete data
await this.context.storage.delete('key');

// Clear all data
await this.context.storage.clear();
```

### Qirvo API Access

Interact with Qirvo's core features:

```typescript
// Task management
const tasks = await this.context.api.tasks.list();
await this.context.api.tasks.create({ title: 'New task', description: 'Task description' });

// Notifications
this.context.api.notifications.show({
  title: 'Success',
  message: 'Operation completed',
  type: 'success'
});

// HTTP requests
const response = await this.context.api.http.get('https://api.example.com/data');
```

### HTTP Client & API Endpoints

For direct API access, use the built-in HTTP client and endpoint utilities:

```typescript
import { apiClient, endpoints } from '@qirvo/plugin-sdk';

// Set authentication token (if needed)
apiClient.setAuthToken('your-jwt-token');

// Plugin management
const plugins = await apiClient.get(endpoints.plugins.list);
await apiClient.post(endpoints.plugins.install, { pluginId: 'my-plugin' });

// Marketplace access
const marketplacePlugins = await apiClient.get(endpoints.marketplace.plugins);
const searchResults = await apiClient.get(`${endpoints.marketplace.search}?q=weather`);

// Storage operations
await apiClient.post(endpoints.storage.set('myKey'), { value: 'myData' });
const data = await apiClient.get(endpoints.storage.get('myKey'));

// Widget management
const widgets = await apiClient.get(endpoints.widgets.available);
await apiClient.post(endpoints.widgets.register, widgetConfig);
```

#### Available Endpoints

- **Plugins**: Install, uninstall, configure, and manage plugins
- **Widgets**: Register and manage dashboard widgets
- **Marketplace**: Browse, search, and install from marketplace
- **Storage**: Key-value storage for plugin data
- **Dashboard**: Layout and widget management
- **Commands**: Register and execute CLI commands

## 🛠️ Plugin Types

### CLI Plugins

Add custom commands to the Qirvo CLI:

```typescript
export const commands = [
  createCommand('hello', 'Say hello', async (args, context) => {
    console.log(`Hello, ${args[0] || 'World'}!`);
  })
];
```

### Dashboard Widgets

Create interactive dashboard components:

```typescript
// manifest.json
{
  "dashboard_widget": {
    "name": "My Widget",
    "component": "MyWidget",
    "size": "medium",
    "position": "sidebar"
  }
}
```

### Background Services

Run scheduled tasks and automation:

```typescript
export default class BackgroundPlugin extends BasePlugin {
  private timer?: NodeJS.Timeout;

  async onEnable(): Promise<void> {
    this.timer = setInterval(async () => {
      // Run background task
      await this.performTask();
    }, 60000); // Every minute
  }

  async onDisable(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
```

## 📋 Enhanced Plugin Manifest

Every plugin needs a `manifest.json` file with the new enhanced schema:

```json
{
  "manifest_version": 1,
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "Does awesome things",
  "type": "dashboard-widget",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "website": "https://yourwebsite.com"
  },
  "category": "productivity",
  "permissions": ["network", "storage", "notifications"],
  "external_services": [
    {
      "name": "OpenWeatherMap",
      "base_url": "https://api.openweathermap.org/data/2.5",
      "api_key_required": true,
      "description": "Weather data API"
    }
  ],
  "dashboard_widget": {
    "name": "My Widget",
    "description": "Awesome dashboard widget",
    "component": "MyWidget",
    "defaultSize": { "width": 400, "height": 300 },
    "configSchema": {
      "type": "object",
      "properties": {
        "apiKey": {
          "type": "string",
          "title": "API Key",
          "description": "Your API key"
        }
      }
    }
  },
  "pages": [
    {
      "name": "settings",
      "path": "/plugins/my-plugin/settings",
      "component": "SettingsPage",
      "title": "Plugin Settings",
      "icon": "settings"
    }
  ],
  "menu_items": [
    {
      "label": "My Plugin",
      "path": "/plugins/my-plugin",
      "icon": "puzzle",
      "order": 100
    }
  ],
  "commands": [
    {
      "name": "hello",
      "description": "Say hello",
      "usage": "hello [name]"
    }
  ],
  "repository": "https://github.com/user/my-plugin",
  "homepage": "https://github.com/user/my-plugin",
  "bugs": "https://github.com/user/my-plugin/issues",
  "license": "MIT"
}
```

## 🔧 Configuration Schema

Define user-configurable settings:

```typescript
interface PluginConfigField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  title: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}
```

## 📦 Publishing Your Plugin

### 1. Package Structure

```
my-plugin/
├── package.json
├── manifest.json
├── src/
│   ├── index.ts
│   └── widget.tsx (optional)
├── README.md
└── tsconfig.json
```

### 2. Build and Package

```bash
npm run build
npm pack
```

### 3. Upload to Qirvo

1. Go to Qirvo Dashboard → Plugins → Installed Plugins
2. Click "Upload Plugin"
3. Select your `.tgz` file
4. Configure and test your plugin

## 🎯 Examples

### Weather Widget Plugin

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

export default class WeatherPlugin extends BasePlugin {
  async getWeather(location: string): Promise<any> {
    const apiKey = await this.getConfig('apiKey');
    const response = await this.context.api.http.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`
    );
    return response.json();
  }

  async onEnable(): Promise<void> {
    // Start weather updates
    setInterval(async () => {
      const location = await this.getConfig('defaultLocation');
      if (location) {
        const weather = await this.getWeather(location);
        await this.setStorage('currentWeather', weather);
      }
    }, 15 * 60 * 1000); // Every 15 minutes
  }
}
```

### Task Automation Plugin

```typescript
export default class TaskAutomationPlugin extends BasePlugin {
  async onConfigChange(): Promise<void> {
    const rules = await this.getConfig('automationRules');
    
    for (const rule of rules) {
      if (rule.trigger === 'daily') {
        await this.context.api.tasks.create({
          title: rule.taskTitle,
          description: rule.taskDescription,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      }
    }
  }
}
```

## 🔒 Security & Permissions

Plugins run in sandboxed environments with declared permissions:

- `network` - Make HTTP requests
- `storage` - Access persistent storage
- `tasks` - Read/write tasks
- `calendar` - Access calendar data
- `location` - Access location services
- `notifications` - Send notifications

## 📖 API Reference

### BasePlugin Class

The base class all plugins should extend:

```typescript
abstract class BasePlugin {
  protected context: PluginRuntimeContext;
  
  // Lifecycle hooks (optional)
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
  protected async notify(title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error'): Promise<void>;
  protected async httpGet(url: string, options?: RequestInit): Promise<Response>;
  protected async httpPost(url: string, data: any, options?: RequestInit): Promise<Response>;
}
```

### Utility Functions

```typescript
// Create a command
createCommand(name: string, description: string, handler: CommandHandler, options?: CommandOptions): PluginCommand;

// Validate manifest
validateManifest(manifest: any): { valid: boolean; errors: string[] };

// Create plugin instance
createPlugin(pluginClass: new () => BasePlugin): BasePlugin;
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/ultracoolbru/qirvo-plugin-sdk/blob/main/CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](https://github.com/ultracoolbru/qirvo-plugin-sdk/blob/main/LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://docs.qirvo.ai/plugins)
- 💬 [Discord Community](https://discord.gg/qirvo)
- 🐛 [Issue Tracker](https://github.com/ultracoolbru/qirvo-plugin-sdk/issues)
- 📧 [Email Support](mailto:support@qirvo.ai)

## 🎉 Plugin Examples

Check out these example plugins to get started:

- [Weather Widget](https://github.com/ultracoolbru/qirvo-plugin-sdk/tree/main/examples/weather-widget)
- [Task Automation](https://github.com/ultracoolbru/qirvo-plugin-sdk/tree/main/examples/task-automation)
- [GitHub Integration](https://github.com/ultracoolbru/qirvo-plugin-sdk/tree/main/examples/github-integration)
- [Calendar Sync](https://github.com/ultracoolbru/qirvo-plugin-sdk/tree/main/examples/calendar-sync)

---

Made with ❤️ by the Qirvo Team
