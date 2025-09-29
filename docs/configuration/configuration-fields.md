# Configuration Fields

This guide covers how to define, validate, and use configuration fields in your Qirvo plugins. Configuration fields allow users to customize plugin behavior through the Qirvo dashboard.

## Table of Contents

- [Configuration Schema](#configuration-schema)
- [Field Types](#field-types)
- [Validation Rules](#validation-rules)
- [Dynamic Configuration](#dynamic-configuration)
- [Configuration UI](#configuration-ui)
- [Best Practices](#best-practices)

## Configuration Schema

### Basic Schema Structure

Configuration is defined using JSON Schema in your plugin's `manifest.json`:

```json
{
  "manifest_version": 1,
  "name": "My Plugin",
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "Your service API key",
        "format": "password"
      },
      "refreshInterval": {
        "type": "number",
        "title": "Refresh Interval (seconds)",
        "description": "How often to refresh data",
        "minimum": 10,
        "maximum": 3600,
        "default": 300
      },
      "enableNotifications": {
        "type": "boolean",
        "title": "Enable Notifications",
        "description": "Show desktop notifications",
        "default": true
      }
    },
    "required": ["apiKey"],
    "additionalProperties": false
  }
}
```

### Accessing Configuration in Plugin

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

interface MyPluginConfig {
  apiKey: string;
  refreshInterval: number;
  enableNotifications: boolean;
}

export default class MyPlugin extends BasePlugin {
  private config: MyPluginConfig;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.config = this.validateConfig(context.config);
    
    // Use configuration
    if (this.config.enableNotifications) {
      await this.setupNotifications();
    }
    
    this.startPeriodicRefresh(this.config.refreshInterval);
  }

  async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
    const newConfig = this.validateConfig(context.config);
    const oldValidConfig = this.validateConfig(oldConfig);
    
    // Handle configuration changes
    if (newConfig.apiKey !== oldValidConfig.apiKey) {
      await this.reconnectWithNewApiKey(newConfig.apiKey);
    }
    
    if (newConfig.refreshInterval !== oldValidConfig.refreshInterval) {
      this.updateRefreshInterval(newConfig.refreshInterval);
    }
    
    this.config = newConfig;
  }

  private validateConfig(rawConfig: Record<string, any>): MyPluginConfig {
    return {
      apiKey: rawConfig.apiKey || '',
      refreshInterval: rawConfig.refreshInterval || 300,
      enableNotifications: rawConfig.enableNotifications ?? true
    };
  }
}
```

## Field Types

### String Fields

```json
{
  "apiKey": {
    "type": "string",
    "title": "API Key",
    "description": "Your service API key",
    "format": "password",
    "minLength": 10,
    "maxLength": 100,
    "pattern": "^[a-zA-Z0-9_-]+$"
  },
  "serverUrl": {
    "type": "string",
    "title": "Server URL",
    "description": "The server endpoint URL",
    "format": "uri",
    "default": "https://api.example.com"
  },
  "username": {
    "type": "string",
    "title": "Username",
    "description": "Your account username",
    "minLength": 3,
    "maxLength": 50
  }
}
```

#### String Formats

- `"password"` - Masked input field
- `"email"` - Email validation
- `"uri"` - URL validation
- `"date"` - Date picker
- `"time"` - Time picker
- `"color"` - Color picker

### Number Fields

```json
{
  "refreshInterval": {
    "type": "number",
    "title": "Refresh Interval (seconds)",
    "description": "How often to refresh data",
    "minimum": 10,
    "maximum": 3600,
    "default": 300,
    "multipleOf": 10
  },
  "maxItems": {
    "type": "integer",
    "title": "Maximum Items",
    "description": "Maximum number of items to display",
    "minimum": 1,
    "maximum": 100,
    "default": 10
  },
  "timeout": {
    "type": "number",
    "title": "Request Timeout (ms)",
    "description": "HTTP request timeout in milliseconds",
    "minimum": 1000,
    "maximum": 30000,
    "default": 5000
  }
}
```

### Boolean Fields

```json
{
  "enableNotifications": {
    "type": "boolean",
    "title": "Enable Notifications",
    "description": "Show desktop notifications for updates",
    "default": true
  },
  "debugMode": {
    "type": "boolean",
    "title": "Debug Mode",
    "description": "Enable detailed logging for troubleshooting",
    "default": false
  },
  "autoRefresh": {
    "type": "boolean",
    "title": "Auto Refresh",
    "description": "Automatically refresh data in the background",
    "default": true
  }
}
```

### Enum Fields (Select Dropdowns)

```json
{
  "theme": {
    "type": "string",
    "title": "Theme",
    "description": "Visual theme for the plugin",
    "enum": ["light", "dark", "auto"],
    "enumNames": ["Light", "Dark", "Auto"],
    "default": "auto"
  },
  "logLevel": {
    "type": "string",
    "title": "Log Level",
    "description": "Minimum log level to display",
    "enum": ["debug", "info", "warn", "error"],
    "enumNames": ["Debug", "Info", "Warning", "Error"],
    "default": "info"
  },
  "priority": {
    "type": "string",
    "title": "Priority",
    "description": "Task priority level",
    "enum": ["low", "medium", "high", "urgent"],
    "default": "medium"
  }
}
```

### Array Fields

```json
{
  "tags": {
    "type": "array",
    "title": "Tags",
    "description": "List of tags to filter by",
    "items": {
      "type": "string"
    },
    "uniqueItems": true,
    "default": []
  },
  "allowedDomains": {
    "type": "array",
    "title": "Allowed Domains",
    "description": "Domains allowed for API requests",
    "items": {
      "type": "string",
      "format": "hostname"
    },
    "minItems": 1,
    "maxItems": 10,
    "default": ["api.example.com"]
  },
  "priorities": {
    "type": "array",
    "title": "Priority Levels",
    "description": "Available priority levels",
    "items": {
      "type": "string",
      "enum": ["low", "medium", "high", "urgent"]
    },
    "default": ["medium", "high"]
  }
}
```

### Object Fields (Nested Configuration)

```json
{
  "database": {
    "type": "object",
    "title": "Database Configuration",
    "description": "Database connection settings",
    "properties": {
      "host": {
        "type": "string",
        "title": "Host",
        "default": "localhost"
      },
      "port": {
        "type": "integer",
        "title": "Port",
        "minimum": 1,
        "maximum": 65535,
        "default": 5432
      },
      "database": {
        "type": "string",
        "title": "Database Name"
      },
      "ssl": {
        "type": "boolean",
        "title": "Use SSL",
        "default": false
      }
    },
    "required": ["host", "database"],
    "additionalProperties": false
  },
  "notifications": {
    "type": "object",
    "title": "Notification Settings",
    "properties": {
      "email": {
        "type": "boolean",
        "title": "Email Notifications",
        "default": true
      },
      "push": {
        "type": "boolean",
        "title": "Push Notifications",
        "default": false
      },
      "frequency": {
        "type": "string",
        "title": "Frequency",
        "enum": ["immediate", "hourly", "daily"],
        "default": "immediate"
      }
    }
  }
}
```

## Validation Rules

### Built-in Validation

```json
{
  "email": {
    "type": "string",
    "format": "email",
    "title": "Email Address"
  },
  "age": {
    "type": "integer",
    "minimum": 0,
    "maximum": 150,
    "title": "Age"
  },
  "password": {
    "type": "string",
    "minLength": 8,
    "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$",
    "title": "Password",
    "description": "Must contain at least 8 characters with uppercase, lowercase, and number"
  },
  "phoneNumber": {
    "type": "string",
    "pattern": "^\\+?[1-9]\\d{1,14}$",
    "title": "Phone Number",
    "description": "International format (e.g., +1234567890)"
  }
}
```

### Custom Validation in Plugin

```typescript
export default class ValidatedPlugin extends BasePlugin {
  async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
    const validation = this.validateConfiguration(context.config);
    
    if (!validation.valid) {
      // Show validation errors to user
      await this.notify(
        'Configuration Error',
        validation.errors.join(', '),
        'error'
      );
      
      // Log detailed errors
      this.log('error', 'Configuration validation failed:', validation.errors);
      return;
    }
    
    // Configuration is valid, proceed with update
    await this.updateConfiguration(context.config);
  }

  private validateConfiguration(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Custom validation logic
    if (config.apiKey && !this.isValidApiKey(config.apiKey)) {
      errors.push('Invalid API key format');
    }
    
    if (config.serverUrl && !this.isValidUrl(config.serverUrl)) {
      errors.push('Invalid server URL');
    }
    
    if (config.refreshInterval < 10 || config.refreshInterval > 3600) {
      errors.push('Refresh interval must be between 10 and 3600 seconds');
    }
    
    // Cross-field validation
    if (config.enableNotifications && !config.email) {
      errors.push('Email is required when notifications are enabled');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isValidApiKey(apiKey: string): boolean {
    return /^[a-zA-Z0-9_-]{20,}$/.test(apiKey);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
```

## Dynamic Configuration

### Conditional Fields

```json
{
  "type": "object",
  "properties": {
    "authType": {
      "type": "string",
      "title": "Authentication Type",
      "enum": ["apikey", "oauth", "basic"],
      "default": "apikey"
    }
  },
  "allOf": [
    {
      "if": {
        "properties": { "authType": { "const": "apikey" } }
      },
      "then": {
        "properties": {
          "apiKey": {
            "type": "string",
            "title": "API Key",
            "format": "password"
          }
        },
        "required": ["apiKey"]
      }
    },
    {
      "if": {
        "properties": { "authType": { "const": "oauth" } }
      },
      "then": {
        "properties": {
          "clientId": {
            "type": "string",
            "title": "Client ID"
          },
          "clientSecret": {
            "type": "string",
            "title": "Client Secret",
            "format": "password"
          }
        },
        "required": ["clientId", "clientSecret"]
      }
    },
    {
      "if": {
        "properties": { "authType": { "const": "basic" } }
      },
      "then": {
        "properties": {
          "username": {
            "type": "string",
            "title": "Username"
          },
          "password": {
            "type": "string",
            "title": "Password",
            "format": "password"
          }
        },
        "required": ["username", "password"]
      }
    }
  ]
}
```

### Environment-Specific Configuration

```typescript
export default class EnvironmentAwarePlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    const config = this.getEnvironmentConfig(context.config);
    
    // Use environment-specific configuration
    await this.initializeWithConfig(config);
  }

  private getEnvironmentConfig(baseConfig: any): any {
    const environment = process.env.NODE_ENV || 'production';
    
    const environmentDefaults = {
      development: {
        apiUrl: 'http://localhost:3000/api',
        debugMode: true,
        refreshInterval: 10
      },
      staging: {
        apiUrl: 'https://staging-api.example.com',
        debugMode: true,
        refreshInterval: 30
      },
      production: {
        apiUrl: 'https://api.example.com',
        debugMode: false,
        refreshInterval: 300
      }
    };
    
    return {
      ...environmentDefaults[environment],
      ...baseConfig
    };
  }
}
```

## Configuration UI

### Custom UI Components

For complex configuration needs, you can provide custom UI components:

```typescript
// src/components/ConfigurationPanel.tsx
import React, { useState, useEffect } from 'react';

interface ConfigurationPanelProps {
  config: any;
  onChange: (config: any) => void;
  schema: any;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onChange,
  schema
}) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (field: string, value: any) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    
    // Validate and update
    const validation = validateConfig(newConfig, schema);
    setErrors(validation.errors);
    
    if (validation.valid) {
      onChange(newConfig);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch(localConfig.apiUrl, {
        headers: {
          'Authorization': `Bearer ${localConfig.apiKey}`
        }
      });
      
      if (response.ok) {
        alert('Connection successful!');
      } else {
        alert('Connection failed: ' + response.statusText);
      }
    } catch (error) {
      alert('Connection error: ' + error.message);
    }
  };

  return (
    <div className="configuration-panel">
      <h3>Plugin Configuration</h3>
      
      {errors.length > 0 && (
        <div className="error-messages">
          {errors.map((error, index) => (
            <div key={index} className="error-message">{error}</div>
          ))}
        </div>
      )}
      
      <div className="form-group">
        <label>API Key</label>
        <input
          type="password"
          value={localConfig.apiKey || ''}
          onChange={(e) => handleChange('apiKey', e.target.value)}
          placeholder="Enter your API key"
        />
      </div>
      
      <div className="form-group">
        <label>API URL</label>
        <input
          type="url"
          value={localConfig.apiUrl || ''}
          onChange={(e) => handleChange('apiUrl', e.target.value)}
          placeholder="https://api.example.com"
        />
        <button onClick={testConnection}>Test Connection</button>
      </div>
      
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={localConfig.enableNotifications || false}
            onChange={(e) => handleChange('enableNotifications', e.target.checked)}
          />
          Enable Notifications
        </label>
      </div>
    </div>
  );
};

function validateConfig(config: any, schema: any): { valid: boolean; errors: string[] } {
  // Implement JSON Schema validation
  const errors: string[] = [];
  
  if (schema.required) {
    schema.required.forEach((field: string) => {
      if (!config[field]) {
        errors.push(`${field} is required`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Configuration Wizard

```typescript
// src/components/ConfigurationWizard.tsx
import React, { useState } from 'react';

interface WizardStep {
  title: string;
  description: string;
  fields: string[];
}

const wizardSteps: WizardStep[] = [
  {
    title: 'Authentication',
    description: 'Configure your API credentials',
    fields: ['authType', 'apiKey', 'username', 'password']
  },
  {
    title: 'Server Settings',
    description: 'Configure server connection',
    fields: ['serverUrl', 'timeout', 'retries']
  },
  {
    title: 'Preferences',
    description: 'Set your preferences',
    fields: ['theme', 'notifications', 'refreshInterval']
  }
];

export const ConfigurationWizard: React.FC<{
  onComplete: (config: any) => void;
}> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState({});

  const nextStep = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(config);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateConfig = (field: string, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  const step = wizardSteps[currentStep];

  return (
    <div className="configuration-wizard">
      <div className="wizard-header">
        <h2>{step.title}</h2>
        <p>{step.description}</p>
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${((currentStep + 1) / wizardSteps.length) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="wizard-content">
        {/* Render fields for current step */}
        {step.fields.map(field => (
          <ConfigurationField
            key={field}
            field={field}
            value={config[field]}
            onChange={(value) => updateConfig(field, value)}
          />
        ))}
      </div>
      
      <div className="wizard-actions">
        <button onClick={prevStep} disabled={currentStep === 0}>
          Previous
        </button>
        <button onClick={nextStep}>
          {currentStep === wizardSteps.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
};
```

## Best Practices

### Configuration Design

1. **Use Clear Titles and Descriptions**:
   ```json
   {
     "refreshInterval": {
       "type": "number",
       "title": "Refresh Interval",
       "description": "How often to check for updates (in seconds). Lower values use more resources.",
       "minimum": 10,
       "default": 300
     }
   }
   ```

2. **Provide Sensible Defaults**:
   ```json
   {
     "theme": {
       "type": "string",
       "enum": ["light", "dark", "auto"],
       "default": "auto"
     },
     "maxItems": {
       "type": "integer",
       "minimum": 1,
       "maximum": 100,
       "default": 10
     }
   }
   ```

3. **Group Related Fields**:
   ```json
   {
     "authentication": {
       "type": "object",
       "title": "Authentication Settings",
       "properties": {
         "type": { "type": "string", "enum": ["apikey", "oauth"] },
         "apiKey": { "type": "string", "format": "password" }
       }
     },
     "display": {
       "type": "object",
       "title": "Display Settings",
       "properties": {
         "theme": { "type": "string", "enum": ["light", "dark"] },
         "showIcons": { "type": "boolean", "default": true }
       }
     }
   }
   ```

### Security Considerations

1. **Secure Sensitive Data**:
   ```json
   {
     "apiKey": {
       "type": "string",
       "format": "password",
       "title": "API Key",
       "description": "This will be stored securely"
     }
   }
   ```

2. **Validate Input**:
   ```typescript
   private sanitizeConfig(config: any): any {
     return {
       apiKey: this.sanitizeString(config.apiKey),
       serverUrl: this.sanitizeUrl(config.serverUrl),
       maxItems: Math.max(1, Math.min(100, parseInt(config.maxItems) || 10))
     };
   }
   ```

3. **Use Environment Variables for Secrets**:
   ```typescript
   private getApiKey(config: any): string {
     return config.apiKey || process.env.PLUGIN_API_KEY || '';
   }
   ```

### Performance Optimization

1. **Debounce Configuration Changes**:
   ```typescript
   private configUpdateTimer?: NodeJS.Timeout;

   async onConfigChange(context: PluginRuntimeContext): Promise<void> {
     // Debounce rapid configuration changes
     if (this.configUpdateTimer) {
       clearTimeout(this.configUpdateTimer);
     }

     this.configUpdateTimer = setTimeout(async () => {
       await this.applyConfigurationChanges(context.config);
     }, 1000);
   }
   ```

2. **Cache Expensive Operations**:
   ```typescript
   private configCache = new Map<string, any>();

   private getProcessedConfig(rawConfig: any): any {
     const configHash = JSON.stringify(rawConfig);
     
     if (this.configCache.has(configHash)) {
       return this.configCache.get(configHash);
     }
     
     const processed = this.processConfiguration(rawConfig);
     this.configCache.set(configHash, processed);
     
     return processed;
   }
   ```

This comprehensive guide covers all aspects of configuration fields in Qirvo plugins, from basic field types to advanced validation and UI customization.

---

**Next**: [Permissions System](./permissions.md) for security and permissions documentation.
