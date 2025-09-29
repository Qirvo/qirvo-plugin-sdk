# Plugin Types Overview

Qirvo supports several types of plugins, each designed for different use cases and integration points. Understanding these types will help you choose the right approach for your plugin development.

## Plugin Type Categories

### 1. Dashboard Widgets
**Purpose**: Interactive UI components displayed on the Qirvo dashboard  
**Use Cases**: Data visualization, quick actions, status displays  
**Technical**: React components with real-time data integration

### 2. CLI Tools
**Purpose**: Command-line interface extensions for Qirvo CLI  
**Use Cases**: Automation scripts, data processing, system administration  
**Technical**: Node.js modules with command handlers

### 3. Background Services
**Purpose**: Automated tasks running independently  
**Use Cases**: Data synchronization, scheduled operations, monitoring  
**Technical**: Long-running processes with lifecycle management

### 4. Page Extensions
**Purpose**: Full-page applications within Qirvo  
**Use Cases**: Complex workflows, detailed views, configuration interfaces  
**Technical**: React applications with routing integration

### 5. Hybrid Plugins
**Purpose**: Combining multiple plugin types in one package  
**Use Cases**: Comprehensive solutions with UI, CLI, and automation  
**Technical**: Multi-entry point plugins with shared code

## Plugin Type Matrix

| Feature | Dashboard Widget | CLI Tool | Background Service | Page Extension | Hybrid |
|---------|------------------|----------|-------------------|----------------|--------|
| **UI Components** | ✅ Primary | ❌ No | ❌ No | ✅ Primary | ✅ Yes |
| **CLI Commands** | ❌ No | ✅ Primary | ❌ No | ❌ No | ✅ Yes |
| **Background Tasks** | ⚠️ Limited | ⚠️ Limited | ✅ Primary | ⚠️ Limited | ✅ Yes |
| **Full Pages** | ❌ No | ❌ No | ❌ No | ✅ Primary | ✅ Yes |
| **Real-time Updates** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **User Interaction** | ✅ High | ⚠️ CLI Only | ❌ No | ✅ High | ✅ High |
| **System Integration** | ⚠️ Limited | ✅ High | ✅ High | ⚠️ Limited | ✅ High |

## Choosing the Right Type

### Dashboard Widget - When to Use

**✅ Choose Dashboard Widget if you need:**
- Quick data visualization
- Status indicators or metrics
- Simple user interactions
- Real-time data display
- Integration with dashboard layout

**❌ Avoid Dashboard Widget if you need:**
- Complex multi-step workflows
- Full-screen interfaces
- Heavy data processing
- Command-line automation

**Example Use Cases:**
- Weather display widget
- Task counter and quick add
- System status monitor
- Calendar event preview
- Quick note-taking widget

### CLI Tool - When to Use

**✅ Choose CLI Tool if you need:**
- Command-line automation
- Batch data processing
- System administration tasks
- Integration with existing CLI workflows
- Scriptable operations

**❌ Avoid CLI Tool if you need:**
- Visual user interfaces
- Real-time data display
- Complex user interactions
- Dashboard integration

**Example Use Cases:**
- Data export/import commands
- System configuration tools
- Batch file processing
- API testing utilities
- Development workflow automation

### Background Service - When to Use

**✅ Choose Background Service if you need:**
- Scheduled data synchronization
- Continuous monitoring
- Automated workflows
- Event-driven processing
- Long-running operations

**❌ Avoid Background Service if you need:**
- User interaction
- Visual interfaces
- One-time operations
- Manual trigger requirements

**Example Use Cases:**
- Email synchronization service
- File backup automation
- Health data monitoring
- API polling and caching
- Notification processing

### Page Extension - When to Use

**✅ Choose Page Extension if you need:**
- Complex user interfaces
- Multi-step workflows
- Detailed configuration screens
- Full-featured applications
- Custom navigation

**❌ Avoid Page Extension if you need:**
- Simple data display
- Dashboard integration
- Command-line access
- Background processing

**Example Use Cases:**
- Project management interface
- Advanced settings pages
- Data analysis dashboards
- Report generation tools
- Plugin configuration interfaces

### Hybrid Plugin - When to Use

**✅ Choose Hybrid Plugin if you need:**
- Multiple interaction methods
- Comprehensive feature set
- Unified user experience
- Complex integration requirements
- Enterprise-level functionality

**❌ Avoid Hybrid Plugin if you need:**
- Simple, focused functionality
- Quick development cycle
- Minimal resource usage
- Single-purpose tools

**Example Use Cases:**
- Complete CRM integration
- Advanced project management
- Multi-channel communication tools
- Comprehensive analytics platforms
- Enterprise workflow solutions

## Technical Implementation

### Manifest Configuration

Each plugin type requires specific manifest configuration:

```json
{
  "type": "dashboard-widget",
  "dashboard_widget": {
    "name": "My Widget",
    "component": "MyWidget",
    "defaultSize": { "width": 400, "height": 300 }
  }
}
```

```json
{
  "type": "cli-tool",
  "commands": [
    {
      "name": "my-command",
      "description": "My CLI command",
      "usage": "my-command [options]"
    }
  ]
}
```

```json
{
  "type": "service",
  "background": "dist/background.js",
  "hooks": {
    "onInstall": "setupService",
    "onEnable": "startService",
    "onDisable": "stopService"
  }
}
```

### Entry Points

Different plugin types use different entry points:

- **Dashboard Widget**: `web` entry point with React component
- **CLI Tool**: `main` entry point with command handlers
- **Background Service**: `background` entry point with service class
- **Page Extension**: `web` entry point with routing configuration
- **Hybrid**: Multiple entry points with shared utilities

## Performance Considerations

### Resource Usage

| Plugin Type | Memory Usage | CPU Usage | Network Usage | Storage Usage |
|-------------|--------------|-----------|---------------|---------------|
| **Dashboard Widget** | Low-Medium | Low | Low-Medium | Low |
| **CLI Tool** | Low | Medium | Low-High | Low |
| **Background Service** | Medium | Low-High | Low-High | Medium |
| **Page Extension** | Medium-High | Medium | Medium | Medium |
| **Hybrid** | High | Medium-High | Medium-High | High |

### Optimization Tips

**Dashboard Widgets:**
- Use React.memo for expensive components
- Implement proper cleanup in useEffect
- Minimize API calls and cache data
- Use virtual scrolling for large lists

**CLI Tools:**
- Stream large data processing
- Implement progress indicators
- Use worker threads for CPU-intensive tasks
- Cache frequently accessed data

**Background Services:**
- Implement proper error handling and recovery
- Use exponential backoff for retries
- Monitor resource usage
- Implement graceful shutdown

## Development Workflow

### 1. Planning Phase
- Identify primary use case
- Choose appropriate plugin type
- Design user interaction flow
- Plan data integration points

### 2. Development Phase
- Set up development environment
- Implement core functionality
- Add error handling and logging
- Test with different scenarios

### 3. Testing Phase
- Unit test core logic
- Integration test with Qirvo platform
- Performance test under load
- User acceptance testing

### 4. Deployment Phase
- Build and package plugin
- Upload to Qirvo marketplace
- Monitor usage and performance
- Iterate based on feedback

## Migration Between Types

### From Widget to Hybrid
```typescript
// Original widget
export default class MyWidget extends BasePlugin {
  // Widget-specific code
}

// Hybrid version
export default class MyHybridPlugin extends BasePlugin {
  // Shared logic
}

export const widget = {
  component: 'MyWidget',
  // Widget configuration
};

export const commands = [
  // CLI commands
];
```

### From CLI to Service
```typescript
// Original CLI tool
export const commands = [
  createCommand('sync', 'Sync data', syncHandler)
];

// Background service version
export default class SyncService extends BasePlugin {
  async onEnable() {
    // Start scheduled sync
    setInterval(() => this.syncData(), 300000);
  }
  
  private async syncData() {
    // Original sync logic from CLI
  }
}
```

## Best Practices

### Type Selection
1. **Start Simple**: Begin with the simplest type that meets your needs
2. **User-Centered**: Choose based on how users will interact with your plugin
3. **Performance First**: Consider resource implications early
4. **Future-Proof**: Plan for potential feature expansion

### Development
1. **Consistent Architecture**: Use similar patterns across plugin types
2. **Shared Code**: Extract common functionality to utilities
3. **Error Boundaries**: Implement proper error handling for each type
4. **Testing Strategy**: Adapt testing approach to plugin type

### Deployment
1. **Gradual Rollout**: Start with simpler types before hybrid
2. **User Feedback**: Gather feedback specific to interaction patterns
3. **Performance Monitoring**: Track metrics relevant to plugin type
4. **Version Strategy**: Plan updates considering type-specific constraints

---

**Next Steps:**
- [Dashboard Widgets](./dashboard-widgets.md) - Detailed widget development
- [CLI Plugins](./cli-plugins.md) - Command-line tool creation
- [Background Services](./background-services.md) - Service development guide
- [Hybrid Plugins](./hybrid-plugins.md) - Multi-type plugin development
