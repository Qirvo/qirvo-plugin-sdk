# Installation & Setup

This guide provides detailed instructions for installing the Qirvo Plugin SDK and setting up your development environment for plugin development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [SDK Installation](#sdk-installation)
- [Development Environment Setup](#development-environment-setup)
- [Project Initialization](#project-initialization)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 8.0.0 or higher (or yarn 1.22.0+)
- **TypeScript**: Version 4.5.0 or higher
- **Git**: For version control and repository management

### Recommended Tools

- **Visual Studio Code**: With TypeScript and ESLint extensions
- **Qirvo Account**: For testing and publishing plugins
- **Postman/Insomnia**: For API testing (optional)

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Should output v16.0.0 or higher

# Check npm version
npm --version
# Should output 8.0.0 or higher

# Check TypeScript installation
npx tsc --version
# Should output Version 4.5.0 or higher

# Check Git installation
git --version
# Should output git version 2.x.x or higher
```

## SDK Installation

### Method 1: npm (Recommended)

```bash
# Install globally for CLI access
npm install -g @qirvo/plugin-sdk

# Or install locally in your project
npm install @qirvo/plugin-sdk

# Install development dependencies
npm install -D typescript @types/node
```

### Method 2: yarn

```bash
# Install globally
yarn global add @qirvo/plugin-sdk

# Or install locally
yarn add @qirvo/plugin-sdk

# Install development dependencies
yarn add -D typescript @types/node
```

### Method 3: From Source

```bash
# Clone the repository
git clone https://github.com/qirvo/plugin-sdk.git
cd plugin-sdk

# Install dependencies
npm install

# Build the SDK
npm run build

# Link for global access
npm link
```

### Verify Installation

```bash
# Check SDK version
qirvo-sdk --version

# Or if installed locally
npx qirvo-sdk --version

# List available commands
qirvo-sdk --help
```

## Development Environment Setup

### IDE Configuration

#### Visual Studio Code

1. **Install Extensions**:
   ```bash
   # Install recommended extensions
   code --install-extension ms-vscode.vscode-typescript-next
   code --install-extension dbaeumer.vscode-eslint
   code --install-extension esbenp.prettier-vscode
   code --install-extension bradlc.vscode-tailwindcss
   ```

2. **Workspace Settings** (`.vscode/settings.json`):
   ```json
   {
     "typescript.preferences.importModuleSpecifier": "relative",
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "eslint.autoFixOnSave": true,
     "files.exclude": {
       "**/node_modules": true,
       "**/dist": true,
       "**/.git": true
     }
   }
   ```

3. **Launch Configuration** (`.vscode/launch.json`):
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
           "NODE_ENV": "development"
         }
       }
     ]
   }
   ```

#### WebStorm/IntelliJ

1. **TypeScript Configuration**:
   - Enable TypeScript service
   - Set TypeScript version to project version
   - Enable ESLint integration

2. **Run Configuration**:
   - Create Node.js run configuration
   - Set working directory to project root
   - Add environment variables as needed

### Git Configuration

```bash
# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Create .gitignore for plugin projects
cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
.nyc_output/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Plugin specific
.qirvo/
plugin-cache/
EOF
```

## Project Initialization

### Using SDK CLI

```bash
# Create new plugin project
qirvo-sdk create my-plugin

# Or with specific template
qirvo-sdk create my-plugin --template dashboard-widget

# Navigate to project
cd my-plugin

# Install dependencies
npm install
```

### Manual Setup

```bash
# Create project directory
mkdir my-qirvo-plugin
cd my-qirvo-plugin

# Initialize npm project
npm init -y

# Install SDK and dependencies
npm install @qirvo/plugin-sdk
npm install -D typescript @types/node eslint prettier

# Create TypeScript configuration
npx tsc --init
```

### TypeScript Configuration

Create or update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### ESLint Configuration

Create `.eslintrc.js`:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  env: {
    node: true,
    es6: true
  }
};
```

### Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Package.json Scripts

Update your `package.json` with useful scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "dev": "tsc --watch",
    "clean": "rimraf dist",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepublishOnly": "npm run clean && npm run build",
    "package": "npm run build && npm pack",
    "start": "node dist/index.js"
  }
}
```

## Verification

### Test SDK Installation

```bash
# Check SDK commands
qirvo-sdk --help

# Validate project structure
qirvo-sdk validate

# Test TypeScript compilation
npm run build

# Run linting
npm run lint
```

### Create Test Plugin

Create `src/index.ts`:

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

export default class TestPlugin extends BasePlugin {
  async onInstall(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Test plugin installed successfully!');
    console.log('Plugin SDK is working correctly');
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Test plugin enabled');
    
    // Test storage
    await this.setStorage('test', 'Hello, Qirvo!');
    const value = await this.getStorage('test');
    
    console.log('Storage test:', value);
    
    // Test notification
    await this.notify('Test', 'Plugin SDK setup complete!', 'success');
  }
}
```

Create `manifest.json`:

```json
{
  "manifest_version": 1,
  "name": "Test Plugin",
  "version": "1.0.0",
  "description": "Test plugin to verify SDK installation",
  "type": "dashboard-widget",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "category": "utilities",
  "permissions": ["storage-read", "storage-write", "notifications"],
  "main": "dist/index.js",
  "license": "MIT"
}
```

### Build and Test

```bash
# Build the plugin
npm run build

# Check build output
ls -la dist/

# Test the plugin (if you have Qirvo CLI)
qirvo plugin test ./
```

## Troubleshooting

### Common Issues

#### Node.js Version Issues

```bash
# If using nvm (Node Version Manager)
nvm install 16
nvm use 16

# Verify version
node --version
```

#### TypeScript Compilation Errors

```bash
# Clear TypeScript cache
npx tsc --build --clean

# Reinstall TypeScript
npm uninstall -g typescript
npm install -g typescript@latest

# Check TypeScript configuration
npx tsc --showConfig
```

#### SDK Installation Issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall SDK
npm uninstall @qirvo/plugin-sdk
npm install @qirvo/plugin-sdk

# Check for conflicting global installations
npm list -g --depth=0
```

#### Permission Issues (macOS/Linux)

```bash
# Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use nvm instead of global npm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

#### Windows-Specific Issues

```powershell
# Run as Administrator if needed
# Set execution policy for PowerShell scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Use Windows Subsystem for Linux (WSL) as alternative
wsl --install
```

### Getting Help

#### Check SDK Status

```bash
# Verify SDK installation
qirvo-sdk doctor

# Check environment
qirvo-sdk env

# Validate project
qirvo-sdk validate
```

#### Debug Information

```bash
# Get detailed version information
qirvo-sdk --version --verbose

# Check Node.js and npm configuration
npm config list
node -p "process.versions"

# Check TypeScript configuration
npx tsc --showConfig
```

#### Support Resources

- **Documentation**: [https://docs.qirvo.ai/plugins](https://docs.qirvo.ai/plugins)
- **GitHub Issues**: [https://github.com/qirvo/plugin-sdk/issues](https://github.com/qirvo/plugin-sdk/issues)
- **Community Discord**: [https://discord.gg/qirvo](https://discord.gg/qirvo)
- **Email Support**: [support@qirvo.ai](mailto:support@qirvo.ai)

### Environment Variables

Create `.env` file for development:

```bash
# Development environment
NODE_ENV=development

# Qirvo API configuration
QIRVO_API_URL=https://api.qirvo.ai
QIRVO_API_KEY=your_development_api_key

# Plugin development settings
PLUGIN_DEBUG=true
PLUGIN_LOG_LEVEL=debug

# External service keys (for testing)
WEATHER_API_KEY=your_weather_api_key
```

Load environment variables in your plugin:

```typescript
import * as dotenv from 'dotenv';

// Load environment variables in development
if (process.env.NODE_ENV === 'development') {
  dotenv.config();
}

export default class MyPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey && process.env.NODE_ENV === 'development') {
      this.log('warn', 'WEATHER_API_KEY not set in development environment');
    }
  }
}
```

---

**Next**: [Your First Plugin](./first-plugin.md) to start building your first plugin.
