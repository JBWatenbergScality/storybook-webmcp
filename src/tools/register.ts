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
      safe(async () => getDocumentationForStory(args as { storyId: string } | { componentId: string; storyName: string }, await load())),
  });
};
