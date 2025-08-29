import { Alert, Badge, Card, Group, Loader, Text } from '@mantine/core';
import { IconCloud, IconCloudRain, IconSnowflake, IconSun } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { WeatherData } from '../index';

interface WeatherWidgetProps {
    weatherData?: WeatherData | null;
    isLoading?: boolean;
    error?: string | null;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
    weatherData,
    isLoading = false,
    error = null
}) => {
    const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(weatherData || null);

    useEffect(() => {
        if (weatherData) {
            setCurrentWeather(weatherData);
        }
    }, [weatherData]);

    const getWeatherIcon = (condition: string) => {
        switch (condition.toLowerCase()) {
            case 'clear':
                return <IconSun size={32} color="#ffd43b" />;
            case 'clouds':
                return <IconCloud size={32} color="#868e96" />;
            case 'rain':
            case 'drizzle':
                return <IconCloudRain size={32} color="#228be6" />;
            case 'snow':
                return <IconSnowflake size={32} color="#ffffff" />;
            default:
                return <IconCloud size={32} color="#868e96" />;
        }
    };

    const formatTemperature = (temp: number) => {
        return `${temp}°C`;
    };

    if (error) {
        return (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Alert color="red" title="Weather Error">
                    {error}
                </Alert>
            </Card>
        );
    }

    if (isLoading || !currentWeather) {
        return (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group position="center">
                    <Loader size="sm" />
                    <Text size="sm" color="dimmed">Loading weather...</Text>
                </Group>
            </Card>
        );
    }

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
                <Text weight={500} size="lg">
                    {currentWeather.location}
                </Text>
                {getWeatherIcon(currentWeather.condition)}
            </Group>

            <Group position="apart" mb="md">
                <div>
                    <Text size="xl" weight={700}>
                        {formatTemperature(currentWeather.temperature)}
                    </Text>
                    <Text size="sm" color="dimmed" transform="capitalize">
                        {currentWeather.condition}
                    </Text>
                </div>
            </Group>

            <Group spacing="xl">
                <div>
                    <Text size="sm" color="dimmed">Humidity</Text>
                    <Text weight={500}>{currentWeather.humidity}%</Text>
                </div>
                <div>
                    <Text size="sm" color="dimmed">Wind</Text>
                    <Text weight={500}>{currentWeather.windSpeed} m/s</Text>
                </div>
            </Group>

            <Badge
                color="blue"
                variant="light"
                size="sm"
                mt="md"
            >
                Updated {new Date(currentWeather.timestamp).toLocaleTimeString()}
            </Badge>
        </Card>
    );
};
