# Development Environment

This guide covers setting up an optimal development environment for Qirvo plugin development, including advanced IDE configuration, debugging tools, and development workflows.

## Table of Contents

- [IDE Setup](#ide-setup)
- [Development Tools](#development-tools)
- [Debugging Configuration](#debugging-configuration)
- [Testing Environment](#testing-environment)
- [Build Tools](#build-tools)
- [Development Workflow](#development-workflow)

## IDE Setup

### Visual Studio Code (Recommended)

#### Essential Extensions

```bash
# Core development extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss

# React development (for widgets)
code --install-extension ms-vscode.vscode-react-refactor
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense

# Additional productivity extensions
code --install-extension ms-vscode.vscode-json
code --install-extension redhat.vscode-yaml
code --install-extension ms-vscode.vscode-markdown
code --install-extension yzhang.markdown-all-in-one
```

#### Workspace Configuration

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true,
    "**/.DS_Store": true,
    "**/Thumbs.db": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/*.log": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "typescript.preferences.quoteStyle": "single",
  "javascript.preferences.quoteStyle": "single"
}
```

#### Tasks Configuration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Plugin",
      "type": "npm",
      "script": "build",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "presentation": {
        "echo": true,
        "reveal": "silent",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "Watch Build",
      "type": "npm",
      "script": "dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "isBackground": true,
      "problemMatcher": {
        "owner": "typescript",
        "source": "ts",
        "applyTo": "closedDocuments",
        "fileLocation": ["relative", "${workspaceRoot}"],
        "pattern": "$tsc-watch",
        "background": {
          "activeOnStart": true,
          "beginsPattern": {
            "regexp": "(\\s*)Starting compilation in watch mode\\.\\.\\."
          },
          "endsPattern": {
            "regexp": "(\\s*)Found \\d+ errors?\\. Watching for file changes\\."
          }
        }
      }
    },
    {
      "label": "Test Plugin",
      "type": "npm",
      "script": "test",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Package Plugin",
      "type": "npm",
      "script": "package",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

#### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Plugin",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "qirvo:*"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "preLaunchTask": "Build Plugin"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "NODE_ENV": "test"
      }
    },
    {
      "name": "Attach to Plugin Process",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "${workspaceFolder}"
    }
  ]
}
```

### WebStorm/IntelliJ IDEA

#### Configuration Steps

1. **Enable TypeScript Service**:
   - Go to `Settings` → `Languages & Frameworks` → `TypeScript`
   - Enable TypeScript Language Service
   - Set TypeScript version to project version

2. **ESLint Integration**:
   - Go to `Settings` → `Languages & Frameworks` → `JavaScript` → `Code Quality Tools` → `ESLint`
   - Enable ESLint
   - Set configuration file to `.eslintrc.js`

3. **Prettier Integration**:
   - Install Prettier plugin
   - Go to `Settings` → `Languages & Frameworks` → `JavaScript` → `Prettier`
   - Set Prettier package to `node_modules/prettier`
   - Enable "On code reformat" and "On save"

#### Run Configurations

Create run configurations for:
- **Build**: `npm run build`
- **Dev**: `npm run dev`
- **Test**: `npm run test`
- **Package**: `npm run package`

## Development Tools

### Package.json Development Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"tsc --watch\" \"nodemon dist/index.js\"",
    "build": "npm run clean && tsc",
    "build:prod": "npm run clean && tsc --project tsconfig.prod.json",
    "clean": "rimraf dist",
    "lint": "eslint src/**/*.{ts,tsx} --fix",
    "lint:check": "eslint src/**/*.{ts,tsx}",
    "format": "prettier --write src/**/*.{ts,tsx,json,md}",
    "format:check": "prettier --check src/**/*.{ts,tsx,json,md}",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "type-check": "tsc --noEmit",
    "validate": "npm run type-check && npm run lint:check && npm run format:check",
    "package": "npm run build:prod && npm pack",
    "prepublishOnly": "npm run validate && npm run test:ci && npm run build:prod",
    "dev:debug": "node --inspect-brk=9229 dist/index.js",
    "analyze": "npm run build && bundlesize"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/jest": "^29.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "concurrently": "^8.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-react": "^7.0.0",
    "eslint-plugin-react-hooks": "^4.0.0",
    "jest": "^29.0.0",
    "nodemon": "^3.0.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0",
    "bundlesize": "^0.18.0"
  }
}
```

### Git Hooks with Husky

```bash
# Install husky and lint-staged
npm install --save-dev husky lint-staged

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# Add commit-msg hook
npx husky add .husky/commit-msg 'npx commitlint --edit "$1"'
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

## Debugging Configuration

### Node.js Debugging

#### Debug Plugin Execution

```typescript
// src/debug.ts
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

export default class DebugPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Set breakpoint here
    debugger;
    
    this.log('debug', 'Plugin context:', {
      pluginId: context.plugin.id,
      userId: context.user?.id,
      config: context.config
    });
    
    // Debug storage operations
    await this.debugStorage(context);
    
    // Debug API calls
    await this.debugAPI(context);
  }

  private async debugStorage(context: PluginRuntimeContext): Promise<void> {
    try {
      await context.storage.set('debug_test', { timestamp: new Date() });
      const value = await context.storage.get('debug_test');
      this.log('debug', 'Storage test:', value);
    } catch (error) {
      this.log('error', 'Storage debug failed:', error);
    }
  }

  private async debugAPI(context: PluginRuntimeContext): Promise<void> {
    if (context.api.qirvo) {
      try {
        const tasks = await context.api.qirvo.tasks.getRecent(5);
        this.log('debug', 'Recent tasks:', tasks);
      } catch (error) {
        this.log('error', 'API debug failed:', error);
      }
    }
  }
}
```

#### Debug Launch Script

```bash
#!/bin/bash
# scripts/debug.sh

echo "Starting plugin in debug mode..."

# Build the plugin
npm run build

# Start with debugging enabled
node --inspect-brk=9229 dist/index.js

echo "Debug session ended"
```

### Browser Debugging (for Widgets)

#### React DevTools Setup

```bash
# Install React DevTools
npm install --save-dev @welldone-software/why-did-you-render

# For Chrome extension
# Install React Developer Tools from Chrome Web Store
```

#### Widget Debug Component

```typescript
// src/components/DebugWidget.tsx
import React, { useEffect, useState } from 'react';

interface DebugWidgetProps {
  plugin: any;
  config: any;
}

export const DebugWidget: React.FC<DebugWidgetProps> = ({ plugin, config }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const collectDebugInfo = async () => {
      const info = {
        pluginId: plugin.context?.plugin?.id,
        config,
        storage: await plugin.getStorage('debug_info'),
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(info);
      console.log('Widget Debug Info:', info);
    };

    collectDebugInfo();
  }, [plugin, config]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4>Debug Info</h4>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
};
```

## Testing Environment

### Jest Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Test Setup

Create `src/test/setup.ts`:

```typescript
import { jest } from '@jest/globals';

// Mock Qirvo SDK
jest.mock('@qirvo/plugin-sdk', () => ({
  BasePlugin: class MockBasePlugin {
    protected log = jest.fn();
    protected notify = jest.fn();
    protected getStorage = jest.fn();
    protected setStorage = jest.fn();
    protected getConfig = jest.fn();
    protected setConfig = jest.fn();
  }
}));

// Global test utilities
global.mockPluginContext = {
  plugin: {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0'
  },
  config: {},
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    keys: jest.fn(),
    has: jest.fn(),
    size: jest.fn()
  },
  api: {
    http: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    },
    notifications: {
      show: jest.fn()
    }
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  bus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn()
  }
};
```

### Test Examples

Create `src/__tests__/plugin.test.ts`:

```typescript
import { jest } from '@jest/globals';
import TaskCounterPlugin from '../index';

describe('TaskCounterPlugin', () => {
  let plugin: TaskCounterPlugin;
  let mockContext: any;

  beforeEach(() => {
    plugin = new TaskCounterPlugin();
    mockContext = global.mockPluginContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onInstall', () => {
    it('should initialize default settings', async () => {
      await plugin.onInstall(mockContext);
      
      expect(mockContext.storage.set).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({
          showOverdue: true,
          refreshInterval: 30000,
          theme: 'auto'
        })
      );
    });

    it('should show welcome notification', async () => {
      await plugin.onInstall(mockContext);
      
      expect(mockContext.api.notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task Counter Installed',
          type: 'success'
        })
      );
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', completed: true, createdAt: new Date() },
        { id: '2', title: 'Task 2', completed: false, createdAt: new Date() }
      ];

      mockContext.storage.get.mockResolvedValue(mockTasks);

      const stats = await plugin.getTaskStats();

      expect(stats).toEqual({
        total: 2,
        completed: 1,
        pending: 1,
        overdue: 0
      });
    });
  });
});
```

## Build Tools

### TypeScript Configuration

Create `tsconfig.prod.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false,
    "declaration": true,
    "removeComments": true
  },
  "exclude": [
    "node_modules",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**",
    "src/test/**"
  ]
}
```

### Bundle Analysis

Create `bundlesize.config.json`:

```json
{
  "files": [
    {
      "path": "./dist/index.js",
      "maxSize": "50kb"
    },
    {
      "path": "./dist/components/*.js",
      "maxSize": "30kb"
    }
  ]
}
```

### Build Optimization

Create `scripts/build-optimize.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Remove development-only code
function optimizeBuild() {
  const distDir = path.join(__dirname, '../dist');
  
  // Remove source maps in production
  if (process.env.NODE_ENV === 'production') {
    const files = fs.readdirSync(distDir);
    files.forEach(file => {
      if (file.endsWith('.map')) {
        fs.unlinkSync(path.join(distDir, file));
      }
    });
  }
  
  console.log('Build optimization complete');
}

optimizeBuild();
```

## Development Workflow

### Daily Development Routine

```bash
#!/bin/bash
# scripts/dev-start.sh

echo "🚀 Starting Qirvo Plugin Development"

# Check dependencies
npm audit --audit-level moderate

# Start development mode
npm run dev &

# Open in VS Code
code .

echo "✅ Development environment ready"
echo "📝 Edit files in src/"
echo "🔍 Watch mode active - changes will auto-compile"
echo "🐛 Use F5 to start debugging"
```

### Pre-commit Checklist

```bash
#!/bin/bash
# scripts/pre-commit-check.sh

echo "🔍 Running pre-commit checks..."

# Type checking
echo "📝 Type checking..."
npm run type-check || exit 1

# Linting
echo "🔧 Linting..."
npm run lint:check || exit 1

# Formatting
echo "💅 Format checking..."
npm run format:check || exit 1

# Tests
echo "🧪 Running tests..."
npm run test:ci || exit 1

# Build test
echo "🏗️ Build test..."
npm run build || exit 1

echo "✅ All checks passed!"
```

### Release Workflow

```bash
#!/bin/bash
# scripts/release.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  exit 1
fi

echo "🚀 Releasing version $VERSION"

# Run all checks
./scripts/pre-commit-check.sh || exit 1

# Update version
npm version $VERSION

# Build for production
npm run build:prod

# Package
npm run package

# Create release notes
echo "📝 Creating release notes..."
git log --oneline --since="$(git describe --tags --abbrev=0 @^)" > RELEASE_NOTES.md

echo "✅ Release $VERSION ready!"
echo "📦 Package: $(ls -1 *.tgz | tail -1)"
```

### Environment Variables

Create `.env.development`:

```bash
# Development environment
NODE_ENV=development
DEBUG=qirvo:*

# Plugin development
PLUGIN_DEBUG=true
PLUGIN_LOG_LEVEL=debug
PLUGIN_HOT_RELOAD=true

# API endpoints
QIRVO_API_URL=http://localhost:3000
QIRVO_WS_URL=ws://localhost:3000

# External services (for testing)
WEATHER_API_KEY=your_dev_key
GITHUB_TOKEN=your_dev_token
```

Create `.env.production`:

```bash
# Production environment
NODE_ENV=production

# Plugin settings
PLUGIN_LOG_LEVEL=info

# API endpoints
QIRVO_API_URL=https://app.qirvo.ai
QIRVO_WS_URL=wss://app.qirvo.ai
```

This comprehensive development environment setup provides everything needed for efficient Qirvo plugin development, from IDE configuration to testing and deployment workflows.

---

**Next**: [Configuration Fields](../configuration/configuration-fields.md) for plugin configuration documentation.
