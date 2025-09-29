import { BasePlugin, PluginRuntimeContext } from '@qirvo/plugin-sdk';
import { WeatherSettings } from './components/WeatherSettings';
import { WeatherWidget } from './components/WeatherWidget';

export interface WeatherPluginConfig {
    apiKey: string;
    location: string;
    units: 'metric' | 'imperial';
    updateInterval: number;
}

export interface WeatherData {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    location: string;
    timestamp: number;
}

class WeatherPlugin extends BasePlugin {
    private config: WeatherPluginConfig;
    private weatherData: WeatherData | null = null;
    private updateInterval: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.config = {
            apiKey: '',
            location: 'New York, NY',
            units: 'metric',
            updateInterval: 30 * 60 * 1000 // 30 minutes
        };
    }

    async onInstall(context: PluginRuntimeContext): Promise<void> {
        this.log('info', 'Weather plugin installed successfully');
        await this.loadConfig();
        await this.startWeatherUpdates();
    }

    async onUninstall(context: PluginRuntimeContext): Promise<void> {
        this.log('info', 'Weather plugin uninstalled');
        this.stopWeatherUpdates();
    }

    async onConfigChange(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void> {
        const newConfig = context.config as Partial<WeatherPluginConfig>;
        this.config = { ...this.config, ...newConfig };
        await this.saveConfig();
        await this.updateWeather();
    }

    getWidgetComponent(): React.ComponentType {
        return WeatherWidget;
    }

    getSettingsComponent(): React.ComponentType {
        return WeatherSettings;
    }

    getCurrentWeather(): WeatherData | null {
        return this.weatherData;
    }

    private async loadConfig(): Promise<void> {
        try {
            const savedConfig = await this.getStorage<WeatherPluginConfig>('weather-config');
            if (savedConfig) {
                this.config = { ...this.config, ...savedConfig };
            }
        } catch (error) {
            this.log('error', 'Failed to load weather plugin config:', error);
        }
    }

    private async saveConfig(): Promise<void> {
        try {
            await this.setStorage('weather-config', this.config);
        } catch (error) {
            this.log('error', 'Failed to save weather plugin config:', error);
        }
    }

    private async startWeatherUpdates(): Promise<void> {
        await this.updateWeather();
        this.updateInterval = setInterval(() => {
            this.updateWeather();
        }, this.config.updateInterval);
    }

    private stopWeatherUpdates(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private async updateWeather(): Promise<void> {
        if (!this.config.apiKey) {
            this.log('warn', 'Weather API key not configured');
            return;
        }

        try {
            const response = await this.httpGet(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(this.config.location)}&appid=${this.config.apiKey}&units=${this.config.units}`
            );

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data = await response.json();

            this.weatherData = {
                temperature: Math.round(data.main.temp),
                condition: data.weather[0].main,
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
                location: data.name,
                timestamp: Date.now()
            };

            // Notify about weather updates
            this.notify('Weather Updated', `Weather updated for ${this.weatherData.location}`, 'info');
        } catch (error) {
            this.log('error', 'Failed to update weather:', error);
            this.weatherData = null;
        }
    }
}

// Export the plugin instance
export const weatherPlugin = new WeatherPlugin();

