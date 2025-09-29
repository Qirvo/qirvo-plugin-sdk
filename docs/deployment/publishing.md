# Publishing to Qirvo Marketplace

This guide covers the complete process of publishing your plugin to the Qirvo marketplace, from preparation to post-publication maintenance.

## Table of Contents

- [Pre-Publication Checklist](#pre-publication-checklist)
- [Publishing Methods](#publishing-methods)
- [Marketplace Submission](#marketplace-submission)
- [Review Process](#review-process)
- [Plugin Approval](#plugin-approval)
- [Post-Publication](#post-publication)
- [Updates and Versioning](#updates-and-versioning)
- [Monetization](#monetization)

## Pre-Publication Checklist

### Code Quality
- [ ] **TypeScript Compilation**: No TypeScript errors
- [ ] **Linting**: Passes ESLint with project configuration
- [ ] **Testing**: All tests pass with >90% coverage
- [ ] **Security**: No security vulnerabilities in dependencies
- [ ] **Performance**: Plugin loads and runs efficiently

### Documentation
- [ ] **README**: Comprehensive installation and usage instructions
- [ ] **Changelog**: Detailed version history
- [ ] **API Documentation**: If plugin exposes APIs
- [ ] **Screenshots**: High-quality images showing plugin functionality
- [ ] **License**: Clear license file (MIT, Apache, GPL, etc.)

### Manifest Validation
- [ ] **Required Fields**: All required manifest fields present
- [ ] **Permissions**: Only necessary permissions requested
- [ ] **External Services**: All external APIs documented
- [ ] **Configuration Schema**: Valid JSON schema for user settings
- [ ] **Version**: Follows semantic versioning

### Testing
- [ ] **Local Testing**: Plugin works in development environment
- [ ] **Production Build**: Built version functions correctly
- [ ] **Cross-Platform**: Tested on different operating systems
- [ ] **Edge Cases**: Handles errors and edge cases gracefully
- [ ] **User Experience**: Intuitive and user-friendly interface

## Publishing Methods

### 1. Dashboard Upload (Recommended)

The easiest way to publish plugins is through the Qirvo dashboard:

#### Step 1: Build Your Plugin
```bash
# Clean previous builds
npm run clean

# Build for production
npm run build

# Create distribution package
npm pack
```

#### Step 2: Upload via Dashboard
1. Open [Qirvo Dashboard](https://app.qirvo.ai)
2. Navigate to **Plugins** → **Installed Plugins**
3. Click **"Upload Plugin"**
4. Select your `.tgz` file
5. Fill in marketplace information
6. Submit for review

#### Step 3: Configure Marketplace Listing
```json
{
  "marketplace": {
    "title": "Advanced Weather Widget",
    "shortDescription": "Beautiful weather display with forecasts",
    "longDescription": "A comprehensive weather widget that displays current conditions, 5-day forecasts, and severe weather alerts. Features multiple location support, customizable themes, and real-time updates.",
    "category": "productivity",
    "tags": ["weather", "forecast", "dashboard", "widget"],
    "screenshots": [
      "https://example.com/screenshot1.png",
      "https://example.com/screenshot2.png"
    ],
    "pricing": {
      "model": "free",
      "price": 0
    },
    "support": {
      "email": "support@example.com",
      "documentation": "https://docs.example.com",
      "issues": "https://github.com/user/plugin/issues"
    }
  }
}
```

### 2. CLI Upload

For automated deployments, use the Qirvo CLI:

```bash
# Install Qirvo CLI
npm install -g @qirvo/cli

# Login to your account
qirvo auth login

# Upload plugin
qirvo plugin publish ./my-plugin.tgz

# Upload with metadata
qirvo plugin publish ./my-plugin.tgz \
  --title "My Plugin" \
  --description "Plugin description" \
  --category "productivity" \
  --price 0
```

### 3. API Upload

For advanced integrations, use the Qirvo API:

```typescript
import { QirvoAPI } from '@qirvo/api-client';

const api = new QirvoAPI({
  token: process.env.QIRVO_API_TOKEN
});

async function publishPlugin() {
  const pluginData = await fs.readFile('./my-plugin.tgz');
  
  const result = await api.plugins.publish({
    file: pluginData,
    metadata: {
      title: 'My Plugin',
      description: 'Plugin description',
      category: 'productivity',
      tags: ['tag1', 'tag2'],
      pricing: { model: 'free', price: 0 }
    }
  });
  
  console.log('Plugin published:', result.id);
}
```

## Marketplace Submission

### Submission Form

When uploading through the dashboard, you'll need to provide:

#### Basic Information
- **Plugin Title**: Marketplace display name
- **Short Description**: One-line summary (max 100 characters)
- **Long Description**: Detailed description (max 2000 characters)
- **Category**: Primary category for organization
- **Tags**: Searchable keywords (max 10)

#### Media Assets
- **Icon**: 512x512px PNG with transparent background
- **Screenshots**: 1280x720px PNG showing key features (max 5)
- **Demo Video**: Optional MP4 demonstrating functionality
- **Banner**: 1920x480px promotional image

#### Technical Details
- **Supported Platforms**: Web, CLI, Mobile
- **Minimum Qirvo Version**: Required platform version
- **Dependencies**: External service requirements
- **Permissions**: Detailed permission explanations

#### Support Information
- **Support Email**: Contact for user support
- **Documentation URL**: Link to comprehensive docs
- **Source Code**: GitHub repository (optional but recommended)
- **Issue Tracker**: Bug report and feature request URL

### Pricing Configuration

#### Free Plugins
```json
{
  "pricing": {
    "model": "free",
    "price": 0
  }
}
```

#### Paid Plugins
```json
{
  "pricing": {
    "model": "one-time",
    "price": 999,
    "currency": "USD",
    "trial": {
      "enabled": true,
      "duration": 7
    }
  }
}
```

#### Subscription Plugins
```json
{
  "pricing": {
    "model": "subscription",
    "price": 299,
    "currency": "USD",
    "interval": "monthly",
    "trial": {
      "enabled": true,
      "duration": 14
    }
  }
}
```

## Review Process

### Automated Checks

All submissions undergo automated validation:

1. **Security Scan**: Vulnerability assessment
2. **Code Quality**: Static analysis and linting
3. **Performance Test**: Load time and resource usage
4. **Compatibility Check**: Platform version compatibility
5. **Manifest Validation**: Schema compliance

### Manual Review

Human reviewers evaluate:

1. **Functionality**: Plugin works as described
2. **User Experience**: Intuitive and polished interface
3. **Documentation**: Clear and comprehensive
4. **Security**: No malicious code or excessive permissions
5. **Compliance**: Follows Qirvo guidelines and policies

### Review Timeline

- **Automated Checks**: 5-15 minutes
- **Manual Review**: 1-3 business days
- **Revision Requests**: Additional 1-2 days per iteration
- **Final Approval**: Same day after all requirements met

### Common Rejection Reasons

1. **Security Issues**
   - Excessive permissions
   - Vulnerable dependencies
   - Malicious code patterns

2. **Quality Issues**
   - Poor user experience
   - Broken functionality
   - Incomplete documentation

3. **Policy Violations**
   - Inappropriate content
   - Copyright infringement
   - Spam or misleading information

4. **Technical Issues**
   - Build errors
   - Invalid manifest
   - Missing dependencies

## Plugin Approval

### Approval Notification

Upon approval, you'll receive:

1. **Email Notification**: Approval confirmation
2. **Plugin URL**: Direct link to marketplace listing
3. **Analytics Access**: Usage and download statistics
4. **Developer Dashboard**: Management interface

### Post-Approval Setup

#### Configure Analytics
```typescript
// Add analytics tracking to your plugin
import { QirvoAnalytics } from '@qirvo/plugin-sdk';

export default class MyPlugin extends BasePlugin {
  async onEnable(): Promise<void> {
    // Track plugin activation
    QirvoAnalytics.track('plugin_enabled', {
      pluginId: this.context.plugin.id,
      version: this.context.plugin.version
    });
  }
  
  async performAction(): Promise<void> {
    // Track feature usage
    QirvoAnalytics.track('feature_used', {
      feature: 'weather_refresh',
      userId: this.context.user?.id
    });
  }
}
```

#### Set Up Support Channels
1. **Support Email**: Monitor and respond to user inquiries
2. **Documentation**: Keep docs updated with latest features
3. **Issue Tracker**: Triage and fix reported bugs
4. **Community**: Engage with users in forums/Discord

## Post-Publication

### Monitoring

#### Analytics Dashboard
Track key metrics:
- **Downloads**: Total and daily download counts
- **Active Users**: Daily/monthly active users
- **Ratings**: User ratings and reviews
- **Revenue**: For paid plugins
- **Performance**: Load times and error rates

#### User Feedback
Monitor and respond to:
- **Reviews**: Marketplace ratings and comments
- **Support Requests**: Email and ticket system
- **Bug Reports**: GitHub issues or support system
- **Feature Requests**: User suggestions and ideas

### Marketing

#### Launch Strategy
1. **Announcement**: Blog post or social media
2. **Documentation**: Comprehensive guides and tutorials
3. **Community**: Share in relevant forums and groups
4. **Partnerships**: Collaborate with other developers

#### Ongoing Promotion
1. **Content Marketing**: Tutorials, use cases, tips
2. **Social Media**: Regular updates and engagement
3. **User Testimonials**: Showcase success stories
4. **Conference Talks**: Present at developer events

## Updates and Versioning

### Version Management

Follow semantic versioning (semver):
- **Major (1.0.0 → 2.0.0)**: Breaking changes
- **Minor (1.0.0 → 1.1.0)**: New features, backward compatible
- **Patch (1.0.0 → 1.0.1)**: Bug fixes, backward compatible

### Update Process

#### 1. Prepare Update
```bash
# Update version in package.json and manifest.json
npm version patch  # or minor/major

# Update changelog
echo "## [1.0.1] - $(date +%Y-%m-%d)" >> CHANGELOG.md
echo "### Fixed" >> CHANGELOG.md
echo "- Bug fix description" >> CHANGELOG.md

# Build and test
npm run build
npm test
```

#### 2. Submit Update
```bash
# Create new package
npm pack

# Upload via dashboard or CLI
qirvo plugin update ./my-plugin-1.0.1.tgz
```

#### 3. Update Documentation
- Update README with new features
- Refresh screenshots if UI changed
- Update API documentation
- Announce changes to users

### Migration Handling

For breaking changes, provide migration guides:

```typescript
export default class MyPlugin extends BasePlugin {
  async onUpdate(context: PluginRuntimeContext, oldVersion: string): Promise<void> {
    // Handle migration from v1 to v2
    if (this.isVersionLessThan(oldVersion, '2.0.0')) {
      await this.migrateFromV1ToV2();
    }
    
    // Handle migration from v2.0 to v2.1
    if (this.isVersionLessThan(oldVersion, '2.1.0')) {
      await this.migrateFromV20ToV21();
    }
  }
  
  private async migrateFromV1ToV2(): Promise<void> {
    // Migrate old configuration format
    const oldConfig = await this.getStorage('config');
    if (oldConfig) {
      const newConfig = this.transformConfigV1ToV2(oldConfig);
      await this.setStorage('config_v2', newConfig);
      await this.context.storage.delete('config');
    }
    
    this.log('info', 'Migrated plugin data from v1 to v2');
  }
}
```

## Monetization

### Pricing Strategies

#### Free with Premium Features
```json
{
  "pricing": {
    "model": "freemium",
    "tiers": [
      {
        "name": "Basic",
        "price": 0,
        "features": ["basic_weather", "single_location"]
      },
      {
        "name": "Pro",
        "price": 499,
        "features": ["advanced_forecasts", "multiple_locations", "alerts"]
      }
    ]
  }
}
```

#### Subscription Model
```json
{
  "pricing": {
    "model": "subscription",
    "plans": [
      {
        "name": "Monthly",
        "price": 299,
        "interval": "monthly"
      },
      {
        "name": "Annual",
        "price": 2999,
        "interval": "yearly",
        "discount": 17
      }
    ]
  }
}
```

### Revenue Optimization

1. **Free Trial**: Offer 7-14 day free trials
2. **Feature Gating**: Limit advanced features to paid tiers
3. **Usage Limits**: Restrict API calls or data storage
4. **Support Tiers**: Premium support for paid users
5. **Analytics**: Track conversion funnels and optimize

### Payment Integration

```typescript
import { QirvoPayments } from '@qirvo/plugin-sdk';

export default class PaidPlugin extends BasePlugin {
  async checkLicense(): Promise<boolean> {
    const license = await QirvoPayments.getLicense(this.context.plugin.id);
    return license && license.active;
  }
  
  async onEnable(): Promise<void> {
    const hasLicense = await this.checkLicense();
    
    if (!hasLicense) {
      await this.showUpgradePrompt();
      return;
    }
    
    // Enable full functionality
    await this.enablePremiumFeatures();
  }
  
  private async showUpgradePrompt(): Promise<void> {
    await this.notify(
      'Premium Feature',
      'This feature requires a Pro license. Click to upgrade.',
      'info'
    );
  }
}
```

## Best Practices

### Development
1. **Version Control**: Use Git with semantic commits
2. **Testing**: Comprehensive test coverage
3. **Documentation**: Keep docs updated with code
4. **Security**: Regular dependency updates
5. **Performance**: Monitor and optimize resource usage

### Marketing
1. **Clear Value Proposition**: Explain benefits clearly
2. **Quality Screenshots**: Show plugin in action
3. **User Testimonials**: Social proof builds trust
4. **SEO Optimization**: Use relevant keywords
5. **Community Engagement**: Be active in forums

### Support
1. **Responsive Support**: Reply to inquiries quickly
2. **Comprehensive FAQ**: Address common questions
3. **Video Tutorials**: Visual learning aids
4. **Regular Updates**: Fix bugs and add features
5. **User Feedback**: Listen and implement suggestions

---

**Next**: [Version Management](./versioning.md) for detailed versioning strategies.
