# Background Services

Background services are long-running processes that perform automated tasks, data synchronization, and monitoring without user interaction. This guide covers creating robust background services for the Qirvo platform.

## Table of Contents

- [Service Fundamentals](#service-fundamentals)
- [Service Lifecycle](#service-lifecycle)
- [Scheduled Tasks](#scheduled-tasks)
- [Event-Driven Processing](#event-driven-processing)
- [Error Handling and Recovery](#error-handling-and-recovery)
- [Performance and Monitoring](#performance-and-monitoring)

## Service Fundamentals

### What are Background Services?

Background services are plugins that:
- Run continuously in the background
- Perform scheduled or event-driven tasks
- Synchronize data with external systems
- Monitor system health and performance
- Process queues and batch operations

### Basic Service Structure

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

export default class MyBackgroundService extends BasePlugin {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Background service starting');
    await this.startService();
  }

  async onDisable(): Promise<void> {
    this.log('info', 'Background service stopping');
    await this.stopService();
  }

  private async startService(): Promise<void> {
    this.isRunning = true;
    
    // Start periodic tasks
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.performPeriodicTask();
      }
    }, 60000); // Every minute

    // Start event listeners
    this.setupEventListeners();
  }

  private async stopService(): Promise<void> {
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    await this.cleanup();
  }

  private async performPeriodicTask(): Promise<void> {
    try {
      this.log('debug', 'Performing periodic task');
      // Task implementation
    } catch (error) {
      this.log('error', 'Periodic task failed:', error);
    }
  }
}
```

## Service Lifecycle

### Manifest Configuration

```json
{
  "type": "service",
  "background": "dist/background.js",
  "hooks": {
    "onInstall": "setupService",
    "onEnable": "startService",
    "onDisable": "stopService",
    "onUninstall": "cleanupService"
  },
  "permissions": [
    "network-access",
    "storage-read",
    "storage-write",
    "notifications"
  ]
}
```

### Advanced Service Class

```typescript
export default class DataSyncService extends BasePlugin {
  private syncInterval: NodeJS.Timeout | null = null;
  private isHealthy = true;
  private lastSyncTime: Date | null = null;
  private syncQueue: Array<SyncTask> = [];
  private processing = false;

  async onInstall(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Installing data sync service');
    
    // Initialize service data
    await this.setStorage('installDate', new Date().toISOString());
    await this.setStorage('syncHistory', []);
    await this.setStorage('errorCount', 0);
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Enabling data sync service');
    
    const config = context.config as ServiceConfig;
    
    // Validate configuration
    if (!this.validateConfig(config)) {
      throw new Error('Invalid service configuration');
    }

    // Start service components
    await this.startSyncScheduler(config.syncInterval);
    await this.startHealthMonitor();
    await this.startQueueProcessor();
    
    // Initial sync
    await this.performInitialSync();
  }

  async onDisable(): Promise<void> {
    this.log('info', 'Disabling data sync service');
    
    // Stop all timers and processes
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Wait for current operations to complete
    await this.gracefulShutdown();
  }

  private async startSyncScheduler(intervalMs: number): Promise<void> {
    this.syncInterval = setInterval(async () => {
      await this.scheduledSync();
    }, intervalMs);
  }

  private async scheduledSync(): Promise<void> {
    if (this.processing) {
      this.log('debug', 'Sync already in progress, skipping');
      return;
    }

    try {
      this.processing = true;
      await this.performDataSync();
      this.lastSyncTime = new Date();
      this.isHealthy = true;
    } catch (error) {
      this.log('error', 'Scheduled sync failed:', error);
      await this.handleSyncError(error);
    } finally {
      this.processing = false;
    }
  }
}

interface ServiceConfig {
  syncInterval: number;
  apiEndpoint: string;
  retryAttempts: number;
  batchSize: number;
}

interface SyncTask {
  id: string;
  type: string;
  data: any;
  priority: number;
  createdAt: Date;
}
```

## Scheduled Tasks

### Cron-like Scheduling

```typescript
import { CronJob } from 'cron';

export default class ScheduledTaskService extends BasePlugin {
  private jobs: CronJob[] = [];

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    const config = context.config as ScheduleConfig;
    
    // Daily backup at 2 AM
    const backupJob = new CronJob('0 2 * * *', async () => {
      await this.performBackup();
    });

    // Hourly cleanup
    const cleanupJob = new CronJob('0 * * * *', async () => {
      await this.performCleanup();
    });

    // Weekly report on Sundays at 9 AM
    const reportJob = new CronJob('0 9 * * 0', async () => {
      await this.generateWeeklyReport();
    });

    this.jobs = [backupJob, cleanupJob, reportJob];
    this.jobs.forEach(job => job.start());
  }

  async onDisable(): Promise<void> {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
  }

  private async performBackup(): Promise<void> {
    try {
      this.log('info', 'Starting scheduled backup');
      
      const data = await this.collectBackupData();
      const compressed = await this.compressData(data);
      await this.uploadBackup(compressed);
      
      await this.notify('Backup Complete', 'Daily backup completed successfully', 'success');
    } catch (error) {
      this.log('error', 'Backup failed:', error);
      await this.notify('Backup Failed', 'Daily backup failed', 'error');
    }
  }
}

interface ScheduleConfig {
  backupEnabled: boolean;
  cleanupEnabled: boolean;
  reportEnabled: boolean;
  backupRetention: number;
}
```

### Custom Scheduling

```typescript
export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    this.timer = setInterval(() => {
      this.processTasks();
    }, 1000); // Check every second
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  schedule(id: string, task: ScheduledTask): void {
    this.tasks.set(id, task);
  }

  unschedule(id: string): void {
    this.tasks.delete(id);
  }

  private async processTasks(): Promise<void> {
    const now = new Date();
    
    for (const [id, task] of this.tasks) {
      if (this.shouldExecute(task, now)) {
        try {
          await task.execute();
          this.updateLastRun(task, now);
        } catch (error) {
          console.error(`Task ${id} failed:`, error);
        }
      }
    }
  }

  private shouldExecute(task: ScheduledTask, now: Date): boolean {
    if (!task.lastRun) return true;
    
    const timeSinceLastRun = now.getTime() - task.lastRun.getTime();
    return timeSinceLastRun >= task.intervalMs;
  }

  private updateLastRun(task: ScheduledTask, time: Date): void {
    task.lastRun = time;
  }
}

interface ScheduledTask {
  intervalMs: number;
  lastRun?: Date;
  execute: () => Promise<void>;
}
```

## Event-Driven Processing

### Event Listeners

```typescript
export default class EventDrivenService extends BasePlugin {
  private eventHandlers: Map<string, Function> = new Map();

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.setupEventHandlers(context);
  }

  private setupEventHandlers(context: PluginRuntimeContext): void {
    // User activity events
    const userActivityHandler = this.handleUserActivity.bind(this);
    context.bus.on('user.activity', userActivityHandler);
    this.eventHandlers.set('user.activity', userActivityHandler);

    // Data change events
    const dataChangeHandler = this.handleDataChange.bind(this);
    context.bus.on('data.changed', dataChangeHandler);
    this.eventHandlers.set('data.changed', dataChangeHandler);

    // System events
    const systemEventHandler = this.handleSystemEvent.bind(this);
    context.bus.on('system.event', systemEventHandler);
    this.eventHandlers.set('system.event', systemEventHandler);
  }

  async onDisable(): Promise<void> {
    // Clean up event listeners
    for (const [event, handler] of this.eventHandlers) {
      this.context.bus.off(event, handler);
    }
    this.eventHandlers.clear();
  }

  private async handleUserActivity(data: UserActivityEvent): Promise<void> {
    try {
      this.log('debug', 'Processing user activity:', data);
      
      // Update user statistics
      await this.updateUserStats(data.userId, data.activity);
      
      // Trigger related workflows
      if (data.activity === 'login') {
        await this.processUserLogin(data);
      }
    } catch (error) {
      this.log('error', 'Failed to process user activity:', error);
    }
  }

  private async handleDataChange(data: DataChangeEvent): Promise<void> {
    try {
      this.log('debug', 'Processing data change:', data);
      
      // Validate change
      if (!this.validateDataChange(data)) {
        this.log('warn', 'Invalid data change detected:', data);
        return;
      }

      // Sync to external systems
      await this.syncDataChange(data);
      
      // Update search indexes
      await this.updateSearchIndex(data);
    } catch (error) {
      this.log('error', 'Failed to process data change:', error);
    }
  }
}

interface UserActivityEvent {
  userId: string;
  activity: string;
  timestamp: Date;
  metadata?: any;
}

interface DataChangeEvent {
  type: string;
  id: string;
  changes: any;
  timestamp: Date;
}
```

### Queue Processing

```typescript
export class TaskQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private maxConcurrent = 3;
  private activeJobs = 0;

  async enqueue(item: QueueItem): Promise<void> {
    this.queue.push(item);
    
    if (!this.processing) {
      this.startProcessing();
    }
  }

  private async startProcessing(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0 || this.activeJobs > 0) {
      if (this.activeJobs < this.maxConcurrent && this.queue.length > 0) {
        const item = this.queue.shift()!;
        this.processItem(item);
      } else {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.processing = false;
  }

  private async processItem(item: QueueItem): Promise<void> {
    this.activeJobs++;
    
    try {
      await item.process();
      console.log(`Processed item ${item.id}`);
    } catch (error) {
      console.error(`Failed to process item ${item.id}:`, error);
      
      if (item.retries < item.maxRetries) {
        item.retries++;
        this.queue.push(item); // Re-queue for retry
      }
    } finally {
      this.activeJobs--;
    }
  }
}

interface QueueItem {
  id: string;
  process: () => Promise<void>;
  retries: number;
  maxRetries: number;
  priority: number;
}
```

## Error Handling and Recovery

### Robust Error Handling

```typescript
export default class ResilientService extends BasePlugin {
  private errorCount = 0;
  private maxErrors = 10;
  private backoffMultiplier = 2;
  private baseDelay = 1000;

  private async performTaskWithRetry<T>(
    task: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await task();
        this.errorCount = 0; // Reset error count on success
        return result;
      } catch (error) {
        lastError = error as Error;
        this.errorCount++;
        
        this.log('warn', `Task failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          await this.sleep(delay);
        }
      }
    }
    
    // All retries failed
    await this.handleCriticalError(lastError!);
    throw lastError!;
  }

  private calculateBackoffDelay(attempt: number): number {
    return this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
  }

  private async handleCriticalError(error: Error): Promise<void> {
    this.log('error', 'Critical error occurred:', error);
    
    if (this.errorCount >= this.maxErrors) {
      this.log('error', 'Too many errors, disabling service');
      await this.notify('Service Error', 'Service disabled due to repeated failures', 'error');
      
      // Disable the service
      await this.onDisable();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Circuit Breaker Pattern

```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime &&
           (Date.now() - this.lastFailureTime.getTime()) >= this.recoveryTimeout;
  }
}
```

## Performance and Monitoring

### Health Checks

```typescript
export default class MonitoredService extends BasePlugin {
  private healthStatus: HealthStatus = {
    status: 'healthy',
    lastCheck: new Date(),
    metrics: {}
  };

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Start health monitoring
    setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const metrics = await this.collectMetrics();
      
      this.healthStatus = {
        status: this.determineHealthStatus(metrics),
        lastCheck: new Date(),
        metrics
      };

      // Store health status
      await this.setStorage('healthStatus', this.healthStatus);
      
      // Alert if unhealthy
      if (this.healthStatus.status !== 'healthy') {
        await this.notify('Service Health Alert', 
          `Service is ${this.healthStatus.status}`, 'warning');
      }
    } catch (error) {
      this.log('error', 'Health check failed:', error);
      this.healthStatus.status = 'unhealthy';
    }
  }

  private async collectMetrics(): Promise<ServiceMetrics> {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      errorRate: await this.getStorage('errorRate') || 0,
      lastSyncTime: await this.getStorage('lastSyncTime'),
      queueSize: await this.getStorage('queueSize') || 0
    };
  }

  private determineHealthStatus(metrics: ServiceMetrics): HealthStatusType {
    if (metrics.errorRate > 0.1) return 'unhealthy';
    if (metrics.memoryUsage.heapUsed > 500 * 1024 * 1024) return 'degraded';
    if (metrics.queueSize > 1000) return 'degraded';
    return 'healthy';
  }
}

interface HealthStatus {
  status: HealthStatusType;
  lastCheck: Date;
  metrics: ServiceMetrics;
}

type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy';

interface ServiceMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  errorRate: number;
  lastSyncTime?: string;
  queueSize: number;
}
```

### Performance Monitoring

```typescript
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  private recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0
    };

    existing.count++;
    existing.totalTime += duration;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);

    this.metrics.set(operation, existing);
  }

  getMetrics(): Record<string, PerformanceMetric & { avgTime: number }> {
    const result: Record<string, PerformanceMetric & { avgTime: number }> = {};
    
    for (const [operation, metric] of this.metrics) {
      result[operation] = {
        ...metric,
        avgTime: metric.totalTime / metric.count
      };
    }
    
    return result;
  }
}

interface PerformanceMetric {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
}
```

## Best Practices

### Service Design
1. **Graceful Shutdown**: Always implement proper cleanup
2. **Error Recovery**: Use retry logic and circuit breakers
3. **Resource Management**: Monitor memory and CPU usage
4. **Health Monitoring**: Implement comprehensive health checks

### Performance
1. **Batch Processing**: Process items in batches when possible
2. **Queue Management**: Use queues for async processing
3. **Connection Pooling**: Reuse database and HTTP connections
4. **Memory Management**: Clean up resources and avoid memory leaks

### Reliability
1. **Idempotency**: Ensure operations can be safely retried
2. **State Persistence**: Save important state to survive restarts
3. **Monitoring**: Log important events and metrics
4. **Alerting**: Notify administrators of critical issues

---

**Next**: [Hybrid Plugins](./hybrid-plugins.md) for multi-type plugin development.
