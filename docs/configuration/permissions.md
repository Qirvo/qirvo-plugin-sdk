# Permissions System

The Qirvo Plugin SDK uses a comprehensive permissions system to ensure security and user privacy. This guide covers all available permissions, how to request them, and best practices for secure plugin development.

## Table of Contents

- [Permission Types](#permission-types)
- [Requesting Permissions](#requesting-permissions)
- [Runtime Permission Checks](#runtime-permission-checks)
- [Permission Scopes](#permission-scopes)
- [User Consent](#user-consent)
- [Security Best Practices](#security-best-practices)

## Permission Types

### Core Permissions

#### Storage Permissions

```json
{
  "permissions": [
    "storage-read",     // Read from plugin storage
    "storage-write"     // Write to plugin storage
  ]
}
```

**Usage Example:**
```typescript
export default class StoragePlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Check storage permissions
    if (this.hasPermission(context, 'storage-read')) {
      const data = await context.storage.get('user-data');
      this.log('info', 'Loaded user data:', data);
    }
    
    if (this.hasPermission(context, 'storage-write')) {
      await context.storage.set('last-access', new Date().toISOString());
    }
  }

  private hasPermission(context: PluginRuntimeContext, permission: string): boolean {
    return context.plugin.permissions.some(p => 
      p.type === permission && p.granted
    );
  }
}
```

#### Network Permissions

```json
{
  "permissions": [
    "network-access"    // Make HTTP requests to external APIs
  ]
}
```

**Usage Example:**
```typescript
export default class NetworkPlugin extends BasePlugin {
  async fetchExternalData(): Promise<any> {
    if (!this.hasPermission(this.context, 'network-access')) {
      throw new Error('Network access permission not granted');
    }

    try {
      const response = await this.context.api.http.get('https://api.example.com/data');
      return await response.json();
    } catch (error) {
      this.log('error', 'Network request failed:', error);
      throw error;
    }
  }
}
```

#### Notification Permissions

```json
{
  "permissions": [
    "notifications"     // Show desktop notifications
  ]
}
```

**Usage Example:**
```typescript
export default class NotificationPlugin extends BasePlugin {
  async showNotification(title: string, message: string): Promise<void> {
    if (!this.hasPermission(this.context, 'notifications')) {
      this.log('warn', 'Notification permission not granted');
      return;
    }

    await this.context.api.notifications.show({
      title,
      message,
      type: 'info',
      duration: 5000
    });
  }
}
```

### System Access Permissions

#### File System Access

```json
{
  "permissions": [
    "filesystem-access" // Access local file system (with user consent)
  ]
}
```

**Usage Example:**
```typescript
export default class FileSystemPlugin extends BasePlugin {
  async readUserFile(filePath: string): Promise<string> {
    if (!this.hasPermission(this.context, 'filesystem-access')) {
      throw new Error('File system access permission not granted');
    }

    // File system operations require additional user consent
    const consent = await this.requestUserConsent(
      'File Access',
      `This plugin wants to read: ${filePath}`,
      ['Allow', 'Deny']
    );

    if (consent !== 'Allow') {
      throw new Error('User denied file access');
    }

    // Implement secure file reading
    return await this.secureFileRead(filePath);
  }
}
```

#### Clipboard Access

```json
{
  "permissions": [
    "clipboard-read",   // Read from clipboard
    "clipboard-write"   // Write to clipboard
  ]
}
```

**Usage Example:**
```typescript
export default class ClipboardPlugin extends BasePlugin {
  async copyToClipboard(text: string): Promise<void> {
    if (!this.hasPermission(this.context, 'clipboard-write')) {
      throw new Error('Clipboard write permission not granted');
    }

    await navigator.clipboard.writeText(text);
    await this.notify('Copied', 'Text copied to clipboard', 'success');
  }

  async pasteFromClipboard(): Promise<string> {
    if (!this.hasPermission(this.context, 'clipboard-read')) {
      throw new Error('Clipboard read permission not granted');
    }

    return await navigator.clipboard.readText();
  }
}
```

### Device Access Permissions

#### Location Access

```json
{
  "permissions": [
    "geolocation"       // Access user's location
  ]
}
```

**Usage Example:**
```typescript
export default class LocationPlugin extends BasePlugin {
  async getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    if (!this.hasPermission(this.context, 'geolocation')) {
      throw new Error('Geolocation permission not granted');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          this.log('error', 'Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
}
```

#### Media Access

```json
{
  "permissions": [
    "camera",           // Access camera
    "microphone"        // Access microphone
  ]
}
```

**Usage Example:**
```typescript
export default class MediaPlugin extends BasePlugin {
  async startVideoRecording(): Promise<MediaStream> {
    const hasCamera = this.hasPermission(this.context, 'camera');
    const hasMicrophone = this.hasPermission(this.context, 'microphone');

    if (!hasCamera && !hasMicrophone) {
      throw new Error('No media permissions granted');
    }

    const constraints: MediaStreamConstraints = {
      video: hasCamera,
      audio: hasMicrophone
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.log('info', 'Media stream started');
      return stream;
    } catch (error) {
      this.log('error', 'Media access failed:', error);
      throw error;
    }
  }
}
```

### Data Access Permissions

#### Calendar Access

```json
{
  "permissions": [
    "calendar"          // Access user's calendar data
  ]
}
```

**Usage Example:**
```typescript
export default class CalendarPlugin extends BasePlugin {
  async getTodaysEvents(): Promise<CalendarEvent[]> {
    if (!this.hasPermission(this.context, 'calendar')) {
      throw new Error('Calendar permission not granted');
    }

    if (!this.context.api.qirvo?.calendar) {
      throw new Error('Calendar API not available');
    }

    const today = new Date();
    return await this.context.api.qirvo.calendar.getEventsForDate(today);
  }

  async createEvent(eventData: CreateEventData): Promise<CalendarEvent> {
    if (!this.hasPermission(this.context, 'calendar')) {
      throw new Error('Calendar permission not granted');
    }

    return await this.context.api.qirvo.calendar.createEvent(eventData);
  }
}
```

#### Contacts Access

```json
{
  "permissions": [
    "contacts"          // Access user's contacts
  ]
}
```

**Usage Example:**
```typescript
export default class ContactsPlugin extends BasePlugin {
  async searchContacts(query: string): Promise<Contact[]> {
    if (!this.hasPermission(this.context, 'contacts')) {
      throw new Error('Contacts permission not granted');
    }

    // Implement secure contact search
    return await this.secureContactSearch(query);
  }

  private async secureContactSearch(query: string): Promise<Contact[]> {
    // Sanitize query to prevent injection
    const sanitizedQuery = query.replace(/[^\w\s]/gi, '');
    
    // Implement contact search logic
    // This would typically interface with the system's contact API
    return [];
  }
}
```

## Requesting Permissions

### Manifest Declaration

All permissions must be declared in your plugin's `manifest.json`:

```json
{
  "manifest_version": 1,
  "name": "My Plugin",
  "permissions": [
    "storage-read",
    "storage-write",
    "network-access",
    "notifications",
    "geolocation"
  ],
  "permission_descriptions": {
    "storage-read": "Read plugin settings and cached data",
    "storage-write": "Save plugin settings and cache data",
    "network-access": "Fetch data from external weather APIs",
    "notifications": "Show weather alerts and updates",
    "geolocation": "Get your location for local weather forecasts"
  }
}
```

### Permission Descriptions

Provide clear, user-friendly descriptions for each permission:

```json
{
  "permission_descriptions": {
    "network-access": "Connect to external APIs to fetch real-time data",
    "filesystem-access": "Read and write files for data import/export",
    "camera": "Take photos for document scanning",
    "microphone": "Record voice notes and transcribe audio",
    "geolocation": "Provide location-based recommendations",
    "calendar": "Create events and check availability",
    "contacts": "Suggest contacts for sharing and collaboration"
  }
}
```

### Runtime Permission Requests

For sensitive permissions, request additional consent at runtime:

```typescript
export default class SensitivePlugin extends BasePlugin {
  async requestSensitiveOperation(): Promise<void> {
    // Check if permission is granted
    if (!this.hasPermission(this.context, 'filesystem-access')) {
      throw new Error('File system permission not granted');
    }

    // Request additional user consent for specific operation
    const consent = await this.requestUserConsent(
      'File Access Required',
      'This plugin needs to access your Documents folder to import data. Your files will not be uploaded or shared.',
      ['Allow Once', 'Allow Always', 'Deny'],
      {
        icon: 'folder',
        details: [
          'Files will be processed locally',
          'No data will be sent to external servers',
          'You can revoke this permission anytime'
        ]
      }
    );

    switch (consent) {
      case 'Allow Once':
        await this.performFileOperation(false);
        break;
      case 'Allow Always':
        await this.setStorage('file_access_granted', true);
        await this.performFileOperation(true);
        break;
      case 'Deny':
        throw new Error('User denied file access');
    }
  }

  private async requestUserConsent(
    title: string,
    message: string,
    options: string[],
    details?: {
      icon?: string;
      details?: string[];
    }
  ): Promise<string> {
    // This would be implemented by the Qirvo platform
    return new Promise((resolve) => {
      // Show consent dialog
      const dialog = {
        title,
        message,
        options,
        ...details
      };
      
      // Platform-specific consent UI
      // Returns user's choice
      resolve('Allow Once');
    });
  }
}
```

## Runtime Permission Checks

### Permission Validation Helper

```typescript
class PermissionValidator {
  constructor(private context: PluginRuntimeContext) {}

  hasPermission(permission: string): boolean {
    return this.context.plugin.permissions.some(p => 
      p.type === permission && p.granted
    );
  }

  requirePermission(permission: string): void {
    if (!this.hasPermission(permission)) {
      throw new Error(`Permission '${permission}' is required but not granted`);
    }
  }

  requirePermissions(permissions: string[]): void {
    const missing = permissions.filter(p => !this.hasPermission(p));
    if (missing.length > 0) {
      throw new Error(`Missing permissions: ${missing.join(', ')}`);
    }
  }

  getGrantedPermissions(): string[] {
    return this.context.plugin.permissions
      .filter(p => p.granted)
      .map(p => p.type);
  }

  getDeniedPermissions(): string[] {
    return this.context.plugin.permissions
      .filter(p => !p.granted)
      .map(p => p.type);
  }
}

// Usage in plugin
export default class SecurePlugin extends BasePlugin {
  private permissions: PermissionValidator;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.permissions = new PermissionValidator(context);
    
    // Check required permissions
    try {
      this.permissions.requirePermissions(['storage-read', 'storage-write']);
      await this.initializeStorage();
    } catch (error) {
      this.log('error', 'Required permissions not granted:', error);
      await this.showPermissionError();
      return;
    }

    // Optional permissions
    if (this.permissions.hasPermission('network-access')) {
      await this.enableNetworkFeatures();
    }

    if (this.permissions.hasPermission('notifications')) {
      await this.enableNotifications();
    }
  }
}
```

### Graceful Degradation

```typescript
export default class AdaptivePlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    const permissions = new PermissionValidator(context);
    
    // Core functionality (always available)
    await this.initializeCore();
    
    // Network features (optional)
    if (permissions.hasPermission('network-access')) {
      await this.enableOnlineFeatures();
      this.log('info', 'Online features enabled');
    } else {
      await this.enableOfflineMode();
      this.log('info', 'Running in offline mode');
    }
    
    // Notification features (optional)
    if (permissions.hasPermission('notifications')) {
      await this.enableNotifications();
    } else {
      await this.enableInAppAlerts();
    }
    
    // Location features (optional)
    if (permissions.hasPermission('geolocation')) {
      await this.enableLocationFeatures();
    } else {
      await this.enableManualLocationEntry();
    }
  }

  private async enableOfflineMode(): Promise<void> {
    // Implement offline functionality
    await this.setStorage('offline_mode', true);
    await this.loadCachedData();
  }

  private async enableInAppAlerts(): Promise<void> {
    // Use in-app notifications instead of system notifications
    this.useInAppNotifications = true;
  }

  private async enableManualLocationEntry(): Promise<void> {
    // Provide manual location input instead of GPS
    this.showLocationInput = true;
  }
}
```

## Permission Scopes

### Scoped Permissions

Some permissions can be scoped to specific resources:

```json
{
  "permissions": [
    {
      "type": "network-access",
      "scope": ["api.weather.com", "api.openweathermap.org"]
    },
    {
      "type": "filesystem-access",
      "scope": ["~/Documents", "~/Downloads"]
    },
    {
      "type": "calendar",
      "scope": ["read-only"]
    }
  ]
}
```

### Time-Limited Permissions

```json
{
  "permissions": [
    {
      "type": "camera",
      "duration": "session"  // Only for current session
    },
    {
      "type": "geolocation",
      "duration": 3600      // 1 hour in seconds
    }
  ]
}
```

### Conditional Permissions

```typescript
export default class ConditionalPlugin extends BasePlugin {
  async requestLocationBasedFeature(): Promise<void> {
    // Only request location permission when actually needed
    if (!this.hasPermission(this.context, 'geolocation')) {
      const consent = await this.requestPermissionConsent(
        'geolocation',
        'Location access is needed to provide weather updates for your area'
      );
      
      if (!consent) {
        // Provide alternative functionality
        await this.showManualLocationEntry();
        return;
      }
    }
    
    await this.enableLocationFeatures();
  }
}
```

## User Consent

### Consent Dialog Best Practices

```typescript
interface ConsentOptions {
  title: string;
  message: string;
  purpose: string;
  dataUsage: string[];
  retention: string;
  sharing: string;
  alternatives?: string;
}

export default class ConsentAwarePlugin extends BasePlugin {
  async requestDataAccess(type: string): Promise<boolean> {
    const consentOptions: ConsentOptions = {
      title: 'Data Access Request',
      message: `${this.context.plugin.name} would like to access your ${type}`,
      purpose: 'To provide personalized recommendations and sync your data',
      dataUsage: [
        'Data is processed locally on your device',
        'No personal information is sent to external servers',
        'Data is used only for plugin functionality'
      ],
      retention: 'Data is stored until you uninstall the plugin',
      sharing: 'Your data is never shared with third parties',
      alternatives: 'You can use manual input instead of automatic data access'
    };

    return await this.showConsentDialog(consentOptions);
  }

  private async showConsentDialog(options: ConsentOptions): Promise<boolean> {
    // Platform-specific consent dialog
    return new Promise((resolve) => {
      // Implementation would be provided by Qirvo platform
      resolve(true);
    });
  }
}
```

### Consent Tracking

```typescript
export default class ConsentTrackingPlugin extends BasePlugin {
  async trackConsent(permission: string, granted: boolean): Promise<void> {
    const consentRecord = {
      permission,
      granted,
      timestamp: new Date().toISOString(),
      version: this.context.plugin.version,
      userAgent: navigator.userAgent
    };

    await this.setStorage(`consent_${permission}`, consentRecord);
    
    // Log consent for audit purposes
    this.log('info', 'Consent recorded:', consentRecord);
  }

  async getConsentHistory(): Promise<any[]> {
    const keys = await this.context.storage.keys();
    const consentKeys = keys.filter(key => key.startsWith('consent_'));
    
    const history = [];
    for (const key of consentKeys) {
      const record = await this.getStorage(key);
      if (record) {
        history.push(record);
      }
    }
    
    return history.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
```

## Security Best Practices

### Principle of Least Privilege

```json
{
  "permissions": [
    // ❌ Don't request unnecessary permissions
    // "filesystem-access",
    // "camera",
    // "microphone",
    
    // ✅ Only request what you actually need
    "storage-read",
    "storage-write",
    "network-access",
    "notifications"
  ]
}
```

### Input Validation

```typescript
export default class SecurePlugin extends BasePlugin {
  async processUserInput(input: string): Promise<void> {
    // Validate and sanitize input
    const sanitized = this.sanitizeInput(input);
    
    if (!this.isValidInput(sanitized)) {
      throw new Error('Invalid input provided');
    }
    
    await this.processValidInput(sanitized);
  }

  private sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/['"]/g, '') // Remove quotes
      .substring(0, 1000);   // Limit length
  }

  private isValidInput(input: string): boolean {
    // Implement validation logic
    return input.length > 0 && input.length <= 1000;
  }
}
```

### Secure Data Handling

```typescript
export default class DataSecurePlugin extends BasePlugin {
  async storeSecureData(key: string, data: any): Promise<void> {
    // Encrypt sensitive data before storage
    const encrypted = await this.encryptData(data);
    await this.setStorage(key, encrypted);
  }

  async retrieveSecureData(key: string): Promise<any> {
    const encrypted = await this.getStorage(key);
    if (!encrypted) return null;
    
    return await this.decryptData(encrypted);
  }

  private async encryptData(data: any): Promise<string> {
    // Implement encryption (this would use a proper crypto library)
    const jsonString = JSON.stringify(data);
    return btoa(jsonString); // Basic encoding (use proper encryption in production)
  }

  private async decryptData(encrypted: string): Promise<any> {
    // Implement decryption
    const jsonString = atob(encrypted);
    return JSON.parse(jsonString);
  }
}
```

### Permission Monitoring

```typescript
export default class MonitoredPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    // Monitor permission usage
    this.setupPermissionMonitoring();
    
    // Regular permission audit
    setInterval(() => {
      this.auditPermissions();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private setupPermissionMonitoring(): void {
    // Override permission-requiring methods to log usage
    const originalHttpGet = this.context.api.http.get;
    this.context.api.http.get = async (url: string, options?: any) => {
      this.logPermissionUsage('network-access', { url });
      return await originalHttpGet.call(this.context.api.http, url, options);
    };
  }

  private logPermissionUsage(permission: string, details: any): void {
    const usage = {
      permission,
      timestamp: new Date().toISOString(),
      details
    };
    
    this.log('debug', 'Permission used:', usage);
  }

  private async auditPermissions(): Promise<void> {
    const grantedPermissions = this.context.plugin.permissions
      .filter(p => p.granted)
      .map(p => p.type);
    
    this.log('info', 'Permission audit:', {
      granted: grantedPermissions,
      plugin: this.context.plugin.name,
      version: this.context.plugin.version
    });
  }
}
```

This comprehensive permissions system ensures that Qirvo plugins operate securely while providing users with full control over their data and privacy.

---

**Next**: [External Services](./external-services.md) for third-party API integration documentation.
