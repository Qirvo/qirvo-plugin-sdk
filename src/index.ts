// Qirvo Plugin SDK - Core interfaces and utilities for plugin development
// Updated to align with current marketplace implementation including admin approval workflow

// Author and Developer Types
export interface PluginAuthor {
    name: string;
    email?: string;
    avatar?: string;
    website?: string;
}

export interface PluginDeveloper {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    website?: string;
    verified: boolean;
    plugins: string[]; // plugin IDs
    totalDownloads: number;
    averageRating: number;
    joinedAt: string;
}

// Permission System
export interface PluginPermission {
    type: 'storage' | 'network' | 'filesystem' | 'notifications' | 'calendar' | 'contacts' | 'location' | 'camera' | 'microphone';
    description: string;
    required: boolean;
}

// Plugin Categories
export type PluginCategory = 'productivity' | 'communication' | 'utilities' | 'integrations' | 'ai' | 'health' | 'finance' | 'entertainment';
// Manifest category supports a broader set used by core manifest types
export type PluginManifestCategory = PluginCategory | 'education' | 'other';

// Changelog and Documentation
export interface PluginChangelogEntry {
    version: string;
    date: string;
    changes: string[];
    breaking?: boolean;
}

// Plugin Context and Runtime - Aligned with Working Architecture
export interface WorkingPluginContext {
    // Core services
    logger: {
        info: (message: string, ...args: any[]) => void;
        warn: (message: string, ...args: any[]) => void;
        error: (message: string, ...args: any[]) => void;
    };
    storage: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        delete: (key: string) => Promise<void>;
    };
    http: {
        fetch: (url: string, options?: RequestInit) => Promise<Response>;
    };
    // Event bus for plugin communication
    bus: {
        emit: (event: string, data: any) => void;
        on: (event: string, handler: (data: any) => void) => () => void;
    };
    // User context
    user: {
        id: string;
        email?: string;
    };
    // Plugin permissions
    permissions: Set<string>;
}

// Working Plugin Module - Simplified and Reliable
export interface WorkingPluginModule {
    manifest: PluginManifest;
    setup?: (context: WorkingPluginContext) => Promise<void> | void;
    activate?: (context: WorkingPluginContext) => Promise<void> | void;
    deactivate?: () => Promise<void> | void;
    dispose?: () => Promise<void> | void;
    // Widget component for dashboard integration
    widget?: {
        component: string;
        config?: any;
    };
}

// Legacy Runtime Context (for backward compatibility)
export interface PluginRuntimeContext {
    plugin: InstalledPlugin;
    config: Record<string, any>;
    storage: PluginStorage;
    api: PluginAPI;
    logger: PluginLogger;
    // Optional user and UI context available in runtime (aligns with core)
    user?: { id: string; email?: string; preferences?: Record<string, any> };
}

// Widget Types for Dashboard Integration
export interface WidgetConfig {
    id: string;
    pluginId: string;
    pluginName: string;
    widgetType: string;
    position: number; // 0-3 for the four slots
    size: 'small' | 'medium' | 'large';
    config: Record<string, any>;
    enabled: boolean;
    visible: boolean; // Show/hide toggle
}

export interface PluginWidget {
    id: string;
    name: string;
    description: string;
    type: 'weather' | 'calendar' | 'tasks' | 'notes' | 'analytics' | 'custom';
    icon: string;
    component: string; // Component name to render
    defaultConfig: Record<string, any>;
    configSchema?: Record<string, any>;
    supportedSizes: ('small' | 'medium' | 'large')[];
}

export interface WidgetSlot {
    position: number;
    widget: WidgetConfig | null;
    isEmpty: boolean;
}

export interface DashboardWidgetLayout {
    userId: string;
    widgets: WidgetConfig[];
    layout: WidgetSlot[];
    lastModified: string;
}

export interface PluginStorage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
}

// API Endpoints for Plugin Development
export interface PluginAPIEndpoints {
    // Marketplace APIs
    marketplace: {
        // Plugin management
        installPlugin: (pluginId: string) => Promise<{ success: boolean; message: string }>;
        uninstallPlugin: (pluginId: string) => Promise<{ success: boolean; message: string }>;
        updatePlugin: (pluginId: string) => Promise<{ success: boolean; message: string }>;
        listInstalledPlugins: () => Promise<InstalledPlugin[]>;

        // Plugin configuration
        getPluginConfig: (pluginId: string) => Promise<Record<string, any>>;
        setPluginConfig: (pluginId: string, config: Record<string, any>) => Promise<void>;

        // Plugin permissions
        requestPermission: (permission: string) => Promise<{ granted: boolean; message: string }>;
        checkPermission: (permission: string) => Promise<boolean>;
    };

    // Dashboard APIs
    dashboard: {
        // Widget management
        registerWidget: (pluginId: string, widget: WidgetConfig) => Promise<void>;
        unregisterWidget: (pluginId: string) => Promise<void>;
        updateWidget: (pluginId: string, config: Partial<WidgetConfig>) => Promise<void>;

        // Layout management
        getDashboardLayout: () => Promise<DashboardWidgetLayout>;
        saveDashboardLayout: (layout: DashboardWidgetLayout) => Promise<void>;
    };

    // Command APIs
    commands: {
        // Command registration
        registerCommand: (command: CommandRegistration) => Promise<void>;
        unregisterCommand: (commandId: string) => Promise<void>;
        listCommands: () => Promise<CommandRegistration[]>;

        // Command execution
        executeCommand: (commandId: string, args?: any) => Promise<any>;
    };

    // Event APIs
    events: {
        // Event subscription
        subscribe: (event: string, handler: (data: any) => void) => () => void;
        unsubscribe: (event: string, handler: (data: any) => void) => void;

        // Event publishing
        publish: (event: string, data: any) => void;
    };

    // Storage APIs
    storage: {
        // Scoped storage
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        delete: (key: string) => Promise<void>;
        list: (prefix?: string) => Promise<string[]>;
    };

    // Network APIs
    network: {
        // HTTP requests with permission checking
        fetch: (url: string, options?: RequestInit) => Promise<Response>;
        get: (url: string, options?: RequestInit) => Promise<any>;
        post: (url: string, data: any, options?: RequestInit) => Promise<any>;
        put: (url: string, data: any, options?: RequestInit) => Promise<any>;
        delete: (url: string, options?: RequestInit) => Promise<any>;
    };
}

// Command Registration Interface
export interface CommandRegistration {
    id: string;
    name: string;
    description: string;
    handler: (args: any, context: WorkingPluginContext) => Promise<any>;
    aliases?: string[];
    usage?: string;
}

// Enhanced API with all Qirvo capabilities including admin functions
export interface PluginAPI {

    journal?: {
        getEntries(start: Date, end: Date): Promise<any[]>;
        createEntry(entry: any): Promise<any>;
        updateEntry(id: string, updates: any): Promise<any>;
        deleteEntry(id: string): Promise<void>;
    };

    projects?: {
        list(): Promise<any[]>;
        get(id: string): Promise<any>;
        create(project: any): Promise<any>;
        update(id: string, updates: any): Promise<any>;
        delete(id: string): Promise<void>;
    };

    notifications: {
        show(notification: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }): void;
        schedule?(notification: { title: string; message: string; at: Date; type?: 'info' | 'success' | 'warning' | 'error' }): Promise<string>;
        cancel?(id: string): Promise<void>;
    };

    // External API access (with rate limiting)
    http: {
        get(url: string, options?: RequestInit): Promise<Response>;
        post(url: string, data: any, options?: RequestInit): Promise<Response>;
        put(url: string, data: any, options?: RequestInit): Promise<Response>;
        delete(url: string, options?: RequestInit): Promise<Response>;
        request?(url: string, options: RequestInit): Promise<Response>;
    };

    // UI integration (optional in some runtimes)
    ui?: {
        showModal(component: any, props?: any): Promise<any>;
        showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
        openSidebar?(component: any, props?: any): void;
        closeSidebar?(): void;
    };

    // File system access (if permission granted)
    fs?: {
        readFile(path: string): Promise<string>;
        writeFile(path: string, content: string): Promise<void>;
        exists(path: string): Promise<boolean>;
        mkdir(path: string): Promise<void>;
        readdir(path: string): Promise<string[]>;
    };

    // Admin API (admin role required)
    admin?: {
        getApprovals(filters?: { status?: string; page?: number; limit?: number }): Promise<{
            approvals: PluginApprovalRequest[];
            stats: AdminDashboardStats;
            pagination: { page: number; limit: number; total: number; hasMore: boolean };
        }>;
        approvePlugin(approvalId: string, comments?: string): Promise<{ success: boolean; message: string }>;
        rejectPlugin(approvalId: string, reason: string, comments?: string): Promise<{ success: boolean; message: string }>;
        flagSecurity(approvalId: string, flags: string[], comments?: string): Promise<{ success: boolean; message: string }>;
        requestChanges(approvalId: string, comments: string): Promise<{ success: boolean; message: string }>;
        getSecurityScan(pluginId: string): Promise<PluginSecurityScan>;
    };
}

export interface PluginLogger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}

export interface PluginLifecycleHooks {
    onInstall?(context: PluginRuntimeContext): Promise<void>;
    onUninstall?(context: PluginRuntimeContext): Promise<void>;
    onEnable?(context: PluginRuntimeContext): Promise<void>;
    onDisable?(context: PluginRuntimeContext): Promise<void>;
    onUpdate?(context: PluginRuntimeContext, oldVersion: string): Promise<void>;
    onConfigChange?(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void>;
}

export interface PluginCommand {
    name: string;
    description: string;
    usage: string;
    aliases?: string[];
    options?: PluginCommandOption[];
    // SDK handler (with runtime context)
    handler?: (args: string[], context: PluginRuntimeContext) => Promise<void>;
}

export interface PluginCommandOption {
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    required?: boolean;
    default?: any;
}

// Admin Approval Workflow Types
export type PluginApprovalStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

export interface PluginApprovalRequest {
    id: string;
    pluginId: string;
    plugin: PluginMetadata;
    submittedBy: string;
    submittedAt: string;
    status: PluginApprovalStatus;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewComments?: string;
    rejectionReason?: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    securityFlags?: string[];
    complianceChecks?: {
        codeReview: boolean;
        securityScan: boolean;
        performanceTest: boolean;
        documentationComplete: boolean;
    };
}

export interface AdminPluginAction {
    action: 'approve' | 'reject' | 'request_changes' | 'flag_security';
    comments?: string;
    rejectionReason?: string;
    securityFlags?: string[];
}

export interface AdminDashboardStats {
    totalPlugins: number;
    pendingApprovals: number;
    approvedToday: number;
    rejectedToday: number;
    securityFlags: number;
    averageReviewTime: number;
}

export interface PluginSecurityScan {
    pluginId: string;
    scanDate: string;
    status: 'clean' | 'warning' | 'critical';
    vulnerabilities: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        file?: string;
        line?: number;
    }>;
    permissions: string[];
    networkAccess: boolean;
    fileSystemAccess: boolean;
}

// Plugin Runtime Types
export interface PluginRuntime {
    id: string;
    manifest: PluginManifest;
    files: Map<string, string>;
    status: 'loading' | 'ready' | 'error' | 'destroyed';
    loadedAt: string;
    component?: any; // React.ComponentType<any>
    error?: string;
}

export interface PluginManifest {
    manifest_version: number;
    name: string;
    version: string; // semver
    description: string;
    author: PluginAuthor | string; // Enhanced: flexible author format
    category: PluginManifestCategory;
    type: 'dashboard-widget' | 'page' | 'cli-tool' | 'service' | 'hybrid'; // Enhanced: plugin type
    tags?: string[];

    // Enhanced: External services integration
    external_services?: Array<{
        name: string;
        base_url: string;
        api_key_required: boolean;
        description?: string;
        documentation?: string;
    }>;

    // Enhanced: Custom pages and menu integration
    pages?: Array<{
        name: string;
        path: string;
        component: string;
        title: string;
        description?: string;
        icon?: string;
    }>;

    menu_items?: Array<{
        label: string;
        path: string;
        icon?: string;
        order?: number;
        parent?: string;
    }>;

    // UI widgets provided by the plugin (web)
    widgets?: {
        name: string;
        component: string;
        description: string;
        defaultSize: { width: number; height: number };
    }[];

    // Dependencies and meta
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    repository?: string;
    homepage?: string;
    license?: string;
    bugs?: string;

    // Engines and keywords
    engines?: { node?: string; npm?: string };
    keywords?: string[];

    // Plugin entry points
    main?: string; // For CLI plugins
    web?: string; // For web UI plugins
    background?: string; // For background services

    // Enhanced: Dashboard widget with configuration schema
    dashboard_widget?: {
        name: string;
        description: string;
        component: string;
        defaultSize: { width: number; height: number };
        size?: 'small' | 'medium' | 'large';
        position?: 'sidebar' | 'main' | 'floating';
        configSchema?: Record<string, any>; // Enhanced: widget configuration schema
    };

    // CLI integration
    commands?: PluginCommand[];

    // Enhanced: Flexible permissions (string array or object array)
    permissions: string[] | PluginPermission[];

    // Lifecycle hooks
    hooks?: {
        onInstall?: string;
        onUninstall?: string;
        onEnable?: string;
        onDisable?: string;
        onUpdate?: string;
    };

    // Configuration schema
    config_schema?: Record<string, any>;
    default_config?: Record<string, any>;

    // Enhanced: Webhook and OAuth integration
    webhooks?: Array<{
        name: string;
        endpoint: string;
        events: string[];
        description?: string;
    }>;

    oauth?: Array<{
        provider: string;
        scopes: string[];
        redirect_uri?: string;
        description?: string;
    }>;
}

// Core Plugin Metadata
export interface PluginMetadata {
    id: string;
    userId: string;
    name: string;
    description: string;
    version: string;
    author: PluginAuthor;
    isActive: boolean;
    tags: string[];
    category: PluginCategory;
    keywords: string[];
    homepage?: string;
    repository: string;
    license: string;

    // Pricing and availability
    price: number; // in cents, 0 for free
    currency: string;
    free: boolean;

    // Plugin technical details
    entry: string; // main entry point
    installCommand?: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;

    // Marketplace metadata
    rating: number;
    downloads: number;
    verified: boolean;
    featured: boolean;
    installDate: Date;
    lastUsed?: Date;
    usageCount: number;
    source: 'builtin' | 'community' | 'custom';
    config?: Record<string, any>;
    createdAt: string;
    updatedAt: string;

    // User-installed plugin metadata
    userInstalled?: boolean;
    unpublished?: boolean;

    // Media and documentation
    screenshots: string[];
    changelog: PluginChangelogEntry[];
    readme?: string;
    documentation?: string;

    // Runtime requirements
    permissions: PluginPermission[];
    minQirvoVersion?: string;
    maxQirvoVersion?: string;

    // Installation status (client-side only)
    installed?: boolean;
    enabled?: boolean;
    installedVersion?: string;
}

export interface InstalledPlugin extends PluginMetadata {
    installed: true;
    enabled: boolean;
    installedAt: string;
    installedVersion: string;
    config: Record<string, any>;
    lastUsed?: Date;
    hasWidgets?: boolean;
    size?: string;
    hasConfig?: boolean;

    // User-installed plugin specific fields
    userInstalled?: boolean;
    unpublished?: boolean;
}

export interface PluginConfigField {
    key: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
    title: string;
    description?: string;
    required?: boolean;
    default?: any;
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
}

// API Response Types
export interface PluginListResponse {
    plugins: PluginMetadata[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

export interface PluginInstallResponse {
    success: boolean;
    plugin: InstalledPlugin;
    message?: string;
    error?: string;
}

export interface PluginSearchFilters {
    query?: string;
    category?: string;
    tags?: string[];
    free?: boolean;
    verified?: boolean;
    featured?: boolean;
    minRating?: number;
    sortBy?: 'name' | 'rating' | 'downloads' | 'updated' | 'created';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

// Plugin Marketplace Actions
export type PluginAction =
    | { type: 'INSTALL_PLUGIN'; payload: { pluginId: string } }
    | { type: 'UNINSTALL_PLUGIN'; payload: { pluginId: string } }
    | { type: 'ENABLE_PLUGIN'; payload: { pluginId: string } }
    | { type: 'DISABLE_PLUGIN'; payload: { pluginId: string } }
    | { type: 'UPDATE_PLUGIN'; payload: { pluginId: string; version?: string } }
    | { type: 'CONFIGURE_PLUGIN'; payload: { pluginId: string; config: Record<string, any> } }
    | { type: 'PURCHASE_PLUGIN'; payload: { pluginId: string; paymentMethodId: string } };

// License and Payment Types
export interface PluginLicense {
    pluginId: string;
    userId: string;
    licenseKey: string;
    purchaseDate: string;
    expiryDate?: string;
    active: boolean;
    paymentId: string;
}

export interface PluginPayment {
    id: string;
    pluginId: string;
    userId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    stripePaymentIntentId: string;
    createdAt: string;
    completedAt?: string;
}

export interface PluginSubmission {
    id: string;
    pluginId: string;
    developerId: string;
    version: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    reviewedAt?: string;
    reviewNotes?: string;
    manifest: PluginManifest;
    sourceCode: string; // Base64 encoded or URL
}

// Base Plugin Class
export abstract class BasePlugin implements PluginLifecycleHooks {
    protected context!: PluginRuntimeContext;

    constructor() { }

    // Initialize plugin with runtime context
    public initialize(context: PluginRuntimeContext): void {
        this.context = context;
    }

    // Lifecycle hooks (optional to implement)
    async onInstall?(context: PluginRuntimeContext): Promise<void>;
    async onUninstall?(context: PluginRuntimeContext): Promise<void>;
    async onEnable?(context: PluginRuntimeContext): Promise<void>;
    async onDisable?(context: PluginRuntimeContext): Promise<void>;
    async onUpdate?(context: PluginRuntimeContext, oldVersion: string): Promise<void>;
    async onConfigChange?(context: PluginRuntimeContext, oldConfig: Record<string, any>): Promise<void>;

    // Utility methods
    protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: any[]): void {
        this.context.logger[level](message, ...args);
    }

    protected async getConfig<T = any>(key?: string): Promise<T> {
        if (key) {
            return this.context.config[key];
        }
        return this.context.config as T;
    }

    protected async setConfig(key: string, value: any): Promise<void> {
        // This would trigger a config update in the runtime
        this.context.config[key] = value;
    }

    protected async getStorage<T = any>(key: string): Promise<T | null> {
        try {
            return await this.context.storage.get(key);
        } catch (error) {
            this.log('error', `Failed to get storage key ${key}:`, error);
            return null;
        }
    }

    protected async setStorage(key: string, value: any): Promise<boolean> {
        try {
            await this.context.storage.set(key, value);
            return true;
        } catch (error) {
            this.log('error', `Failed to set storage key ${key}:`, error);
            return false;
        }
    }

    protected async notify(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
        this.context.api.notifications.show({ title, message, type });
    }

    protected async httpGet(url: string, options?: RequestInit): Promise<Response> {
        return this.context.api.http.get(url, options);
    }

    protected async httpPost(url: string, data: any, options?: RequestInit): Promise<Response> {
        return this.context.api.http.post(url, data, options);
    }
}

// Utility functions
export function createPlugin(pluginClass: new () => BasePlugin): BasePlugin {
    return new pluginClass();
}

export function validateManifest(manifest: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!manifest.manifest_version) errors.push('Missing manifest_version');
    if (!manifest.name) errors.push('Missing plugin name');
    if (!manifest.version) errors.push('Missing plugin version');
    if (!manifest.description) errors.push('Missing plugin description');
    if (!manifest.type) errors.push('Missing plugin type');

    // Enhanced: Flexible author validation
    if (!manifest.author) {
        errors.push('Missing author information');
    } else if (typeof manifest.author === 'object' && !manifest.author.name) {
        errors.push('Author object must include name field');
    } else if (typeof manifest.author === 'object' && !manifest.author.email) {
        warnings.push('Author object should include email for better contact');
    }

    // Enhanced: Flexible permissions validation
    if (!Array.isArray(manifest.permissions)) {
        errors.push('Permissions must be an array');
    } else {
        const validPermissions = ['network', 'storage', 'notifications', 'filesystem', 'system', 'calendar', 'contacts', 'location', 'camera', 'microphone'];

        manifest.permissions.forEach((perm: any, index: number) => {
            if (typeof perm === 'string') {
                if (!validPermissions.includes(perm)) {
                    warnings.push(`Unknown permission: ${perm}`);
                }
            } else if (typeof perm === 'object') {
                if (!perm.type || !perm.description) {
                    errors.push(`Permission at index ${index} missing required fields`);
                } else if (!validPermissions.includes(perm.type)) {
                    warnings.push(`Unknown permission type: ${perm.type}`);
                }
            }
        });
    }

    // Enhanced: Type-specific validation
    if (manifest.type === 'dashboard-widget' && !manifest.dashboard_widget) {
        errors.push('dashboard-widget type requires dashboard_widget configuration');
    }

    if (manifest.type === 'page' && !manifest.pages) {
        warnings.push('page type should include pages configuration');
    }

    if (manifest.type === 'cli-tool' && !manifest.commands) {
        warnings.push('cli-tool type should include commands configuration');
    }

    // Enhanced: External services validation
    if (manifest.external_services && Array.isArray(manifest.external_services)) {
        manifest.external_services.forEach((service: any, index: number) => {
            if (!service.name) errors.push(`External service ${index} missing name`);
            if (!service.base_url) errors.push(`External service ${index} missing base_url`);
            if (typeof service.api_key_required !== 'boolean') {
                warnings.push(`External service ${index} should specify api_key_required as boolean`);
            }
        });
    }

    // Enhanced: Pages validation
    if (manifest.pages && Array.isArray(manifest.pages)) {
        manifest.pages.forEach((page: any, index: number) => {
            if (!page.name) errors.push(`Page ${index} missing name`);
            if (!page.path) errors.push(`Page ${index} missing path`);
            if (!page.component) errors.push(`Page ${index} missing component`);
            if (!page.title) errors.push(`Page ${index} missing title`);
        });
    }

    // Validate entry points
    if (!manifest.main && !manifest.web && !manifest.background) {
        errors.push('At least one entry point (main, web, or background) is required');
    }

    // Validate commands if present
    if (manifest.commands && Array.isArray(manifest.commands)) {
        manifest.commands.forEach((cmd: any, index: number) => {
            if (!cmd.name || !cmd.description || !cmd.usage) {
                errors.push(`Command at index ${index} missing required fields`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

export function createCommand(
    name: string,
    description: string,
    handler: (args: string[], context: PluginRuntimeContext) => Promise<void>,
    options?: {
        usage?: string;
        aliases?: string[];
        options?: PluginCommandOption[];
    }
): PluginCommand {
    return {
        name,
        description,
        usage: options?.usage || `${name} [options]`,
        aliases: options?.aliases,
        options: options?.options,
        handler
    };
}

// Marketplace Utility Functions
export function validatePluginMetadata(metadata: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.id) errors.push('Missing plugin ID');
    if (!metadata.name) errors.push('Missing plugin name');
    if (!metadata.version) errors.push('Missing plugin version');
    if (!metadata.description) errors.push('Missing plugin description');
    if (!metadata.author?.name) errors.push('Missing author name');
    if (!metadata.category) errors.push('Missing plugin category');
    if (!metadata.repository) errors.push('Missing repository URL');
    if (!metadata.license) errors.push('Missing license');
    if (!metadata.entry) errors.push('Missing entry point');
    if (typeof metadata.price !== 'number') errors.push('Price must be a number');
    if (!metadata.currency) errors.push('Missing currency');
    if (!Array.isArray(metadata.tags)) errors.push('Tags must be an array');
    if (!Array.isArray(metadata.keywords)) errors.push('Keywords must be an array');
    if (!Array.isArray(metadata.permissions)) errors.push('Permissions must be an array');
    if (!Array.isArray(metadata.screenshots)) errors.push('Screenshots must be an array');
    if (!Array.isArray(metadata.changelog)) errors.push('Changelog must be an array');

    return {
        valid: errors.length === 0,
        errors
    };
}

export function createPluginMetadata(
    basic: {
        id: string;
        name: string;
        version: string;
        description: string;
        author: PluginAuthor;
        category: PluginCategory;
        repository: string;
        license: string;
        entry: string;
    },
    options?: {
        tags?: string[];
        keywords?: string[];
        homepage?: string;
        price?: number;
        currency?: string;
        free?: boolean;
        permissions?: PluginPermission[];
        screenshots?: string[];
        changelog?: PluginChangelogEntry[];
        readme?: string;
        documentation?: string;
        dependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
        installCommand?: string;
        minQirvoVersion?: string;
        maxQirvoVersion?: string;
    }
): PluginMetadata {
    return {
        ...basic,
        tags: options?.tags || [],
        keywords: options?.keywords || [],
        homepage: options?.homepage,
        price: options?.price || 0,
        currency: options?.currency || 'USD',
        free: options?.free ?? (options?.price === 0 || !options?.price),
        permissions: options?.permissions || [],
        screenshots: options?.screenshots || [],
        changelog: options?.changelog || [],
        readme: options?.readme,
        documentation: options?.documentation,
        dependencies: options?.dependencies,
        peerDependencies: options?.peerDependencies,
        installCommand: options?.installCommand,
        minQirvoVersion: options?.minQirvoVersion,
        maxQirvoVersion: options?.maxQirvoVersion,
        // Fields required by core metadata with sensible defaults
        userId: (basic as any).userId ?? '',
        isActive: (basic as any).isActive ?? true,
        installDate: (options as any)?.installDate ?? new Date(),
        lastUsed: (options as any)?.lastUsed,
        usageCount: (options as any)?.usageCount ?? 0,
        source: (options as any)?.source ?? 'custom',
        config: (options as any)?.config ?? {},
        // Marketplace metadata (defaults)
        rating: 0,
        downloads: 0,
        verified: false,
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

export function createPermission(
    type: PluginPermission['type'],
    description: string,
    required: boolean = true
): PluginPermission {
    return { type, description, required };
}

export function createChangelogEntry(
    version: string,
    changes: string[],
    options?: { date?: string; breaking?: boolean }
): PluginChangelogEntry {
    return {
        version,
        date: options?.date || new Date().toISOString().split('T')[0],
        changes,
        breaking: options?.breaking || false
    };
}

export function formatPluginPrice(price: number, currency: string = 'USD'): string {
    if (price === 0) return 'Free';

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: price % 100 === 0 ? 0 : 2
    });

    return formatter.format(price / 100);
}

export function isPluginCompatible(
    plugin: PluginMetadata,
    qirvoVersion: string
): boolean {
    if (plugin.minQirvoVersion && compareVersions(qirvoVersion, plugin.minQirvoVersion) < 0) {
        return false;
    }

    if (plugin.maxQirvoVersion && compareVersions(qirvoVersion, plugin.maxQirvoVersion) > 0) {
        return false;
    }

    return true;
}

// Simple version comparison utility
function compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;

        if (aPart > bPart) return 1;
        if (aPart < bPart) return -1;
    }

    return 0;
}

// Plugin Runtime Helpers
export class PluginRuntime {
    private static instances = new Map<string, BasePlugin>();

    static register(pluginId: string, plugin: BasePlugin): void {
        this.instances.set(pluginId, plugin);
    }

    static get(pluginId: string): BasePlugin | undefined {
        return this.instances.get(pluginId);
    }

    static unregister(pluginId: string): boolean {
        return this.instances.delete(pluginId);
    }

    static list(): string[] {
        return Array.from(this.instances.keys());
    }

    static clear(): void {
        this.instances.clear();
    }
}

// CLI-specific types for plugin development
export interface PluginSDK {
    cli: {
        registerCommand(command: CLICommand): Promise<void>;
        unregisterCommand(name: string): Promise<void>;
        executeCommand(name: string, args: string[]): Promise<void>;
    };
    config: {
        get<T = any>(key?: string): Promise<T>;
        set(key: string, value: any): Promise<void>;
        delete(key: string): Promise<void>;
        clear(): Promise<void>;
    };
    storage: PluginStorage;
    api: PluginAPI;
    logger: PluginLogger;
}

export interface PluginContext {
    plugin: InstalledPlugin;
    user?: { id: string; email?: string; preferences?: Record<string, any> };
    environment: 'development' | 'production' | 'test';
    version: string;
}

export interface CLICommand {
    name: string;
    description: string;
    usage?: string;
    aliases?: string[];
    options?: PluginCommandOption[];
    handler: (context: CLIContext) => Promise<void>;
}

export interface CLIContext {
    args: string[];
    options: Record<string, any>;
    output: {
        info(message: string): void;
        success(message: string): void;
        error(message: string): void;
        warn(message: string): void;
        log(message: string): void;
    };
    plugin: PluginContext;
    sdk: PluginSDK;
}

// Export all types
export * from './types';

// Export API endpoints and client
export * from './endpoints';

// Import for default export
import { apiClient, endpoints } from './endpoints';

// Default export
export default {
    BasePlugin,
    PluginRuntime,
    createPlugin,
    createPluginMetadata,
    createPermission,
    createChangelogEntry,
    createCommand,
    validateManifest,
    validatePluginMetadata,
    formatPluginPrice,
    isPluginCompatible,
    apiClient,
    endpoints
};
