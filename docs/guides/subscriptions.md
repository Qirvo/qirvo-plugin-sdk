# Subscriptions

This guide covers subscription management, paid plugin licensing, and billing integration for the Qirvo Plugin SDK ecosystem.

## Table of Contents

- [Overview](#overview)
- [Plugin Pricing Models](#plugin-pricing-models)
- [License Management](#license-management)
- [Stripe Integration](#stripe-integration)
- [Subscription Lifecycle](#subscription-lifecycle)
- [License Validation](#license-validation)
- [Revenue Sharing](#revenue-sharing)

## Overview

The Qirvo plugin ecosystem supports both free and paid plugins through a comprehensive subscription and licensing system. Plugin developers can monetize their plugins while users get access to premium features and support.

### Subscription Types

```typescript
// Subscription types supported
export enum SubscriptionType {
  FREE = 'free',
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ENTERPRISE = 'enterprise'
}

export interface PluginSubscription {
  pluginId: string;
  userId: string;
  type: SubscriptionType;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: Date;
  endDate?: Date;
  licenseKey: string;
  features: string[];
  metadata: Record<string, any>;
}
```

## Plugin Pricing Models

### Free Plugins

Free plugins are available to all users without restrictions:

```json
// plugin.json for free plugin
{
  "name": "weather-widget",
  "version": "1.0.0",
  "pricing": {
    "type": "free"
  },
  "permissions": ["network-access"]
}
```

### Paid Plugins

Paid plugins require purchase or subscription:

```json
// plugin.json for paid plugin
{
  "name": "advanced-analytics",
  "version": "2.1.0",
  "pricing": {
    "type": "paid",
    "models": [
      {
        "type": "one_time",
        "price": 2999,
        "currency": "USD",
        "features": ["basic_analytics", "export_csv"]
      },
      {
        "type": "monthly",
        "price": 999,
        "currency": "USD",
        "features": ["basic_analytics", "export_csv", "real_time", "api_access"]
      },
      {
        "type": "yearly",
        "price": 9999,
        "currency": "USD",
        "features": ["basic_analytics", "export_csv", "real_time", "api_access", "priority_support"],
        "discount": 17
      }
    ]
  },
  "permissions": ["network-access", "storage-read", "storage-write"]
}
```

### Enterprise Licensing

Enterprise plugins with custom pricing:

```typescript
// Enterprise licensing configuration
export interface EnterpriseConfig {
  contactRequired: boolean;
  minimumSeats: number;
  customFeatures: string[];
  slaOptions: string[];
  supportTiers: string[];
}

// plugin.json excerpt
{
  "pricing": {
    "type": "enterprise",
    "enterprise": {
      "contactRequired": true,
      "minimumSeats": 10,
      "customFeatures": ["white_label", "custom_integration", "dedicated_support"],
      "basePrice": 50000
    }
  }
}
```

## License Management

### License Key Generation

```typescript
// License key management
export class LicenseManager {
  private static instance: LicenseManager;
  
  static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }
  
  async generateLicense(subscription: PluginSubscription): Promise<string> {
    const payload = {
      pluginId: subscription.pluginId,
      userId: subscription.userId,
      type: subscription.type,
      features: subscription.features,
      expiresAt: subscription.endDate?.getTime(),
      issuedAt: Date.now()
    };
    
    // Sign with private key (server-side only)
    return this.signLicense(payload);
  }
  
  async validateLicense(licenseKey: string, pluginId: string): Promise<LicenseValidation> {
    try {
      const payload = await this.verifyLicense(licenseKey);
      
      if (payload.pluginId !== pluginId) {
        return { valid: false, reason: 'Plugin ID mismatch' };
      }
      
      if (payload.expiresAt && payload.expiresAt < Date.now()) {
        return { valid: false, reason: 'License expired' };
      }
      
      return {
        valid: true,
        features: payload.features,
        expiresAt: payload.expiresAt
      };
    } catch (error) {
      return { valid: false, reason: 'Invalid license signature' };
    }
  }
  
  private async signLicense(payload: any): Promise<string> {
    // Implementation depends on your signing method (JWT, custom, etc.)
    // This is a simplified example
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // In production, use proper JWT signing with secret key
    const signature = await this.createSignature(`${encodedHeader}.${encodedPayload}`);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  private async verifyLicense(licenseKey: string): Promise<any> {
    const parts = licenseKey.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid license format');
    }
    
    const [header, payload, signature] = parts;
    
    // Verify signature
    const expectedSignature = await this.createSignature(`${header}.${payload}`);
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }
    
    return JSON.parse(atob(payload));
  }
  
  private async createSignature(data: string): Promise<string> {
    // Simplified signature - use proper HMAC in production
    return btoa(data + process.env.LICENSE_SECRET);
  }
}

export interface LicenseValidation {
  valid: boolean;
  reason?: string;
  features?: string[];
  expiresAt?: number;
}
```

## Stripe Integration

### Payment Processing

```typescript
// Stripe integration for plugin purchases
export class PluginPaymentService {
  private stripe: Stripe;
  
  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
  }
  
  async createPaymentIntent(
    pluginId: string,
    pricingModel: PricingModel,
    userId: string
  ): Promise<PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: pricingModel.price,
      currency: pricingModel.currency.toLowerCase(),
      metadata: {
        pluginId,
        userId,
        subscriptionType: pricingModel.type
      },
      description: `${pluginId} - ${pricingModel.type} subscription`
    });
    
    return paymentIntent;
  }
  
  async createSubscription(
    customerId: string,
    priceId: string,
    pluginId: string
  ): Promise<Subscription> {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        pluginId,
        type: 'plugin_subscription'
      },
      trial_period_days: 7 // Optional trial period
    });
    
    return subscription;
  }
  
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as PaymentIntent);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handleSubscriptionPayment(event.data.object as Invoice);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancellation(event.data.object as Subscription);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
  
  private async handlePaymentSuccess(paymentIntent: PaymentIntent): Promise<void> {
    const { pluginId, userId, subscriptionType } = paymentIntent.metadata;
    
    // Create subscription record
    const subscription: PluginSubscription = {
      pluginId,
      userId,
      type: subscriptionType as SubscriptionType,
      status: 'active',
      startDate: new Date(),
      endDate: subscriptionType === 'one_time' ? undefined : this.calculateEndDate(subscriptionType),
      licenseKey: await LicenseManager.getInstance().generateLicense({
        pluginId,
        userId,
        type: subscriptionType as SubscriptionType,
        status: 'active',
        startDate: new Date(),
        features: this.getFeaturesForSubscription(pluginId, subscriptionType),
        metadata: {}
      } as PluginSubscription),
      features: this.getFeaturesForSubscription(pluginId, subscriptionType),
      metadata: {
        stripePaymentIntentId: paymentIntent.id
      }
    };
    
    // Save to database
    await this.saveSubscription(subscription);
    
    // Notify user
    await this.notifySubscriptionActivated(userId, pluginId);
  }
  
  private calculateEndDate(subscriptionType: string): Date {
    const now = new Date();
    switch (subscriptionType) {
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      default:
        return now;
    }
  }
}
```

### Subscription Management API

```typescript
// API endpoints for subscription management
export class SubscriptionAPI {
  
  // Get user's subscriptions
  async getUserSubscriptions(userId: string): Promise<PluginSubscription[]> {
    const subscriptions = await this.database.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    return subscriptions.docs.map(doc => doc.data() as PluginSubscription);
  }
  
  // Check if user has access to plugin
  async hasPluginAccess(userId: string, pluginId: string): Promise<boolean> {
    const subscription = await this.database.collection('subscriptions')
      .where('userId', '==', userId)
      .where('pluginId', '==', pluginId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (subscription.empty) {
      // Check if it's a free plugin
      const plugin = await this.getPlugin(pluginId);
      return plugin?.pricing?.type === 'free';
    }
    
    const sub = subscription.docs[0].data() as PluginSubscription;
    
    // Check expiration for time-based subscriptions
    if (sub.endDate && sub.endDate < new Date()) {
      await this.expireSubscription(sub);
      return false;
    }
    
    return true;
  }
  
  // Cancel subscription
  async cancelSubscription(userId: string, pluginId: string): Promise<void> {
    const subscription = await this.findActiveSubscription(userId, pluginId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }
    
    // Cancel in Stripe if recurring
    if (subscription.type === 'monthly' || subscription.type === 'yearly') {
      await this.stripe.subscriptions.cancel(subscription.metadata.stripeSubscriptionId);
    }
    
    // Update local record
    await this.database.collection('subscriptions')
      .doc(subscription.id)
      .update({
        status: 'cancelled',
        cancelledAt: new Date()
      });
  }
}
```

## Subscription Lifecycle

### Trial Management

```typescript
// Trial subscription management
export class TrialManager {
  private readonly TRIAL_DURATION_DAYS = 7;
  
  async startTrial(userId: string, pluginId: string): Promise<PluginSubscription> {
    // Check if user already had a trial
    const existingTrial = await this.findPreviousTrial(userId, pluginId);
    if (existingTrial) {
      throw new Error('Trial already used for this plugin');
    }
    
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + this.TRIAL_DURATION_DAYS);
    
    const trialSubscription: PluginSubscription = {
      pluginId,
      userId,
      type: SubscriptionType.MONTHLY, // Trial for monthly features
      status: 'trial',
      startDate: new Date(),
      endDate: trialEnd,
      licenseKey: await LicenseManager.getInstance().generateLicense({
        pluginId,
        userId,
        type: SubscriptionType.MONTHLY,
        status: 'trial',
        startDate: new Date(),
        endDate: trialEnd,
        features: this.getTrialFeatures(pluginId),
        metadata: { trial: true }
      } as PluginSubscription),
      features: this.getTrialFeatures(pluginId),
      metadata: { trial: true }
    };
    
    await this.saveSubscription(trialSubscription);
    return trialSubscription;
  }
  
  async checkTrialExpiration(): Promise<void> {
    const expiredTrials = await this.database.collection('subscriptions')
      .where('status', '==', 'trial')
      .where('endDate', '<=', new Date())
      .get();
    
    const batch = this.database.batch();
    
    expiredTrials.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });
    
    await batch.commit();
    
    // Notify users about trial expiration
    for (const doc of expiredTrials.docs) {
      const subscription = doc.data() as PluginSubscription;
      await this.notifyTrialExpired(subscription.userId, subscription.pluginId);
    }
  }
}
```

## License Validation

### Runtime License Checking

```typescript
// Runtime license validation in plugins
export class PluginLicenseValidator {
  private licenseCache = new Map<string, LicenseValidation>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  async validateAccess(
    pluginId: string,
    feature: string,
    context: PluginContext
  ): Promise<boolean> {
    const userId = context.user?.id;
    if (!userId) {
      return false;
    }
    
    const cacheKey = `${userId}:${pluginId}`;
    const cached = this.licenseCache.get(cacheKey);
    
    if (cached && cached.cachedAt && (Date.now() - cached.cachedAt) < this.CACHE_DURATION) {
      return this.checkFeatureAccess(cached, feature);
    }
    
    // Validate license with server
    const validation = await this.validateWithServer(userId, pluginId);
    validation.cachedAt = Date.now();
    this.licenseCache.set(cacheKey, validation);
    
    return this.checkFeatureAccess(validation, feature);
  }
  
  private async validateWithServer(userId: string, pluginId: string): Promise<LicenseValidation> {
    try {
      const response = await fetch('/api/plugins/validate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pluginId })
      });
      
      return await response.json();
    } catch (error) {
      console.error('License validation failed:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }
  
  private checkFeatureAccess(validation: LicenseValidation, feature: string): boolean {
    if (!validation.valid) {
      return false;
    }
    
    return !validation.features || validation.features.includes(feature);
  }
}

// Usage in plugin
export class PremiumAnalyticsPlugin implements BasePlugin {
  name = 'premium-analytics';
  version = '1.0.0';
  
  private licenseValidator = new PluginLicenseValidator();
  
  async generateReport(context: PluginContext, type: string): Promise<Report> {
    // Check license for advanced features
    if (type === 'advanced' || type === 'real_time') {
      const hasAccess = await this.licenseValidator.validateAccess(
        this.name,
        type,
        context
      );
      
      if (!hasAccess) {
        throw new Error(`Premium feature '${type}' requires a valid subscription`);
      }
    }
    
    // Generate report based on license
    return this.createReport(type, context);
  }
}
```

## Revenue Sharing

### Developer Revenue Model

```typescript
// Revenue sharing configuration
export interface RevenueShare {
  developerId: string;
  pluginId: string;
  platformFee: number; // Percentage (e.g., 30 for 30%)
  developerShare: number; // Percentage (e.g., 70 for 70%)
  minimumPayout: number; // Minimum amount for payout
  payoutSchedule: 'weekly' | 'monthly' | 'quarterly';
}

export class RevenueManager {
  async calculateDeveloperEarnings(
    developerId: string,
    period: { start: Date; end: Date }
  ): Promise<DeveloperEarnings> {
    const payments = await this.getPaymentsForPeriod(developerId, period);
    
    let totalRevenue = 0;
    let platformFees = 0;
    let developerEarnings = 0;
    
    for (const payment of payments) {
      const revenueShare = await this.getRevenueShare(payment.pluginId);
      const revenue = payment.amount;
      const fee = Math.round(revenue * (revenueShare.platformFee / 100));
      const earnings = revenue - fee;
      
      totalRevenue += revenue;
      platformFees += fee;
      developerEarnings += earnings;
    }
    
    return {
      developerId,
      period,
      totalRevenue,
      platformFees,
      developerEarnings,
      paymentCount: payments.length,
      readyForPayout: developerEarnings >= this.getMinimumPayout(developerId)
    };
  }
  
  async processPayout(developerId: string): Promise<Payout> {
    const earnings = await this.getPendingEarnings(developerId);
    
    if (earnings.amount < earnings.minimumPayout) {
      throw new Error('Earnings below minimum payout threshold');
    }
    
    // Process payout via Stripe Connect or similar
    const payout = await this.stripe.transfers.create({
      amount: earnings.amount,
      currency: 'usd',
      destination: earnings.stripeAccountId,
      description: `Plugin revenue payout for ${developerId}`
    });
    
    // Record payout
    await this.recordPayout({
      developerId,
      amount: earnings.amount,
      stripeTransferId: payout.id,
      processedAt: new Date(),
      period: earnings.period
    });
    
    return payout;
  }
}

interface DeveloperEarnings {
  developerId: string;
  period: { start: Date; end: Date };
  totalRevenue: number;
  platformFees: number;
  developerEarnings: number;
  paymentCount: number;
  readyForPayout: boolean;
}
```

## Best Practices

### Security Considerations

- **License Keys**: Use cryptographically secure signing for license keys
- **Validation**: Always validate licenses server-side, cache client-side for performance
- **Rate Limiting**: Implement rate limiting on license validation endpoints
- **Audit Trail**: Log all subscription and license events for compliance

### User Experience

- **Trial Period**: Offer meaningful trial periods to reduce purchase friction
- **Feature Gating**: Clearly communicate which features require premium access
- **Upgrade Prompts**: Provide contextual upgrade prompts when users hit limits
- **Billing Transparency**: Show clear pricing and billing information

### Developer Guidelines

- **Fair Pricing**: Price plugins fairly based on value provided
- **Feature Tiers**: Offer multiple tiers to accommodate different user needs
- **Documentation**: Provide clear documentation on premium features
- **Support**: Offer better support for paid plugin users
