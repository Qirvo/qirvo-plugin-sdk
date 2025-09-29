# Marketplace Integration

This guide covers advanced marketplace features, including plugin publishing, monetization, analytics, and marketplace API integration.

## Table of Contents

- [Marketplace API](#marketplace-api)
- [Plugin Publishing](#plugin-publishing)
- [Monetization](#monetization)
- [Analytics Integration](#analytics-integration)
- [Review System](#review-system)
- [Update Management](#update-management)

## Marketplace API

### API Client

```typescript
// Marketplace API client for plugin developers
export class QirvoMarketplaceAPI {
  private apiKey: string;
  private baseUrl: string;
  private httpClient: HttpClient;
  
  constructor(apiKey: string, environment: 'development' | 'production' = 'production') {
    this.apiKey = apiKey;
    this.baseUrl = environment === 'production' 
      ? 'https://api.qirvo.ai/marketplace'
      : 'https://api-dev.qirvo.ai/marketplace';
    this.httpClient = new HttpClient(this.baseUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  // Plugin management
  async publishPlugin(pluginData: PluginSubmission): Promise<PublishResult> {
    const formData = new FormData();
    
    // Add plugin package
    formData.append('package', pluginData.packageFile);
    
    // Add metadata
    formData.append('metadata', JSON.stringify({
      name: pluginData.name,
      description: pluginData.description,
      version: pluginData.version,
      category: pluginData.category,
      tags: pluginData.tags,
      pricing: pluginData.pricing,
      screenshots: pluginData.screenshots,
      changelog: pluginData.changelog
    }));
    
    const response = await this.httpClient.post('/plugins', formData);
    
    return {
      success: response.success,
      pluginId: response.pluginId,
      status: response.status,
      reviewUrl: response.reviewUrl,
      estimatedReviewTime: response.estimatedReviewTime
    };
  }
  
  async updatePlugin(
    pluginId: string, 
    updateData: PluginUpdate
  ): Promise<UpdateResult> {
    const response = await this.httpClient.put(`/plugins/${pluginId}`, updateData);
    
    return {
      success: response.success,
      version: response.version,
      status: response.status,
      changelog: response.changelog
    };
  }
  
  async getPluginStats(pluginId: string): Promise<PluginStats> {
    const response = await this.httpClient.get(`/plugins/${pluginId}/stats`);
    
    return {
      downloads: response.downloads,
      activeInstalls: response.activeInstalls,
      ratings: response.ratings,
      revenue: response.revenue,
      usage: response.usage
    };
  }
  
  // Marketplace discovery
  async searchPlugins(query: SearchQuery): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: query.query || '',
      category: query.category || '',
      tags: query.tags?.join(',') || '',
      pricing: query.pricing || '',
      sort: query.sort || 'relevance',
      limit: query.limit?.toString() || '20',
      offset: query.offset?.toString() || '0'
    });
    
    const response = await this.httpClient.get(`/search?${params}`);
    
    return {
      plugins: response.plugins,
      total: response.total,
      facets: response.facets,
      suggestions: response.suggestions
    };
  }
  
  async getFeaturedPlugins(): Promise<FeaturedPlugin[]> {
    const response = await this.httpClient.get('/featured');
    return response.plugins;
  }
  
  async getPluginDetails(pluginId: string): Promise<PluginDetails> {
    const response = await this.httpClient.get(`/plugins/${pluginId}`);
    
    return {
      id: response.id,
      name: response.name,
      description: response.description,
      version: response.version,
      author: response.author,
      category: response.category,
      tags: response.tags,
      pricing: response.pricing,
      screenshots: response.screenshots,
      changelog: response.changelog,
      ratings: response.ratings,
      downloads: response.downloads,
      lastUpdated: response.lastUpdated
    };
  }
}

interface PluginSubmission {
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  pricing: PricingInfo;
  packageFile: File;
  screenshots: string[];
  changelog: string;
}

interface PricingInfo {
  type: 'free' | 'paid' | 'freemium';
  price?: number;
  currency?: string;
  subscription?: boolean;
  trialDays?: number;
}
```

## Plugin Publishing

### Publishing Workflow

```typescript
// Automated publishing workflow
export class PluginPublisher {
  private api: QirvoMarketplaceAPI;
  private validator: PluginValidator;
  private packager: PluginPackager;
  
  constructor(apiKey: string) {
    this.api = new QirvoMarketplaceAPI(apiKey);
    this.validator = new PluginValidator();
    this.packager = new PluginPackager();
  }
  
  async publishFromSource(
    sourcePath: string,
    publishConfig: PublishConfig
  ): Promise<PublishResult> {
    console.log('🚀 Starting plugin publishing workflow...');
    
    // Step 1: Validate plugin
    console.log('📋 Validating plugin...');
    const validation = await this.validator.validatePlugin(sourcePath);
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Step 2: Build plugin
    console.log('🔨 Building plugin...');
    const buildResult = await this.buildPlugin(sourcePath, publishConfig);
    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.error}`);
    }
    
    // Step 3: Package plugin
    console.log('📦 Packaging plugin...');
    const packagePath = await this.packager.createPackage(buildResult.outputPath);
    
    // Step 4: Upload to marketplace
    console.log('⬆️ Uploading to marketplace...');
    const submission: PluginSubmission = {
      name: publishConfig.name,
      description: publishConfig.description,
      version: publishConfig.version,
      category: publishConfig.category,
      tags: publishConfig.tags,
      pricing: publishConfig.pricing,
      packageFile: new File([fs.readFileSync(packagePath)], 'plugin.zip'),
      screenshots: publishConfig.screenshots,
      changelog: publishConfig.changelog
    };
    
    const result = await this.api.publishPlugin(submission);
    
    // Step 5: Setup analytics
    if (result.success) {
      await this.setupAnalytics(result.pluginId!, publishConfig);
    }
    
    console.log('✅ Plugin published successfully!');
    return result;
  }
  
  async updatePlugin(
    pluginId: string,
    sourcePath: string,
    updateConfig: UpdateConfig
  ): Promise<UpdateResult> {
    // Build new version
    const buildResult = await this.buildPlugin(sourcePath, updateConfig);
    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.error}`);
    }
    
    // Package new version
    const packagePath = await this.packager.createPackage(buildResult.outputPath);
    
    // Upload update
    const updateData: PluginUpdate = {
      version: updateConfig.version,
      changelog: updateConfig.changelog,
      breaking: updateConfig.breaking || false,
      packageFile: new File([fs.readFileSync(packagePath)], 'plugin.zip')
    };
    
    return this.api.updatePlugin(pluginId, updateData);
  }
  
  private async buildPlugin(
    sourcePath: string,
    config: PublishConfig | UpdateConfig
  ): Promise<BuildResult> {
    const builder = new PluginBuilder(sourcePath);
    
    return builder.build({
      mode: 'production',
      optimization: true,
      minify: true,
      sourceMap: false,
      outputPath: path.join(sourcePath, 'dist')
    });
  }
  
  private async setupAnalytics(
    pluginId: string,
    config: PublishConfig
  ): Promise<void> {
    if (config.analytics?.enabled) {
      const analytics = new PluginAnalytics(pluginId, this.api);
      await analytics.initialize();
    }
  }
}

interface PublishConfig {
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  pricing: PricingInfo;
  screenshots: string[];
  changelog: string;
  analytics?: {
    enabled: boolean;
    events?: string[];
  };
}
```

## Monetization

### Payment Integration

```typescript
// Payment and monetization system
export class PluginMonetization {
  private stripeClient: Stripe;
  private api: QirvoMarketplaceAPI;
  
  constructor(stripeSecretKey: string, marketplaceApiKey: string) {
    this.stripeClient = new Stripe(stripeSecretKey);
    this.api = new QirvoMarketplaceAPI(marketplaceApiKey);
  }
  
  async setupPaidPlugin(
    pluginId: string,
    pricingConfig: PricingConfiguration
  ): Promise<MonetizationSetup> {
    // Create Stripe product
    const product = await this.stripeClient.products.create({
      name: pricingConfig.name,
      description: pricingConfig.description,
      metadata: {
        pluginId: pluginId,
        type: 'qirvo-plugin'
      }
    });
    
    // Create pricing plans
    const prices = await Promise.all(
      pricingConfig.plans.map(plan => 
        this.stripeClient.prices.create({
          product: product.id,
          unit_amount: plan.amount,
          currency: plan.currency,
          recurring: plan.recurring ? {
            interval: plan.interval,
            interval_count: plan.intervalCount
          } : undefined,
          metadata: {
            planName: plan.name,
            features: JSON.stringify(plan.features)
          }
        })
      )
    );
    
    // Register with marketplace
    await this.api.updatePlugin(pluginId, {
      pricing: {
        type: 'paid',
        stripeProductId: product.id,
        plans: prices.map(price => ({
          id: price.id,
          name: price.metadata.planName,
          amount: price.unit_amount!,
          currency: price.currency,
          interval: price.recurring?.interval,
          features: JSON.parse(price.metadata.features || '[]')
        }))
      }
    });
    
    return {
      productId: product.id,
      priceIds: prices.map(p => p.id),
      webhookEndpoint: await this.setupWebhooks(pluginId)
    };
  }
  
  async createCheckoutSession(
    pluginId: string,
    priceId: string,
    customerId?: string
  ): Promise<CheckoutSession> {
    const session = await this.stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      customer: customerId,
      success_url: `https://app.qirvo.ai/plugins/${pluginId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://app.qirvo.ai/plugins/${pluginId}`,
      metadata: {
        pluginId: pluginId
      }
    });
    
    return {
      sessionId: session.id,
      url: session.url!
    };
  }
  
  async handleWebhook(
    payload: string,
    signature: string,
    endpointSecret: string
  ): Promise<void> {
    const event = this.stripeClient.webhooks.constructEvent(
      payload,
      signature,
      endpointSecret
    );
    
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleSuccessfulPayment(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'invoice.payment_succeeded':
        await this.handleSubscriptionPayment(event.data.object as Stripe.Invoice);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
    }
  }
  
  private async handleSuccessfulPayment(session: Stripe.Checkout.Session): Promise<void> {
    const pluginId = session.metadata?.pluginId;
    if (!pluginId) return;
    
    // Grant plugin access to customer
    await this.api.grantPluginAccess(pluginId, session.customer as string);
    
    // Track conversion
    await this.api.trackEvent(pluginId, 'purchase_completed', {
      sessionId: session.id,
      amount: session.amount_total,
      currency: session.currency
    });
  }
}

interface PricingConfiguration {
  name: string;
  description: string;
  plans: PricingPlan[];
}

interface PricingPlan {
  name: string;
  amount: number;
  currency: string;
  recurring?: boolean;
  interval?: 'month' | 'year';
  intervalCount?: number;
  features: string[];
}
```

## Analytics Integration

### Plugin Analytics

```typescript
// Analytics system for plugin performance tracking
export class PluginAnalytics {
  private pluginId: string;
  private api: QirvoMarketplaceAPI;
  private eventQueue: AnalyticsEvent[] = [];
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  
  constructor(pluginId: string, api: QirvoMarketplaceAPI) {
    this.pluginId = pluginId;
    this.api = api;
    this.startBatchProcessor();
  }
  
  // Usage tracking
  trackUsage(action: string, properties?: Record<string, any>): void {
    this.queueEvent({
      type: 'usage',
      action,
      properties,
      timestamp: Date.now(),
      sessionId: this.getSessionId()
    });
  }
  
  // Performance tracking
  trackPerformance(metric: string, value: number, unit: string): void {
    this.queueEvent({
      type: 'performance',
      metric,
      value,
      unit,
      timestamp: Date.now()
    });
  }
  
  // Error tracking
  trackError(error: Error, context?: Record<string, any>): void {
    this.queueEvent({
      type: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    });
  }
  
  // Custom events
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    this.queueEvent({
      type: 'custom',
      eventName,
      properties,
      timestamp: Date.now()
    });
  }
  
  // User journey tracking
  trackUserJourney(step: string, metadata?: Record<string, any>): void {
    this.queueEvent({
      type: 'journey',
      step,
      metadata,
      timestamp: Date.now(),
      sessionId: this.getSessionId()
    });
  }
  
  private queueEvent(event: AnalyticsEvent): void {
    this.eventQueue.push({
      ...event,
      pluginId: this.pluginId,
      userId: this.getUserId(),
      deviceId: this.getDeviceId()
    });
    
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }
  
  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }
  
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      await this.api.sendAnalytics(this.pluginId, events);
    } catch (error) {
      console.error('Failed to send analytics:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...events);
    }
  }
  
  // Analytics dashboard data
  async getDashboardData(timeRange: TimeRange): Promise<AnalyticsDashboard> {
    const stats = await this.api.getPluginStats(this.pluginId);
    
    return {
      overview: {
        totalUsers: stats.activeInstalls,
        totalSessions: stats.usage.sessions,
        averageSessionDuration: stats.usage.averageSessionDuration,
        retentionRate: stats.usage.retentionRate
      },
      usage: {
        dailyActiveUsers: stats.usage.dailyActive,
        weeklyActiveUsers: stats.usage.weeklyActive,
        monthlyActiveUsers: stats.usage.monthlyActive,
        topFeatures: stats.usage.topFeatures
      },
      performance: {
        averageLoadTime: stats.performance.averageLoadTime,
        errorRate: stats.performance.errorRate,
        crashRate: stats.performance.crashRate
      },
      revenue: stats.revenue ? {
        totalRevenue: stats.revenue.total,
        monthlyRecurringRevenue: stats.revenue.mrr,
        averageRevenuePerUser: stats.revenue.arpu,
        conversionRate: stats.revenue.conversionRate
      } : undefined
    };
  }
}

interface AnalyticsEvent {
  type: 'usage' | 'performance' | 'error' | 'custom' | 'journey';
  timestamp: number;
  pluginId?: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  [key: string]: any;
}

interface AnalyticsDashboard {
  overview: OverviewMetrics;
  usage: UsageMetrics;
  performance: PerformanceMetrics;
  revenue?: RevenueMetrics;
}
```

## Review System

### Plugin Review Management

```typescript
// Plugin review and rating system
export class PluginReviewSystem {
  private api: QirvoMarketplaceAPI;
  private moderationService: ReviewModerationService;
  private notificationService: NotificationService;
  
  constructor(api: QirvoMarketplaceAPI) {
    this.api = api;
    this.moderationService = new ReviewModerationService();
    this.notificationService = new NotificationService();
  }
  
  async submitReview(
    pluginId: string,
    review: ReviewSubmission
  ): Promise<ReviewResult> {
    // Validate review content
    const validation = await this.validateReview(review);
    if (!validation.valid) {
      throw new Error(`Review validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Check for spam/abuse
    const moderationResult = await this.moderationService.moderateReview(review);
    if (moderationResult.flagged) {
      return {
        success: false,
        reviewId: null,
        status: 'flagged',
        reason: moderationResult.reason,
        requiresManualReview: true
      };
    }
    
    // Submit review
    const response = await this.api.submitReview(pluginId, {
      rating: review.rating,
      title: review.title,
      content: review.content,
      pros: review.pros,
      cons: review.cons,
      wouldRecommend: review.wouldRecommend,
      usageContext: review.usageContext,
      version: review.version
    });
    
    // Notify plugin developer
    if (response.success) {
      await this.notificationService.notifyDeveloper(pluginId, 'new_review', {
        reviewId: response.reviewId,
        rating: review.rating,
        title: review.title
      });
    }
    
    return response;
  }
  
  async getReviews(
    pluginId: string,
    options: ReviewQueryOptions = {}
  ): Promise<ReviewsResponse> {
    const params = {
      pluginId,
      page: options.page || 1,
      limit: options.limit || 20,
      sortBy: options.sortBy || 'helpful',
      filterBy: options.filterBy,
      minRating: options.minRating,
      maxRating: options.maxRating,
      verified: options.verifiedOnly
    };
    
    const response = await this.api.getReviews(params);
    
    return {
      reviews: response.reviews.map(review => ({
        ...review,
        helpfulVotes: review.votes?.helpful || 0,
        totalVotes: (review.votes?.helpful || 0) + (review.votes?.unhelpful || 0)
      })),
      pagination: response.pagination,
      summary: response.summary
    };
  }
  
  async voteOnReview(
    reviewId: string,
    vote: 'helpful' | 'unhelpful'
  ): Promise<VoteResult> {
    return this.api.voteOnReview(reviewId, vote);
  }
  
  async reportReview(
    reviewId: string,
    reason: ReportReason,
    details?: string
  ): Promise<ReportResult> {
    const report = {
      reviewId,
      reason,
      details,
      timestamp: Date.now()
    };
    
    // Submit report
    const result = await this.api.reportReview(report);
    
    // Trigger moderation if threshold reached
    if (result.reportCount >= 3) {
      await this.moderationService.flagForReview(reviewId, 'multiple_reports');
    }
    
    return result;
  }
  
  private async validateReview(review: ReviewSubmission): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Rating validation
    if (review.rating < 1 || review.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }
    
    // Content validation
    if (!review.content || review.content.trim().length < 10) {
      errors.push('Review content must be at least 10 characters');
    }
    
    if (review.content && review.content.length > 5000) {
      errors.push('Review content must be less than 5000 characters');
    }
    
    // Title validation
    if (review.title && review.title.length > 100) {
      errors.push('Review title must be less than 100 characters');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Review moderation service
export class ReviewModerationService {
  private spamDetector: SpamDetector;
  private sentimentAnalyzer: SentimentAnalyzer;
  private profanityFilter: ProfanityFilter;
  
  constructor() {
    this.spamDetector = new SpamDetector();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.profanityFilter = new ProfanityFilter();
  }
  
  async moderateReview(review: ReviewSubmission): Promise<ModerationResult> {
    const flags: string[] = [];
    
    // Spam detection
    if (await this.spamDetector.isSpam(review.content)) {
      flags.push('spam');
    }
    
    // Profanity detection
    if (this.profanityFilter.containsProfanity(review.content)) {
      flags.push('profanity');
    }
    
    // Sentiment analysis for fake reviews
    const sentiment = await this.sentimentAnalyzer.analyze(review.content);
    if (sentiment.confidence < 0.3) {
      flags.push('suspicious_sentiment');
    }
    
    // Length-based spam detection
    if (review.content.length < 5 || this.isRepeatedContent(review.content)) {
      flags.push('low_quality');
    }
    
    return {
      flagged: flags.length > 0,
      flags,
      reason: flags.length > 0 ? `Flagged for: ${flags.join(', ')}` : undefined,
      confidence: this.calculateConfidence(flags)
    };
  }
  
  private isRepeatedContent(content: string): boolean {
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    return uniqueWords.size / words.length < 0.3; // Less than 30% unique words
  }
  
  private calculateConfidence(flags: string[]): number {
    if (flags.length === 0) return 1.0;
    
    const weights = {
      spam: 0.9,
      profanity: 0.8,
      suspicious_sentiment: 0.6,
      low_quality: 0.4
    };
    
    const totalWeight = flags.reduce((sum, flag) => sum + (weights[flag] || 0.5), 0);
    return Math.min(totalWeight / flags.length, 1.0);
  }
  
  async flagForReview(reviewId: string, reason: string): Promise<void> {
    // Implementation to flag review for manual moderation
    console.log(`Review ${reviewId} flagged for manual review: ${reason}`);
  }
}

// Review aggregation and statistics
export class ReviewAggregator {
  async calculatePluginRating(pluginId: string): Promise<RatingStatistics> {
    const reviews = await this.getAllReviews(pluginId);
    
    const stats: RatingStatistics = {
      averageRating: 0,
      totalReviews: reviews.length,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      verifiedReviews: 0,
      recommendationRate: 0
    };
    
    if (reviews.length === 0) {
      return stats;
    }
    
    // Calculate statistics
    let totalRating = 0;
    let recommendCount = 0;
    
    reviews.forEach(review => {
      totalRating += review.rating;
      stats.ratingDistribution[review.rating]++;
      
      if (review.verified) {
        stats.verifiedReviews++;
      }
      
      if (review.wouldRecommend) {
        recommendCount++;
      }
    });
    
    stats.averageRating = totalRating / reviews.length;
    stats.recommendationRate = recommendCount / reviews.length;
    
    return stats;
  }
  
  private async getAllReviews(pluginId: string): Promise<Review[]> {
    // Implementation to fetch all reviews for a plugin
    return [];
  }
}

interface ReviewSubmission {
  rating: number;
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend?: boolean;
  usageContext?: string;
  version?: string;
}

interface ReviewResult {
  success: boolean;
  reviewId: string | null;
  status: 'approved' | 'flagged' | 'rejected';
  reason?: string;
  requiresManualReview?: boolean;
}

interface Review {
  id: string;
  userId: string;
  rating: number;
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend?: boolean;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  votes?: {
    helpful: number;
    unhelpful: number;
  };
}

interface RatingStatistics {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  verifiedReviews: number;
  recommendationRate: number;
}

type ReportReason = 'spam' | 'inappropriate' | 'fake' | 'offensive' | 'other';
```

## Update Management

### Plugin Update System

```typescript
// Plugin update management system
export class PluginUpdateManager {
  private api: QirvoMarketplaceAPI;
  private versionManager: VersionManager;
  private rolloutManager: RolloutManager;
  private notificationService: NotificationService;
  
  constructor(api: QirvoMarketplaceAPI) {
    this.api = api;
    this.versionManager = new VersionManager();
    this.rolloutManager = new RolloutManager();
    this.notificationService = new NotificationService();
  }
  
  async publishUpdate(
    pluginId: string,
    updateData: PluginUpdateData
  ): Promise<UpdatePublishResult> {
    // Validate update
    const validation = await this.validateUpdate(pluginId, updateData);
    if (!validation.valid) {
      throw new Error(`Update validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Create update package
    const updatePackage = await this.createUpdatePackage(updateData);
    
    // Determine rollout strategy
    const rolloutStrategy = this.determineRolloutStrategy(updateData);
    
    // Publish update
    const result = await this.api.publishUpdate(pluginId, {
      version: updateData.version,
      changelog: updateData.changelog,
      breaking: updateData.breaking,
      security: updateData.security,
      rolloutStrategy,
      package: updatePackage
    });
    
    if (result.success) {
      // Start rollout process
      await this.rolloutManager.startRollout(pluginId, result.updateId, rolloutStrategy);
      
      // Notify users if critical update
      if (updateData.security || updateData.critical) {
        await this.notifyUsers(pluginId, updateData);
      }
    }
    
    return result;
  }
  
  async checkForUpdates(
    installedPlugins: InstalledPlugin[]
  ): Promise<AvailableUpdate[]> {
    const updates: AvailableUpdate[] = [];
    
    for (const plugin of installedPlugins) {
      const latestVersion = await this.api.getLatestVersion(plugin.id);
      
      if (this.versionManager.isNewer(latestVersion.version, plugin.version)) {
        const updateInfo = await this.api.getUpdateInfo(plugin.id, latestVersion.version);
        
        updates.push({
          pluginId: plugin.id,
          currentVersion: plugin.version,
          latestVersion: latestVersion.version,
          changelog: updateInfo.changelog,
          breaking: updateInfo.breaking,
          security: updateInfo.security,
          size: updateInfo.size,
          releaseDate: updateInfo.releaseDate,
          rolloutPercentage: updateInfo.rolloutPercentage
        });
      }
    }
    
    return updates;
  }
  
  async installUpdate(
    pluginId: string,
    version: string,
    options: UpdateInstallOptions = {}
  ): Promise<UpdateInstallResult> {
    try {
      // Check if update is available for this user
      const rolloutStatus = await this.rolloutManager.checkRolloutStatus(pluginId, version);
      if (!rolloutStatus.available && !options.force) {
        return {
          success: false,
          error: 'Update not yet available for your account',
          retryAfter: rolloutStatus.retryAfter
        };
      }
      
      // Download update
      const updatePackage = await this.api.downloadUpdate(pluginId, version);
      
      // Create backup
      const backupPath = options.createBackup ? 
        await this.createBackup(pluginId) : null;
      
      // Install update
      const installResult = await this.installUpdatePackage(
        pluginId, 
        updatePackage, 
        options
      );
      
      if (installResult.success) {
        // Update installation record
        await this.api.recordInstallation(pluginId, version);
        
        // Clean up backup if successful and not needed
        if (backupPath && !options.keepBackup) {
          await this.cleanupBackup(backupPath);
        }
      } else if (backupPath) {
        // Restore from backup on failure
        await this.restoreFromBackup(pluginId, backupPath);
      }
      
      return installResult;
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  private determineRolloutStrategy(updateData: PluginUpdateData): RolloutStrategy {
    // Critical security updates: immediate full rollout
    if (updateData.security && updateData.critical) {
      return {
        type: 'immediate',
        percentage: 100,
        duration: 0
      };
    }
    
    // Breaking changes: gradual rollout
    if (updateData.breaking) {
      return {
        type: 'gradual',
        percentage: 10,
        duration: 7 * 24 * 60 * 60 * 1000, // 7 days
        stages: [
          { percentage: 10, duration: 24 * 60 * 60 * 1000 }, // 10% for 1 day
          { percentage: 25, duration: 48 * 60 * 60 * 1000 }, // 25% for 2 days
          { percentage: 50, duration: 72 * 60 * 60 * 1000 }, // 50% for 3 days
          { percentage: 100, duration: 24 * 60 * 60 * 1000 }  // 100% for 1 day
        ]
      };
    }
    
    // Regular updates: standard rollout
    return {
      type: 'standard',
      percentage: 50,
      duration: 3 * 24 * 60 * 60 * 1000, // 3 days
      stages: [
        { percentage: 50, duration: 48 * 60 * 60 * 1000 }, // 50% for 2 days
        { percentage: 100, duration: 24 * 60 * 60 * 1000 }  // 100% for 1 day
      ]
    };
  }
  
  private async validateUpdate(
    pluginId: string,
    updateData: PluginUpdateData
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Version validation
    if (!this.versionManager.isValidVersion(updateData.version)) {
      errors.push('Invalid version format');
    }
    
    // Check if version already exists
    const existingVersions = await this.api.getPluginVersions(pluginId);
    if (existingVersions.includes(updateData.version)) {
      errors.push('Version already exists');
    }
    
    // Changelog validation
    if (!updateData.changelog || updateData.changelog.trim().length < 10) {
      errors.push('Changelog must be at least 10 characters');
    }
    
    // Package validation
    if (!updateData.packagePath || !await this.fileExists(updateData.packagePath)) {
      errors.push('Update package file not found');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private async createUpdatePackage(updateData: PluginUpdateData): Promise<UpdatePackage> {
    // Implementation to create and validate update package
    return {
      path: updateData.packagePath,
      size: await this.getFileSize(updateData.packagePath),
      checksum: await this.calculateChecksum(updateData.packagePath)
    };
  }
  
  private async notifyUsers(pluginId: string, updateData: PluginUpdateData): Promise<void> {
    const users = await this.api.getPluginUsers(pluginId);
    
    const notification = {
      type: updateData.security ? 'security_update' : 'plugin_update',
      title: `${updateData.security ? 'Security ' : ''}Update Available`,
      message: `A new ${updateData.security ? 'security ' : ''}update is available for your plugin.`,
      pluginId,
      version: updateData.version,
      changelog: updateData.changelog,
      priority: updateData.security ? 'high' : 'normal'
    };
    
    await this.notificationService.sendBulkNotification(users, notification);
  }
  
  private async fileExists(path: string): Promise<boolean> {
    // Implementation to check if file exists
    return true;
  }
  
  private async getFileSize(path: string): Promise<number> {
    // Implementation to get file size
    return 0;
  }
  
  private async calculateChecksum(path: string): Promise<string> {
    // Implementation to calculate file checksum
    return '';
  }
}

// Rollout management
export class RolloutManager {
  private rollouts: Map<string, ActiveRollout> = new Map();
  
  async startRollout(
    pluginId: string,
    updateId: string,
    strategy: RolloutStrategy
  ): Promise<void> {
    const rollout: ActiveRollout = {
      pluginId,
      updateId,
      strategy,
      startTime: Date.now(),
      currentStage: 0,
      usersInRollout: new Set()
    };
    
    this.rollouts.set(`${pluginId}:${updateId}`, rollout);
    
    // Start first stage
    await this.advanceRolloutStage(rollout);
  }
  
  async checkRolloutStatus(
    pluginId: string,
    version: string
  ): Promise<RolloutStatus> {
    const rolloutKey = `${pluginId}:${version}`;
    const rollout = this.rollouts.get(rolloutKey);
    
    if (!rollout) {
      return { available: false, reason: 'No active rollout' };
    }
    
    const userId = this.getCurrentUserId();
    
    if (rollout.usersInRollout.has(userId)) {
      return { available: true };
    }
    
    // Check if user should be included in current stage
    const shouldInclude = await this.shouldIncludeUser(rollout, userId);
    
    if (shouldInclude) {
      rollout.usersInRollout.add(userId);
      return { available: true };
    }
    
    return {
      available: false,
      reason: 'Not in current rollout stage',
      retryAfter: this.getNextStageTime(rollout)
    };
  }
  
  private async shouldIncludeUser(rollout: ActiveRollout, userId: string): Promise<boolean> {
    const currentStage = rollout.strategy.stages?.[rollout.currentStage];
    if (!currentStage) {
      return rollout.strategy.percentage >= 100;
    }
    
    // Use consistent hashing to determine if user should be included
    const hash = this.hashUserId(userId + rollout.pluginId);
    const threshold = (currentStage.percentage / 100) * 0xFFFFFFFF;
    
    return hash <= threshold;
  }
  
  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  private getCurrentUserId(): string {
    // Implementation to get current user ID
    return 'user-123';
  }
  
  private async advanceRolloutStage(rollout: ActiveRollout): Promise<void> {
    // Implementation to advance rollout to next stage
  }
  
  private getNextStageTime(rollout: ActiveRollout): number {
    // Implementation to calculate when next stage starts
    return Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  }
}

interface PluginUpdateData {
  version: string;
  changelog: string;
  breaking: boolean;
  security: boolean;
  critical?: boolean;
  packagePath: string;
}

interface RolloutStrategy {
  type: 'immediate' | 'gradual' | 'standard';
  percentage: number;
  duration: number;
  stages?: Array<{
    percentage: number;
    duration: number;
  }>;
}

interface ActiveRollout {
  pluginId: string;
  updateId: string;
  strategy: RolloutStrategy;
  startTime: number;
  currentStage: number;
  usersInRollout: Set<string>;
}

interface AvailableUpdate {
  pluginId: string;
  currentVersion: string;
  latestVersion: string;
  changelog: string;
  breaking: boolean;
  security: boolean;
  size: number;
  releaseDate: Date;
  rolloutPercentage: number;
}

interface UpdateInstallOptions {
  force?: boolean;
  createBackup?: boolean;
  keepBackup?: boolean;
  skipValidation?: boolean;
}

interface UpdateInstallResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

interface RolloutStatus {
  available: boolean;
  reason?: string;
  retryAfter?: number;
}
```

This comprehensive marketplace integration system now includes complete review management with moderation, spam detection, and rating aggregation, plus a sophisticated update management system with gradual rollouts, security updates, and automatic backup/restore capabilities.

---

**Next**: [Plugin Analytics](./analytics.md)
