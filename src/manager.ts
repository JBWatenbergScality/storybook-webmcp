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
