# storybook-webmcp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `storybook-webmcp`, a Storybook 10 addon that exposes the official `@storybook/mcp` "docs toolset" as WebMCP tools registered in the browser via `navigator.modelContext`, so a Storybook deployed on GitHub Pages can serve as an MCP source with no backend.

**Architecture:** Storybook preset that (a) auto-enables Storybook 10's `manifests` output so `storybook build` writes `/manifests/components.json` and `/manifests/docs.json`, and (b) injects a manager-iframe entry that imports `@mcp-b/global` (polyfill + MCP bridge for `navigator.modelContext`) and registers three pure tools whose handlers fetch the manifests from the same origin. Consumers (e.g. Claude Code) reach the page via `chrome-devtools-mcp --category-experimental-webmcp` on Chrome 149+.

**Tech Stack:** TypeScript (ESM), Storybook 10.3+, `@mcp-b/global`, vitest (Node unit tests), Playwright (browser integration), pnpm or npm workspaces for the fixture Storybook.

**Reference design spec:** `/Users/jbwatenberg/.claude/plans/i-want-to-build-greedy-pebble.md`

---

## File structure

```
storybook-webmcp/
├─ package.json                              created in Task 1
├─ tsconfig.json                             created in Task 1
├─ vitest.config.ts                          created in Task 1
├─ .gitignore                                created in Task 1
├─ README.md                                 updated in Task 16
├─ src/
│  ├─ preset.ts                              created in Task 13
│  ├─ manager.ts                             created in Task 12
│  └─ tools/
│     ├─ types.ts                            created in Task 3
│     ├─ manifests.ts                        created in Tasks 4-6
│     ├─ list-all-documentation.ts           created in Task 7
│     ├─ get-documentation.ts                created in Tasks 8-9
│     ├─ get-documentation-for-story.ts      created in Task 10
│     ├─ levenshtein.ts                      created in Task 9
│     ├─ register.ts                         created in Task 11
│     └─ __fixtures__/
│        ├─ components.minimal.json          created in Task 3
│        ├─ components.realistic.json        created in Task 3 (from real build)
│        └─ docs.json                        created in Task 3
├─ examples/
│  └─ fixture-sb/                            created in Tasks 2 & 14
└─ tests/
   └─ integration/
      └─ webmcp.spec.ts                      created in Task 15
playwright.config.ts                         created in Task 15
```

**Boundaries:**
- `tools/*.ts` (except `register.ts`) are pure functions: `(args, manifests) → result`. Node-testable, no browser dependencies.
- `register.ts` is the only place that calls `navigator.modelContext.registerTool`. Takes a `ModelContext`-shaped parameter so it's mockable in Node.
- `manager.ts` is glue: imports `@mcp-b/global`, then calls `registerDocsTools(navigator.modelContext)`.
- `preset.ts` is the only file Storybook sees. Resolves `manager.js` via `fileURLToPath(import.meta.resolve(...))`.

---

## Task 1: Scaffold the npm package

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "storybook-webmcp",
  "version": "0.0.0",
  "description": "Serverless WebMCP alternative to @storybook/mcp — exposes Storybook docs to AI agents via the W3C navigator.modelContext API from a static GitHub Pages build.",
  "type": "module",
  "license": "MIT",
  "main": "./dist/preset.js",
  "types": "./dist/preset.d.ts",
  "exports": {
    ".": {
      "types": "./dist/preset.d.ts",
      "default": "./dist/preset.js"
    },
    "./manager": {
      "types": "./dist/manager.d.ts",
      "default": "./dist/manager.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "peerDependencies": {
    "storybook": "^10.2.0"
  },
  "dependencies": {
    "@mcp-b/global": "^2.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "src/**/__fixtures__/**"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
storybook-static/
playwright-report/
test-results/
.DS_Store
*.log
```

- [ ] **Step 5: Initialize git and install deps**

```bash
cd /Users/jbwatenberg/projects/storybook-webmcp
git init
npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold storybook-webmcp package"
```

---

## Task 2: Scaffold the fixture Storybook

The fixture is a tiny React + Vite Storybook used for: (a) discovering the real manifest shape (Task 3), (b) integration test of the preset (Task 14), (c) Playwright e2e (Task 15).

**Files:**
- Create: `examples/fixture-sb/package.json`
- Create: `examples/fixture-sb/.storybook/main.ts`
- Create: `examples/fixture-sb/.storybook/preview.ts`
- Create: `examples/fixture-sb/src/Button.tsx` + `Button.stories.tsx`
- Create: `examples/fixture-sb/src/Card.tsx` + `Card.stories.tsx`
- Create: `examples/fixture-sb/src/Input.tsx` + `Input.stories.tsx`

- [ ] **Step 1: Create `examples/fixture-sb/package.json`**

```json
{
  "name": "fixture-sb",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build-storybook": "storybook build",
    "storybook": "storybook dev -p 6006"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@storybook/addon-docs": "^10.3.0",
    "@storybook/react-vite": "^10.3.0",
    "@types/react": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "storybook": "^10.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `.storybook/main.ts`**

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: { name: '@storybook/react-vite', options: {} },
};

export default config;
```

- [ ] **Step 3: Create `.storybook/preview.ts`**

```ts
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {};

export default preview;
```

- [ ] **Step 4: Create three trivial components with stories**

`src/Button.tsx`:
```tsx
export type ButtonProps = {
  /** Visible label */
  label: string;
  /** Visual variant */
  variant?: 'primary' | 'secondary';
  /** Click handler */
  onClick?: () => void;
};

export const Button = ({ label, variant = 'primary', onClick }: ButtonProps) => (
  <button type="button" data-variant={variant} onClick={onClick}>{label}</button>
);
```

`src/Button.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = { component: Button, tags: ['autodocs'] };
export default meta;

export const Primary: StoryObj<typeof Button> = { args: { label: 'Click me' } };
export const Secondary: StoryObj<typeof Button> = { args: { label: 'Click me', variant: 'secondary' } };
export const LongLabel: StoryObj<typeof Button> = { args: { label: 'Click me, I have a very long label' } };
export const Quiet: StoryObj<typeof Button> = { args: { label: 'shh', variant: 'secondary' } };
```

`src/Card.tsx`:
```tsx
export type CardProps = {
  /** Card title */
  title: string;
  /** Card body content */
  children?: React.ReactNode;
};

export const Card = ({ title, children }: CardProps) => (
  <section><h3>{title}</h3>{children}</section>
);
```

`src/Card.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = { component: Card, tags: ['autodocs'] };
export default meta;

export const Empty: StoryObj<typeof Card> = { args: { title: 'A card' } };
export const WithBody: StoryObj<typeof Card> = { args: { title: 'A card', children: 'Body text' } };
```

`src/Input.tsx`:
```tsx
export type InputProps = {
  /** Placeholder text */
  placeholder?: string;
  /** Disable the input */
  disabled?: boolean;
};

export const Input = ({ placeholder, disabled }: InputProps) => (
  <input type="text" placeholder={placeholder} disabled={disabled} />
);
```

`src/Input.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = { component: Input, tags: ['autodocs'] };
export default meta;

export const Default: StoryObj<typeof Input> = { args: { placeholder: 'Type here' } };
export const Disabled: StoryObj<typeof Input> = { args: { placeholder: 'Type here', disabled: true } };
```

- [ ] **Step 5: Install fixture deps**

```bash
cd /Users/jbwatenberg/projects/storybook-webmcp/examples/fixture-sb
npm install
```

- [ ] **Step 6: Verify the fixture builds without manifests yet**

```bash
npm run build-storybook
ls storybook-static/index.html
```

Expected: `storybook-static/index.html` exists. `storybook-static/manifests/components.json` does NOT exist yet (manifests preset isn't enabled).

- [ ] **Step 7: Commit**

```bash
cd /Users/jbwatenberg/projects/storybook-webmcp
git add examples/
git commit -m "chore: scaffold fixture Storybook with three components"
```

---

## Task 3: Discover the real manifest shape and lock fixtures + types

The Storybook docs warn the manifest schema is "preview, not yet a stable public API." This task discovers the real shape so all downstream tasks code against reality, not guesses.

**Files:**
- Modify: `examples/fixture-sb/.storybook/main.ts`
- Create: `src/tools/__fixtures__/components.realistic.json` (from real build)
- Create: `src/tools/__fixtures__/components.minimal.json` (hand-authored, same shape)
- Create: `src/tools/__fixtures__/docs.json` (hand-authored)
- Create: `src/tools/types.ts`

- [ ] **Step 1: Enable manifests in the fixture's `main.ts`**

The Storybook 10.2+ extensible `manifests` preset property is documented at <https://storybook.js.org/docs/ai/manifests>. The minimal opt-in is to declare `manifests: {}` (or `manifests: true` if accepted) — verify the accepted shape from `storybook` source if both fail. Edit `examples/fixture-sb/.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: { name: '@storybook/react-vite', options: {} },
  // Opt in to manifest emission. If `{}` doesn't work, try `true`,
  // or inspect node_modules/storybook/dist/types*.d.ts for the schema.
  manifests: {},
};

export default config;
```

- [ ] **Step 2: Rebuild and confirm manifests appear**

```bash
cd /Users/jbwatenberg/projects/storybook-webmcp/examples/fixture-sb
npm run build-storybook
ls storybook-static/manifests/
```

Expected: `components.json` (and possibly `docs.json`) listed. If not, adjust the preset declaration in Step 1 until they appear. Document the working shape inline in the file as a comment.

- [ ] **Step 3: Copy the real manifest as the realistic fixture**

```bash
cp examples/fixture-sb/storybook-static/manifests/components.json \
   src/tools/__fixtures__/components.realistic.json
# Only copy docs.json if it was emitted:
[ -f examples/fixture-sb/storybook-static/manifests/docs.json ] && \
  cp examples/fixture-sb/storybook-static/manifests/docs.json \
     src/tools/__fixtures__/docs.json
```

- [ ] **Step 4: Read the realistic fixture and define `src/tools/types.ts`**

Read `src/tools/__fixtures__/components.realistic.json` and write types that exactly match its top-level shape. Below is the **expected** skeleton based on Storybook's documented tool semantics; **adjust to match what's actually in the file** (field names may differ — e.g. `v` vs `schemaVersion` vs no version field).

```ts
// src/tools/types.ts
//
// Source of truth: src/tools/__fixtures__/components.realistic.json
// Adjust this file when Storybook's manifest schema changes.

export type SchemaVersion = number;

export type StoryEntry = {
  id: string;
  name: string;
  source?: string;
  args?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
};

export type PropDef = {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
};

export type AttachedDoc = {
  id: string;
  title?: string;
  content?: string;
};

export type ComponentEntry = {
  id: string;
  title: string;
  componentPath?: string;
  description?: string;
  props?: PropDef[];
  stories: StoryEntry[];
  docs?: AttachedDoc[];
  tags?: string[];
};

export type ComponentsManifest = {
  // Replace with whatever the real version field is called (e.g. `v`).
  // If there's no version field, change SUPPORTED_VERSIONS in manifests.ts
  // to validate structurally.
  schemaVersion?: SchemaVersion;
  entries: Record<string, ComponentEntry>;
};

export type DocsManifestEntry = {
  id: string;
  title: string;
  content?: string;
  tags?: string[];
};

export type DocsManifest = {
  schemaVersion?: SchemaVersion;
  entries: Record<string, DocsManifestEntry>;
};
```

- [ ] **Step 5: Create the minimal fixture (`components.minimal.json`)**

Hand-write a small file in the same shape. Two components, a couple of stories each, no docs. Example:

```json
{
  "schemaVersion": 1,
  "entries": {
    "ui-button": {
      "id": "ui-button",
      "title": "UI/Button",
      "componentPath": "src/Button.tsx",
      "description": "A primary action button.",
      "props": [
        { "name": "label", "type": "string", "required": true, "description": "Visible label" },
        { "name": "variant", "type": "'primary' | 'secondary'", "required": false, "defaultValue": "primary" }
      ],
      "stories": [
        { "id": "ui-button--primary", "name": "Primary", "args": { "label": "Click me" } },
        { "id": "ui-button--secondary", "name": "Secondary", "args": { "label": "Click me", "variant": "secondary" } }
      ],
      "tags": ["autodocs", "manifest"]
    },
    "ui-input": {
      "id": "ui-input",
      "title": "UI/Input",
      "componentPath": "src/Input.tsx",
      "props": [
        { "name": "placeholder", "type": "string", "required": false }
      ],
      "stories": [
        { "id": "ui-input--default", "name": "Default", "args": { "placeholder": "Type here" } }
      ]
    }
  }
}
```

Update field names to match the schema you observed in Step 4.

- [ ] **Step 6: Create the docs fixture (`docs.json`)**

```json
{
  "schemaVersion": 1,
  "entries": {
    "intro": { "id": "intro", "title": "Introduction", "content": "Welcome to the design system." },
    "tokens": { "id": "tokens", "title": "Design Tokens", "content": "Spacing, color, typography." }
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add examples/fixture-sb/.storybook/main.ts src/tools/types.ts src/tools/__fixtures__/
git commit -m "feat: discover Storybook 10 manifest shape; add fixtures and types"
```

---

## Task 4: `loadManifests` — happy path

**Files:**
- Create: `src/tools/manifests.test.ts`
- Create: `src/tools/manifests.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/manifests.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loadManifests, __resetManifestCache } from './manifests';
import minimal from './__fixtures__/components.minimal.json';
import docs from './__fixtures__/docs.json';

const mockFetch = (responses: Record<string, { status: number; body?: unknown }>) => {
  return vi.fn(async (url: string) => {
    const key = Object.keys(responses).find((k) => url.endsWith(k));
    if (!key) throw new Error(`unexpected fetch: ${url}`);
    const { status, body } = responses[key]!;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });
};

describe('loadManifests', () => {
  beforeEach(() => __resetManifestCache());

  it('returns parsed components and docs from same-origin fetches', async () => {
    const fetchImpl = mockFetch({
      '/manifests/components.json': { status: 200, body: minimal },
      '/manifests/docs.json': { status: 200, body: docs },
    });
    const result = await loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl });
    expect(result.components).toEqual(minimal);
    expect(result.docs).toEqual(docs);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/tools/manifests.test.ts
```

Expected: FAIL with `Cannot find module './manifests'`.

- [ ] **Step 3: Implement minimal `manifests.ts`**

```ts
// src/tools/manifests.ts
import type { ComponentsManifest, DocsManifest } from './types';

export type LoadOptions = {
  baseHref: string;
  fetchImpl?: typeof fetch;
};

export type Manifests = {
  components: ComponentsManifest;
  docs?: DocsManifest;
};

let cache: Promise<Manifests> | null = null;

export const __resetManifestCache = () => { cache = null; };

export const loadManifests = async ({ baseHref, fetchImpl = fetch }: LoadOptions): Promise<Manifests> => {
  if (cache) return cache;
  cache = (async () => {
    const base = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
    const componentsRes = await fetchImpl(`${base}manifests/components.json`);
    const components = (await componentsRes.json()) as ComponentsManifest;
    const docsRes = await fetchImpl(`${base}manifests/docs.json`);
    const docs = docsRes.ok ? ((await docsRes.json()) as DocsManifest) : undefined;
    return { components, docs };
  })();
  return cache;
};
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/tools/manifests.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/manifests.ts src/tools/manifests.test.ts
git commit -m "feat(manifests): loadManifests happy path with cache"
```

---

## Task 5: `loadManifests` — 404 → clear error

**Files:**
- Modify: `src/tools/manifests.test.ts`
- Modify: `src/tools/manifests.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/tools/manifests.test.ts`:

```ts
it('throws ManifestNotFoundError on 404 with a rebuild hint', async () => {
  const fetchImpl = mockFetch({
    '/manifests/components.json': { status: 404 },
  });
  await expect(
    loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl }),
  ).rejects.toThrow(/storybook-webmcp.*rebuild/i);
});
```

Also import the error at the top:
```ts
import { loadManifests, __resetManifestCache, ManifestNotFoundError } from './manifests';
```

And add a second assertion that the thrown error is `instanceof ManifestNotFoundError`:
```ts
await expect(
  loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl }),
).rejects.toBeInstanceOf(ManifestNotFoundError);
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/tools/manifests.test.ts
```

Expected: FAIL — error not thrown with the right type.

- [ ] **Step 3: Implement**

Add to `src/tools/manifests.ts`:

```ts
export class ManifestNotFoundError extends Error {
  constructor(url: string) {
    super(
      `storybook-webmcp: ${url} returned 404. ` +
      `Make sure storybook-webmcp is in your .storybook/main.ts addons array, ` +
      `then rebuild Storybook (npm run build-storybook).`,
    );
    this.name = 'ManifestNotFoundError';
  }
}
```

Modify the body of `loadManifests` to check `componentsRes.status === 404` and throw:

```ts
const componentsUrl = `${base}manifests/components.json`;
const componentsRes = await fetchImpl(componentsUrl);
if (componentsRes.status === 404) throw new ManifestNotFoundError(componentsUrl);
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/tools/manifests.test.ts
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/manifests.ts src/tools/manifests.test.ts
git commit -m "feat(manifests): throw ManifestNotFoundError with rebuild hint"
```

---

## Task 6: `loadManifests` — schema version guard + cache verification

**Files:**
- Modify: `src/tools/manifests.test.ts`
- Modify: `src/tools/manifests.ts`

- [ ] **Step 1: Add two failing tests**

```ts
it('throws SchemaVersionError on an unknown manifest version', async () => {
  const fetchImpl = mockFetch({
    '/manifests/components.json': { status: 200, body: { schemaVersion: 999, entries: {} } },
  });
  await expect(
    loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl }),
  ).rejects.toThrow(/schemaVersion.*999/);
});

it('caches results so a second call does not re-fetch', async () => {
  const fetchImpl = mockFetch({
    '/manifests/components.json': { status: 200, body: minimal },
    '/manifests/docs.json': { status: 200, body: docs },
  });
  await loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl });
  await loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(2); // components + docs, not 4
});
```

Add the import: `import { ..., SchemaVersionError } from './manifests';`

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/tools/manifests.test.ts
```

Expected: both new tests FAIL.

- [ ] **Step 3: Implement schema guard**

In `src/tools/manifests.ts`:

```ts
// Bump when we've verified compatibility with a new shape.
export const SUPPORTED_SCHEMA_VERSIONS = [1] as const;

export class SchemaVersionError extends Error {
  constructor(field: string, got: unknown) {
    super(
      `storybook-webmcp: unsupported manifest ${field}=${JSON.stringify(got)}. ` +
      `Supported: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}. ` +
      `Upgrade or downgrade storybook-webmcp to a version that matches your Storybook.`,
    );
    this.name = 'SchemaVersionError';
  }
}

const assertSchema = (m: ComponentsManifest) => {
  // If the real manifest has no version field, replace this with structural checks
  // (e.g. assert presence of `entries` and that each entry has `id`, `stories`).
  if (m.schemaVersion !== undefined && !SUPPORTED_SCHEMA_VERSIONS.includes(m.schemaVersion as 1)) {
    throw new SchemaVersionError('schemaVersion', m.schemaVersion);
  }
};
```

Then call `assertSchema(components)` inside `loadManifests`, after parsing components and before returning.

> If Task 3 discovered that the version field is named differently (e.g. `v`) or absent, update `assertSchema` accordingly. The test in Step 1 uses `schemaVersion` because the fixtures use that name; if the real shape uses a different name, update both the fixtures and the test to match.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/tools/manifests.test.ts
```

Expected: all four tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/manifests.ts src/tools/manifests.test.ts
git commit -m "feat(manifests): schema version guard and cache test"
```

---

## Task 7: `list-all-documentation` tool

**Files:**
- Create: `src/tools/list-all-documentation.test.ts`
- Create: `src/tools/list-all-documentation.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/tools/list-all-documentation.test.ts
import { describe, expect, it } from 'vitest';
import { listAllDocumentation } from './list-all-documentation';
import minimal from './__fixtures__/components.minimal.json';
import docs from './__fixtures__/docs.json';
import type { ComponentsManifest, DocsManifest } from './types';

describe('listAllDocumentation', () => {
  it('returns a compact index of components from components.json', () => {
    const result = listAllDocumentation({
      components: minimal as ComponentsManifest,
    });
    expect(result.components).toEqual([
      { id: 'ui-button', title: 'UI/Button', tags: ['autodocs', 'manifest'], hasDocs: false, storyCount: 2 },
      { id: 'ui-input', title: 'UI/Input', tags: [], hasDocs: false, storyCount: 1 },
    ]);
    expect(result.docs).toEqual([]);
  });

  it('includes unattached docs from docs.json when present', () => {
    const result = listAllDocumentation({
      components: minimal as ComponentsManifest,
      docs: docs as DocsManifest,
    });
    expect(result.docs).toEqual([
      { id: 'intro', title: 'Introduction', type: 'docs' },
      { id: 'tokens', title: 'Design Tokens', type: 'docs' },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/tools/list-all-documentation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/tools/list-all-documentation.ts
import type { ComponentsManifest, DocsManifest } from './types';

export type ComponentIndexEntry = {
  id: string;
  title: string;
  tags: string[];
  hasDocs: boolean;
  storyCount: number;
};

export type DocsIndexEntry = { id: string; title: string; type: 'docs' };

export type ListAllDocumentationResult = {
  components: ComponentIndexEntry[];
  docs: DocsIndexEntry[];
};

export const listAllDocumentation = (
  manifests: { components: ComponentsManifest; docs?: DocsManifest },
): ListAllDocumentationResult => {
  const components: ComponentIndexEntry[] = Object.values(manifests.components.entries).map((c) => ({
    id: c.id,
    title: c.title,
    tags: c.tags ?? [],
    hasDocs: (c.docs?.length ?? 0) > 0,
    storyCount: c.stories.length,
  }));
  const docs: DocsIndexEntry[] = manifests.docs
    ? Object.values(manifests.docs.entries).map((d) => ({ id: d.id, title: d.title, type: 'docs' as const }))
    : [];
  return { components, docs };
};
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/tools/list-all-documentation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/list-all-documentation.ts src/tools/list-all-documentation.test.ts
git commit -m "feat(tool): list-all-documentation"
```

---

## Task 8: `get-documentation` — happy path

**Files:**
- Create: `src/tools/get-documentation.test.ts`
- Create: `src/tools/get-documentation.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/get-documentation.test.ts
import { describe, expect, it } from 'vitest';
import { getDocumentation } from './get-documentation';
import minimal from './__fixtures__/components.minimal.json';
import type { ComponentsManifest } from './types';

const m = { components: minimal as ComponentsManifest };

describe('getDocumentation', () => {
  it('returns props, first <=3 stories, and a story index for the rest', () => {
    const result = getDocumentation({ id: 'ui-button' }, m);
    expect(result).toMatchObject({
      id: 'ui-button',
      title: 'UI/Button',
      description: 'A primary action button.',
      props: [
        { name: 'label', type: 'string', required: true, description: 'Visible label' },
        { name: 'variant', type: "'primary' | 'secondary'", required: false, defaultValue: 'primary' },
      ],
      attachedDocs: [],
    });
    expect(result.firstStories).toHaveLength(2);
    expect(result.remainingStoryIndex).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/tools/get-documentation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/tools/get-documentation.ts
import type { ComponentsManifest, ComponentEntry, StoryEntry } from './types';

export type GetDocumentationArgs = { id: string };

export type GetDocumentationResult = {
  id: string;
  title: string;
  description?: string;
  props: ComponentEntry['props'];
  firstStories: StoryEntry[];
  remainingStoryIndex: { id: string; name: string }[];
  attachedDocs: string[];
};

export const getDocumentation = (
  args: GetDocumentationArgs,
  manifests: { components: ComponentsManifest },
): GetDocumentationResult => {
  const entry = manifests.components.entries[args.id];
  if (!entry) throw new Error(`component not found: ${args.id}`); // refined in Task 9
  const stories = entry.stories ?? [];
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    props: entry.props ?? [],
    firstStories: stories.slice(0, 3),
    remainingStoryIndex: stories.slice(3).map((s) => ({ id: s.id, name: s.name })),
    attachedDocs: (entry.docs ?? []).map((d) => d.id),
  };
};
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/tools/get-documentation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-documentation.ts src/tools/get-documentation.test.ts
git commit -m "feat(tool): get-documentation happy path"
```

---

## Task 9: `get-documentation` — not-found with Levenshtein suggestions

**Files:**
- Create: `src/tools/levenshtein.ts`
- Create: `src/tools/levenshtein.test.ts`
- Modify: `src/tools/get-documentation.test.ts`
- Modify: `src/tools/get-documentation.ts`

- [ ] **Step 1: Write the levenshtein test**

```ts
// src/tools/levenshtein.test.ts
import { describe, expect, it } from 'vitest';
import { closestMatches } from './levenshtein';

describe('closestMatches', () => {
  it('returns up to k closest strings by edit distance', () => {
    const candidates = ['ui-button', 'ui-input', 'ui-card', 'ui-modal'];
    expect(closestMatches('ui-buton', candidates, 2)).toEqual(['ui-button', 'ui-input']);
  });

  it('returns at most k results even if more candidates exist', () => {
    expect(closestMatches('x', ['a', 'b', 'c', 'd'], 2)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/tools/levenshtein.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `levenshtein.ts`**

```ts
// src/tools/levenshtein.ts
const distance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j]!, dp[j - 1]!);
      prev = tmp;
    }
  }
  return dp[b.length]!;
};

export const closestMatches = (needle: string, candidates: string[], k: number): string[] =>
  candidates
    .map((c) => ({ c, d: distance(needle, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((x) => x.c);
```

- [ ] **Step 4: Run levenshtein tests**

```bash
npx vitest run src/tools/levenshtein.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add the not-found test for `get-documentation`**

Append to `src/tools/get-documentation.test.ts`:

```ts
it('throws ComponentNotFoundError with up to 5 closest id suggestions', async () => {
  expect(() => getDocumentation({ id: 'ui-buton' }, m))
    .toThrowError(/not found.*ui-button/);
});
```

Add the import: `import { getDocumentation, ComponentNotFoundError } from './get-documentation';`

Then a stricter assertion:
```ts
try {
  getDocumentation({ id: 'ui-buton' }, m);
  throw new Error('should not reach');
} catch (e) {
  expect(e).toBeInstanceOf(ComponentNotFoundError);
  expect((e as ComponentNotFoundError).suggestions).toContain('ui-button');
}
```

- [ ] **Step 6: Implement not-found behaviour**

Replace the throw in `get-documentation.ts` with:

```ts
import { closestMatches } from './levenshtein';

export class ComponentNotFoundError extends Error {
  readonly suggestions: string[];
  constructor(id: string, suggestions: string[]) {
    super(`component not found: ${id}. Did you mean: ${suggestions.join(', ')}?`);
    this.name = 'ComponentNotFoundError';
    this.suggestions = suggestions;
  }
}
```

And in `getDocumentation`:

```ts
if (!entry) {
  const suggestions = closestMatches(args.id, Object.keys(manifests.components.entries), 5);
  throw new ComponentNotFoundError(args.id, suggestions);
}
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/tools/levenshtein.ts src/tools/levenshtein.test.ts src/tools/get-documentation.ts src/tools/get-documentation.test.ts
git commit -m "feat(tool): get-documentation not-found with suggestions"
```

---

## Task 10: `get-documentation-for-story` — both arg shapes

**Files:**
- Create: `src/tools/get-documentation-for-story.test.ts`
- Create: `src/tools/get-documentation-for-story.ts`

- [ ] **Step 1: Write failing tests for both arg shapes**

```ts
// src/tools/get-documentation-for-story.test.ts
import { describe, expect, it } from 'vitest';
import { getDocumentationForStory, StoryNotFoundError } from './get-documentation-for-story';
import minimal from './__fixtures__/components.minimal.json';
import type { ComponentsManifest } from './types';

const m = { components: minimal as ComponentsManifest };

describe('getDocumentationForStory', () => {
  it('resolves by storyId', () => {
    const r = getDocumentationForStory({ storyId: 'ui-button--primary' }, m);
    expect(r).toMatchObject({ storyId: 'ui-button--primary', componentId: 'ui-button', name: 'Primary' });
  });

  it('resolves by componentId + storyName', () => {
    const r = getDocumentationForStory({ componentId: 'ui-button', storyName: 'Secondary' }, m);
    expect(r).toMatchObject({ storyId: 'ui-button--secondary', componentId: 'ui-button', name: 'Secondary' });
  });

  it('throws StoryNotFoundError when story missing', () => {
    expect(() => getDocumentationForStory({ storyId: 'ui-button--missing' }, m))
      .toThrowError(StoryNotFoundError);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/tools/get-documentation-for-story.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/tools/get-documentation-for-story.ts
import type { ComponentsManifest, StoryEntry } from './types';
import { closestMatches } from './levenshtein';

export type GetDocumentationForStoryArgs =
  | { storyId: string }
  | { componentId: string; storyName: string };

export type GetDocumentationForStoryResult = StoryEntry & {
  storyId: string;
  componentId: string;
  attachedDocs: string[];
};

export class StoryNotFoundError extends Error {
  readonly suggestions: string[];
  constructor(needle: string, suggestions: string[]) {
    super(`story not found: ${needle}. Did you mean: ${suggestions.join(', ')}?`);
    this.name = 'StoryNotFoundError';
    this.suggestions = suggestions;
  }
}

export const getDocumentationForStory = (
  args: GetDocumentationForStoryArgs,
  manifests: { components: ComponentsManifest },
): GetDocumentationForStoryResult => {
  const allEntries = Object.values(manifests.components.entries);
  let componentId: string | undefined;
  let story: StoryEntry | undefined;

  if ('storyId' in args) {
    for (const c of allEntries) {
      const s = c.stories.find((s) => s.id === args.storyId);
      if (s) { componentId = c.id; story = s; break; }
    }
    if (!story) {
      const all = allEntries.flatMap((c) => c.stories.map((s) => s.id));
      throw new StoryNotFoundError(args.storyId, closestMatches(args.storyId, all, 5));
    }
  } else {
    const c = manifests.components.entries[args.componentId];
    if (c) {
      componentId = c.id;
      story = c.stories.find((s) => s.name === args.storyName);
    }
    if (!story) {
      const all = c ? c.stories.map((s) => s.name) : Object.keys(manifests.components.entries);
      throw new StoryNotFoundError(`${args.componentId}/${args.storyName}`, closestMatches(args.storyName, all, 5));
    }
  }

  const owner = manifests.components.entries[componentId!]!;
  return {
    ...story,
    storyId: story.id,
    componentId: componentId!,
    attachedDocs: (owner.docs ?? []).map((d) => d.id),
  };
};
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-documentation-for-story.ts src/tools/get-documentation-for-story.test.ts
git commit -m "feat(tool): get-documentation-for-story (both arg shapes)"
```

---

## Task 11: `register.ts` — wire tools to `navigator.modelContext` (mockable)

**Files:**
- Create: `src/tools/register.test.ts`
- Create: `src/tools/register.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tools/register.test.ts
import { describe, expect, it, vi } from 'vitest';
import { registerDocsTools } from './register';

describe('registerDocsTools', () => {
  it('registers exactly three tools with stable names and JSON schemas', () => {
    const registerTool = vi.fn();
    const ctx = { registerTool };
    registerDocsTools(ctx, { baseHref: 'https://example.com/sb/' });
    expect(registerTool).toHaveBeenCalledTimes(3);
    const names = registerTool.mock.calls.map((c) => c[0].name);
    expect(names).toEqual([
      'storybook.list-all-documentation',
      'storybook.get-documentation',
      'storybook.get-documentation-for-story',
    ]);
    for (const [tool] of registerTool.mock.calls) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toHaveProperty('type', 'object');
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('a registered tool handler returns MCP-shaped errors on failure', async () => {
    const registerTool = vi.fn();
    const ctx = { registerTool };
    registerDocsTools(ctx, {
      baseHref: 'https://example.com/sb/',
      fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response,
    });
    const listAll = registerTool.mock.calls.find((c) => c[0].name === 'storybook.list-all-documentation')![0];
    const result = await listAll.execute({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/rebuild/i);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/tools/register.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/tools/register.ts
import { loadManifests, __resetManifestCache } from './manifests';
import { listAllDocumentation } from './list-all-documentation';
import { getDocumentation } from './get-documentation';
import { getDocumentationForStory } from './get-documentation-for-story';

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: unknown) => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>;
};

export type ModelContextLike = {
  registerTool: (tool: ToolDef) => void;
};

export type RegisterOptions = {
  baseHref: string;
  fetchImpl?: typeof fetch;
};

const ok = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }],
});

const err = (msg: string) => ({
  content: [{ type: 'text' as const, text: msg }],
  isError: true,
});

const safe = async <T>(fn: () => Promise<T>) => {
  try { return ok(await fn()); }
  catch (e) { return err((e as Error).message); }
};

export const registerDocsTools = (ctx: ModelContextLike, opts: RegisterOptions) => {
  __resetManifestCache();
  const load = () => loadManifests({ baseHref: opts.baseHref, fetchImpl: opts.fetchImpl });

  ctx.registerTool({
    name: 'storybook.list-all-documentation',
    description: 'List all components and unattached docs in this Storybook.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: () => safe(async () => listAllDocumentation(await load())),
  });

  ctx.registerTool({
    name: 'storybook.get-documentation',
    description: 'Get full documentation (props, first 3 stories, story index) for one component by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Component id, e.g. ui-button.' } },
      required: ['id'],
      additionalProperties: false,
    },
    execute: (args: unknown) =>
      safe(async () => getDocumentation(args as { id: string }, await load())),
  });

  ctx.registerTool({
    name: 'storybook.get-documentation-for-story',
    description: 'Get a single story by storyId, or by componentId + storyName.',
    inputSchema: {
      type: 'object',
      oneOf: [
        { required: ['storyId'], properties: { storyId: { type: 'string' } } },
        { required: ['componentId', 'storyName'], properties: { componentId: { type: 'string' }, storyName: { type: 'string' } } },
      ],
      additionalProperties: false,
    },
    execute: (args: unknown) =>
      safe(async () => getDocumentationForStory(args as Parameters<typeof getDocumentationForStory>[0], await load())),
  });
};
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/register.ts src/tools/register.test.ts
git commit -m "feat(register): wire three tools to a ModelContext-like target"
```

---

## Task 12: `manager.ts` — manager-iframe entry

**Files:**
- Create: `src/manager.ts`

- [ ] **Step 1: Write the entry**

```ts
// src/manager.ts
// Manager-iframe entry. Side-effect import installs/polyfills
// navigator.modelContext (W3C Web Model Context API) and bridges to MCP.
import '@mcp-b/global';
import { registerDocsTools } from './tools/register';

const baseHref = (() => {
  const base = document.querySelector('base')?.getAttribute('href');
  if (base) return new URL(base, window.location.href).toString();
  // Storybook builds at the deployment root; strip the manager html.
  return window.location.href.replace(/[^/]*$/, '');
})();

registerDocsTools(navigator.modelContext as unknown as { registerTool: (t: unknown) => void } & object,
  { baseHref });
```

> No unit test here — coverage is the Playwright e2e in Task 15. This file is intentionally tiny.

- [ ] **Step 2: Type-check builds cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors. If `navigator.modelContext` typing complains, fall back to `(navigator as any).modelContext` with a `// eslint-disable-next-line` and a comment pointing at the standard.

- [ ] **Step 3: Commit**

```bash
git add src/manager.ts
git commit -m "feat(manager): bootstrap entry — polyfill + register"
```

---

## Task 13: `preset.ts` — Storybook 10 preset (managerEntries + manifests merger)

**Files:**
- Create: `src/preset.ts`

- [ ] **Step 1: Write the preset**

```ts
// src/preset.ts
// Storybook 10 preset entry. Storybook 10 is ESM-only — resolve sibling files
// via import.meta.resolve + fileURLToPath, NOT require.resolve.
import { fileURLToPath } from 'node:url';

export const managerEntries = async (existing: string[] = []) => [
  ...existing,
  fileURLToPath(import.meta.resolve('./manager.js')),
];

// Auto-enable Storybook 10.2+ manifests output so /manifests/components.json
// is emitted in `storybook build`. Adjust the merge shape if Task 3 found
// a different shape for this preset option.
export const manifests = (existing: unknown) => {
  if (existing === undefined || existing === false) return {};
  return existing; // user-provided config wins
};
```

- [ ] **Step 2: Build the package**

```bash
npm run build
ls dist/preset.js dist/manager.js
```

Expected: both files exist.

- [ ] **Step 3: Commit**

```bash
git add src/preset.ts
git commit -m "feat(preset): managerEntries + auto-enable manifests"
```

---

## Task 14: Wire the addon into the fixture Storybook; assert build outputs

**Files:**
- Modify: `examples/fixture-sb/package.json`
- Modify: `examples/fixture-sb/.storybook/main.ts`
- Create: `examples/fixture-sb/build-asserts.test.ts` (run with vitest from repo root)
- Modify: `vitest.config.ts`

- [ ] **Step 1: Link the addon as a local dependency in the fixture**

In `examples/fixture-sb/package.json`, add to `devDependencies`:

```json
"storybook-webmcp": "file:../.."
```

Then:

```bash
cd /Users/jbwatenberg/projects/storybook-webmcp
npm run build
cd examples/fixture-sb
npm install
```

- [ ] **Step 2: Remove the explicit `manifests: {}` and add the addon**

Edit `examples/fixture-sb/.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', 'storybook-webmcp'],
  framework: { name: '@storybook/react-vite', options: {} },
  // No `manifests:` line — the addon enables it.
};

export default config;
```

- [ ] **Step 3: Rebuild and confirm outputs**

```bash
cd examples/fixture-sb
npm run build-storybook
ls storybook-static/manifests/components.json
grep -l 'storybook-webmcp' storybook-static/*.html storybook-static/sb-manager/*.js 2>/dev/null | head
```

Expected: `components.json` exists; the manager bundle references our entry (path will vary).

- [ ] **Step 4: Add a vitest assertion that codifies the above**

`examples/fixture-sb/build-asserts.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'storybook-static');

describe('fixture-sb build outputs', () => {
  it('emits /manifests/components.json', () => {
    expect(existsSync(path.join(out, 'manifests', 'components.json'))).toBe(true);
  });

  it('manager bundle references the storybook-webmcp manager entry', () => {
    const candidates = [path.join(out, 'sb-manager'), out];
    const haystack = candidates
      .filter(existsSync)
      .flatMap((d) => readdirSync(d).map((f) => path.join(d, f)))
      .filter((p) => p.endsWith('.js'))
      .map((p) => readFileSync(p, 'utf8'))
      .join('\n');
    expect(haystack).toMatch(/storybook-webmcp|modelContext/);
  });
});
```

- [ ] **Step 5: Extend `vitest.config.ts` to include this test**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'examples/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 6: Run all unit + build-assert tests**

```bash
cd /Users/jbwatenberg/projects/storybook-webmcp
npx vitest run
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add examples/fixture-sb/ vitest.config.ts
git commit -m "test: integrate storybook-webmcp into fixture and assert build outputs"
```

---

## Task 15: Playwright e2e — exercise tools inside the built fixture

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/integration/webmcp.spec.ts`

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/integration',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:6007',
    headless: true,
  },
  webServer: {
    command: 'npx --yes http-server examples/fixture-sb/storybook-static -p 6007 -s --cors',
    url: 'http://localhost:6007',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
```

- [ ] **Step 2: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 3: Write the e2e test**

```ts
// tests/integration/webmcp.spec.ts
import { expect, test } from '@playwright/test';

test.beforeAll(async () => {
  // Static build must exist; the fixture build is part of CI but we re-run if missing.
  const { existsSync } = await import('node:fs');
  if (!existsSync('examples/fixture-sb/storybook-static/manifests/components.json')) {
    throw new Error('Run `npm --prefix examples/fixture-sb run build-storybook` before the e2e tests.');
  }
});

test('three storybook.* tools are registered and callable', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto('/');
  // Wait for the polyfill+register to run.
  await page.waitForFunction(() => (navigator as any).modelContext?.listTools, null, { timeout: 10_000 });

  const names = await page.evaluate(async () => {
    const tools = await (navigator as any).modelContext.listTools();
    return tools.map((t: { name: string }) => t.name).sort();
  });
  expect(names).toEqual([
    'storybook.get-documentation',
    'storybook.get-documentation-for-story',
    'storybook.list-all-documentation',
  ]);

  const listResult = await page.evaluate(async () => {
    const r = await (navigator as any).modelContext.callTool('storybook.list-all-documentation', {});
    return JSON.parse(r.content[0].text);
  });
  // Three components were authored in the fixture. Exact ids are generated by
  // Storybook from the story title and may include path prefixes — assert the
  // count and the presence of each component name (case-insensitive substring).
  expect(listResult.components).toHaveLength(3);
  const idsLower = listResult.components.map((c: { id: string }) => c.id.toLowerCase()).join(' ');
  for (const name of ['button', 'card', 'input']) expect(idsLower).toContain(name);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
```

> If `navigator.modelContext.listTools`/`callTool` shapes differ in `@mcp-b/global` v2.2 (e.g. it's `executeTool` or returns a different envelope), adjust the test to match the actual API surface. The package's README documents the exposed methods.

- [ ] **Step 4: Run the e2e**

```bash
cd /Users/jbwatenberg/projects/storybook-webmcp
npm --prefix examples/fixture-sb run build-storybook
npx playwright test
```

Expected: passes; one chromium test, ~3-5 seconds.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/integration/
git commit -m "test(e2e): Playwright exercises registered WebMCP tools in built fixture"
```

---

## Task 16: README + final polish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the README**

Sections:
1. **What it is** — one paragraph. Mention serverless / GitHub Pages / `@storybook/mcp` parity.
2. **Install** — `npm i -D storybook-webmcp`.
3. **Use** — add to `addons` array in `.storybook/main.ts` (show the 1-line diff). Mention it auto-enables manifests.
4. **Consume from Claude Code** — point at `chrome-devtools-mcp --category-experimental-webmcp` and the required Chrome flags (`--enable-features=WebMCPTesting,DevToolsWebMCPSupport`, Chrome 149+).
5. **What you get** — list the three tools with one-line descriptions.
6. **Non-goals** — verbatim from the design spec's Non-goals section.
7. **Manifest schema is a moving target** — pin a tight Storybook range; expect occasional bumps.

- [ ] **Step 2: Run full suite to be sure**

```bash
npm run test
npx playwright test
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README with install/use/consume instructions"
```

---

## Manual end-to-end verification (post-merge, in `scality/core-ui`)

Not a task in this plan — listed here so an engineer can repeat the design spec's Verification section against a real consumer:

1. `npm pack` in `storybook-webmcp` → produces a tarball.
2. In `scality/core-ui`: `npm i -D /path/to/storybook-webmcp-<version>.tgz`.
3. Add `'storybook-webmcp'` to `addons` in `.storybook/main.ts`.
4. `npm run build-storybook`; confirm `storybook-static/manifests/components.json` exists.
5. `npm run storybook:deploy`; confirm `https://scality.github.io/core-ui/manifests/components.json` returns 200.
6. Launch Chrome 149+ with `--enable-features=WebMCPTesting,DevToolsWebMCPSupport`; open the deployed Storybook URL.
7. In Claude Code, configure `chrome-devtools-mcp` with `--category-experimental-webmcp`. Call `list_webmcp_tools` → expect three `storybook.*` tools. Call `execute_webmcp_tool` for `storybook.list-all-documentation` → expect the component index.
