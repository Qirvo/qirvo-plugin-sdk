# Weather Widget Tutorial

This comprehensive tutorial walks you through creating a complete weather dashboard widget for Qirvo. You'll learn plugin development fundamentals while building a real-world example.

## What We'll Build

A weather widget that:
- Displays current weather conditions
- Shows 5-day forecast
- Supports multiple locations
- Includes weather alerts
- Provides user configuration options
- Caches data for offline use

## Prerequisites

- Node.js 16+ and npm
- TypeScript knowledge
- React basics (for UI components)
- Weather API key (OpenWeatherMap)

## Project Setup

### 1. Initialize Project

```bash
mkdir qirvo-weather-widget
cd qirvo-weather-widget
npm init -y
npm install @qirvo/plugin-sdk
npm install -D typescript @types/node @types/react
```

### 2. TypeScript Configuration

Create `tsconfig.json`:

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
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Project Structure

```
qirvo-weather-widget/
├── package.json
├── tsconfig.json
├── manifest.json
├── README.md
└── src/
    ├── index.ts
    ├── WeatherWidget.tsx
    ├── types.ts
    └── utils/
        ├── weather-api.ts
        └── cache.ts
```

## Plugin Manifest

Create `manifest.json`:

```json
{
  "manifest_version": 1,
  "name": "Weather Widget",
  "version": "1.0.0",
  "description": "Beautiful weather display with forecasts and alerts",
  "type": "dashboard-widget",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "category": "productivity",
  "permissions": ["network-access", "storage-read", "storage-write", "notifications"],
  "external_services": [
    {
      "name": "OpenWeatherMap",
      "base_url": "https://api.openweathermap.org/data/2.5",
      "api_key_required": true,
      "description": "Weather data provider"
    }
  ],
  "dashboard_widget": {
    "name": "Weather Widget",
    "description": "Current weather and forecast display",
    "component": "WeatherWidget",
    "defaultSize": { "width": 400, "height": 300 },
    "size": "medium"
  },
  "config_schema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "OpenWeatherMap API Key",
        "description": "Get your free API key from openweathermap.org",
        "format": "password"
      },
      "locations": {
        "type": "array",
        "title": "Locations",
        "description": "Cities to display weather for",
        "items": { "type": "string" },
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
      "refreshInterval": {
        "type": "number",
        "title": "Refresh Interval (minutes)",
        "minimum": 5,
        "maximum": 1440,
        "default": 30
      }
    },
    "required": ["apiKey"]
  },
  "main": "dist/index.js",
  "web": "dist/WeatherWidget.js",
  "repository": "https://github.com/yourusername/qirvo-weather-widget",
  "license": "MIT"
}
```

## Type Definitions

Create `src/types.ts`:

```typescript
export interface WeatherData {
  location: string;
  current: {
    temperature: number;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    pressure: number;
  };
  forecast?: ForecastDay[];
  alerts?: WeatherAlert[];
  lastUpdated: string;
}

export interface ForecastDay {
  date: string;
  high: number;
  low: number;
  description: string;
  icon: string;
  precipitation: number;
}

export interface WeatherAlert {
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  start: string;
  end: string;
}

export interface WeatherConfig {
  apiKey: string;
  locations: string[];
  units: 'celsius' | 'fahrenheit';
  showForecast: boolean;
  refreshInterval: number;
}
```

## Weather API Service

Create `src/utils/weather-api.ts`:

```typescript
import { WeatherData, ForecastDay, WeatherAlert } from '../types';

export class WeatherAPI {
  constructor(private apiKey: string, private units: 'celsius' | 'fahrenheit' = 'celsius') {}

  async getCurrentWeather(location: string): Promise<WeatherData> {
    const unitsParam = this.units === 'celsius' ? 'metric' : 'imperial';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=${unitsParam}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      location: data.name,
      current: {
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure
      },
      lastUpdated: new Date().toISOString()
    };
  }

  async getForecast(location: string): Promise<ForecastDay[]> {
    const unitsParam = this.units === 'celsius' ? 'metric' : 'imperial';
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=${unitsParam}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Group by day and get daily highs/lows
    const dailyForecasts = new Map<string, any>();
    
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toDateString();
      
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, {
          date,
          temps: [item.main.temp],
          descriptions: [item.weather[0].description],
          icons: [item.weather[0].icon],
          precipitation: item.rain?.['3h'] || 0
        });
      } else {
        const day = dailyForecasts.get(date);
        day.temps.push(item.main.temp);
        day.descriptions.push(item.weather[0].description);
        day.icons.push(item.weather[0].icon);
        day.precipitation += item.rain?.['3h'] || 0;
      }
    });

    return Array.from(dailyForecasts.values()).slice(0, 5).map(day => ({
      date: day.date,
      high: Math.round(Math.max(...day.temps)),
      low: Math.round(Math.min(...day.temps)),
      description: day.descriptions[0],
      icon: day.icons[0],
      precipitation: Math.round(day.precipitation)
    }));
  }

  async getWeatherAlerts(location: string): Promise<WeatherAlert[]> {
    // Note: Weather alerts require a different API endpoint or service
    // This is a simplified implementation
    try {
      const url = `https://api.openweathermap.org/data/2.5/onecall?q=${encodeURIComponent(location)}&appid=${this.apiKey}&exclude=minutely,hourly`;
      const response = await fetch(url);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      
      return (data.alerts || []).map((alert: any) => ({
        title: alert.event,
        description: alert.description,
        severity: this.mapSeverity(alert.tags),
        start: new Date(alert.start * 1000).toISOString(),
        end: new Date(alert.end * 1000).toISOString()
      }));
    } catch (error) {
      console.warn('Failed to fetch weather alerts:', error);
      return [];
    }
  }

  private mapSeverity(tags: string[]): WeatherAlert['severity'] {
    if (tags.includes('Extreme')) return 'extreme';
    if (tags.includes('Severe')) return 'severe';
    if (tags.includes('Moderate')) return 'moderate';
    return 'minor';
  }
}
```

## Cache Utility

Create `src/utils/cache.ts`:

```typescript
import { WeatherData } from '../types';

export class WeatherCache {
  constructor(private storage: any, private ttl: number = 30 * 60 * 1000) {} // 30 minutes default

  async get(location: string): Promise<WeatherData | null> {
    try {
      const cacheKey = `weather_${location.toLowerCase()}`;
      const cached = await this.storage.get(cacheKey);
      
      if (!cached) return null;
      
      const age = Date.now() - new Date(cached.lastUpdated).getTime();
      if (age > this.ttl) {
        await this.storage.delete(cacheKey);
        return null;
      }
      
      return cached;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  async set(location: string, data: WeatherData): Promise<void> {
    try {
      const cacheKey = `weather_${location.toLowerCase()}`;
      await this.storage.set(cacheKey, {
        ...data,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.storage.keys();
      const weatherKeys = keys.filter((key: string) => key.startsWith('weather_'));
      
      for (const key of weatherKeys) {
        await this.storage.delete(key);
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }
}
```

## Main Plugin Class

Create `src/index.ts`:

```typescript
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';
import { WeatherAPI } from './utils/weather-api';
import { WeatherCache } from './utils/cache';
import { WeatherConfig, WeatherData } from './types';

export default class WeatherPlugin extends BasePlugin {
  private weatherAPI?: WeatherAPI;
  private cache?: WeatherCache;
  private refreshTimer?: NodeJS.Timeout;

  async onInstall(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Weather plugin installed');
    
    await this.setStorage('installDate', new Date().toISOString());
    await this.notify('Weather Plugin', 'Successfully installed! Configure your API key to get started.', 'success');
  }

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.log('info', 'Weather plugin enabled');
    
    const config = context.config as WeatherConfig;
    
    if (!config.apiKey) {
      await this.notify('Configuration Required', 'Please set your OpenWeatherMap API key in plugin settings.', 'warning');
      return;
    }

    // Initialize services
    this.weatherAPI = new WeatherAPI(config.apiKey, config.units);
    this.cache = new WeatherCache(context.storage, config.refreshInterval * 60 * 1000);
    
    // Start refresh timer
    this.startRefreshTimer(config.refreshInterval);
    
    // Initial data fetch
    await this.refreshAllLocations();
  }

  async onDisable(): Promise<void> {
    this.log('info', 'Weather plugin disabled');
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
    const newConfig = context.config as WeatherConfig;
    const oldWeatherConfig = oldConfig as WeatherConfig;
    
    // Reinitialize API if key or units changed
    if (newConfig.apiKey !== oldWeatherConfig.apiKey || newConfig.units !== oldWeatherConfig.units) {
      this.weatherAPI = new WeatherAPI(newConfig.apiKey, newConfig.units);
      await this.cache?.clear(); // Clear cache when units change
    }
    
    // Update refresh timer if interval changed
    if (newConfig.refreshInterval !== oldWeatherConfig.refreshInterval) {
      this.startRefreshTimer(newConfig.refreshInterval);
    }
    
    // Refresh data if locations changed
    if (JSON.stringify(newConfig.locations) !== JSON.stringify(oldWeatherConfig.locations)) {
      await this.refreshAllLocations();
    }
    
    this.log('info', 'Weather plugin configuration updated');
  }

  private startRefreshTimer(intervalMinutes: number): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = setInterval(async () => {
      await this.refreshAllLocations();
    }, intervalMinutes * 60 * 1000);
  }

  private async refreshAllLocations(): Promise<void> {
    const config = this.context.config as WeatherConfig;
    
    if (!this.weatherAPI || !config.locations.length) return;
    
    for (const location of config.locations) {
      try {
        await this.refreshLocation(location);
      } catch (error) {
        this.log('error', `Failed to refresh weather for ${location}:`, error);
      }
    }
  }

  private async refreshLocation(location: string): Promise<void> {
    if (!this.weatherAPI || !this.cache) return;
    
    try {
      // Get current weather
      const weatherData = await this.weatherAPI.getCurrentWeather(location);
      
      // Get forecast if enabled
      const config = this.context.config as WeatherConfig;
      if (config.showForecast) {
        weatherData.forecast = await this.weatherAPI.getForecast(location);
      }
      
      // Get alerts
      weatherData.alerts = await this.weatherAPI.getWeatherAlerts(location);
      
      // Cache the data
      await this.cache.set(location, weatherData);
      
      // Notify about severe weather alerts
      if (weatherData.alerts?.some(alert => alert.severity === 'severe' || alert.severity === 'extreme')) {
        await this.notify('Weather Alert', `Severe weather alert for ${location}`, 'warning');
      }
      
      this.log('info', `Weather data refreshed for ${location}`);
    } catch (error) {
      this.log('error', `Failed to fetch weather for ${location}:`, error);
      throw error;
    }
  }

  // Public method for widget to get weather data
  async getWeatherData(location: string): Promise<WeatherData | null> {
    if (!this.cache) return null;
    
    // Try cache first
    let data = await this.cache.get(location);
    
    // If not cached or stale, fetch fresh data
    if (!data && this.weatherAPI) {
      try {
        await this.refreshLocation(location);
        data = await this.cache.get(location);
      } catch (error) {
        this.log('error', `Failed to get weather data for ${location}:`, error);
      }
    }
    
    return data;
  }

  // Public method for manual refresh
  async refreshWeather(): Promise<void> {
    await this.refreshAllLocations();
    await this.notify('Weather Updated', 'Weather data has been refreshed', 'info');
  }
}

export { WeatherPlugin };
```

## React Widget Component

Create `src/WeatherWidget.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { WeatherData, WeatherConfig } from './types';

interface WeatherWidgetProps {
  plugin: any; // Plugin instance
  config: WeatherConfig;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ plugin, config }) => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(0);

  useEffect(() => {
    loadWeatherData();
  }, [config.locations]);

  const loadWeatherData = async () => {
    if (!config.locations.length) {
      setError('No locations configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await Promise.all(
        config.locations.map(location => plugin.getWeatherData(location))
      );
      
      setWeatherData(data.filter(Boolean));
    } catch (err) {
      setError('Failed to load weather data');
      console.error('Weather widget error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await plugin.refreshWeather();
      await loadWeatherData();
    } catch (err) {
      setError('Failed to refresh weather data');
    } finally {
      setLoading(false);
    }
  };

  const formatTemperature = (temp: number) => {
    const unit = config.units === 'celsius' ? '°C' : '°F';
    return `${temp}${unit}`;
  };

  if (loading) {
    return (
      <div className="weather-widget loading">
        <div className="spinner"></div>
        <p>Loading weather...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget error">
        <p>{error}</p>
        <button onClick={loadWeatherData}>Retry</button>
      </div>
    );
  }

  if (!weatherData.length) {
    return (
      <div className="weather-widget no-data">
        <p>No weather data available</p>
        <button onClick={handleRefresh}>Refresh</button>
      </div>
    );
  }

  const currentWeather = weatherData[selectedLocation];

  return (
    <div className="weather-widget">
      <div className="weather-header">
        {weatherData.length > 1 && (
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(Number(e.target.value))}
            className="location-selector"
          >
            {weatherData.map((data, index) => (
              <option key={index} value={index}>{data.location}</option>
            ))}
          </select>
        )}
        <button onClick={handleRefresh} className="refresh-btn" title="Refresh">
          🔄
        </button>
      </div>

      <div className="current-weather">
        <div className="weather-main">
          <img 
            src={`https://openweathermap.org/img/w/${currentWeather.current.icon}.png`}
            alt={currentWeather.current.description}
            className="weather-icon"
          />
          <div className="temperature">
            {formatTemperature(currentWeather.current.temperature)}
          </div>
        </div>
        <div className="weather-details">
          <p className="description">{currentWeather.current.description}</p>
          <div className="details-grid">
            <span>Humidity: {currentWeather.current.humidity}%</span>
            <span>Wind: {currentWeather.current.windSpeed} m/s</span>
            <span>Pressure: {currentWeather.current.pressure} hPa</span>
          </div>
        </div>
      </div>

      {currentWeather.alerts && currentWeather.alerts.length > 0 && (
        <div className="weather-alerts">
          {currentWeather.alerts.map((alert, index) => (
            <div key={index} className={`alert alert-${alert.severity}`}>
              <strong>{alert.title}</strong>
              <p>{alert.description}</p>
            </div>
          ))}
        </div>
      )}

      {config.showForecast && currentWeather.forecast && (
        <div className="weather-forecast">
          <h4>5-Day Forecast</h4>
          <div className="forecast-grid">
            {currentWeather.forecast.map((day, index) => (
              <div key={index} className="forecast-day">
                <div className="day-name">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </div>
                <img 
                  src={`https://openweathermap.org/img/w/${day.icon}.png`}
                  alt={day.description}
                  className="forecast-icon"
                />
                <div className="forecast-temps">
                  <span className="high">{formatTemperature(day.high)}</span>
                  <span className="low">{formatTemperature(day.low)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weather-footer">
        <small>
          Last updated: {new Date(currentWeather.lastUpdated).toLocaleTimeString()}
        </small>
      </div>
    </div>
  );
};

export default WeatherWidget;
```

## Build and Package

Update `package.json`:

```json
{
  "name": "qirvo-weather-widget",
  "version": "1.0.0",
  "description": "Weather dashboard widget for Qirvo",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rimraf dist",
    "package": "npm run clean && npm run build && npm pack"
  },
  "dependencies": {
    "@qirvo/plugin-sdk": "^2.0.7"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "rimraf": "^5.0.0"
  }
}
```

Build and package:

```bash
npm run package
```

## Testing and Deployment

1. **Test Locally**: Upload the `.tgz` file to your Qirvo dashboard
2. **Configure**: Set your OpenWeatherMap API key and locations
3. **Verify**: Check that weather data loads and updates correctly
4. **Publish**: Submit to the Qirvo marketplace

## Next Steps

- Add CSS styling for better appearance
- Implement error retry logic
- Add more weather providers
- Create unit tests
- Add internationalization support

This tutorial demonstrates core plugin development concepts including API integration, caching, configuration, and React components. Use it as a foundation for building more complex plugins!
