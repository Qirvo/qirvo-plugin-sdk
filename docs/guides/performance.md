# Performance Guide

This guide covers performance optimization strategies for Qirvo plugins, including caching, lazy loading, memory management, and monitoring techniques.

## Table of Contents

- [Performance Fundamentals](#performance-fundamentals)
- [Caching Strategies](#caching-strategies)
- [Lazy Loading](#lazy-loading)
- [Memory Management](#memory-management)
- [Bundle Optimization](#bundle-optimization)
- [Performance Monitoring](#performance-monitoring)

## Performance Fundamentals

### Performance Metrics

```typescript
// Performance monitoring utility
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  
  startTiming(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }
  
  endTiming(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    return metric.duration;
  }
  
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }
  
  async measureAsync<T>(
    name: string, 
    operation: () => Promise<T>
  ): Promise<T> {
    this.startTiming(name);
    try {
      const result = await operation();
      return result;
    } finally {
      this.endTiming(name);
    }
  }
}

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
}
```

## Caching Strategies

### Multi-Level Cache System

```typescript
// Advanced caching system
export class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private storage: StorageAPI;
  private maxMemorySize: number;
  private defaultTTL: number;
  
  constructor(
    storage: StorageAPI,
    maxMemorySize: number = 100,
    defaultTTL: number = 300000
  ) {
    this.storage = storage;
    this.maxMemorySize = maxMemorySize;
    this.defaultTTL = defaultTTL;
  }
  
  async get<T>(key: string): Promise<T | null> {
    // Level 1: Memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      memoryEntry.lastAccessed = Date.now();
      return memoryEntry.data as T;
    }
    
    // Level 2: Persistent storage
    try {
      const storageEntry = await this.storage.get(`cache:${key}`);
      if (storageEntry && !this.isExpired(storageEntry)) {
        // Promote to memory cache
        this.setMemoryCache(key, storageEntry.data, storageEntry.ttl);
        return storageEntry.data as T;
      }
    } catch (error) {
      console.warn('Storage cache read failed:', error);
    }
    
    return null;
  }
  
  async set<T>(
    key: string, 
    data: T, 
    ttl: number = this.defaultTTL
  ): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      lastAccessed: Date.now()
    };
    
    // Set in memory cache
    this.setMemoryCache(key, data, ttl);
    
    // Set in persistent storage
    try {
      await this.storage.set(`cache:${key}`, entry);
    } catch (error) {
      console.warn('Storage cache write failed:', error);
    }
  }
  
  private setMemoryCache<T>(key: string, data: T, ttl: number): void {
    // Evict if at capacity
    if (this.memoryCache.size >= this.maxMemorySize) {
      this.evictLRU();
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      lastAccessed: Date.now()
    });
  }
  
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
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
  
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      const keys = await this.storage.keys();
      const cacheKeys = keys.filter(key => key.startsWith('cache:'));
      
      for (const key of cacheKeys) {
        await this.storage.delete(key);
      }
    } catch (error) {
      console.warn('Storage cache clear failed:', error);
    }
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  lastAccessed: number;
}
```

## Lazy Loading

### Component Lazy Loading

```typescript
// Lazy loading utilities for React components
export const LazyLoader = {
  // Lazy load component with loading fallback
  component: <T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ): React.LazyExoticComponent<T> => {
    const LazyComponent = React.lazy(importFn);
    
    return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
      <React.Suspense fallback={fallback ? <fallback /> : <div>Loading...</div>}>
        <LazyComponent {...props} ref={ref} />
      </React.Suspense>
    )) as React.LazyExoticComponent<T>;
  },
  
  // Lazy load data with caching
  data: <T>(
    key: string,
    loader: () => Promise<T>,
    cache?: CacheManager
  ): (() => Promise<T>) => {
    let loading: Promise<T> | null = null;
    
    return async (): Promise<T> => {
      // Check cache first
      if (cache) {
        const cached = await cache.get<T>(key);
        if (cached) return cached;
      }
      
      // Prevent duplicate loading
      if (loading) return loading;
      
      loading = loader().then(async (data) => {
        if (cache) {
          await cache.set(key, data);
        }
        loading = null;
        return data;
      }).catch((error) => {
        loading = null;
        throw error;
      });
      
      return loading;
    };
  }
};

// Intersection Observer for lazy loading
export class LazyLoadObserver {
  private observer: IntersectionObserver;
  private callbacks: Map<Element, () => void> = new Map();
  
  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      }
    );
  }
  
  observe(element: Element, callback: () => void): void {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }
  
  unobserve(element: Element): void {
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }
  
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const callback = this.callbacks.get(entry.target);
        if (callback) {
          callback();
          this.unobserve(entry.target);
        }
      }
    });
  }
  
  disconnect(): void {
    this.observer.disconnect();
    this.callbacks.clear();
  }
}
```

## Memory Management

### Memory Leak Prevention

```typescript
// Memory management utilities
export class MemoryManager {
  private subscriptions: Set<() => void> = new Set();
  private timers: Set<NodeJS.Timeout> = new Set();
  private observers: Set<{ disconnect: () => void }> = new Set();
  
  // Track subscriptions for cleanup
  addSubscription(unsubscribe: () => void): void {
    this.subscriptions.add(unsubscribe);
  }
  
  // Track timers for cleanup
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, delay);
    
    this.timers.add(timer);
    return timer;
  }
  
  setInterval(callback: () => void, interval: number): NodeJS.Timeout {
    const timer = setInterval(callback, interval);
    this.timers.add(timer);
    return timer;
  }
  
  // Track observers for cleanup
  addObserver(observer: { disconnect: () => void }): void {
    this.observers.add(observer);
  }
  
  // Clean up all tracked resources
  cleanup(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    });
    this.subscriptions.clear();
    
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    // Disconnect all observers
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Observer cleanup error:', error);
      }
    });
    this.observers.clear();
  }
}

// React hook for automatic cleanup
export function useMemoryManager(): MemoryManager {
  const managerRef = useRef<MemoryManager>();
  
  if (!managerRef.current) {
    managerRef.current = new MemoryManager();
  }
  
  useEffect(() => {
    const manager = managerRef.current!;
    return () => manager.cleanup();
  }, []);
  
  return managerRef.current;
}
```

## Bundle Optimization

### Code Splitting Strategy

```typescript
// Dynamic imports for code splitting
export const DynamicImports = {
  // Split by feature
  weatherWidget: () => import('./components/WeatherWidget'),
  settingsPanel: () => import('./components/SettingsPanel'),
  chartLibrary: () => import('./utils/charts'),
  
  // Split by vendor
  lodash: () => import('lodash'),
  moment: () => import('moment'),
  
  // Conditional loading
  loadFeature: async (featureName: string) => {
    const features: Record<string, () => Promise<any>> = {
      'advanced-charts': () => import('./features/AdvancedCharts'),
      'data-export': () => import('./features/DataExport'),
      'notifications': () => import('./features/Notifications')
    };
    
    const loader = features[featureName];
    if (!loader) {
      throw new Error(`Unknown feature: ${featureName}`);
    }
    
    return loader();
  }
};

// Bundle analyzer helper
export class BundleAnalyzer {
  static analyzeChunks(): ChunkAnalysis {
    const chunks = document.querySelectorAll('script[src]');
    const analysis: ChunkAnalysis = {
      totalChunks: chunks.length,
      totalSize: 0,
      chunks: []
    };
    
    chunks.forEach((script) => {
      const src = (script as HTMLScriptElement).src;
      if (src) {
        analysis.chunks.push({
          name: src.split('/').pop() || 'unknown',
          url: src,
          loaded: true
        });
      }
    });
    
    return analysis;
  }
}

interface ChunkAnalysis {
  totalChunks: number;
  totalSize: number;
  chunks: ChunkInfo[];
}

interface ChunkInfo {
  name: string;
  url: string;
  loaded: boolean;
  size?: number;
}
```

## Performance Monitoring

### Real-Time Performance Tracking

```typescript
// Performance tracking system
export class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    renderTime: [],
    apiCalls: [],
    memoryUsage: [],
    bundleSize: 0
  };
  
  private observer: PerformanceObserver;
  
  constructor() {
    this.setupPerformanceObserver();
    this.startMemoryMonitoring();
  }
  
  private setupPerformanceObserver(): void {
    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          this.metrics.renderTime.push({
            name: entry.name,
            duration: entry.duration,
            timestamp: entry.startTime
          });
        }
        
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          this.trackPageLoad(navEntry);
        }
      });
    });
    
    this.observer.observe({ entryTypes: ['measure', 'navigation'] });
  }
  
  private startMemoryMonitoring(): void {
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage.push({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
        
        // Keep only last 100 entries
        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }
      }
    }, 5000);
  }
  
  trackApiCall(url: string, duration: number, success: boolean): void {
    this.metrics.apiCalls.push({
      url,
      duration,
      success,
      timestamp: Date.now()
    });
    
    // Keep only last 50 API calls
    if (this.metrics.apiCalls.length > 50) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-50);
    }
  }
  
  private trackPageLoad(entry: PerformanceNavigationTiming): void {
    const loadTime = entry.loadEventEnd - entry.navigationStart;
    console.log(`Page load time: ${loadTime}ms`);
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  getAverageRenderTime(): number {
    if (this.metrics.renderTime.length === 0) return 0;
    
    const total = this.metrics.renderTime.reduce((sum, metric) => sum + metric.duration, 0);
    return total / this.metrics.renderTime.length;
  }
  
  getMemoryTrend(): 'increasing' | 'stable' | 'decreasing' {
    const recent = this.metrics.memoryUsage.slice(-10);
    if (recent.length < 2) return 'stable';
    
    const first = recent[0].used;
    const last = recent[recent.length - 1].used;
    const diff = (last - first) / first;
    
    if (diff > 0.1) return 'increasing';
    if (diff < -0.1) return 'decreasing';
    return 'stable';
  }
  
  destroy(): void {
    this.observer.disconnect();
  }
}

interface PerformanceMetrics {
  renderTime: RenderMetric[];
  apiCalls: ApiMetric[];
  memoryUsage: MemoryMetric[];
  bundleSize: number;
}

interface RenderMetric {
  name: string;
  duration: number;
  timestamp: number;
}

interface ApiMetric {
  url: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

interface MemoryMetric {
  used: number;
  total: number;
  limit: number;
  timestamp: number;
}
```

This performance guide provides comprehensive optimization strategies for building fast, efficient Qirvo plugins.

---

**Next**: [Testing Framework](../testing/testing-framework.md)
