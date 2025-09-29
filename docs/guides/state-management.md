# State Management Guide

This guide covers comprehensive state management strategies for Qirvo plugins, including local state, persistent storage, shared state, and reactive patterns.

## Table of Contents

- [State Management Overview](#state-management-overview)
- [Local State Management](#local-state-management)
- [Persistent Storage](#persistent-storage)
- [Shared State Patterns](#shared-state-patterns)
- [Reactive State Management](#reactive-state-management)
- [State Synchronization](#state-synchronization)

## State Management Overview

### Types of State in Qirvo Plugins

```typescript
// Different types of state in plugins
interface PluginState {
  // Ephemeral state (lost on reload)
  ui: {
    isLoading: boolean;
    selectedTab: string;
    formData: any;
  };
  
  // Persistent state (survives reload)
  settings: {
    theme: 'light' | 'dark';
    refreshInterval: number;
    notifications: boolean;
  };
  
  // Cached data (can be regenerated)
  cache: {
    weatherData: WeatherData;
    lastFetch: Date;
  };
  
  // User data (critical to preserve)
  userData: {
    preferences: UserPreferences;
    history: ActionHistory[];
  };
}
```

### State Management Principles

1. **Separation of Concerns** - Different types of state should be managed differently
2. **Predictable Updates** - State changes should be explicit and traceable
3. **Minimal State** - Keep only necessary state, derive everything else
4. **Immutable Updates** - Avoid direct mutations, use immutable patterns
5. **Error Boundaries** - Handle state corruption gracefully

## Local State Management

### React State Patterns

```typescript
// Custom hook for local state management
export function usePluginState<T>(
  initialState: T,
  options?: StateOptions
): [T, (updater: T | ((prev: T) => T)) => void, StateActions<T>] {
  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<T[]>([initialState]);
  
  const updateState = useCallback((updater: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newState = typeof updater === 'function' 
        ? (updater as (prev: T) => T)(prevState)
        : updater;
      
      // Add to history if enabled
      if (options?.enableHistory) {
        setHistory(prev => [...prev.slice(-9), newState]); // Keep last 10 states
      }
      
      // Validate state if validator provided
      if (options?.validator && !options.validator(newState)) {
        console.warn('State validation failed, reverting to previous state');
        return prevState;
      }
      
      return newState;
    });
  }, [options]);

  const actions: StateActions<T> = {
    reset: () => updateState(initialState),
    undo: () => {
      if (history.length > 1) {
        const previousState = history[history.length - 2];
        setHistory(prev => prev.slice(0, -1));
        setState(previousState);
      }
    },
    canUndo: history.length > 1
  };

  return [state, updateState, actions];
}

interface StateOptions {
  enableHistory?: boolean;
  validator?: (state: any) => boolean;
}

interface StateActions<T> {
  reset: () => void;
  undo: () => void;
  canUndo: boolean;
}
```

### Component State Management

```typescript
// Weather widget with proper state management
export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ config }) => {
  // UI state
  const [uiState, setUiState, uiActions] = usePluginState({
    isLoading: false,
    selectedView: 'current' as 'current' | 'forecast',
    error: null as string | null
  });

  // Data state
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  
  // Derived state
  const displayData = useMemo(() => {
    if (!weatherData) return null;
    
    return {
      ...weatherData,
      formattedTemp: `${Math.round(weatherData.temperature)}°${config.units === 'imperial' ? 'F' : 'C'}`,
      isStale: Date.now() - weatherData.lastUpdated > 300000 // 5 minutes
    };
  }, [weatherData, config.units]);

  // State update handlers
  const handleRefresh = useCallback(async () => {
    setUiState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const data = await fetchWeatherData(config.location);
      setWeatherData(data);
    } catch (error) {
      setUiState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch weather data'
      }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  }, [config.location]);

  // Effect for automatic refresh
  useEffect(() => {
    const interval = setInterval(handleRefresh, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [handleRefresh, config.refreshInterval]);

  return (
    <div className="weather-widget">
      {uiState.error && (
        <ErrorBanner 
          message={uiState.error} 
          onRetry={handleRefresh}
          onDismiss={() => setUiState(prev => ({ ...prev, error: null }))}
        />
      )}
      
      <WeatherDisplay 
        data={displayData}
        loading={uiState.isLoading}
        view={uiState.selectedView}
        onViewChange={(view) => setUiState(prev => ({ ...prev, selectedView: view }))}
        onRefresh={handleRefresh}
      />
    </div>
  );
};
```

## Persistent Storage

### Storage Service Integration

```typescript
// Persistent state manager using Qirvo storage API
export class PersistentStateManager<T> {
  private storageKey: string;
  private defaultState: T;
  private storage: StorageAPI;
  private listeners: Set<(state: T) => void> = new Set();

  constructor(
    storageKey: string,
    defaultState: T,
    storage: StorageAPI
  ) {
    this.storageKey = storageKey;
    this.defaultState = defaultState;
    this.storage = storage;
  }

  async getState(): Promise<T> {
    try {
      const stored = await this.storage.get(this.storageKey);
      return stored ? { ...this.defaultState, ...stored } : this.defaultState;
    } catch (error) {
      console.warn('Failed to load state from storage:', error);
      return this.defaultState;
    }
  }

  async setState(updater: Partial<T> | ((prev: T) => T)): Promise<void> {
    const currentState = await this.getState();
    
    const newState = typeof updater === 'function'
      ? updater(currentState)
      : { ...currentState, ...updater };

    try {
      await this.storage.set(this.storageKey, newState);
      this.notifyListeners(newState);
    } catch (error) {
      console.error('Failed to save state to storage:', error);
      throw error;
    }
  }

  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(state: T): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }

  async clearState(): Promise<void> {
    await this.storage.delete(this.storageKey);
    this.notifyListeners(this.defaultState);
  }
}
```

### React Hook for Persistent State

```typescript
// Hook for persistent state management
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  storage: StorageAPI
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [state, setState] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const managerRef = useRef<PersistentStateManager<T>>();

  // Initialize manager
  useEffect(() => {
    managerRef.current = new PersistentStateManager(key, defaultValue, storage);
    
    // Load initial state
    managerRef.current.getState().then(loadedState => {
      setState(loadedState);
      setIsLoading(false);
    });

    // Subscribe to changes
    const unsubscribe = managerRef.current.subscribe(setState);
    return unsubscribe;
  }, [key, defaultValue, storage]);

  const updateState = useCallback(async (updater: T | ((prev: T) => T)) => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.setState(updater);
    } catch (error) {
      console.error('Failed to update persistent state:', error);
    }
  }, []);

  return [state, updateState, isLoading];
}
```

## Shared State Patterns

### Plugin State Context

```typescript
// Context for sharing state across plugin components
interface PluginContextState {
  config: PluginConfig;
  user: UserInfo;
  theme: ThemeConfig;
  notifications: NotificationState[];
}

const PluginStateContext = createContext<{
  state: PluginContextState;
  actions: PluginActions;
} | null>(null);

export const PluginStateProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [state, setState] = useState<PluginContextState>(() => ({
    config: getDefaultConfig(),
    user: getCurrentUser(),
    theme: getThemeConfig(),
    notifications: []
  }));

  const actions: PluginActions = {
    updateConfig: (config) => setState(prev => ({ ...prev, config })),
    addNotification: (notification) => setState(prev => ({
      ...prev,
      notifications: [...prev.notifications, notification]
    })),
    removeNotification: (id) => setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    })),
    setTheme: (theme) => setState(prev => ({ ...prev, theme }))
  };

  return (
    <PluginStateContext.Provider value={{ state, actions }}>
      {children}
    </PluginStateContext.Provider>
  );
};

export const usePluginContext = () => {
  const context = useContext(PluginStateContext);
  if (!context) {
    throw new Error('usePluginContext must be used within PluginStateProvider');
  }
  return context;
};
```

### Event-Driven State Updates

```typescript
// Event-driven state synchronization
export class StateEventManager {
  private eventBus: EventEmitter;
  private stateManagers: Map<string, PersistentStateManager<any>> = new Map();

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  registerStateManager<T>(key: string, manager: PersistentStateManager<T>): void {
    this.stateManagers.set(key, manager);
    
    // Subscribe to state changes and emit events
    manager.subscribe((state) => {
      this.eventBus.emit(`state:${key}:changed`, state);
    });
  }

  private setupEventHandlers(): void {
    // Handle external state updates
    this.eventBus.on('external:config:updated', async (config) => {
      const configManager = this.stateManagers.get('config');
      if (configManager) {
        await configManager.setState(config);
      }
    });

    // Handle user preference changes
    this.eventBus.on('user:preferences:changed', async (preferences) => {
      const userManager = this.stateManagers.get('user');
      if (userManager) {
        await userManager.setState((prev) => ({
          ...prev,
          preferences
        }));
      }
    });

    // Handle theme changes
    this.eventBus.on('theme:changed', async (theme) => {
      const themeManager = this.stateManagers.get('theme');
      if (themeManager) {
        await themeManager.setState(theme);
      }
    });
  }

  async broadcastStateChange<T>(key: string, state: T): Promise<void> {
    this.eventBus.emit(`state:${key}:changed`, state);
  }
}
```

## Reactive State Management

### Observable State Pattern

```typescript
// Observable state for reactive updates
export class ObservableState<T> {
  private _value: T;
  private observers: Set<(value: T) => void> = new Set();
  private computedCache: Map<string, any> = new Map();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  set(newValue: T): void {
    if (this._value !== newValue) {
      this._value = newValue;
      this.clearComputedCache();
      this.notifyObservers();
    }
  }

  update(updater: (prev: T) => T): void {
    this.set(updater(this._value));
  }

  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  computed<R>(key: string, compute: (value: T) => R): R {
    if (!this.computedCache.has(key)) {
      this.computedCache.set(key, compute(this._value));
    }
    return this.computedCache.get(key);
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => observer(this._value));
  }

  private clearComputedCache(): void {
    this.computedCache.clear();
  }
}

// React hook for observable state
export function useObservableState<T>(observable: ObservableState<T>): T {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsubscribe = observable.subscribe(() => forceUpdate());
    return unsubscribe;
  }, [observable]);

  return observable.value;
}
```

### State Machine Pattern

```typescript
// State machine for complex state transitions
interface StateMachine<S, E> {
  currentState: S;
  transition(event: E): S;
  canTransition(event: E): boolean;
}

export class PluginStateMachine implements StateMachine<PluginState, PluginEvent> {
  currentState: PluginState;
  private transitions: Map<string, (event: PluginEvent) => PluginState>;
  private listeners: Set<(state: PluginState, event: PluginEvent) => void> = new Set();

  constructor(initialState: PluginState) {
    this.currentState = initialState;
    this.transitions = new Map();
    this.setupTransitions();
  }

  private setupTransitions(): void {
    // Define valid state transitions
    this.transitions.set('idle->loading', (event) => {
      if (event.type === 'FETCH_DATA') {
        return { ...this.currentState, status: 'loading', error: null };
      }
      return this.currentState;
    });

    this.transitions.set('loading->success', (event) => {
      if (event.type === 'DATA_RECEIVED') {
        return { 
          ...this.currentState, 
          status: 'success', 
          data: event.payload,
          lastUpdated: Date.now()
        };
      }
      return this.currentState;
    });

    this.transitions.set('loading->error', (event) => {
      if (event.type === 'ERROR_OCCURRED') {
        return { 
          ...this.currentState, 
          status: 'error', 
          error: event.error 
        };
      }
      return this.currentState;
    });
  }

  transition(event: PluginEvent): PluginState {
    const transitionKey = `${this.currentState.status}->${this.getTargetState(event)}`;
    const transition = this.transitions.get(transitionKey);

    if (transition) {
      const newState = transition(event);
      this.currentState = newState;
      this.notifyListeners(newState, event);
      return newState;
    }

    console.warn(`Invalid transition: ${transitionKey}`);
    return this.currentState;
  }

  canTransition(event: PluginEvent): boolean {
    const transitionKey = `${this.currentState.status}->${this.getTargetState(event)}`;
    return this.transitions.has(transitionKey);
  }

  subscribe(listener: (state: PluginState, event: PluginEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private getTargetState(event: PluginEvent): string {
    switch (event.type) {
      case 'FETCH_DATA': return 'loading';
      case 'DATA_RECEIVED': return 'success';
      case 'ERROR_OCCURRED': return 'error';
      case 'RESET': return 'idle';
      default: return this.currentState.status;
    }
  }

  private notifyListeners(state: PluginState, event: PluginEvent): void {
    this.listeners.forEach(listener => listener(state, event));
  }
}

type PluginState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
  lastUpdated?: number;
};

type PluginEvent = 
  | { type: 'FETCH_DATA' }
  | { type: 'DATA_RECEIVED'; payload: any }
  | { type: 'ERROR_OCCURRED'; error: string }
  | { type: 'RESET' };
```

## State Synchronization

### Multi-Instance Synchronization

```typescript
// Synchronize state across multiple plugin instances
export class StateSync {
  private broadcastChannel: BroadcastChannel;
  private stateManagers: Map<string, PersistentStateManager<any>> = new Map();
  private syncEnabled: boolean = true;

  constructor(channelName: string) {
    this.broadcastChannel = new BroadcastChannel(channelName);
    this.setupMessageHandler();
  }

  registerStateManager<T>(key: string, manager: PersistentStateManager<T>): void {
    this.stateManagers.set(key, manager);
    
    // Subscribe to local state changes and broadcast
    manager.subscribe((state) => {
      if (this.syncEnabled) {
        this.broadcastStateChange(key, state);
      }
    });
  }

  private setupMessageHandler(): void {
    this.broadcastChannel.addEventListener('message', async (event) => {
      const { type, key, state } = event.data;
      
      if (type === 'state-change') {
        const manager = this.stateManagers.get(key);
        if (manager) {
          // Temporarily disable sync to prevent infinite loop
          this.syncEnabled = false;
          await manager.setState(state);
          this.syncEnabled = true;
        }
      }
    });
  }

  private broadcastStateChange(key: string, state: any): void {
    this.broadcastChannel.postMessage({
      type: 'state-change',
      key,
      state,
      timestamp: Date.now()
    });
  }

  destroy(): void {
    this.broadcastChannel.close();
  }
}
```

This comprehensive state management guide provides all the tools and patterns needed to effectively manage state in Qirvo plugins, from simple local state to complex distributed state synchronization.

---

**Next**: [Error Handling Guide](./error-handling.md)
