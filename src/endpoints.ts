// Qirvo Plugin SDK - API Endpoints
// Provides actual HTTP endpoint URLs and client methods for plugin development

export interface APIEndpoints {
    // Base API configuration
    baseURL: string;
    timeout: number;

    // Plugin Management Endpoints
    plugins: {
        list: string;                    // GET /api/plugins
        install: string;                 // POST /api/plugins/install
        uninstall: (id: string) => string; // DELETE /api/plugins/[id]
        get: (id: string) => string;     // GET /api/plugins/[id]
        update: (id: string) => string;  // PUT /api/plugins/[id]
        config: {
            get: (id: string) => string;   // GET /api/plugins/[id]/config
            set: (id: string) => string;   // POST /api/plugins/[id]/config
        };
    };

    // Widget Management Endpoints
    widgets: {
        available: string;               // GET /api/widgets/available
        register: string;                // POST /api/widgets/register
        unregister: (id: string) => string; // DELETE /api/widgets/[id]
        update: (id: string) => string;  // PUT /api/widgets/[id]
    };

    // Dashboard Endpoints
    dashboard: {
        layout: {
            get: string;                   // GET /api/dashboard/layout
            save: string;                  // POST /api/dashboard/layout
        };
    };

    // Command Endpoints
    commands: {
        register: string;                // POST /api/commands/register
        unregister: (name: string) => string; // DELETE /api/commands/[name]
        list: string;                    // GET /api/commands
        execute: (name: string) => string; // POST /api/commands/[name]/execute
    };

    // Storage Endpoints
    storage: {
        get: (key: string) => string;    // GET /api/storage/[key]
        set: (key: string) => string;    // POST /api/storage/[key]
        delete: (key: string) => string; // DELETE /api/storage/[key]
        list: string;                    // GET /api/storage
    };

    // Marketplace Endpoints
    marketplace: {
        plugins: string;                 // GET /api/marketplace/plugins
        featured: string;                // GET /api/marketplace/plugins/featured
        categories: string;              // GET /api/marketplace/categories
        search: string;                  // GET /api/marketplace/search
        plugin: (id: string) => string;  // GET /api/marketplace/plugins/[id]
        install: (id: string) => string; // POST /api/marketplace/plugins/[id]/install
        purchase: (id: string) => string; // POST /api/marketplace/plugins/[id]/purchase
    };
}

export class APIClient {
    private endpoints: APIEndpoints;
    private baseURL: string;
    private authToken?: string;

    constructor(baseURL: string = '/api', authToken?: string) {
        this.baseURL = baseURL;
        this.authToken = authToken;
        this.endpoints = this.createEndpoints();
    }

    private createEndpoints(): APIEndpoints {
        const base = this.baseURL;
        return {
            baseURL: base,
            timeout: 30000,

            plugins: {
                list: `${base}/plugins`,
                install: `${base}/plugins/install`,
                uninstall: (id: string) => `${base}/plugins/${id}`,
                get: (id: string) => `${base}/plugins/${id}`,
                update: (id: string) => `${base}/plugins/${id}`,
                config: {
                    get: (id: string) => `${base}/plugins/${id}/config`,
                    set: (id: string) => `${base}/plugins/${id}/config`
                }
            },

            widgets: {
                available: `${base}/widgets/available`,
                register: `${base}/widgets/register`,
                unregister: (id: string) => `${base}/widgets/${id}`,
                update: (id: string) => `${base}/widgets/${id}`
            },

            dashboard: {
                layout: {
                    get: `${base}/dashboard/layout`,
                    save: `${base}/dashboard/layout`
                }
            },

            commands: {
                register: `${base}/commands/register`,
                unregister: (name: string) => `${base}/commands/${name}`,
                list: `${base}/commands`,
                execute: (name: string) => `${base}/commands/${name}/execute`
            },

            storage: {
                get: (key: string) => `${base}/storage/${encodeURIComponent(key)}`,
                set: (key: string) => `${base}/storage/${encodeURIComponent(key)}`,
                delete: (key: string) => `${base}/storage/${encodeURIComponent(key)}`,
                list: `${base}/storage`
            },

            marketplace: {
                plugins: `${base}/marketplace/plugins`,
                featured: `${base}/marketplace/plugins/featured`,
                categories: `${base}/marketplace/categories`,
                search: `${base}/marketplace/search`,
                plugin: (id: string) => `${base}/marketplace/plugins/${id}`,
                install: (id: string) => `${base}/marketplace/plugins/${id}/install`,
                purchase: (id: string) => `${base}/marketplace/plugins/${id}/purchase`
            }
        };
    }

    // HTTP request methods with authentication
    async get<T = any>(endpoint: string): Promise<T> {
        return this.request<T>('GET', endpoint);
    }

    async post<T = any>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>('POST', endpoint, data);
    }

    async put<T = any>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>('PUT', endpoint, data);
    }

    async delete<T = any>(endpoint: string): Promise<T> {
        return this.request<T>('DELETE', endpoint);
    }

    private async request<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        data?: any
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const config: RequestInit = {
            method,
            headers,
            signal: AbortSignal.timeout(this.endpoints.timeout)
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, config);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error ${response.status}: ${error}`);
        }

        return response.json();
    }

    // Set authentication token
    setAuthToken(token: string): void {
        this.authToken = token;
    }

    // Get endpoints for direct access
    getEndpoints(): APIEndpoints {
        return this.endpoints;
    }

    // Plugin-specific API methods
    async installPlugin(pluginId: string): Promise<any> {
        return this.post(this.endpoints.plugins.install, { pluginId });
    }

    async uninstallPlugin(pluginId: string): Promise<any> {
        return this.delete(this.endpoints.plugins.uninstall(pluginId));
    }

    async getPluginConfig(pluginId: string): Promise<any> {
        return this.get(this.endpoints.plugins.config.get(pluginId));
    }

    async setPluginConfig(pluginId: string, config: any): Promise<any> {
        return this.post(this.endpoints.plugins.config.set(pluginId), config);
    }

    async getAvailableWidgets(): Promise<any> {
        return this.get(this.endpoints.widgets.available);
    }

    async registerWidget(widgetConfig: any): Promise<any> {
        return this.post(this.endpoints.widgets.register, widgetConfig);
    }

    async getDashboardLayout(): Promise<any> {
        return this.get(this.endpoints.dashboard.layout.get);
    }

    async saveDashboardLayout(layout: any): Promise<any> {
        return this.post(this.endpoints.dashboard.layout.save, layout);
    }

    async registerCommand(command: any): Promise<any> {
        return this.post(this.endpoints.commands.register, command);
    }

    async executeCommand(commandName: string, args?: any): Promise<any> {
        return this.post(this.endpoints.commands.execute(commandName), args);
    }

    async getStorage(key: string): Promise<any> {
        return this.get(this.endpoints.storage.get(key));
    }

    async setStorage(key: string, value: any): Promise<any> {
        return this.post(this.endpoints.storage.set(key), { value });
    }

    async deleteStorage(key: string): Promise<any> {
        return this.delete(this.endpoints.storage.delete(key));
    }

    // Marketplace API methods
    async getMarketplacePlugins(filters?: any): Promise<any> {
        const query = filters ? `?${new URLSearchParams(filters)}` : '';
        return this.get(`${this.endpoints.marketplace.plugins}${query}`);
    }

    async searchMarketplace(query: string, filters?: any): Promise<any> {
        const params = new URLSearchParams({ q: query, ...filters });
        return this.get(`${this.endpoints.marketplace.search}?${params}`);
    }

    async getMarketplacePlugin(pluginId: string): Promise<any> {
        return this.get(this.endpoints.marketplace.plugin(pluginId));
    }

    async installFromMarketplace(pluginId: string): Promise<any> {
        return this.post(this.endpoints.marketplace.install(pluginId));
    }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export endpoints for direct access
export const endpoints = apiClient.getEndpoints();
