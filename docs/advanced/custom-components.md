# Custom Components

This guide covers building custom UI components for Qirvo plugins, including component architecture, styling systems, state management, and advanced patterns.

## Table of Contents

- [Component Architecture](#component-architecture)
- [Styling Systems](#styling-systems)
- [Component State Management](#component-state-management)
- [Advanced Patterns](#advanced-patterns)
- [Component Testing](#component-testing)
- [Performance Optimization](#performance-optimization)

## Component Architecture

### Base Component System

```typescript
// Base component architecture for Qirvo plugins
export abstract class QirvoComponent<P = {}, S = {}> extends React.Component<P, S> {
  protected context: PluginContext;
  protected theme: ThemeProvider;
  protected eventBus: ComponentEventBus;
  
  constructor(props: P, context: PluginContext) {
    super(props);
    this.context = context;
    this.theme = context.theme;
    this.eventBus = new ComponentEventBus();
    this.setupComponent();
  }
  
  protected setupComponent(): void {
    // Setup component lifecycle hooks
    this.setupLifecycleHooks();
    
    // Setup error boundaries
    this.setupErrorHandling();
    
    // Setup accessibility
    this.setupAccessibility();
  }
  
  protected setupLifecycleHooks(): void {
    // Component mount hook
    this.eventBus.on('component:mount', () => {
      this.onComponentMount();
    });
    
    // Component update hook
    this.eventBus.on('component:update', (prevProps, prevState) => {
      this.onComponentUpdate(prevProps, prevState);
    });
    
    // Component unmount hook
    this.eventBus.on('component:unmount', () => {
      this.onComponentUnmount();
    });
  }
  
  // Abstract methods for component implementation
  abstract render(): React.ReactNode;
  
  // Optional lifecycle methods
  protected onComponentMount(): void {}
  protected onComponentUpdate(prevProps: P, prevState: S): void {}
  protected onComponentUnmount(): void {}
  
  // Utility methods
  protected emitEvent(event: string, data?: any): void {
    this.context.events.emit(`component:${event}`, {
      componentId: this.constructor.name,
      data
    });
  }
  
  protected subscribeToPluginEvents(events: string[]): void {
    events.forEach(event => {
      this.context.events.on(event, this.handlePluginEvent.bind(this));
    });
  }
  
  protected handlePluginEvent(event: PluginEvent): void {
    // Override in subclasses to handle specific events
  }
}

// Functional component base with hooks
export function createQirvoComponent<P = {}>(
  name: string,
  component: React.FC<P & QirvoComponentProps>
): React.FC<P> {
  const QirvoWrappedComponent: React.FC<P> = (props) => {
    const context = usePluginContext();
    const theme = useTheme();
    const [componentState, setComponentState] = useComponentState(name);
    
    // Component lifecycle hooks
    useEffect(() => {
      context.events.emit('component:mount', { name });
      return () => {
        context.events.emit('component:unmount', { name });
      };
    }, []);
    
    // Error boundary
    const errorBoundary = useErrorBoundary();
    
    // Accessibility
    const a11y = useAccessibility();
    
    const componentProps: QirvoComponentProps = {
      context,
      theme,
      componentState,
      setComponentState,
      errorBoundary,
      a11y
    };
    
    return component({ ...props, ...componentProps });
  };
  
  QirvoWrappedComponent.displayName = `Qirvo(${name})`;
  return QirvoWrappedComponent;
}

interface QirvoComponentProps {
  context: PluginContext;
  theme: ThemeProvider;
  componentState: any;
  setComponentState: (state: any) => void;
  errorBoundary: ErrorBoundaryHook;
  a11y: AccessibilityHook;
}
```

### Component Registry

```typescript
// Component registry for plugin components
export class ComponentRegistry {
  private components: Map<string, ComponentDefinition> = new Map();
  private instances: Map<string, ComponentInstance> = new Map();
  private factory: ComponentFactory;
  
  constructor() {
    this.factory = new ComponentFactory();
    this.setupBuiltinComponents();
  }
  
  registerComponent(definition: ComponentDefinition): void {
    // Validate component definition
    this.validateComponentDefinition(definition);
    
    // Register component
    this.components.set(definition.name, definition);
    
    // Create component factory
    this.factory.registerComponent(definition);
  }
  
  createComponent(
    name: string, 
    props: any, 
    context: PluginContext
  ): ComponentInstance {
    const definition = this.components.get(name);
    if (!definition) {
      throw new Error(`Component not found: ${name}`);
    }
    
    // Create component instance
    const instance = this.factory.create(definition, props, context);
    
    // Register instance
    const instanceId = this.generateInstanceId(name);
    this.instances.set(instanceId, instance);
    
    return instance;
  }
  
  private setupBuiltinComponents(): void {
    // Register built-in Qirvo components
    this.registerComponent({
      name: 'QirvoCard',
      type: 'container',
      component: QirvoCard,
      props: {
        title: { type: 'string', required: false },
        variant: { type: 'enum', values: ['default', 'outlined', 'elevated'], default: 'default' },
        padding: { type: 'enum', values: ['none', 'small', 'medium', 'large'], default: 'medium' }
      },
      styles: CardStyles,
      accessibility: {
        role: 'region',
        ariaLabel: 'Card container'
      }
    });
    
    this.registerComponent({
      name: 'QirvoButton',
      type: 'interactive',
      component: QirvoButton,
      props: {
        variant: { type: 'enum', values: ['primary', 'secondary', 'outline', 'ghost'], default: 'primary' },
        size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
        disabled: { type: 'boolean', default: false },
        loading: { type: 'boolean', default: false },
        onClick: { type: 'function', required: true }
      },
      styles: ButtonStyles,
      accessibility: {
        role: 'button',
        focusable: true
      }
    });
    
    this.registerComponent({
      name: 'QirvoInput',
      type: 'form',
      component: QirvoInput,
      props: {
        type: { type: 'enum', values: ['text', 'email', 'password', 'number'], default: 'text' },
        placeholder: { type: 'string', required: false },
        value: { type: 'string', required: false },
        onChange: { type: 'function', required: true },
        validation: { type: 'object', required: false }
      },
      styles: InputStyles,
      accessibility: {
        role: 'textbox',
        ariaLabel: 'Input field'
      }
    });
  }
}

interface ComponentDefinition {
  name: string;
  type: ComponentType;
  component: React.ComponentType<any>;
  props: PropDefinitions;
  styles?: ComponentStyles;
  accessibility?: AccessibilityConfig;
}

type ComponentType = 'container' | 'interactive' | 'form' | 'display' | 'layout';
```

## Styling Systems

### Theme System

```typescript
// Advanced theming system for Qirvo components
export class QirvoThemeProvider {
  private themes: Map<string, Theme> = new Map();
  private currentTheme: string = 'default';
  private customProperties: Map<string, any> = new Map();
  
  constructor() {
    this.setupDefaultThemes();
  }
  
  private setupDefaultThemes(): void {
    // Light theme
    this.themes.set('light', {
      name: 'light',
      colors: {
        primary: '#007acc',
        secondary: '#6c757d',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: {
          primary: '#212529',
          secondary: '#6c757d',
          disabled: '#adb5bd'
        }
      },
      typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          md: '1rem',
          lg: '1.125rem',
          xl: '1.25rem'
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        },
        lineHeight: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem'
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        full: '9999px'
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }
    });
    
    // Dark theme
    this.themes.set('dark', {
      name: 'dark',
      colors: {
        primary: '#4dabf7',
        secondary: '#868e96',
        success: '#51cf66',
        warning: '#ffd43b',
        error: '#ff6b6b',
        background: '#1a1a1a',
        surface: '#2d2d2d',
        text: {
          primary: '#ffffff',
          secondary: '#adb5bd',
          disabled: '#6c757d'
        }
      },
      // ... rest of dark theme properties
    });
  }
  
  createStyledComponent<P = {}>(
    name: string,
    styles: ComponentStyleFunction<P>
  ): React.FC<P & StyledComponentProps> {
    return styled.div.withConfig({
      displayName: `Qirvo${name}`,
      shouldForwardProp: (prop) => !['theme', 'variant'].includes(prop)
    })<P & StyledComponentProps>`
      ${(props) => styles(props, this.getCurrentTheme())}
    `;
  }
  
  getCurrentTheme(): Theme {
    return this.themes.get(this.currentTheme)!;
  }
  
  setTheme(themeName: string): void {
    if (!this.themes.has(themeName)) {
      throw new Error(`Theme not found: ${themeName}`);
    }
    
    this.currentTheme = themeName;
    this.applyThemeToDOM();
  }
  
  private applyThemeToDOM(): void {
    const theme = this.getCurrentTheme();
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--qirvo-color-${key}`, value);
      } else {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--qirvo-color-${key}-${subKey}`, subValue);
        });
      }
    });
    
    // Apply typography
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--qirvo-font-size-${key}`, value);
    });
    
    // Apply spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--qirvo-spacing-${key}`, value);
    });
  }
}

// Styled component utilities
export const createComponentStyles = <P = {}>(
  styles: ComponentStyleFunction<P>
) => {
  return (props: P & StyledComponentProps, theme: Theme) => css`
    ${styles(props, theme)}
  `;
};

// Example component styles
export const CardStyles = createComponentStyles<CardProps>((props, theme) => css`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  padding: ${props.padding === 'none' ? '0' : theme.spacing[props.padding || 'md']};
  box-shadow: ${props.variant === 'elevated' ? theme.shadows.md : 'none'};
  border: ${props.variant === 'outlined' ? `1px solid ${theme.colors.text.disabled}` : 'none'};
  
  transition: all 0.2s ease-in-out;
  
  &:hover {
    ${props.variant === 'elevated' && css`
      box-shadow: ${theme.shadows.lg};
      transform: translateY(-2px);
    `}
  }
`);

interface Theme {
  name: string;
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
}

interface StyledComponentProps {
  theme?: Theme;
  variant?: string;
}
```

## Component State Management

### Component State Hooks

```typescript
// Advanced state management for components
export function useComponentState<T>(
  componentName: string,
  initialState: T
): [T, (state: Partial<T>) => void, StateActions<T>] {
  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const updateState = useCallback((newState: Partial<T>) => {
    setState(prevState => {
      const nextState = { ...prevState, ...newState };
      
      // Add to history
      setHistory(prev => [...prev.slice(0, historyIndex + 1), nextState]);
      setHistoryIndex(prev => prev + 1);
      
      return nextState;
    });
  }, [historyIndex]);
  
  const actions: StateActions<T> = {
    reset: () => {
      setState(initialState);
      setHistory([initialState]);
      setHistoryIndex(0);
    },
    
    undo: () => {
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setState(history[prevIndex]);
        setHistoryIndex(prevIndex);
      }
    },
    
    redo: () => {
      if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setState(history[nextIndex]);
        setHistoryIndex(nextIndex);
      }
    },
    
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
  
  return [state, updateState, actions];
}

// Persistent component state
export function usePersistentState<T>(
  key: string,
  initialState: T,
  storage: 'local' | 'session' | 'plugin' = 'plugin'
): [T, (state: T) => void] {
  const context = usePluginContext();
  
  const [state, setState] = useState<T>(() => {
    try {
      switch (storage) {
        case 'local':
          const localItem = localStorage.getItem(key);
          return localItem ? JSON.parse(localItem) : initialState;
        
        case 'session':
          const sessionItem = sessionStorage.getItem(key);
          return sessionItem ? JSON.parse(sessionItem) : initialState;
        
        case 'plugin':
          return context.storage.get(key) || initialState;
        
        default:
          return initialState;
      }
    } catch {
      return initialState;
    }
  });
  
  const updateState = useCallback((newState: T) => {
    setState(newState);
    
    try {
      switch (storage) {
        case 'local':
          localStorage.setItem(key, JSON.stringify(newState));
          break;
        
        case 'session':
          sessionStorage.setItem(key, JSON.stringify(newState));
          break;
        
        case 'plugin':
          context.storage.set(key, newState);
          break;
      }
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }, [key, storage, context.storage]);
  
  return [state, updateState];
}

// Shared component state across plugin
export function useSharedState<T>(
  key: string,
  initialState: T
): [T, (state: T) => void] {
  const context = usePluginContext();
  const [state, setState] = useState<T>(
    () => context.sharedState.get(key) || initialState
  );
  
  useEffect(() => {
    const unsubscribe = context.sharedState.subscribe(key, setState);
    return unsubscribe;
  }, [key, context.sharedState]);
  
  const updateSharedState = useCallback((newState: T) => {
    context.sharedState.set(key, newState);
  }, [key, context.sharedState]);
  
  return [state, updateSharedState];
}

interface StateActions<T> {
  reset: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
```

## Advanced Patterns

### Compound Components

```typescript
// Compound component pattern for complex UI
export const QirvoModal = {
  Root: ({ children, isOpen, onClose }: ModalRootProps) => {
    const [modalState, setModalState] = useComponentState('modal', {
      isOpen,
      canClose: true,
      backdrop: true
    });
    
    const modalContext = {
      isOpen: modalState.isOpen,
      onClose,
      canClose: modalState.canClose,
      setCanClose: (canClose: boolean) => setModalState({ canClose })
    };
    
    return (
      <ModalContext.Provider value={modalContext}>
        <AnimatePresence>
          {modalState.isOpen && (
            <Portal>
              <ModalBackdrop onClick={modalState.canClose ? onClose : undefined}>
                <ModalContainer onClick={(e) => e.stopPropagation()}>
                  {children}
                </ModalContainer>
              </ModalBackdrop>
            </Portal>
          )}
        </AnimatePresence>
      </ModalContext.Provider>
    );
  },
  
  Header: ({ children, showClose = true }: ModalHeaderProps) => {
    const { onClose, canClose } = useContext(ModalContext);
    
    return (
      <ModalHeaderContainer>
        <ModalTitle>{children}</ModalTitle>
        {showClose && canClose && (
          <ModalCloseButton onClick={onClose}>
            <CloseIcon />
          </ModalCloseButton>
        )}
      </ModalHeaderContainer>
    );
  },
  
  Body: ({ children }: ModalBodyProps) => (
    <ModalBodyContainer>
      {children}
    </ModalBodyContainer>
  ),
  
  Footer: ({ children }: ModalFooterProps) => (
    <ModalFooterContainer>
      {children}
    </ModalFooterContainer>
  )
};

// Usage:
// <QirvoModal.Root isOpen={isOpen} onClose={handleClose}>
//   <QirvoModal.Header>Title</QirvoModal.Header>
//   <QirvoModal.Body>Content</QirvoModal.Body>
//   <QirvoModal.Footer>Actions</QirvoModal.Footer>
// </QirvoModal.Root>
```

### Render Props Pattern

```typescript
// Render props for flexible component composition
export const QirvoDataFetcher = <T,>({
  url,
  children,
  fallback,
  errorBoundary
}: DataFetcherProps<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const renderProps: DataFetcherRenderProps<T> = {
    data,
    loading,
    error,
    refetch: fetchData
  };
  
  if (loading && fallback) {
    return fallback;
  }
  
  if (error && errorBoundary) {
    return errorBoundary(error, fetchData);
  }
  
  return children(renderProps);
};

// Usage:
// <QirvoDataFetcher url="/api/data">
//   {({ data, loading, error, refetch }) => (
//     loading ? <Spinner /> : 
//     error ? <ErrorMessage error={error} onRetry={refetch} /> :
//     <DataDisplay data={data} />
//   )}
// </QirvoDataFetcher>
```

### Higher-Order Components

```typescript
// HOC for component enhancement
export function withQirvoEnhancements<P extends object>(
  Component: React.ComponentType<P>
) {
  return React.forwardRef<any, P & QirvoEnhancementProps>((props, ref) => {
    const { 
      trackingId, 
      analytics = true, 
      errorBoundary = true,
      accessibility = true,
      ...componentProps 
    } = props;
    
    // Analytics tracking
    const trackEvent = useAnalytics(trackingId, analytics);
    
    // Error boundary
    const errorHandler = useErrorBoundary(errorBoundary);
    
    // Accessibility enhancements
    const a11yProps = useAccessibilityEnhancements(accessibility);
    
    // Performance monitoring
    const performanceMonitor = usePerformanceMonitor(Component.displayName);
    
    const enhancedProps = {
      ...componentProps,
      ...a11yProps,
      trackEvent,
      onError: errorHandler,
      performanceMonitor,
      ref
    } as P;
    
    return (
      <ErrorBoundary fallback={ErrorFallback}>
        <Component {...enhancedProps} />
      </ErrorBoundary>
    );
  });
}

// Usage:
// const EnhancedButton = withQirvoEnhancements(QirvoButton);
```

## Component Testing

### Component Test Utilities

```typescript
// Testing utilities for Qirvo components
export class ComponentTestUtils {
  static renderWithContext<P>(
    Component: React.ComponentType<P>,
    props: P,
    contextOverrides: Partial<PluginContext> = {}
  ): RenderResult {
    const mockContext: PluginContext = {
      plugin: { id: 'test-plugin', name: 'Test Plugin', version: '1.0.0' },
      config: {},
      storage: new MockStorage(),
      events: new MockEventBus(),
      theme: new MockThemeProvider(),
      ...contextOverrides
    };
    
    return render(
      <PluginContextProvider value={mockContext}>
        <ThemeProvider theme={mockContext.theme.getCurrentTheme()}>
          <Component {...props} />
        </ThemeProvider>
      </PluginContextProvider>
    );
  }
  
  static async testAccessibility(
    component: RenderResult
  ): Promise<AccessibilityTestResult> {
    const results = await axe(component.container);
    
    return {
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      inaccessible: results.inaccessible
    };
  }
  
  static testResponsiveness(
    component: RenderResult,
    breakpoints: Breakpoint[]
  ): ResponsivenessTestResult {
    const results: ResponsivenessTestResult = {
      breakpoints: [],
      issues: []
    };
    
    breakpoints.forEach(breakpoint => {
      // Simulate viewport size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoint.width
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      // Check component rendering
      const isVisible = component.container.offsetWidth > 0;
      const hasOverflow = component.container.scrollWidth > component.container.clientWidth;
      
      results.breakpoints.push({
        name: breakpoint.name,
        width: breakpoint.width,
        visible: isVisible,
        hasOverflow
      });
      
      if (!isVisible) {
        results.issues.push(`Component not visible at ${breakpoint.name} (${breakpoint.width}px)`);
      }
      
      if (hasOverflow) {
        results.issues.push(`Component has horizontal overflow at ${breakpoint.name}`);
      }
    });
    
    return results;
  }
}

// Component test hooks
export function useComponentTesting(componentName: string) {
  const [testResults, setTestResults] = useState<ComponentTestResults>({
    accessibility: null,
    performance: null,
    responsiveness: null
  });
  
  const runAccessibilityTest = useCallback(async (element: HTMLElement) => {
    const results = await axe(element);
    setTestResults(prev => ({
      ...prev,
      accessibility: {
        violations: results.violations.length,
        score: calculateA11yScore(results),
        issues: results.violations.map(v => v.description)
      }
    }));
  }, []);
  
  const runPerformanceTest = useCallback((renderTime: number, memoryUsage: number) => {
    setTestResults(prev => ({
      ...prev,
      performance: {
        renderTime,
        memoryUsage,
        score: calculatePerformanceScore(renderTime, memoryUsage)
      }
    }));
  }, []);
  
  return {
    testResults,
    runAccessibilityTest,
    runPerformanceTest
  };
}
```

## Performance Optimization

### Component Optimization

```typescript
// Performance optimization utilities
export const QirvoMemo = <P extends object>(
  Component: React.FC<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, propsAreEqual || shallowEqual);
};

export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

// Virtual scrolling for large lists
export const QirvoVirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
    items.length - 1
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
};

// Lazy loading components
export function useLazyComponent<P = {}>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ComponentType
): React.ComponentType<P> | null {
  const [Component, setComponent] = useState<React.ComponentType<P> | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!Component && !loading) {
      setLoading(true);
      importFn()
        .then(module => {
          setComponent(() => module.default);
        })
        .catch(error => {
          console.error('Failed to load component:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [Component, loading, importFn]);
  
  if (loading && fallback) {
    return fallback;
  }
  
  return Component;
}
```

This comprehensive custom components guide provides everything needed to build sophisticated, performant, and accessible UI components for Qirvo plugins.

---

**Next**: [Plugin Communication](./plugin-communication.md)
