# Breaking Changes

This document tracks all breaking changes across Qirvo Plugin SDK versions, providing detailed migration instructions for each change.

## Table of Contents

- [Version 2.0.0](#version-200)
- [Version 1.2.0](#version-120)
- [Version 1.1.0](#version-110)
- [Migration Checklist](#migration-checklist)
- [Deprecation Timeline](#deprecation-timeline)

## Version 2.0.0

### Major Breaking Changes

#### 1. Manifest Format Changes

**What Changed:**
- Manifest version bumped to 2.0
- Permission format changed from dot-notation to kebab-case
- New required fields added

**Before (v1.x):**
```json
{
  "manifestVersion": 1,
  "permissions": [
    "api.external",
    "storage.read",
    "storage.write"
  ]
}
```

**After (v2.0):**
```json
{
  "manifestVersion": 2,
  "permissions": [
    "network-access",
    "storage-read", 
    "storage-write"
  ],
  "runtime": {
    "version": "2.0",
    "environment": "browser"
  }
}
```

**Migration Steps:**
1. Update `manifestVersion` to `2`
2. Convert permissions using the mapping table below
3. Add required `runtime` section

**Permission Mapping:**
| Old Format | New Format |
|------------|------------|
| `api.external` | `network-access` |
| `storage.read` | `storage-read` |
| `storage.write` | `storage-write` |
| `filesystem.read` | `filesystem-access` |
| `filesystem.write` | `filesystem-access` |
| `notifications.show` | `notifications` |
| `clipboard.read` | `clipboard-read` |
| `clipboard.write` | `clipboard-write` |

#### 2. Plugin API Changes

**What Changed:**
- `BasePlugin` class constructor signature changed
- Lifecycle methods renamed
- Context API restructured

**Before (v1.x):**
```typescript
export class MyPlugin extends BasePlugin {
  constructor(config: PluginConfig) {
    super(config);
  }
  
  async onInit(): Promise<void> {
    // Initialization code
  }
  
  async onDestroy(): Promise<void> {
    // Cleanup code
  }
}
```

**After (v2.0):**
```typescript
export class MyPlugin extends BasePlugin {
  constructor(context: PluginContext, config: PluginConfig) {
    super(context, config);
  }
  
  async initialize(): Promise<void> {
    // Initialization code
  }
  
  async cleanup(): Promise<void> {
    // Cleanup code
  }
  
  async destroy(): Promise<void> {
    // Final cleanup
  }
}
```

**Migration Steps:**
1. Update constructor to accept `PluginContext` as first parameter
2. Rename `onInit()` to `initialize()`
3. Rename `onDestroy()` to `cleanup()`
4. Add new `destroy()` method if needed

#### 3. Storage API Changes

**What Changed:**
- Storage API moved from global to context
- Method signatures updated
- Added encryption support

**Before (v1.x):**
```typescript
// Global storage access
await qirvo.storage.set('key', 'value');
const value = await qirvo.storage.get('key');
```

**After (v2.0):**
```typescript
// Context-based storage access
await this.context.storage.set('key', 'value');
const value = await this.context.storage.get('key');

// With encryption (optional)
await this.context.storage.setSecure('key', 'value');
const value = await this.context.storage.getSecure('key');
```

**Migration Steps:**
1. Replace `qirvo.storage` with `this.context.storage`
2. Update all storage method calls
3. Consider using secure storage for sensitive data

#### 4. Event System Changes

**What Changed:**
- Event system completely redesigned
- New event types and patterns
- Improved type safety

**Before (v1.x):**
```typescript
// Old event system
qirvo.events.on('user-action', (data) => {
  console.log('User action:', data);
});

qirvo.events.emit('plugin-event', { data: 'value' });
```

**After (v2.0):**
```typescript
// New event system with types
this.context.events.subscribe<UserActionEvent>('user:action', (event) => {
  console.log('User action:', event.data);
});

this.context.events.emit('plugin:custom-event', { 
  data: 'value',
  timestamp: Date.now()
});
```

**Migration Steps:**
1. Replace `qirvo.events` with `this.context.events`
2. Update event names to use colon notation
3. Add proper TypeScript types for events
4. Update event handlers to use new signature

### Minor Breaking Changes

#### 5. Configuration Schema

**What Changed:**
- Configuration validation is now required
- Schema format updated

**Before (v1.x):**
```typescript
// No schema validation
export const config = {
  apiKey: '',
  timeout: 5000
};
```

**After (v2.0):**
```typescript
// Required schema validation
export const configSchema = {
  type: 'object',
  properties: {
    apiKey: { type: 'string', required: true },
    timeout: { type: 'number', default: 5000, minimum: 1000 }
  }
};

export const config = {
  apiKey: '',
  timeout: 5000
};
```

#### 6. Hook System Changes

**What Changed:**
- Hook registration API updated
- New hook types added
- Improved error handling

**Before (v1.x):**
```typescript
qirvo.hooks.register('before-save', async (data) => {
  return processData(data);
});
```

**After (v2.0):**
```typescript
this.context.hooks.register({
  type: 'middleware',
  event: 'before-save',
  handler: async (data, context) => {
    return processData(data);
  },
  priority: 10
});
```

## Version 1.2.0

### Breaking Changes

#### 1. TypeScript Requirement

**What Changed:**
- All new plugins must be written in TypeScript
- JavaScript plugins still supported but deprecated

**Migration Steps:**
1. Rename `.js` files to `.ts`
2. Add type annotations
3. Update build configuration
4. Install TypeScript dependencies

#### 2. Build System Changes

**What Changed:**
- Webpack configuration updated
- New build targets added

**Before (v1.1):**
```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'plugin.js'
  }
};
```

**After (v1.2):**
```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'plugin.js',
    library: 'QirvoPlugin',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
};
```

## Version 1.1.0

### Breaking Changes

#### 1. Plugin Registration

**What Changed:**
- Plugin registration method updated
- New metadata requirements

**Before (v1.0):**
```typescript
export default class MyPlugin {
  static pluginName = 'my-plugin';
  static version = '1.0.0';
}
```

**After (v1.1):**
```typescript
export default class MyPlugin extends BasePlugin {
  static metadata = {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'Plugin description',
    author: 'Author name'
  };
}
```

## Migration Checklist

### Pre-Migration Checklist

- [ ] **Backup Current Plugin**
  - Create complete backup of plugin directory
  - Export plugin configuration
  - Document current functionality

- [ ] **Environment Preparation**
  - Update development environment
  - Install latest SDK version
  - Update build tools and dependencies

- [ ] **Compatibility Assessment**
  - Run compatibility checker
  - Review breaking changes list
  - Estimate migration effort

### Migration Execution Checklist

- [ ] **Manifest Updates**
  - [ ] Update manifest version
  - [ ] Convert permission format
  - [ ] Add required new fields
  - [ ] Validate manifest schema

- [ ] **Code Updates**
  - [ ] Update plugin class structure
  - [ ] Migrate API calls
  - [ ] Update event handling
  - [ ] Fix TypeScript errors

- [ ] **Configuration Updates**
  - [ ] Add configuration schema
  - [ ] Update build configuration
  - [ ] Update package.json dependencies

- [ ] **Testing**
  - [ ] Run automated tests
  - [ ] Perform manual testing
  - [ ] Test in development environment
  - [ ] Validate all features work

### Post-Migration Checklist

- [ ] **Validation**
  - [ ] Plugin loads successfully
  - [ ] All features functional
  - [ ] No console errors
  - [ ] Performance acceptable

- [ ] **Documentation**
  - [ ] Update plugin documentation
  - [ ] Update version numbers
  - [ ] Document migration changes

- [ ] **Deployment**
  - [ ] Test in staging environment
  - [ ] Deploy to production
  - [ ] Monitor for issues

## Deprecation Timeline

### Currently Deprecated (Will be removed in v3.0)

| Feature | Deprecated In | Removal In | Alternative |
|---------|---------------|------------|-------------|
| JavaScript plugins | v1.2.0 | v3.0.0 | TypeScript plugins |
| Old event system | v2.0.0 | v3.0.0 | New event system |
| Global storage API | v2.0.0 | v3.0.0 | Context storage API |
| Dot-notation permissions | v2.0.0 | v3.0.0 | Kebab-case permissions |

### Deprecation Warnings

To help with migration, the SDK provides deprecation warnings:

```typescript
// Example deprecation warning
console.warn('[DEPRECATED] qirvo.storage.get() is deprecated. Use this.context.storage.get() instead. This will be removed in v3.0.0');
```

### Migration Support

- **Documentation**: Comprehensive migration guides available
- **Tools**: Automated migration tools provided
- **Support**: Community support available on GitHub
- **Timeline**: 6-month deprecation period before removal

For additional help with migration, please refer to the [Migration Guide](./migration-guide.md) or open an issue on GitHub.
