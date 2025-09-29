import {
    Alert,
    Button,
    Card,
    Group,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput
} from '@mantine/core';
import { IconCheck, IconSettings } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { WeatherPluginConfig } from '../index';

interface WeatherSettingsProps {
    config?: WeatherPluginConfig;
    onConfigUpdate?: (config: Partial<WeatherPluginConfig>) => Promise<void>;
    isLoading?: boolean;
}

export const WeatherSettings: React.FC<WeatherSettingsProps> = ({
    config,
    onConfigUpdate,
    isLoading = false
}) => {
    const [formData, setFormData] = useState<WeatherPluginConfig>({
        apiKey: '',
        location: 'New York, NY',
        units: 'metric',
        updateInterval: 30
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (config) {
            setFormData({
                ...config,
                updateInterval: config.updateInterval / (60 * 1000) // Convert to minutes
            });
        }
    }, [config]);

    const handleSave = async () => {
        if (!onConfigUpdate) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            await onConfigUpdate({
                ...formData,
                updateInterval: formData.updateInterval * 60 * 1000 // Convert back to milliseconds
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save weather settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field: keyof WeatherPluginConfig, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group mb="md">
                <IconSettings size={24} />
                <Text size="lg" fw={500}>
                    Weather Plugin Settings
                </Text>
            </Group>

            <Stack gap="md">
                <TextInput
                    label="OpenWeatherMap API Key"
                    placeholder="Enter your API key from openweathermap.org"
                    value={formData.apiKey}
                    onChange={(event) => handleInputChange('apiKey', event.currentTarget.value)}
                    type="password"
                    required
                />

                <TextInput
                    label="Location"
                    placeholder="City, Country (e.g., New York, US)"
                    value={formData.location}
                    onChange={(event) => handleInputChange('location', event.currentTarget.value)}
                    required
                />

                <Select
                    label="Temperature Units"
                    value={formData.units}
                    onChange={(value) => handleInputChange('units', value || 'metric')}
                    data={[
                        { value: 'metric', label: 'Celsius (°C)' },
                        { value: 'imperial', label: 'Fahrenheit (°F)' }
                    ]}
                />

                <NumberInput
                    label="Update Interval (minutes)"
                    description="How often to refresh weather data"
                    value={formData.updateInterval}
                    onChange={(value) => handleInputChange('updateInterval', value || 30)}
                    min={5}
                    max={120}
                    required
                />

                {!formData.apiKey && (
                    <Alert color="orange" title="API Key Required">
                        Get your free API key from{' '}
                        <a
                            href="https://openweathermap.org/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                            OpenWeatherMap
                        </a>
                    </Alert>
                )}

                <Group p="right" mt="md">
                    <Button
                        onClick={handleSave}
                        loading={isSaving}
                        disabled={!formData.apiKey || !formData.location}
                        leftSection={saveSuccess ? <IconCheck size={16} /> : undefined}
                    >
                        {saveSuccess ? 'Saved!' : 'Save Settings'}
                    </Button>
                </Group>
            </Stack>
        </Card>
    );
};
