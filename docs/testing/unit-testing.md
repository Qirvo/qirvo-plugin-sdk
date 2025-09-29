# Unit Testing Guide

This guide covers comprehensive unit testing strategies for Qirvo plugins, including testing frameworks, mocking techniques, and best practices for ensuring code quality and reliability.

## Table of Contents

- [Testing Framework Setup](#testing-framework-setup)
- [Basic Unit Tests](#basic-unit-tests)
- [Mocking Dependencies](#mocking-dependencies)
- [Testing React Components](#testing-react-components)
- [Testing Async Operations](#testing-async-operations)
- [Coverage and Reporting](#coverage-and-reporting)

## Testing Framework Setup

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Test Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock fetch globally
global.fetch = jest.fn();

// Mock Qirvo SDK
jest.mock('@qirvo/plugin-sdk', () => ({
  BasePlugin: class MockBasePlugin {
    log = jest.fn();
    getStorage = jest.fn();
    setStorage = jest.fn();
  },
  PluginRuntimeContext: {}
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

## Basic Unit Tests

### Testing Plugin Classes

```typescript
// src/weatherPlugin.ts
import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';

export interface WeatherData {
  temperature: number;
  description: string;
  location: string;
}

export class WeatherPlugin extends BasePlugin {
  private apiKey: string = '';

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.apiKey = context.config.apiKey;
    if (!this.apiKey) {
      throw new Error('API key is required');
    }
  }

  async getCurrentWeather(location: string): Promise<WeatherData> {
    if (!location) {
      throw new Error('Location is required');
    }

    const response = await fetch(`/api/weather?location=${location}&key=${this.apiKey}`);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    return await response.json();
  }

  formatTemperature(temp: number, units: 'C' | 'F' = 'C'): string {
    return `${Math.round(temp)}°${units}`;
  }
}
```

```typescript
// tests/weatherPlugin.test.ts
import { WeatherPlugin } from '../src/weatherPlugin';
import { PluginRuntimeContext } from '@qirvo/plugin-sdk';

describe('WeatherPlugin', () => {
  let plugin: WeatherPlugin;
  let mockContext: PluginRuntimeContext;

  beforeEach(() => {
    plugin = new WeatherPlugin();
    mockContext = {
      config: { apiKey: 'test-api-key' },
      plugin: { id: 'weather', name: 'Weather Plugin', version: '1.0.0' }
    } as PluginRuntimeContext;
  });

  describe('onEnable', () => {
    it('should initialize with valid API key', async () => {
      await expect(plugin.onEnable(mockContext)).resolves.not.toThrow();
    });

    it('should throw error when API key is missing', async () => {
      mockContext.config.apiKey = '';
      
      await expect(plugin.onEnable(mockContext))
        .rejects
        .toThrow('API key is required');
    });
  });

  describe('getCurrentWeather', () => {
    beforeEach(async () => {
      await plugin.onEnable(mockContext);
    });

    it('should fetch weather data successfully', async () => {
      const mockWeatherData = {
        temperature: 20,
        description: 'Sunny',
        location: 'London'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockWeatherData)
      });

      const result = await plugin.getCurrentWeather('London');

      expect(result).toEqual(mockWeatherData);
      expect(fetch).toHaveBeenCalledWith('/api/weather?location=London&key=test-api-key');
    });

    it('should throw error for empty location', async () => {
      await expect(plugin.getCurrentWeather(''))
        .rejects
        .toThrow('Location is required');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(plugin.getCurrentWeather('InvalidCity'))
        .rejects
        .toThrow('Weather API error: 404');
    });
  });

  describe('formatTemperature', () => {
    it('should format temperature in Celsius by default', () => {
      expect(plugin.formatTemperature(20.7)).toBe('21°C');
    });

    it('should format temperature in Fahrenheit', () => {
      expect(plugin.formatTemperature(68.5, 'F')).toBe('69°F');
    });

    it('should round temperature values', () => {
      expect(plugin.formatTemperature(20.4)).toBe('20°C');
      expect(plugin.formatTemperature(20.6)).toBe('21°C');
    });
  });
});
```

## Mocking Dependencies

### Service Layer Mocking

```typescript
// src/services/weatherService.ts
export interface WeatherService {
  getCurrentWeather(location: string): Promise<WeatherData>;
  getForecast(location: string, days: number): Promise<WeatherData[]>;
}

export class HttpWeatherService implements WeatherService {
  constructor(private apiKey: string, private baseUrl: string) {}

  async getCurrentWeather(location: string): Promise<WeatherData> {
    const response = await fetch(`${this.baseUrl}/current?location=${location}&key=${this.apiKey}`);
    return await response.json();
  }

  async getForecast(location: string, days: number): Promise<WeatherData[]> {
    const response = await fetch(`${this.baseUrl}/forecast?location=${location}&days=${days}&key=${this.apiKey}`);
    return await response.json();
  }
}
```

```typescript
// tests/services/weatherService.test.ts
import { HttpWeatherService } from '../../src/services/weatherService';

// Mock fetch at the module level
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('HttpWeatherService', () => {
  let service: HttpWeatherService;
  const mockApiKey = 'test-key';
  const mockBaseUrl = 'https://api.weather.com';

  beforeEach(() => {
    service = new HttpWeatherService(mockApiKey, mockBaseUrl);
    mockFetch.mockClear();
  });

  describe('getCurrentWeather', () => {
    it('should fetch current weather data', async () => {
      const mockWeatherData = {
        temperature: 25,
        description: 'Clear sky',
        location: 'Paris'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockWeatherData)
      });

      const result = await service.getCurrentWeather('Paris');

      expect(result).toEqual(mockWeatherData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.weather.com/current?location=Paris&key=test-key'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getCurrentWeather('Paris'))
        .rejects
        .toThrow('Network error');
    });
  });

  describe('getForecast', () => {
    it('should fetch forecast data', async () => {
      const mockForecastData = [
        { temperature: 20, description: 'Cloudy', location: 'Berlin' },
        { temperature: 22, description: 'Sunny', location: 'Berlin' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockForecastData)
      });

      const result = await service.getForecast('Berlin', 2);

      expect(result).toEqual(mockForecastData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.weather.com/forecast?location=Berlin&days=2&key=test-key'
      );
    });
  });
});
```

### Dependency Injection Testing

```typescript
// src/weatherPlugin.ts (updated with DI)
export class WeatherPlugin extends BasePlugin {
  constructor(private weatherService: WeatherService) {
    super();
  }

  async getCurrentWeather(location: string): Promise<WeatherData> {
    return await this.weatherService.getCurrentWeather(location);
  }
}
```

```typescript
// tests/weatherPlugin.test.ts (updated with mocked service)
import { WeatherPlugin } from '../src/weatherPlugin';
import { WeatherService } from '../src/services/weatherService';

// Create mock service
const mockWeatherService: jest.Mocked<WeatherService> = {
  getCurrentWeather: jest.fn(),
  getForecast: jest.fn()
};

describe('WeatherPlugin with DI', () => {
  let plugin: WeatherPlugin;

  beforeEach(() => {
    plugin = new WeatherPlugin(mockWeatherService);
    jest.clearAllMocks();
  });

  it('should delegate to weather service', async () => {
    const mockWeatherData = {
      temperature: 18,
      description: 'Rainy',
      location: 'London'
    };

    mockWeatherService.getCurrentWeather.mockResolvedValueOnce(mockWeatherData);

    const result = await plugin.getCurrentWeather('London');

    expect(result).toEqual(mockWeatherData);
    expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith('London');
  });

  it('should handle service errors', async () => {
    mockWeatherService.getCurrentWeather.mockRejectedValueOnce(
      new Error('Service unavailable')
    );

    await expect(plugin.getCurrentWeather('London'))
      .rejects
      .toThrow('Service unavailable');
  });
});
```

## Testing React Components

### Component Testing Setup

```typescript
// src/components/WeatherWidget.tsx
import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';

interface WeatherWidgetProps {
  location: string;
  onLocationChange: (location: string) => void;
  weatherService: WeatherService;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  location,
  onLocationChange,
  weatherService
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await weatherService.getCurrentWeather(location);
        setWeather(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location, weatherService]);

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">Error: {error}</div>;
  if (!weather) return <div data-testid="no-data">No weather data</div>;

  return (
    <div data-testid="weather-widget">
      <h2>{weather.location}</h2>
      <p data-testid="temperature">{weather.temperature}°C</p>
      <p data-testid="description">{weather.description}</p>
      
      <input
        data-testid="location-input"
        value={location}
        onChange={(e) => onLocationChange(e.target.value)}
        placeholder="Enter location"
      />
    </div>
  );
};
```

```typescript
// tests/components/WeatherWidget.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeatherWidget } from '../../src/components/WeatherWidget';
import { WeatherService } from '../../src/services/weatherService';

// Mock weather service
const mockWeatherService: jest.Mocked<WeatherService> = {
  getCurrentWeather: jest.fn(),
  getForecast: jest.fn()
};

describe('WeatherWidget', () => {
  const defaultProps = {
    location: 'London',
    onLocationChange: jest.fn(),
    weatherService: mockWeatherService
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockWeatherService.getCurrentWeather.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<WeatherWidget {...defaultProps} />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should display weather data when loaded', async () => {
    const mockWeatherData = {
      temperature: 22,
      description: 'Partly cloudy',
      location: 'London'
    };

    mockWeatherService.getCurrentWeather.mockResolvedValueOnce(mockWeatherData);

    render(<WeatherWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('weather-widget')).toBeInTheDocument();
    });

    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByTestId('temperature')).toHaveTextContent('22°C');
    expect(screen.getByTestId('description')).toHaveTextContent('Partly cloudy');
  });

  it('should display error message when service fails', async () => {
    mockWeatherService.getCurrentWeather.mockRejectedValueOnce(
      new Error('API Error')
    );

    render(<WeatherWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByText('Error: API Error')).toBeInTheDocument();
  });

  it('should call onLocationChange when input changes', async () => {
    const mockWeatherData = {
      temperature: 22,
      description: 'Sunny',
      location: 'London'
    };

    mockWeatherService.getCurrentWeather.mockResolvedValueOnce(mockWeatherData);

    render(<WeatherWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('weather-widget')).toBeInTheDocument();
    });

    const input = screen.getByTestId('location-input');
    fireEvent.change(input, { target: { value: 'Paris' } });

    expect(defaultProps.onLocationChange).toHaveBeenCalledWith('Paris');
  });

  it('should not fetch weather when location is empty', () => {
    render(<WeatherWidget {...defaultProps} location="" />);

    expect(screen.getByTestId('no-data')).toBeInTheDocument();
    expect(mockWeatherService.getCurrentWeather).not.toHaveBeenCalled();
  });
});
```

## Testing Async Operations

### Promise-based Testing

```typescript
// src/utils/cache.ts
export class Cache<T> {
  private storage = new Map<string, { data: T; expires: number }>();

  async get(key: string): Promise<T | null> {
    const item = this.storage.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.storage.delete(key);
      return null;
    }
    
    return item.data;
  }

  async set(key: string, data: T, ttlMs: number = 300000): Promise<void> {
    this.storage.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}
```

```typescript
// tests/utils/cache.test.ts
import { Cache } from '../../src/utils/cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>();
  });

  describe('get and set', () => {
    it('should store and retrieve data', async () => {
      await cache.set('key1', 'value1');
      
      const result = await cache.get('key1');
      
      expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should expire data after TTL', async () => {
      await cache.set('key1', 'value1', 100); // 100ms TTL
      
      // Data should be available immediately
      expect(await cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Data should be expired
      expect(await cache.get('key1')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all cached data', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.clear();
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });
});
```

### Timer and Interval Testing

```typescript
// src/services/autoRefresh.ts
export class AutoRefreshService {
  private intervalId: NodeJS.Timeout | null = null;

  start(callback: () => Promise<void>, intervalMs: number): void {
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}
```

```typescript
// tests/services/autoRefresh.test.ts
import { AutoRefreshService } from '../../src/services/autoRefresh';

describe('AutoRefreshService', () => {
  let service: AutoRefreshService;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    service = new AutoRefreshService();
    mockCallback = jest.fn().mockResolvedValue(undefined);
    jest.useFakeTimers();
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
  });

  it('should start auto-refresh with specified interval', () => {
    service.start(mockCallback, 1000);

    expect(service.isRunning()).toBe(true);
    expect(mockCallback).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(1000);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('should stop auto-refresh', () => {
    service.start(mockCallback, 1000);
    service.stop();

    expect(service.isRunning()).toBe(false);

    jest.advanceTimersByTime(2000);
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle callback errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockCallback.mockRejectedValue(new Error('Callback failed'));

    service.start(mockCallback, 1000);
    jest.advanceTimersByTime(1000);

    expect(consoleSpy).toHaveBeenCalledWith('Auto-refresh failed:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should replace existing interval when started multiple times', () => {
    service.start(mockCallback, 1000);
    const firstIntervalRunning = service.isRunning();

    service.start(mockCallback, 500);
    
    expect(firstIntervalRunning).toBe(true);
    expect(service.isRunning()).toBe(true);

    // Should use new interval (500ms)
    jest.advanceTimersByTime(500);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
```

## Coverage and Reporting

### Coverage Configuration

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:coverage:open": "jest --coverage && open coverage/lcov-report/index.html"
  }
}
```

### Custom Test Utilities

```typescript
// tests/utils/testUtils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { PluginRuntimeContext } from '@qirvo/plugin-sdk';

// Mock context provider
interface MockContextProviderProps {
  children: React.ReactNode;
  context?: Partial<PluginRuntimeContext>;
}

const MockContextProvider: React.FC<MockContextProviderProps> = ({ 
  children, 
  context = {} 
}) => {
  const defaultContext: PluginRuntimeContext = {
    plugin: { id: 'test', name: 'Test Plugin', version: '1.0.0' },
    config: {},
    storage: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn(),
      clear: jest.fn()
    },
    ...context
  };

  return (
    <div data-testid="mock-context" data-context={JSON.stringify(defaultContext)}>
      {children}
    </div>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    context?: Partial<PluginRuntimeContext>;
  }
) => {
  const { context, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <MockContextProvider context={context}>
        {children}
      </MockContextProvider>
    ),
    ...renderOptions
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
```

This comprehensive unit testing guide provides everything needed to write robust, maintainable tests for Qirvo plugins, ensuring high code quality and reliability.

---

**Next**: [Integration Testing](./integration-testing.md)
