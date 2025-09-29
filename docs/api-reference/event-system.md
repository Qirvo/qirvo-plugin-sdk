# Event System

The Event System enables real-time communication between plugins, the Qirvo platform, and external systems. This guide covers event handling, custom events, and communication patterns.

## Table of Contents

- [Event Bus Interface](#event-bus-interface)
- [System Events](#system-events)
- [Custom Events](#custom-events)
- [Event Patterns](#event-patterns)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)

## Event Bus Interface

### EventBus Definition

```typescript
interface EventBus {
  emit(event: string, data: any): void;
  on(event: string, handler: (data: any) => void): () => void;
  off(event: string, handler: (data: any) => void): void;
  once(event: string, handler: (data: any) => void): () => void;
  removeAllListeners(event?: string): void;
}
```

### Basic Event Handling

```typescript
export default class EventAwarePlugin extends BasePlugin {
  private unsubscribers: (() => void)[] = [];

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Subscribe to events
    const unsubscribe1 = context.bus.on('user.task.created', this.handleTaskCreated.bind(this));
    const unsubscribe2 = context.bus.on('system.sync.completed', this.handleSyncCompleted.bind(this));
    const unsubscribe3 = context.bus.once('plugin.initialized', this.handleInitialized.bind(this));

    // Store unsubscribers for cleanup
    this.unsubscribers.push(unsubscribe1, unsubscribe2, unsubscribe3);
  }

  async onDisable(): Promise<void> {
    // Cleanup all event subscriptions
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }

  private handleTaskCreated(data: { task: any; userId: string }): void {
    this.log('info', 'New task created:', data.task);
    // Handle task creation event
  }

  private handleSyncCompleted(data: { timestamp: string; itemCount: number }): void {
    this.log('info', 'Sync completed:', data);
    // Handle sync completion
  }

  private handleInitialized(data: any): void {
    this.log('info', 'Plugin system initialized');
    // One-time initialization handler
  }
}
```

## System Events

### User Events

```typescript
interface UserEvents {
  'user.login': { userId: string; timestamp: string };
  'user.logout': { userId: string; timestamp: string };
  'user.profile.updated': { userId: string; changes: Record<string, any> };
  'user.preferences.changed': { userId: string; preferences: Record<string, any> };
}

// Handling user events
export default class UserEventPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    context.bus.on('user.login', this.onUserLogin.bind(this));
    context.bus.on('user.logout', this.onUserLogout.bind(this));
    context.bus.on('user.profile.updated', this.onProfileUpdated.bind(this));
  }

  private async onUserLogin(data: { userId: string; timestamp: string }): Promise<void> {
    this.log('info', `User ${data.userId} logged in at ${data.timestamp}`);
    
    // Update user activity
    await this.setStorage(`user_${data.userId}_last_login`, data.timestamp);
    
    // Send welcome notification
    await this.notify('Welcome Back!', 'You have successfully logged in', 'info');
  }

  private async onUserLogout(data: { userId: string; timestamp: string }): Promise<void> {
    this.log('info', `User ${data.userId} logged out at ${data.timestamp}`);
    
    // Cleanup user-specific data
    await this.cleanupUserSession(data.userId);
  }

  private async onProfileUpdated(data: { userId: string; changes: Record<string, any> }): Promise<void> {
    this.log('info', 'User profile updated:', data.changes);
    
    // React to profile changes
    if (data.changes.theme) {
      await this.updateUserTheme(data.userId, data.changes.theme);
    }
  }
}
```

### Data Events

```typescript
interface DataEvents {
  'data.created': { type: string; id: string; data: any };
  'data.updated': { type: string; id: string; changes: any };
  'data.deleted': { type: string; id: string };
  'data.synced': { type: string; count: number; timestamp: string };
}

// Handling data events
class DataEventHandler {
  constructor(private context: PluginRuntimeContext) {
    this.setupDataEventListeners();
  }

  private setupDataEventListeners(): void {
    this.context.bus.on('data.created', this.onDataCreated.bind(this));
    this.context.bus.on('data.updated', this.onDataUpdated.bind(this));
    this.context.bus.on('data.deleted', this.onDataDeleted.bind(this));
    this.context.bus.on('data.synced', this.onDataSynced.bind(this));
  }

  private async onDataCreated(event: { type: string; id: string; data: any }): Promise<void> {
    if (event.type === 'task') {
      await this.handleTaskCreated(event.id, event.data);
    } else if (event.type === 'note') {
      await this.handleNoteCreated(event.id, event.data);
    }
  }

  private async onDataUpdated(event: { type: string; id: string; changes: any }): Promise<void> {
    // Update local cache
    await this.updateLocalCache(event.type, event.id, event.changes);
    
    // Trigger dependent updates
    await this.triggerDependentUpdates(event.type, event.id);
  }

  private async onDataDeleted(event: { type: string; id: string }): Promise<void> {
    // Remove from local cache
    await this.removeFromCache(event.type, event.id);
    
    // Cleanup related data
    await this.cleanupRelatedData(event.type, event.id);
  }
}
```

### System Events

```typescript
interface SystemEvents {
  'system.startup': { timestamp: string; version: string };
  'system.shutdown': { timestamp: string };
  'system.error': { error: string; timestamp: string; context?: any };
  'system.maintenance.start': { timestamp: string; duration?: number };
  'system.maintenance.end': { timestamp: string };
}

// System event monitoring
export default class SystemMonitorPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    context.bus.on('system.startup', this.onSystemStartup.bind(this));
    context.bus.on('system.error', this.onSystemError.bind(this));
    context.bus.on('system.maintenance.start', this.onMaintenanceStart.bind(this));
  }

  private async onSystemStartup(data: { timestamp: string; version: string }): Promise<void> {
    this.log('info', `System started at ${data.timestamp}, version ${data.version}`);
    
    // Perform startup tasks
    await this.performStartupTasks();
  }

  private async onSystemError(data: { error: string; timestamp: string; context?: any }): Promise<void> {
    this.log('error', 'System error detected:', data);
    
    // Report critical errors
    if (this.isCriticalError(data.error)) {
      await this.reportCriticalError(data);
    }
  }

  private async onMaintenanceStart(data: { timestamp: string; duration?: number }): Promise<void> {
    this.log('warn', 'System maintenance started');
    
    // Prepare for maintenance mode
    await this.enterMaintenanceMode();
  }
}
```

## Custom Events

### Emitting Custom Events

```typescript
export default class CustomEventPlugin extends BasePlugin {
  async performAction(): Promise<void> {
    try {
      // Perform some action
      const result = await this.doSomething();
      
      // Emit success event
      this.context.bus.emit('myplugin.action.completed', {
        timestamp: new Date().toISOString(),
        result,
        duration: Date.now() - startTime
      });
      
    } catch (error) {
      // Emit error event
      this.context.bus.emit('myplugin.action.failed', {
        timestamp: new Date().toISOString(),
        error: error.message,
        context: { action: 'performAction' }
      });
    }
  }

  async processData(data: any[]): Promise<void> {
    // Emit processing start event
    this.context.bus.emit('myplugin.processing.started', {
      itemCount: data.length,
      timestamp: new Date().toISOString()
    });

    for (let i = 0; i < data.length; i++) {
      await this.processItem(data[i]);
      
      // Emit progress event
      this.context.bus.emit('myplugin.processing.progress', {
        current: i + 1,
        total: data.length,
        percentage: Math.round(((i + 1) / data.length) * 100)
      });
    }

    // Emit completion event
    this.context.bus.emit('myplugin.processing.completed', {
      itemCount: data.length,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Event Namespacing

```typescript
class EventNamespace {
  constructor(
    private bus: EventBus,
    private namespace: string
  ) {}

  emit(event: string, data: any): void {
    this.bus.emit(`${this.namespace}.${event}`, data);
  }

  on(event: string, handler: (data: any) => void): () => void {
    return this.bus.on(`${this.namespace}.${event}`, handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.bus.off(`${this.namespace}.${event}`, handler);
  }
}

// Usage
export default class NamespacedPlugin extends BasePlugin {
  private events: EventNamespace;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.events = new EventNamespace(context.bus, 'weather-plugin');
    
    // Listen to namespaced events
    this.events.on('data.updated', this.handleWeatherUpdate.bind(this));
    this.events.on('forecast.requested', this.handleForecastRequest.bind(this));
  }

  async updateWeatherData(data: any): Promise<void> {
    // Emit namespaced event
    this.events.emit('data.updated', {
      location: data.location,
      temperature: data.temperature,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Event Patterns

### Request-Response Pattern

```typescript
class RequestResponseHandler {
  private pendingRequests = new Map<string, {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(private bus: EventBus) {
    this.bus.on('response', this.handleResponse.bind(this));
  }

  async request(type: string, data: any, timeoutMs: number = 5000): Promise<any> {
    const requestId = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.bus.emit('request', {
        id: requestId,
        type,
        data,
        timestamp: new Date().toISOString()
      });
    });
  }

  private handleResponse(response: { id: string; data?: any; error?: string }): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error));
    } else {
      pending.resolve(response.data);
    }
  }

  // Handle incoming requests
  handleRequest(handler: (type: string, data: any) => Promise<any>): void {
    this.bus.on('request', async (request: { id: string; type: string; data: any }) => {
      try {
        const result = await handler(request.type, request.data);
        
        this.bus.emit('response', {
          id: request.id,
          data: result
        });
      } catch (error) {
        this.bus.emit('response', {
          id: request.id,
          error: error.message
        });
      }
    });
  }
}
```

### Pub-Sub Pattern

```typescript
class PubSubManager {
  private subscribers = new Map<string, Set<(data: any) => void>>();

  constructor(private bus: EventBus) {}

  subscribe(topic: string, handler: (data: any) => void): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
      
      // Set up bus listener for this topic
      this.bus.on(`pubsub.${topic}`, (data) => {
        const handlers = this.subscribers.get(topic);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in subscriber for topic ${topic}:`, error);
            }
          });
        }
      });
    }

    this.subscribers.get(topic)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(topic);
        }
      }
    };
  }

  publish(topic: string, data: any): void {
    this.bus.emit(`pubsub.${topic}`, data);
  }

  getTopics(): string[] {
    return Array.from(this.subscribers.keys());
  }

  getSubscriberCount(topic: string): number {
    return this.subscribers.get(topic)?.size || 0;
  }
}

// Usage
const pubsub = new PubSubManager(context.bus);

// Subscribe to topics
const unsubscribe1 = pubsub.subscribe('weather.updates', (data) => {
  console.log('Weather update:', data);
});

const unsubscribe2 = pubsub.subscribe('tasks.created', (data) => {
  console.log('New task:', data);
});

// Publish to topics
pubsub.publish('weather.updates', {
  location: 'New York',
  temperature: 22,
  condition: 'sunny'
});
```

### Event Aggregation

```typescript
class EventAggregator {
  private aggregatedEvents = new Map<string, any[]>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private bus: EventBus,
    private flushInterval: number = 1000
  ) {}

  aggregate(eventPattern: string, aggregateEvent: string): void {
    this.bus.on(eventPattern, (data) => {
      this.addToAggregate(aggregateEvent, data);
    });
  }

  private addToAggregate(aggregateEvent: string, data: any): void {
    if (!this.aggregatedEvents.has(aggregateEvent)) {
      this.aggregatedEvents.set(aggregateEvent, []);
    }

    this.aggregatedEvents.get(aggregateEvent)!.push({
      ...data,
      timestamp: new Date().toISOString()
    });

    // Set up flush timer
    if (!this.timers.has(aggregateEvent)) {
      const timer = setTimeout(() => {
        this.flushAggregate(aggregateEvent);
      }, this.flushInterval);
      
      this.timers.set(aggregateEvent, timer);
    }
  }

  private flushAggregate(aggregateEvent: string): void {
    const events = this.aggregatedEvents.get(aggregateEvent) || [];
    
    if (events.length > 0) {
      this.bus.emit(aggregateEvent, {
        events,
        count: events.length,
        timespan: {
          start: events[0].timestamp,
          end: events[events.length - 1].timestamp
        }
      });
    }

    // Clear aggregated events and timer
    this.aggregatedEvents.delete(aggregateEvent);
    const timer = this.timers.get(aggregateEvent);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(aggregateEvent);
    }
  }
}

// Usage
const aggregator = new EventAggregator(context.bus, 5000); // 5 second intervals

// Aggregate multiple user actions into batches
aggregator.aggregate('user.action.*', 'user.actions.batch');

// Listen for aggregated events
context.bus.on('user.actions.batch', (data) => {
  console.log(`Processed ${data.count} user actions in batch`);
  // Process batch of actions
});
```

## Performance Considerations

### Event Throttling

```typescript
class EventThrottler {
  private lastEmit = new Map<string, number>();
  private pending = new Map<string, NodeJS.Timeout>();

  constructor(private bus: EventBus) {}

  throttle(event: string, data: any, intervalMs: number = 1000): void {
    const now = Date.now();
    const lastTime = this.lastEmit.get(event) || 0;

    if (now - lastTime >= intervalMs) {
      // Emit immediately
      this.bus.emit(event, data);
      this.lastEmit.set(event, now);
      
      // Clear any pending emission
      const pendingTimer = this.pending.get(event);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        this.pending.delete(event);
      }
    } else {
      // Schedule emission
      const pendingTimer = this.pending.get(event);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
      }

      const delay = intervalMs - (now - lastTime);
      const timer = setTimeout(() => {
        this.bus.emit(event, data);
        this.lastEmit.set(event, Date.now());
        this.pending.delete(event);
      }, delay);

      this.pending.set(event, timer);
    }
  }
}
```

### Event Debouncing

```typescript
class EventDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(private bus: EventBus) {}

  debounce(event: string, data: any, delayMs: number = 300): void {
    // Clear existing timer
    const existingTimer = this.timers.get(event);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.bus.emit(event, data);
      this.timers.delete(event);
    }, delayMs);

    this.timers.set(event, timer);
  }

  cancel(event: string): void {
    const timer = this.timers.get(event);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(event);
    }
  }
}
```

### Memory Management

```typescript
class EventMemoryManager {
  private listenerCounts = new Map<string, number>();
  private maxListeners = 100;

  constructor(private bus: EventBus) {}

  addListener(event: string, handler: (data: any) => void): () => void {
    const currentCount = this.listenerCounts.get(event) || 0;
    
    if (currentCount >= this.maxListeners) {
      console.warn(`Maximum listeners (${this.maxListeners}) reached for event: ${event}`);
    }

    this.listenerCounts.set(event, currentCount + 1);

    const unsubscribe = this.bus.on(event, handler);

    return () => {
      unsubscribe();
      const newCount = (this.listenerCounts.get(event) || 1) - 1;
      if (newCount <= 0) {
        this.listenerCounts.delete(event);
      } else {
        this.listenerCounts.set(event, newCount);
      }
    };
  }

  getListenerCount(event: string): number {
    return this.listenerCounts.get(event) || 0;
  }

  getAllListenerCounts(): Record<string, number> {
    return Object.fromEntries(this.listenerCounts);
  }
}
```

## Best Practices

### Event Design
1. **Use Clear Names**: Event names should be descriptive and follow a consistent pattern
2. **Include Context**: Always include relevant context data in events
3. **Version Events**: Consider versioning for breaking changes
4. **Namespace Events**: Use namespaces to avoid conflicts

### Performance
1. **Throttle High-Frequency Events**: Use throttling for events that fire frequently
2. **Debounce User Actions**: Debounce rapid user input events
3. **Limit Listeners**: Monitor and limit the number of event listeners
4. **Clean Up**: Always remove event listeners when no longer needed

### Error Handling
1. **Handle Errors Gracefully**: Event handlers should not throw unhandled errors
2. **Log Failures**: Log when event handling fails
3. **Provide Fallbacks**: Have fallback mechanisms for critical events
4. **Validate Data**: Validate event data before processing

### Security
1. **Sanitize Data**: Sanitize event data to prevent injection attacks
2. **Validate Sources**: Verify event sources when security is important
3. **Rate Limiting**: Implement rate limiting for event emissions
4. **Access Control**: Control which plugins can emit/listen to sensitive events

---

**Next**: [Qirvo Integration APIs](./qirvo-apis.md) for platform integration documentation.
