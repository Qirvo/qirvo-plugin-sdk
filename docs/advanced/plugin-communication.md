# Plugin Communication

This guide covers inter-plugin communication patterns, event systems, message passing, and data sharing between Qirvo plugins.

## Table of Contents

- [Communication Architecture](#communication-architecture)
- [Event-Based Communication](#event-based-communication)
- [Message Passing](#message-passing)
- [Shared Data Stores](#shared-data-stores)
- [Plugin Discovery](#plugin-discovery)
- [Security Considerations](#security-considerations)

## Communication Architecture

### Communication Hub

```typescript
// Central communication hub for plugin interactions
export class PluginCommunicationHub {
  private plugins: Map<string, PluginInstance> = new Map();
  private eventBus: EventBus;
  private messageRouter: MessageRouter;
  private dataStore: SharedDataStore;
  private security: CommunicationSecurity;
  
  constructor() {
    this.eventBus = new EventBus();
    this.messageRouter = new MessageRouter();
    this.dataStore = new SharedDataStore();
    this.security = new CommunicationSecurity();
    this.setupCommunicationChannels();
  }
  
  registerPlugin(plugin: PluginInstance): void {
    this.plugins.set(plugin.id, plugin);
    
    // Setup plugin communication channels
    this.setupPluginChannels(plugin);
    
    // Notify other plugins of new plugin
    this.eventBus.emit('plugin:registered', {
      pluginId: plugin.id,
      capabilities: plugin.getCapabilities()
    });
  }
  
  private setupPluginChannels(plugin: PluginInstance): void {
    // Event channel
    plugin.events.onAny((event, data) => {
      this.handlePluginEvent(plugin.id, event, data);
    });
    
    // Message channel
    plugin.onMessage((message) => {
      this.messageRouter.route(message);
    });
    
    // Data channel
    plugin.onDataRequest((request) => {
      return this.handleDataRequest(plugin.id, request);
    });
  }
  
  async sendMessage(
    fromPlugin: string,
    toPlugin: string,
    message: PluginMessage
  ): Promise<MessageResponse> {
    // Security check
    const canSend = await this.security.canSendMessage(fromPlugin, toPlugin, message);
    if (!canSend) {
      throw new Error('Message sending not permitted');
    }
    
    // Route message
    return this.messageRouter.send(fromPlugin, toPlugin, message);
  }
  
  broadcast(
    fromPlugin: string,
    event: string,
    data: any,
    filter?: PluginFilter
  ): void {
    const targetPlugins = filter 
      ? this.filterPlugins(filter)
      : Array.from(this.plugins.values());
    
    targetPlugins.forEach(plugin => {
      if (plugin.id !== fromPlugin) {
        plugin.receiveEvent(event, data, fromPlugin);
      }
    });
  }
}

interface PluginMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  requiresResponse: boolean;
}

interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

## Event-Based Communication

### Event System

```typescript
// Advanced event system for plugin communication
export class PluginEventSystem {
  private eventBus: EventEmitter;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: EventHistory;
  
  constructor() {
    this.eventBus = new EventEmitter();
    this.eventHistory = new EventHistory();
    this.setupEventHandling();
  }
  
  subscribe(
    pluginId: string,
    eventPattern: string,
    handler: EventHandler,
    options: SubscriptionOptions = {}
  ): string {
    const subscription: EventSubscription = {
      id: generateId(),
      pluginId,
      eventPattern,
      handler,
      options,
      createdAt: new Date()
    };
    
    if (!this.subscriptions.has(pluginId)) {
      this.subscriptions.set(pluginId, []);
    }
    
    this.subscriptions.get(pluginId)!.push(subscription);
    
    // Register with event bus
    this.eventBus.on(eventPattern, (data, context) => {
      this.handleEvent(subscription, data, context);
    });
    
    return subscription.id;
  }
  
  emit(
    pluginId: string,
    event: string,
    data: any,
    options: EmitOptions = {}
  ): void {
    const eventData: PluginEvent = {
      id: generateId(),
      type: event,
      source: pluginId,
      data,
      timestamp: Date.now(),
      ...options
    };
    
    // Store in history
    this.eventHistory.add(eventData);
    
    // Emit event
    this.eventBus.emit(event, data, {
      source: pluginId,
      eventId: eventData.id
    });
  }
  
  // Event replay for new plugins
  replayEvents(
    pluginId: string,
    eventPattern: string,
    since?: Date
  ): void {
    const events = this.eventHistory.getEvents(eventPattern, since);
    
    events.forEach(event => {
      this.eventBus.emit(`replay:${eventPattern}`, event.data, {
        source: event.source,
        eventId: event.id,
        isReplay: true
      });
    });
  }
}

interface EventSubscription {
  id: string;
  pluginId: string;
  eventPattern: string;
  handler: EventHandler;
  options: SubscriptionOptions;
  createdAt: Date;
}

interface SubscriptionOptions {
  once?: boolean;
  filter?: (data: any, context: EventContext) => boolean;
  priority?: number;
  timeout?: number;
}
```

## Message Passing

### Message Router

```typescript
// Message routing system
export class MessageRouter {
  private routes: Map<string, MessageRoute> = new Map();
  private middleware: MessageMiddleware[] = [];
  private messageQueue: MessageQueue;
  
  constructor() {
    this.messageQueue = new MessageQueue();
    this.setupDefaultRoutes();
  }
  
  async send(
    from: string,
    to: string,
    message: PluginMessage
  ): Promise<MessageResponse> {
    // Apply middleware
    for (const middleware of this.middleware) {
      message = await middleware.process(message, { from, to });
    }
    
    // Find route
    const route = this.findRoute(to);
    if (!route) {
      throw new Error(`No route found for plugin: ${to}`);
    }
    
    // Queue message if plugin is busy
    if (route.isBusy()) {
      return this.messageQueue.enqueue(message, route);
    }
    
    // Send message
    return route.deliver(message);
  }
  
  // Request-response pattern
  async request<T>(
    from: string,
    to: string,
    request: RequestMessage
  ): Promise<T> {
    const message: PluginMessage = {
      id: generateId(),
      type: 'request',
      payload: request,
      timestamp: Date.now(),
      priority: 'normal',
      requiresResponse: true
    };
    
    const response = await this.send(from, to, message);
    
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    
    return response.data;
  }
  
  // Publish-subscribe pattern
  publish(topic: string, data: any, from: string): void {
    const subscribers = this.getTopicSubscribers(topic);
    
    subscribers.forEach(async (subscriber) => {
      try {
        await this.send(from, subscriber.pluginId, {
          id: generateId(),
          type: 'publication',
          payload: { topic, data },
          timestamp: Date.now(),
          priority: 'normal',
          requiresResponse: false
        });
      } catch (error) {
        console.error(`Failed to publish to ${subscriber.pluginId}:`, error);
      }
    });
  }
}
```

## Shared Data Stores

### Data Sharing System

```typescript
// Shared data management
export class SharedDataStore {
  private stores: Map<string, DataStore> = new Map();
  private permissions: Map<string, DataPermissions> = new Map();
  private subscriptions: Map<string, DataSubscription[]> = new Map();
  
  createStore(
    name: string,
    owner: string,
    config: StoreConfig
  ): DataStore {
    const store = new DataStore(name, owner, config);
    this.stores.set(name, store);
    
    // Set default permissions
    this.permissions.set(name, {
      owner,
      read: config.permissions?.read || [owner],
      write: config.permissions?.write || [owner],
      admin: config.permissions?.admin || [owner]
    });
    
    return store;
  }
  
  async get(
    storeName: string,
    key: string,
    requestingPlugin: string
  ): Promise<any> {
    const store = this.stores.get(storeName);
    if (!store) {
      throw new Error(`Store not found: ${storeName}`);
    }
    
    // Check permissions
    if (!this.hasReadPermission(storeName, requestingPlugin)) {
      throw new Error('Read permission denied');
    }
    
    return store.get(key);
  }
  
  async set(
    storeName: string,
    key: string,
    value: any,
    requestingPlugin: string
  ): Promise<void> {
    const store = this.stores.get(storeName);
    if (!store) {
      throw new Error(`Store not found: ${storeName}`);
    }
    
    // Check permissions
    if (!this.hasWritePermission(storeName, requestingPlugin)) {
      throw new Error('Write permission denied');
    }
    
    const oldValue = store.get(key);
    await store.set(key, value);
    
    // Notify subscribers
    this.notifySubscribers(storeName, key, value, oldValue);
  }
  
  subscribe(
    storeName: string,
    keyPattern: string,
    pluginId: string,
    callback: DataChangeCallback
  ): string {
    const subscriptionId = generateId();
    const subscription: DataSubscription = {
      id: subscriptionId,
      storeName,
      keyPattern,
      pluginId,
      callback
    };
    
    if (!this.subscriptions.has(storeName)) {
      this.subscriptions.set(storeName, []);
    }
    
    this.subscriptions.get(storeName)!.push(subscription);
    
    return subscriptionId;
  }
}

interface StoreConfig {
  persistent?: boolean;
  validator?: (key: string, value: any) => Promise<boolean>;
  permissions?: {
    read?: string[];
    write?: string[];
    admin?: string[];
  };
}
```

## Plugin Discovery

### Discovery Service

```typescript
// Plugin discovery and capability matching
export class PluginDiscoveryService {
  private plugins: Map<string, PluginCapabilities> = new Map();
  private categories: Map<string, string[]> = new Map();
  private capabilityIndex: Map<string, string[]> = new Map();
  
  registerPlugin(pluginId: string, capabilities: PluginCapabilities): void {
    this.plugins.set(pluginId, capabilities);
    
    // Index by categories
    capabilities.categories?.forEach(category => {
      if (!this.categories.has(category)) {
        this.categories.set(category, []);
      }
      this.categories.get(category)!.push(pluginId);
    });
    
    // Index by capabilities
    capabilities.provides?.forEach(capability => {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, []);
      }
      this.capabilityIndex.get(capability)!.push(pluginId);
    });
  }
  
  findPlugins(criteria: DiscoveryCriteria): PluginMatch[] {
    const matches: PluginMatch[] = [];
    
    this.plugins.forEach((capabilities, pluginId) => {
      const match = this.evaluateMatch(capabilities, criteria);
      if (match.score > 0) {
        matches.push({
          pluginId,
          capabilities,
          score: match.score,
          reasons: match.reasons
        });
      }
    });
    
    // Sort by match score
    return matches.sort((a, b) => b.score - a.score);
  }
  
  private evaluateMatch(
    capabilities: PluginCapabilities,
    criteria: DiscoveryCriteria
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // Check required capabilities
    if (criteria.requiredCapabilities) {
      const hasAll = criteria.requiredCapabilities.every(cap => 
        capabilities.provides?.includes(cap)
      );
      if (!hasAll) return { score: 0, reasons: ['Missing required capabilities'] };
      
      score += 50;
      reasons.push('Has all required capabilities');
    }
    
    // Check categories
    if (criteria.categories) {
      const matchingCategories = criteria.categories.filter(cat =>
        capabilities.categories?.includes(cat)
      );
      score += matchingCategories.length * 10;
      if (matchingCategories.length > 0) {
        reasons.push(`Matches categories: ${matchingCategories.join(', ')}`);
      }
    }
    
    // Check version compatibility
    if (criteria.version && capabilities.version) {
      if (this.isVersionCompatible(capabilities.version, criteria.version)) {
        score += 20;
        reasons.push('Version compatible');
      }
    }
    
    // Check reliability score
    if (capabilities.reliability && criteria.minReliability) {
      if (capabilities.reliability >= criteria.minReliability) {
        score += Math.floor(capabilities.reliability * 10);
        reasons.push(`High reliability: ${capabilities.reliability}`);
      }
    }
    
    return { score, reasons };
  }
  
  async requestCapability(
    requestingPlugin: string,
    capability: string
  ): Promise<CapabilityProvider[]> {
    const providers = this.findPlugins({
      requiredCapabilities: [capability]
    });
    
    // Filter by permissions and availability
    const availableProviders = await Promise.all(
      providers.map(async (provider) => {
        const canProvide = await this.canProvideCapability(
          provider.pluginId,
          capability,
          requestingPlugin
        );
        
        return canProvide ? {
          pluginId: provider.pluginId,
          capability,
          cost: provider.capabilities.costs?.[capability] || 0,
          reliability: provider.capabilities.reliability || 1.0,
          responseTime: provider.capabilities.responseTime || 100
        } : null;
      })
    );
    
    return availableProviders.filter(Boolean) as CapabilityProvider[];
  }
  
  private async canProvideCapability(
    providerId: string,
    capability: string,
    requesterId: string
  ): Promise<boolean> {
    const provider = this.plugins.get(providerId);
    if (!provider) return false;
    
    // Check if capability is provided
    if (!provider.provides?.includes(capability)) {
      return false;
    }
    
    // Check access permissions
    if (provider.accessControl) {
      const allowed = provider.accessControl.allowedPlugins;
      const denied = provider.accessControl.deniedPlugins;
      
      if (denied?.includes(requesterId)) {
        return false;
      }
      
      if (allowed && !allowed.includes(requesterId)) {
        return false;
      }
    }
    
    return true;
  }
  
  private isVersionCompatible(providerVersion: string, requiredVersion: string): boolean {
    // Simple semantic version compatibility check
    const provider = this.parseVersion(providerVersion);
    const required = this.parseVersion(requiredVersion);
    
    // Major version must match
    if (provider.major !== required.major) {
      return false;
    }
    
    // Provider minor version must be >= required
    return provider.minor >= required.minor;
  }
  
  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }
  
  // Plugin capability advertisement
  advertiseCapability(
    pluginId: string,
    capability: string,
    metadata: CapabilityMetadata
  ): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    
    if (!plugin.provides) {
      plugin.provides = [];
    }
    
    if (!plugin.provides.includes(capability)) {
      plugin.provides.push(capability);
    }
    
    // Update capability metadata
    if (!plugin.capabilityMetadata) {
      plugin.capabilityMetadata = {};
    }
    
    plugin.capabilityMetadata[capability] = metadata;
  }
}

interface PluginCapabilities {
  provides?: string[];
  requires?: string[];
  categories?: string[];
  version?: string;
  reliability?: number;
  responseTime?: number;
  costs?: Record<string, number>;
  metadata?: Record<string, any>;
  accessControl?: {
    allowedPlugins?: string[];
    deniedPlugins?: string[];
  };
  capabilityMetadata?: Record<string, CapabilityMetadata>;
}

interface DiscoveryCriteria {
  requiredCapabilities?: string[];
  categories?: string[];
  version?: string;
  maxCost?: number;
  minReliability?: number;
  maxResponseTime?: number;
}

interface PluginMatch {
  pluginId: string;
  capabilities: PluginCapabilities;
  score: number;
  reasons: string[];
}

interface CapabilityProvider {
  pluginId: string;
  capability: string;
  cost: number;
  reliability: number;
  responseTime: number;
}

interface CapabilityMetadata {
  description: string;
  inputSchema?: any;
  outputSchema?: any;
  examples?: any[];
  documentation?: string;
}
```

## Security Considerations

### Communication Security

```typescript
// Security layer for plugin communication
export class CommunicationSecurity {
  private permissions: Map<string, PluginPermissions> = new Map();
  private trustLevels: Map<string, TrustLevel> = new Map();
  private auditLog: SecurityAuditLog;
  private rateLimiter: RateLimiter;
  
  constructor() {
    this.auditLog = new SecurityAuditLog();
    this.rateLimiter = new RateLimiter();
  }
  
  async canSendMessage(
    from: string,
    to: string,
    message: PluginMessage
  ): Promise<boolean> {
    // Check basic permissions
    const fromPermissions = this.permissions.get(from);
    if (!fromPermissions?.canSendMessages) {
      this.auditLog.log('message_denied', { from, to, reason: 'no_send_permission' });
      return false;
    }
    
    // Check trust levels
    const fromTrust = this.trustLevels.get(from) || TrustLevel.UNTRUSTED;
    const toTrust = this.trustLevels.get(to) || TrustLevel.UNTRUSTED;
    
    if (fromTrust < TrustLevel.BASIC && toTrust >= TrustLevel.TRUSTED) {
      this.auditLog.log('message_denied', { from, to, reason: 'trust_level_mismatch' });
      return false;
    }
    
    // Check rate limits
    if (!this.rateLimiter.checkLimit(from, 'messages', 100, 60000)) { // 100 messages per minute
      this.auditLog.log('message_denied', { from, to, reason: 'rate_limit_exceeded' });
      return false;
    }
    
    // Check message content
    if (!this.validateMessageContent(message)) {
      this.auditLog.log('message_denied', { from, to, reason: 'invalid_content' });
      return false;
    }
    
    // Check recipient permissions
    const toPermissions = this.permissions.get(to);
    if (!toPermissions?.canReceiveMessages) {
      this.auditLog.log('message_denied', { from, to, reason: 'recipient_cannot_receive' });
      return false;
    }
    
    return true;
  }
  
  async canAccessData(
    pluginId: string,
    storeName: string,
    operation: 'read' | 'write'
  ): Promise<boolean> {
    const permissions = this.permissions.get(pluginId);
    if (!permissions) return false;
    
    // Check data access permissions
    const dataPermissions = permissions.dataAccess?.[storeName];
    if (!dataPermissions) return false;
    
    const hasPermission = operation === 'read' 
      ? dataPermissions.read 
      : dataPermissions.write;
    
    if (!hasPermission) {
      this.auditLog.log('data_access_denied', { 
        pluginId, 
        storeName, 
        operation, 
        reason: 'insufficient_permissions' 
      });
      return false;
    }
    
    // Check trust level for sensitive data
    if (dataPermissions.requiresTrust) {
      const trustLevel = this.trustLevels.get(pluginId) || TrustLevel.UNTRUSTED;
      if (trustLevel < TrustLevel.TRUSTED) {
        this.auditLog.log('data_access_denied', { 
          pluginId, 
          storeName, 
          operation, 
          reason: 'insufficient_trust_level' 
        });
        return false;
      }
    }
    
    return true;
  }
  
  private validateMessageContent(message: PluginMessage): boolean {
    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > 1024 * 1024) { // 1MB limit
      return false;
    }
    
    // Check for malicious content
    if (this.containsMaliciousContent(message)) {
      return false;
    }
    
    // Validate message structure
    if (!message.id || !message.type || typeof message.timestamp !== 'number') {
      return false;
    }
    
    return true;
  }
  
  private containsMaliciousContent(message: PluginMessage): boolean {
    const content = JSON.stringify(message);
    
    // Check for script injection attempts
    const scriptPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];
    
    return scriptPatterns.some(pattern => pattern.test(content));
  }
  
  // Plugin trust management
  setTrustLevel(pluginId: string, level: TrustLevel): void {
    this.trustLevels.set(pluginId, level);
    this.auditLog.log('trust_level_changed', { pluginId, level });
  }
  
  getTrustLevel(pluginId: string): TrustLevel {
    return this.trustLevels.get(pluginId) || TrustLevel.UNTRUSTED;
  }
  
  // Permission management
  setPermissions(pluginId: string, permissions: PluginPermissions): void {
    this.permissions.set(pluginId, permissions);
    this.auditLog.log('permissions_updated', { pluginId, permissions });
  }
  
  // Security monitoring
  async detectAnomalousActivity(pluginId: string): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Check message frequency
    const messageRate = this.rateLimiter.getCurrentRate(pluginId, 'messages');
    if (messageRate > 50) { // More than 50 messages per minute
      alerts.push({
        type: 'high_message_rate',
        severity: 'medium',
        pluginId,
        details: `High message rate: ${messageRate} messages/minute`
      });
    }
    
    // Check data access patterns
    const dataAccessRate = this.rateLimiter.getCurrentRate(pluginId, 'data_access');
    if (dataAccessRate > 100) { // More than 100 data accesses per minute
      alerts.push({
        type: 'high_data_access_rate',
        severity: 'medium',
        pluginId,
        details: `High data access rate: ${dataAccessRate} accesses/minute`
      });
    }
    
    return alerts;
  }
}

// Rate limiting system
export class RateLimiter {
  private limits: Map<string, Map<string, RateLimit>> = new Map();
  
  checkLimit(
    pluginId: string,
    operation: string,
    maxRequests: number,
    windowMs: number
  ): boolean {
    if (!this.limits.has(pluginId)) {
      this.limits.set(pluginId, new Map());
    }
    
    const pluginLimits = this.limits.get(pluginId)!;
    const now = Date.now();
    
    if (!pluginLimits.has(operation)) {
      pluginLimits.set(operation, {
        requests: 1,
        windowStart: now,
        maxRequests,
        windowMs
      });
      return true;
    }
    
    const limit = pluginLimits.get(operation)!;
    
    // Reset window if expired
    if (now - limit.windowStart > limit.windowMs) {
      limit.requests = 1;
      limit.windowStart = now;
      return true;
    }
    
    // Check if under limit
    if (limit.requests < maxRequests) {
      limit.requests++;
      return true;
    }
    
    return false;
  }
  
  getCurrentRate(pluginId: string, operation: string): number {
    const pluginLimits = this.limits.get(pluginId);
    if (!pluginLimits) return 0;
    
    const limit = pluginLimits.get(operation);
    if (!limit) return 0;
    
    const elapsed = Date.now() - limit.windowStart;
    const minutes = elapsed / 60000;
    
    return minutes > 0 ? limit.requests / minutes : 0;
  }
}

// Security audit logging
export class SecurityAuditLog {
  private logs: SecurityLogEntry[] = [];
  private maxLogs = 10000;
  
  log(event: string, details: any): void {
    const entry: SecurityLogEntry = {
      timestamp: Date.now(),
      event,
      details,
      id: this.generateLogId()
    };
    
    this.logs.push(entry);
    
    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Send to external logging service if configured
    this.sendToExternalLogger(entry);
  }
  
  private generateLogId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private sendToExternalLogger(entry: SecurityLogEntry): void {
    // Implementation for external logging service
    // This could send to services like Splunk, ELK stack, etc.
  }
  
  getRecentLogs(limit: number = 100): SecurityLogEntry[] {
    return this.logs.slice(-limit);
  }
  
  searchLogs(criteria: LogSearchCriteria): SecurityLogEntry[] {
    return this.logs.filter(log => {
      if (criteria.event && log.event !== criteria.event) {
        return false;
      }
      
      if (criteria.pluginId && log.details.pluginId !== criteria.pluginId) {
        return false;
      }
      
      if (criteria.since && log.timestamp < criteria.since) {
        return false;
      }
      
      if (criteria.until && log.timestamp > criteria.until) {
        return false;
      }
      
      return true;
    });
  }
}

enum TrustLevel {
  UNTRUSTED = 0,
  BASIC = 1,
  TRUSTED = 2,
  VERIFIED = 3
}

interface PluginPermissions {
  canSendMessages: boolean;
  canReceiveMessages: boolean;
  dataAccess?: Record<string, {
    read: boolean;
    write: boolean;
    requiresTrust?: boolean;
  }>;
  networkAccess?: boolean;
  fileSystemAccess?: boolean;
}

interface SecurityAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  pluginId: string;
  details: string;
}

interface RateLimit {
  requests: number;
  windowStart: number;
  maxRequests: number;
  windowMs: number;
}

interface SecurityLogEntry {
  id: string;
  timestamp: number;
  event: string;
  details: any;
}

interface LogSearchCriteria {
  event?: string;
  pluginId?: string;
  since?: number;
  until?: number;
}
```

This comprehensive plugin communication system provides secure, scalable inter-plugin communication with discovery services, security controls, and audit logging capabilities.

---

**Next**: [Marketplace Integration](./marketplace-integration.md)
