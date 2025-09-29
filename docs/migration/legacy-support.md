# Legacy Support

This guide covers supporting older Qirvo versions, backward compatibility strategies, and maintaining plugins across multiple SDK versions.

## Table of Contents

- [Compatibility Strategy](#compatibility-strategy)
- [Version Detection](#version-detection)
- [Polyfills and Adapters](#polyfills-and-adapters)
- [Multi-Version Support](#multi-version-support)
- [Legacy API Bridge](#legacy-api-bridge)
- [Deprecation Management](#deprecation-management)

## Compatibility Strategy

### Backward Compatibility Framework

```typescript
// Backward compatibility framework
export class BackwardCompatibility {
  private currentVersion: string;
  private supportedVersions: string[];
  private adapters: Map<string, CompatibilityAdapter> = new Map();
  
  constructor(currentVersion: string, supportedVersions: string[]) {
    this.currentVersion = currentVersion;
    this.supportedVersions = supportedVersions;
    this.setupAdapters();
  }
  
  private setupAdapters(): void {
    // v1.x compatibility adapter
    this.adapters.set('1.x', new V1CompatibilityAdapter());
    
    // v2.x compatibility adapter  
    this.adapters.set('2.x', new V2CompatibilityAdapter());
  }
  
  isVersionSupported(version: string): boolean {
    return this.supportedVersions.some(supported => 
      this.matchesVersionPattern(version, supported)
    );
  }
  
  getAdapter(version: string): CompatibilityAdapter | null {
    for (const [pattern, adapter] of this.adapters) {
      if (this.matchesVersionPattern(version, pattern)) {
        return adapter;
      }
    }
    return null;
  }
  
  async adaptPlugin(
    plugin: any,
    targetVersion: string
  ): Promise<AdaptedPlugin> {
    const adapter = this.getAdapter(targetVersion);
    if (!adapter) {
      throw new Error(`No adapter available for version ${targetVersion}`);
    }
    
    return adapter.adapt(plugin, targetVersion);
  }
  
  private matchesVersionPattern(version: string, pattern: string): boolean {
    if (pattern.endsWith('.x')) {
      const majorVersion = pattern.split('.')[0];
      return version.startsWith(majorVersion + '.');
    }
    return version === pattern;
  }
}

interface CompatibilityAdapter {
  adapt(plugin: any, targetVersion: string): Promise<AdaptedPlugin>;
  getRequiredPolyfills(): string[];
  getDeprecationWarnings(): DeprecationWarning[];
}

interface AdaptedPlugin {
  plugin: any;
  polyfills: string[];
  warnings: DeprecationWarning[];
  limitations: string[];
}
```

## Version Detection

### Runtime Version Detection

```typescript
// Version detection and feature availability
export class VersionDetector {
  private static instance: VersionDetector;
  private qirvoVersion: string;
  private sdkVersion: string;
  private features: Map<string, boolean> = new Map();
  
  private constructor() {
    this.detectVersions();
    this.detectFeatures();
  }
  
  static getInstance(): VersionDetector {
    if (!VersionDetector.instance) {
      VersionDetector.instance = new VersionDetector();
    }
    return VersionDetector.instance;
  }
  
  private detectVersions(): void {
    // Detect Qirvo runtime version
    this.qirvoVersion = this.getQirvoVersion();
    
    // Detect SDK version
    this.sdkVersion = this.getSDKVersion();
  }
  
  private getQirvoVersion(): string {
    // Try multiple detection methods
    if (typeof window !== 'undefined' && (window as any).qirvo?.version) {
      return (window as any).qirvo.version;
    }
    
    if (typeof process !== 'undefined' && process.env.QIRVO_VERSION) {
      return process.env.QIRVO_VERSION;
    }
    
    // Fallback to feature detection
    return this.detectVersionByFeatures();
  }
  
  private detectVersionByFeatures(): string {
    // Feature-based version detection
    if (this.hasFeature('context-api')) {
      return '2.0.0';
    } else if (this.hasFeature('typescript-support')) {
      return '1.2.0';
    } else if (this.hasFeature('base-plugin')) {
      return '1.1.0';
    }
    return '1.0.0';
  }
  
  private detectFeatures(): void {
    // Detect available features
    this.features.set('context-api', this.hasContextAPI());
    this.features.set('typescript-support', this.hasTypeScriptSupport());
    this.features.set('secure-storage', this.hasSecureStorage());
    this.features.set('event-system-v2', this.hasEventSystemV2());
    this.features.set('hook-system', this.hasHookSystem());
  }
  
  private hasContextAPI(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).qirvo?.createContext !== undefined;
  }
  
  private hasEventSystemV2(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).qirvo?.events?.subscribe !== undefined;
  }
  
  // Public API
  getQirvoVersion(): string {
    return this.qirvoVersion;
  }
  
  getSDKVersion(): string {
    return this.sdkVersion;
  }
  
  hasFeature(feature: string): boolean {
    return this.features.get(feature) || false;
  }
  
  isVersionAtLeast(minVersion: string): boolean {
    return this.compareVersions(this.qirvoVersion, minVersion) >= 0;
  }
  
  isVersionBefore(maxVersion: string): boolean {
    return this.compareVersions(this.qirvoVersion, maxVersion) < 0;
  }
  
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }
}

// Feature detection utilities
export class FeatureDetector {
  static hasAPI(apiPath: string): boolean {
    const parts = apiPath.split('.');
    let current: any = typeof window !== 'undefined' ? window : global;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }
    
    return current !== undefined;
  }
  
  static hasMethod(object: any, method: string): boolean {
    return object && typeof object[method] === 'function';
  }
  
  static hasProperty(object: any, property: string): boolean {
    return object && property in object;
  }
}
```

## Polyfills and Adapters

### Legacy API Polyfills

```typescript
// Polyfills for legacy API support
export class LegacyPolyfills {
  private static installed = false;
  
  static install(): void {
    if (LegacyPolyfills.installed) {
      return;
    }
    
    // Install polyfills based on detected version
    const detector = VersionDetector.getInstance();
    
    if (!detector.hasFeature('context-api')) {
      LegacyPolyfills.installContextAPIPolyfill();
    }
    
    if (!detector.hasFeature('event-system-v2')) {
      LegacyPolyfills.installEventSystemPolyfill();
    }
    
    if (!detector.hasFeature('secure-storage')) {
      LegacyPolyfills.installSecureStoragePolyfill();
    }
    
    LegacyPolyfills.installed = true;
  }
  
  private static installContextAPIPolyfill(): void {
    // Polyfill context API for v1.x
    if (typeof window !== 'undefined' && (window as any).qirvo) {
      (window as any).qirvo.createContext = function(pluginId: string) {
        return {
          storage: (window as any).qirvo.storage,
          events: (window as any).qirvo.events,
          config: (window as any).qirvo.config,
          plugin: { id: pluginId }
        };
      };
    }
  }
  
  private static installEventSystemPolyfill(): void {
    // Polyfill new event system for older versions
    if (typeof window !== 'undefined' && (window as any).qirvo?.events) {
      const oldEvents = (window as any).qirvo.events;
      
      // Add subscribe method that maps to old 'on' method
      oldEvents.subscribe = function(event: string, handler: Function) {
        return oldEvents.on(event, handler);
      };
      
      // Add unsubscribe method
      oldEvents.unsubscribe = function(event: string, handler: Function) {
        return oldEvents.off(event, handler);
      };
    }
  }
  
  private static installSecureStoragePolyfill(): void {
    // Polyfill secure storage for older versions
    if (typeof window !== 'undefined' && (window as any).qirvo?.storage) {
      const storage = (window as any).qirvo.storage;
      
      storage.setSecure = async function(key: string, value: any) {
        // Simple encryption polyfill (not production-ready)
        const encrypted = btoa(JSON.stringify(value));
        return storage.set(`secure_${key}`, encrypted);
      };
      
      storage.getSecure = async function(key: string) {
        const encrypted = await storage.get(`secure_${key}`);
        if (!encrypted) return null;
        
        try {
          return JSON.parse(atob(encrypted));
        } catch {
          return null;
        }
      };
    }
  }
}

// V1 Compatibility Adapter
export class V1CompatibilityAdapter implements CompatibilityAdapter {
  async adapt(plugin: any, targetVersion: string): Promise<AdaptedPlugin> {
    const adaptedPlugin = { ...plugin };
    const warnings: DeprecationWarning[] = [];
    const limitations: string[] = [];
    
    // Adapt constructor if needed
    if (plugin.constructor && plugin.constructor.length === 1) {
      // v1.x constructor signature
      const originalConstructor = plugin.constructor;
      adaptedPlugin.constructor = function(context: any, config: any) {
        // Call original constructor with just config
        originalConstructor.call(this, config);
        
        // Add context manually
        this.context = context;
      };
      
      warnings.push({
        type: 'constructor',
        message: 'Plugin constructor signature has changed in v2.0',
        suggestion: 'Update constructor to accept context as first parameter'
      });
    }
    
    // Adapt lifecycle methods
    if (plugin.onInit) {
      adaptedPlugin.initialize = plugin.onInit;
      delete adaptedPlugin.onInit;
      
      warnings.push({
        type: 'lifecycle',
        message: 'onInit() method renamed to initialize() in v2.0',
        suggestion: 'Rename onInit() to initialize()'
      });
    }
    
    if (plugin.onDestroy) {
      adaptedPlugin.cleanup = plugin.onDestroy;
      delete adaptedPlugin.onDestroy;
      
      warnings.push({
        type: 'lifecycle', 
        message: 'onDestroy() method renamed to cleanup() in v2.0',
        suggestion: 'Rename onDestroy() to cleanup()'
      });
    }
    
    return {
      plugin: adaptedPlugin,
      polyfills: ['context-api', 'event-system-v2'],
      warnings,
      limitations
    };
  }
  
  getRequiredPolyfills(): string[] {
    return ['context-api', 'event-system-v2'];
  }
  
  getDeprecationWarnings(): DeprecationWarning[] {
    return [
      {
        type: 'api',
        message: 'v1.x API is deprecated and will be removed in v3.0',
        suggestion: 'Migrate to v2.x API'
      }
    ];
  }
}

interface DeprecationWarning {
  type: string;
  message: string;
  suggestion: string;
}
```

## Multi-Version Support

### Multi-Version Plugin Architecture

```typescript
// Multi-version plugin support
export class MultiVersionPlugin {
  private versions: Map<string, PluginImplementation> = new Map();
  private currentVersion: string;
  private fallbackVersion: string;
  
  constructor() {
    this.currentVersion = VersionDetector.getInstance().getQirvoVersion();
    this.fallbackVersion = '1.0.0';
    this.registerVersions();
  }
  
  private registerVersions(): void {
    // Register different implementations for different versions
    this.versions.set('2.x', new V2PluginImplementation());
    this.versions.set('1.x', new V1PluginImplementation());
  }
  
  getImplementation(): PluginImplementation {
    // Try to find exact version match
    for (const [pattern, implementation] of this.versions) {
      if (this.matchesVersion(this.currentVersion, pattern)) {
        return implementation;
      }
    }
    
    // Fallback to oldest supported version
    return this.versions.get('1.x')!;
  }
  
  private matchesVersion(version: string, pattern: string): boolean {
    if (pattern.endsWith('.x')) {
      const major = pattern.split('.')[0];
      return version.startsWith(major + '.');
    }
    return version === pattern;
  }
}

// Version-specific implementations
export class V2PluginImplementation implements PluginImplementation {
  async initialize(context: PluginContext): Promise<void> {
    // v2.x initialization using context API
    await context.storage.set('initialized', true);
    context.events.subscribe('user:action', this.handleUserAction.bind(this));
  }
  
  private handleUserAction(event: any): void {
    console.log('v2.x: User action handled', event);
  }
}

export class V1PluginImplementation implements PluginImplementation {
  async initialize(context: any): Promise<void> {
    // v1.x initialization using global API
    if (typeof window !== 'undefined' && (window as any).qirvo) {
      await (window as any).qirvo.storage.set('initialized', true);
      (window as any).qirvo.events.on('user-action', this.handleUserAction.bind(this));
    }
  }
  
  private handleUserAction(data: any): void {
    console.log('v1.x: User action handled', data);
  }
}

interface PluginImplementation {
  initialize(context: any): Promise<void>;
}
```

## Legacy API Bridge

### API Bridge System

```typescript
// Bridge between old and new APIs
export class LegacyAPIBridge {
  private static instance: LegacyAPIBridge;
  private bridges: Map<string, APIBridge> = new Map();
  
  private constructor() {
    this.setupBridges();
  }
  
  static getInstance(): LegacyAPIBridge {
    if (!LegacyAPIBridge.instance) {
      LegacyAPIBridge.instance = new LegacyAPIBridge();
    }
    return LegacyAPIBridge.instance;
  }
  
  private setupBridges(): void {
    // Storage API bridge
    this.bridges.set('storage', new StorageAPIBridge());
    
    // Events API bridge
    this.bridges.set('events', new EventsAPIBridge());
    
    // Configuration API bridge
    this.bridges.set('config', new ConfigAPIBridge());
  }
  
  bridgeAPI(apiName: string, legacyAPI: any, modernAPI: any): any {
    const bridge = this.bridges.get(apiName);
    if (bridge) {
      return bridge.create(legacyAPI, modernAPI);
    }
    return modernAPI;
  }
}

// Storage API Bridge
export class StorageAPIBridge implements APIBridge {
  create(legacyAPI: any, modernAPI: any): any {
    const bridgedAPI = { ...modernAPI };
    
    // Add legacy method aliases
    bridgedAPI.getValue = bridgedAPI.get;
    bridgedAPI.setValue = bridgedAPI.set;
    bridgedAPI.removeValue = bridgedAPI.remove;
    
    // Add deprecation warnings
    const originalGet = bridgedAPI.get;
    bridgedAPI.getValue = function(...args: any[]) {
      console.warn('[DEPRECATED] getValue() is deprecated. Use get() instead.');
      return originalGet.apply(this, args);
    };
    
    return bridgedAPI;
  }
}

// Events API Bridge
export class EventsAPIBridge implements APIBridge {
  create(legacyAPI: any, modernAPI: any): any {
    const bridgedAPI = { ...modernAPI };
    
    // Map old event names to new format
    const eventNameMap: Record<string, string> = {
      'user-action': 'user:action',
      'plugin-loaded': 'plugin:loaded',
      'data-changed': 'data:changed'
    };
    
    // Override subscribe to handle legacy event names
    const originalSubscribe = bridgedAPI.subscribe;
    bridgedAPI.subscribe = function(event: string, handler: Function) {
      const modernEvent = eventNameMap[event] || event;
      if (eventNameMap[event]) {
        console.warn(`[DEPRECATED] Event name '${event}' is deprecated. Use '${modernEvent}' instead.`);
      }
      return originalSubscribe.call(this, modernEvent, handler);
    };
    
    // Add legacy 'on' method
    bridgedAPI.on = bridgedAPI.subscribe;
    
    return bridgedAPI;
  }
}

interface APIBridge {
  create(legacyAPI: any, modernAPI: any): any;
}
```

## Deprecation Management

### Deprecation Warning System

```typescript
// Deprecation management system
export class DeprecationManager {
  private warnings: Map<string, DeprecationInfo> = new Map();
  private warningCounts: Map<string, number> = new Map();
  private maxWarningsPerType = 5;
  
  constructor() {
    this.loadDeprecationInfo();
  }
  
  private loadDeprecationInfo(): void {
    // Load deprecation information
    this.warnings.set('qirvo.storage.getValue', {
      deprecated: '2.0.0',
      removedIn: '3.0.0',
      replacement: 'context.storage.get',
      reason: 'Global API replaced with context-based API'
    });
    
    this.warnings.set('onInit', {
      deprecated: '2.0.0',
      removedIn: '3.0.0',
      replacement: 'initialize',
      reason: 'Lifecycle method renamed for consistency'
    });
  }
  
  warn(deprecatedFeature: string, context?: string): void {
    const info = this.warnings.get(deprecatedFeature);
    if (!info) {
      return;
    }
    
    // Limit warnings to avoid spam
    const count = this.warningCounts.get(deprecatedFeature) || 0;
    if (count >= this.maxWarningsPerType) {
      return;
    }
    
    this.warningCounts.set(deprecatedFeature, count + 1);
    
    const message = this.formatWarningMessage(deprecatedFeature, info, context);
    console.warn(message);
    
    // Track deprecation usage for analytics
    this.trackDeprecationUsage(deprecatedFeature, context);
  }
  
  private formatWarningMessage(
    feature: string,
    info: DeprecationInfo,
    context?: string
  ): string {
    let message = `[DEPRECATED] ${feature} is deprecated since v${info.deprecated}`;
    
    if (info.removedIn) {
      message += ` and will be removed in v${info.removedIn}`;
    }
    
    if (info.replacement) {
      message += `. Use ${info.replacement} instead`;
    }
    
    if (info.reason) {
      message += `. Reason: ${info.reason}`;
    }
    
    if (context) {
      message += ` (Context: ${context})`;
    }
    
    return message;
  }
  
  private trackDeprecationUsage(feature: string, context?: string): void {
    // Track deprecation usage for migration planning
    if (typeof window !== 'undefined' && (window as any).qirvo?.analytics) {
      (window as any).qirvo.analytics.track('deprecation_usage', {
        feature,
        context,
        timestamp: Date.now()
      });
    }
  }
  
  getDeprecationReport(): DeprecationReport {
    const report: DeprecationReport = {
      totalWarnings: 0,
      features: []
    };
    
    this.warningCounts.forEach((count, feature) => {
      const info = this.warnings.get(feature);
      if (info) {
        report.features.push({
          feature,
          usageCount: count,
          deprecatedIn: info.deprecated,
          removedIn: info.removedIn,
          replacement: info.replacement
        });
        report.totalWarnings += count;
      }
    });
    
    return report;
  }
}

interface DeprecationInfo {
  deprecated: string;
  removedIn?: string;
  replacement?: string;
  reason?: string;
}

interface DeprecationReport {
  totalWarnings: number;
  features: Array<{
    feature: string;
    usageCount: number;
    deprecatedIn: string;
    removedIn?: string;
    replacement?: string;
  }>;
}

// Global deprecation manager instance
export const deprecationManager = new DeprecationManager();
```

This comprehensive legacy support system ensures that plugins can work across multiple Qirvo versions while providing clear migration paths and deprecation warnings to guide developers toward modern APIs.

**Next**: [Examples Overview](../examples/README.md)
