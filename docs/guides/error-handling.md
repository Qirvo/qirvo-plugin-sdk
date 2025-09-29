# Error Handling Guide

This guide covers comprehensive error handling strategies for Qirvo plugins, including error boundaries, graceful degradation, user-friendly error messages, and debugging techniques.

## Table of Contents

- [Error Handling Philosophy](#error-handling-philosophy)
- [Error Types and Classification](#error-types-and-classification)
- [Error Boundaries](#error-boundaries)
- [Async Error Handling](#async-error-handling)
- [User-Friendly Error Messages](#user-friendly-error-messages)
- [Error Recovery Strategies](#error-recovery-strategies)

## Error Handling Philosophy

### Core Principles

1. **Fail Fast, Recover Gracefully** - Detect errors early but provide recovery paths
2. **User-Centric Messages** - Show helpful, actionable error messages to users
3. **Comprehensive Logging** - Log detailed error information for debugging
4. **Graceful Degradation** - Maintain partial functionality when possible
5. **Proactive Prevention** - Validate inputs and handle edge cases

### Error Handling Strategy

```typescript
// Comprehensive error handling strategy
export class PluginErrorHandler {
  private logger: Logger;
  private errorReporter: ErrorReporter;
  private recoveryStrategies: Map<string, RecoveryStrategy>;

  constructor(logger: Logger, errorReporter: ErrorReporter) {
    this.logger = logger;
    this.errorReporter = errorReporter;
    this.recoveryStrategies = new Map();
    this.setupGlobalErrorHandlers();
  }

  async handleError(error: Error, context: ErrorContext): Promise<ErrorResult> {
    // 1. Classify the error
    const errorType = this.classifyError(error);
    
    // 2. Log the error with context
    this.logError(error, context, errorType);
    
    // 3. Report to monitoring service if critical
    if (errorType.severity === 'critical') {
      await this.errorReporter.report(error, context);
    }
    
    // 4. Attempt recovery
    const recoveryResult = await this.attemptRecovery(error, errorType, context);
    
    // 5. Generate user-friendly message
    const userMessage = this.generateUserMessage(error, errorType, recoveryResult);
    
    return {
      error,
      errorType,
      recoveryResult,
      userMessage,
      canRetry: recoveryResult.canRetry
    };
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        type: 'unhandled-promise-rejection',
        source: 'global'
      });
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'global-error',
        source: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }
}

interface ErrorContext {
  type: string;
  source: string;
  userId?: string;
  pluginId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface ErrorResult {
  error: Error;
  errorType: ErrorClassification;
  recoveryResult: RecoveryResult;
  userMessage: string;
  canRetry: boolean;
}
```

## Error Types and Classification

### Error Classification System

```typescript
// Comprehensive error classification
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  CONFIGURATION = 'configuration',
  STORAGE = 'storage',
  EXTERNAL_API = 'external-api',
  RUNTIME = 'runtime',
  USER_INPUT = 'user-input'
}

export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  retryable: boolean;
  userActionRequired: boolean;
}

export class ErrorClassifier {
  classify(error: Error): ErrorClassification {
    // Network errors
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        userActionRequired: false
      };
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        recoverable: true,
        retryable: false,
        userActionRequired: true
      };
    }

    // Authentication errors
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        retryable: false,
        userActionRequired: true
      };
    }

    // Configuration errors
    if (error.name === 'ConfigurationError') {
      return {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        retryable: false,
        userActionRequired: true
      };
    }

    // Storage errors
    if (error.name === 'QuotaExceededError' || error.message.includes('storage')) {
      return {
        category: ErrorCategory.STORAGE,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: false,
        userActionRequired: true
      };
    }

    // Default classification for unknown errors
    return {
      category: ErrorCategory.RUNTIME,
      severity: ErrorSeverity.CRITICAL,
      recoverable: false,
      retryable: false,
      userActionRequired: false
    };
  }
}
```

### Custom Error Classes

```typescript
// Custom error classes for different scenarios
export class PluginError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'PluginError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
  }
}

export class ValidationError extends PluginError {
  public readonly field: string;
  public readonly value: any;

  constructor(field: string, value: any, message: string) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class NetworkError extends PluginError {
  public readonly status?: number;
  public readonly url: string;

  constructor(url: string, status?: number, message?: string) {
    super(
      message || `Network request failed: ${status || 'Unknown error'}`,
      'NETWORK_ERROR',
      { url, status }
    );
    this.name = 'NetworkError';
    this.url = url;
    this.status = status;
  }
}

export class ConfigurationError extends PluginError {
  public readonly configKey: string;

  constructor(configKey: string, message: string) {
    super(message, 'CONFIGURATION_ERROR', { configKey });
    this.name = 'ConfigurationError';
    this.configKey = configKey;
  }
}

export class ExternalAPIError extends PluginError {
  public readonly apiName: string;
  public readonly endpoint: string;
  public readonly responseData?: any;

  constructor(
    apiName: string,
    endpoint: string,
    message: string,
    responseData?: any
  ) {
    super(message, 'EXTERNAL_API_ERROR', { apiName, endpoint, responseData });
    this.name = 'ExternalAPIError';
    this.apiName = apiName;
    this.endpoint = endpoint;
    this.responseData = responseData;
  }
}
```

## Error Boundaries

### React Error Boundary

```typescript
// Comprehensive React error boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class PluginErrorBoundary extends React.Component<
  React.PropsWithChildren<ErrorBoundaryProps>,
  ErrorBoundaryState
> {
  private errorHandler: PluginErrorHandler;

  constructor(props: React.PropsWithChildren<ErrorBoundaryProps>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
    this.errorHandler = new PluginErrorHandler(props.logger, props.errorReporter);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId()
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorResult = await this.errorHandler.handleError(error, {
      type: 'react-error-boundary',
      source: 'component',
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    });

    this.setState({
      errorInfo,
      errorId: errorResult.errorId
    });

    // Report to parent if callback provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorResult);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // Default error UI
      return (
        <ErrorDisplay
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onReport={() => this.props.onReport?.(this.state.error)}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorBoundaryProps {
  fallback?: (error: Error | null, errorInfo: ErrorInfo | null, retry: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorResult: ErrorResult) => void;
  onReport?: (error: Error | null) => void;
  logger: Logger;
  errorReporter: ErrorReporter;
}
```

### Error Display Component

```typescript
// User-friendly error display component
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorId,
  onRetry,
  onReport,
  showDetails = false
}) => {
  const [detailsVisible, setDetailsVisible] = useState(showDetails);
  const [reportSent, setReportSent] = useState(false);

  const handleReport = async () => {
    if (onReport) {
      await onReport();
      setReportSent(true);
    }
  };

  const errorMessage = getErrorMessage(error);
  const canRetry = isRetryableError(error);

  return (
    <div className="error-display">
      <div className="error-icon">
        <AlertTriangleIcon size={48} color="#ff6b6b" />
      </div>
      
      <div className="error-content">
        <h3>Something went wrong</h3>
        <p className="error-message">{errorMessage}</p>
        
        {errorId && (
          <p className="error-id">
            Error ID: <code>{errorId}</code>
          </p>
        )}
        
        <div className="error-actions">
          {canRetry && (
            <button onClick={onRetry} className="retry-button">
              Try Again
            </button>
          )}
          
          <button
            onClick={handleReport}
            disabled={reportSent}
            className="report-button"
          >
            {reportSent ? 'Report Sent' : 'Report Issue'}
          </button>
          
          <button
            onClick={() => setDetailsVisible(!detailsVisible)}
            className="details-button"
          >
            {detailsVisible ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        {detailsVisible && (
          <div className="error-details">
            <h4>Technical Details</h4>
            <pre className="error-stack">
              {error?.stack || 'No stack trace available'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

interface ErrorDisplayProps {
  error: Error | null;
  errorId: string | null;
  onRetry?: () => void;
  onReport?: () => Promise<void>;
  showDetails?: boolean;
}
```

## Async Error Handling

### Async Operation Wrapper

```typescript
// Wrapper for handling async operations with comprehensive error handling
export class AsyncOperationHandler {
  private retryConfig: RetryConfig;
  private timeoutMs: number;

  constructor(retryConfig: RetryConfig = {}, timeoutMs: number = 30000) {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      ...retryConfig
    };
    this.timeoutMs = timeoutMs;
  }

  async execute<T>(
    operation: () => Promise<T>,
    context: OperationContext
  ): Promise<OperationResult<T>> {
    let lastError: Error;
    let attempt = 0;

    while (attempt <= this.retryConfig.maxRetries) {
      try {
        // Add timeout to the operation
        const result = await this.withTimeout(operation(), this.timeoutMs);
        
        return {
          success: true,
          data: result,
          attempts: attempt + 1
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        // Log the attempt
        console.warn(`Operation failed (attempt ${attempt}):`, {
          error: lastError.message,
          context,
          willRetry: attempt <= this.retryConfig.maxRetries
        });

        // Don't retry if it's not a retryable error
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt <= this.retryConfig.maxRetries) {
          await this.delay(this.calculateDelay(attempt));
        }
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts: attempt
    };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private isRetryableError(error: Error): boolean {
    // Network errors are usually retryable
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return true;
    }

    // Timeout errors are retryable
    if (error.message.includes('timeout')) {
      return true;
    }

    // 5xx server errors are retryable
    if (error.message.includes('50')) {
      return true;
    }

    // Rate limit errors are retryable
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return true;
    }

    return false;
  }

  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

interface OperationContext {
  operationName: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}
```

### Promise Error Handling Utilities

```typescript
// Utility functions for promise error handling
export const asyncUtils = {
  // Safe async execution with error handling
  safeAsync: async <T>(
    operation: () => Promise<T>,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      return await operation();
    } catch (error) {
      console.error('Async operation failed:', error);
      return fallback;
    }
  },

  // Execute multiple async operations with individual error handling
  allSettledWithErrors: async <T>(
    operations: (() => Promise<T>)[]
  ): Promise<SettledResult<T>[]> => {
    const promises = operations.map(async (op, index) => {
      try {
        const result = await op();
        return { status: 'fulfilled' as const, value: result, index };
      } catch (error) {
        return { 
          status: 'rejected' as const, 
          reason: error instanceof Error ? error : new Error(String(error)),
          index 
        };
      }
    });

    return Promise.all(promises);
  },

  // Circuit breaker pattern for failing services
  circuitBreaker: <T>(
    operation: () => Promise<T>,
    options: CircuitBreakerOptions = {}
  ): (() => Promise<T>) => {
    const {
      failureThreshold = 5,
      resetTimeoutMs = 60000,
      monitoringPeriodMs = 10000
    } = options;

    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset if monitoring period has passed
      if (now - lastFailureTime > monitoringPeriodMs) {
        failures = 0;
      }

      // Check if circuit should be closed again
      if (state === 'open' && now - lastFailureTime > resetTimeoutMs) {
        state = 'half-open';
      }

      // Reject immediately if circuit is open
      if (state === 'open') {
        throw new Error('Circuit breaker is open');
      }

      try {
        const result = await operation();
        
        // Reset on success
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        // Open circuit if threshold reached
        if (failures >= failureThreshold) {
          state = 'open';
        }

        throw error;
      }
    };
  }
};

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  monitoringPeriodMs?: number;
}

type SettledResult<T> = 
  | { status: 'fulfilled'; value: T; index: number }
  | { status: 'rejected'; reason: Error; index: number };
```

## User-Friendly Error Messages

### Error Message Generator

```typescript
// Generate user-friendly error messages
export class ErrorMessageGenerator {
  private messages: Map<string, ErrorMessageTemplate> = new Map();

  constructor() {
    this.setupDefaultMessages();
  }

  private setupDefaultMessages(): void {
    this.messages.set('NetworkError', {
      title: 'Connection Problem',
      message: 'Unable to connect to the service. Please check your internet connection and try again.',
      actions: ['retry', 'check-connection']
    });

    this.messages.set('ValidationError', {
      title: 'Invalid Input',
      message: 'Please check your input and try again.',
      actions: ['fix-input']
    });

    this.messages.set('AuthenticationError', {
      title: 'Authentication Required',
      message: 'Please sign in to continue.',
      actions: ['sign-in']
    });

    this.messages.set('ConfigurationError', {
      title: 'Configuration Issue',
      message: 'There\'s a problem with the plugin configuration. Please check your settings.',
      actions: ['open-settings', 'contact-support']
    });

    this.messages.set('QuotaExceededError', {
      title: 'Storage Full',
      message: 'Your storage is full. Please free up some space or upgrade your plan.',
      actions: ['manage-storage', 'upgrade-plan']
    });
  }

  generateMessage(error: Error, context?: ErrorContext): UserErrorMessage {
    const template = this.messages.get(error.name) || this.getDefaultTemplate();
    
    return {
      title: template.title,
      message: this.interpolateMessage(template.message, error, context),
      actions: template.actions,
      severity: this.getSeverity(error),
      canRetry: this.canRetry(error),
      helpUrl: this.getHelpUrl(error)
    };
  }

  private interpolateMessage(
    template: string, 
    error: Error, 
    context?: ErrorContext
  ): string {
    let message = template;

    // Replace error-specific placeholders
    if (error instanceof ValidationError) {
      message = message.replace('{field}', error.field);
    }

    if (error instanceof NetworkError) {
      message = message.replace('{url}', error.url);
      message = message.replace('{status}', String(error.status || 'unknown'));
    }

    // Replace context placeholders
    if (context?.metadata) {
      Object.entries(context.metadata).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, String(value));
      });
    }

    return message;
  }

  private getDefaultTemplate(): ErrorMessageTemplate {
    return {
      title: 'Unexpected Error',
      message: 'Something went wrong. Please try again or contact support if the problem persists.',
      actions: ['retry', 'contact-support']
    };
  }

  private getSeverity(error: Error): 'low' | 'medium' | 'high' {
    if (error.name === 'ValidationError') return 'low';
    if (error.name === 'NetworkError') return 'medium';
    return 'high';
  }

  private canRetry(error: Error): boolean {
    const retryableErrors = ['NetworkError', 'TimeoutError', 'ServiceUnavailableError'];
    return retryableErrors.includes(error.name);
  }

  private getHelpUrl(error: Error): string | undefined {
    const helpUrls: Record<string, string> = {
      'ConfigurationError': '/help/configuration',
      'AuthenticationError': '/help/authentication',
      'NetworkError': '/help/connectivity'
    };

    return helpUrls[error.name];
  }
}

interface ErrorMessageTemplate {
  title: string;
  message: string;
  actions: string[];
}

interface UserErrorMessage {
  title: string;
  message: string;
  actions: string[];
  severity: 'low' | 'medium' | 'high';
  canRetry: boolean;
  helpUrl?: string;
}
```

## Error Recovery Strategies

### Recovery Strategy Framework

```typescript
// Framework for implementing error recovery strategies
export class ErrorRecoveryManager {
  private strategies: Map<string, RecoveryStrategy> = new Map();

  constructor() {
    this.setupDefaultStrategies();
  }

  private setupDefaultStrategies(): void {
    // Network error recovery
    this.strategies.set('NetworkError', {
      canRecover: () => true,
      recover: async (error, context) => {
        // Try to reconnect
        const isOnline = await this.checkConnectivity();
        if (isOnline) {
          return { success: true, message: 'Connection restored' };
        }
        return { success: false, message: 'Still offline' };
      }
    });

    // Configuration error recovery
    this.strategies.set('ConfigurationError', {
      canRecover: (error) => error instanceof ConfigurationError,
      recover: async (error, context) => {
        if (error instanceof ConfigurationError) {
          // Try to load default configuration
          const defaultConfig = await this.loadDefaultConfig(error.configKey);
          if (defaultConfig) {
            return { 
              success: true, 
              message: 'Loaded default configuration',
              data: defaultConfig
            };
          }
        }
        return { success: false, message: 'Cannot recover configuration' };
      }
    });

    // Storage error recovery
    this.strategies.set('QuotaExceededError', {
      canRecover: () => true,
      recover: async (error, context) => {
        // Try to clean up old data
        const cleaned = await this.cleanupStorage();
        if (cleaned > 0) {
          return { 
            success: true, 
            message: `Freed up ${cleaned} items from storage`
          };
        }
        return { success: false, message: 'Cannot free up storage space' };
      }
    });
  }

  async attemptRecovery(
    error: Error, 
    context: ErrorContext
  ): Promise<RecoveryResult> {
    const strategy = this.strategies.get(error.name);
    
    if (!strategy || !strategy.canRecover(error, context)) {
      return {
        success: false,
        canRetry: false,
        message: 'No recovery strategy available'
      };
    }

    try {
      const result = await strategy.recover(error, context);
      return {
        ...result,
        canRetry: result.success
      };
    } catch (recoveryError) {
      return {
        success: false,
        canRetry: false,
        message: `Recovery failed: ${recoveryError.message}`
      };
    }
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async loadDefaultConfig(configKey: string): Promise<any> {
    const defaults: Record<string, any> = {
      'apiKey': '',
      'refreshInterval': 300,
      'theme': 'light',
      'notifications': true
    };

    return defaults[configKey];
  }

  private async cleanupStorage(): Promise<number> {
    // Implementation would clean up old cache entries, logs, etc.
    // Return number of items cleaned
    return 0;
  }
}

interface RecoveryStrategy {
  canRecover: (error: Error, context?: ErrorContext) => boolean;
  recover: (error: Error, context?: ErrorContext) => Promise<{
    success: boolean;
    message: string;
    data?: any;
  }>;
}

interface RecoveryResult {
  success: boolean;
  canRetry: boolean;
  message: string;
  data?: any;
}
```

This comprehensive error handling guide provides all the tools and strategies needed to build robust, user-friendly error handling in Qirvo plugins.

---

**Next**: [Security Guide](./security.md)
