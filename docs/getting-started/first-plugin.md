# Your First Plugin

This step-by-step tutorial will guide you through creating your first Qirvo plugin from scratch. You'll build a simple task counter widget that demonstrates core plugin concepts.

## Table of Contents

- [What We'll Build](#what-well-build)
- [Project Setup](#project-setup)
- [Plugin Structure](#plugin-structure)
- [Core Implementation](#core-implementation)
- [Widget Component](#widget-component)
- [Testing Your Plugin](#testing-your-plugin)
- [Next Steps](#next-steps)

## What We'll Build

We'll create a "Task Counter" plugin that:
- Displays task statistics in a dashboard widget
- Shows total, completed, and pending tasks
- Provides a quick-add button for new tasks
- Updates in real-time when tasks change
- Stores user preferences

### Final Result Preview

```
┌─────────────────────────┐
│ Task Counter        [+] │
├─────────────────────────┤
│ Total Tasks: 15         │
│ Completed: 8            │
│ Pending: 7              │
│ Overdue: 2              │
├─────────────────────────┤
│ [View All Tasks]        │
└─────────────────────────┘
```

## Project Setup

### 1. Create Project Directory

```bash
mkdir task-counter-plugin
cd task-counter-plugin
```

### 2. Initialize Project

```bash
# Initialize npm project
npm init -y

# Install dependencies
npm install @qirvo/plugin-sdk
npm install -D typescript @types/node @types/react

# Create TypeScript config
npx tsc --init
```

### 3. Update package.json

```json
{
  "name": "task-counter-plugin",
  "version": "1.0.0",
  "description": "A simple task counter widget for Qirvo",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rimraf dist",
    "package": "npm run clean && npm run build && npm pack"
  },
  "keywords": ["qirvo", "plugin", "tasks", "widget"],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "dependencies": {
    "@qirvo/plugin-sdk": "^2.0.7"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "rimraf": "^5.0.0"
  },
  "files": [
    "dist/**/*",
    "manifest.json",
    "README.md"
  ]
}
```

### 4. Configure TypeScript

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Plugin Structure

### 1. Create Directory Structure

```bash
mkdir -p src/components src/types src/utils
```

Your project structure should look like:

```
task-counter-plugin/
├── package.json
├── tsconfig.json
├── manifest.json
├── README.md
└── src/
    ├── index.ts
    ├── components/
    │   └── TaskCounterWidget.tsx
    ├── types/
    │   └── index.ts
    └── utils/
        └── taskUtils.ts
```

### 2. Define Types

Create `src/types/index.ts`:

```typescript
export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  createdAt: Date;
}

export interface PluginSettings {
  showOverdue: boolean;
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
}

export interface WidgetConfig {
  showOverdue: boolean;
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
  maxDisplayItems: number;
}
```

## Core Implementation

### 1. Create Main Plugin Class

Create `src/index.ts`:

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';
import { TaskStats, Task, PluginSettings } from './types';
import { calculateTaskStats } from './utils/taskUtils';

export default class TaskCounterPlugin extends BasePlugin {
  private refreshTimer?: NodeJS.Timeout;
  private settings: PluginSettings = {
    showOverdue: true,
    refreshInterval: 30000, // 30 seconds
    theme: 'auto'
  };

  async onInstall(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Task Counter plugin installed');
    
    // Initialize default settings
    await this.setStorage('settings', this.settings);
    await this.setStorage('installDate', new Date().toISOString());
    
    // Show welcome notification
    await this.notify(
      'Task Counter Installed',
      'Your task counter widget is ready to use!',
      'success'
    );
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Task Counter plugin enabled');
    
    // Load settings
    const savedSettings = await this.getStorage<PluginSettings>('settings');
    if (savedSettings) {
      this.settings = { ...this.settings, ...savedSettings };
    }
    
    // Start refresh timer
    this.startRefreshTimer();
    
    // Initial data load
    await this.refreshTaskStats();
    
    // Listen for task events
    this.setupEventListeners(context);
  }

  async onDisable(): Promise<void> {
    this.log('info', 'Task Counter plugin disabled');
    
    // Stop refresh timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
    this.log('info', 'Configuration updated');
    
    const newSettings = context.config as PluginSettings;
    
    // Update settings
    this.settings = { ...this.settings, ...newSettings };
    await this.setStorage('settings', this.settings);
    
    // Restart timer if interval changed
    if (oldConfig.refreshInterval !== newSettings.refreshInterval) {
      this.startRefreshTimer();
    }
  }

  // Public methods for widget to use
  async getTaskStats(): Promise<TaskStats> {
    try {
      // In a real implementation, this would fetch from Qirvo's task API
      // For this example, we'll simulate task data
      const tasks = await this.getSimulatedTasks();
      return calculateTaskStats(tasks);
    } catch (error) {
      this.log('error', 'Failed to get task stats:', error);
      return { total: 0, completed: 0, pending: 0, overdue: 0 };
    }
  }

  async addQuickTask(title: string): Promise<Task> {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title,
      completed: false,
      createdAt: new Date()
    };

    // In a real implementation, this would use Qirvo's task API
    const existingTasks = await this.getStorage<Task[]>('simulatedTasks') || [];
    existingTasks.push(newTask);
    await this.setStorage('simulatedTasks', existingTasks);

    this.log('info', `Added quick task: ${title}`);
    await this.notify('Task Added', `"${title}" has been added to your tasks`, 'success');

    return newTask;
  }

  async getSettings(): Promise<PluginSettings> {
    return this.settings;
  }

  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      await this.refreshTaskStats();
    }, this.settings.refreshInterval);
  }

  private async refreshTaskStats(): Promise<void> {
    try {
      const stats = await this.getTaskStats();
      await this.setStorage('lastStats', stats);
      await this.setStorage('lastRefresh', new Date().toISOString());
      
      this.log('debug', 'Task stats refreshed:', stats);
    } catch (error) {
      this.log('error', 'Failed to refresh task stats:', error);
    }
  }

  private setupEventListeners(context: PluginRuntimeContext): void {
    // Listen for task-related events
    context.bus.on('task.created', async (data: { task: Task }) => {
      this.log('info', 'Task created event received');
      await this.refreshTaskStats();
    });

    context.bus.on('task.updated', async (data: { task: Task }) => {
      this.log('info', 'Task updated event received');
      await this.refreshTaskStats();
    });

    context.bus.on('task.deleted', async (data: { taskId: string }) => {
      this.log('info', 'Task deleted event received');
      await this.refreshTaskStats();
    });
  }

  private async getSimulatedTasks(): Promise<Task[]> {
    // Simulate task data for demonstration
    const stored = await this.getStorage<Task[]>('simulatedTasks');
    if (stored) {
      return stored;
    }

    // Create some sample tasks
    const sampleTasks: Task[] = [
      {
        id: '1',
        title: 'Review project proposal',
        completed: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        id: '2',
        title: 'Update documentation',
        completed: false,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      },
      {
        id: '3',
        title: 'Fix critical bug',
        completed: false,
        dueDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (overdue)
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        id: '4',
        title: 'Team meeting preparation',
        completed: false,
        createdAt: new Date()
      }
    ];

    await this.setStorage('simulatedTasks', sampleTasks);
    return sampleTasks;
  }
}

// Export the plugin class
export { TaskCounterPlugin };
```

### 2. Create Utility Functions

Create `src/utils/taskUtils.ts`:

```typescript
import { Task, TaskStats } from '../types';

export function calculateTaskStats(tasks: Task[]): TaskStats {
  const now = new Date();
  
  const stats: TaskStats = {
    total: tasks.length,
    completed: 0,
    pending: 0,
    overdue: 0
  };

  tasks.forEach(task => {
    if (task.completed) {
      stats.completed++;
    } else {
      stats.pending++;
      
      // Check if task is overdue
      if (task.dueDate && task.dueDate < now) {
        stats.overdue++;
      }
    }
  });

  return stats;
}

export function formatTaskCount(count: number, label: string): string {
  return `${count} ${count === 1 ? label.slice(0, -1) : label}`;
}

export function getTaskPriority(task: Task): 'high' | 'medium' | 'low' {
  if (!task.dueDate) return 'low';
  
  const now = new Date();
  const timeDiff = task.dueDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  if (hoursDiff < 0) return 'high'; // Overdue
  if (hoursDiff < 24) return 'high'; // Due within 24 hours
  if (hoursDiff < 72) return 'medium'; // Due within 3 days
  return 'low';
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = getTaskPriority(a);
    const bPriority = getTaskPriority(b);
    
    return priorityOrder[bPriority] - priorityOrder[aPriority];
  });
}
```

## Widget Component

### Create React Widget Component

Create `src/components/TaskCounterWidget.tsx`:

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { TaskStats, WidgetConfig } from '../types';

interface TaskCounterWidgetProps {
  plugin: any; // Plugin instance
  config: WidgetConfig;
}

export const TaskCounterWidget: React.FC<TaskCounterWidgetProps> = ({ plugin, config }) => {
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load task statistics
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const taskStats = await plugin.getTaskStats();
      setStats(taskStats);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load task statistics');
      console.error('Widget error:', err);
    } finally {
      setLoading(false);
    }
  }, [plugin]);

  // Handle quick task addition
  const handleQuickAdd = useCallback(async () => {
    const title = prompt('Enter task title:');
    if (!title) return;

    try {
      await plugin.addQuickTask(title);
      await loadStats(); // Refresh stats after adding
    } catch (err) {
      setError('Failed to add task');
      console.error('Add task error:', err);
    }
  }, [plugin, loadStats]);

  // Handle view all tasks
  const handleViewAll = useCallback(() => {
    // In a real implementation, this would navigate to the tasks page
    console.log('Navigate to tasks page');
  }, []);

  // Initial load and refresh interval
  useEffect(() => {
    loadStats();
    
    const interval = setInterval(loadStats, config.refreshInterval);
    return () => clearInterval(interval);
  }, [loadStats, config.refreshInterval]);

  // Calculate completion percentage
  const completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading && stats.total === 0) {
    return (
      <div className="task-counter-widget loading">
        <div className="widget-header">
          <h3>Task Counter</h3>
        </div>
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-counter-widget error">
        <div className="widget-header">
          <h3>Task Counter</h3>
        </div>
        <div className="error-content">
          <p>{error}</p>
          <button onClick={loadStats} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`task-counter-widget theme-${config.theme}`}>
      <div className="widget-header">
        <h3>Task Counter</h3>
        <button onClick={handleQuickAdd} className="quick-add-btn" title="Add Quick Task">
          +
        </button>
      </div>

      <div className="stats-container">
        <div className="stat-item primary">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total Tasks</span>
        </div>

        <div className="stat-row">
          <div className="stat-item success">
            <span className="stat-number">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item info">
            <span className="stat-number">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>

        {config.showOverdue && stats.overdue > 0 && (
          <div className="stat-item warning">
            <span className="stat-number">{stats.overdue}</span>
            <span className="stat-label">Overdue</span>
          </div>
        )}

        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
          <span className="progress-text">{completionPercentage}% Complete</span>
        </div>
      </div>

      <div className="widget-actions">
        <button onClick={handleViewAll} className="view-all-btn">
          View All Tasks
        </button>
      </div>

      {lastUpdated && (
        <div className="widget-footer">
          <small>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </small>
          {loading && <div className="refresh-indicator">↻</div>}
        </div>
      )}
    </div>
  );
};

export default TaskCounterWidget;
```

### Add Widget Styles

Create `src/components/TaskCounterWidget.css`:

```css
.task-counter-widget {
  padding: 16px;
  border-radius: 8px;
  background: var(--widget-bg);
  border: 1px solid var(--widget-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-width: 280px;
  max-width: 400px;
}

/* Theme variables */
.task-counter-widget.theme-light {
  --widget-bg: #ffffff;
  --widget-border: #e1e5e9;
  --text-primary: #2d3748;
  --text-secondary: #718096;
  --success-color: #48bb78;
  --warning-color: #ed8936;
  --info-color: #4299e1;
  --primary-color: #667eea;
}

.task-counter-widget.theme-dark {
  --widget-bg: #2d3748;
  --widget-border: #4a5568;
  --text-primary: #f7fafc;
  --text-secondary: #a0aec0;
  --success-color: #68d391;
  --warning-color: #f6ad55;
  --info-color: #63b3ed;
  --primary-color: #7c3aed;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.widget-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.quick-add-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.quick-add-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.stats-container {
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.5);
  border-left: 4px solid;
}

.stat-item.primary {
  border-left-color: var(--primary-color);
  background: rgba(102, 126, 234, 0.1);
}

.stat-item.success {
  border-left-color: var(--success-color);
  background: rgba(72, 187, 120, 0.1);
}

.stat-item.info {
  border-left-color: var(--info-color);
  background: rgba(66, 153, 225, 0.1);
}

.stat-item.warning {
  border-left-color: var(--warning-color);
  background: rgba(237, 137, 54, 0.1);
}

.stat-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.progress-bar {
  position: relative;
  background: #e2e8f0;
  border-radius: 10px;
  height: 20px;
  margin: 12px 0;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, var(--success-color), var(--primary-color));
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.widget-actions {
  margin-bottom: 12px;
}

.view-all-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 2px solid var(--primary-color);
  color: var(--primary-color);
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  background: var(--primary-color);
  color: white;
}

.widget-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--widget-border);
  font-size: 12px;
  color: var(--text-secondary);
}

.refresh-indicator {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-content, .error-content {
  text-align: center;
  padding: 20px;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

.retry-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.retry-btn:hover {
  opacity: 0.9;
}

/* Responsive design */
@media (max-width: 320px) {
  .task-counter-widget {
    padding: 12px;
    min-width: auto;
  }
  
  .stat-row {
    grid-template-columns: 1fr;
  }
  
  .stat-number {
    font-size: 20px;
  }
}
```

## Plugin Manifest

Create `manifest.json`:

```json
{
  "manifest_version": 1,
  "name": "Task Counter",
  "version": "1.0.0",
  "description": "A simple widget that displays task statistics and provides quick task management",
  "type": "dashboard-widget",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "category": "productivity",
  "keywords": ["tasks", "productivity", "counter", "widget"],
  "permissions": [
    "storage-read",
    "storage-write", 
    "notifications"
  ],
  "dashboard_widget": {
    "name": "Task Counter",
    "description": "Display task statistics and quick actions",
    "component": "TaskCounterWidget",
    "defaultSize": { "width": 350, "height": 280 },
    "size": "medium",
    "configSchema": {
      "type": "object",
      "properties": {
        "showOverdue": {
          "type": "boolean",
          "title": "Show Overdue Tasks",
          "description": "Display count of overdue tasks",
          "default": true
        },
        "refreshInterval": {
          "type": "number",
          "title": "Refresh Interval (seconds)",
          "description": "How often to update task statistics",
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
        },
        "maxDisplayItems": {
          "type": "number",
          "title": "Max Display Items",
          "description": "Maximum number of items to show in lists",
          "minimum": 3,
          "maximum": 20,
          "default": 10
        }
      }
    }
  },
  "main": "dist/index.js",
  "web": "dist/components/TaskCounterWidget.js",
  "repository": "https://github.com/yourusername/task-counter-plugin",
  "license": "MIT"
}
```

## Testing Your Plugin

### 1. Build the Plugin

```bash
# Build TypeScript
npm run build

# Verify build output
ls -la dist/
```

### 2. Package the Plugin

```bash
# Create plugin package
npm run package

# This creates a .tgz file
ls -la *.tgz
```

### 3. Test Locally

```bash
# If you have Qirvo CLI installed
qirvo plugin install ./task-counter-plugin-1.0.0.tgz

# Or test the build
node dist/index.js
```

### 4. Upload to Qirvo

1. Open your Qirvo dashboard
2. Navigate to **Plugins** → **Installed Plugins**
3. Click **"Upload Plugin"**
4. Select your `.tgz` file
5. Configure the widget settings
6. Enable the plugin

### 5. Verify Widget

1. Go to your dashboard
2. Look for the "Task Counter" widget
3. Add it to your dashboard
4. Test the quick-add functionality
5. Verify the statistics update

## Next Steps

### Enhance Your Plugin

1. **Real API Integration**:
   ```typescript
   // Replace simulated data with real Qirvo API calls
   async getTaskStats(): Promise<TaskStats> {
     if (this.context.api.qirvo?.tasks) {
       const tasks = await this.context.api.qirvo.tasks.getAll();
       return calculateTaskStats(tasks);
     }
     return this.getSimulatedTasks();
   }
   ```

2. **Add More Features**:
   - Task filtering and sorting
   - Due date reminders
   - Task categories
   - Productivity insights

3. **Improve UI**:
   - Add animations
   - Better responsive design
   - Dark mode support
   - Accessibility features

4. **Add CLI Commands**:
   ```typescript
   export const commands = [
     createCommand('tasks', 'Manage tasks from CLI', async (args, context) => {
       // CLI task management
     })
   ];
   ```

### Learn More

- **Next Tutorial**: [CLI Tool Tutorial](../examples/cli-tool.md)
- **Advanced Features**: [Background Services](../plugin-types/background-services.md)
- **API Reference**: [Core APIs](../api-reference/core-apis.md)
- **Publishing**: [Publishing Guide](../deployment/publishing.md)

### Common Issues

1. **Build Errors**: Check TypeScript configuration
2. **Widget Not Loading**: Verify manifest.json syntax
3. **API Errors**: Check permissions in manifest
4. **Styling Issues**: Ensure CSS is properly imported

Congratulations! You've built your first Qirvo plugin. The Task Counter widget demonstrates core concepts like plugin lifecycle, storage, notifications, and React components. Use this foundation to build more complex and powerful plugins.

---

**Next**: [Development Environment](./development-environment.md) for advanced development setup.
