# Qirvo Plugin SDK — Examples

This guide shows practical, minimal examples for building plugins with the Qirvo Plugin SDK using TypeScript. It complements the API reference by focusing on copy‑pasteable snippets you can adapt.

## Prerequisites

- Node.js 18+ and npm (or pnpm/yarn)
- TypeScript configured with strict mode recommended
- Qirvo Plugin SDK installed in your plugin project

```bash
npm install @qirvo/plugin-sdk
```

## Quick Start: Minimal Plugin

Create a simple plugin with lifecycle hooks, a health check, and one runtime hook. All examples are TypeScript.

```ts
// src/index.ts
import type {
  BasePlugin,
  PluginContext,
  PluginHooks,
  HealthStatus,
} from '@qirvo/plugin-sdk';

export default class HelloWorldPlugin implements BasePlugin {
  name = 'hello-world';
  version = '1.0.0';

  async init(ctx: PluginContext): Promise<void> {
    ctx.logger.info(`[${this.name}] init`);
  }

  async destroy(ctx: PluginContext): Promise<void> {
    ctx.logger.info(`[${this.name}] destroy`);
  }

  async enable(ctx: PluginContext): Promise<void> {
    ctx.logger.info(`[${this.name}] enable`);
  }

  async disable(ctx: PluginContext): Promise<void> {
    ctx.logger.info(`[${this.name}] disable`);
  }

  async healthCheck(ctx: PluginContext): Promise<HealthStatus> {
    // Perform lightweight checks; keep under your configured timeout
    const ok = true;
    return ok
      ? { status: 'healthy' }
      : { status: 'unhealthy', details: 'Dependency unavailable' };
  }

  getHooks(): PluginHooks {
    return {
      // Example middleware hook; runs before a request handler
      middleware: [
        {
          id: 'log-requests',
          priority: 50,
          handler: async (req, _res, next, { logger }) => {
            logger.debug(`[hello-world] ${req.method} ${req.url}`);
            return next();
          },
        },
      ],
    };
  }
}
```

Create your manifest to declare metadata and permissions using canonical names.

```json
// plugin.json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "Minimal example plugin",
  "author": "Your Name",
  "permissions": [
    "network-access",
    "storage-read"
  ],
  "entry": "dist/index.js"
}
```

### Canonical Permissions

Use the canonical, kebab-case permissions consistently across validation and runtime:

- `network-access`
- `storage-read`
- `storage-write`
- `filesystem-access`
- `notifications`
- `clipboard-read`
- `clipboard-write`
- `geolocation`
- `camera`
- `microphone`
- `calendar`
- `contacts`

## UI Widget Example (React)

If your plugin exposes a widget, export a component from your bundle and declare it in your manifest. Keep the bundle light (exclude `.d.ts` and source maps from runtime artifacts).

```tsx
// src/components/HelloWidget.tsx
import React from 'react';

export const HelloWidget: React.FC = () => {
  return (
    <div style={{ padding: 12 }}>
      <strong>Hello from HelloWorld Plugin!</strong>
    </div>
  );
};
```

```ts
// src/index.ts (excerpt)
export { HelloWidget } from './components/HelloWidget';
```

```json
// plugin.json (excerpt)
{
  "ui": {
    "widgets": [
      { "name": "HelloWidget", "entry": "dist/index.js#HelloWidget" }
    ]
  }
}
```

## Health Check Example

Expose a fast, reliable `healthCheck()` to enable platform health/status endpoints. Timeouts are treated as unhealthy.

```ts
async healthCheck(ctx: PluginContext): Promise<HealthStatus> {
  try {
    // Example: ping a lightweight dependency
    await ctx.runtime.ping?.();
    return { status: 'healthy' };
  } catch (err: unknown) {
    ctx.logger.warn('healthCheck failed', err);
    return { status: 'unhealthy', details: 'Ping failed' };
  }
}
```

## Building Your Plugin

1. Compile TypeScript to `dist/`.
2. Produce a deployable archive that includes only runtime assets.

```json
// package.json (scripts excerpt)
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "pack": "npm run build && node scripts/package-zip.js"
  }
}
```

Best practices:

- Exclude development artifacts from your package: `.d.ts`, `.map`, tests, hidden files, `node_modules`.
- Keep bundles small and deterministic.
- Ensure `plugin.json` `entry` points at your built file.

## Testing

Use your preferred runner (e.g., Vitest or Jest). Mock external systems and assert hook behavior.

```ts
// example with Vitest
import { describe, it, expect, vi } from 'vitest';
import HelloWorldPlugin from '../src';

describe('hello-world plugin', () => {
  it('registers middleware hook', async () => {
    const plugin = new HelloWorldPlugin();
    const hooks = plugin.getHooks();
    expect(hooks.middleware?.length).toBeGreaterThan(0);
  });
});
```

Aim for high coverage on business logic and critical workflows.

## Running Examples Locally

- Build your plugin and load it into the Qirvo runtime (dashboard or CLI) according to your environment.
- Ensure declared permissions match what your plugin actually requires.
- Validate your manifest and hook registration at startup via logs.

## Troubleshooting

- If your upload system filters files, remember that declaration files (`.d.ts`) and source maps are commonly excluded from runtime.
- Ensure canonical permissions are used everywhere (manifest, validation, sandbox).
- Keep `healthCheck()` fast and resilient; treat external failures as unhealthy with clear `details`.

## Contributing Examples

- Follow Conventional Commits (`feat:`, `fix:`, `docs:` …).
- Keep examples TypeScript-first, small, and well-documented.
- Run linters/formatters and include minimal tests for each example.

---

For deeper API details, see the SDK reference and the plugin lifecycle/hook documentation in this repository.
