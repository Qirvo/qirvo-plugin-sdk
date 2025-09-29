# Dashboard Widgets

Dashboard widgets are interactive UI components that display information and provide quick actions directly on the Qirvo dashboard. This guide covers everything you need to know about creating powerful dashboard widgets.

## Table of Contents

- [Widget Fundamentals](#widget-fundamentals)
- [Widget Configuration](#widget-configuration)
- [React Components](#react-components)
- [Data Management](#data-management)
- [User Interactions](#user-interactions)
- [Styling and Themes](#styling-and-themes)
- [Performance Optimization](#performance-optimization)
- [Testing Widgets](#testing-widgets)

## Widget Fundamentals

### What are Dashboard Widgets?

Dashboard widgets are React components that:
- Display real-time information
- Provide quick access to functionality
- Integrate seamlessly with the Qirvo dashboard
- Support user configuration and customization
- Maintain state across sessions

### Widget Lifecycle

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

export default class MyWidgetPlugin extends BasePlugin {
  // Widget is created when plugin is enabled
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Widget plugin enabled');
    
    // Initialize widget data
    await this.initializeWidgetData();
    
    // Start data refresh timers
    this.startDataRefresh();
  }

  // Widget is destroyed when plugin is disabled
  async onDisable(): Promise<void> {
    this.log('info', 'Widget plugin disabled');
    
    // Cleanup timers and resources
    this.stopDataRefresh();
    this.cleanup();
  }

  // Widget configuration changes
  async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
    // Update widget based on new configuration
    await this.updateWidgetConfiguration(context.config);
  }
}
```

## Widget Configuration

### Manifest Configuration

Define your widget in `manifest.json`:

```json
{
  "type": "dashboard-widget",
  "dashboard_widget": {
    "name": "Task Counter",
    "description": "Display task statistics and quick actions",
    "component": "TaskCounterWidget",
    "defaultSize": { "width": 350, "height": 250 },
    "size": "medium",
    "position": "sidebar",
    "configSchema": {
      "type": "object",
      "properties": {
        "showCompleted": {
          "type": "boolean",
          "title": "Show Completed Tasks",
          "default": true
        },
        "refreshInterval": {
          "type": "number",
          "title": "Refresh Interval (seconds)",
          "minimum": 10,
          "maximum": 300,
          "default": 30
        },
        "theme": {
          "type": "string",
          "title": "Widget Theme",
          "enum": ["light", "dark", "auto"],
          "enumNames": ["Light", "Dark", "Auto"],
          "default": "auto"
        }
      }
    }
  }
}
```

### Widget Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name in widget selector |
| `description` | string | Brief description of functionality |
| `component` | string | React component name |
| `defaultSize` | object | Default dimensions `{width, height}` |
| `size` | string | Size category: `small`, `medium`, `large` |
| `position` | string | Preferred position: `sidebar`, `main`, `floating` |
| `configSchema` | object | JSON Schema for user configuration |

### Size Guidelines

| Size | Dimensions | Use Case |
|------|------------|----------|
| **Small** | 300x200px | Simple metrics, status indicators |
| **Medium** | 400x300px | Charts, lists, moderate complexity |
| **Large** | 600x400px | Complex dashboards, detailed views |

## React Components

### Basic Widget Component

```typescript
import React, { useState, useEffect } from 'react';
import { PluginRuntimeContext } from '@qirvo/plugin-sdk';

interface WidgetProps {
  plugin: any; // Plugin instance
  config: WidgetConfig;
  context: PluginRuntimeContext;
}

interface WidgetConfig {
  showCompleted: boolean;
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
}

export const TaskCounterWidget: React.FC<WidgetProps> = ({ plugin, config, context }) => {
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTaskStats();
    
    // Set up refresh interval
    const interval = setInterval(loadTaskStats, config.refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [config.refreshInterval]);

  const loadTaskStats = async () => {
    try {
      setLoading(true);
      const stats = await plugin.getTaskStatistics();
      setTaskStats(stats);
      setError(null);
    } catch (err) {
      setError('Failed to load task statistics');
      console.error('Widget error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    try {
      await plugin.showQuickAddDialog();
      await loadTaskStats(); // Refresh after adding
    } catch (err) {
      setError('Failed to add task');
    }
  };

  if (loading && taskStats.total === 0) {
    return (
      <div className="widget-loading">
        <div className="spinner" />
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget-error">
        <p>{error}</p>
        <button onClick={loadTaskStats}>Retry</button>
      </div>
    );
  }

  return (
    <div className={`task-counter-widget theme-${config.theme}`}>
      <div className="widget-header">
        <h3>Tasks</h3>
        <button onClick={handleQuickAdd} className="quick-add-btn">
          + Add
        </button>
      </div>

      <div className="task-stats">
        <div className="stat-item">
          <span className="stat-number">{taskStats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{taskStats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        {config.showCompleted && (
          <div className="stat-item">
            <span className="stat-number">{taskStats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        )}
        {taskStats.overdue > 0 && (
          <div className="stat-item urgent">
            <span className="stat-number">{taskStats.overdue}</span>
            <span className="stat-label">Overdue</span>
          </div>
        )}
      </div>

      <div className="widget-actions">
        <button onClick={() => plugin.openTaskList()}>
          View All Tasks
        </button>
      </div>

      {loading && (
        <div className="refresh-indicator">
          <div className="spinner-small" />
        </div>
      )}
    </div>
  );
};

export default TaskCounterWidget;
```

### Advanced Widget with Hooks

```typescript
import React from 'react';
import { useWidgetData, useWidgetConfig, useWidgetActions } from './hooks';

export const AdvancedWidget: React.FC<WidgetProps> = ({ plugin, config, context }) => {
  const { data, loading, error, refresh } = useWidgetData(plugin, config.refreshInterval);
  const { updateConfig } = useWidgetConfig(context);
  const { performAction } = useWidgetActions(plugin);

  // Custom hooks handle complex logic
  return (
    <div className="advanced-widget">
      {/* Widget content */}
    </div>
  );
};

// Custom hooks for reusable logic
function useWidgetData(plugin: any, refreshInterval: number) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const newData = await plugin.getData();
      setData(newData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [plugin]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  return { data, loading, error, refresh };
}
```

## Data Management

### State Management

```typescript
interface WidgetState {
  data: any;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useWidgetState = (initialData: any = null) => {
  const [state, setState] = useState<WidgetState>({
    data: initialData,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const setData = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      data,
      error: null,
      lastUpdated: new Date()
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  return { ...state, setData, setLoading, setError };
};
```

### Data Caching

```typescript
class WidgetDataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage in widget
const cache = new WidgetDataCache();

const loadData = async (forceRefresh = false) => {
  const cacheKey = 'widget-data';
  
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }
  }

  try {
    setLoading(true);
    const freshData = await plugin.fetchData();
    cache.set(cacheKey, freshData, config.refreshInterval * 1000);
    setData(freshData);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Real-time Updates

```typescript
export const RealTimeWidget: React.FC<WidgetProps> = ({ plugin, config, context }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = context.bus.on('data.updated', (newData) => {
      setData(newData);
    });

    // Initial data load
    loadInitialData();

    return unsubscribe;
  }, []);

  const loadInitialData = async () => {
    const initialData = await plugin.getData();
    setData(initialData);
  };

  // Widget renders with real-time data
  return (
    <div className="realtime-widget">
      {/* Widget content that updates in real-time */}
    </div>
  );
};
```

## User Interactions

### Click Handlers

```typescript
export const InteractiveWidget: React.FC<WidgetProps> = ({ plugin, config }) => {
  const handleItemClick = async (itemId: string) => {
    try {
      await plugin.selectItem(itemId);
      // Update UI or navigate
    } catch (error) {
      console.error('Failed to select item:', error);
    }
  };

  const handleQuickAction = async (action: string) => {
    try {
      await plugin.performQuickAction(action);
      // Show feedback
      plugin.showNotification('Action completed', 'success');
    } catch (error) {
      plugin.showNotification('Action failed', 'error');
    }
  };

  return (
    <div className="interactive-widget">
      <div className="item-list">
        {items.map(item => (
          <div 
            key={item.id}
            className="item"
            onClick={() => handleItemClick(item.id)}
          >
            {item.name}
          </div>
        ))}
      </div>
      
      <div className="quick-actions">
        <button onClick={() => handleQuickAction('refresh')}>
          Refresh
        </button>
        <button onClick={() => handleQuickAction('add')}>
          Add New
        </button>
      </div>
    </div>
  );
};
```

### Form Handling

```typescript
export const FormWidget: React.FC<WidgetProps> = ({ plugin, config }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await plugin.createItem(formData);
      setFormData({ title: '', description: '', priority: 'medium' });
      plugin.showNotification('Item created successfully', 'success');
    } catch (error) {
      plugin.showNotification('Failed to create item', 'error');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="form-widget">
      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={(e) => handleInputChange('title', e.target.value)}
        required
      />
      
      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
      />
      
      <select
        value={formData.priority}
        onChange={(e) => handleInputChange('priority', e.target.value)}
      >
        <option value="low">Low Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="high">High Priority</option>
      </select>
      
      <button type="submit">Create Item</button>
    </form>
  );
};
```

## Styling and Themes

### CSS Structure

```css
/* Widget base styles */
.widget-base {
  padding: 16px;
  border-radius: 8px;
  background: var(--widget-background);
  border: 1px solid var(--widget-border);
  box-shadow: var(--widget-shadow);
  font-family: var(--font-family);
}

/* Theme variables */
.theme-light {
  --widget-background: #ffffff;
  --widget-border: #e1e5e9;
  --widget-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --text-primary: #2d3748;
  --text-secondary: #718096;
}

.theme-dark {
  --widget-background: #2d3748;
  --widget-border: #4a5568;
  --widget-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  --text-primary: #f7fafc;
  --text-secondary: #a0aec0;
}

/* Responsive design */
@media (max-width: 768px) {
  .widget-base {
    padding: 12px;
    font-size: 14px;
  }
}
```

### Theme Integration

```typescript
export const ThemedWidget: React.FC<WidgetProps> = ({ plugin, config }) => {
  const [theme, setTheme] = useState(config.theme);

  useEffect(() => {
    if (config.theme === 'auto') {
      // Detect system theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mediaQuery.matches ? 'dark' : 'light');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setTheme(config.theme);
    }
  }, [config.theme]);

  return (
    <div className={`widget-base theme-${theme}`}>
      {/* Widget content with theme-aware styling */}
    </div>
  );
};
```

## Performance Optimization

### Memoization

```typescript
import React, { memo, useMemo, useCallback } from 'react';

export const OptimizedWidget = memo<WidgetProps>(({ plugin, config, data }) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data ? processData(data) : null;
  }, [data]);

  // Memoize event handlers
  const handleRefresh = useCallback(async () => {
    await plugin.refreshData();
  }, [plugin]);

  const handleItemClick = useCallback((itemId: string) => {
    plugin.selectItem(itemId);
  }, [plugin]);

  return (
    <div className="optimized-widget">
      {processedData && (
        <DataVisualization 
          data={processedData}
          onItemClick={handleItemClick}
        />
      )}
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
});
```

### Virtual Scrolling

```typescript
import { FixedSizeList as List } from 'react-window';

export const LargeListWidget: React.FC<WidgetProps> = ({ data }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="list-item">
      {data[index].name}
    </div>
  );

  return (
    <div className="large-list-widget">
      <List
        height={300}
        itemCount={data.length}
        itemSize={50}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export const LazyWidget: React.FC<WidgetProps> = ({ showHeavyComponent }) => {
  return (
    <div className="lazy-widget">
      <div className="light-content">
        {/* Always visible content */}
      </div>
      
      {showHeavyComponent && (
        <Suspense fallback={<div>Loading...</div>}>
          <HeavyComponent />
        </Suspense>
      )}
    </div>
  );
};
```

## Testing Widgets

### Unit Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskCounterWidget } from './TaskCounterWidget';

describe('TaskCounterWidget', () => {
  const mockPlugin = {
    getTaskStatistics: jest.fn(),
    showQuickAddDialog: jest.fn(),
    openTaskList: jest.fn()
  };

  const defaultConfig = {
    showCompleted: true,
    refreshInterval: 30,
    theme: 'light'
  };

  beforeEach(() => {
    mockPlugin.getTaskStatistics.mockResolvedValue({
      total: 10,
      completed: 5,
      pending: 4,
      overdue: 1
    });
  });

  it('renders task statistics correctly', async () => {
    render(<TaskCounterWidget plugin={mockPlugin} config={defaultConfig} />);
    
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('handles quick add action', async () => {
    render(<TaskCounterWidget plugin={mockPlugin} config={defaultConfig} />);
    
    const addButton = screen.getByText('+ Add');
    fireEvent.click(addButton);
    
    expect(mockPlugin.showQuickAddDialog).toHaveBeenCalled();
  });

  it('refreshes data at specified interval', async () => {
    jest.useFakeTimers();
    
    render(<TaskCounterWidget plugin={mockPlugin} config={defaultConfig} />);
    
    // Initial call
    expect(mockPlugin.getTaskStatistics).toHaveBeenCalledTimes(1);
    
    // Advance timer
    jest.advanceTimersByTime(30000);
    
    // Should be called again
    expect(mockPlugin.getTaskStatistics).toHaveBeenCalledTimes(2);
    
    jest.useRealTimers();
  });
});
```

### Integration Testing

```typescript
import { renderWidget } from '@qirvo/plugin-test-utils';

describe('Widget Integration', () => {
  it('integrates with plugin context correctly', async () => {
    const { widget, plugin, context } = await renderWidget(TaskCounterWidget, {
      config: { showCompleted: true },
      mockData: { tasks: [] }
    });

    // Test widget with real plugin context
    expect(widget.getByRole('button', { name: /add/i })).toBeInTheDocument();
    
    // Test plugin method calls
    fireEvent.click(widget.getByRole('button', { name: /add/i }));
    expect(plugin.showQuickAddDialog).toHaveBeenCalled();
  });
});
```

## Best Practices

### Development
1. **Keep Components Small**: Break complex widgets into smaller components
2. **Use TypeScript**: Leverage type safety for props and state
3. **Handle Loading States**: Always show loading indicators
4. **Error Boundaries**: Implement proper error handling
5. **Accessibility**: Use semantic HTML and ARIA attributes

### Performance
1. **Memoize Expensive Operations**: Use useMemo and useCallback
2. **Lazy Load Heavy Components**: Split code and load on demand
3. **Optimize Re-renders**: Use React.memo and proper dependencies
4. **Cache Data**: Implement intelligent caching strategies
5. **Virtual Scrolling**: For large lists and datasets

### User Experience
1. **Responsive Design**: Work on all screen sizes
2. **Theme Support**: Respect user theme preferences
3. **Smooth Animations**: Use CSS transitions for state changes
4. **Immediate Feedback**: Show loading states and confirmations
5. **Keyboard Navigation**: Support keyboard interactions

---

**Next**: [CLI Plugins](./cli-plugins.md) for command-line tool development.
