// Additional type definitions for the Qirvo Plugin SDK
// This file provides supplementary types and re-exports from the main index

// Re-export all main types for convenience
export type {
  // Core Types
  PluginAuthor,
  PluginDeveloper,
  PluginPermission,
  PluginCategory,
  PluginManifestCategory,
  PluginChangelogEntry,
  PluginMetadata,
  InstalledPlugin,
  PluginManifest,
  PluginCommand,
  PluginCommandOption,
  PluginConfigField,

  // Runtime Types
  PluginRuntimeContext,
  PluginStorage,
  PluginAPI,
  PluginLogger,
  PluginLifecycleHooks,

  // API Response Types
  PluginListResponse,
  PluginInstallResponse,
  PluginSearchFilters,
  PluginAction,

  // Payment and Licensing
  PluginLicense,
  PluginPayment,
  PluginSubmission,

  // Admin Approval Workflow Types
  PluginApprovalStatus,
  PluginApprovalRequest,
  AdminPluginAction,
  AdminDashboardStats,
  PluginSecurityScan,
  PluginRuntime
} from './index';

// Additional utility types specific to SDK usage
export interface PluginWidget {
  id: string;
  pluginId: string;
  name: string;
  component: string;
  size: 'small' | 'medium' | 'large';
  position: 'sidebar' | 'main' | 'floating';
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PluginActionResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Plugin Development Helpers
export interface PluginDevConfig {
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    website?: string;
  };
  category: string;
  permissions: string[];
  entry: string;
  buildCommand?: string;
  testCommand?: string;
  devDependencies?: Record<string, string>;
}

export interface PluginBuildResult {
  success: boolean;
  outputPath?: string;
  errors?: string[];
  warnings?: string[];
  size?: number;
  buildTime?: number;
}

// Plugin Testing Types
export interface PluginTestContext {
  plugin: any;
  mockStorage: Record<string, any>;
  mockAPI: Partial<import('./index').PluginAPI>;
  mockLogger: {
    logs: Array<{ level: string; message: string; args: any[] }>;
  };
}

// Admin Plugin Development Types
export interface AdminPluginContext {
  isAdmin: boolean;
  permissions: string[];
  canApprovePlugins: boolean;
  canRejectPlugins: boolean;
  canFlagSecurity: boolean;
}

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  securityFlags: string[];
  manifest?: any;
}

export interface PluginSecurityContext {
  userId?: string;
  userRole?: string;
  permissions: string[];
  networkAccess: boolean;
  fileSystemAccess: boolean;
  dangerousPermissions: string[];
}

export interface PluginTestResult {
  passed: boolean;
  tests: Array<{
    name: string;
    passed: boolean;
    error?: string;
    duration?: number;
  }>;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}
