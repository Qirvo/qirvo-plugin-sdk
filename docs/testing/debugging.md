# Debugging Guide

This guide covers debugging techniques, tools, and best practices for Qirvo plugin development, including browser DevTools, logging strategies, and troubleshooting common issues.

## Table of Contents

- [Debugging Setup](#debugging-setup)
- [Browser DevTools](#browser-devtools)
- [Logging Strategies](#logging-strategies)
- [Common Issues](#common-issues)
- [Performance Debugging](#performance-debugging)
- [Production Debugging](#production-debugging)

## Debugging Setup

### Development Environment

```typescript
// Debug configuration for development
export class DebugConfig {
  static readonly isDevelopment = process.env.NODE_ENV === 'development';
  static readonly isProduction = process.env.NODE_ENV === 'production';
  static readonly debugLevel = process.env.DEBUG_LEVEL || 'info';
  
  static enableDebugMode(): void {
    if (this.isDevelopment) {
      // Enable React DevTools
      if (typeof window !== 'undefined') {
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot = 
          (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot || (() => {});
      }
      
      // Enable verbose logging
      console.log('🐛 Debug mode enabled');
      
      // Add debug utilities to global scope
      (window as any).debugPlugin = this.createDebugUtilities();
    }
  }
  
  private static createDebugUtilities() {
    return {
      logState: (component: any) => {
        console.group('Component State');
        console.log(component);
        console.groupEnd();
      },
      
      logProps: (props: any) => {
        console.group('Component Props');
        console.table(props);
        console.groupEnd();
      },
      
      logContext: (context: any) => {
        console.group('Plugin Context');
        console.log(context);
        console.groupEnd();
      },
      
      measurePerformance: (name: string, fn: Function) => {
        console.time(name);
        const result = fn();
        console.timeEnd(name);
        return result;
      }
    };
  }
}
```

### Debug Logger

```typescript
// Comprehensive logging system for debugging
export class DebugLogger {
  private static instance: DebugLogger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private logLevel: LogLevel = LogLevel.INFO;
  
  static getInstance(): DebugLogger {
    if (!this.instance) {
      this.instance = new DebugLogger();
    }
    return this.instance;
  }
  
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, error);
  }
  
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) return;
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      stack: new Error().stack
    };
    
    this.logs.push(entry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console output with styling
    this.outputToConsole(entry);
  }
  
  private outputToConsole(entry: LogEntry): void {
    const styles = {
      [LogLevel.DEBUG]: 'color: #888',
      [LogLevel.INFO]: 'color: #007acc',
      [LogLevel.WARN]: 'color: #ff8c00',
      [LogLevel.ERROR]: 'color: #ff4444; font-weight: bold'
    };
    
    const timestamp = entry.timestamp.toISOString().substr(11, 12);
    const levelName = LogLevel[entry.level];
    
    console.log(
      `%c[${timestamp}] ${levelName}: ${entry.message}`,
      styles[entry.level],
      entry.data || ''
    );
    
    if (entry.level === LogLevel.ERROR && entry.data instanceof Error) {
      console.error(entry.data);
    }
  }
  
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }
  
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
  
  clearLogs(): void {
    this.logs = [];
  }
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  stack?: string;
}
```

## Browser DevTools

### DevTools Integration

```typescript
// DevTools integration for plugin debugging
export class DevToolsIntegration {
  private static isEnabled = false;
  
  static enable(): void {
    if (this.isEnabled || !DebugConfig.isDevelopment) return;
    
    this.isEnabled = true;
    this.setupConsoleCommands();
    this.setupPerformanceMarkers();
    this.setupNetworkMonitoring();
  }
  
  private static setupConsoleCommands(): void {
    // Add debug commands to console
    (window as any).qirvoDebug = {
      // Inspect plugin state
      inspectPlugin: (pluginId: string) => {
        const plugin = this.getPluginById(pluginId);
        if (plugin) {
          console.group(`🔍 Plugin: ${pluginId}`);
          console.log('State:', plugin.getState?.());
          console.log('Config:', plugin.getConfig?.());
          console.log('Instance:', plugin);
          console.groupEnd();
        } else {
          console.warn(`Plugin ${pluginId} not found`);
        }
      },
      
      // List all plugins
      listPlugins: () => {
        const plugins = this.getAllPlugins();
        console.table(plugins.map(p => ({
          id: p.id,
          name: p.name,
          version: p.version,
          state: p.getState?.() || 'unknown'
        })));
      },
      
      // Monitor plugin events
      monitorEvents: (pluginId: string) => {
        const plugin = this.getPluginById(pluginId);
        if (plugin && plugin.on) {
          const events = ['enable', 'disable', 'config-change', 'error'];
          events.forEach(event => {
            plugin.on(event, (...args: any[]) => {
              console.log(`📡 ${pluginId} event: ${event}`, args);
            });
          });
          console.log(`Monitoring events for ${pluginId}`);
        }
      },
      
      // Export debug information
      exportDebugInfo: () => {
        const debugInfo = {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          plugins: this.getAllPlugins().map(p => ({
            id: p.id,
            name: p.name,
            version: p.version,
            state: p.getState?.()
          })),
          logs: DebugLogger.getInstance().getLogs(),
          performance: this.getPerformanceMetrics()
        };
        
        console.log('Debug info exported:', debugInfo);
        return debugInfo;
      }
    };
    
    console.log('🛠️ Qirvo debug commands available: qirvoDebug');
  }
  
  private static setupPerformanceMarkers(): void {
    // Add performance markers for plugin operations
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0].toString();
      performance.mark(`fetch-start-${url}`);
      
      try {
        const response = await originalFetch(...args);
        performance.mark(`fetch-end-${url}`);
        performance.measure(`fetch-${url}`, `fetch-start-${url}`, `fetch-end-${url}`);
        return response;
      } catch (error) {
        performance.mark(`fetch-error-${url}`);
        throw error;
      }
    };
  }
  
  private static setupNetworkMonitoring(): void {
    // Monitor network requests
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (resourceEntry.duration > 1000) { // Slow requests
            console.warn(`🐌 Slow request: ${resourceEntry.name} (${resourceEntry.duration}ms)`);
          }
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }
  
  private static getPluginById(id: string): any {
    // Implementation would get plugin from registry
    return null;
  }
  
  private static getAllPlugins(): any[] {
    // Implementation would get all plugins from registry
    return [];
  }
  
  private static getPerformanceMetrics(): any {
    return {
      memory: (performance as any).memory,
      navigation: performance.getEntriesByType('navigation')[0],
      resources: performance.getEntriesByType('resource').length
    };
  }
}
```

### React DevTools Integration

```typescript
// React DevTools helpers for component debugging
export class ReactDebugTools {
  static highlightComponent(component: React.ComponentType): React.ComponentType {
    if (!DebugConfig.isDevelopment) return component;
    
    return React.forwardRef((props: any, ref: any) => {
      const [renderCount, setRenderCount] = useState(0);
      const [lastProps, setLastProps] = useState(props);
      
      useEffect(() => {
        setRenderCount(prev => prev + 1);
        
        // Log prop changes
        if (JSON.stringify(props) !== JSON.stringify(lastProps)) {
          console.log(`🔄 ${component.name} props changed:`, {
            old: lastProps,
            new: props
          });
          setLastProps(props);
        }
      });
      
      useEffect(() => {
        console.log(`🎨 ${component.name} mounted (render #${renderCount})`);
        
        return () => {
          console.log(`💀 ${component.name} unmounted`);
        };
      }, []);
      
      return React.createElement(component, { ...props, ref });
    });
  }
  
  static withPerformanceTracking<P>(
    Component: React.ComponentType<P>
  ): React.ComponentType<P> {
    return (props: P) => {
      const renderStart = useRef<number>();
      
      renderStart.current = performance.now();
      
      useLayoutEffect(() => {
        const renderTime = performance.now() - renderStart.current!;
        if (renderTime > 16) { // Longer than one frame
          console.warn(`⚠️ Slow render: ${Component.name} took ${renderTime.toFixed(2)}ms`);
        }
      });
      
      return <Component {...props} />;
    };
  }
  
  static logComponentTree(element: React.ReactElement, depth = 0): void {
    const indent = '  '.repeat(depth);
    const type = typeof element.type === 'string' ? element.type : element.type.name;
    
    console.log(`${indent}${type}`, element.props);
    
    if (element.props.children) {
      React.Children.forEach(element.props.children, (child) => {
        if (React.isValidElement(child)) {
          this.logComponentTree(child, depth + 1);
        }
      });
    }
  }
}
```

## Logging Strategies

### Structured Logging

```typescript
// Structured logging for better debugging
export class StructuredLogger {
  private context: LogContext = {};
  
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }
  
  logEvent(event: LogEvent): void {
    const entry = {
      ...event,
      context: this.context,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    };
    
    // Send to appropriate destination
    if (DebugConfig.isDevelopment) {
      this.logToConsole(entry);
    } else {
      this.logToService(entry);
    }
  }
  
  private logToConsole(entry: LogEventEntry): void {
    const { level, message, data, context } = entry;
    
    console.group(`${level.toUpperCase()}: ${message}`);
    if (data) console.log('Data:', data);
    if (context) console.log('Context:', context);
    console.groupEnd();
  }
  
  private async logToService(entry: LogEventEntry): Promise<void> {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('Failed to send log to service:', error);
    }
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('debug-session-id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('debug-session-id', sessionId);
    }
    return sessionId;
  }
}

interface LogContext {
  userId?: string;
  pluginId?: string;
  componentName?: string;
  action?: string;
}

interface LogEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  tags?: string[];
}

interface LogEventEntry extends LogEvent {
  context: LogContext;
  timestamp: string;
  sessionId: string;
}
```

## Common Issues

### Troubleshooting Guide

```typescript
// Common debugging scenarios and solutions
export class TroubleshootingGuide {
  static diagnosePluginIssues(plugin: any): DiagnosisReport {
    const report: DiagnosisReport = {
      issues: [],
      warnings: [],
      suggestions: []
    };
    
    // Check plugin state
    if (!plugin.getState || plugin.getState() === 'error') {
      report.issues.push({
        type: 'state',
        message: 'Plugin is in error state',
        solution: 'Check plugin logs and restart if necessary'
      });
    }
    
    // Check configuration
    const config = plugin.getConfig?.();
    if (!config || Object.keys(config).length === 0) {
      report.warnings.push({
        type: 'config',
        message: 'Plugin has no configuration',
        solution: 'Verify plugin configuration is properly set'
      });
    }
    
    // Check required permissions
    const requiredPermissions = plugin.getRequiredPermissions?.();
    if (requiredPermissions && requiredPermissions.length > 0) {
      // Check if permissions are granted
      const grantedPermissions = plugin.getGrantedPermissions?.();
      const missingPermissions = requiredPermissions.filter(
        perm => !grantedPermissions?.includes(perm)
      );
      
      if (missingPermissions.length > 0) {
        report.issues.push({
          type: 'permissions',
          message: `Missing permissions: ${missingPermissions.join(', ')}`,
          solution: 'Grant required permissions in plugin settings'
        });
      }
    }
    
    // Check network connectivity
    if (plugin.requiresNetwork?.()) {
      this.checkNetworkConnectivity().then(isOnline => {
        if (!isOnline) {
          report.issues.push({
            type: 'network',
            message: 'No network connectivity',
            solution: 'Check internet connection'
          });
        }
      });
    }
    
    return report;
  }
  
  static async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  static debugRenderIssues(component: React.ComponentType): void {
    console.group('🎨 Render Debugging');
    
    // Check for common render issues
    const issues = [
      'Infinite re-renders',
      'Missing dependencies in useEffect',
      'Expensive calculations in render',
      'Unnecessary re-renders'
    ];
    
    console.log('Common render issues to check:', issues);
    
    // Add render tracking
    const WrappedComponent = ReactDebugTools.withPerformanceTracking(component);
    console.log('Performance tracking enabled for component');
    
    console.groupEnd();
  }
  
  static debugStateIssues(hook: any): void {
    console.group('📊 State Debugging');
    
    // Log state changes
    const originalSetState = hook.setState;
    hook.setState = (newState: any) => {
      console.log('State change:', {
        from: hook.state,
        to: newState
      });
      return originalSetState(newState);
    };
    
    console.groupEnd();
  }
}

interface DiagnosisReport {
  issues: Issue[];
  warnings: Issue[];
  suggestions: string[];
}

interface Issue {
  type: string;
  message: string;
  solution: string;
}
```

## Performance Debugging

### Performance Profiler

```typescript
// Performance debugging and profiling
export class PerformanceProfiler {
  private profiles: Map<string, PerformanceProfile> = new Map();
  private isRecording = false;
  
  startProfiling(name: string): void {
    if (this.isRecording) {
      console.warn('Already recording a profile');
      return;
    }
    
    this.isRecording = true;
    const profile: PerformanceProfile = {
      name,
      startTime: performance.now(),
      endTime: 0,
      marks: [],
      measures: [],
      memorySnapshots: []
    };
    
    this.profiles.set(name, profile);
    performance.mark(`profile-${name}-start`);
    
    // Take initial memory snapshot
    if ('memory' in performance) {
      profile.memorySnapshots.push({
        timestamp: performance.now(),
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize
      });
    }
    
    console.log(`🎯 Started profiling: ${name}`);
  }
  
  addMark(name: string, label?: string): void {
    if (!this.isRecording) return;
    
    const markName = `mark-${name}`;
    performance.mark(markName);
    
    const activeProfile = Array.from(this.profiles.values())
      .find(p => p.endTime === 0);
    
    if (activeProfile) {
      activeProfile.marks.push({
        name: markName,
        label: label || name,
        timestamp: performance.now()
      });
    }
  }
  
  stopProfiling(): PerformanceProfile | null {
    if (!this.isRecording) return null;
    
    const activeProfile = Array.from(this.profiles.values())
      .find(p => p.endTime === 0);
    
    if (!activeProfile) return null;
    
    activeProfile.endTime = performance.now();
    performance.mark(`profile-${activeProfile.name}-end`);
    performance.measure(
      `profile-${activeProfile.name}`,
      `profile-${activeProfile.name}-start`,
      `profile-${activeProfile.name}-end`
    );
    
    // Take final memory snapshot
    if ('memory' in performance) {
      activeProfile.memorySnapshots.push({
        timestamp: performance.now(),
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize
      });
    }
    
    this.isRecording = false;
    
    console.log(`✅ Stopped profiling: ${activeProfile.name}`);
    this.logProfileResults(activeProfile);
    
    return activeProfile;
  }
  
  private logProfileResults(profile: PerformanceProfile): void {
    const duration = profile.endTime - profile.startTime;
    
    console.group(`📊 Profile Results: ${profile.name}`);
    console.log(`Duration: ${duration.toFixed(2)}ms`);
    
    if (profile.marks.length > 0) {
      console.log('Marks:');
      profile.marks.forEach(mark => {
        const relativeTime = mark.timestamp - profile.startTime;
        console.log(`  ${mark.label}: ${relativeTime.toFixed(2)}ms`);
      });
    }
    
    if (profile.memorySnapshots.length >= 2) {
      const initial = profile.memorySnapshots[0];
      const final = profile.memorySnapshots[profile.memorySnapshots.length - 1];
      const memoryDiff = final.used - initial.used;
      
      console.log(`Memory change: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
    }
    
    console.groupEnd();
  }
  
  getProfile(name: string): PerformanceProfile | undefined {
    return this.profiles.get(name);
  }
  
  getAllProfiles(): PerformanceProfile[] {
    return Array.from(this.profiles.values());
  }
}

interface PerformanceProfile {
  name: string;
  startTime: number;
  endTime: number;
  marks: PerformanceMark[];
  measures: PerformanceMeasure[];
  memorySnapshots: MemorySnapshot[];
}

interface PerformanceMark {
  name: string;
  label: string;
  timestamp: number;
}

interface MemorySnapshot {
  timestamp: number;
  used: number;
  total: number;
}
```

## Production Debugging

### Remote Debugging

```typescript
// Production debugging capabilities
export class ProductionDebugger {
  private static instance: ProductionDebugger;
  private errorReporter: ErrorReporter;
  private sessionRecorder: SessionRecorder;
  
  static getInstance(): ProductionDebugger {
    if (!this.instance) {
      this.instance = new ProductionDebugger();
    }
    return this.instance;
  }
  
  constructor() {
    this.errorReporter = new ErrorReporter();
    this.sessionRecorder = new SessionRecorder();
    this.setupErrorHandling();
  }
  
  private setupErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportError(event.error, {
        type: 'global-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(new Error(event.reason), {
        type: 'unhandled-promise-rejection'
      });
    });
  }
  
  async reportError(error: Error, context: any = {}): Promise<void> {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionRecorder.getSessionId(),
      breadcrumbs: this.sessionRecorder.getBreadcrumbs()
    };
    
    await this.errorReporter.send(errorReport);
  }
  
  enableRemoteDebugging(debugKey: string): void {
    if (!DebugConfig.isProduction) return;
    
    // Enable remote debugging with secure key
    (window as any).__QIRVO_REMOTE_DEBUG__ = {
      key: debugKey,
      getLogs: () => DebugLogger.getInstance().getLogs(),
      getState: () => this.getApplicationState(),
      executeCommand: (command: string) => this.executeDebugCommand(command)
    };
    
    console.log('🔐 Remote debugging enabled');
  }
  
  private getApplicationState(): any {
    return {
      plugins: this.getPluginStates(),
      performance: this.getPerformanceMetrics(),
      errors: this.errorReporter.getRecentErrors(),
      memory: this.getMemoryInfo()
    };
  }
  
  private executeDebugCommand(command: string): any {
    // Safely execute debug commands
    const allowedCommands = [
      'getState',
      'getLogs',
      'clearLogs',
      'getPerformance'
    ];
    
    if (!allowedCommands.includes(command)) {
      throw new Error('Command not allowed');
    }
    
    switch (command) {
      case 'getState':
        return this.getApplicationState();
      case 'getLogs':
        return DebugLogger.getInstance().getLogs();
      case 'clearLogs':
        DebugLogger.getInstance().clearLogs();
        return 'Logs cleared';
      case 'getPerformance':
        return this.getPerformanceMetrics();
      default:
        throw new Error('Unknown command');
    }
  }
  
  private getPluginStates(): any[] {
    // Implementation would get plugin states
    return [];
  }
  
  private getPerformanceMetrics(): any {
    return {
      memory: (performance as any).memory,
      timing: performance.timing,
      navigation: performance.navigation
    };
  }
  
  private getMemoryInfo(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }
}

class ErrorReporter {
  private errors: any[] = [];
  
  async send(errorReport: any): Promise<void> {
    this.errors.push(errorReport);
    
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      });
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }
  
  getRecentErrors(): any[] {
    return this.errors.slice(-10);
  }
}

class SessionRecorder {
  private sessionId: string;
  private breadcrumbs: any[] = [];
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startRecording();
  }
  
  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  private startRecording(): void {
    // Record user interactions
    ['click', 'input', 'submit'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        this.addBreadcrumb({
          type: 'user-interaction',
          event: eventType,
          target: this.getElementSelector(event.target as Element),
          timestamp: Date.now()
        });
      });
    });
  }
  
  addBreadcrumb(breadcrumb: any): void {
    this.breadcrumbs.push(breadcrumb);
    
    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }
  
  getSessionId(): string {
    return this.sessionId;
  }
  
  getBreadcrumbs(): any[] {
    return [...this.breadcrumbs];
  }
  
  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }
}
```

This debugging guide provides comprehensive tools and techniques for debugging Qirvo plugins in both development and production environments.

---

**Next**: [Build Process](../deployment/build-process.md)
