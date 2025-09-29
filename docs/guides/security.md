# Security Guide

This guide covers essential security practices for Qirvo plugin development, including input validation, secure data handling, authentication, and protection against common vulnerabilities.

## Table of Contents

- [Security Fundamentals](#security-fundamentals)
- [Input Validation](#input-validation)
- [Secure Data Storage](#secure-data-storage)
- [Authentication & Authorization](#authentication--authorization)
- [Network Security](#network-security)
- [Common Vulnerabilities](#common-vulnerabilities)

## Security Fundamentals

### Security-First Development

```typescript
// Security validation framework
export class SecurityValidator {
  static validateInput(input: any, schema: ValidationSchema): ValidationResult {
    const errors: string[] = [];
    
    // Type validation
    if (schema.type && typeof input !== schema.type) {
      errors.push(`Expected ${schema.type}, got ${typeof input}`);
    }
    
    // String validation
    if (schema.type === 'string' && typeof input === 'string') {
      if (schema.minLength && input.length < schema.minLength) {
        errors.push(`Minimum length is ${schema.minLength}`);
      }
      if (schema.maxLength && input.length > schema.maxLength) {
        errors.push(`Maximum length is ${schema.maxLength}`);
      }
      if (schema.pattern && !schema.pattern.test(input)) {
        errors.push('Invalid format');
      }
    }
    
    // Sanitization
    const sanitized = this.sanitizeInput(input, schema);
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }
  
  private static sanitizeInput(input: any, schema: ValidationSchema): any {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      let sanitized = input.replace(/[<>\"']/g, '');
      
      // Trim whitespace
      sanitized = sanitized.trim();
      
      // Apply custom sanitizer if provided
      if (schema.sanitizer) {
        sanitized = schema.sanitizer(sanitized);
      }
      
      return sanitized;
    }
    
    return input;
  }
}

interface ValidationSchema {
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitizer?: (value: string) => string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue: any;
}
```

## Input Validation

### Comprehensive Input Validation

```typescript
// Input validation for plugin configurations
export class ConfigValidator {
  private schemas: Map<string, ValidationSchema> = new Map();
  
  constructor() {
    this.setupSchemas();
  }
  
  private setupSchemas(): void {
    this.schemas.set('apiKey', {
      type: 'string',
      required: true,
      minLength: 10,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitizer: (value) => value.replace(/\s/g, '')
    });
    
    this.schemas.set('email', {
      type: 'string',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      sanitizer: (value) => value.toLowerCase().trim()
    });
    
    this.schemas.set('url', {
      type: 'string',
      required: false,
      pattern: /^https?:\/\/.+/,
      sanitizer: (value) => value.trim()
    });
  }
  
  validateConfig(config: Record<string, any>): ConfigValidationResult {
    const errors: Record<string, string[]> = {};
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(config)) {
      const schema = this.schemas.get(key);
      if (!schema) continue;
      
      const result = SecurityValidator.validateInput(value, schema);
      if (!result.isValid) {
        errors[key] = result.errors;
      } else {
        sanitized[key] = result.sanitizedValue;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedConfig: sanitized
    };
  }
}

interface ConfigValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  sanitizedConfig: Record<string, any>;
}
```

## Secure Data Storage

### Encrypted Storage Service

```typescript
// Secure storage with encryption
export class SecureStorage {
  private encryptionKey: CryptoKey;
  private storage: StorageAPI;
  
  constructor(storage: StorageAPI, encryptionKey: CryptoKey) {
    this.storage = storage;
    this.encryptionKey = encryptionKey;
  }
  
  async setSecure<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = await this.encrypt(serialized);
      await this.storage.set(key, encrypted);
    } catch (error) {
      throw new Error(`Failed to store secure data: ${error.message}`);
    }
  }
  
  async getSecure<T>(key: string): Promise<T | null> {
    try {
      const encrypted = await this.storage.get(key);
      if (!encrypted) return null;
      
      const decrypted = await this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }
  
  private async encrypt(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataBuffer
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  private async decrypt(encryptedData: string): Promise<string> {
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
```

## Authentication & Authorization

### Secure API Client

```typescript
// Secure HTTP client with authentication
export class SecureHttpClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  setAuthTokens(accessToken: string, refreshToken?: string): void {
    this.authToken = accessToken;
    this.refreshToken = refreshToken;
  }
  
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL');
    }
    
    const headers = new Headers(options.headers);
    
    // Add authentication
    if (this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }
    
    // Add security headers
    headers.set('X-Requested-With', 'XMLHttpRequest');
    headers.set('Content-Type', 'application/json');
    
    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers,
        credentials: 'same-origin'
      });
      
      // Handle authentication errors
      if (response.status === 401) {
        if (this.refreshToken) {
          await this.refreshAuthToken();
          return this.request(endpoint, options);
        }
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
  
  private isValidUrl(url: URL): boolean {
    // Only allow HTTPS in production
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return false;
    }
    
    // Validate hostname
    const allowedHosts = ['api.qirvo.ai', 'localhost'];
    return allowedHosts.includes(url.hostname);
  }
  
  private async refreshAuthToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const { accessToken, refreshToken } = await response.json();
    this.setAuthTokens(accessToken, refreshToken);
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
}
```

## Network Security

### Content Security Policy

```typescript
// CSP configuration for plugin security
export const cspConfig = {
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", "data:", "https:"],
    'connect-src': ["'self'", "https://api.qirvo.ai"],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'media-src': ["'self'"],
    'frame-src': ["'none'"]
  },
  
  generateHeader(): string {
    return Object.entries(this.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }
};
```

## Common Vulnerabilities

### XSS Prevention

```typescript
// XSS prevention utilities
export class XSSProtection {
  static sanitizeHtml(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
  
  static escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }
  
  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
```

### CSRF Protection

```typescript
// CSRF token management
export class CSRFProtection {
  private token: string | null = null;
  
  async getToken(): Promise<string> {
    if (!this.token) {
      this.token = await this.fetchToken();
    }
    return this.token;
  }
  
  private async fetchToken(): Promise<string> {
    const response = await fetch('/api/csrf-token');
    const { token } = await response.json();
    return token;
  }
  
  async addTokenToRequest(options: RequestInit): Promise<RequestInit> {
    const token = await this.getToken();
    const headers = new Headers(options.headers);
    headers.set('X-CSRF-Token', token);
    
    return {
      ...options,
      headers
    };
  }
}
```

This security guide provides essential protection mechanisms for building secure Qirvo plugins.

---

**Next**: [Performance Guide](./performance.md)
