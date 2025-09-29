# Testing Framework Guide

This guide covers the Qirvo Plugin SDK testing framework, including test utilities, mocking capabilities, and testing patterns specifically designed for plugin development.

## Table of Contents

- [Framework Overview](#framework-overview)
- [Test Utilities](#test-utilities)
- [Plugin Testing Patterns](#plugin-testing-patterns)
- [Mock Services](#mock-services)
- [Test Environment Setup](#test-environment-setup)
- [Advanced Testing Features](#advanced-testing-features)

## Framework Overview

### Qirvo Testing Framework

```typescript
// Core testing framework for Qirvo plugins
export class QirvoTestFramework {
  private mockContext: MockPluginContext;
  private mockServices: MockServiceRegistry;
  private testEnvironment: TestEnvironment;

  constructor(config: TestConfig = {}) {
    this.mockContext = new MockPluginContext(config.contextOverrides);
    this.mockServices = new MockServiceRegistry();
    this.testEnvironment = new TestEnvironment(config);
    this.setupGlobalMocks();
  }

  createTestSuite(name: string): TestSuite {
    return new TestSuite(name, this);
  }

  createPluginTest(pluginClass: any): PluginTestBuilder {
    return new PluginTestBuilder(pluginClass, this);
  }

  private setupGlobalMocks(): void {
    // Mock global APIs
    global.fetch = this.mockServices.createFetchMock();
    global.localStorage = this.mockServices.createStorageMock();
    global.sessionStorage = this.mockServices.createStorageMock();
  }

  getMockContext(): MockPluginContext {
    return this.mockContext;
  }

  getMockServices(): MockServiceRegistry {
    return this.mockServices;
  }

  cleanup(): void {
    this.mockServices.cleanup();
    this.testEnvironment.cleanup();
  }
}

interface TestConfig {
  contextOverrides?: Partial<PluginRuntimeContext>;
  mockServices?: Record<string, any>;
  environment?: 'jsdom' | 'node';
}
```

## Test Utilities

### Plugin Test Builder

```typescript
// Builder pattern for plugin tests
export class PluginTestBuilder {
  private pluginClass: any;
  private framework: QirvoTestFramework;
  private config: any = {};
  private setupFunctions: (() => void)[] = [];
  private teardownFunctions: (() => void)[] = [];

  constructor(pluginClass: any, framework: QirvoTestFramework) {
    this.pluginClass = pluginClass;
    this.framework = framework;
  }

  withConfig(config: any): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  withSetup(setupFn: () => void): this {
    this.setupFunctions.push(setupFn);
    return this;
  }

  withTeardown(teardownFn: () => void): this {
    this.teardownFunctions.push(teardownFn);
    return this;
  }

  build(): PluginTestInstance {
    return new PluginTestInstance(
      this.pluginClass,
      this.framework,
      this.config,
      this.setupFunctions,
      this.teardownFunctions
    );
  }
}

export class PluginTestInstance {
  private plugin: any;
  private context: MockPluginContext;
  private setupFunctions: (() => void)[];
  private teardownFunctions: (() => void)[];

  constructor(
    pluginClass: any,
    framework: QirvoTestFramework,
    config: any,
    setupFunctions: (() => void)[],
    teardownFunctions: (() => void)[]
  ) {
    this.context = framework.getMockContext();
    this.context.setConfig(config);
    this.plugin = new pluginClass();
    this.setupFunctions = setupFunctions;
    this.teardownFunctions = teardownFunctions;
  }

  async setup(): Promise<void> {
    this.setupFunctions.forEach(fn => fn());
    await this.plugin.onInstall?.(this.context);
    await this.plugin.onEnable?.(this.context);
  }

  async teardown(): Promise<void> {
    await this.plugin.onDisable?.();
    await this.plugin.onUninstall?.();
    this.teardownFunctions.forEach(fn => fn());
  }

  getPlugin(): any {
    return this.plugin;
  }

  getContext(): MockPluginContext {
    return this.context;
  }

  async invokeLifecycleMethod(method: string, ...args: any[]): Promise<any> {
    if (typeof this.plugin[method] === 'function') {
      return await this.plugin[method](...args);
    }
    throw new Error(`Method ${method} not found on plugin`);
  }
}
```

### Mock Plugin Context

```typescript
// Mock implementation of PluginRuntimeContext
export class MockPluginContext implements PluginRuntimeContext {
  public plugin: PluginInfo;
  public config: any = {};
  public storage: MockStorage;
  public user: UserInfo;
  public api: MockAPIClient;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(overrides: Partial<PluginRuntimeContext> = {}) {
    this.plugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      permissions: [],
      ...overrides.plugin
    };

    this.storage = new MockStorage();
    this.user = {
      id: 'test-user',
      email: 'test@example.com',
      ...overrides.user
    };

    this.api = new MockAPIClient();
    
    Object.assign(this, overrides);
  }

  setConfig(config: any): void {
    this.config = { ...this.config, ...config };
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(...args));
  }

  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  reset(): void {
    this.config = {};
    this.storage.clear();
    this.eventListeners.clear();
    this.api.reset();
  }
}
```

## Plugin Testing Patterns

### Lifecycle Testing

```typescript
// Test plugin lifecycle methods
export const LifecycleTester = {
  async testInstallation(plugin: any, context: MockPluginContext): Promise<TestResult> {
    const results: TestResult = {
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // Test installation
      if (plugin.onInstall) {
        await plugin.onInstall(context);
        results.warnings.push('Installation completed successfully');
      }

      // Verify plugin state
      if (plugin.getState && plugin.getState() !== 'installed') {
        results.errors.push('Plugin state not set to installed');
        results.passed = false;
      }

    } catch (error) {
      results.errors.push(`Installation failed: ${error.message}`);
      results.passed = false;
    }

    return results;
  },

  async testConfiguration(plugin: any, context: MockPluginContext, config: any): Promise<TestResult> {
    const results: TestResult = {
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // Set configuration
      context.setConfig(config);

      // Test enablement with config
      if (plugin.onEnable) {
        await plugin.onEnable(context);
      }

      // Verify configuration was applied
      if (plugin.getConfig) {
        const appliedConfig = plugin.getConfig();
        const configKeys = Object.keys(config);
        
        for (const key of configKeys) {
          if (appliedConfig[key] !== config[key]) {
            results.errors.push(`Configuration key ${key} not applied correctly`);
            results.passed = false;
          }
        }
      }

    } catch (error) {
      results.errors.push(`Configuration failed: ${error.message}`);
      results.passed = false;
    }

    return results;
  },

  async testCleanup(plugin: any): Promise<TestResult> {
    const results: TestResult = {
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // Test disable
      if (plugin.onDisable) {
        await plugin.onDisable();
      }

      // Test uninstall
      if (plugin.onUninstall) {
        await plugin.onUninstall();
      }

      // Verify cleanup
      if (plugin.getState && plugin.getState() !== 'uninstalled') {
        results.warnings.push('Plugin state not set to uninstalled');
      }

    } catch (error) {
      results.errors.push(`Cleanup failed: ${error.message}`);
      results.passed = false;
    }

    return results;
  }
};

interface TestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}
```

### Component Testing Utilities

```typescript
// React component testing utilities
export class ComponentTester {
  private framework: QirvoTestFramework;
  private renderOptions: RenderOptions;

  constructor(framework: QirvoTestFramework) {
    this.framework = framework;
    this.renderOptions = {
      wrapper: this.createWrapper()
    };
  }

  private createWrapper(): React.FC<{ children: React.ReactNode }> {
    const context = this.framework.getMockContext();
    
    return ({ children }) => (
      <PluginContextProvider value={context}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </PluginContextProvider>
    );
  }

  render(component: React.ReactElement): RenderResult {
    return render(component, this.renderOptions);
  }

  async renderAsync(component: React.ReactElement): Promise<RenderResult> {
    const result = this.render(component);
    
    // Wait for any async operations to complete
    await waitFor(() => {
      expect(result.container).toBeInTheDocument();
    });

    return result;
  }

  createUserEvent(): UserEvent {
    return userEvent.setup();
  }

  async simulatePluginLoad(component: React.ReactElement): Promise<RenderResult> {
    const result = this.render(component);
    
    // Simulate plugin loading states
    await act(async () => {
      // Trigger loading
      fireEvent(window, new CustomEvent('plugin:loading'));
      
      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger loaded
      fireEvent(window, new CustomEvent('plugin:loaded'));
    });

    return result;
  }
}
```

## Mock Services

### Mock Service Registry

```typescript
// Registry for mock services
export class MockServiceRegistry {
  private mocks: Map<string, any> = new Map();
  private fetchMock: jest.MockedFunction<typeof fetch>;
  private storageMocks: Map<string, MockStorage> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    // Create fetch mock
    this.fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    this.mocks.set('fetch', this.fetchMock);

    // Create storage mocks
    this.storageMocks.set('localStorage', new MockStorage());
    this.storageMocks.set('sessionStorage', new MockStorage());
  }

  createFetchMock(): jest.MockedFunction<typeof fetch> {
    return this.fetchMock;
  }

  createStorageMock(): MockStorage {
    return new MockStorage();
  }

  mockApiResponse(url: string, response: any, status: number = 200): void {
    this.fetchMock.mockImplementation((input) => {
      const requestUrl = typeof input === 'string' ? input : input.url;
      
      if (requestUrl.includes(url)) {
        return Promise.resolve(new Response(
          JSON.stringify(response),
          { status, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      
      return Promise.reject(new Error('Network error'));
    });
  }

  mockApiError(url: string, error: Error): void {
    this.fetchMock.mockImplementation((input) => {
      const requestUrl = typeof input === 'string' ? input : input.url;
      
      if (requestUrl.includes(url)) {
        return Promise.reject(error);
      }
      
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
  }

  getMock(name: string): any {
    return this.mocks.get(name);
  }

  setMock(name: string, mock: any): void {
    this.mocks.set(name, mock);
  }

  cleanup(): void {
    this.fetchMock.mockClear();
    this.storageMocks.forEach(storage => storage.clear());
  }
}

// Mock storage implementation
export class MockStorage implements Storage {
  private data: Map<string, string> = new Map();

  get length(): number {
    return this.data.size;
  }

  getItem(key: string): string | null {
    return this.data.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }
}
```

## Test Environment Setup

### Environment Configuration

```typescript
// Test environment setup and configuration
export class TestEnvironment {
  private config: TestConfig;
  private cleanupTasks: (() => void)[] = [];

  constructor(config: TestConfig = {}) {
    this.config = {
      environment: 'jsdom',
      timeout: 30000,
      ...config
    };
    
    this.setupEnvironment();
  }

  private setupEnvironment(): void {
    // Setup DOM environment if needed
    if (this.config.environment === 'jsdom') {
      this.setupJSDOM();
    }

    // Setup global test utilities
    this.setupGlobalUtils();

    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  private setupJSDOM(): void {
    // Mock window APIs
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  }

  private setupGlobalUtils(): void {
    // Add global test utilities
    global.waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));
    
    global.flushPromises = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    };
  }

  private setupCleanupHandlers(): void {
    // Add cleanup for timers
    this.cleanupTasks.push(() => {
      jest.clearAllTimers();
    });

    // Add cleanup for mocks
    this.cleanupTasks.push(() => {
      jest.clearAllMocks();
    });
  }

  addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  cleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
  }
}
```

## Advanced Testing Features

### Test Automation

```typescript
// Automated test generation and execution
export class TestAutomation {
  static generatePluginTests(pluginClass: any): TestSuite {
    const suite = new TestSuite(`${pluginClass.name} Automated Tests`);
    
    // Generate lifecycle tests
    suite.addTest('should install successfully', async () => {
      const framework = new QirvoTestFramework();
      const testInstance = framework.createPluginTest(pluginClass).build();
      
      await testInstance.setup();
      expect(testInstance.getPlugin()).toBeDefined();
      await testInstance.teardown();
    });

    // Generate configuration tests
    suite.addTest('should handle configuration', async () => {
      const framework = new QirvoTestFramework();
      const testInstance = framework.createPluginTest(pluginClass)
        .withConfig({ testKey: 'testValue' })
        .build();
      
      await testInstance.setup();
      const config = testInstance.getContext().config;
      expect(config.testKey).toBe('testValue');
      await testInstance.teardown();
    });

    return suite;
  }

  static async runPerformanceTests(pluginClass: any): Promise<PerformanceReport> {
    const framework = new QirvoTestFramework();
    const testInstance = framework.createPluginTest(pluginClass).build();
    
    const report: PerformanceReport = {
      installTime: 0,
      enableTime: 0,
      memoryUsage: 0,
      renderTime: 0
    };

    // Measure installation time
    const installStart = performance.now();
    await testInstance.setup();
    report.installTime = performance.now() - installStart;

    // Measure memory usage
    if ('memory' in performance) {
      report.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    await testInstance.teardown();
    
    return report;
  }
}

interface PerformanceReport {
  installTime: number;
  enableTime: number;
  memoryUsage: number;
  renderTime: number;
}

export class TestSuite {
  private name: string;
  private tests: TestCase[] = [];
  private framework?: QirvoTestFramework;

  constructor(name: string, framework?: QirvoTestFramework) {
    this.name = name;
    this.framework = framework;
  }

  addTest(name: string, testFn: () => Promise<void> | void): void {
    this.tests.push({ name, testFn });
  }

  async run(): Promise<TestResults> {
    const results: TestResults = {
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const test of this.tests) {
      try {
        await test.testFn();
        results.passed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          testName: test.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }
}

interface TestCase {
  name: string;
  testFn: () => Promise<void> | void;
}

interface TestResults {
  passed: number;
  failed: number;
  errors: Array<{ testName: string; error: string }>;
}
```

This testing framework provides comprehensive tools for testing Qirvo plugins with proper mocking, lifecycle testing, and automation capabilities.

---

**Next**: [Debugging Guide](./debugging.md)
