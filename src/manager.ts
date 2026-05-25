// src/manager.ts
// Manager-iframe entry. Side-effect import installs/polyfills
// navigator.modelContext (W3C Web Model Context API) and bridges to MCP.
import '@mcp-b/global';
import { registerDocsTools } from './tools/register';

// Storybook 10 may load this entry twice (once via the ./manager package export
// auto-discovery, and once via the managerEntries preset hook). Guard against
// duplicate registration by checking whether our tools are already present.
type ModelContextWithList = { registerTool: (t: unknown) => void; listTools?: () => Array<{ name: string }> };
const ctx = navigator.modelContext as unknown as ModelContextWithList & object;
const alreadyRegistered = typeof ctx.listTools === 'function' &&
  ctx.listTools().some((t) => t.name.startsWith('storybook.'));

if (!alreadyRegistered) {
  const baseHref = (() => {
    const base = document.querySelector('base')?.getAttribute('href');
    if (base) return new URL(base, window.location.href).toString();
    // Storybook builds at the deployment root; strip the manager html.
    return window.location.href.replace(/[^/]*$/, '');
  })();

  registerDocsTools(ctx, { baseHref });
}
