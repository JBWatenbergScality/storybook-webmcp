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
