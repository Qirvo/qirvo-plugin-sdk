# Hybrid Plugins

Hybrid plugins combine multiple plugin types into a single comprehensive solution, providing users with dashboard widgets, CLI commands, background services, and page extensions all in one package.

## Table of Contents

- [Hybrid Plugin Fundamentals](#hybrid-plugin-fundamentals)
- [Architecture Design](#architecture-design)
- [Shared Code and Utilities](#shared-code-and-utilities)
- [Multi-Entry Point Management](#multi-entry-point-management)
- [Configuration Management](#configuration-management)
- [Testing Hybrid Plugins](#testing-hybrid-plugins)

## Hybrid Plugin Fundamentals

### What are Hybrid Plugins?

Hybrid plugins are comprehensive solutions that:
- Combine dashboard widgets, CLI tools, and background services
- Share common functionality across different interfaces
- Provide unified user experience across platforms
- Offer complete feature sets for complex use cases

### Manifest Configuration

```json
{
  "type": "hybrid",
  "dashboard_widget": {
    "name": "Project Manager",
    "component": "ProjectWidget",
    "defaultSize": { "width": 500, "height": 400 }
  },
  "commands": [
    {
      "name": "project",
      "description": "Manage projects from CLI",
      "usage": "project <action> [options]"
    }
  ],
  "pages": [
    {
      "name": "projects",
      "path": "/plugins/project-manager",
      "component": "ProjectsPage",
      "title": "Project Manager"
    }
  ],
  "background": "dist/background.js",
  "main": "dist/index.js",
  "web": "dist/web.js"
}
```

## Architecture Design

### Core Plugin Class

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';
import { ProjectService } from './services/ProjectService';
import { NotificationService } from './services/NotificationService';

export default class ProjectManagerPlugin extends BasePlugin {
  private projectService: ProjectService;
  private notificationService: NotificationService;
  private backgroundService?: BackgroundProjectService;

  async onInstall(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Installing Project Manager plugin');
    
    // Initialize shared services
    this.projectService = new ProjectService(context);
    this.notificationService = new NotificationService(context);
    
    // Set up initial data
    await this.setupInitialData();
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Enabling Project Manager plugin');
    
    // Initialize services
    await this.projectService.initialize();
    
    // Start background service if configured
    const config = context.config as ProjectManagerConfig;
    if (config.enableBackgroundSync) {
      this.backgroundService = new BackgroundProjectService(
        this.projectService,
        this.notificationService
      );
      await this.backgroundService.start();
    }
  }

  async onDisable(): Promise<void> {
    this.log('info', 'Disabling Project Manager plugin');
    
    // Stop background service
    if (this.backgroundService) {
      await this.backgroundService.stop();
      this.backgroundService = undefined;
    }
    
    // Cleanup services
    await this.projectService.cleanup();
  }

  // Public API for CLI and widget access
  getProjectService(): ProjectService {
    return this.projectService;
  }

  getNotificationService(): NotificationService {
    return this.notificationService;
  }
}

interface ProjectManagerConfig {
  enableBackgroundSync: boolean;
  syncInterval: number;
  defaultProjectTemplate: string;
  notificationSettings: {
    deadlineReminders: boolean;
    statusUpdates: boolean;
  };
}
```

### Shared Services Architecture

```typescript
// services/ProjectService.ts
export class ProjectService {
  constructor(private context: PluginRuntimeContext) {}

  async createProject(data: CreateProjectData): Promise<Project> {
    const project: Project = {
      id: this.generateId(),
      name: data.name,
      description: data.description,
      status: 'active',
      createdAt: new Date(),
      tasks: [],
      members: data.members || []
    };

    // Save to storage
    await this.saveProject(project);
    
    // Emit event for other components
    this.context.bus.emit('project.created', { project });
    
    return project;
  }

  async getProjects(filter?: ProjectFilter): Promise<Project[]> {
    const allProjects = await this.context.storage.get('projects') || [];
    
    if (!filter) return allProjects;
    
    return allProjects.filter(project => this.matchesFilter(project, filter));
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const projects = await this.getProjects();
    const projectIndex = projects.findIndex(p => p.id === id);
    
    if (projectIndex === -1) {
      throw new Error(`Project ${id} not found`);
    }

    const updatedProject = { ...projects[projectIndex], ...updates };
    projects[projectIndex] = updatedProject;
    
    await this.context.storage.set('projects', projects);
    this.context.bus.emit('project.updated', { project: updatedProject });
    
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    const projects = await this.getProjects();
    const filteredProjects = projects.filter(p => p.id !== id);
    
    await this.context.storage.set('projects', filteredProjects);
    this.context.bus.emit('project.deleted', { projectId: id });
  }

  private async saveProject(project: Project): Promise<void> {
    const projects = await this.getProjects();
    projects.push(project);
    await this.context.storage.set('projects', projects);
  }

  private generateId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private matchesFilter(project: Project, filter: ProjectFilter): boolean {
    if (filter.status && project.status !== filter.status) return false;
    if (filter.name && !project.name.toLowerCase().includes(filter.name.toLowerCase())) return false;
    return true;
  }
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  tasks: Task[];
  members: string[];
}

interface CreateProjectData {
  name: string;
  description: string;
  members?: string[];
}

interface ProjectFilter {
  status?: string;
  name?: string;
}
```

## Shared Code and Utilities

### Common Utilities

```typescript
// utils/common.ts
export class DateUtils {
  static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  static isOverdue(dueDate: Date): boolean {
    return new Date() > dueDate;
  }

  static getDaysUntilDue(dueDate: Date): number {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export class ValidationUtils {
  static validateProjectName(name: string): string[] {
    const errors: string[] = [];
    
    if (!name || name.trim().length === 0) {
      errors.push('Project name is required');
    }
    
    if (name.length > 100) {
      errors.push('Project name must be less than 100 characters');
    }
    
    return errors;
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export class FormatUtils {
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
```

### Event System Integration

```typescript
// services/EventBus.ts
export class PluginEventBus {
  constructor(private context: PluginRuntimeContext) {}

  // Emit events that all components can listen to
  emitProjectEvent(event: ProjectEvent): void {
    this.context.bus.emit(`project.${event.type}`, event.data);
    
    // Also emit to global plugin event
    this.context.bus.emit('plugin.project-manager.event', {
      type: event.type,
      data: event.data,
      timestamp: new Date()
    });
  }

  // Subscribe to events from any component
  onProjectEvent(eventType: string, handler: (data: any) => void): () => void {
    return this.context.bus.on(`project.${eventType}`, handler);
  }

  // Subscribe to external events
  onExternalEvent(eventType: string, handler: (data: any) => void): () => void {
    return this.context.bus.on(eventType, handler);
  }
}

interface ProjectEvent {
  type: 'created' | 'updated' | 'deleted' | 'status_changed';
  data: any;
}
```

## Multi-Entry Point Management

### CLI Commands

```typescript
// cli/commands.ts
import { createCommand } from '@qirvo/plugin-sdk';
import { ProjectService } from '../services/ProjectService';

export const projectCommands = [
  createCommand(
    'project',
    'Manage projects from command line',
    async (args: string[], context) => {
      const plugin = context.plugin as ProjectManagerPlugin;
      const projectService = plugin.getProjectService();
      
      const action = args[0];
      
      switch (action) {
        case 'list':
          await listProjects(projectService, args.slice(1));
          break;
        case 'create':
          await createProject(projectService, args.slice(1));
          break;
        case 'update':
          await updateProject(projectService, args.slice(1));
          break;
        case 'delete':
          await deleteProject(projectService, args.slice(1));
          break;
        default:
          console.log('Usage: project <list|create|update|delete> [options]');
      }
    }
  )
];

async function listProjects(service: ProjectService, args: string[]): Promise<void> {
  try {
    const projects = await service.getProjects();
    
    if (projects.length === 0) {
      console.log('No projects found.');
      return;
    }

    console.log('\nProjects:');
    projects.forEach((project, index) => {
      const status = project.status === 'active' ? '🟢' : 
                   project.status === 'completed' ? '✅' : '📦';
      console.log(`${index + 1}. ${status} ${project.name} (${project.tasks.length} tasks)`);
    });
  } catch (error) {
    console.error('Failed to list projects:', error.message);
  }
}

async function createProject(service: ProjectService, args: string[]): Promise<void> {
  const name = args.join(' ');
  
  if (!name) {
    console.error('Project name is required');
    return;
  }

  try {
    const project = await service.createProject({
      name,
      description: '',
      members: []
    });
    
    console.log(`✅ Project "${project.name}" created successfully`);
  } catch (error) {
    console.error('Failed to create project:', error.message);
  }
}
```

### Dashboard Widget

```typescript
// components/ProjectWidget.tsx
import React, { useState, useEffect } from 'react';
import { ProjectService } from '../services/ProjectService';

interface ProjectWidgetProps {
  plugin: ProjectManagerPlugin;
  config: ProjectManagerConfig;
}

export const ProjectWidget: React.FC<ProjectWidgetProps> = ({ plugin, config }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const projectService = plugin.getProjectService();

  useEffect(() => {
    loadProjects();
    
    // Listen for project events
    const unsubscribe = plugin.getEventBus().onProjectEvent('*', () => {
      loadProjects(); // Refresh on any project change
    });

    return unsubscribe;
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await projectService.getProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    const name = prompt('Enter project name:');
    if (!name) return;

    try {
      await projectService.createProject({
        name,
        description: '',
        members: []
      });
      // Projects will auto-refresh via event listener
    } catch (error) {
      alert('Failed to create project: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="project-widget loading">
        <div className="spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="project-widget">
      <div className="widget-header">
        <h3>Projects</h3>
        <button onClick={handleCreateProject} className="create-btn">
          + New
        </button>
      </div>

      <div className="project-list">
        {projects.length === 0 ? (
          <p className="no-projects">No projects yet. Create your first project!</p>
        ) : (
          projects.map(project => (
            <div 
              key={project.id} 
              className={`project-item ${selectedProject?.id === project.id ? 'selected' : ''}`}
              onClick={() => setSelectedProject(project)}
            >
              <div className="project-info">
                <h4>{project.name}</h4>
                <p>{project.tasks.length} tasks</p>
              </div>
              <div className={`status-badge ${project.status}`}>
                {project.status}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedProject && (
        <div className="project-details">
          <h4>{selectedProject.name}</h4>
          <p>{selectedProject.description}</p>
          <div className="project-stats">
            <span>Tasks: {selectedProject.tasks.length}</span>
            <span>Members: {selectedProject.members.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Background Service

```typescript
// services/BackgroundProjectService.ts
export class BackgroundProjectService {
  private isRunning = false;
  private syncInterval?: NodeJS.Timeout;

  constructor(
    private projectService: ProjectService,
    private notificationService: NotificationService
  ) {}

  async start(): Promise<void> {
    this.isRunning = true;
    
    // Start periodic sync
    this.syncInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.performSync();
      }
    }, 300000); // Every 5 minutes

    // Start deadline monitoring
    this.startDeadlineMonitoring();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  private async performSync(): Promise<void> {
    try {
      console.log('Performing background project sync...');
      
      const projects = await this.projectService.getProjects();
      
      // Sync with external services
      for (const project of projects) {
        await this.syncProjectWithExternal(project);
      }
      
      console.log('Background sync completed');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  private async syncProjectWithExternal(project: Project): Promise<void> {
    // Implementation for syncing with external project management tools
    // This could integrate with GitHub, Jira, Trello, etc.
  }

  private startDeadlineMonitoring(): void {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      await this.checkDeadlines();
    }, 3600000); // Every hour
  }

  private async checkDeadlines(): Promise<void> {
    try {
      const projects = await this.projectService.getProjects();
      
      for (const project of projects) {
        for (const task of project.tasks) {
          if (task.dueDate && this.isDeadlineApproaching(task.dueDate)) {
            await this.notificationService.sendDeadlineReminder(project, task);
          }
        }
      }
    } catch (error) {
      console.error('Deadline monitoring failed:', error);
    }
  }

  private isDeadlineApproaching(dueDate: Date): boolean {
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const hoursUntilDue = timeDiff / (1000 * 60 * 60);
    
    return hoursUntilDue <= 24 && hoursUntilDue > 0;
  }
}
```

## Configuration Management

### Unified Configuration Schema

```json
{
  "config_schema": {
    "type": "object",
    "properties": {
      "general": {
        "type": "object",
        "title": "General Settings",
        "properties": {
          "defaultView": {
            "type": "string",
            "title": "Default View",
            "enum": ["list", "board", "timeline"],
            "default": "list"
          },
          "theme": {
            "type": "string",
            "title": "Theme",
            "enum": ["light", "dark", "auto"],
            "default": "auto"
          }
        }
      },
      "widget": {
        "type": "object",
        "title": "Widget Settings",
        "properties": {
          "showCompletedProjects": {
            "type": "boolean",
            "title": "Show Completed Projects",
            "default": false
          },
          "maxProjectsDisplayed": {
            "type": "number",
            "title": "Max Projects in Widget",
            "minimum": 1,
            "maximum": 20,
            "default": 5
          }
        }
      },
      "cli": {
        "type": "object",
        "title": "CLI Settings",
        "properties": {
          "outputFormat": {
            "type": "string",
            "title": "Default Output Format",
            "enum": ["table", "json", "csv"],
            "default": "table"
          },
          "confirmDestructiveActions": {
            "type": "boolean",
            "title": "Confirm Destructive Actions",
            "default": true
          }
        }
      },
      "background": {
        "type": "object",
        "title": "Background Service",
        "properties": {
          "enableBackgroundSync": {
            "type": "boolean",
            "title": "Enable Background Sync",
            "default": true
          },
          "syncInterval": {
            "type": "number",
            "title": "Sync Interval (minutes)",
            "minimum": 5,
            "maximum": 1440,
            "default": 30
          },
          "deadlineReminders": {
            "type": "boolean",
            "title": "Deadline Reminders",
            "default": true
          }
        }
      }
    }
  }
}
```

### Configuration Access

```typescript
// services/ConfigService.ts
export class ConfigService {
  constructor(private context: PluginRuntimeContext) {}

  getGeneralConfig(): GeneralConfig {
    return this.context.config.general || {};
  }

  getWidgetConfig(): WidgetConfig {
    return this.context.config.widget || {};
  }

  getCLIConfig(): CLIConfig {
    return this.context.config.cli || {};
  }

  getBackgroundConfig(): BackgroundConfig {
    return this.context.config.background || {};
  }

  // Type-safe configuration access
  get<T>(path: string): T | undefined {
    return this.getNestedValue(this.context.config, path);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

interface GeneralConfig {
  defaultView?: 'list' | 'board' | 'timeline';
  theme?: 'light' | 'dark' | 'auto';
}

interface WidgetConfig {
  showCompletedProjects?: boolean;
  maxProjectsDisplayed?: number;
}

interface CLIConfig {
  outputFormat?: 'table' | 'json' | 'csv';
  confirmDestructiveActions?: boolean;
}

interface BackgroundConfig {
  enableBackgroundSync?: boolean;
  syncInterval?: number;
  deadlineReminders?: boolean;
}
```

## Testing Hybrid Plugins

### Component Testing

```typescript
// tests/ProjectWidget.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectWidget } from '../components/ProjectWidget';
import { createMockPlugin } from '../test-utils/mockPlugin';

describe('ProjectWidget', () => {
  let mockPlugin: ProjectManagerPlugin;
  let mockConfig: ProjectManagerConfig;

  beforeEach(() => {
    mockPlugin = createMockPlugin();
    mockConfig = {
      enableBackgroundSync: true,
      syncInterval: 30,
      defaultProjectTemplate: 'basic',
      notificationSettings: {
        deadlineReminders: true,
        statusUpdates: true
      }
    };
  });

  it('renders project list correctly', async () => {
    const mockProjects = [
      { id: '1', name: 'Test Project', status: 'active', tasks: [] }
    ];
    
    mockPlugin.getProjectService().getProjects.mockResolvedValue(mockProjects);

    render(<ProjectWidget plugin={mockPlugin} config={mockConfig} />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('creates new project when button clicked', async () => {
    render(<ProjectWidget plugin={mockPlugin} config={mockConfig} />);

    // Mock prompt
    global.prompt = jest.fn().mockReturnValue('New Project');

    const createButton = screen.getByText('+ New');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockPlugin.getProjectService().createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: '',
        members: []
      });
    });
  });
});
```

### Integration Testing

```typescript
// tests/integration/hybrid-plugin.test.ts
import { ProjectManagerPlugin } from '../src/index';
import { createTestContext } from '@qirvo/plugin-test-utils';

describe('Hybrid Plugin Integration', () => {
  let plugin: ProjectManagerPlugin;
  let context: PluginRuntimeContext;

  beforeEach(async () => {
    context = createTestContext();
    plugin = new ProjectManagerPlugin();
    await plugin.onInstall(context);
    await plugin.onEnable(context);
  });

  afterEach(async () => {
    await plugin.onDisable();
  });

  it('should share data between CLI and widget', async () => {
    // Create project via service (simulating CLI)
    const projectService = plugin.getProjectService();
    const project = await projectService.createProject({
      name: 'Integration Test Project',
      description: 'Test project for integration',
      members: []
    });

    // Verify project is available to widget
    const projects = await projectService.getProjects();
    expect(projects).toContainEqual(expect.objectContaining({
      name: 'Integration Test Project'
    }));

    // Verify event was emitted
    expect(context.bus.emit).toHaveBeenCalledWith('project.created', {
      project: expect.objectContaining({ name: 'Integration Test Project' })
    });
  });

  it('should handle configuration changes across components', async () => {
    const oldConfig = { enableBackgroundSync: false };
    const newConfig = { enableBackgroundSync: true };

    await plugin.onConfigChange(
      { ...context, config: newConfig },
      oldConfig
    );

    // Verify background service started
    expect(plugin.backgroundService).toBeDefined();
  });
});
```

## Best Practices

### Architecture
1. **Shared Services**: Create reusable services for common functionality
2. **Event-Driven**: Use events for communication between components
3. **Configuration**: Provide unified configuration for all components
4. **Error Handling**: Implement consistent error handling across all entry points

### Development
1. **Code Reuse**: Maximize shared code between components
2. **Type Safety**: Use TypeScript interfaces for all shared data
3. **Testing**: Test each component individually and integration scenarios
4. **Documentation**: Document APIs used by multiple components

### User Experience
1. **Consistency**: Maintain consistent behavior across all interfaces
2. **Data Sync**: Ensure data changes are reflected in all components
3. **Performance**: Optimize shared services for multiple access patterns
4. **Configuration**: Provide intuitive configuration options for all features

---

This completes the plugin-types documentation series. Each guide provides comprehensive coverage of its respective plugin type, with practical examples and best practices for building robust Qirvo plugins.
