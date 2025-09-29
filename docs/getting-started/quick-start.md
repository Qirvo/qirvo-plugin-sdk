# Quick Start Guide

Get up and running with Qirvo plugin development in just a few minutes! This guide will walk you through creating your first plugin and deploying it to the Qirvo platform.

## Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** or **yarn** package manager
- **TypeScript** knowledge (recommended)
- **Qirvo account** with developer access

## Installation

### 1. Install the SDK

```bash
npm install @qirvo/plugin-sdk
# or
yarn add @qirvo/plugin-sdk
```

### 2. Initialize Your Plugin Project

```bash
mkdir my-first-plugin
cd my-first-plugin
npm init -y
npm install @qirvo/plugin-sdk
npm install -D typescript @types/node
```

### 3. Create TypeScript Configuration

```bash
npx tsc --init
```

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Create Your First Plugin

### 1. Plugin Structure

Create the following directory structure:

```
my-first-plugin/
├── package.json
├── tsconfig.json
├── manifest.json
└── src/
    └── index.ts
```

### 2. Create the Manifest

Create `manifest.json`:

```json
{
  "manifest_version": 1,
  "name": "My First Plugin",
  "version": "1.0.0",
  "description": "A simple plugin to get started with Qirvo development",
  "type": "dashboard-widget",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "category": "productivity",
  "permissions": ["storage", "notifications"],
  "dashboard_widget": {
    "name": "Hello World Widget",
    "description": "A simple greeting widget",
    "component": "HelloWorldWidget",
    "defaultSize": { "width": 300, "height": 200 },
    "size": "medium"
  },
  "main": "dist/index.js",
  "repository": "https://github.com/yourusername/my-first-plugin",
  "license": "MIT"
}
```

### 3. Create the Plugin Code

Create `src/index.ts`:

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

export default class MyFirstPlugin extends BasePlugin {
  /**
   * Called when the plugin is first installed
   */
  async onInstall(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'My First Plugin installed successfully!');
    
    // Store some initial data
    await this.setStorage('installDate', new Date().toISOString());
    await this.setStorage('greetingCount', 0);
    
    // Show welcome notification
    await this.notify(
      'Welcome!', 
      'My First Plugin has been installed and is ready to use.',
      'success'
    );
  }

  /**
   * Called when the plugin is enabled
   */
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'My First Plugin enabled!');
    
    // Increment greeting count
    const currentCount = await this.getStorage<number>('greetingCount') || 0;
    await this.setStorage('greetingCount', currentCount + 1);
    
    // Show greeting
    const userName = context.user?.email?.split('@')[0] || 'User';
    await this.notify(
      'Hello!', 
      `Welcome back, ${userName}! This is greeting #${currentCount + 1}.`,
      'info'
    );
  }

  /**
   * Called when the plugin is disabled
   */
  async onDisable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'My First Plugin disabled');
    await this.notify('Goodbye!', 'My First Plugin has been disabled.', 'info');
  }

  /**
   * Called when plugin configuration changes
   */
  async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
    this.log('info', 'Plugin configuration updated', { oldConfig, newConfig: context.config });
  }

  /**
   * Custom method to get plugin statistics
   */
  async getStats(): Promise<{ installDate: string; greetingCount: number }> {
    const installDate = await this.getStorage<string>('installDate') || 'Unknown';
    const greetingCount = await this.getStorage<number>('greetingCount') || 0;
    
    return { installDate, greetingCount };
  }
}

// Export the plugin class as default
export { MyFirstPlugin };
```

### 4. Update Package.json

Update your `package.json`:

```json
{
  "name": "my-first-plugin",
  "version": "1.0.0",
  "description": "My first Qirvo plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rimraf dist",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "keywords": ["qirvo", "plugin", "hello-world"],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "dependencies": {
    "@qirvo/plugin-sdk": "^2.0.7"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "rimraf": "^5.0.0"
  },
  "files": [
    "dist/**/*",
    "manifest.json",
    "README.md"
  ]
}
```

## Build and Test

### 1. Build Your Plugin

```bash
npm run build
```

This creates the compiled JavaScript in the `dist/` directory.

### 2. Package Your Plugin

```bash
npm pack
```

This creates a `.tgz` file that you can upload to Qirvo.

## Deploy to Qirvo

### 1. Upload via Dashboard

1. Open your Qirvo dashboard
2. Navigate to **Plugins** → **Installed Plugins**
3. Click **"Upload Plugin"**
4. Select your `.tgz` file
5. Configure any required settings
6. Enable the plugin

### 2. Test Your Plugin

Once uploaded and enabled:

1. Check the **Dashboard** for your widget
2. Look for notifications when enabling/disabling
3. Check the plugin logs in the developer console

## Next Steps

Congratulations! You've created your first Qirvo plugin. Here's what to explore next:

### Enhance Your Plugin

- **Add Configuration**: Create user-configurable settings
- **External APIs**: Integrate with third-party services
- **CLI Commands**: Add command-line functionality
- **Advanced Widgets**: Create interactive dashboard components

### Learn More

- [**Plugin Types**](../plugin-types/overview.md) - Explore different plugin types
- [**API Reference**](../api-reference/core-apis.md) - Detailed API documentation
- [**Examples**](../examples/README.md) - More complex plugin examples
- [**Best Practices**](../guides/security.md) - Security and performance tips

### Common Patterns

```typescript
// Configuration example
const apiKey = await this.getConfig<string>('apiKey');
if (!apiKey) {
  await this.notify('Configuration Required', 'Please set your API key in plugin settings.', 'warning');
  return;
}

// HTTP request example
try {
  const response = await this.httpGet('https://api.example.com/data');
  const data = await response.json();
  await this.setStorage('lastData', data);
} catch (error) {
  this.log('error', 'Failed to fetch data:', error);
  await this.notify('Error', 'Failed to fetch data from API', 'error');
}

// Scheduled task example
setInterval(async () => {
  const enabled = await this.getConfig<boolean>('autoSync');
  if (enabled) {
    await this.performSync();
  }
}, 60000); // Every minute
```

## Troubleshooting

### Common Issues

**Build Errors**
- Ensure TypeScript is properly configured
- Check that all dependencies are installed
- Verify your `tsconfig.json` settings

**Upload Failures**
- Check manifest.json syntax
- Ensure all required fields are present
- Verify file permissions and structure

**Runtime Errors**
- Check browser console for error messages
- Verify plugin permissions in manifest
- Test with minimal functionality first

### Getting Help

- **Documentation**: Browse the full [documentation](../README.md)
- **Examples**: Check out [example plugins](../examples/README.md)
- **Support**: Email [support@qirvo.ai](mailto:support@qirvo.ai)
- **Community**: Join our [Discord server](https://discord.gg/qirvo)

---

**Next**: [Installation & Setup](./installation.md) for more detailed setup instructions.
