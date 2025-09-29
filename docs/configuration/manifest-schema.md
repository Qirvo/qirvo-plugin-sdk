# Plugin Manifest Schema

The plugin manifest (`manifest.json`) is the configuration file that defines your plugin's metadata, capabilities, and integration points with the Qirvo platform. This document provides a complete reference for all manifest fields.

## Table of Contents

- [Basic Structure](#basic-structure)
- [Required Fields](#required-fields)
- [Plugin Types](#plugin-types)
- [Author Information](#author-information)
- [Permissions](#permissions)
- [Entry Points](#entry-points)
- [UI Integration](#ui-integration)
- [External Services](#external-services)
- [Commands](#commands)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Configuration Schema](#configuration-schema)
- [Validation](#validation)

## Basic Structure

```json
{
  "manifest_version": 1,
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "type": "dashboard-widget",
  "author": {
    "name": "Developer Name",
    "email": "dev@example.com"
  },
  "category": "productivity",
  "permissions": ["storage", "network"],
  "main": "dist/index.js",
  "repository": "https://github.com/user/plugin",
  "license": "MIT"
}
```

## Required Fields

### manifest_version
**Type**: `number`  
**Required**: Yes  
**Description**: Manifest format version. Currently must be `1`.

```json
{
  "manifest_version": 1
}
```

### name
**Type**: `string`  
**Required**: Yes  
**Description**: Human-readable plugin name displayed in the UI.

**Constraints**:
- 3-50 characters
- Must be unique in the marketplace
- No special characters except spaces, hyphens, and underscores

```json
{
  "name": "Weather Dashboard Widget"
}
```

### version
**Type**: `string`  
**Required**: Yes  
**Description**: Plugin version following semantic versioning (semver).

**Format**: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

```json
{
  "version": "1.0.0"
}
```

### description
**Type**: `string`  
**Required**: Yes  
**Description**: Brief description of plugin functionality.

**Constraints**:
- 10-500 characters
- Should clearly explain what the plugin does

```json
{
  "description": "Displays current weather conditions and forecasts on your dashboard"
}
```

### type
**Type**: `string`  
**Required**: Yes  
**Description**: Primary plugin type determining integration points.

**Valid Values**:
- `"dashboard-widget"` - Dashboard UI component
- `"cli-tool"` - Command-line interface extension
- `"service"` - Background service
- `"page"` - Full-page application
- `"hybrid"` - Multiple integration types

```json
{
  "type": "dashboard-widget"
}
```

### author
**Type**: `string | object`  
**Required**: Yes  
**Description**: Plugin author information.

**String Format**:
```json
{
  "author": "John Doe <john@example.com>"
}
```

**Object Format**:
```json
{
  "author": {
    "name": "John Doe",
    "email": "john@example.com",
    "website": "https://johndoe.dev",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

### category
**Type**: `string`  
**Required**: Yes  
**Description**: Plugin category for marketplace organization.

**Valid Values**:
- `"productivity"` - Task management, notes, calendars
- `"communication"` - Chat, email, notifications
- `"utilities"` - System tools, converters, calculators
- `"integrations"` - Third-party service connections
- `"ai"` - AI-powered features
- `"health"` - Health and fitness tracking
- `"finance"` - Financial tools and tracking
- `"entertainment"` - Games, media, fun tools
- `"education"` - Learning and educational tools
- `"other"` - Miscellaneous plugins

```json
{
  "category": "productivity"
}
```

### permissions
**Type**: `string[] | object[]`  
**Required**: Yes  
**Description**: Permissions required by the plugin.

**String Array Format**:
```json
{
  "permissions": ["storage", "network", "notifications"]
}
```

**Object Array Format**:
```json
{
  "permissions": [
    {
      "type": "network",
      "description": "Access weather API",
      "required": true
    },
    {
      "type": "storage",
      "description": "Cache weather data",
      "required": true
    },
    {
      "type": "notifications",
      "description": "Weather alerts",
      "required": false
    }
  ]
}
```

**Available Permissions**:
- `"network-access"` - HTTP requests to external APIs
- `"storage-read"` - Read from plugin storage
- `"storage-write"` - Write to plugin storage
- `"filesystem-access"` - File system operations
- `"notifications"` - Display notifications
- `"clipboard-read"` - Read clipboard content
- `"clipboard-write"` - Write to clipboard
- `"geolocation"` - Access location services
- `"camera"` - Camera access
- `"microphone"` - Microphone access
- `"calendar"` - Calendar integration
- `"contacts"` - Contact list access

## Plugin Types

### Dashboard Widget

For `"type": "dashboard-widget"`, include widget configuration:

```json
{
  "type": "dashboard-widget",
  "dashboard_widget": {
    "name": "Weather Widget",
    "description": "Current weather display",
    "component": "WeatherWidget",
    "defaultSize": { "width": 400, "height": 300 },
    "size": "medium",
    "position": "sidebar",
    "configSchema": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "title": "Location",
          "description": "City name for weather data"
        },
        "units": {
          "type": "string",
          "title": "Temperature Units",
          "enum": ["celsius", "fahrenheit"],
          "default": "celsius"
        }
      },
      "required": ["location"]
    }
  }
}
```

**Widget Fields**:
- `name` - Widget display name
- `description` - Widget description
- `component` - React component name
- `defaultSize` - Default dimensions `{ width, height }`
- `size` - Size category: `"small"`, `"medium"`, `"large"`
- `position` - Preferred position: `"sidebar"`, `"main"`, `"floating"`
- `configSchema` - JSON Schema for widget configuration

### CLI Tool

For `"type": "cli-tool"`, include command definitions:

```json
{
  "type": "cli-tool",
  "commands": [
    {
      "name": "weather",
      "description": "Get weather information",
      "usage": "weather [location]",
      "aliases": ["w"],
      "options": [
        {
          "name": "units",
          "description": "Temperature units",
          "type": "string",
          "default": "celsius"
        },
        {
          "name": "forecast",
          "description": "Show forecast",
          "type": "boolean",
          "default": false
        }
      ]
    }
  ]
}
```

### Background Service

For `"type": "service"`, include service configuration:

```json
{
  "type": "service",
  "background": "dist/background.js",
  "hooks": {
    "onInstall": "setupService",
    "onEnable": "startService",
    "onDisable": "stopService",
    "onUninstall": "cleanupService"
  }
}
```

### Page Extension

For `"type": "page"`, include page definitions:

```json
{
  "type": "page",
  "pages": [
    {
      "name": "settings",
      "path": "/plugins/weather/settings",
      "component": "SettingsPage",
      "title": "Weather Settings",
      "description": "Configure weather plugin",
      "icon": "settings"
    }
  ],
  "menu_items": [
    {
      "label": "Weather",
      "path": "/plugins/weather",
      "icon": "cloud",
      "order": 100
    }
  ]
}
```

### Hybrid Plugin

For `"type": "hybrid"`, combine multiple configurations:

```json
{
  "type": "hybrid",
  "dashboard_widget": {
    "name": "Weather Widget",
    "component": "WeatherWidget",
    "defaultSize": { "width": 400, "height": 300 }
  },
  "commands": [
    {
      "name": "weather",
      "description": "Get weather via CLI",
      "usage": "weather [location]"
    }
  ],
  "pages": [
    {
      "name": "settings",
      "path": "/plugins/weather/settings",
      "component": "SettingsPage",
      "title": "Weather Settings"
    }
  ]
}
```

## Entry Points

Define how your plugin code is loaded:

### main
**Type**: `string`  
**Description**: Primary entry point for CLI tools and services.

```json
{
  "main": "dist/index.js"
}
```

### web
**Type**: `string`  
**Description**: Entry point for web UI components.

```json
{
  "web": "dist/web.js"
}
```

### background
**Type**: `string`  
**Description**: Entry point for background services.

```json
{
  "background": "dist/background.js"
}
```

## External Services

Define third-party API integrations:

```json
{
  "external_services": [
    {
      "name": "OpenWeatherMap",
      "base_url": "https://api.openweathermap.org/data/2.5",
      "api_key_required": true,
      "description": "Weather data provider",
      "documentation": "https://openweathermap.org/api"
    },
    {
      "name": "Geocoding Service",
      "base_url": "https://api.geocoding.com/v1",
      "api_key_required": false,
      "description": "Location coordinate lookup"
    }
  ]
}
```

**Service Fields**:
- `name` - Service display name
- `base_url` - API base URL
- `api_key_required` - Whether API key is needed
- `description` - Service description
- `documentation` - Link to API documentation

## Webhooks and OAuth

### Webhooks

```json
{
  "webhooks": [
    {
      "name": "weather_alerts",
      "endpoint": "/webhooks/weather-alerts",
      "events": ["severe_weather", "daily_forecast"],
      "description": "Receive weather alerts"
    }
  ]
}
```

### OAuth Integration

```json
{
  "oauth": [
    {
      "provider": "google",
      "scopes": ["calendar.readonly", "profile"],
      "redirect_uri": "/oauth/google/callback",
      "description": "Google Calendar integration"
    }
  ]
}
```

## Configuration Schema

Define user-configurable settings using JSON Schema:

```json
{
  "config_schema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "Your weather API key",
        "format": "password"
      },
      "defaultLocation": {
        "type": "string",
        "title": "Default Location",
        "description": "Default city for weather data",
        "default": "New York"
      },
      "refreshInterval": {
        "type": "number",
        "title": "Refresh Interval (minutes)",
        "description": "How often to update weather data",
        "minimum": 5,
        "maximum": 1440,
        "default": 30
      },
      "showForecast": {
        "type": "boolean",
        "title": "Show Forecast",
        "description": "Display weather forecast",
        "default": true
      },
      "units": {
        "type": "string",
        "title": "Temperature Units",
        "enum": ["celsius", "fahrenheit", "kelvin"],
        "enumNames": ["Celsius (°C)", "Fahrenheit (°F)", "Kelvin (K)"],
        "default": "celsius"
      }
    },
    "required": ["apiKey", "defaultLocation"]
  },
  "default_config": {
    "defaultLocation": "New York",
    "refreshInterval": 30,
    "showForecast": true,
    "units": "celsius"
  }
}
```

**Supported Field Types**:
- `string` - Text input
- `number` - Numeric input
- `boolean` - Checkbox
- `array` - List of values
- `object` - Nested configuration

**Field Properties**:
- `title` - Display label
- `description` - Help text
- `default` - Default value
- `enum` - Allowed values
- `enumNames` - Display names for enum values
- `minimum`/`maximum` - Numeric constraints
- `format` - Input format (`password`, `email`, `url`, etc.)

## Optional Fields

### Repository Information

```json
{
  "repository": "https://github.com/user/weather-plugin",
  "homepage": "https://github.com/user/weather-plugin#readme",
  "bugs": "https://github.com/user/weather-plugin/issues"
}
```

### Dependencies

```json
{
  "dependencies": {
    "axios": "^1.0.0",
    "lodash": "^4.17.21"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

### Engine Requirements

```json
{
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

### Keywords and Tags

```json
{
  "keywords": ["weather", "forecast", "dashboard", "widget"],
  "tags": ["weather", "api", "ui"]
}
```

### Versioning Constraints

```json
{
  "minQirvoVersion": "2.0.0",
  "maxQirvoVersion": "3.0.0"
}
```

## Validation

### Built-in Validation

The SDK provides manifest validation:

```typescript
import { validateManifest } from '@qirvo/plugin-sdk';

const manifest = require('./manifest.json');
const validation = validateManifest(manifest);

if (!validation.valid) {
  console.error('Manifest errors:', validation.errors);
  console.warn('Manifest warnings:', validation.warnings);
}
```

### Custom Validation

```typescript
function validateWeatherManifest(manifest: any): boolean {
  // Check required external services
  if (!manifest.external_services?.some(s => s.name === 'OpenWeatherMap')) {
    throw new Error('Weather plugin requires OpenWeatherMap service');
  }
  
  // Check required permissions
  const requiredPermissions = ['network-access', 'storage-read', 'storage-write'];
  const hasPermissions = requiredPermissions.every(perm => 
    manifest.permissions.includes(perm)
  );
  
  if (!hasPermissions) {
    throw new Error('Weather plugin requires network and storage permissions');
  }
  
  return true;
}
```

## Complete Example

Here's a complete manifest for a weather widget plugin:

```json
{
  "manifest_version": 1,
  "name": "Advanced Weather Widget",
  "version": "2.1.0",
  "description": "Comprehensive weather dashboard widget with forecasts, alerts, and multiple locations",
  "type": "hybrid",
  "author": {
    "name": "Weather Dev Team",
    "email": "team@weatherdev.com",
    "website": "https://weatherdev.com",
    "avatar": "https://weatherdev.com/avatar.png"
  },
  "category": "productivity",
  "keywords": ["weather", "forecast", "dashboard", "alerts", "climate"],
  "tags": ["weather", "api", "ui", "notifications"],
  
  "permissions": [
    {
      "type": "network-access",
      "description": "Fetch weather data from APIs",
      "required": true
    },
    {
      "type": "storage-read",
      "description": "Read cached weather data",
      "required": true
    },
    {
      "type": "storage-write",
      "description": "Cache weather data for offline use",
      "required": true
    },
    {
      "type": "notifications",
      "description": "Send weather alerts and updates",
      "required": false
    },
    {
      "type": "geolocation",
      "description": "Auto-detect user location",
      "required": false
    }
  ],
  
  "external_services": [
    {
      "name": "OpenWeatherMap",
      "base_url": "https://api.openweathermap.org/data/2.5",
      "api_key_required": true,
      "description": "Primary weather data provider",
      "documentation": "https://openweathermap.org/api"
    },
    {
      "name": "WeatherAPI",
      "base_url": "https://api.weatherapi.com/v1",
      "api_key_required": true,
      "description": "Alternative weather data provider"
    }
  ],
  
  "dashboard_widget": {
    "name": "Weather Widget",
    "description": "Advanced weather display with forecasts",
    "component": "WeatherWidget",
    "defaultSize": { "width": 450, "height": 350 },
    "size": "large",
    "position": "main",
    "configSchema": {
      "type": "object",
      "properties": {
        "apiProvider": {
          "type": "string",
          "title": "Weather API Provider",
          "enum": ["openweathermap", "weatherapi"],
          "enumNames": ["OpenWeatherMap", "WeatherAPI"],
          "default": "openweathermap"
        },
        "apiKey": {
          "type": "string",
          "title": "API Key",
          "description": "Your weather API key",
          "format": "password"
        },
        "locations": {
          "type": "array",
          "title": "Locations",
          "description": "Cities to display weather for",
          "items": {
            "type": "string"
          },
          "default": ["New York"]
        },
        "units": {
          "type": "string",
          "title": "Temperature Units",
          "enum": ["celsius", "fahrenheit"],
          "enumNames": ["Celsius (°C)", "Fahrenheit (°F)"],
          "default": "celsius"
        },
        "showForecast": {
          "type": "boolean",
          "title": "Show 5-Day Forecast",
          "default": true
        },
        "enableAlerts": {
          "type": "boolean",
          "title": "Weather Alerts",
          "description": "Receive severe weather notifications",
          "default": false
        },
        "refreshInterval": {
          "type": "number",
          "title": "Refresh Interval (minutes)",
          "minimum": 5,
          "maximum": 1440,
          "default": 30
        }
      },
      "required": ["apiKey", "locations"]
    }
  },
  
  "commands": [
    {
      "name": "weather",
      "description": "Get current weather information",
      "usage": "weather [location] [options]",
      "aliases": ["w"],
      "options": [
        {
          "name": "location",
          "description": "City name",
          "type": "string",
          "required": false
        },
        {
          "name": "units",
          "description": "Temperature units (c/f)",
          "type": "string",
          "default": "c"
        },
        {
          "name": "forecast",
          "description": "Show 5-day forecast",
          "type": "boolean",
          "default": false
        }
      ]
    },
    {
      "name": "weather-alert",
      "description": "Set up weather alerts",
      "usage": "weather-alert <location> [severity]",
      "options": [
        {
          "name": "severity",
          "description": "Alert severity (low/medium/high)",
          "type": "string",
          "default": "medium"
        }
      ]
    }
  ],
  
  "pages": [
    {
      "name": "settings",
      "path": "/plugins/weather/settings",
      "component": "WeatherSettings",
      "title": "Weather Settings",
      "description": "Configure weather plugin",
      "icon": "settings"
    },
    {
      "name": "history",
      "path": "/plugins/weather/history",
      "component": "WeatherHistory",
      "title": "Weather History",
      "description": "View historical weather data",
      "icon": "history"
    }
  ],
  
  "menu_items": [
    {
      "label": "Weather",
      "path": "/plugins/weather",
      "icon": "cloud",
      "order": 50,
      "parent": "plugins"
    }
  ],
  
  "webhooks": [
    {
      "name": "weather_alerts",
      "endpoint": "/webhooks/weather-alerts",
      "events": ["severe_weather", "storm_warning"],
      "description": "Receive weather alert notifications"
    }
  ],
  
  "hooks": {
    "onInstall": "setupWeatherPlugin",
    "onEnable": "startWeatherUpdates",
    "onDisable": "stopWeatherUpdates",
    "onUpdate": "migrateWeatherData"
  },
  
  "config_schema": {
    "type": "object",
    "properties": {
      "theme": {
        "type": "string",
        "title": "Widget Theme",
        "enum": ["light", "dark", "auto"],
        "default": "auto"
      },
      "animations": {
        "type": "boolean",
        "title": "Enable Animations",
        "default": true
      }
    }
  },
  
  "default_config": {
    "apiProvider": "openweathermap",
    "locations": ["New York"],
    "units": "celsius",
    "showForecast": true,
    "enableAlerts": false,
    "refreshInterval": 30,
    "theme": "auto",
    "animations": true
  },
  
  "main": "dist/index.js",
  "web": "dist/web.js",
  "background": "dist/background.js",
  
  "dependencies": {
    "axios": "^1.6.0",
    "date-fns": "^2.30.0"
  },
  
  "repository": "https://github.com/weatherdev/qirvo-weather-plugin",
  "homepage": "https://github.com/weatherdev/qirvo-weather-plugin#readme",
  "bugs": "https://github.com/weatherdev/qirvo-weather-plugin/issues",
  "license": "MIT",
  
  "engines": {
    "node": ">=16.0.0"
  },
  
  "minQirvoVersion": "2.0.0"
}
```

---

**Next**: [Configuration Fields](./configuration-fields.md) for detailed configuration options.
