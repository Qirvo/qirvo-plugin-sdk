# Deployment Best Practices

This guide covers best practices for packaging, distributing, and deploying Qirvo plugins. Learn about version management, marketplace submission, and deployment strategies.

## Table of Contents

- [Plugin Packaging](#plugin-packaging)
- [Version Management](#version-management)
- [Marketplace Submission](#marketplace-submission)
- [Distribution Channels](#distribution-channels)
- [Update Strategies](#update-strategies)
- [Monitoring and Analytics](#monitoring-and-analytics)

## Plugin Packaging

### Build Optimization

```typescript
// webpack.config.js - Optimized build configuration
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'plugin.js',
    library: {
      type: 'commonjs2'
    },
    clean: true
  },
  externals: {
    // Don't bundle Qirvo SDK - it's provided by the runtime
    '@qirvo/plugin-sdk': 'commonjs2 @qirvo/plugin-sdk',
    'react': 'commonjs2 react',
    'react-dom': 'commonjs2 react-dom'
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log in production
            drop_debugger: true
          },
          mangle: {
            keep_fnames: false
          }
        }
      })
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    // Analyze bundle size in development
    process.env.ANALYZE && new BundleAnalyzerPlugin()
  ].filter(Boolean),
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      }
    ]
  }
};
```

### Package.json Configuration

```json
{
  "name": "@qirvo/weather-plugin",
  "version": "1.2.3",
  "description": "Comprehensive weather plugin for Qirvo dashboard",
  "main": "dist/plugin.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/",
    "manifest.json",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "webpack --mode=production",
    "build:dev": "webpack --mode=development",
    "build:analyze": "ANALYZE=true npm run build",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "prepublishOnly": "npm run test && npm run lint && npm run build",
    "release": "semantic-release"
  },
  "keywords": [
    "qirvo",
    "plugin",
    "weather",
    "dashboard",
    "widget"
  ],
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "url": "https://github.com/yourusername"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/qirvo-weather-plugin.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/qirvo-weather-plugin/issues"
  },
  "homepage": "https://github.com/yourusername/qirvo-weather-plugin#readme",
  "peerDependencies": {
    "@qirvo/plugin-sdk": "^1.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "webpack": "^5.0.0",
    "ts-loader": "^9.0.0"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

### Manifest Validation

```typescript
// scripts/validate-manifest.ts
import { readFileSync } from 'fs';
import { z } from 'zod';

const ManifestSchema = z.object({
  manifest_version: z.literal(1),
  name: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10).max(200),
  author: z.object({
    name: z.string(),
    email: z.string().email(),
    url: z.string().url().optional()
  }),
  permissions: z.array(z.enum([
    'storage-read', 'storage-write', 'network-access',
    'notifications', 'filesystem-access', 'clipboard-read',
    'clipboard-write', 'geolocation', 'camera', 'microphone',
    'calendar', 'contacts'
  ])),
  main: z.string(),
  type: z.enum(['dashboard-widget', 'cli-tool', 'background-service', 'hybrid']),
  category: z.enum(['productivity', 'utilities', 'entertainment', 'development', 'business']),
  tags: z.array(z.string()).max(10),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string(),
  configSchema: z.object({}).optional(),
  ui: z.object({
    component: z.string().optional(),
    styles: z.string().optional()
  }).optional()
});

export function validateManifest(): void {
  try {
    const manifestContent = readFileSync('manifest.json', 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    const result = ManifestSchema.safeParse(manifest);
    
    if (!result.success) {
      console.error('❌ Manifest validation failed:');
      result.error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
      process.exit(1);
    }
    
    console.log('✅ Manifest validation passed');
  } catch (error) {
    console.error('❌ Failed to validate manifest:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateManifest();
}
```

## Version Management

### Semantic Versioning

```typescript
// scripts/version-check.ts
import { readFileSync } from 'fs';
import semver from 'semver';

interface VersionInfo {
  current: string;
  previous: string;
  type: 'major' | 'minor' | 'patch';
}

export function analyzeVersionChange(): VersionInfo {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));
  
  // Ensure package.json and manifest.json versions match
  if (packageJson.version !== manifest.version) {
    throw new Error('Version mismatch between package.json and manifest.json');
  }
  
  const currentVersion = packageJson.version;
  const previousVersion = getPreviousVersion(); // From git tags or registry
  
  if (!semver.valid(currentVersion)) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }
  
  const versionType = semver.diff(previousVersion, currentVersion);
  
  return {
    current: currentVersion,
    previous: previousVersion,
    type: versionType as 'major' | 'minor' | 'patch'
  };
}

export function generateChangelog(versionInfo: VersionInfo): string {
  const { current, previous, type } = versionInfo;
  
  const changelogTemplate = `
## [${current}] - ${new Date().toISOString().split('T')[0]}

### ${type === 'major' ? 'Breaking Changes' : type === 'minor' ? 'Added' : 'Fixed'}

- TODO: Add changelog entries

### Migration Guide

${type === 'major' ? '- TODO: Add migration instructions for breaking changes' : '- No migration required'}

[${current}]: https://github.com/yourusername/plugin/compare/v${previous}...v${current}
`;
  
  return changelogTemplate.trim();
}
```

### Release Automation

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Validate manifest
        run: npm run validate-manifest

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build plugin
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: plugin-build
          path: dist/

  release:
    if: github.ref == 'refs/heads/main'
    needs: [test, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: plugin-build
          path: dist/
      
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

## Marketplace Submission

### Submission Checklist

```typescript
// scripts/pre-submission-check.ts
import { readFileSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';

interface SubmissionCheck {
  name: string;
  check: () => boolean;
  fix?: string;
}

const submissionChecks: SubmissionCheck[] = [
  {
    name: 'Manifest file exists and is valid',
    check: () => {
      try {
        const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));
        return manifest.manifest_version === 1 && manifest.name && manifest.version;
      } catch {
        return false;
      }
    },
    fix: 'Create a valid manifest.json file'
  },
  
  {
    name: 'README.md exists with proper content',
    check: () => {
      if (!existsSync('README.md')) return false;
      const readme = readFileSync('README.md', 'utf-8');
      return readme.length > 200 && readme.includes('## Installation');
    },
    fix: 'Create a comprehensive README.md with installation instructions'
  },
  
  {
    name: 'LICENSE file exists',
    check: () => existsSync('LICENSE'),
    fix: 'Add a LICENSE file'
  },
  
  {
    name: 'CHANGELOG.md exists',
    check: () => existsSync('CHANGELOG.md'),
    fix: 'Create a CHANGELOG.md file documenting version changes'
  },
  
  {
    name: 'Built files exist',
    check: () => existsSync('dist/plugin.js'),
    fix: 'Run npm run build to generate distribution files'
  },
  
  {
    name: 'Bundle size is reasonable (<500KB)',
    check: () => {
      if (!existsSync('dist/plugin.js')) return false;
      const stats = statSync('dist/plugin.js');
      return stats.size < 500 * 1024; // 500KB
    },
    fix: 'Optimize bundle size by removing unused dependencies'
  },
  
  {
    name: 'All tests pass',
    check: () => {
      try {
        execSync('npm test', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Fix failing tests'
  },
  
  {
    name: 'No linting errors',
    check: () => {
      try {
        execSync('npm run lint', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Fix linting errors with npm run lint:fix'
  },
  
  {
    name: 'TypeScript compiles without errors',
    check: () => {
      try {
        execSync('npm run type-check', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Fix TypeScript compilation errors'
  },
  
  {
    name: 'Screenshots exist (if UI plugin)',
    check: () => {
      const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));
      if (manifest.type === 'cli-tool' || manifest.type === 'background-service') {
        return true; // Not required for non-UI plugins
      }
      return existsSync('screenshots') || existsSync('assets/screenshots');
    },
    fix: 'Add screenshots showing your plugin in action'
  }
];

export function runSubmissionChecks(): void {
  console.log('🔍 Running pre-submission checks...\n');
  
  let allPassed = true;
  const failed: SubmissionCheck[] = [];
  
  for (const check of submissionChecks) {
    const passed = check.check();
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    
    if (!passed) {
      allPassed = false;
      failed.push(check);
    }
  }
  
  if (allPassed) {
    console.log('\n🎉 All checks passed! Your plugin is ready for submission.');
  } else {
    console.log('\n❌ Some checks failed. Please fix the following issues:\n');
    failed.forEach(check => {
      console.log(`- ${check.name}`);
      if (check.fix) {
        console.log(`  Fix: ${check.fix}`);
      }
      console.log();
    });
    process.exit(1);
  }
}

if (require.main === module) {
  runSubmissionChecks();
}
```

### Plugin Metadata

```json
{
  "manifest_version": 1,
  "name": "Weather Dashboard Widget",
  "version": "1.2.3",
  "description": "Beautiful weather widget with forecasts, alerts, and customizable themes",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "url": "https://github.com/yourusername"
  },
  "permissions": [
    "storage-read",
    "storage-write",
    "network-access",
    "notifications",
    "geolocation"
  ],
  "main": "dist/plugin.js",
  "type": "dashboard-widget",
  "category": "utilities",
  "tags": ["weather", "forecast", "dashboard", "widget", "alerts"],
  "homepage": "https://github.com/yourusername/weather-plugin",
  "repository": "https://github.com/yourusername/weather-plugin.git",
  "license": "MIT",
  "pricing": {
    "type": "free"
  },
  "compatibility": {
    "qirvo_version": ">=1.0.0",
    "node_version": ">=16.0.0"
  },
  "screenshots": [
    "screenshots/main-widget.png",
    "screenshots/settings.png",
    "screenshots/forecast-view.png"
  ],
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "Weather API Key",
        "description": "API key from your weather service provider"
      },
      "units": {
        "type": "string",
        "enum": ["metric", "imperial"],
        "default": "metric",
        "title": "Temperature Units"
      }
    },
    "required": ["apiKey"]
  }
}
```

## Distribution Channels

### NPM Package Distribution

```typescript
// scripts/publish-npm.ts
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

export function publishToNPM(): void {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  
  console.log(`📦 Publishing ${packageJson.name}@${packageJson.version} to NPM...`);
  
  try {
    // Dry run first
    execSync('npm publish --dry-run', { stdio: 'inherit' });
    
    // Actual publish
    execSync('npm publish --access public', { stdio: 'inherit' });
    
    console.log('✅ Successfully published to NPM');
    console.log(`📋 Install with: npm install ${packageJson.name}`);
  } catch (error) {
    console.error('❌ NPM publish failed:', error.message);
    process.exit(1);
  }
}
```

### GitHub Releases

```typescript
// scripts/create-github-release.ts
import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';

export async function createGitHubRelease(): Promise<void> {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
  
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const changelog = readFileSync('CHANGELOG.md', 'utf-8');
  
  // Extract release notes for current version
  const releaseNotes = extractReleaseNotes(changelog, packageJson.version);
  
  try {
    const release = await octokit.rest.repos.createRelease({
      owner: 'yourusername',
      repo: 'weather-plugin',
      tag_name: `v${packageJson.version}`,
      name: `Release ${packageJson.version}`,
      body: releaseNotes,
      draft: false,
      prerelease: packageJson.version.includes('-')
    });
    
    console.log(`✅ GitHub release created: ${release.data.html_url}`);
  } catch (error) {
    console.error('❌ Failed to create GitHub release:', error.message);
    process.exit(1);
  }
}

function extractReleaseNotes(changelog: string, version: string): string {
  const versionHeader = `## [${version}]`;
  const startIndex = changelog.indexOf(versionHeader);
  
  if (startIndex === -1) {
    return `Release ${version}`;
  }
  
  const nextVersionIndex = changelog.indexOf('\n## [', startIndex + 1);
  const endIndex = nextVersionIndex === -1 ? changelog.length : nextVersionIndex;
  
  return changelog.slice(startIndex, endIndex).trim();
}
```

## Update Strategies

### Automatic Updates

```typescript
// src/updateManager.ts
export class PluginUpdateManager {
  constructor(
    private currentVersion: string,
    private updateCheckUrl: string
  ) {}

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const response = await fetch(`${this.updateCheckUrl}/latest`);
      const updateInfo: UpdateInfo = await response.json();
      
      if (this.isNewerVersion(updateInfo.version)) {
        return updateInfo;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return null;
    }
  }

  private isNewerVersion(remoteVersion: string): boolean {
    return semver.gt(remoteVersion, this.currentVersion);
  }

  async downloadUpdate(updateInfo: UpdateInfo): Promise<void> {
    // Implementation depends on update mechanism
    // Could be automatic download or redirect to marketplace
  }

  async scheduleUpdateCheck(): Promise<void> {
    // Check for updates daily
    setInterval(async () => {
      const update = await this.checkForUpdates();
      if (update) {
        await this.notifyUserOfUpdate(update);
      }
    }, 24 * 60 * 60 * 1000);
  }

  private async notifyUserOfUpdate(updateInfo: UpdateInfo): Promise<void> {
    // Show update notification to user
    await this.showUpdateNotification({
      title: 'Update Available',
      message: `Version ${updateInfo.version} is now available`,
      actions: [
        { label: 'Update Now', action: () => this.downloadUpdate(updateInfo) },
        { label: 'Later', action: () => {} }
      ]
    });
  }
}

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  critical: boolean;
}
```

## Monitoring and Analytics

### Usage Analytics

```typescript
// src/analytics.ts
export class PluginAnalytics {
  private events: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private pluginId: string, private apiEndpoint: string) {
    this.flushInterval = setInterval(() => this.flush(), 60000); // Flush every minute
  }

  track(event: string, properties: Record<string, any> = {}): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        pluginId: this.pluginId,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId()
      }
    };

    this.events.push(analyticsEvent);

    // Flush immediately for critical events
    if (event === 'error' || event === 'crash') {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch(`${this.apiEndpoint}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend })
      });
    } catch (error) {
      // Re-add events if sending failed
      this.events.unshift(...eventsToSend);
      console.error('Failed to send analytics:', error);
    }
  }

  private getSessionId(): string {
    // Generate or retrieve session ID
    return 'session-' + Date.now();
  }

  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush(); // Final flush
  }
}

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
}
```

This comprehensive deployment guide ensures your Qirvo plugins are properly packaged, versioned, and distributed through appropriate channels with monitoring capabilities.

---

**Next**: [Testing Documentation](../testing/unit-testing.md)
