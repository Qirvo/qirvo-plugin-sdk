# Testing Documentation

Comprehensive testing is essential for building reliable and maintainable Qirvo plugins. This section provides complete guides for all types of testing, from unit tests to end-to-end validation.

## Table of Contents

- [Testing Strategy Overview](#testing-strategy-overview)
- [Testing Types](#testing-types)
- [Quick Start Guide](#quick-start-guide)
- [Testing Best Practices](#testing-best-practices)
- [CI/CD Integration](#cicd-integration)

## Testing Strategy Overview

### Testing Pyramid

```
        /\
       /  \
      / E2E \     <- Few, slow, expensive
     /______\
    /        \
   /Integration\ <- Some, moderate speed
  /__________\
 /            \
/  Unit Tests  \   <- Many, fast, cheap
/______________\
```

**Unit Tests (70%)**
- Test individual functions and components in isolation
- Fast execution, easy to debug
- High code coverage, low maintenance

**Integration Tests (20%)**
- Test interactions between components
- Validate API integrations and data flow
- Medium execution time, moderate complexity

**End-to-End Tests (10%)**
- Test complete user workflows
- Validate real browser interactions
- Slow execution, high maintenance, high confidence

### Testing Philosophy

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how it does it
2. **Write Tests First** - Use TDD/BDD to drive development
3. **Keep Tests Simple** - Each test should verify one specific behavior
4. **Make Tests Reliable** - Avoid flaky tests that fail intermittently
5. **Test Edge Cases** - Cover error conditions and boundary values

## Testing Types

### 📋 [Unit Testing](./unit-testing.md)
Complete guide for testing individual components and functions.

**What You'll Learn:**
- Jest and testing framework setup
- Mocking dependencies and external services
- Testing React components with Testing Library
- Async operation testing
- Coverage reporting and thresholds

**Key Topics:**
- Basic unit test patterns
- Dependency injection for testability
- Component testing with user interactions
- Timer and interval testing
- Custom test utilities

### 🔗 [Integration Testing](./integration-testing.md)
Guide for testing component interactions and system boundaries.

**What You'll Learn:**
- API integration testing with MSW
- Database integration with test containers
- Plugin runtime testing
- End-to-end workflow validation
- Test environment management

**Key Topics:**
- HTTP client integration testing
- Rate limiting and error handling
- Storage service integration
- Full plugin lifecycle testing
- Test data management

### 🌐 [End-to-End Testing](./e2e-testing.md)
Browser automation and user journey testing.

**What You'll Learn:**
- Playwright setup and configuration
- Browser automation techniques
- Visual regression testing
- Performance testing
- Cross-browser compatibility

**Key Topics:**
- Plugin installation flows
- Dashboard widget interactions
- User preference management
- Screenshot comparison testing
- Mobile and responsive testing

## Quick Start Guide

### 1. Install Testing Dependencies

```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test \
  msw \
  mongodb-memory-server
```

### 2. Basic Test Structure

```typescript
// tests/example.test.ts
import { WeatherPlugin } from '../src/weatherPlugin';

describe('WeatherPlugin', () => {
  let plugin: WeatherPlugin;

  beforeEach(() => {
    plugin = new WeatherPlugin();
  });

  it('should format temperature correctly', () => {
    expect(plugin.formatTemperature(20)).toBe('20°C');
  });

  it('should handle invalid input', () => {
    expect(() => plugin.formatTemperature(NaN)).toThrow();
  });
});
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- weather.test.ts

# Run in watch mode
npm test -- --watch

# Run E2E tests
npx playwright test
```

### 4. Test Configuration Files

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
```

## Testing Best Practices

### ✅ Do's

**Write Descriptive Test Names**
```typescript
// ✅ Good
it('should return weather data when API call succeeds', () => {});
it('should throw error when API key is invalid', () => {});

// ❌ Bad
it('should work', () => {});
it('test weather', () => {});
```

**Use Arrange-Act-Assert Pattern**
```typescript
it('should calculate total price with tax', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  const taxRate = 0.1;
  
  // Act
  const total = calculateTotal(items, taxRate);
  
  // Assert
  expect(total).toBe(33); // (10 + 20) * 1.1
});
```

**Test Edge Cases**
```typescript
describe('formatTemperature', () => {
  it('should handle positive temperatures', () => {
    expect(formatTemperature(25)).toBe('25°C');
  });

  it('should handle negative temperatures', () => {
    expect(formatTemperature(-5)).toBe('-5°C');
  });

  it('should handle zero temperature', () => {
    expect(formatTemperature(0)).toBe('0°C');
  });

  it('should round decimal temperatures', () => {
    expect(formatTemperature(25.7)).toBe('26°C');
  });
});
```

**Mock External Dependencies**
```typescript
// Mock HTTP requests
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock timers
jest.useFakeTimers();

// Mock modules
jest.mock('../services/weatherService');
```

### ❌ Don'ts

**Don't Test Implementation Details**
```typescript
// ❌ Bad - testing internal state
expect(component.state.isLoading).toBe(true);

// ✅ Good - testing behavior
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

**Don't Write Overly Complex Tests**
```typescript
// ❌ Bad - testing too many things
it('should handle complete user workflow', () => {
  // 50 lines of test code testing everything
});

// ✅ Good - focused tests
it('should validate user input', () => {});
it('should save user preferences', () => {});
it('should display success message', () => {});
```

**Don't Ignore Async Operations**
```typescript
// ❌ Bad - not waiting for async
it('should fetch data', () => {
  fetchData();
  expect(data).toBeDefined(); // Will fail
});

// ✅ Good - properly handling async
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          MONGODB_URL: mongodb://localhost:27017/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start test server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### Quality Gates

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/core/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

## Testing Checklist

### Before Committing
- [ ] All unit tests pass
- [ ] Code coverage meets threshold (80%+)
- [ ] Integration tests pass
- [ ] No linting errors
- [ ] TypeScript compilation succeeds

### Before Releasing
- [ ] All test suites pass
- [ ] E2E tests pass on all browsers
- [ ] Performance tests meet benchmarks
- [ ] Visual regression tests pass
- [ ] Security tests pass

### Continuous Monitoring
- [ ] Test results tracked over time
- [ ] Flaky tests identified and fixed
- [ ] Coverage trends monitored
- [ ] Performance regressions detected
- [ ] Test execution time optimized

## Resources and Tools

### Testing Libraries
- **Jest** - JavaScript testing framework
- **Testing Library** - Simple and complete testing utilities
- **Playwright** - Cross-browser end-to-end testing
- **MSW** - API mocking library
- **MongoDB Memory Server** - In-memory MongoDB for testing

### Useful Links
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Docs](https://testing-library.com/docs/)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)

### Testing Philosophy Resources
- [Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

This comprehensive testing documentation ensures your Qirvo plugins are thoroughly tested, reliable, and maintainable across all scenarios and environments.
