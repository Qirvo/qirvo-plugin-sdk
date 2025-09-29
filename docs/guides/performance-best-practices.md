# Performance Best Practices

Optimizing plugin performance is crucial for providing a smooth user experience. This guide covers caching strategies, resource optimization, memory management, and performance monitoring techniques.

## Table of Contents

- [Caching Strategies](#caching-strategies)
- [Resource Optimization](#resource-optimization)
- [Memory Management](#memory-management)
- [Lazy Loading](#lazy-loading)
- [Background Tasks](#background-tasks)
- [Performance Monitoring](#performance-monitoring)

## Caching Strategies

### Multi-Level Caching System

```typescript
class PerformantPlugin extends BasePlugin {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_MEMORY_CACHE_SIZE = 100;

  async getCachedData<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Level 1: Memory cache (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.updateAccessTime(memoryEntry);
      return memoryEntry.data as T;
    }

    // Level 2: Storage cache (persistent)
    const storageKey = `cache_${key}`;
    const storageEntry = await this.getStorage<CacheEntry>(storageKey);
    if (storageEntry && !this.isExpired(storageEntry)) {
      // Promote to memory cache
      this.setMemoryCache(key, storageEntry.data, storageEntry.ttl);
      return storageEntry.data as T;
    }

    // Level 3: Fetch fresh data
    const freshData = await fetcher();
    
    // Cache at both levels
    await this.setCacheEntry(key, freshData);
    
    return freshData;
  }

  private async setCacheEntry<T>(key: string, data: T): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
      accessCount: 1,
      lastAccess: Date.now()
    };

    // Set in memory cache
    this.setMemoryCache(key, data, this.CACHE_TTL);

    // Set in storage cache
    await this.setStorage(`cache_${key}`, entry);
  }

  private setMemoryCache<T>(key: string, data: T, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccess: Date.now()
    });
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateAccessTime(entry: CacheEntry): void {
    entry.lastAccess = Date.now();
    entry.accessCount++;
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}
```

### Smart Cache Invalidation

```typescript
class SmartCache {
  private cache = new Map<string, CacheEntry>();
  private dependencies = new Map<string, Set<string>>();

  async set(key: string, data: any, dependencies: string[] = []): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.getTTL(key),
      dependencies
    };

    this.cache.set(key, entry);

    // Track dependencies
    dependencies.forEach(dep => {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(key);
    });
  }

  async invalidate(key: string): Promise<void> {
    // Remove from cache
    this.cache.delete(key);

    // Invalidate dependent entries
    const dependents = this.dependencies.get(key);
    if (dependents) {
      for (const dependent of dependents) {
        await this.invalidate(dependent);
      }
      this.dependencies.delete(key);
    }
  }

  async invalidatePattern(pattern: RegExp): Promise<void> {
    const keysToInvalidate = Array.from(this.cache.keys())
      .filter(key => pattern.test(key));

    await Promise.all(keysToInvalidate.map(key => this.invalidate(key)));
  }

  private getTTL(key: string): number {
    // Dynamic TTL based on key type
    if (key.startsWith('user_')) return 10 * 60 * 1000; // 10 minutes
    if (key.startsWith('api_')) return 5 * 60 * 1000;   // 5 minutes
    if (key.startsWith('static_')) return 60 * 60 * 1000; // 1 hour
    return 5 * 60 * 1000; // Default 5 minutes
  }
}
```

## Resource Optimization

### Efficient Data Loading

```typescript
class OptimizedDataLoader {
  private loadingPromises = new Map<string, Promise<any>>();
  private batchQueue = new Map<string, BatchRequest[]>();
  private batchTimer: NodeJS.Timeout | null = null;

  async loadData<T>(id: string): Promise<T> {
    // Prevent duplicate requests
    if (this.loadingPromises.has(id)) {
      return await this.loadingPromises.get(id);
    }

    const promise = this.performLoad<T>(id);
    this.loadingPromises.set(id, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.loadingPromises.delete(id);
    }
  }

  async loadBatch<T>(ids: string[]): Promise<Map<string, T>> {
    // Add to batch queue
    const batchPromises = ids.map(id => this.queueBatchRequest<T>(id));
    
    // Trigger batch processing
    this.scheduleBatchProcessing();

    // Wait for all results
    const results = await Promise.all(batchPromises);
    
    const resultMap = new Map<string, T>();
    ids.forEach((id, index) => {
      resultMap.set(id, results[index]);
    });

    return resultMap;
  }

  private async queueBatchRequest<T>(id: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchType = this.getBatchType(id);
      
      if (!this.batchQueue.has(batchType)) {
        this.batchQueue.set(batchType, []);
      }

      this.batchQueue.get(batchType)!.push({
        id,
        resolve,
        reject
      });
    });
  }

  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(async () => {
      await this.processBatches();
      this.batchTimer = null;
    }, 10); // 10ms debounce
  }

  private async processBatches(): Promise<void> {
    const batches = Array.from(this.batchQueue.entries());
    this.batchQueue.clear();

    await Promise.all(batches.map(([type, requests]) => 
      this.processBatch(type, requests)
    ));
  }

  private async processBatch(type: string, requests: BatchRequest[]): Promise<void> {
    try {
      const ids = requests.map(req => req.id);
      const results = await this.batchFetch(type, ids);

      requests.forEach(req => {
        const result = results.get(req.id);
        if (result !== undefined) {
          req.resolve(result);
        } else {
          req.reject(new Error(`No result for ${req.id}`));
        }
      });
    } catch (error) {
      requests.forEach(req => req.reject(error));
    }
  }

  private async batchFetch(type: string, ids: string[]): Promise<Map<string, any>> {
    // Implementation depends on data source
    // This could batch API calls, database queries, etc.
    const results = new Map();
    
    // Example: Batch API call
    const response = await fetch(`/api/${type}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    
    const data = await response.json();
    data.forEach((item: any) => {
      results.set(item.id, item);
    });

    return results;
  }

  private getBatchType(id: string): string {
    // Determine batch type from ID pattern
    if (id.startsWith('user_')) return 'users';
    if (id.startsWith('task_')) return 'tasks';
    return 'default';
  }

  private async performLoad<T>(id: string): Promise<T> {
    // Single item load implementation
    const response = await fetch(`/api/item/${id}`);
    return await response.json();
  }
}

interface BatchRequest {
  id: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}
```

### Bundle Size Optimization

```typescript
// Use dynamic imports for code splitting
class FeatureLoader {
  private loadedFeatures = new Set<string>();

  async loadFeature(featureName: string): Promise<any> {
    if (this.loadedFeatures.has(featureName)) {
      return; // Already loaded
    }

    try {
      let feature;
      
      switch (featureName) {
        case 'charts':
          feature = await import('./features/charts');
          break;
        case 'export':
          feature = await import('./features/export');
          break;
        case 'advanced':
          feature = await import('./features/advanced');
          break;
        default:
          throw new Error(`Unknown feature: ${featureName}`);
      }

      this.loadedFeatures.add(featureName);
      return feature;
    } catch (error) {
      this.plugin.log('error', `Failed to load feature ${featureName}:`, error);
      throw error;
    }
  }

  async preloadCriticalFeatures(): Promise<void> {
    // Preload features that are likely to be used
    const criticalFeatures = ['charts', 'export'];
    
    await Promise.all(
      criticalFeatures.map(feature => 
        this.loadFeature(feature).catch(error => 
          this.plugin.log('warn', `Failed to preload ${feature}:`, error)
        )
      )
    );
  }
}
```

## Memory Management

### Memory Leak Prevention

```typescript
class MemoryAwarePlugin extends BasePlugin {
  private eventListeners: (() => void)[] = [];
  private timers: NodeJS.Timeout[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private observers: IntersectionObserver[] = [];
  private abortControllers: AbortController[] = [];

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Set up memory monitoring
    this.setupMemoryMonitoring();
    
    // Initialize features with cleanup tracking
    await this.initializeFeatures(context);
  }

  async onDisable(): Promise<void> {
    // Clean up all resources
    await this.cleanupResources();
  }

  private setupMemoryMonitoring(): void {
    // Monitor memory usage periodically
    const memoryTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Every 30 seconds

    this.intervals.push(memoryTimer);
  }

  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      this.log('debug', `Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
      
      // Alert if memory usage is high
      if (usedMB > limitMB * 0.8) {
        this.log('warn', 'High memory usage detected, triggering cleanup');
        this.performMemoryCleanup();
      }
    }
  }

  private performMemoryCleanup(): void {
    // Clear caches
    if (this.memoryCache) {
      this.memoryCache.clear();
    }

    // Force garbage collection if available
    if ('gc' in global) {
      (global as any).gc();
    }

    // Clear old event listeners
    this.cleanupOldEventListeners();
  }

  private cleanupOldEventListeners(): void {
    // Remove event listeners that haven't been used recently
    const cutoffTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    
    this.eventListeners = this.eventListeners.filter(cleanup => {
      // This would need to track usage time in practice
      return true; // Simplified
    });
  }

  private async cleanupResources(): Promise<void> {
    // Clean up event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];

    // Clear timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];

    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Abort ongoing requests
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers = [];

    this.log('info', 'All resources cleaned up');
  }

  // Helper methods to track resources
  addEventListener(element: EventTarget, event: string, handler: EventListener): void {
    element.addEventListener(event, handler);
    
    const cleanup = () => element.removeEventListener(event, handler);
    this.eventListeners.push(cleanup);
  }

  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(callback, delay);
    this.timers.push(timer);
    return timer;
  }

  setInterval(callback: () => void, interval: number): NodeJS.Timeout {
    const timer = setInterval(callback, interval);
    this.intervals.push(timer);
    return timer;
  }

  createAbortController(): AbortController {
    const controller = new AbortController();
    this.abortControllers.push(controller);
    return controller;
  }
}
```

### Object Pool Pattern

```typescript
class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number = 50
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let obj: T;

    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else {
      obj = this.factory();
    }

    this.inUse.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      return; // Object not from this pool
    }

    this.inUse.delete(obj);
    this.reset(obj);

    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    }
    // If pool is full, let object be garbage collected
  }

  clear(): void {
    this.available = [];
    this.inUse.clear();
  }

  getStats(): PoolStats {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}

interface PoolStats {
  available: number;
  inUse: number;
  total: number;
}

// Usage example
class DataProcessor {
  private bufferPool = new ObjectPool(
    () => new ArrayBuffer(1024),
    (buffer) => {
      // Reset buffer if needed
      new Uint8Array(buffer).fill(0);
    },
    20
  );

  async processData(data: Uint8Array): Promise<Uint8Array> {
    const buffer = this.bufferPool.acquire();
    
    try {
      // Use buffer for processing
      const view = new Uint8Array(buffer);
      // ... processing logic
      
      return new Uint8Array(view);
    } finally {
      this.bufferPool.release(buffer);
    }
  }
}
```

## Lazy Loading

### Component Lazy Loading

```typescript
class LazyComponentLoader {
  private loadedComponents = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();

  async loadComponent(name: string): Promise<any> {
    // Return cached component
    if (this.loadedComponents.has(name)) {
      return this.loadedComponents.get(name);
    }

    // Return existing loading promise
    if (this.loadingPromises.has(name)) {
      return await this.loadingPromises.get(name);
    }

    // Start loading
    const loadingPromise = this.performComponentLoad(name);
    this.loadingPromises.set(name, loadingPromise);

    try {
      const component = await loadingPromise;
      this.loadedComponents.set(name, component);
      return component;
    } finally {
      this.loadingPromises.delete(name);
    }
  }

  private async performComponentLoad(name: string): Promise<any> {
    const startTime = performance.now();
    
    try {
      const module = await import(`./components/${name}`);
      const component = module.default || module[name];
      
      const loadTime = performance.now() - startTime;
      this.log('debug', `Component ${name} loaded in ${loadTime.toFixed(2)}ms`);
      
      return component;
    } catch (error) {
      this.log('error', `Failed to load component ${name}:`, error);
      throw error;
    }
  }

  preloadComponents(names: string[]): Promise<void[]> {
    return Promise.all(
      names.map(name => 
        this.loadComponent(name).catch(error => {
          this.log('warn', `Failed to preload component ${name}:`, error);
        })
      )
    );
  }
}
```

### Data Lazy Loading with Intersection Observer

```typescript
class LazyDataLoader {
  private observer: IntersectionObserver;
  private loadingElements = new Map<Element, LoadingConfig>();

  constructor() {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '50px', // Load 50px before element comes into view
        threshold: 0.1
      }
    );
  }

  observeElement(element: Element, config: LoadingConfig): void {
    this.loadingElements.set(element, config);
    this.observer.observe(element);
  }

  private async handleIntersection(entries: IntersectionObserverEntry[]): Promise<void> {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const config = this.loadingElements.get(entry.target);
        if (config) {
          await this.loadData(entry.target, config);
          this.observer.unobserve(entry.target);
          this.loadingElements.delete(entry.target);
        }
      }
    }
  }

  private async loadData(element: Element, config: LoadingConfig): Promise<void> {
    try {
      // Show loading state
      element.classList.add('loading');
      
      const data = await config.loader();
      
      // Render data
      if (config.renderer) {
        config.renderer(element, data);
      }
      
      element.classList.remove('loading');
      element.classList.add('loaded');
    } catch (error) {
      element.classList.remove('loading');
      element.classList.add('error');
      
      if (config.errorHandler) {
        config.errorHandler(element, error);
      }
    }
  }

  disconnect(): void {
    this.observer.disconnect();
    this.loadingElements.clear();
  }
}

interface LoadingConfig {
  loader: () => Promise<any>;
  renderer?: (element: Element, data: any) => void;
  errorHandler?: (element: Element, error: any) => void;
}
```

## Background Tasks

### Efficient Background Processing

```typescript
class BackgroundTaskManager {
  private taskQueue: BackgroundTask[] = [];
  private isProcessing = false;
  private maxConcurrentTasks = 3;
  private activeTasks = new Set<Promise<any>>();

  async addTask(task: BackgroundTask): Promise<void> {
    this.taskQueue.push(task);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.taskQueue.length > 0 || this.activeTasks.size > 0) {
      // Start new tasks up to the limit
      while (
        this.taskQueue.length > 0 && 
        this.activeTasks.size < this.maxConcurrentTasks
      ) {
        const task = this.taskQueue.shift()!;
        const taskPromise = this.executeTask(task);
        this.activeTasks.add(taskPromise);

        // Remove from active tasks when complete
        taskPromise.finally(() => {
          this.activeTasks.delete(taskPromise);
        });
      }

      // Wait for at least one task to complete
      if (this.activeTasks.size > 0) {
        await Promise.race(this.activeTasks);
      }
    }

    this.isProcessing = false;
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    const startTime = performance.now();
    
    try {
      await task.execute();
      
      const duration = performance.now() - startTime;
      this.log('debug', `Background task ${task.name} completed in ${duration.toFixed(2)}ms`);
      
      if (task.onSuccess) {
        task.onSuccess();
      }
    } catch (error) {
      this.log('error', `Background task ${task.name} failed:`, error);
      
      if (task.onError) {
        task.onError(error);
      }
      
      // Retry logic
      if (task.retries > 0) {
        task.retries--;
        this.taskQueue.unshift(task); // Add back to front of queue
      }
    }
  }

  clear(): void {
    this.taskQueue = [];
  }

  getQueueSize(): number {
    return this.taskQueue.length;
  }

  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }
}

interface BackgroundTask {
  name: string;
  execute: () => Promise<void>;
  retries: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}
```

### Web Workers for Heavy Computation

```typescript
class WebWorkerManager {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private availableWorkers: Worker[] = [];

  constructor(private workerScript: string, private poolSize: number = 4) {
    this.initializeWorkerPool();
  }

  private initializeWorkerPool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async executeTask<T>(taskData: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        data: taskData,
        resolve,
        reject,
        timestamp: Date.now()
      };

      if (this.availableWorkers.length > 0) {
        this.assignTask(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  private assignTask(task: WorkerTask): void {
    const worker = this.availableWorkers.pop()!;
    
    const handleMessage = (event: MessageEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      
      this.availableWorkers.push(worker);
      task.resolve(event.data);
      
      // Process next task if available
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift()!;
        this.assignTask(nextTask);
      }
    };

    const handleError = (error: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      
      this.availableWorkers.push(worker);
      task.reject(error);
      
      // Process next task if available
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift()!;
        this.assignTask(nextTask);
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage(task.data);
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
  }
}

interface WorkerTask {
  data: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}
```

## Performance Monitoring

### Performance Metrics Collection

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();
  private readonly MAX_METRICS_PER_TYPE = 100;

  startTiming(name: string): PerformanceTimer {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordMetric(name, {
          type: 'timing',
          value: duration,
          timestamp: Date.now(),
          details: { startTime, endTime }
        });
        
        return duration;
      }
    };
  }

  recordMetric(name: string, metric: PerformanceMetric): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Keep only recent metrics
    if (metrics.length > this.MAX_METRICS_PER_TYPE) {
      metrics.shift();
    }

    // Log slow operations
    if (metric.type === 'timing' && metric.value > 1000) {
      this.log('warn', `Slow operation detected: ${name} took ${metric.value.toFixed(2)}ms`);
    }
  }

  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  getAverageTime(name: string): number {
    const metrics = this.getMetrics(name).filter(m => m.type === 'timing');
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.value, 0);
    return total / metrics.length;
  }

  getPercentile(name: string, percentile: number): number {
    const metrics = this.getMetrics(name)
      .filter(m => m.type === 'timing')
      .map(m => m.value)
      .sort((a, b) => a - b);
    
    if (metrics.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * metrics.length) - 1;
    return metrics[index];
  }

  generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      metrics: {}
    };

    for (const [name, metrics] of this.metrics.entries()) {
      const timingMetrics = metrics.filter(m => m.type === 'timing');
      
      if (timingMetrics.length > 0) {
        report.metrics[name] = {
          count: timingMetrics.length,
          average: this.getAverageTime(name),
          p50: this.getPercentile(name, 50),
          p95: this.getPercentile(name, 95),
          p99: this.getPercentile(name, 99)
        };
      }
    }

    return report;
  }

  clear(): void {
    this.metrics.clear();
  }
}

interface PerformanceTimer {
  end: () => number;
}

interface PerformanceMetric {
  type: 'timing' | 'counter' | 'gauge';
  value: number;
  timestamp: number;
  details?: any;
}

interface PerformanceReport {
  timestamp: string;
  metrics: Record<string, {
    count: number;
    average: number;
    p50: number;
    p95: number;
    p99: number;
  }>;
}
```

This comprehensive performance guide ensures your Qirvo plugins are optimized for speed, efficiency, and scalability while providing excellent user experience.

---

**Next**: [Code Quality Best Practices](./code-quality-best-practices.md)
