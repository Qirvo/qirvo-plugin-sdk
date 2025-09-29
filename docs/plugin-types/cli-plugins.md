# CLI Plugins

CLI plugins extend the Qirvo command-line interface with custom commands and automation tools. This guide covers creating powerful command-line extensions for the Qirvo platform.

## Table of Contents

- [CLI Plugin Fundamentals](#cli-plugin-fundamentals)
- [Command Structure](#command-structure)
- [Argument Parsing](#argument-parsing)
- [Plugin Integration](#plugin-integration)
- [Advanced Features](#advanced-features)
- [Testing CLI Plugins](#testing-cli-plugins)

## CLI Plugin Fundamentals

### What are CLI Plugins?

CLI plugins are Node.js modules that:
- Add custom commands to Qirvo CLI
- Provide automation and scripting capabilities
- Integrate with Qirvo's data and services
- Support complex workflows and batch operations

### Basic CLI Plugin Structure

```typescript
import { BasePlugin, PluginRuntimeContext, createCommand } from '@qirvo/plugin-sdk';

export default class MyCLIPlugin extends BasePlugin {
  async onInstall(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'CLI plugin installed');
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'CLI plugin enabled');
    // Register commands or start services
  }
}

// Export commands
export const commands = [
  createCommand('hello', 'Say hello', async (args, context) => {
    const name = args[0] || 'World';
    console.log(`Hello, ${name}!`);
  }),
  
  createCommand('status', 'Show plugin status', async (args, context) => {
    const stats = await context.storage.get('stats');
    console.log('Plugin Status:', stats);
  })
];
```

## Command Structure

### Manifest Configuration

```json
{
  "type": "cli-tool",
  "commands": [
    {
      "name": "data-export",
      "description": "Export data in various formats",
      "usage": "data-export <type> [options]",
      "aliases": ["export"],
      "options": [
        {
          "name": "format",
          "description": "Output format (json, csv, xml)",
          "type": "string",
          "default": "json"
        },
        {
          "name": "output",
          "description": "Output file path",
          "type": "string",
          "required": false
        },
        {
          "name": "verbose",
          "description": "Verbose output",
          "type": "boolean",
          "default": false
        }
      ]
    }
  ]
}
```

### Command Implementation

```typescript
import { createCommand, PluginRuntimeContext } from '@qirvo/plugin-sdk';

export const dataExportCommand = createCommand(
  'data-export',
  'Export data in various formats',
  async (args: string[], context: PluginRuntimeContext) => {
    const options = parseCommandOptions(args);
    
    try {
      console.log('Starting data export...');
      
      const data = await fetchData(options.type, context);
      const formatted = formatData(data, options.format);
      
      if (options.output) {
        await writeToFile(formatted, options.output);
        console.log(`Data exported to ${options.output}`);
      } else {
        console.log(formatted);
      }
      
    } catch (error) {
      console.error('Export failed:', error.message);
      process.exit(1);
    }
  },
  {
    usage: 'data-export <type> [options]',
    aliases: ['export'],
    options: [
      {
        name: 'format',
        description: 'Output format (json, csv, xml)',
        type: 'string',
        default: 'json'
      },
      {
        name: 'output',
        description: 'Output file path',
        type: 'string'
      },
      {
        name: 'verbose',
        description: 'Verbose output',
        type: 'boolean',
        default: false
      }
    ]
  }
);
```

## Argument Parsing

### Simple Argument Parser

```typescript
interface ParsedOptions {
  format: string;
  output?: string;
  verbose: boolean;
  type: string;
}

function parseCommandOptions(args: string[]): ParsedOptions {
  const options: ParsedOptions = {
    format: 'json',
    verbose: false,
    type: args[0] || ''
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--format' || arg === '-f') {
      options.format = args[++i] || 'json';
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}
```

### Advanced Argument Parser

```typescript
import { Command } from 'commander';

export const advancedCommand = createCommand(
  'advanced-export',
  'Advanced data export with full option parsing',
  async (args: string[], context: PluginRuntimeContext) => {
    const program = new Command();
    
    program
      .name('advanced-export')
      .description('Export data with advanced options')
      .argument('<type>', 'Data type to export')
      .option('-f, --format <format>', 'Output format', 'json')
      .option('-o, --output <file>', 'Output file')
      .option('-v, --verbose', 'Verbose output', false)
      .option('--filter <filter>', 'Filter expression')
      .option('--limit <number>', 'Limit results', parseInt)
      .parse(['node', 'script', ...args]);

    const options = program.opts();
    const type = program.args[0];

    await performExport(type, options, context);
  }
);
```

## Plugin Integration

### Data Access

```typescript
export const taskCommand = createCommand(
  'task',
  'Manage tasks from command line',
  async (args: string[], context: PluginRuntimeContext) => {
    const action = args[0];
    
    switch (action) {
      case 'list':
        await listTasks(context);
        break;
      case 'add':
        await addTask(args.slice(1), context);
        break;
      case 'complete':
        await completeTask(args[1], context);
        break;
      default:
        console.log('Usage: task <list|add|complete> [args]');
    }
  }
);

async function listTasks(context: PluginRuntimeContext) {
  try {
    const response = await context.api.http.get('/api/tasks');
    const tasks = await response.json();
    
    console.log('\nTasks:');
    tasks.forEach((task: any, index: number) => {
      const status = task.completed ? '✓' : '○';
      console.log(`${index + 1}. ${status} ${task.title}`);
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error.message);
  }
}

async function addTask(args: string[], context: PluginRuntimeContext) {
  const title = args.join(' ');
  if (!title) {
    console.error('Task title is required');
    return;
  }

  try {
    await context.api.http.post('/api/tasks', {
      title,
      completed: false,
      createdAt: new Date().toISOString()
    });
    
    console.log(`Task "${title}" added successfully`);
  } catch (error) {
    console.error('Failed to add task:', error.message);
  }
}
```

### Configuration Management

```typescript
export const configCommand = createCommand(
  'config',
  'Manage plugin configuration',
  async (args: string[], context: PluginRuntimeContext) => {
    const action = args[0];
    const key = args[1];
    const value = args[2];
    
    switch (action) {
      case 'get':
        if (key) {
          console.log(context.config[key] || 'Not set');
        } else {
          console.log(JSON.stringify(context.config, null, 2));
        }
        break;
        
      case 'set':
        if (!key || value === undefined) {
          console.error('Usage: config set <key> <value>');
          return;
        }
        // Note: This would need to trigger config update
        console.log(`Would set ${key} = ${value}`);
        break;
        
      case 'list':
        Object.entries(context.config).forEach(([k, v]) => {
          console.log(`${k}: ${v}`);
        });
        break;
        
      default:
        console.log('Usage: config <get|set|list> [key] [value]');
    }
  }
);
```

## Advanced Features

### Interactive Commands

```typescript
import inquirer from 'inquirer';

export const interactiveCommand = createCommand(
  'setup',
  'Interactive plugin setup',
  async (args: string[], context: PluginRuntimeContext) => {
    console.log('Welcome to Plugin Setup!\n');
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your API key:',
        validate: (input) => input.length > 0 || 'API key is required'
      },
      {
        type: 'list',
        name: 'environment',
        message: 'Select environment:',
        choices: ['development', 'staging', 'production']
      },
      {
        type: 'confirm',
        name: 'enableLogging',
        message: 'Enable detailed logging?',
        default: true
      }
    ]);

    // Save configuration
    await context.storage.set('config', answers);
    console.log('\nConfiguration saved successfully!');
  }
);
```

### Progress Indicators

```typescript
import ora from 'ora';

export const longRunningCommand = createCommand(
  'sync',
  'Synchronize data with external service',
  async (args: string[], context: PluginRuntimeContext) => {
    const spinner = ora('Starting synchronization...').start();
    
    try {
      spinner.text = 'Fetching remote data...';
      const remoteData = await fetchRemoteData();
      
      spinner.text = 'Processing data...';
      const processedData = await processData(remoteData);
      
      spinner.text = 'Saving to local storage...';
      await context.storage.set('syncedData', processedData);
      
      spinner.succeed('Synchronization completed successfully!');
      console.log(`Processed ${processedData.length} items`);
      
    } catch (error) {
      spinner.fail('Synchronization failed');
      console.error(error.message);
      process.exit(1);
    }
  }
);
```

### File Operations

```typescript
import fs from 'fs/promises';
import path from 'path';

export const fileCommand = createCommand(
  'file',
  'File operations',
  async (args: string[], context: PluginRuntimeContext) => {
    const action = args[0];
    const filePath = args[1];
    
    switch (action) {
      case 'read':
        await readFile(filePath);
        break;
      case 'write':
        await writeFile(filePath, args.slice(2).join(' '));
        break;
      case 'backup':
        await backupFile(filePath, context);
        break;
      default:
        console.log('Usage: file <read|write|backup> <path> [content]');
    }
  }
);

async function readFile(filePath: string) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(content);
  } catch (error) {
    console.error(`Failed to read file: ${error.message}`);
  }
}

async function writeFile(filePath: string, content: string) {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`File written: ${filePath}`);
  } catch (error) {
    console.error(`Failed to write file: ${error.message}`);
  }
}

async function backupFile(filePath: string, context: PluginRuntimeContext) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const backupPath = `${filePath}.backup.${Date.now()}`;
    
    await fs.writeFile(backupPath, content);
    await context.storage.set(`backup:${path.basename(filePath)}`, backupPath);
    
    console.log(`Backup created: ${backupPath}`);
  } catch (error) {
    console.error(`Backup failed: ${error.message}`);
  }
}
```

## Testing CLI Plugins

### Unit Testing Commands

```typescript
import { createMockContext } from '@qirvo/plugin-test-utils';

describe('CLI Commands', () => {
  let mockContext: PluginRuntimeContext;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockContext = createMockContext();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should execute hello command', async () => {
    const command = commands.find(cmd => cmd.name === 'hello');
    await command.handler(['World'], mockContext);
    
    expect(consoleSpy).toHaveBeenCalledWith('Hello, World!');
  });

  it('should handle task list command', async () => {
    mockContext.api.http.get.mockResolvedValue({
      json: () => Promise.resolve([
        { id: 1, title: 'Test Task', completed: false }
      ])
    });

    const command = commands.find(cmd => cmd.name === 'task');
    await command.handler(['list'], mockContext);
    
    expect(mockContext.api.http.get).toHaveBeenCalledWith('/api/tasks');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Task'));
  });
});
```

### Integration Testing

```typescript
import { execSync } from 'child_process';

describe('CLI Integration', () => {
  it('should execute commands via CLI', () => {
    const output = execSync('qirvo hello Test', { encoding: 'utf-8' });
    expect(output.trim()).toBe('Hello, Test!');
  });

  it('should handle command errors', () => {
    expect(() => {
      execSync('qirvo invalid-command', { encoding: 'utf-8' });
    }).toThrow();
  });
});
```

## Best Practices

### Error Handling
1. **Graceful Failures**: Always handle errors gracefully
2. **Exit Codes**: Use appropriate exit codes (0 for success, 1+ for errors)
3. **User-Friendly Messages**: Provide clear error messages
4. **Validation**: Validate inputs before processing

### User Experience
1. **Help Text**: Provide comprehensive help and usage information
2. **Progress Feedback**: Show progress for long-running operations
3. **Confirmation Prompts**: Ask for confirmation on destructive operations
4. **Consistent Interface**: Follow CLI conventions and patterns

### Performance
1. **Lazy Loading**: Load modules only when needed
2. **Streaming**: Use streams for large data processing
3. **Caching**: Cache frequently accessed data
4. **Parallel Processing**: Use async operations where possible

---

**Next**: [Background Services](./background-services.md) for service development.
