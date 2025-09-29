# Migration Guide

This guide covers upgrading from older Qirvo Plugin SDK versions, including breaking changes, migration strategies, and compatibility considerations.

## Table of Contents

- [Migration Overview](#migration-overview)
- [Version Compatibility](#version-compatibility)
- [Migration Strategies](#migration-strategies)
- [Automated Migration Tools](#automated-migration-tools)
- [Manual Migration Steps](#manual-migration-steps)
- [Testing After Migration](#testing-after-migration)

## Migration Overview

### Migration Planning

```typescript
// Migration planning and assessment tool
export class MigrationPlanner {
  private currentVersion: string;
  private targetVersion: string;
  private pluginManifest: PluginManifest;
  private migrationRules: MigrationRule[];
  
  constructor(
    currentVersion: string,
    targetVersion: string,
    pluginManifest: PluginManifest
  ) {
    this.currentVersion = currentVersion;
    this.targetVersion = targetVersion;
    this.pluginManifest = pluginManifest;
    this.migrationRules = this.loadMigrationRules();
  }
  
  async assessMigration(): Promise<MigrationAssessment> {
    const assessment: MigrationAssessment = {
      complexity: 'low',
      estimatedTime: '1-2 hours',
      breakingChanges: [],
      requiredActions: [],
      risks: [],
      recommendations: []
    };
    
    // Analyze version differences
    const versionDiff = this.analyzeVersionDifference();
    assessment.complexity = this.calculateComplexity(versionDiff);
    
    // Check for breaking changes
    const breakingChanges = await this.identifyBreakingChanges();
    assessment.breakingChanges = breakingChanges;
    
    // Generate required actions
    assessment.requiredActions = this.generateRequiredActions(breakingChanges);
    
    // Assess risks
    assessment.risks = this.assessRisks(breakingChanges);
    
    // Generate recommendations
    assessment.recommendations = this.generateRecommendations(assessment);
    
    return assessment;
  }
  
  private async identifyBreakingChanges(): Promise<BreakingChange[]> {
    const changes: BreakingChange[] = [];
    
    // Check API changes
    const apiChanges = await this.checkAPIChanges();
    changes.push(...apiChanges);
    
    // Check manifest changes
    const manifestChanges = this.checkManifestChanges();
    changes.push(...manifestChanges);
    
    // Check dependency changes
    const dependencyChanges = await this.checkDependencyChanges();
    changes.push(...dependencyChanges);
    
    return changes;
  }
  
  private checkManifestChanges(): BreakingChange[] {
    const changes: BreakingChange[] = [];
    
    // Check manifest version
    if (this.pluginManifest.manifestVersion < 2) {
      changes.push({
        type: 'manifest',
        severity: 'high',
        description: 'Manifest format has changed significantly',
        impact: 'Plugin will not load without manifest update',
        action: 'Update manifest to version 2.0 format',
        autoFixable: true
      });
    }
    
    // Check permission format
    if (this.hasOldPermissionFormat()) {
      changes.push({
        type: 'permissions',
        severity: 'medium',
        description: 'Permission format has changed from dot-notation to kebab-case',
        impact: 'Plugin permissions may not work correctly',
        action: 'Update permissions to kebab-case format',
        autoFixable: true
      });
    }
    
    return changes;
  }
  
  async generateMigrationPlan(): Promise<MigrationPlan> {
    const assessment = await this.assessMigration();
    
    const plan: MigrationPlan = {
      phases: [],
      totalEstimatedTime: assessment.estimatedTime,
      prerequisites: this.getPrerequisites(),
      rollbackStrategy: this.createRollbackStrategy()
    };
    
    // Phase 1: Preparation
    plan.phases.push({
      name: 'Preparation',
      description: 'Backup and prepare for migration',
      steps: [
        'Create backup of current plugin',
        'Update development environment',
        'Install migration tools',
        'Review breaking changes documentation'
      ],
      estimatedTime: '30 minutes'
    });
    
    // Phase 2: Code Migration
    plan.phases.push({
      name: 'Code Migration',
      description: 'Update plugin code and configuration',
      steps: this.generateCodeMigrationSteps(assessment.breakingChanges),
      estimatedTime: '1-3 hours'
    });
    
    // Phase 3: Testing
    plan.phases.push({
      name: 'Testing',
      description: 'Test migrated plugin',
      steps: [
        'Run automated tests',
        'Perform manual testing',
        'Test in development environment',
        'Validate all features work correctly'
      ],
      estimatedTime: '1-2 hours'
    });
    
    return plan;
  }
}

interface MigrationAssessment {
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: string;
  breakingChanges: BreakingChange[];
  requiredActions: string[];
  risks: string[];
  recommendations: string[];
}

interface BreakingChange {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  action: string;
  autoFixable: boolean;
}
```

## Version Compatibility

### Compatibility Matrix

```typescript
// Version compatibility checker
export class CompatibilityChecker {
  private compatibilityMatrix: CompatibilityMatrix;
  
  constructor() {
    this.compatibilityMatrix = this.loadCompatibilityMatrix();
  }
  
  checkCompatibility(
    pluginVersion: string,
    qirvoVersion: string
  ): CompatibilityResult {
    const plugin = this.parseVersion(pluginVersion);
    const qirvo = this.parseVersion(qirvoVersion);
    
    // Check major version compatibility
    if (plugin.major !== qirvo.major) {
      return {
        compatible: false,
        reason: 'Major version mismatch',
        recommendation: `Upgrade plugin to v${qirvo.major}.x.x`
      };
    }
    
    // Check minor version compatibility
    if (plugin.minor > qirvo.minor) {
      return {
        compatible: false,
        reason: 'Plugin requires newer Qirvo version',
        recommendation: `Upgrade Qirvo to v${plugin.major}.${plugin.minor}.x or higher`
      };
    }
    
    // Check specific compatibility rules
    const rule = this.findCompatibilityRule(pluginVersion, qirvoVersion);
    if (rule && !rule.compatible) {
      return {
        compatible: false,
        reason: rule.reason,
        recommendation: rule.recommendation
      };
    }
    
    return {
      compatible: true,
      reason: 'Versions are compatible'
    };
  }
  
  private loadCompatibilityMatrix(): CompatibilityMatrix {
    return {
      '1.0.x': {
        qirvoVersions: ['1.0.x', '1.1.x'],
        deprecated: false,
        supportEndsAt: '2025-12-31'
      },
      '1.1.x': {
        qirvoVersions: ['1.1.x', '1.2.x'],
        deprecated: false,
        supportEndsAt: '2026-06-30'
      },
      '2.0.x': {
        qirvoVersions: ['2.0.x', '2.1.x', '2.2.x'],
        deprecated: false,
        supportEndsAt: '2027-12-31'
      }
    };
  }
  
  getUpgradePath(
    currentVersion: string,
    targetVersion: string
  ): UpgradePath {
    const path: UpgradePath = {
      steps: [],
      totalComplexity: 'low'
    };
    
    const current = this.parseVersion(currentVersion);
    const target = this.parseVersion(targetVersion);
    
    // Direct upgrade possible?
    if (this.canUpgradeDirectly(current, target)) {
      path.steps.push({
        from: currentVersion,
        to: targetVersion,
        complexity: this.calculateUpgradeComplexity(current, target),
        breakingChanges: this.getBreakingChanges(currentVersion, targetVersion)
      });
    } else {
      // Multi-step upgrade required
      const intermediateVersions = this.findIntermediateVersions(current, target);
      
      let fromVersion = currentVersion;
      for (const intermediateVersion of intermediateVersions) {
        path.steps.push({
          from: fromVersion,
          to: intermediateVersion,
          complexity: this.calculateUpgradeComplexity(
            this.parseVersion(fromVersion),
            this.parseVersion(intermediateVersion)
          ),
          breakingChanges: this.getBreakingChanges(fromVersion, intermediateVersion)
        });
        fromVersion = intermediateVersion;
      }
    }
    
    path.totalComplexity = this.calculateTotalComplexity(path.steps);
    return path;
  }
}

interface CompatibilityMatrix {
  [pluginVersion: string]: {
    qirvoVersions: string[];
    deprecated: boolean;
    supportEndsAt: string;
  };
}

interface UpgradePath {
  steps: UpgradeStep[];
  totalComplexity: 'low' | 'medium' | 'high';
}

interface UpgradeStep {
  from: string;
  to: string;
  complexity: 'low' | 'medium' | 'high';
  breakingChanges: string[];
}
```

## Migration Strategies

### Strategy Selection

```typescript
// Migration strategy selector
export class MigrationStrategy {
  static selectStrategy(
    assessment: MigrationAssessment,
    constraints: MigrationConstraints
  ): StrategyRecommendation {
    // Big Bang Migration
    if (assessment.complexity === 'low' && constraints.downtime.acceptable) {
      return {
        type: 'big-bang',
        description: 'Migrate everything at once',
        advantages: ['Fast', 'Simple', 'No version conflicts'],
        disadvantages: ['Requires downtime', 'Higher risk'],
        suitableFor: ['Small plugins', 'Low complexity changes']
      };
    }
    
    // Incremental Migration
    if (assessment.complexity === 'medium' || constraints.downtime.minimal) {
      return {
        type: 'incremental',
        description: 'Migrate in phases over time',
        advantages: ['Lower risk', 'Minimal downtime', 'Easier rollback'],
        disadvantages: ['More complex', 'Longer timeline'],
        suitableFor: ['Medium to large plugins', 'Production environments']
      };
    }
    
    // Parallel Migration
    if (assessment.complexity === 'high' || constraints.risk === 'low') {
      return {
        type: 'parallel',
        description: 'Run old and new versions side by side',
        advantages: ['Zero downtime', 'Easy rollback', 'Gradual transition'],
        disadvantages: ['Resource intensive', 'Complex setup'],
        suitableFor: ['Critical plugins', 'High availability requirements']
      };
    }
    
    return {
      type: 'custom',
      description: 'Custom migration approach needed',
      advantages: [],
      disadvantages: [],
      suitableFor: ['Complex scenarios requiring custom approach']
    };
  }
}

// Big Bang Migration
export class BigBangMigration {
  async execute(
    pluginPath: string,
    migrationPlan: MigrationPlan
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      steps: [],
      errors: [],
      rollbackData: {}
    };
    
    try {
      // Create backup
      const backupPath = await this.createBackup(pluginPath);
      result.rollbackData.backupPath = backupPath;
      
      // Execute all migration steps
      for (const phase of migrationPlan.phases) {
        const phaseResult = await this.executePhase(pluginPath, phase);
        result.steps.push(phaseResult);
        
        if (!phaseResult.success) {
          throw new Error(`Phase ${phase.name} failed: ${phaseResult.error}`);
        }
      }
      
      result.success = true;
      
    } catch (error) {
      result.errors.push(error.message);
      
      // Auto-rollback on failure
      if (result.rollbackData.backupPath) {
        await this.rollback(pluginPath, result.rollbackData.backupPath);
      }
    }
    
    return result;
  }
}

// Incremental Migration
export class IncrementalMigration {
  private migrationState: MigrationState;
  
  constructor() {
    this.migrationState = this.loadMigrationState();
  }
  
  async executeNextPhase(
    pluginPath: string,
    migrationPlan: MigrationPlan
  ): Promise<PhaseResult> {
    const currentPhase = this.migrationState.currentPhase;
    const nextPhase = migrationPlan.phases[currentPhase];
    
    if (!nextPhase) {
      return {
        success: true,
        message: 'Migration completed',
        completed: true
      };
    }
    
    try {
      const result = await this.executePhase(pluginPath, nextPhase);
      
      if (result.success) {
        this.migrationState.currentPhase++;
        this.migrationState.completedPhases.push(nextPhase.name);
        this.saveMigrationState();
      }
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        completed: false
      };
    }
  }
  
  async rollbackLastPhase(pluginPath: string): Promise<void> {
    if (this.migrationState.currentPhase === 0) {
      throw new Error('No phases to rollback');
    }
    
    const lastPhase = this.migrationState.completedPhases.pop();
    this.migrationState.currentPhase--;
    
    await this.rollbackPhase(pluginPath, lastPhase!);
    this.saveMigrationState();
  }
}

interface MigrationConstraints {
  downtime: {
    acceptable: boolean;
    maxDuration?: string;
    minimal: boolean;
  };
  risk: 'low' | 'medium' | 'high';
  resources: {
    development: boolean;
    testing: boolean;
    production: boolean;
  };
}
```

## Automated Migration Tools

### Migration Automation

```typescript
// Automated migration tools
export class MigrationAutomation {
  private transformers: Map<string, CodeTransformer> = new Map();
  private validators: Map<string, MigrationValidator> = new Map();
  
  constructor() {
    this.setupTransformers();
    this.setupValidators();
  }
  
  async autoMigrate(
    pluginPath: string,
    fromVersion: string,
    toVersion: string
  ): Promise<AutoMigrationResult> {
    const result: AutoMigrationResult = {
      success: false,
      changes: [],
      warnings: [],
      errors: []
    };
    
    try {
      // Load migration rules
      const rules = this.loadMigrationRules(fromVersion, toVersion);
      
      // Apply transformations
      for (const rule of rules) {
        const transformer = this.transformers.get(rule.type);
        if (transformer) {
          const changes = await transformer.apply(pluginPath, rule);
          result.changes.push(...changes);
        }
      }
      
      // Validate results
      const validation = await this.validateMigration(pluginPath, toVersion);
      result.warnings.push(...validation.warnings);
      result.errors.push(...validation.errors);
      
      result.success = validation.errors.length === 0;
      
    } catch (error) {
      result.errors.push(error.message);
    }
    
    return result;
  }
  
  private setupTransformers(): void {
    // Manifest transformer
    this.transformers.set('manifest', new ManifestTransformer());
    
    // API transformer
    this.transformers.set('api', new APITransformer());
    
    // Configuration transformer
    this.transformers.set('config', new ConfigTransformer());
    
    // Dependency transformer
    this.transformers.set('dependencies', new DependencyTransformer());
  }
}

// Manifest transformer
export class ManifestTransformer implements CodeTransformer {
  async apply(pluginPath: string, rule: MigrationRule): Promise<TransformationChange[]> {
    const changes: TransformationChange[] = [];
    const manifestPath = path.join(pluginPath, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      return changes;
    }
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const originalManifest = JSON.stringify(manifest, null, 2);
    
    // Transform manifest version
    if (rule.action === 'update-manifest-version') {
      manifest.manifestVersion = rule.targetValue;
      changes.push({
        type: 'manifest-version',
        description: `Updated manifest version to ${rule.targetValue}`,
        file: 'manifest.json'
      });
    }
    
    // Transform permissions
    if (rule.action === 'update-permissions-format') {
      if (manifest.permissions) {
        manifest.permissions = this.transformPermissions(manifest.permissions);
        changes.push({
          type: 'permissions',
          description: 'Updated permissions to kebab-case format',
          file: 'manifest.json'
        });
      }
    }
    
    // Write updated manifest
    const updatedManifest = JSON.stringify(manifest, null, 2);
    if (updatedManifest !== originalManifest) {
      fs.writeFileSync(manifestPath, updatedManifest);
    }
    
    return changes;
  }
  
  private transformPermissions(permissions: string[]): string[] {
    const permissionMap: Record<string, string> = {
      'api.external': 'network-access',
      'storage.read': 'storage-read',
      'storage.write': 'storage-write',
      'filesystem.read': 'filesystem-access',
      'filesystem.write': 'filesystem-access'
    };
    
    return permissions.map(perm => permissionMap[perm] || perm);
  }
}

// API transformer
export class APITransformer implements CodeTransformer {
  async apply(pluginPath: string, rule: MigrationRule): Promise<TransformationChange[]> {
    const changes: TransformationChange[] = [];
    
    // Find all TypeScript/JavaScript files
    const files = this.findSourceFiles(pluginPath);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const updatedContent = this.transformAPIUsage(content, rule);
      
      if (updatedContent !== content) {
        fs.writeFileSync(file, updatedContent);
        changes.push({
          type: 'api-usage',
          description: `Updated API usage in ${path.relative(pluginPath, file)}`,
          file: path.relative(pluginPath, file)
        });
      }
    }
    
    return changes;
  }
  
  private transformAPIUsage(content: string, rule: MigrationRule): string {
    let updatedContent = content;
    
    // Transform deprecated API calls
    if (rule.action === 'replace-deprecated-api') {
      const regex = new RegExp(rule.pattern, 'g');
      updatedContent = updatedContent.replace(regex, rule.replacement);
    }
    
    return updatedContent;
  }
}

interface CodeTransformer {
  apply(pluginPath: string, rule: MigrationRule): Promise<TransformationChange[]>;
}

interface MigrationResult {
  success: boolean;
  migratedFiles: string[];
  errors: MigrationError[];
  warnings: string[];
  backupPath?: string;
}

interface MigrationError {
  file: string;
  message: string;
  line?: number;
  column?: number;
}

interface TransformationChange {
  type: string;
  description: string;
  file: string;
}
```

## Manual Migration Steps

### Step-by-Step Migration Process

When automated migration tools cannot handle all aspects of your plugin migration, follow these manual steps to ensure a complete and successful migration.

#### Step 1: Pre-Migration Assessment

```typescript
// Manual migration assessment checklist
export class ManualMigrationGuide {
  private assessmentChecklist: AssessmentItem[] = [
    {
      category: 'manifest',
      item: 'Update manifest version',
      description: 'Change manifestVersion from 1 to 2',
      required: true,
      automated: false
    },
    {
      category: 'permissions',
      item: 'Convert permission format',
      description: 'Change from dot-notation to kebab-case',
      required: true,
      automated: true
    },
    {
      category: 'api',
      item: 'Update plugin constructor',
      description: 'Add context parameter as first argument',
      required: true,
      automated: false
    },
    {
      category: 'lifecycle',
      item: 'Rename lifecycle methods',
      description: 'onInit() → initialize(), onDestroy() → cleanup()',
      required: true,
      automated: true
    },
    {
      category: 'storage',
      item: 'Update storage API calls',
      description: 'Replace qirvo.storage with this.context.storage',
      required: true,
      automated: true
    },
    {
      category: 'events',
      item: 'Update event system',
      description: 'Replace qirvo.events with this.context.events',
      required: true,
      automated: true
    }
  ];
  
  generateMigrationPlan(
    currentVersion: string,
    targetVersion: string,
    pluginPath: string
  ): MigrationPlan {
    const applicableItems = this.assessmentChecklist.filter(item =>
      this.isApplicableForMigration(item, currentVersion, targetVersion)
    );
    
    return {
      fromVersion: currentVersion,
      toVersion: targetVersion,
      pluginPath,
      steps: applicableItems.map((item, index) => ({
        stepNumber: index + 1,
        category: item.category,
        title: item.item,
        description: item.description,
        required: item.required,
        automated: item.automated,
        estimatedTime: this.estimateStepTime(item),
        dependencies: this.getStepDependencies(item),
        instructions: this.getDetailedInstructions(item)
      })),
      estimatedTotalTime: this.calculateTotalTime(applicableItems),
      complexity: this.assessComplexity(applicableItems)
    };
  }
  
  private getDetailedInstructions(item: AssessmentItem): MigrationInstruction[] {
    switch (item.category) {
      case 'manifest':
        return this.getManifestInstructions();
      case 'api':
        return this.getAPIInstructions();
      case 'lifecycle':
        return this.getLifecycleInstructions();
      case 'storage':
        return this.getStorageInstructions();
      case 'events':
        return this.getEventInstructions();
      default:
        return [];
    }
  }
  
  private getManifestInstructions(): MigrationInstruction[] {
    return [
      {
        step: 'Open plugin manifest file',
        action: 'file_edit',
        details: 'Open manifest.json in your plugin root directory',
        code: null
      },
      {
        step: 'Update manifest version',
        action: 'code_change',
        details: 'Change manifestVersion from 1 to 2',
        code: {
          before: '{\n  "manifestVersion": 1,',
          after: '{\n  "manifestVersion": 2,'
        }
      },
      {
        step: 'Add runtime configuration',
        action: 'code_add',
        details: 'Add required runtime section',
        code: {
          before: '  "permissions": [...],',
          after: '  "permissions": [...],\n  "runtime": {\n    "version": "2.0",\n    "environment": "browser"\n  },'
        }
      }
    ];
  }
  
  private getAPIInstructions(): MigrationInstruction[] {
    return [
      {
        step: 'Update plugin class constructor',
        action: 'code_change',
        details: 'Add context parameter as first argument',
        code: {
          before: 'constructor(config: PluginConfig) {\n  super(config);',
          after: 'constructor(context: PluginContext, config: PluginConfig) {\n  super(context, config);'
        }
      },
      {
        step: 'Store context reference',
        action: 'code_add',
        details: 'Add context property to access plugin context',
        code: {
          before: 'export class MyPlugin extends BasePlugin {',
          after: 'export class MyPlugin extends BasePlugin {\n  private context: PluginContext;'
        }
      },
      {
        step: 'Update context usage',
        action: 'code_change',
        details: 'Replace global API calls with context-based calls',
        code: {
          before: 'qirvo.storage.get("key")',
          after: 'this.context.storage.get("key")'
        }
      }
    ];
  }
  
  private getLifecycleInstructions(): MigrationInstruction[] {
    return [
      {
        step: 'Rename onInit method',
        action: 'code_change',
        details: 'Change onInit() to initialize()',
        code: {
          before: 'async onInit(): Promise<void> {',
          after: 'async initialize(): Promise<void> {'
        }
      },
      {
        step: 'Rename onDestroy method',
        action: 'code_change',
        details: 'Change onDestroy() to cleanup()',
        code: {
          before: 'async onDestroy(): Promise<void> {',
          after: 'async cleanup(): Promise<void> {'
        }
      },
      {
        step: 'Add destroy method if needed',
        action: 'code_add',
        details: 'Add destroy() method for final cleanup',
        code: {
          before: 'async cleanup(): Promise<void> {\n    // Cleanup code\n  }',
          after: 'async cleanup(): Promise<void> {\n    // Cleanup code\n  }\n\n  async destroy(): Promise<void> {\n    // Final cleanup\n  }'
        }
      }
    ];
  }
  
  private getStorageInstructions(): MigrationInstruction[] {
    return [
      {
        step: 'Update storage get calls',
        action: 'code_change',
        details: 'Replace global storage with context storage',
        code: {
          before: 'const value = await qirvo.storage.get("key");',
          after: 'const value = await this.context.storage.get("key");'
        }
      },
      {
        step: 'Update storage set calls',
        action: 'code_change',
        details: 'Replace global storage with context storage',
        code: {
          before: 'await qirvo.storage.set("key", value);',
          after: 'await this.context.storage.set("key", value);'
        }
      },
      {
        step: 'Consider secure storage',
        action: 'code_enhancement',
        details: 'Use secure storage for sensitive data',
        code: {
          before: 'await this.context.storage.set("apiKey", key);',
          after: 'await this.context.storage.setSecure("apiKey", key);'
        }
      }
    ];
  }
  
  private getEventInstructions(): MigrationInstruction[] {
    return [
      {
        step: 'Update event subscriptions',
        action: 'code_change',
        details: 'Replace global events with context events',
        code: {
          before: 'qirvo.events.on("user-action", handler);',
          after: 'this.context.events.subscribe("user:action", handler);'
        }
      },
      {
        step: 'Update event emissions',
        action: 'code_change',
        details: 'Replace global events with context events',
        code: {
          before: 'qirvo.events.emit("plugin-event", data);',
          after: 'this.context.events.emit("plugin:custom-event", data);'
        }
      },
      {
        step: 'Update event names',
        action: 'code_change',
        details: 'Convert to colon notation',
        code: {
          before: '"user-action" → "user:action"',
          after: '"plugin-loaded" → "plugin:loaded"'
        }
      }
    ];
  }
}

// Migration validation helper
export class MigrationValidator {
  async validateMigration(
    pluginPath: string,
    targetVersion: string
  ): Promise<ValidationReport> {
    const validations: ValidationCheck[] = [];
    
    // Validate manifest
    validations.push(await this.validateManifest(pluginPath, targetVersion));
    
    // Validate code structure
    validations.push(await this.validateCodeStructure(pluginPath));
    
    // Validate dependencies
    validations.push(await this.validateDependencies(pluginPath));
    
    // Validate TypeScript compilation
    validations.push(await this.validateTypeScript(pluginPath));
    
    const errors = validations.filter(v => v.level === 'error');
    const warnings = validations.filter(v => v.level === 'warning');
    
    return {
      valid: errors.length === 0,
      checks: validations,
      errors: errors.map(e => e.message),
      warnings: warnings.map(w => w.message),
      recommendations: this.generateRecommendations(validations)
    };
  }
  
  private async validateManifest(
    pluginPath: string,
    targetVersion: string
  ): Promise<ValidationCheck> {
    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      
      if (manifest.manifestVersion !== 2) {
        return {
          category: 'manifest',
          level: 'error',
          message: 'Manifest version must be 2 for target version',
          suggestion: 'Update manifestVersion to 2'
        };
      }
      
      if (!manifest.runtime) {
        return {
          category: 'manifest',
          level: 'error',
          message: 'Runtime configuration is required',
          suggestion: 'Add runtime section to manifest'
        };
      }
      
      return {
        category: 'manifest',
        level: 'success',
        message: 'Manifest validation passed'
      };
      
    } catch (error) {
      return {
        category: 'manifest',
        level: 'error',
        message: `Manifest validation failed: ${error.message}`,
        suggestion: 'Check manifest.json syntax and structure'
      };
    }
  }
  
  private async validateCodeStructure(pluginPath: string): Promise<ValidationCheck> {
    try {
      const sourceFiles = await this.findSourceFiles(pluginPath);
      const issues: string[] = [];
      
      for (const file of sourceFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for old API usage
        if (content.includes('qirvo.storage')) {
          issues.push(`${file}: Still uses global storage API`);
        }
        
        if (content.includes('qirvo.events')) {
          issues.push(`${file}: Still uses global events API`);
        }
        
        if (content.includes('onInit(') || content.includes('onDestroy(')) {
          issues.push(`${file}: Uses old lifecycle method names`);
        }
      }
      
      if (issues.length > 0) {
        return {
          category: 'code_structure',
          level: 'error',
          message: 'Code structure validation failed',
          details: issues,
          suggestion: 'Update code to use new API patterns'
        };
      }
      
      return {
        category: 'code_structure',
        level: 'success',
        message: 'Code structure validation passed'
      };
      
    } catch (error) {
      return {
        category: 'code_structure',
        level: 'error',
        message: `Code structure validation failed: ${error.message}`
      };
    }
  }
}
```

#### Step 2: Manual Code Updates

For complex plugins that require manual intervention, follow these detailed steps:

##### 2.1 Update Plugin Class Structure

```typescript
// Before (v1.x)
export class WeatherPlugin extends BasePlugin {
  constructor(config: PluginConfig) {
    super(config);
  }
  
  async onInit(): Promise<void> {
    await qirvo.storage.set('initialized', true);
  }
  
  async onDestroy(): Promise<void> {
    await qirvo.storage.remove('initialized');
  }
}

// After (v2.0)
export class WeatherPlugin extends BasePlugin {
  constructor(context: PluginContext, config: PluginConfig) {
    super(context, config);
  }
  
  async initialize(): Promise<void> {
    await this.context.storage.set('initialized', true);
  }
  
  async cleanup(): Promise<void> {
    await this.context.storage.remove('initialized');
  }
  
  async destroy(): Promise<void> {
    // Final cleanup if needed
  }
}
```

##### 2.2 Update Event Handling

```typescript
// Before (v1.x)
qirvo.events.on('user-action', (data) => {
  console.log('User performed action:', data);
});

qirvo.events.emit('weather-updated', { temperature: 25 });

// After (v2.0)
this.context.events.subscribe<UserActionEvent>('user:action', (event) => {
  console.log('User performed action:', event.data);
});

this.context.events.emit('weather:updated', { 
  temperature: 25,
  timestamp: Date.now()
});
```

##### 2.3 Update Configuration Handling

```typescript
// Before (v1.x)
export const config = {
  apiKey: '',
  refreshInterval: 300000
};

// After (v2.0)
export const configSchema = {
  type: 'object',
  properties: {
    apiKey: { 
      type: 'string', 
      required: true,
      description: 'Weather API key'
    },
    refreshInterval: { 
      type: 'number', 
      default: 300000,
      minimum: 60000,
      description: 'Data refresh interval in milliseconds'
    }
  }
};

export const config = {
  apiKey: '',
  refreshInterval: 300000
};
```

## Testing After Migration

### Comprehensive Testing Strategy

After completing the migration, thorough testing is essential to ensure your plugin works correctly with the new SDK version.

#### Testing Framework Setup

```typescript
// Testing setup for migrated plugins
export class MigrationTestSuite {
  private testRunner: TestRunner;
  private mockContext: MockPluginContext;
  private plugin: BasePlugin;
  
  constructor(pluginClass: typeof BasePlugin) {
    this.testRunner = new TestRunner();
    this.mockContext = new MockPluginContext();
    this.setupTestEnvironment();
  }
  
  private setupTestEnvironment(): void {
    // Setup mock Qirvo environment
    global.qirvo = {
      version: '2.0.0',
      createContext: () => this.mockContext
    };
  }
  
  async runMigrationTests(): Promise<TestResults> {
    const results: TestResult[] = [];
    
    // Core functionality tests
    results.push(await this.testPluginInitialization());
    results.push(await this.testLifecycleMethods());
    results.push(await this.testStorageOperations());
    results.push(await this.testEventHandling());
    results.push(await this.testConfigurationLoading());
    results.push(await this.testErrorHandling());
    
    // Compatibility tests
    results.push(await this.testBackwardCompatibility());
    results.push(await this.testAPICompatibility());
    
    // Performance tests
    results.push(await this.testPerformanceRegression());
    
    // Integration tests
    results.push(await this.testPluginIntegration());
    
    return {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      results,
      summary: this.generateTestSummary(results)
    };
  }
  
  private async testPluginInitialization(): Promise<TestResult> {
    try {
      const startTime = Date.now();
      const plugin = new this.plugin.constructor(this.mockContext, {});
      
      // Test constructor
      expect(plugin).toBeDefined();
      expect(plugin.context).toBe(this.mockContext);
      
      // Test initialization
      await plugin.initialize();
      expect(this.mockContext.storage.get).toHaveBeenCalled();
      
      return {
        name: 'Plugin Initialization',
        status: 'passed',
        duration: Date.now() - startTime,
        message: 'Plugin initializes correctly with new context API'
      };
      
    } catch (error) {
      return {
        name: 'Plugin Initialization',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        suggestion: 'Check plugin constructor and initialize() method'
      };
    }
  }
  
  private async testLifecycleMethods(): Promise<TestResult> {
    try {
      const startTime = Date.now();
      const plugin = new this.plugin.constructor(this.mockContext, {});
      
      // Test initialize
      await plugin.initialize();
      expect(plugin.isInitialized).toBe(true);
      
      // Test cleanup
      await plugin.cleanup();
      expect(this.mockContext.storage.remove).toHaveBeenCalled();
      
      // Test destroy if exists
      if (plugin.destroy) {
        await plugin.destroy();
      }
      
      return {
        name: 'Lifecycle Methods',
        status: 'passed',
        duration: Date.now() - startTime,
        message: 'All lifecycle methods work correctly'
      };
      
    } catch (error) {
      return {
        name: 'Lifecycle Methods',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        suggestion: 'Check lifecycle method implementations'
      };
    }
  }
  
  private async testStorageOperations(): Promise<TestResult> {
    try {
      const startTime = Date.now();
      const plugin = new this.plugin.constructor(this.mockContext, {});
      await plugin.initialize();
      
      // Test storage operations
      await plugin.context.storage.set('test-key', 'test-value');
      const value = await plugin.context.storage.get('test-key');
      
      expect(value).toBe('test-value');
      expect(this.mockContext.storage.set).toHaveBeenCalledWith('test-key', 'test-value');
      expect(this.mockContext.storage.get).toHaveBeenCalledWith('test-key');
      
      return {
        name: 'Storage Operations',
        status: 'passed',
        duration: Date.now() - startTime,
        message: 'Storage operations work correctly with context API'
      };
      
    } catch (error) {
      return {
        name: 'Storage Operations',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        suggestion: 'Check storage API usage in plugin code'
      };
    }
  }
  
  private async testEventHandling(): Promise<TestResult> {
    try {
      const startTime = Date.now();
      const plugin = new this.plugin.constructor(this.mockContext, {});
      await plugin.initialize();
      
      let eventReceived = false;
      const eventData = { test: 'data' };
      
      // Subscribe to event
      plugin.context.events.subscribe('test:event', (data) => {
        eventReceived = true;
        expect(data).toEqual(eventData);
      });
      
      // Emit event
      plugin.context.events.emit('test:event', eventData);
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(eventReceived).toBe(true);
      
      return {
        name: 'Event Handling',
        status: 'passed',
        duration: Date.now() - startTime,
        message: 'Event system works correctly with new API'
      };
      
    } catch (error) {
      return {
        name: 'Event Handling',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        suggestion: 'Check event handling implementation'
      };
    }
  }
  
  private async testPerformanceRegression(): Promise<TestResult> {
    try {
      const startTime = Date.now();
      const plugin = new this.plugin.constructor(this.mockContext, {});
      
      // Measure initialization time
      const initStart = performance.now();
      await plugin.initialize();
      const initTime = performance.now() - initStart;
      
      // Measure operation time
      const opStart = performance.now();
      for (let i = 0; i < 100; i++) {
        await plugin.context.storage.set(`key-${i}`, `value-${i}`);
      }
      const opTime = performance.now() - opStart;
      
      // Check performance thresholds
      const initThreshold = 1000; // 1 second
      const opThreshold = 5000; // 5 seconds for 100 operations
      
      if (initTime > initThreshold) {
        throw new Error(`Initialization too slow: ${initTime}ms > ${initThreshold}ms`);
      }
      
      if (opTime > opThreshold) {
        throw new Error(`Operations too slow: ${opTime}ms > ${opThreshold}ms`);
      }
      
      return {
        name: 'Performance Regression',
        status: 'passed',
        duration: Date.now() - startTime,
        message: `Performance acceptable: init=${initTime.toFixed(2)}ms, ops=${opTime.toFixed(2)}ms`,
        metrics: {
          initializationTime: initTime,
          operationTime: opTime
        }
      };
      
    } catch (error) {
      return {
        name: 'Performance Regression',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        suggestion: 'Optimize plugin performance or adjust thresholds'
      };
    }
  }
}

// Mock context for testing
export class MockPluginContext implements PluginContext {
  storage: MockStorage;
  events: MockEventSystem;
  config: any;
  plugin: { id: string };
  
  constructor() {
    this.storage = new MockStorage();
    this.events = new MockEventSystem();
    this.config = {};
    this.plugin = { id: 'test-plugin' };
  }
}

export class MockStorage {
  private data: Map<string, any> = new Map();
  
  async get(key: string): Promise<any> {
    return this.data.get(key);
  }
  
  async set(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }
  
  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
  
  async clear(): Promise<void> {
    this.data.clear();
  }
}

export class MockEventSystem {
  private listeners: Map<string, Function[]> = new Map();
  
  subscribe(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }
  
  emit(event: string, data: any): void {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
  
  unsubscribe(event: string, handler: Function): void {
    const handlers = this.listeners.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
}
```

#### Integration Testing

```typescript
// Integration testing for migrated plugins
export class IntegrationTestSuite {
  async testPluginIntegration(
    pluginPath: string,
    testEnvironment: TestEnvironment
  ): Promise<IntegrationTestResults> {
    const results: IntegrationTestResult[] = [];
    
    // Test plugin loading
    results.push(await this.testPluginLoading(pluginPath, testEnvironment));
    
    // Test plugin registration
    results.push(await this.testPluginRegistration(pluginPath, testEnvironment));
    
    // Test inter-plugin communication
    results.push(await this.testInterPluginCommunication(pluginPath, testEnvironment));
    
    // Test UI integration (if applicable)
    results.push(await this.testUIIntegration(pluginPath, testEnvironment));
    
    // Test data persistence
    results.push(await this.testDataPersistence(pluginPath, testEnvironment));
    
    return {
      results,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      recommendations: this.generateIntegrationRecommendations(results)
    };
  }
  
  private async testPluginLoading(
    pluginPath: string,
    testEnvironment: TestEnvironment
  ): Promise<IntegrationTestResult> {
    try {
      // Load plugin in test environment
      const plugin = await testEnvironment.loadPlugin(pluginPath);
      
      // Verify plugin loaded correctly
      expect(plugin).toBeDefined();
      expect(plugin.manifest).toBeDefined();
      expect(plugin.manifest.manifestVersion).toBe(2);
      
      return {
        name: 'Plugin Loading',
        passed: true,
        message: 'Plugin loads successfully in test environment'
      };
      
    } catch (error) {
      return {
        name: 'Plugin Loading',
        passed: false,
        error: error.message,
        recommendation: 'Check plugin manifest and entry point'
      };
    }
  }
}
```

#### Automated Test Execution

```bash
# Run migration tests
npm run test:migration

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Generate test report
npm run test:report
```

This comprehensive testing approach ensures that your migrated plugin works correctly with the new SDK version and maintains compatibility with the Qirvo ecosystem.

---

**Next**: [Breaking Changes](./breaking-changes.md)
