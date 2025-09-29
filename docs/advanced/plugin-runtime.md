# Plugin Runtime

This guide covers the Qirvo plugin runtime system, including runtime architecture, lifecycle management, resource allocation, and performance optimization.

## Table of Contents

- [Runtime Architecture](#runtime-architecture)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Resource Management](#resource-management)
- [Runtime Security](#runtime-security)
- [Performance Optimization](#performance-optimization)
- [Runtime Debugging](#runtime-debugging)

## Runtime Architecture

### Runtime System Overview

```typescript
// Core runtime system architecture
export class PluginRuntime {
  private plugins: Map<string, PluginInstance> = new Map();
  private resourceManager: ResourceManager;
  private securityManager: SecurityManager;
  private eventBus: EventBus;
  private scheduler: TaskScheduler;
  
  constructor(config: RuntimeConfig) {
    this.resourceManager = new ResourceManager(config.resources);
    this.securityManager = new SecurityManager(config.security);
    this.eventBus = new EventBus();
    this.scheduler = new TaskScheduler();
    this.setupRuntime();
  }
  
  private setupRuntime(): void {
    // Initialize runtime environment
    this.initializeEnvironment();
    
    // Setup plugin isolation
    this.setupPluginIsolation();
    
    // Configure resource limits
    this.configureResourceLimits();
    
    // Setup monitoring
    this.setupMonitoring();
  }
  
  async loadPlugin(manifest: PluginManifest): Promise<PluginInstance> {
    // Validate plugin
    await this.securityManager.validatePlugin(manifest);
    
    // Allocate resources
    const resources = await this.resourceManager.allocate(manifest.id, manifest.resources);
    
    // Create isolated environment
    const environment = await this.createPluginEnvironment(manifest, resources);
    
    // Load plugin code
    const pluginCode = await this.loadPluginCode(manifest);
    
    // Create plugin instance
    const instance = new PluginInstance(manifest, environment, pluginCode);
    
    // Register plugin
    this.plugins.set(manifest.id, instance);
    
    // Initialize plugin
    await instance.initialize();
    
    return instance;
  }
  
  private async createPluginEnvironment(
    manifest: PluginManifest, 
    resources: AllocatedResources
  ): Promise<PluginEnvironment> {
    return {
      id: manifest.id,
      sandbox: await this.createSandbox(manifest),
      context: this.createPluginContext(manifest, resources),
      apis: this.createRestrictedAPIs(manifest.permissions),
      storage: await this.createPluginStorage(manifest.id),
      network: this.createNetworkProxy(manifest.permissions)
    };
  }
  
  private async createSandbox(manifest: PluginManifest): Promise<Sandbox> {
    return new Sandbox({
      allowedGlobals: this.getAllowedGlobals(manifest.permissions),
      memoryLimit: manifest.resources?.memory || '128MB',
      timeoutLimit: manifest.resources?.timeout || 30000,
      networkAccess: manifest.permissions.includes('network-access')
    });
  }
}

interface RuntimeConfig {
  resources: ResourceConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

interface PluginEnvironment {
  id: string;
  sandbox: Sandbox;
  context: PluginContext;
  apis: RestrictedAPIs;
  storage: PluginStorage;
  network: NetworkProxy;
}
```

### Plugin Instance Management

```typescript
// Plugin instance lifecycle management
export class PluginInstance {
  private manifest: PluginManifest;
  private environment: PluginEnvironment;
  private pluginCode: PluginCode;
  private state: PluginState = PluginState.UNLOADED;
  private metrics: PluginMetrics;
  
  constructor(
    manifest: PluginManifest,
    environment: PluginEnvironment,
    pluginCode: PluginCode
  ) {
    this.manifest = manifest;
    this.environment = environment;
    this.pluginCode = pluginCode;
    this.metrics = new PluginMetrics(manifest.id);
  }
  
  async initialize(): Promise<void> {
    try {
      this.state = PluginState.INITIALIZING;
      this.metrics.startTimer('initialization');
      
      // Execute plugin initialization
      await this.environment.sandbox.execute(() => {
        return this.pluginCode.initialize(this.environment.context);
      });
      
      this.state = PluginState.INITIALIZED;
      this.metrics.endTimer('initialization');
      
      // Register plugin hooks
      await this.registerHooks();
      
    } catch (error) {
      this.state = PluginState.ERROR;
      this.metrics.recordError('initialization', error);
      throw error;
    }
  }
  
  async start(): Promise<void> {
    if (this.state !== PluginState.INITIALIZED) {
      throw new Error(`Cannot start plugin in state: ${this.state}`);
    }
    
    try {
      this.state = PluginState.STARTING;
      this.metrics.startTimer('startup');
      
      // Start plugin services
      await this.environment.sandbox.execute(() => {
        return this.pluginCode.start();
      });
      
      this.state = PluginState.RUNNING;
      this.metrics.endTimer('startup');
      
      // Start health monitoring
      this.startHealthMonitoring();
      
    } catch (error) {
      this.state = PluginState.ERROR;
      this.metrics.recordError('startup', error);
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (this.state !== PluginState.RUNNING) {
      return;
    }
    
    try {
      this.state = PluginState.STOPPING;
      
      // Stop health monitoring
      this.stopHealthMonitoring();
      
      // Execute plugin cleanup
      await this.environment.sandbox.execute(() => {
        return this.pluginCode.stop();
      });
      
      this.state = PluginState.STOPPED;
      
    } catch (error) {
      this.state = PluginState.ERROR;
      this.metrics.recordError('shutdown', error);
      throw error;
    }
  }
  
  async unload(): Promise<void> {
    await this.stop();
    
    try {
      // Cleanup resources
      await this.environment.sandbox.destroy();
      await this.environment.storage.cleanup();
      
      this.state = PluginState.UNLOADED;
      
    } catch (error) {
      this.metrics.recordError('unload', error);
      throw error;
    }
  }
  
  private startHealthMonitoring(): void {
    const healthCheck = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        this.metrics.recordHealth(health);
        
        if (!health.healthy) {
          console.warn(`Plugin ${this.manifest.id} health check failed:`, health.issues);
        }
      } catch (error) {
        this.metrics.recordError('health_check', error);
      }
    }, 30000); // Check every 30 seconds
    
    this.environment.context.addCleanupTask(() => {
      clearInterval(healthCheck);
    });
  }
  
  private async checkHealth(): Promise<PluginHealth> {
    const memoryUsage = await this.environment.sandbox.getMemoryUsage();
    const cpuUsage = await this.environment.sandbox.getCPUUsage();
    
    const issues: string[] = [];
    
    // Check memory usage
    const memoryLimit = this.parseMemoryLimit(this.manifest.resources?.memory || '128MB');
    if (memoryUsage > memoryLimit * 0.9) {
      issues.push(`High memory usage: ${memoryUsage}MB / ${memoryLimit}MB`);
    }
    
    // Check CPU usage
    if (cpuUsage > 80) {
      issues.push(`High CPU usage: ${cpuUsage}%`);
    }
    
    // Check plugin-specific health
    let pluginHealth = true;
    try {
      pluginHealth = await this.environment.sandbox.execute(() => {
        return this.pluginCode.healthCheck?.() || true;
      });
    } catch (error) {
      issues.push(`Plugin health check failed: ${error.message}`);
      pluginHealth = false;
    }
    
    return {
      healthy: issues.length === 0 && pluginHealth,
      issues,
      metrics: {
        memoryUsage,
        cpuUsage,
        uptime: Date.now() - this.metrics.startTime
      }
    };
  }
}

enum PluginState {
  UNLOADED = 'unloaded',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}
```

## Plugin Lifecycle

### Lifecycle Hooks

```typescript
// Advanced lifecycle management
export class PluginLifecycleManager {
  private hooks: Map<string, LifecycleHook[]> = new Map();
  private runtime: PluginRuntime;
  
  constructor(runtime: PluginRuntime) {
    this.runtime = runtime;
    this.setupDefaultHooks();
  }
  
  registerHook(phase: LifecyclePhase, hook: LifecycleHook): void {
    if (!this.hooks.has(phase)) {
      this.hooks.set(phase, []);
    }
    
    this.hooks.get(phase)!.push(hook);
    
    // Sort by priority
    this.hooks.get(phase)!.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  async executeHooks(
    phase: LifecyclePhase, 
    context: LifecycleContext
  ): Promise<void> {
    const hooks = this.hooks.get(phase) || [];
    
    for (const hook of hooks) {
      try {
        await hook.execute(context);
      } catch (error) {
        console.error(`Lifecycle hook failed in phase ${phase}:`, error);
        
        if (hook.critical) {
          throw error;
        }
      }
    }
  }
  
  private setupDefaultHooks(): void {
    // Pre-load validation
    this.registerHook('pre-load', {
      name: 'security-validation',
      priority: 100,
      critical: true,
      execute: async (context) => {
        await this.runtime.securityManager.validatePlugin(context.manifest);
      }
    });
    
    // Resource allocation
    this.registerHook('pre-load', {
      name: 'resource-allocation',
      priority: 90,
      critical: true,
      execute: async (context) => {
        context.resources = await this.runtime.resourceManager.allocate(
          context.manifest.id,
          context.manifest.resources
        );
      }
    });
    
    // Post-load registration
    this.registerHook('post-load', {
      name: 'plugin-registration',
      priority: 100,
      critical: false,
      execute: async (context) => {
        await this.runtime.registerPlugin(context.instance);
      }
    });
    
    // Pre-unload cleanup
    this.registerHook('pre-unload', {
      name: 'resource-cleanup',
      priority: 100,
      critical: false,
      execute: async (context) => {
        await this.runtime.resourceManager.deallocate(context.manifest.id);
      }
    });
  }
}

interface LifecycleHook {
  name: string;
  priority?: number;
  critical?: boolean;
  execute: (context: LifecycleContext) => Promise<void>;
}

interface LifecycleContext {
  manifest: PluginManifest;
  instance?: PluginInstance;
  resources?: AllocatedResources;
  phase: LifecyclePhase;
}

type LifecyclePhase = 
  | 'pre-load' 
  | 'post-load' 
  | 'pre-start' 
  | 'post-start' 
  | 'pre-stop' 
  | 'post-stop' 
  | 'pre-unload' 
  | 'post-unload';
```

## Resource Management

### Resource Allocation System

```typescript
// Advanced resource management
export class ResourceManager {
  private allocations: Map<string, AllocatedResources> = new Map();
  private limits: ResourceLimits;
  private monitor: ResourceMonitor;
  
  constructor(config: ResourceConfig) {
    this.limits = config.limits;
    this.monitor = new ResourceMonitor();
    this.setupResourceTracking();
  }
  
  async allocate(
    pluginId: string, 
    requirements: ResourceRequirements
  ): Promise<AllocatedResources> {
    // Check if resources are available
    const available = await this.checkAvailableResources();
    const required = this.parseRequirements(requirements);
    
    if (!this.canAllocate(available, required)) {
      throw new Error('Insufficient resources available');
    }
    
    // Allocate resources
    const allocation: AllocatedResources = {
      pluginId,
      memory: {
        limit: required.memory,
        allocated: 0,
        peak: 0
      },
      cpu: {
        limit: required.cpu,
        usage: 0,
        throttled: false
      },
      storage: {
        limit: required.storage,
        used: 0
      },
      network: {
        bandwidth: required.bandwidth,
        connections: 0,
        maxConnections: required.maxConnections
      },
      allocatedAt: new Date()
    };
    
    this.allocations.set(pluginId, allocation);
    
    // Setup resource monitoring
    this.monitor.startMonitoring(pluginId, allocation);
    
    return allocation;
  }
  
  async deallocate(pluginId: string): Promise<void> {
    const allocation = this.allocations.get(pluginId);
    if (!allocation) {
      return;
    }
    
    // Stop monitoring
    this.monitor.stopMonitoring(pluginId);
    
    // Cleanup allocated resources
    await this.cleanupResources(allocation);
    
    // Remove allocation
    this.allocations.delete(pluginId);
  }
  
  async enforceResourceLimits(pluginId: string): Promise<void> {
    const allocation = this.allocations.get(pluginId);
    if (!allocation) {
      return;
    }
    
    const usage = await this.monitor.getCurrentUsage(pluginId);
    
    // Enforce memory limit
    if (usage.memory > allocation.memory.limit) {
      await this.handleMemoryViolation(pluginId, allocation, usage);
    }
    
    // Enforce CPU limit
    if (usage.cpu > allocation.cpu.limit) {
      await this.handleCPUViolation(pluginId, allocation, usage);
    }
    
    // Enforce storage limit
    if (usage.storage > allocation.storage.limit) {
      await this.handleStorageViolation(pluginId, allocation, usage);
    }
  }
  
  private async handleMemoryViolation(
    pluginId: string,
    allocation: AllocatedResources,
    usage: ResourceUsage
  ): Promise<void> {
    console.warn(`Plugin ${pluginId} exceeded memory limit: ${usage.memory}MB / ${allocation.memory.limit}MB`);
    
    // Try garbage collection first
    await this.requestGarbageCollection(pluginId);
    
    // Check again after GC
    const newUsage = await this.monitor.getCurrentUsage(pluginId);
    if (newUsage.memory > allocation.memory.limit) {
      // Force plugin restart if still over limit
      await this.restartPlugin(pluginId);
    }
  }
  
  private async handleCPUViolation(
    pluginId: string,
    allocation: AllocatedResources,
    usage: ResourceUsage
  ): Promise<void> {
    console.warn(`Plugin ${pluginId} exceeded CPU limit: ${usage.cpu}% / ${allocation.cpu.limit}%`);
    
    // Throttle plugin execution
    allocation.cpu.throttled = true;
    await this.throttlePlugin(pluginId, 0.5); // Reduce to 50% speed
    
    // Remove throttling after cooldown period
    setTimeout(() => {
      allocation.cpu.throttled = false;
      this.removeThrottling(pluginId);
    }, 60000); // 1 minute cooldown
  }
}

interface AllocatedResources {
  pluginId: string;
  memory: MemoryAllocation;
  cpu: CPUAllocation;
  storage: StorageAllocation;
  network: NetworkAllocation;
  allocatedAt: Date;
}

interface ResourceUsage {
  memory: number;
  cpu: number;
  storage: number;
  networkBandwidth: number;
  connections: number;
}
```

## Runtime Security

### Security Sandbox

```typescript
// Runtime security implementation
export class RuntimeSecurity {
  private sandboxes: Map<string, SecuritySandbox> = new Map();
  private policies: SecurityPolicy[];
  private monitor: SecurityMonitor;
  
  constructor(config: SecurityConfig) {
    this.policies = config.policies;
    this.monitor = new SecurityMonitor();
    this.setupSecurityPolicies();
  }
  
  async createSecureSandbox(
    pluginId: string,
    permissions: string[]
  ): Promise<SecuritySandbox> {
    const sandbox = new SecuritySandbox({
      pluginId,
      permissions,
      policies: this.getApplicablePolicies(permissions),
      monitor: this.monitor
    });
    
    await sandbox.initialize();
    this.sandboxes.set(pluginId, sandbox);
    
    return sandbox;
  }
  
  private getApplicablePolicies(permissions: string[]): SecurityPolicy[] {
    return this.policies.filter(policy => 
      policy.permissions.some(perm => permissions.includes(perm))
    );
  }
}

export class SecuritySandbox {
  private vm: NodeVM;
  private permissions: Set<string>;
  private policies: SecurityPolicy[];
  private monitor: SecurityMonitor;
  
  constructor(config: SandboxConfig) {
    this.permissions = new Set(config.permissions);
    this.policies = config.policies;
    this.monitor = config.monitor;
    this.setupVM();
  }
  
  private setupVM(): void {
    this.vm = new NodeVM({
      console: 'redirect',
      sandbox: this.createSandboxGlobals(),
      require: {
        external: this.getAllowedModules(),
        builtin: this.getAllowedBuiltins(),
        root: process.cwd(),
        mock: this.getMockedModules()
      },
      wrapper: 'none',
      timeout: 30000
    });
    
    // Redirect console to monitor
    this.vm.on('console.log', (data) => {
      this.monitor.logPluginOutput(this.pluginId, 'log', data);
    });
    
    this.vm.on('console.error', (data) => {
      this.monitor.logPluginOutput(this.pluginId, 'error', data);
    });
  }
  
  private createSandboxGlobals(): any {
    const globals: any = {
      // Safe globals
      Buffer,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      
      // Qirvo APIs
      qirvo: this.createQirvoAPI()
    };
    
    // Add permission-based globals
    if (this.permissions.has('network-access')) {
      globals.fetch = this.createSecureFetch();
    }
    
    if (this.permissions.has('filesystem-access')) {
      globals.fs = this.createSecureFS();
    }
    
    return globals;
  }
  
  private createSecureFetch(): typeof fetch {
    return async (url: string | URL, init?: RequestInit) => {
      // Validate URL against security policies
      const urlString = url.toString();
      
      for (const policy of this.policies) {
        if (policy.type === 'network' && !policy.validator(urlString)) {
          throw new Error(`Network access denied by policy: ${policy.name}`);
        }
      }
      
      // Log network request
      this.monitor.logNetworkRequest(this.pluginId, urlString, init?.method || 'GET');
      
      // Execute request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        this.monitor.logSecurityViolation(this.pluginId, 'network_error', error.message);
        throw error;
      }
    };
  }
  
  async execute<T>(code: () => Promise<T> | T): Promise<T> {
    try {
      // Wrap code execution with security monitoring
      this.monitor.startExecution(this.pluginId);
      
      const result = await this.vm.run(`
        (async () => {
          ${code.toString()}
          return (${code.name || 'anonymous'})();
        })()
      `);
      
      this.monitor.endExecution(this.pluginId);
      return result;
    } catch (error) {
      this.monitor.logSecurityViolation(this.pluginId, 'execution_error', error.message);
      throw error;
    }
  }
}
```

## Performance Optimization

### Runtime Performance

```typescript
// Performance optimization system
export class RuntimePerformanceOptimizer {
  private profiler: PluginProfiler;
  private optimizer: CodeOptimizer;
  private cache: RuntimeCache;
  
  constructor() {
    this.profiler = new PluginProfiler();
    this.optimizer = new CodeOptimizer();
    this.cache = new RuntimeCache();
  }
  
  async optimizePlugin(instance: PluginInstance): Promise<OptimizationResult> {
    // Profile plugin performance
    const profile = await this.profiler.profile(instance);
    
    // Identify optimization opportunities
    const opportunities = this.identifyOptimizations(profile);
    
    // Apply optimizations
    const results = await Promise.all(
      opportunities.map(opt => this.applyOptimization(instance, opt))
    );
    
    return {
      applied: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
      performanceGain: this.calculatePerformanceGain(profile, results)
    };
  }
  
  private identifyOptimizations(profile: PerformanceProfile): Optimization[] {
    const optimizations: Optimization[] = [];
    
    // Memory optimizations
    if (profile.memory.leaks.length > 0) {
      optimizations.push({
        type: 'memory-leak-fix',
        priority: 'high',
        description: 'Fix detected memory leaks',
        leaks: profile.memory.leaks
      });
    }
    
    // CPU optimizations
    if (profile.cpu.hotspots.length > 0) {
      optimizations.push({
        type: 'cpu-optimization',
        priority: 'medium',
        description: 'Optimize CPU-intensive operations',
        hotspots: profile.cpu.hotspots
      });
    }
    
    // I/O optimizations
    if (profile.io.inefficiencies.length > 0) {
      optimizations.push({
        type: 'io-optimization',
        priority: 'medium',
        description: 'Optimize I/O operations',
        inefficiencies: profile.io.inefficiencies
      });
    }
    
    return optimizations;
  }
  
  async enableJITCompilation(instance: PluginInstance): Promise<void> {
    // Enable V8 JIT optimizations for frequently executed code
    const hotFunctions = await this.profiler.getHotFunctions(instance);
    
    for (const func of hotFunctions) {
      await this.optimizer.optimizeFunction(func);
    }
  }
  
  async setupCodeCaching(instance: PluginInstance): Promise<void> {
    // Cache compiled code for faster startup
    const cacheKey = this.generateCacheKey(instance.manifest);
    const cachedCode = await this.cache.get(cacheKey);
    
    if (!cachedCode) {
      const compiledCode = await this.optimizer.compile(instance.code);
      await this.cache.set(cacheKey, compiledCode, { ttl: 3600000 }); // 1 hour
    }
  }
}
```

## Runtime Debugging

### Debug Tools

```typescript
// Runtime debugging utilities
export class RuntimeDebugger {
  private debugSessions: Map<string, DebugSession> = new Map();
  private inspector: RuntimeInspector;
  
  constructor() {
    this.inspector = new RuntimeInspector();
  }
  
  async startDebugSession(pluginId: string): Promise<DebugSession> {
    const session = new DebugSession(pluginId, this.inspector);
    await session.initialize();
    
    this.debugSessions.set(pluginId, session);
    return session;
  }
  
  async attachDebugger(pluginId: string, port: number = 9229): Promise<void> {
    const session = this.debugSessions.get(pluginId);
    if (!session) {
      throw new Error(`No debug session found for plugin: ${pluginId}`);
    }
    
    await session.attachDebugger(port);
    console.log(`🐛 Debugger attached to plugin ${pluginId} on port ${port}`);
  }
  
  async getPluginState(pluginId: string): Promise<PluginDebugState> {
    const session = this.debugSessions.get(pluginId);
    if (!session) {
      throw new Error(`No debug session found for plugin: ${pluginId}`);
    }
    
    return session.getState();
  }
}

export class DebugSession {
  private pluginId: string;
  private inspector: RuntimeInspector;
  private breakpoints: Map<string, Breakpoint> = new Map();
  
  constructor(pluginId: string, inspector: RuntimeInspector) {
    this.pluginId = pluginId;
    this.inspector = inspector;
  }
  
  async setBreakpoint(file: string, line: number): Promise<string> {
    const breakpointId = `${file}:${line}`;
    const breakpoint = new Breakpoint(file, line);
    
    await this.inspector.setBreakpoint(this.pluginId, breakpoint);
    this.breakpoints.set(breakpointId, breakpoint);
    
    return breakpointId;
  }
  
  async evaluateExpression(expression: string): Promise<any> {
    return this.inspector.evaluate(this.pluginId, expression);
  }
  
  async getCallStack(): Promise<CallFrame[]> {
    return this.inspector.getCallStack(this.pluginId);
  }
}
```

This comprehensive plugin runtime guide provides deep insights into the runtime architecture, lifecycle management, resource allocation, security, performance optimization, and debugging capabilities of the Qirvo plugin system.

---

**Next**: [Custom Components](./custom-components.md)
