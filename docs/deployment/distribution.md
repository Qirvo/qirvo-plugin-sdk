# Distribution Guide

This guide covers distribution methods for Qirvo plugins, including marketplace publishing, direct distribution, enterprise deployment, and update management.

## Table of Contents

- [Distribution Overview](#distribution-overview)
- [Marketplace Publishing](#marketplace-publishing)
- [Direct Distribution](#direct-distribution)
- [Enterprise Deployment](#enterprise-deployment)
- [Update Management](#update-management)
- [Analytics & Monitoring](#analytics--monitoring)

## Distribution Overview

### Distribution Channels

```typescript
// Distribution channel configuration
export interface DistributionChannel {
  id: string;
  name: string;
  type: 'marketplace' | 'direct' | 'enterprise' | 'private';
  endpoint: string;
  authentication: AuthConfig;
  requirements: DistributionRequirements;
}

export class DistributionManager {
  private channels: Map<string, DistributionChannel> = new Map();
  private publisher: PluginPublisher;
  
  constructor() {
    this.publisher = new PluginPublisher();
    this.setupDefaultChannels();
  }
  
  private setupDefaultChannels(): void {
    // Official Qirvo Marketplace
    this.channels.set('marketplace', {
      id: 'marketplace',
      name: 'Qirvo Plugin Marketplace',
      type: 'marketplace',
      endpoint: 'https://api.qirvo.ai/plugins',
      authentication: {
        type: 'api-key',
        required: true
      },
      requirements: {
        review: true,
        testing: true,
        documentation: true,
        security: true
      }
    });
    
    // Direct distribution
    this.channels.set('direct', {
      id: 'direct',
      name: 'Direct Distribution',
      type: 'direct',
      endpoint: 'custom',
      authentication: {
        type: 'none',
        required: false
      },
      requirements: {
        review: false,
        testing: false,
        documentation: false,
        security: false
      }
    });
  }
  
  async distribute(
    pluginPath: string, 
    channelId: string, 
    options: DistributionOptions = {}
  ): Promise<DistributionResult> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Distribution channel not found: ${channelId}`);
    }
    
    // Validate plugin before distribution
    const validation = await this.validateForDistribution(pluginPath, channel);
    if (!validation.passed) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Distribute based on channel type
    switch (channel.type) {
      case 'marketplace':
        return this.distributeToMarketplace(pluginPath, channel, options);
      case 'direct':
        return this.distributeDirectly(pluginPath, options);
      case 'enterprise':
        return this.distributeToEnterprise(pluginPath, channel, options);
      default:
        throw new Error(`Unsupported distribution type: ${channel.type}`);
    }
  }
}

interface DistributionOptions {
  version?: string;
  releaseNotes?: string;
  beta?: boolean;
  private?: boolean;
  pricing?: PricingConfig;
}

interface DistributionResult {
  success: boolean;
  distributionId: string;
  downloadUrl?: string;
  marketplaceUrl?: string;
  errors?: string[];
}
```

## Marketplace Publishing

### Marketplace Publisher

```typescript
// Marketplace publishing implementation
export class MarketplacePublisher {
  private apiClient: MarketplaceAPIClient;
  private validator: MarketplaceValidator;
  
  constructor(apiKey: string) {
    this.apiClient = new MarketplaceAPIClient(apiKey);
    this.validator = new MarketplaceValidator();
  }
  
  async publishPlugin(
    pluginPath: string, 
    metadata: MarketplaceMetadata
  ): Promise<PublishResult> {
    console.log('🚀 Publishing plugin to marketplace...');
    
    // Step 1: Validate plugin
    const validation = await this.validator.validate(pluginPath);
    if (!validation.passed) {
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Step 2: Upload plugin package
    const uploadResult = await this.uploadPlugin(pluginPath);
    if (!uploadResult.success) {
      return uploadResult;
    }
    
    // Step 3: Submit for review
    const submissionResult = await this.submitForReview(
      uploadResult.packageId!, 
      metadata
    );
    
    return submissionResult;
  }
  
  private async uploadPlugin(pluginPath: string): Promise<UploadResult> {
    const formData = new FormData();
    const pluginBuffer = fs.readFileSync(pluginPath);
    
    formData.append('plugin', new Blob([pluginBuffer]), 'plugin.zip');
    formData.append('timestamp', Date.now().toString());
    
    try {
      const response = await this.apiClient.post('/upload', formData);
      
      return {
        success: true,
        packageId: response.packageId,
        uploadUrl: response.uploadUrl
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Upload failed: ${error.message}`]
      };
    }
  }
  
  private async submitForReview(
    packageId: string, 
    metadata: MarketplaceMetadata
  ): Promise<PublishResult> {
    try {
      const response = await this.apiClient.post('/submit', {
        packageId,
        metadata: {
          name: metadata.name,
          description: metadata.description,
          version: metadata.version,
          category: metadata.category,
          tags: metadata.tags,
          pricing: metadata.pricing,
          screenshots: metadata.screenshots,
          documentation: metadata.documentation
        }
      });
      
      return {
        success: true,
        submissionId: response.submissionId,
        reviewUrl: response.reviewUrl,
        estimatedReviewTime: response.estimatedReviewTime
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Submission failed: ${error.message}`]
      };
    }
  }
  
  async getSubmissionStatus(submissionId: string): Promise<SubmissionStatus> {
    const response = await this.apiClient.get(`/submissions/${submissionId}`);
    
    return {
      id: submissionId,
      status: response.status,
      reviewProgress: response.reviewProgress,
      feedback: response.feedback,
      estimatedCompletion: response.estimatedCompletion
    };
  }
  
  async updatePlugin(
    pluginId: string, 
    pluginPath: string, 
    updateMetadata: UpdateMetadata
  ): Promise<UpdateResult> {
    const formData = new FormData();
    const pluginBuffer = fs.readFileSync(pluginPath);
    
    formData.append('plugin', new Blob([pluginBuffer]), 'plugin.zip');
    formData.append('version', updateMetadata.version);
    formData.append('releaseNotes', updateMetadata.releaseNotes);
    formData.append('breaking', updateMetadata.breaking.toString());
    
    try {
      const response = await this.apiClient.put(`/plugins/${pluginId}`, formData);
      
      return {
        success: true,
        updateId: response.updateId,
        version: response.version,
        publishedAt: response.publishedAt
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Update failed: ${error.message}`]
      };
    }
  }
}

interface MarketplaceMetadata {
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  pricing: PricingConfig;
  screenshots: string[];
  documentation: string;
}

interface PricingConfig {
  type: 'free' | 'paid' | 'freemium';
  price?: number;
  currency?: string;
  subscription?: boolean;
}
```

## Direct Distribution

### Direct Distribution Methods

```typescript
// Direct distribution implementation
export class DirectDistributor {
  async createDownloadPackage(
    pluginPath: string, 
    options: PackageOptions = {}
  ): Promise<DistributionPackage> {
    const packageId = this.generatePackageId();
    const packageDir = path.join(os.tmpdir(), packageId);
    
    // Create package directory
    fs.mkdirSync(packageDir, { recursive: true });
    
    // Copy plugin files
    const pluginName = path.basename(pluginPath, '.zip');
    const targetPath = path.join(packageDir, `${pluginName}.zip`);
    fs.copyFileSync(pluginPath, targetPath);
    
    // Generate installation script
    const installScript = this.generateInstallScript(pluginName, options);
    fs.writeFileSync(
      path.join(packageDir, 'install.sh'), 
      installScript
    );
    
    // Generate Windows batch file
    const batchScript = this.generateBatchScript(pluginName, options);
    fs.writeFileSync(
      path.join(packageDir, 'install.bat'), 
      batchScript
    );
    
    // Create README
    const readme = this.generateReadme(pluginName, options);
    fs.writeFileSync(
      path.join(packageDir, 'README.md'), 
      readme
    );
    
    // Create final distribution package
    const distributionPath = await this.createDistributionZip(packageDir, packageId);
    
    return {
      packageId,
      path: distributionPath,
      size: fs.statSync(distributionPath).size,
      installScript: installScript,
      readme: readme
    };
  }
  
  private generateInstallScript(pluginName: string, options: PackageOptions): string {
    return `#!/bin/bash
# Qirvo Plugin Installation Script
# Plugin: ${pluginName}

set -e

echo "Installing ${pluginName}..."

# Check if Qirvo CLI is installed
if ! command -v qirvo &> /dev/null; then
    echo "Error: Qirvo CLI not found. Please install Qirvo CLI first."
    exit 1
fi

# Install plugin
qirvo plugin install ./${pluginName}.zip

echo "✅ ${pluginName} installed successfully!"
echo "Run 'qirvo plugin list' to see installed plugins."
`;
  }
  
  private generateBatchScript(pluginName: string, options: PackageOptions): string {
    return `@echo off
REM Qirvo Plugin Installation Script
REM Plugin: ${pluginName}

echo Installing ${pluginName}...

REM Check if Qirvo CLI is installed
qirvo --version >nul 2>&1
if errorlevel 1 (
    echo Error: Qirvo CLI not found. Please install Qirvo CLI first.
    exit /b 1
)

REM Install plugin
qirvo plugin install ${pluginName}.zip

echo ✅ ${pluginName} installed successfully!
echo Run 'qirvo plugin list' to see installed plugins.
`;
  }
  
  private generateReadme(pluginName: string, options: PackageOptions): string {
    return `# ${pluginName} Plugin

## Installation

### Automatic Installation

**Linux/macOS:**
\`\`\`bash
chmod +x install.sh
./install.sh
\`\`\`

**Windows:**
\`\`\`cmd
install.bat
\`\`\`

### Manual Installation

1. Ensure Qirvo CLI is installed
2. Run: \`qirvo plugin install ${pluginName}.zip\`

## Requirements

- Qirvo CLI v1.0.0 or higher
- Node.js 16+ (for development)

## Support

For support and documentation, visit: https://docs.qirvo.ai
`;
  }
  
  async createWebDistribution(
    pluginPath: string, 
    options: WebDistributionOptions
  ): Promise<WebDistribution> {
    const webDir = path.join(os.tmpdir(), 'web-dist');
    fs.mkdirSync(webDir, { recursive: true });
    
    // Create download page
    const downloadPage = this.generateDownloadPage(pluginPath, options);
    fs.writeFileSync(
      path.join(webDir, 'index.html'), 
      downloadPage
    );
    
    // Copy plugin file
    const pluginName = path.basename(pluginPath);
    fs.copyFileSync(pluginPath, path.join(webDir, pluginName));
    
    // Generate metadata
    const metadata = {
      plugin: pluginName,
      version: options.version,
      downloadCount: 0,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(webDir, 'metadata.json'), 
      JSON.stringify(metadata, null, 2)
    );
    
    return {
      path: webDir,
      downloadUrl: `/${pluginName}`,
      pageUrl: '/index.html',
      metadata
    };
  }
}

interface PackageOptions {
  version?: string;
  includeSource?: boolean;
  customInstructions?: string;
}

interface WebDistributionOptions extends PackageOptions {
  title?: string;
  description?: string;
  author?: string;
}
```

## Enterprise Deployment

### Enterprise Distribution

```typescript
// Enterprise deployment system
export class EnterpriseDeployer {
  private registry: EnterpriseRegistry;
  private deployer: ContainerDeployer;
  
  constructor(config: EnterpriseConfig) {
    this.registry = new EnterpriseRegistry(config.registryUrl);
    this.deployer = new ContainerDeployer(config.deployment);
  }
  
  async deployToEnterprise(
    pluginPath: string, 
    deployment: EnterpriseDeployment
  ): Promise<DeploymentResult> {
    console.log('🏢 Deploying to enterprise environment...');
    
    // Step 1: Security scan
    const securityScan = await this.performSecurityScan(pluginPath);
    if (!securityScan.passed) {
      return {
        success: false,
        errors: securityScan.vulnerabilities
      };
    }
    
    // Step 2: Create container image
    const containerResult = await this.createContainerImage(pluginPath, deployment);
    if (!containerResult.success) {
      return containerResult;
    }
    
    // Step 3: Deploy to registry
    const registryResult = await this.pushToRegistry(
      containerResult.imageId!, 
      deployment
    );
    
    // Step 4: Deploy to environments
    const deploymentResults = await this.deployToEnvironments(
      registryResult.imageUrl!, 
      deployment.environments
    );
    
    return {
      success: deploymentResults.every(r => r.success),
      deploymentId: this.generateDeploymentId(),
      environments: deploymentResults,
      imageUrl: registryResult.imageUrl
    };
  }
  
  private async createContainerImage(
    pluginPath: string, 
    deployment: EnterpriseDeployment
  ): Promise<ContainerResult> {
    const dockerfile = this.generateDockerfile(deployment);
    const buildContext = await this.prepareBuildContext(pluginPath, dockerfile);
    
    try {
      const imageId = await this.deployer.buildImage(buildContext, {
        tags: [`${deployment.name}:${deployment.version}`],
        platform: deployment.platform || 'linux/amd64'
      });
      
      return {
        success: true,
        imageId,
        size: await this.getImageSize(imageId)
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Container build failed: ${error.message}`]
      };
    }
  }
  
  private generateDockerfile(deployment: EnterpriseDeployment): string {
    return `# Qirvo Plugin Enterprise Container
FROM node:18-alpine

# Install Qirvo CLI
RUN npm install -g @qirvo/cli

# Create app directory
WORKDIR /app

# Copy plugin
COPY plugin.zip ./
COPY package.json ./

# Install plugin
RUN qirvo plugin install plugin.zip

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD qirvo plugin status || exit 1

# Run plugin service
CMD ["qirvo", "plugin", "serve", "--port", "3000"]

EXPOSE 3000
`;
  }
  
  async rollback(deploymentId: string): Promise<RollbackResult> {
    const deployment = await this.getDeployment(deploymentId);
    if (!deployment) {
      return {
        success: false,
        errors: ['Deployment not found']
      };
    }
    
    const previousVersion = await this.getPreviousVersion(deployment);
    if (!previousVersion) {
      return {
        success: false,
        errors: ['No previous version available for rollback']
      };
    }
    
    // Rollback to previous version
    const rollbackResults = await Promise.all(
      deployment.environments.map(env => 
        this.rollbackEnvironment(env, previousVersion)
      )
    );
    
    return {
      success: rollbackResults.every(r => r.success),
      rolledBackTo: previousVersion.version,
      environments: rollbackResults
    };
  }
}

interface EnterpriseDeployment {
  name: string;
  version: string;
  environments: string[];
  platform?: string;
  resources?: ResourceRequirements;
  security?: SecurityConfig;
}

interface ResourceRequirements {
  cpu: string;
  memory: string;
  storage: string;
}
```

## Update Management

### Update System

```typescript
// Plugin update management
export class UpdateManager {
  private updateService: UpdateService;
  private versionManager: VersionManager;
  
  constructor() {
    this.updateService = new UpdateService();
    this.versionManager = new VersionManager();
  }
  
  async publishUpdate(
    pluginId: string, 
    updatePackage: UpdatePackage
  ): Promise<UpdateResult> {
    // Validate update
    const validation = await this.validateUpdate(pluginId, updatePackage);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Create update record
    const updateRecord = await this.createUpdateRecord(pluginId, updatePackage);
    
    // Distribute update
    const distribution = await this.distributeUpdate(updateRecord);
    
    // Notify users
    await this.notifyUsers(pluginId, updateRecord);
    
    return {
      success: true,
      updateId: updateRecord.id,
      version: updateRecord.version,
      distributionUrls: distribution.urls
    };
  }
  
  async checkForUpdates(installedPlugins: InstalledPlugin[]): Promise<AvailableUpdate[]> {
    const updates: AvailableUpdate[] = [];
    
    for (const plugin of installedPlugins) {
      const latestVersion = await this.getLatestVersion(plugin.id);
      
      if (this.versionManager.isNewer(latestVersion, plugin.version)) {
        const updateInfo = await this.getUpdateInfo(plugin.id, latestVersion);
        
        updates.push({
          pluginId: plugin.id,
          currentVersion: plugin.version,
          latestVersion: latestVersion,
          updateInfo: updateInfo,
          breaking: updateInfo.breaking,
          security: updateInfo.security
        });
      }
    }
    
    return updates;
  }
  
  async installUpdate(
    pluginId: string, 
    version: string, 
    options: UpdateOptions = {}
  ): Promise<InstallResult> {
    const updateInfo = await this.getUpdateInfo(pluginId, version);
    
    // Backup current version
    if (options.backup !== false) {
      await this.backupCurrentVersion(pluginId);
    }
    
    // Download update
    const downloadResult = await this.downloadUpdate(pluginId, version);
    if (!downloadResult.success) {
      return downloadResult;
    }
    
    // Install update
    try {
      const installResult = await this.performUpdate(
        pluginId, 
        downloadResult.packagePath!, 
        updateInfo
      );
      
      if (installResult.success) {
        // Update installation record
        await this.updateInstallationRecord(pluginId, version);
        
        // Clean up old versions if requested
        if (options.cleanup) {
          await this.cleanupOldVersions(pluginId, options.keepVersions || 3);
        }
      }
      
      return installResult;
    } catch (error) {
      // Rollback on failure
      if (options.rollbackOnFailure !== false) {
        await this.rollbackUpdate(pluginId);
      }
      
      return {
        success: false,
        errors: [`Update failed: ${error.message}`]
      };
    }
  }
  
  async createUpdateChannel(
    pluginId: string, 
    channel: UpdateChannel
  ): Promise<ChannelResult> {
    const channelConfig = {
      id: channel.name,
      pluginId: pluginId,
      name: channel.name,
      description: channel.description,
      stability: channel.stability,
      autoUpdate: channel.autoUpdate,
      rolloutStrategy: channel.rolloutStrategy
    };
    
    await this.updateService.createChannel(channelConfig);
    
    return {
      success: true,
      channelId: channelConfig.id,
      channelUrl: `https://updates.qirvo.ai/channels/${channelConfig.id}`
    };
  }
}

interface UpdatePackage {
  version: string;
  packagePath: string;
  releaseNotes: string;
  breaking: boolean;
  security: boolean;
  rolloutPercentage?: number;
}

interface UpdateChannel {
  name: string;
  description: string;
  stability: 'stable' | 'beta' | 'alpha';
  autoUpdate: boolean;
  rolloutStrategy: RolloutStrategy;
}

interface RolloutStrategy {
  type: 'immediate' | 'gradual' | 'scheduled';
  percentage?: number;
  schedule?: Date;
  duration?: number;
}
```

## Analytics & Monitoring

### Distribution Analytics

```typescript
// Distribution analytics and monitoring
export class DistributionAnalytics {
  private analytics: AnalyticsService;
  private monitor: DistributionMonitor;
  
  constructor() {
    this.analytics = new AnalyticsService();
    this.monitor = new DistributionMonitor();
  }
  
  async trackDistribution(
    pluginId: string, 
    event: DistributionEvent
  ): Promise<void> {
    await this.analytics.track({
      event: 'plugin_distribution',
      pluginId: pluginId,
      timestamp: new Date(),
      data: {
        channel: event.channel,
        version: event.version,
        userAgent: event.userAgent,
        location: event.location,
        source: event.source
      }
    });
  }
  
  async getDistributionMetrics(
    pluginId: string, 
    timeRange: TimeRange
  ): Promise<DistributionMetrics> {
    const metrics = await this.analytics.query({
      event: 'plugin_distribution',
      pluginId: pluginId,
      timeRange: timeRange
    });
    
    return {
      totalDownloads: metrics.totalEvents,
      uniqueUsers: metrics.uniqueUsers,
      downloadsByChannel: metrics.groupBy('channel'),
      downloadsByVersion: metrics.groupBy('version'),
      downloadsByLocation: metrics.groupBy('location'),
      conversionRate: await this.calculateConversionRate(pluginId, timeRange),
      retentionRate: await this.calculateRetentionRate(pluginId, timeRange)
    };
  }
  
  async generateDistributionReport(
    pluginId: string, 
    period: ReportPeriod
  ): Promise<DistributionReport> {
    const metrics = await this.getDistributionMetrics(pluginId, period.timeRange);
    const performance = await this.getPerformanceMetrics(pluginId, period.timeRange);
    const feedback = await this.getFeedbackMetrics(pluginId, period.timeRange);
    
    return {
      pluginId: pluginId,
      period: period,
      summary: {
        totalDownloads: metrics.totalDownloads,
        activeUsers: metrics.uniqueUsers,
        averageRating: feedback.averageRating,
        conversionRate: metrics.conversionRate
      },
      distribution: metrics,
      performance: performance,
      feedback: feedback,
      recommendations: await this.generateRecommendations(metrics, performance)
    };
  }
  
  private async generateRecommendations(
    metrics: DistributionMetrics, 
    performance: PerformanceMetrics
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (metrics.conversionRate < 0.1) {
      recommendations.push('Consider improving plugin description and screenshots');
    }
    
    if (performance.errorRate > 0.05) {
      recommendations.push('Address reported errors to improve user experience');
    }
    
    if (metrics.retentionRate < 0.5) {
      recommendations.push('Focus on user onboarding and engagement features');
    }
    
    return recommendations;
  }
}

interface DistributionEvent {
  channel: string;
  version: string;
  userAgent: string;
  location: string;
  source: string;
}

interface DistributionMetrics {
  totalDownloads: number;
  uniqueUsers: number;
  downloadsByChannel: Record<string, number>;
  downloadsByVersion: Record<string, number>;
  downloadsByLocation: Record<string, number>;
  conversionRate: number;
  retentionRate: number;
}
```

This comprehensive distribution guide provides all the tools and strategies needed for distributing Qirvo plugins across multiple channels, from marketplace publishing to enterprise deployment and update management.

---

**Next**: [Examples Overview](../examples/README.md)
