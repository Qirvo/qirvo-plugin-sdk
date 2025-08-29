# Contributing to Qirvo Plugin SDK

Thank you for your interest in contributing to the Qirvo Plugin SDK! This document provides guidelines and information for contributors.

## 🚀 Quick Start

### Development Setup

1. **Fork and Clone** the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/qirvo-plugin-sdk.git
   cd qirvo-plugin-sdk
   ```

2. **Install Dependencies**:

   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up Development Environment**:

   ```bash
   # Install development dependencies
   npm run dev:setup

   # Run tests to ensure everything works
   npm test

   # Start development server
   npm run dev
   ```

### Project Structure

```bash
qirvo-plugin-sdk/
├── src/                    # Source code
│   ├── index.ts           # Main exports
│   ├── types.ts           # TypeScript type definitions
│   ├── endpoints.ts       # API endpoints and HTTP client
│   └── utils/             # Utility functions
├── examples/              # Example plugins
├── docs/                  # Documentation
├── dist/                  # Built distribution files
├── package.json
├── tsconfig.json
├── .eslintrc.json         # ESLint configuration
└── README.md
```

## 🛠️ Development Workflow

### 1. Choose an Issue

- Check the [Issues](https://github.com/ultracoolbru/qirvo-plugin-sdk/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

- Follow the [Code Style Guidelines](#code-style-guidelines)
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass: `npm test`

### 4. Commit Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add new plugin validation feature

- Add validation for plugin manifest schema
- Improve error messages for invalid configurations
- Add unit tests for validation logic"
```

### 5. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Prefer interfaces over types for object shapes
- Use `readonly` for immutable properties
- Avoid `any` type - use specific types instead
- Use proper JSDoc comments for public APIs

### Naming Conventions

- **Files**: Use kebab-case (e.g., `plugin-manager.ts`)
- **Classes**: Use PascalCase (e.g., `PluginManager`)
- **Interfaces**: Use PascalCase with 'I' prefix (e.g., `IPluginConfig`)
- **Methods/Variables**: Use camelCase (e.g., `getPluginConfig`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)

### Code Structure

```typescript
// Good: Clear structure with proper typing
interface PluginOptions {
  readonly name: string;
  readonly version: string;
  readonly config?: Record<string, unknown>;
}

class PluginManager {
  private readonly plugins = new Map<string, Plugin>();

  public async loadPlugin(options: PluginOptions): Promise<Plugin> {
    // Implementation
  }
}

// Avoid: Poor structure
class pluginManager {
  plugins: any[] = [];

  loadPlugin(name: string, version: any) {
    // Implementation without proper typing
  }
}
```

### Imports and Exports

```typescript
// Good: Organized imports
import type { PluginConfig } from './types';
import { validateManifest } from './validation';
import { BasePlugin } from './base-plugin';

// Avoid: Disorganized imports
import { BasePlugin, validateManifest } from './base-plugin';
import type { PluginConfig } from './types';
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- plugin-manager.test.ts
```

### Writing Tests

- Use Jest as the testing framework
- Place test files next to the code they test: `*.test.ts`
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies
- Aim for >90% code coverage

```typescript
// Example test file: plugin-manager.test.ts
import { PluginManager } from './plugin-manager';
import { mockPlugin } from '../test-utils';

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
  });

  describe('loadPlugin', () => {
    it('should load a valid plugin successfully', async () => {
      // Arrange
      const pluginConfig = mockPlugin();

      // Act
      const plugin = await manager.loadPlugin(pluginConfig);

      // Assert
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe(pluginConfig.name);
    });

    it('should throw error for invalid plugin', async () => {
      // Arrange
      const invalidConfig = { name: '' };

      // Act & Assert
      await expect(manager.loadPlugin(invalidConfig))
        .rejects
        .toThrow('Invalid plugin configuration');
    });
  });
});
```

### Test Coverage

- Maintain >90% code coverage
- Include tests for:
  - Happy path scenarios
  - Error conditions
  - Edge cases
  - Integration between components

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for all public APIs
- Include parameter descriptions and return types
- Document thrown errors

```typescript
/**
 * Loads and initializes a plugin
 * @param options - Plugin configuration options
 * @returns Promise resolving to the loaded plugin instance
 * @throws {PluginLoadError} When plugin cannot be loaded
 * @throws {ValidationError} When plugin configuration is invalid
 */
public async loadPlugin(options: PluginOptions): Promise<Plugin> {
  // Implementation
}
```

### README Updates

- Update README.md for new features
- Add examples for new APIs
- Update installation instructions if needed
- Keep examples in the `/examples` directory

## 🔧 Development Tools

### Linting

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Type Checking

```bash
# Run TypeScript compiler check
npm run typecheck

# Build the project
npm run build
```

### Pre-commit Hooks

We use Husky for Git hooks. Before committing:

1. All tests must pass
2. Code must pass linting
3. TypeScript compilation must succeed
4. Code coverage requirements must be met

## 🚢 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Creating a Release

1. **Update Changelog**:
   - Add entries to `CHANGELOG.md`
   - Follow the format: `[TYPE] Description (#PR)`

2. **Update Version**:

   ```bash
   npm version patch  # for patch release
   npm version minor  # for minor release
   npm version major  # for major release
   ```

3. **Build and Test**:

   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Publish**:

   ```bash
   npm publish
   ```

5. **Create GitHub Release**:
   - Go to GitHub Releases
   - Create new release with the version tag
   - Copy changelog entries to release notes

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Clear Title**: Describe the issue concisely
2. **Steps to Reproduce**: Step-by-step instructions
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Node.js version, OS, SDK version
6. **Code Sample**: Minimal code to reproduce the issue
7. **Error Messages**: Full error output

### Feature Requests

For feature requests, please include:

1. **Use Case**: Describe your use case
2. **Proposed Solution**: How you think it should work
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Screenshots, mockups, etc.

## 💬 Communication

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For code review feedback

## 📋 Pull Request Guidelines

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Code passes linting (`npm run lint`)
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Code coverage >90% (`npm run test:coverage`)
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
- [ ] Commit messages follow conventional format

### PR Description

A good PR description includes:

1. **What**: What changes are being made
2. **Why**: Why these changes are needed
3. **How**: How the changes work
4. **Testing**: How the changes were tested

### Example PR Description

```markdown
## What
Add support for plugin marketplace integration

## Why
Users need to be able to browse and install plugins from the marketplace directly within the SDK

## How
- Added new `MarketplaceClient` class
- Implemented plugin search and installation methods
- Added marketplace-specific endpoints to API client
- Updated type definitions for marketplace responses

## Testing
- Added unit tests for marketplace client
- Added integration tests for plugin installation
- Manual testing with Qirvo dashboard
- All existing tests still pass
```

## 🎯 Code Review Process

### Review Checklist

**For Reviewers:**

- [ ] Code follows style guidelines
- [ ] Tests are comprehensive and pass
- [ ] Documentation is clear and complete
- [ ] No breaking changes without justification
- [ ] Performance implications considered
- [ ] Security implications reviewed

**For Contributors:**

- [ ] Address all review comments
- [ ] Rebase on latest main branch
- [ ] Ensure CI passes
- [ ] Update branch if needed

## 📊 Performance Guidelines

- Minimize bundle size impact
- Use lazy loading for large features
- Optimize API calls and caching
- Consider memory usage for long-running plugins
- Profile performance-critical code

## 🔒 Security Considerations

- Validate all user inputs
- Sanitize data before processing
- Use HTTPS for all external API calls
- Implement proper error handling
- Follow principle of least privilege
- Keep dependencies updated

## 🙏 Recognition

Contributors will be:

- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Recognized in the project's Hall of Fame

Thank you for contributing to Qirvo Plugin SDK! 🎉
