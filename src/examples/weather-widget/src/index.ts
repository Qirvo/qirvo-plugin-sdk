import { QirvoPlugin } from 'qirvo-plugin-sdk';
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

class WeatherPlugin extends QirvoPlugin {
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

    async onInstall(): Promise<void> {
        console.log('Weather plugin installed successfully');
        await this.loadConfig();
        await this.startWeatherUpdates();
    }

    async onUninstall(): Promise<void> {
        console.log('Weather plugin uninstalled');
        this.stopWeatherUpdates();
    }

    async onConfigUpdate(newConfig: Partial<WeatherPluginConfig>): Promise<void> {
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
            const savedConfig = localStorage.getItem('weather-plugin-config');
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            }
        } catch (error) {
            console.error('Failed to load weather plugin config:', error);
        }
    }

    private async saveConfig(): Promise<void> {
        try {
            localStorage.setItem('weather-plugin-config', JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save weather plugin config:', error);
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
            console.warn('Weather API key not configured');
            return;
        }

        try {
            const response = await fetch(
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

            // Emit event for widget updates
            this.emit('weather-updated', this.weatherData);
        } catch (error) {
            console.error('Failed to update weather:', error);
            this.weatherData = null;
        }
    }
}

// Export the plugin instance
export const weatherPlugin = new WeatherPlugin();

// Export types for external use
export type { WeatherData, WeatherPluginConfig };

