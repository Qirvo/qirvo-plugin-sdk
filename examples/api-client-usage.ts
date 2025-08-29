// Qirvo Plugin SDK - API Client Usage Example
// This example demonstrates how to use the HTTP client and endpoints for plugin development

import { apiClient, endpoints } from '../src/endpoints';

async function pluginManagementExample() {
    console.log('=== Plugin Management Example ===');

    try {
        // Set authentication token if needed
        // apiClient.setAuthToken('your-jwt-token');

        // List all installed plugins
        console.log('Fetching installed plugins...');
        const plugins = await apiClient.get(endpoints.plugins.list);
        console.log('Installed plugins:', plugins);

        // Install a new plugin
        console.log('Installing plugin...');
        const installResult = await apiClient.post(endpoints.plugins.install, {
            pluginId: 'example-plugin',
            version: '1.0.0'
        });
        console.log('Install result:', installResult);

        // Get plugin configuration
        console.log('Getting plugin config...');
        const config = await apiClient.get(endpoints.plugins.config.get('example-plugin'));
        console.log('Plugin config:', config);

        // Update plugin configuration
        console.log('Updating plugin config...');
        await apiClient.post(endpoints.plugins.config.set('example-plugin'), {
            apiKey: 'new-api-key',
            enabled: true
        });

    } catch (error) {
        console.error('Plugin management error:', error);
    }
}

async function marketplaceExample() {
    console.log('=== Marketplace Example ===');

    try {
        // Browse marketplace plugins
        console.log('Fetching marketplace plugins...');
        const marketplacePlugins = await apiClient.get(endpoints.marketplace.plugins);
        console.log('Marketplace plugins:', marketplacePlugins);

        // Search for plugins
        console.log('Searching for weather plugins...');
        const searchResults = await apiClient.get(`${endpoints.marketplace.search}?q=weather&category=productivity`);
        console.log('Search results:', searchResults);

        // Get specific plugin details
        console.log('Getting plugin details...');
        const pluginDetails = await apiClient.get(endpoints.marketplace.plugin('weather-plugin'));
        console.log('Plugin details:', pluginDetails);

        // Install from marketplace
        console.log('Installing from marketplace...');
        const installResult = await apiClient.post(endpoints.marketplace.install('weather-plugin'));
        console.log('Marketplace install result:', installResult);

    } catch (error) {
        console.error('Marketplace error:', error);
    }
}

async function storageExample() {
    console.log('=== Storage Example ===');

    try {
        // Store data
        console.log('Storing data...');
        await apiClient.post(endpoints.storage.set('userPreferences'), {
            value: { theme: 'dark', language: 'en' }
        });

        // Retrieve data
        console.log('Retrieving data...');
        const data = await apiClient.get(endpoints.storage.get('userPreferences'));
        console.log('Retrieved data:', data);

        // List all storage keys
        console.log('Listing storage keys...');
        const keys = await apiClient.get(endpoints.storage.list);
        console.log('Storage keys:', keys);

        // Delete data
        console.log('Deleting data...');
        await apiClient.delete(endpoints.storage.delete('userPreferences'));

    } catch (error) {
        console.error('Storage error:', error);
    }
}

async function widgetExample() {
    console.log('=== Widget Management Example ===');

    try {
        // Get available widgets
        console.log('Fetching available widgets...');
        const widgets = await apiClient.get(endpoints.widgets.available);
        console.log('Available widgets:', widgets);

        // Register a new widget
        console.log('Registering widget...');
        const widgetConfig = {
            name: 'My Custom Widget',
            component: 'MyWidget',
            size: 'medium',
            position: 'sidebar',
            config: {
                title: 'Custom Widget',
                refreshInterval: 30000
            }
        };

        const registerResult = await apiClient.post(endpoints.widgets.register, widgetConfig);
        console.log('Widget registration result:', registerResult);

        // Update widget
        console.log('Updating widget...');
        await apiClient.put(endpoints.widgets.update('my-widget-id'), {
            size: 'large',
            position: 'main'
        });

    } catch (error) {
        console.error('Widget management error:', error);
    }
}

async function dashboardExample() {
    console.log('=== Dashboard Management Example ===');

    try {
        // Get current dashboard layout
        console.log('Fetching dashboard layout...');
        const layout = await apiClient.get(endpoints.dashboard.layout.get);
        console.log('Current layout:', layout);

        // Save new dashboard layout
        console.log('Saving dashboard layout...');
        const newLayout = {
            widgets: [
                { id: 'weather-widget', position: { x: 0, y: 0 }, size: 'medium' },
                { id: 'tasks-widget', position: { x: 1, y: 0 }, size: 'large' }
            ],
            theme: 'dark'
        };

        await apiClient.post(endpoints.dashboard.layout.save, newLayout);
        console.log('Layout saved successfully');

    } catch (error) {
        console.error('Dashboard management error:', error);
    }
}

async function commandExample() {
    console.log('=== Command Management Example ===');

    try {
        // Register a new command
        console.log('Registering command...');
        const commandConfig = {
            name: 'greet',
            description: 'Greet a user',
            handler: 'greetHandler',
            args: [
                { name: 'name', type: 'string', required: false, description: 'Name to greet' }
            ]
        };

        await apiClient.post(endpoints.commands.register, commandConfig);
        console.log('Command registered successfully');

        // List all commands
        console.log('Listing commands...');
        const commands = await apiClient.get(endpoints.commands.list);
        console.log('Available commands:', commands);

        // Execute a command
        console.log('Executing command...');
        const result = await apiClient.post(endpoints.commands.execute('greet'), {
            args: ['World']
        });
        console.log('Command execution result:', result);

    } catch (error) {
        console.error('Command management error:', error);
    }
}

// Run all examples
async function runAllExamples() {
    console.log('🚀 Starting Qirvo Plugin SDK API Client Examples\n');

    await pluginManagementExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await marketplaceExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await storageExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await widgetExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await dashboardExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await commandExample();

    console.log('\n✨ All examples completed!');
}

// Export for use in other files
export {
    commandExample, dashboardExample, marketplaceExample, pluginManagementExample, runAllExamples, storageExample,
    widgetExample
};

// Run examples if this file is executed directly
if (require.main === module) {
    runAllExamples().catch(console.error);
}
