# storybook-webmcp

## What it is

`storybook-webmcp` is a Storybook 10 addon that exposes the same three documentation tools as Storybook's official `@storybook/mcp` server — but with no backend. It registers the tools directly in the browser via the W3C `navigator.modelContext` API (WebMCP), so a Storybook deployed on GitHub Pages (or any static host) can serve as an MCP source without a running Node process. This is a serverless alternative to [Storybook's official self-hosted MCP server](https://storybook.js.org/docs/ai/mcp/sharing#self-hosting-with-storybookmcp).

## Install

This package is published to GitHub Packages. Consumers need a `.npmrc` entry so npm resolves the `@jbwatenbergscality` scope from GitHub Packages, plus a token with `read:packages`:

```ini
# in consumer repo .npmrc
@jbwatenbergscality:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then:

```sh
npm i -D @jbwatenbergscality/storybook-webmcp
```

## Use

Add the addon to `.storybook/main.ts`:

```ts
addons: ['@storybook/addon-docs', '@jbwatenbergscality/storybook-webmcp']
```

The addon auto-enables `features.componentsManifest: true` and `experimental_manifests: {}` via its preset, so `storybook build` writes `/manifests/components.json`. If you need to override those settings, add them explicitly in your own `main.ts` — your config runs after addon presets and takes precedence.

## Consume from Claude Code (or another MCP client)

WebMCP requires **Chrome 149+**.

Configure `chrome-devtools-mcp` in your MCP client (e.g. `~/.claude/claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest", "--category-experimental-webmcp"]
    }
  }
}
```

Open the deployed Storybook in the configured Chrome tab. From Claude Code, `list_webmcp_tools` shows the three `storybook.*` tools and `execute_webmcp_tool` invokes them.

## What you get

Three tools registered via `navigator.modelContext`:

| Tool | Description |
|---|---|
| `storybook.list-all-documentation` | Index of all components and unattached docs pages |
| `storybook.get-documentation` | Full docs (props, first 3 stories, story index) for a component by id |
| `storybook.get-documentation-for-story` | Single story by storyId or componentId + storyName |

## Non-goals (v1)

- No dev/testing toolset — locally-relevant context is out of scope
- No status panel UI in the Storybook manager
- No non-React frameworks (matches Storybook's own manifest limitation today)
- No consumer transport besides `chrome-devtools-mcp` (no MCP-B local relay, no Chrome extension wiring)

## Manifest schema is a moving target

Storybook documents the manifests schema as "preview, not yet a stable public API." This addon pins a tight peer range (`storybook ^10.2.0`) and validates the version field (`v`) at runtime, throwing `SchemaVersionError` on unknown values. When Storybook bumps the schema, this addon needs an update.

## Local development

```sh
npm install
npm test
npm --prefix examples/fixture-sb run build-storybook
npm run test:e2e
```
