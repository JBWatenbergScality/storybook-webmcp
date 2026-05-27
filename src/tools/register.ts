// src/tools/register.ts
import { loadManifests, __resetManifestCache } from './manifests.js';
import { listAllDocumentation } from './list-all-documentation.js';
import { getDocumentation } from './get-documentation.js';
import { getDocumentationForStory } from './get-documentation-for-story.js';

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
    // Flat schema (no top-level oneOf): the MCP/Anthropic tool input_schema
    // rejects oneOf/anyOf/allOf at the top level. The two lookup modes are
    // conveyed via property descriptions; the resolver validates the
    // combination at runtime (StoryNotFoundError otherwise).
    description: 'Get a single story — either by storyId, OR by componentId + storyName.',
    inputSchema: {
      type: 'object',
      properties: {
        storyId: { type: 'string', description: 'Full story id, e.g. "components-button--primary". Provide this, OR componentId + storyName.' },
        componentId: { type: 'string', description: 'Component id, e.g. "components-button". Use together with storyName.' },
        storyName: { type: 'string', description: 'Story name, e.g. "Primary". Use together with componentId.' },
      },
      additionalProperties: false,
    },
    execute: (args: unknown) =>
      safe(async () => getDocumentationForStory(args as { storyId: string } | { componentId: string; storyName: string }, await load())),
  });
};
