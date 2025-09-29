# Plugin Versioning Guide

This guide covers comprehensive versioning strategies for Qirvo plugins, including semantic versioning, release management, backward compatibility, and automated version control workflows.

## Table of Contents

- [Semantic Versioning](#semantic-versioning)
- [Version Management Strategy](#version-management-strategy)
- [Backward Compatibility](#backward-compatibility)
- [Release Planning](#release-planning)
- [Automated Versioning](#automated-versioning)
- [Migration Strategies](#migration-strategies)

## Semantic Versioning

### Version Format

Qirvo plugins follow [Semantic Versioning (SemVer)](https://semver.org/) specification:

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

**Examples:**
- `1.0.0` - Initial stable release
- `1.2.3` - Patch release with bug fixes
- `2.0.0` - Major release with breaking changes
- `1.3.0-beta.1` - Pre-release version
- `1.0.0+20231201` - Build metadata

### Version Components

#### MAJOR Version (X.0.0)
Increment when making **incompatible API changes**:

```typescript
// Version 1.x.x - Old API
interface WeatherConfig {
  apiKey: string;
  location: string;
}

// Version 2.0.0 - Breaking change
interface WeatherConfig {
  apiKey: string;
  defaultLocation: string; // Renamed property
  units: 'metric' | 'imperial'; // New required property
}
```

#### MINOR Version (0.X.0)
Increment when adding **backward-compatible functionality**:

```typescript
// Version 1.0.0
export class WeatherPlugin {
  getCurrentWeather(): Promise<WeatherData> { }
}

// Version 1.1.0 - New feature, backward compatible
export class WeatherPlugin {
  getCurrentWeather(): Promise<WeatherData> { }
  getForecast(days: number): Promise<WeatherData[]> { } // New method
}
```

#### PATCH Version (0.0.X)
Increment when making **backward-compatible bug fixes**:

```typescript
// Version 1.0.0 - Bug exists
formatTemperature(temp: number): string {
  return `${temp}°C`; // Bug: doesn't handle decimals
}

// Version 1.0.1 - Bug fix
formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`; // Fixed: rounds decimals
}
```

### Pre-release Versions

Use pre-release identifiers for unstable versions:

```typescript
// Pre-release version format
"1.2.0-alpha.1"    // Alpha release
"1.2.0-beta.2"     // Beta release  
"1.2.0-rc.1"       // Release candidate
```

#### Pre-release Lifecycle

```typescript
// Development cycle example
"1.1.0"           // Current stable
"1.2.0-alpha.1"   // Early development
"1.2.0-alpha.2"   // More alpha changes
"1.2.0-beta.1"    // Feature complete
"1.2.0-beta.2"    // Bug fixes
"1.2.0-rc.1"      // Release candidate
"1.2.0"           // Stable release
```

## Version Management Strategy

### Version Planning Matrix

| Change Type | Version Impact | Examples | Compatibility |
|-------------|---------------|----------|---------------|
| Bug fixes | PATCH | Fix calculation error, UI bug | ✅ Backward compatible |
| New features | MINOR | Add new API method, new config option | ✅ Backward compatible |
| API changes | MAJOR | Remove method, change interface | ❌ Breaking changes |
| Dependencies | VARIES | Update library versions | Depends on changes |

### Version Control Workflow

```typescript
// scripts/version-manager.ts
export class VersionManager {
  private currentVersion: string;
  private packageJson: any;
  private manifest: any;

  constructor() {
    this.packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    this.manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));
    this.currentVersion = this.packageJson.version;
  }

  analyzeChanges(gitDiff: string): VersionBump {
    const changes = this.parseGitDiff(gitDiff);
    
    if (this.hasBreakingChanges(changes)) {
      return { type: 'major', reason: 'Breaking changes detected' };
    }
    
    if (this.hasNewFeatures(changes)) {
      return { type: 'minor', reason: 'New features added' };
    }
    
    return { type: 'patch', reason: 'Bug fixes and improvements' };
  }

  private hasBreakingChanges(changes: GitChange[]): boolean {
    return changes.some(change => 
      change.type === 'removed' && change.scope === 'public-api' ||
      change.type === 'modified' && change.breaking === true
    );
  }

  private hasNewFeatures(changes: GitChange[]): boolean {
    return changes.some(change => 
      change.type === 'added' && change.scope === 'feature'
    );
  }

  bumpVersion(type: 'major' | 'minor' | 'patch'): string {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  updateVersionFiles(newVersion: string): void {
    // Update package.json
    this.packageJson.version = newVersion;
    writeFileSync('package.json', JSON.stringify(this.packageJson, null, 2));
    
    // Update manifest.json
    this.manifest.version = newVersion;
    writeFileSync('manifest.json', JSON.stringify(this.manifest, null, 2));
    
    // Update version constants
    this.updateVersionConstants(newVersion);
  }

  private updateVersionConstants(version: string): void {
    const versionFile = `
export const PLUGIN_VERSION = '${version}';
export const VERSION_INFO = {
  version: '${version}',
  buildDate: '${new Date().toISOString()}',
  gitCommit: '${this.getGitCommit()}'
};
`;
    writeFileSync('src/version.ts', versionFile);
  }
}

interface VersionBump {
  type: 'major' | 'minor' | 'patch';
  reason: string;
}

interface GitChange {
  type: 'added' | 'modified' | 'removed';
  scope: 'public-api' | 'feature' | 'internal';
  breaking: boolean;
  file: string;
}
```

### Changelog Generation

```typescript
// scripts/changelog-generator.ts
export class ChangelogGenerator {
  generateChangelog(fromVersion: string, toVersion: string): string {
    const commits = this.getCommitsSince(fromVersion);
    const categorizedCommits = this.categorizeCommits(commits);
    
    return this.formatChangelog(toVersion, categorizedCommits);
  }

  private categorizeCommits(commits: GitCommit[]): CategorizedCommits {
    const categories: CategorizedCommits = {
      breaking: [],
      features: [],
      fixes: [],
      improvements: [],
      dependencies: []
    };

    commits.forEach(commit => {
      if (commit.message.includes('BREAKING CHANGE')) {
        categories.breaking.push(commit);
      } else if (commit.type === 'feat') {
        categories.features.push(commit);
      } else if (commit.type === 'fix') {
        categories.fixes.push(commit);
      } else if (commit.type === 'perf' || commit.type === 'refactor') {
        categories.improvements.push(commit);
      } else if (commit.type === 'deps') {
        categories.dependencies.push(commit);
      }
    });

    return categories;
  }

  private formatChangelog(version: string, commits: CategorizedCommits): string {
    const date = new Date().toISOString().split('T')[0];
    let changelog = `## [${version}] - ${date}\n\n`;

    if (commits.breaking.length > 0) {
      changelog += '### ⚠️ BREAKING CHANGES\n\n';
      commits.breaking.forEach(commit => {
        changelog += `- ${commit.description}\n`;
        if (commit.breakingChange) {
          changelog += `  - **Migration**: ${commit.breakingChange}\n`;
        }
      });
      changelog += '\n';
    }

    if (commits.features.length > 0) {
      changelog += '### ✨ Features\n\n';
      commits.features.forEach(commit => {
        changelog += `- ${commit.description} ([${commit.hash.substring(0, 7)}](${commit.url}))\n`;
      });
      changelog += '\n';
    }

    if (commits.fixes.length > 0) {
      changelog += '### 🐛 Bug Fixes\n\n';
      commits.fixes.forEach(commit => {
        changelog += `- ${commit.description} ([${commit.hash.substring(0, 7)}](${commit.url}))\n`;
      });
      changelog += '\n';
    }

    if (commits.improvements.length > 0) {
      changelog += '### 🚀 Improvements\n\n';
      commits.improvements.forEach(commit => {
        changelog += `- ${commit.description} ([${commit.hash.substring(0, 7)}](${commit.url}))\n`;
      });
      changelog += '\n';
    }

    if (commits.dependencies.length > 0) {
      changelog += '### 📦 Dependencies\n\n';
      commits.dependencies.forEach(commit => {
        changelog += `- ${commit.description}\n`;
      });
      changelog += '\n';
    }

    return changelog;
  }
}

interface GitCommit {
  hash: string;
  type: string;
  description: string;
  breakingChange?: string;
  url: string;
}

interface CategorizedCommits {
  breaking: GitCommit[];
  features: GitCommit[];
  fixes: GitCommit[];
  improvements: GitCommit[];
  dependencies: GitCommit[];
}
```

## Backward Compatibility

### Compatibility Guidelines

#### API Deprecation Strategy

```typescript
// Version 1.0.0 - Original API
export class WeatherPlugin {
  getWeather(location: string): Promise<WeatherData> {
    // Original implementation
  }
}

// Version 1.1.0 - Add new API, deprecate old
export class WeatherPlugin {
  /**
   * @deprecated Use getCurrentWeather() instead. Will be removed in v2.0.0
   */
  getWeather(location: string): Promise<WeatherData> {
    console.warn('getWeather() is deprecated. Use getCurrentWeather() instead.');
    return this.getCurrentWeather(location);
  }

  getCurrentWeather(location: string): Promise<WeatherData> {
    // New implementation
  }
}

// Version 2.0.0 - Remove deprecated API
export class WeatherPlugin {
  getCurrentWeather(location: string): Promise<WeatherData> {
    // Only new API remains
  }
}
```

#### Configuration Migration

```typescript
// Configuration version handling
export class ConfigMigrator {
  migrateConfig(config: any, fromVersion: string, toVersion: string): any {
    const migrations = this.getMigrationPath(fromVersion, toVersion);
    
    return migrations.reduce((currentConfig, migration) => {
      return migration.migrate(currentConfig);
    }, config);
  }

  private getMigrationPath(from: string, to: string): Migration[] {
    const migrations: Migration[] = [
      {
        from: '1.0.0',
        to: '1.1.0',
        migrate: (config) => ({
          ...config,
          refreshInterval: config.refreshInterval || 300 // Add default
        })
      },
      {
        from: '1.1.0',
        to: '2.0.0',
        migrate: (config) => ({
          apiKey: config.apiKey,
          defaultLocation: config.location, // Rename property
          units: config.units || 'metric',  // Add required property
          refreshInterval: config.refreshInterval
        })
      }
    ];

    return this.findMigrationPath(migrations, from, to);
  }
}

interface Migration {
  from: string;
  to: string;
  migrate: (config: any) => any;
}
```

### Compatibility Testing

```typescript
// tests/compatibility.test.ts
describe('Backward Compatibility', () => {
  describe('API Compatibility', () => {
    it('should maintain v1.0 API compatibility in v1.x', () => {
      const plugin = new WeatherPlugin();
      
      // Old API should still work
      expect(plugin.getWeather).toBeDefined();
      expect(typeof plugin.getWeather).toBe('function');
    });

    it('should show deprecation warnings for old APIs', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const plugin = new WeatherPlugin();
      
      plugin.getWeather('London');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('deprecated')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Compatibility', () => {
    it('should migrate v1.0 config to v1.1', () => {
      const migrator = new ConfigMigrator();
      const oldConfig = {
        apiKey: 'test-key',
        location: 'London'
      };
      
      const newConfig = migrator.migrateConfig(oldConfig, '1.0.0', '1.1.0');
      
      expect(newConfig).toEqual({
        apiKey: 'test-key',
        location: 'London',
        refreshInterval: 300
      });
    });
  });
});
```

## Release Planning

### Release Types

#### Hotfix Releases

```typescript
// Hotfix workflow for critical bugs
export class HotfixManager {
  createHotfix(bugDescription: string, targetVersion: string): HotfixPlan {
    const currentVersion = this.getCurrentVersion();
    const hotfixVersion = this.calculateHotfixVersion(currentVersion);
    
    return {
      version: hotfixVersion,
      baseBranch: `release/${currentVersion}`,
      hotfixBranch: `hotfix/${hotfixVersion}`,
      description: bugDescription,
      steps: [
        'Create hotfix branch from release branch',
        'Apply minimal fix',
        'Test fix thoroughly',
        'Update version and changelog',
        'Merge to main and release branch',
        'Deploy hotfix release'
      ]
    };
  }

  private calculateHotfixVersion(currentVersion: string): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }
}

interface HotfixPlan {
  version: string;
  baseBranch: string;
  hotfixBranch: string;
  description: string;
  steps: string[];
}
```

#### Feature Releases

```typescript
// Feature release planning
export class ReleaseManager {
  planRelease(features: Feature[], targetDate: Date): ReleasePlan {
    const currentVersion = this.getCurrentVersion();
    const releaseVersion = this.calculateReleaseVersion(features);
    
    return {
      version: releaseVersion,
      features: features,
      timeline: this.createTimeline(targetDate),
      milestones: this.createMilestones(features),
      riskAssessment: this.assessRisks(features)
    };
  }

  private calculateReleaseVersion(features: Feature[]): string {
    const hasBreakingChanges = features.some(f => f.breaking);
    const hasNewFeatures = features.some(f => f.type === 'feature');
    
    if (hasBreakingChanges) {
      return this.bumpMajorVersion();
    } else if (hasNewFeatures) {
      return this.bumpMinorVersion();
    } else {
      return this.bumpPatchVersion();
    }
  }

  private createTimeline(targetDate: Date): ReleaseTimeline {
    const now = new Date();
    const totalDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      developmentPhase: {
        start: now,
        end: new Date(now.getTime() + (totalDays * 0.7) * 24 * 60 * 60 * 1000),
        activities: ['Feature development', 'Unit testing', 'Integration testing']
      },
      testingPhase: {
        start: new Date(now.getTime() + (totalDays * 0.7) * 24 * 60 * 60 * 1000),
        end: new Date(now.getTime() + (totalDays * 0.9) * 24 * 60 * 60 * 1000),
        activities: ['E2E testing', 'Performance testing', 'Security testing']
      },
      releasePhase: {
        start: new Date(now.getTime() + (totalDays * 0.9) * 24 * 60 * 60 * 1000),
        end: targetDate,
        activities: ['Final testing', 'Documentation', 'Release deployment']
      }
    };
  }
}

interface Feature {
  name: string;
  type: 'feature' | 'improvement' | 'fix';
  breaking: boolean;
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
}

interface ReleasePlan {
  version: string;
  features: Feature[];
  timeline: ReleaseTimeline;
  milestones: Milestone[];
  riskAssessment: RiskAssessment;
}

interface ReleaseTimeline {
  developmentPhase: Phase;
  testingPhase: Phase;
  releasePhase: Phase;
}

interface Phase {
  start: Date;
  end: Date;
  activities: string[];
}
```

## Automated Versioning

### GitHub Actions Workflow

```yaml
# .github/workflows/version-bump.yml
name: Version Bump

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      version_type:
        description: 'Version bump type'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  version-bump:
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, '[skip version]')"
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Analyze changes
        id: analyze
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "version_type=${{ github.event.inputs.version_type }}" >> $GITHUB_OUTPUT
          else
            # Analyze commits since last tag
            LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
            if [ -z "$LAST_TAG" ]; then
              echo "version_type=minor" >> $GITHUB_OUTPUT
            else
              # Check for breaking changes
              if git log $LAST_TAG..HEAD --oneline | grep -i "BREAKING CHANGE\|breaking:"; then
                echo "version_type=major" >> $GITHUB_OUTPUT
              # Check for new features
              elif git log $LAST_TAG..HEAD --oneline | grep -i "feat:\|feature:"; then
                echo "version_type=minor" >> $GITHUB_OUTPUT
              # Default to patch
              else
                echo "version_type=patch" >> $GITHUB_OUTPUT
              fi
            fi
          fi

      - name: Bump version
        id: version
        run: |
          VERSION_TYPE=${{ steps.analyze.outputs.version_type }}
          NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
          echo "new_version=$NEW_VERSION" >> $GITHUB_OUTPUT
          
          # Update manifest.json
          node -e "
            const fs = require('fs');
            const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
            manifest.version = '$NEW_VERSION'.replace('v', '');
            fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
          "

      - name: Generate changelog
        run: |
          npm run changelog:generate

      - name: Commit version bump
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add package.json manifest.json CHANGELOG.md
          git commit -m "chore: bump version to ${{ steps.version.outputs.new_version }} [skip ci]"
          git tag ${{ steps.version.outputs.new_version }}

      - name: Push changes
        run: |
          git push origin main
          git push origin ${{ steps.version.outputs.new_version }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.version.outputs.new_version }}
          release_name: Release ${{ steps.version.outputs.new_version }}
          body_path: ./RELEASE_NOTES.md
          draft: false
          prerelease: false
```

### Semantic Release Configuration

```javascript
// .releaserc.js
module.exports = {
  branches: [
    'main',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true }
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        tarballDir: 'dist'
      }
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'npm run build && npm run package'
      }
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          { path: 'dist/*.tgz', label: 'Plugin Package' },
          { path: 'dist/plugin.zip', label: 'Plugin Archive' }
        ]
      }
    ],
    '@semantic-release/git'
  ]
};
```

## Migration Strategies

### Version Migration Framework

```typescript
// src/migrations/migrationManager.ts
export class MigrationManager {
  private migrations: Map<string, Migration> = new Map();

  registerMigration(migration: Migration): void {
    this.migrations.set(migration.version, migration);
  }

  async migrateToVersion(
    currentVersion: string, 
    targetVersion: string, 
    data: any
  ): Promise<MigrationResult> {
    const migrationPath = this.findMigrationPath(currentVersion, targetVersion);
    
    if (migrationPath.length === 0) {
      return { success: true, data, warnings: [] };
    }

    let migratedData = data;
    const warnings: string[] = [];
    
    for (const migration of migrationPath) {
      try {
        const result = await migration.migrate(migratedData);
        migratedData = result.data;
        warnings.push(...result.warnings);
      } catch (error) {
        return {
          success: false,
          error: `Migration to ${migration.version} failed: ${error.message}`,
          data: migratedData
        };
      }
    }

    return { success: true, data: migratedData, warnings };
  }

  private findMigrationPath(from: string, to: string): Migration[] {
    const fromParts = from.split('.').map(Number);
    const toParts = to.split('.').map(Number);
    
    const migrations: Migration[] = [];
    
    // Find all migrations between versions
    for (const [version, migration] of this.migrations) {
      const versionParts = version.split('.').map(Number);
      
      if (this.isVersionBetween(versionParts, fromParts, toParts)) {
        migrations.push(migration);
      }
    }
    
    // Sort migrations by version
    return migrations.sort((a, b) => 
      this.compareVersions(a.version, b.version)
    );
  }

  private isVersionBetween(
    version: number[], 
    from: number[], 
    to: number[]
  ): boolean {
    return this.compareVersionArrays(version, from) > 0 && 
           this.compareVersionArrays(version, to) <= 0;
  }
}

interface Migration {
  version: string;
  description: string;
  migrate: (data: any) => Promise<{ data: any; warnings: string[] }>;
}

interface MigrationResult {
  success: boolean;
  data: any;
  warnings?: string[];
  error?: string;
}
```

### Data Migration Examples

```typescript
// migrations/v1.1.0.ts
export const migration_v1_1_0: Migration = {
  version: '1.1.0',
  description: 'Add refresh interval configuration',
  
  async migrate(data: any): Promise<{ data: any; warnings: string[] }> {
    const warnings: string[] = [];
    
    // Add default refresh interval if missing
    if (!data.config.refreshInterval) {
      data.config.refreshInterval = 300; // 5 minutes default
      warnings.push('Added default refresh interval of 5 minutes');
    }
    
    // Migrate old cache settings
    if (data.config.cacheEnabled !== undefined) {
      data.config.cache = {
        enabled: data.config.cacheEnabled,
        ttl: data.config.cacheTtl || 300
      };
      delete data.config.cacheEnabled;
      delete data.config.cacheTtl;
      warnings.push('Migrated cache settings to new format');
    }
    
    return { data, warnings };
  }
};

// migrations/v2.0.0.ts
export const migration_v2_0_0: Migration = {
  version: '2.0.0',
  description: 'Breaking changes: rename location to defaultLocation',
  
  async migrate(data: any): Promise<{ data: any; warnings: string[] }> {
    const warnings: string[] = [];
    
    // Rename location to defaultLocation
    if (data.config.location) {
      data.config.defaultLocation = data.config.location;
      delete data.config.location;
      warnings.push('Renamed "location" to "defaultLocation"');
    }
    
    // Add required units field
    if (!data.config.units) {
      data.config.units = 'metric';
      warnings.push('Added default units setting (metric)');
    }
    
    // Migrate old API endpoints
    if (data.config.apiUrl) {
      data.config.endpoints = {
        weather: `${data.config.apiUrl}/weather`,
        forecast: `${data.config.apiUrl}/forecast`
      };
      delete data.config.apiUrl;
      warnings.push('Migrated API URL to new endpoints structure');
    }
    
    return { data, warnings };
  }
};
```

This comprehensive versioning guide ensures proper version management, backward compatibility, and smooth migration paths for Qirvo plugins throughout their lifecycle.

---

**Next**: [Publishing Guide](./publishing.md)
