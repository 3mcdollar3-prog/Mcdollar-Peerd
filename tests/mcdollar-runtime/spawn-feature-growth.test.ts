import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { collectStaticModuleGraph } from '../../packaging/static-module-graph.ts';

const extension = join(process.cwd(), 'extension');
const relativeGraph = async (entry: string) => new Set(
  [...await collectStaticModuleGraph(extension, join(extension, entry))]
    .map((file) => relative(extension, file)),
);

describe('spawn feature-count independence', () => {
  test('the fixed spawn lifecycle owner has no semantic inventory or exposure imports', async () => {
    const graph = await relativeGraph('mcdollar-runtime/actor/spawn.js');
    for (const forbidden of [
      'mcdollar-runtime/tools/exposure.js',
      'mcdollar-runtime/tools/manifests.js',
      'mcdollar-runtime/tools/metadata/descriptor.js',
      'mcdollar-runtime/tools/metadata/catalog.js',
      'mcdollar-runtime/controller-tool-projection.js',
      'mcdollar-runtime/controller-tool-ownership.js',
    ]) expect(graph.has(forbidden), forbidden).toBe(false);

    const source = readFileSync(join(extension, 'mcdollar-runtime/actor/spawn.js'), 'utf8');
    expect(source).not.toContain('CAPABILITY_CONSUMERS');
    expect(source).not.toContain('restrictCtxCapabilities');
    expect(source).not.toContain('getToolDescriptors');
    expect(source).toContain("surface: 'spawn'");
  });
});
