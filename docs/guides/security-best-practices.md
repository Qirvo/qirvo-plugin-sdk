# Security Best Practices

Security is paramount when developing Qirvo plugins. This guide covers essential security practices to protect user data, prevent vulnerabilities, and ensure your plugin meets security standards.

## Table of Contents

- [Input Validation](#input-validation)
- [Secure Data Storage](#secure-data-storage)
- [Authentication & Authorization](#authentication--authorization)
- [Secure Communication](#secure-communication)
- [XSS & Injection Prevention](#xss--injection-prevention)
- [Security Auditing](#security-auditing)

## Input Validation

### Always Validate User Input

```typescript
class SecurePlugin extends BasePlugin {
  validateUserInput(input: any): ValidationResult {
    const errors: string[] = [];
    
    // Type validation
    if (typeof input.email !== 'string') {
      errors.push('Email must be a string');
    }
    
    // Format validation
    if (input.email && !this.isValidEmail(input.email)) {
      errors.push('Invalid email format');
    }
    
    // Length validation
    if (input.message && input.message.length > 1000) {
      errors.push('Message too long (max 1000 characters)');
    }
    
    // Sanitization
    const sanitized = {
      email: this.sanitizeEmail(input.email),
      message: this.sanitizeText(input.message)
    };
    
    return {
      valid: errors.length === 0,
      errors,
      data: sanitized
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private sanitizeEmail(email: string): string {
    return email?.toLowerCase().trim() || '';
  }

  private sanitizeText(text: string): string {
    return text?.replace(/[<>]/g, '').trim().substring(0, 1000) || '';
  }
}
```

### API Parameter Validation

```typescript
async processApiRequest(params: any): Promise<ApiResponse> {
  // Validate required parameters
  const required = ['userId', 'action'];
  const missing = required.filter(param => !params[param]);
  
  if (missing.length > 0) {
    throw new ValidationError(`Missing required parameters: ${missing.join(', ')}`);
  }
  
  // Validate parameter types and ranges
  if (typeof params.userId !== 'string' || params.userId.length < 1) {
    throw new ValidationError('Invalid userId format');
  }
  
  if (!['create', 'update', 'delete'].includes(params.action)) {
    throw new ValidationError('Invalid action type');
  }
  
  // Sanitize parameters
  const sanitizedParams = {
    userId: params.userId.replace(/[^a-zA-Z0-9_-]/g, ''),
    action: params.action.toLowerCase(),
    data: this.sanitizeObject(params.data)
  };
  
  return await this.executeAction(sanitizedParams);
}
```

## Secure Data Storage

### Encrypt Sensitive Data

```typescript
class SecureStorage {
  constructor(private plugin: BasePlugin) {}

  async storeSecureData(key: string, data: any): Promise<void> {
    try {
      // Encrypt sensitive data before storage
      const encrypted = await this.encrypt(JSON.stringify(data));
      const storageKey = this.hashKey(key);
      
      await this.plugin.setStorage(storageKey, {
        encrypted: true,
        data: encrypted,
        timestamp: new Date().toISOString()
      });
      
      this.plugin.log('debug', 'Secure data stored successfully');
    } catch (error) {
      this.plugin.log('error', 'Failed to store secure data:', error);
      throw new SecurityError('Data encryption failed');
    }
  }

  async retrieveSecureData(key: string): Promise<any> {
    try {
      const storageKey = this.hashKey(key);
      const stored = await this.plugin.getStorage(storageKey);
      
      if (!stored || !stored.encrypted) {
        return null;
      }
      
      const decrypted = await this.decrypt(stored.data);
      return JSON.parse(decrypted);
    } catch (error) {
      this.plugin.log('error', 'Failed to retrieve secure data:', error);
      throw new SecurityError('Data decryption failed');
    }
  }

  private async encrypt(data: string): Promise<string> {
    // Use Web Crypto API for encryption
    const encoder = new TextEncoder();
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encryptedData: string): Promise<string> {
    const decoder = new TextDecoder();
    const key = await this.getEncryptionKey();
    
    // Extract IV and encrypted data
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    // In production, derive key from user credentials or secure storage
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('your-secure-key-derivation'),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('plugin-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private hashKey(key: string): string {
    // Simple key hashing (use crypto.subtle.digest in production)
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }
}
```

### Secure Configuration Management

```typescript
class SecureConfig {
  constructor(private plugin: BasePlugin) {}

  async getSecureConfig(key: string): Promise<string | null> {
    // Try environment variables first
    const envValue = process.env[`PLUGIN_${key.toUpperCase()}`];
    if (envValue) {
      return envValue;
    }
    
    // Try secure storage
    const stored = await this.plugin.getStorage(`secure_${key}`);
    if (stored) {
      return await this.decryptConfig(stored);
    }
    
    return null;
  }

  async setSecureConfig(key: string, value: string): Promise<void> {
    const encrypted = await this.encryptConfig(value);
    await this.plugin.setStorage(`secure_${key}`, encrypted);
  }

  private async encryptConfig(value: string): Promise<string> {
    // Implement strong encryption for configuration values
    return btoa(value); // Simplified - use proper encryption
  }

  private async decryptConfig(encrypted: string): Promise<string> {
    // Implement decryption
    return atob(encrypted); // Simplified - use proper decryption
  }
}
```

## Authentication & Authorization

### Secure API Authentication

```typescript
class SecureApiClient {
  constructor(
    private plugin: BasePlugin,
    private config: SecureConfig
  ) {}

  async authenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const apiKey = await this.config.getSecureConfig('api_key');
    if (!apiKey) {
      throw new AuthenticationError('API key not configured');
    }

    // Validate API key format
    if (!this.isValidApiKey(apiKey)) {
      throw new AuthenticationError('Invalid API key format');
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': `Qirvo-Plugin/${this.plugin.context.plugin.version}`,
      ...options.headers
    };

    try {
      const response = await this.plugin.context.api.http.request(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        throw new AuthenticationError('API authentication failed');
      }

      if (response.status === 403) {
        throw new AuthorizationError('Insufficient permissions');
      }

      return response;
    } catch (error) {
      this.plugin.log('error', 'Authenticated request failed:', error);
      throw error;
    }
  }

  private isValidApiKey(apiKey: string): boolean {
    // Validate API key format based on service requirements
    return apiKey.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
  }
}
```

### Permission Validation

```typescript
class PermissionValidator {
  constructor(private context: PluginRuntimeContext) {}

  requirePermission(permission: string): void {
    if (!this.hasPermission(permission)) {
      throw new PermissionError(`Permission '${permission}' is required`);
    }
  }

  requirePermissions(permissions: string[]): void {
    const missing = permissions.filter(p => !this.hasPermission(p));
    if (missing.length > 0) {
      throw new PermissionError(`Missing permissions: ${missing.join(', ')}`);
    }
  }

  hasPermission(permission: string): boolean {
    return this.context.plugin.permissions.some(p => 
      p.type === permission && p.granted
    );
  }

  async requestPermissionWithJustification(
    permission: string,
    justification: string
  ): Promise<boolean> {
    if (this.hasPermission(permission)) {
      return true;
    }

    // Show permission request dialog with justification
    return await this.showPermissionDialog(permission, justification);
  }

  private async showPermissionDialog(
    permission: string,
    justification: string
  ): Promise<boolean> {
    // Implementation would show user dialog
    return new Promise((resolve) => {
      // Platform-specific permission request UI
      resolve(false); // Default to denied
    });
  }
}
```

## Secure Communication

### HTTPS Only Communication

```typescript
class SecureHttpClient {
  constructor(private plugin: BasePlugin) {}

  async secureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Ensure HTTPS
    const secureUrl = this.ensureHttps(url);
    
    // Add security headers
    const secureHeaders = {
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...options.headers
    };

    // Validate SSL certificate (in production environment)
    const secureOptions = {
      ...options,
      headers: secureHeaders,
      // Add certificate validation options
    };

    try {
      const response = await this.plugin.context.api.http.request(secureUrl, secureOptions);
      
      // Validate response headers
      this.validateResponseSecurity(response);
      
      return response;
    } catch (error) {
      this.plugin.log('error', 'Secure request failed:', error);
      throw new SecurityError('Secure communication failed');
    }
  }

  private ensureHttps(url: string): string {
    if (!url.startsWith('https://')) {
      if (url.startsWith('http://')) {
        throw new SecurityError('HTTP not allowed, use HTTPS only');
      }
      // Assume relative URL, prepend secure base
      return `https://api.qirvo.ai${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  }

  private validateResponseSecurity(response: Response): void {
    // Check for security headers
    const securityHeaders = [
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options'
    ];

    securityHeaders.forEach(header => {
      if (!response.headers.get(header)) {
        this.plugin.log('warn', `Missing security header: ${header}`);
      }
    });
  }
}
```

## XSS & Injection Prevention

### Content Sanitization

```typescript
class ContentSanitizer {
  static sanitizeHtml(html: string): string {
    // Remove script tags and event handlers
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  static sanitizeText(text: string): string {
    return text
      .replace(/[<>]/g, '')
      .replace(/['"]/g, '')
      .trim()
      .substring(0, 1000);
  }

  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Only allow safe protocols
      if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
        throw new Error('Unsafe protocol');
      }
      
      return parsed.toString();
    } catch {
      throw new SecurityError('Invalid URL format');
    }
  }

  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .substring(0, 255);
  }
}
```

### SQL Injection Prevention

```typescript
class SecureDatabase {
  constructor(private plugin: BasePlugin) {}

  async secureQuery(query: string, params: any[]): Promise<any[]> {
    // Use parameterized queries only
    if (query.includes('${') || query.includes('`')) {
      throw new SecurityError('Template literals not allowed in queries');
    }

    // Validate parameters
    const sanitizedParams = params.map(param => this.sanitizeParam(param));

    try {
      return await this.executeParameterizedQuery(query, sanitizedParams);
    } catch (error) {
      this.plugin.log('error', 'Database query failed:', error);
      throw new DatabaseError('Query execution failed');
    }
  }

  private sanitizeParam(param: any): any {
    if (typeof param === 'string') {
      return param.replace(/['";]/g, '');
    }
    if (typeof param === 'number') {
      return isFinite(param) ? param : 0;
    }
    return param;
  }

  private async executeParameterizedQuery(query: string, params: any[]): Promise<any[]> {
    // Implementation would use proper parameterized query execution
    return [];
  }
}
```

## Security Auditing

### Security Event Logging

```typescript
class SecurityAuditor {
  constructor(private plugin: BasePlugin) {}

  logSecurityEvent(event: SecurityEvent): void {
    const auditLog = {
      timestamp: new Date().toISOString(),
      pluginId: this.plugin.context.plugin.id,
      userId: this.plugin.context.user?.id,
      event: event.type,
      severity: event.severity,
      details: event.details,
      userAgent: navigator.userAgent,
      ipAddress: this.getClientIP()
    };

    // Log to secure audit trail
    this.plugin.log('security', 'Security event', auditLog);

    // Alert on high severity events
    if (event.severity === 'high') {
      this.alertSecurityTeam(auditLog);
    }
  }

  logAuthenticationAttempt(success: boolean, details: any): void {
    this.logSecurityEvent({
      type: 'authentication_attempt',
      severity: success ? 'low' : 'medium',
      details: {
        success,
        ...details
      }
    });
  }

  logPermissionRequest(permission: string, granted: boolean): void {
    this.logSecurityEvent({
      type: 'permission_request',
      severity: 'low',
      details: {
        permission,
        granted
      }
    });
  }

  logDataAccess(dataType: string, operation: string): void {
    this.logSecurityEvent({
      type: 'data_access',
      severity: 'medium',
      details: {
        dataType,
        operation
      }
    });
  }

  private getClientIP(): string {
    // Implementation to get client IP safely
    return 'unknown';
  }

  private async alertSecurityTeam(auditLog: any): Promise<void> {
    // Implementation to alert security team
    this.plugin.log('warn', 'High severity security event detected');
  }
}

interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high';
  details: any;
}
```

### Vulnerability Scanning

```typescript
class VulnerabilityScanner {
  constructor(private plugin: BasePlugin) {}

  async scanDependencies(): Promise<VulnerabilityReport> {
    const vulnerabilities: Vulnerability[] = [];

    // Check for known vulnerable packages
    const dependencies = await this.getDependencies();
    
    for (const dep of dependencies) {
      const vulns = await this.checkVulnerabilities(dep);
      vulnerabilities.push(...vulns);
    }

    return {
      timestamp: new Date().toISOString(),
      totalVulnerabilities: vulnerabilities.length,
      highSeverity: vulnerabilities.filter(v => v.severity === 'high').length,
      vulnerabilities
    };
  }

  private async getDependencies(): Promise<Dependency[]> {
    // Implementation to get plugin dependencies
    return [];
  }

  private async checkVulnerabilities(dep: Dependency): Promise<Vulnerability[]> {
    // Implementation to check against vulnerability databases
    return [];
  }
}

interface Dependency {
  name: string;
  version: string;
}

interface Vulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  package: string;
  version: string;
}

interface VulnerabilityReport {
  timestamp: string;
  totalVulnerabilities: number;
  highSeverity: number;
  vulnerabilities: Vulnerability[];
}
```

## Security Checklist

### Pre-Release Security Review

- [ ] All user inputs are validated and sanitized
- [ ] Sensitive data is encrypted at rest
- [ ] API communications use HTTPS only
- [ ] Authentication tokens are stored securely
- [ ] Permissions follow least privilege principle
- [ ] XSS prevention measures implemented
- [ ] SQL injection prevention in place
- [ ] Security headers configured
- [ ] Dependency vulnerabilities checked
- [ ] Security audit logging implemented
- [ ] Error messages don't leak sensitive information
- [ ] Rate limiting implemented for API calls
- [ ] Session management is secure
- [ ] File uploads are validated and sandboxed
- [ ] Security testing completed

This comprehensive security guide ensures your Qirvo plugins are built with security as a fundamental principle, protecting both user data and the platform ecosystem.

---

**Next**: [Performance Best Practices](./performance-best-practices.md)
