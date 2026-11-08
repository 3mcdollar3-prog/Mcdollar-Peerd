import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { collectStaticModuleGraph } from '../../packaging/static-module-graph.ts';

const REPO_ROOT = join(import.meta.dir, '../..');
const EXTENSION_ROOT = join(REPO_ROOT, 'extension');

const modulesFor = async (entry: string) => new Set(
  [...await collectStaticModuleGraph(EXTENSION_ROOT, join(EXTENSION_ROOT, entry))]
    .map((file) => relative(EXTENSION_ROOT, file).replaceAll('\\', '/')),
);

const KERNEL_TURN_LIFECYCLE_EXPORTS = Object.freeze([
  'DEFAULT_MAX_OUTPUT_TOKENS', 'DOC_TEXT_MAX_CHARS', 'GOAL_MAX_ITERATIONS',
  'PERMISSION_MODES',
  'buildMintInjection', 'confirmActionsFromRecord', 'createSkillRegistry',
  'createSuggestionStore', 'describeLandingStop', 'digestCapture',
  'drainFetchTapInjected', 'fenceApiActorSummary', 'fenceWebActorSummary',
  'finalActorTurnReply', 'finalAssistantText', 'formatDocBody',
  'installFetchTapInjected', 'landingStopCard', 'limitExceeded', 'makeAutoMemory',
  'makeCheapCall', 'makeGoalRunner', 'makeScheduler', 'makeSpawnActor',
  'makeTrimEnricher', 'meshCallToOp', 'normalizeApiOrigin',
  'normalizeConfirmActions', 'normalizeMode', 'normalizeTally', 'originPhrase',
  'parseSiteHandle', 'prepareUserAttachmentsWithDocs', 'resolveSiteUrl',
  'safeWebActorSummaryOrigin', 'shapeMeshResult', 'siteHandleFor', 'wrapUntrusted',
]);

const KERNEL_TURN_LIFECYCLE_TARGETS = Object.freeze([
  './actor/a2a-api.js', './actor/cheap-call.js', './actor/origin-lock-report.js',
  './actor/spawn.js', './actor/web-actor.js', './cost/accumulator.js',
  './doc/format.js', './dom/fetch-tap-injected.js', './loop/attachments.js',
  './loop/goal-runner.js', './loop/scheduler.js', './loop/summary-enrichment.js',
  './memory/auto-memory-orchestrator.js', './memory/suggestions.js',
  './permissions/policy.js', './site-clients/core.js', './site-clients/digest.js',
  './skills/registry.js', './tools/prompt-wrap.js',
]);

const AUTHORITY_TOOL_ENTRIES = Object.freeze([
  'background/kernel-turn-authority-adapter.js',
  'background/controller-turn-bridge.js',
  'background/offscreen-actor-client.js',
]);

const CONTROLLER_TOOL_ENTRIES = Object.freeze([
  'offscreen/controller-turn-runtime.js',
  'offscreen/actor-worker-runtime.js',
]);

const SEMANTIC_TOOL_FAMILIES = Object.freeze([
  ['actor tool', AUTHORITY_TOOL_ENTRIES, [
    'mcdollar-runtime/controller-actor-tools.js',
    'mcdollar-runtime/tools/defs/actor-create.js',
    'mcdollar-runtime/tools/defs/actor-tasks.js',
    'mcdollar-runtime/tools/defs/actor-cancel.js',
    'mcdollar-runtime/tools/defs/message-actor.js',
  ]],
  ['Pod command/file', AUTHORITY_TOOL_ENTRIES, [
    'mcdollar-runtime/controller-pod-tools.js',
    'mcdollar-runtime/tools/defs/pod-exec.js',
    'mcdollar-runtime/tools/defs/pod-status.js',
    'mcdollar-runtime/tools/defs/pod-cancel.js',
    'mcdollar-runtime/tools/defs/pod-read.js',
    'mcdollar-runtime/tools/defs/pod-write.js',
  ]],
  ['repository', AUTHORITY_TOOL_ENTRIES, [
    'mcdollar-runtime/controller-repository-tools.js',
    'mcdollar-runtime/tools/defs/pod-destroy.js',
    'mcdollar-runtime/tools/defs/app-history.js',
    'mcdollar-runtime/tools/defs/app-version.js',
    'mcdollar-runtime/tools/defs/app-remote.js',
  ]],
  ['WebVM', AUTHORITY_TOOL_ENTRIES, [
    'mcdollar-runtime/controller-vm-tools.js',
    'mcdollar-runtime/tools/defs/vm-boot.js',
    'mcdollar-runtime/tools/defs/vm-import.js',
    'mcdollar-runtime/tools/defs/vm-write-file.js',
    'mcdollar-runtime/tools/defs/vm-delete.js',
  ]],
  ['Notebook', AUTHORITY_TOOL_ENTRIES, [
    'mcdollar-runtime/controller-notebook-tools.js',
    'mcdollar-runtime/tools/defs/js-notebook.js',
    'mcdollar-runtime/tools/defs/js-write-file.js',
    'mcdollar-runtime/tools/defs/js-read-file.js',
    'mcdollar-runtime/tools/defs/js-delete.js',
  ]],
  ['App', AUTHORITY_TOOL_ENTRIES, [
    'mcdollar-runtime/controller-app-tools.js',
    'mcdollar-runtime/tools/defs/app-update.js',
    'mcdollar-runtime/tools/defs/app-open.js',
    'mcdollar-runtime/tools/defs/app-search.js',
    'mcdollar-runtime/tools/defs/app-delete.js',
    'mcdollar-runtime/tools/defs/app-write-file.js',
    'mcdollar-runtime/tools/defs/app-read-file.js',
    'mcdollar-runtime/tools/defs/app-list-files.js',
    'mcdollar-runtime/tools/defs/app-delete-file.js',
    'mcdollar-runtime/tools/defs/app-observe.js',
    'mcdollar-runtime/tools/defs/app-act.js',
    'mcdollar-runtime/tools/defs/app-code.js',
  ]],
  ['memory and todo', ['background/vault-kernel.js', ...AUTHORITY_TOOL_ENTRIES], [
    'mcdollar-runtime/controller-persistence-tools.js',
    'mcdollar-runtime/tools/defs/read-memory.js',
    'mcdollar-runtime/tools/defs/remember.js',
    'mcdollar-runtime/tools/defs/todo.js',
    'mcdollar-runtime/todo/core.js',
  ]],
  ['document, web and result', AUTHORITY_TOOL_ENTRIES, [
    'mcdollar-runtime/controller-resource-tools.js',
    'mcdollar-runtime/tools/defs/read-doc.js',
    'mcdollar-runtime/tools/defs/fetch-url.js',
    'mcdollar-runtime/tools/defs/read-result.js',
  ]],
  ['site-client definitions and result shaping', AUTHORITY_TOOL_ENTRIES, [
    'mcdollar-runtime/controller-site-client-tools.js',
    'mcdollar-runtime/tools/defs/site-client-run.js',
    'mcdollar-runtime/tools/defs/site-client-read.js',
    'mcdollar-runtime/tools/defs/site-client-write.js',
    'mcdollar-runtime/tools/defs/site-capture.js',
  ]],
  ['introspection and skill', ['background/vault-kernel.js', ...AUTHORITY_TOOL_ENTRIES], [
    'mcdollar-runtime/controller-introspection-tools.js',
    'mcdollar-runtime/tools/defs/actor-list.js',
    'mcdollar-runtime/tools/defs/inspect.js',
    'mcdollar-runtime/skills/load-skill-tool.js',
  ]],
  ['scheduling tool', ['background/vault-kernel.js', ...AUTHORITY_TOOL_ENTRIES], [
    'mcdollar-runtime/controller-schedule-tools.js',
    'mcdollar-runtime/tools/defs/schedule-create.js',
    'mcdollar-runtime/tools/defs/schedule-list.js',
    'mcdollar-runtime/tools/defs/schedule-cancel.js',
  ]],
  ['dweb catalog', ['background/vault-kernel.js', ...AUTHORITY_TOOL_ENTRIES], [
    'mcdollar-runtime/controller-dweb-tools.js',
    'mcdollar-runtime/tools/defs/dweb-discover.js',
    'mcdollar-runtime/tools/defs/dweb-share.js',
    'mcdollar-runtime/tools/defs/dweb-install.js',
    'mcdollar-runtime/tools/defs/dweb-peers.js',
    'mcdollar-runtime/tools/defs/dweb-block.js',
    'mcdollar-runtime/tools/defs/dweb-discovery.js',
  ]],
] as const);

const exactReExports = (source: string) => [...source.matchAll(
  /export\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];/g,
)].map((match) => ({
  target: match[2],
  names: match[1].split(',').map((name) => name.trim().split(/\s+as\s+/).at(-1))
    .filter((name): name is string => Boolean(name)),
}));

describe('kernel turn ownership boundaries', () => {
  it('keeps the retired mutable tool protocol absent from production source', () => {
    for (const path of [
      'mcdollar-runtime/tools/registry.js',
      'mcdollar-runtime/tools/metadata-registry.js',
      'mcdollar-runtime/tools/metadata/policy.js',
    ]) expect(existsSync(join(EXTENSION_ROOT, path)), path).toBe(false);

    const productionPaths = [...new Bun.Glob('**/*.js').scanSync({ cwd: EXTENSION_ROOT })]
      .filter((path) => !path.startsWith('tests/'));
    const source = productionPaths
      .map((path) => readFileSync(join(EXTENSION_ROOT, path), 'utf8'))
      .join('\n');
    for (const retired of [
      'registerTool', 'makeRelayedToolDispatch',
      'turn.tool.prepare', 'turn.tool.settle', 'turn.tool.dispatch',
      'page_eval', 'page_exec', 'page_keys', 'wait_until', 'dweb_guide',
    ]) expect(source, retired).not.toContain(retired);
    const legacyManifestNames = ['read_web_cache', 'read_run_cache', 'read_pdf'];
    const nonMigrationSource = productionPaths
      .filter((path) => path !== 'mcdollar-runtime/tools/manifests.js')
      .map((path) => readFileSync(join(EXTENSION_ROOT, path), 'utf8'))
      .join('\n');
    for (const retired of legacyManifestNames) {
      expect(nonMigrationSource, retired).not.toContain(retired);
    }
    const manifestMigration = readFileSync(
      join(EXTENSION_ROOT, 'mcdollar-runtime/tools/manifests.js'), 'utf8',
    );
    for (const retired of legacyManifestNames) {
      expect(manifestMigration.match(new RegExp(retired, 'g')), retired).toHaveLength(1);
    }
    for (const name of ['toolbox', 'mcdollar-run-cache', 'mcdollar-checkpoints']) {
      expect(source, name).not.toContain(name);
    }
  });

  it('keeps semantic aggregate barrels out of the service-worker graph', async () => {
    const modules = await modulesFor('background/vault-kernel.js');
    for (const module of [
      'mcdollar-runtime/authority.js',
      'mcdollar-runtime/kernel.js',
      'mcdollar-runtime/kernel-turn.js',
    ]) expect(modules.has(module), `service worker imports ${module}`).toBe(false);
  });

  it('keeps the authority turn runtime independent from semantic turn implementations', async () => {
    const modules = await modulesFor('background/kernel-turn-runtime.js');
    for (const module of [
      'mcdollar-runtime/kernel-turn.js',
      'mcdollar-runtime/loop/turn-driver.js',
      'mcdollar-runtime/loop/turn-authority-driver.js',
      'mcdollar-runtime/loop/goal-runner.js',
      'mcdollar-runtime/todo/core.js',
    ]) expect(modules.has(module), `authority runtime imports ${module}`).toBe(false);
    expect(existsSync(join(EXTENSION_ROOT, 'mcdollar-runtime/kernel-turn.js'))).toBe(false);
    expect(existsSync(join(EXTENSION_ROOT, 'mcdollar-runtime/loop/turn-driver.js'))).toBe(false);
  });

  it('links the fixed turn shell through authority and deletes the semantic aggregate', async () => {
    const authorityModules = await modulesFor('background/kernel-turn-authority-adapter.js');
    expect(authorityModules.has('mcdollar-runtime/loop/turn-authority-driver.js')).toBe(true);
    expect(authorityModules.has('mcdollar-runtime/kernel-turn-lifecycle.js')).toBe(true);
    expect(authorityModules.has('mcdollar-runtime/controller-turn-semantics.js')).toBe(false);
    expect(existsSync(join(
      EXTENSION_ROOT, 'mcdollar-runtime/controller-turn-semantics.js',
    ))).toBe(false);
  });

  it('uses exact transfer custody leaves without a growing aggregate entry', async () => {
    const modules = await modulesFor('background/vault-kernel.js');
    expect(modules.has('mcdollar-runtime/kernel-transfer.js')).toBe(false);
    expect(existsSync(join(EXTENSION_ROOT, 'mcdollar-runtime/kernel-transfer.js'))).toBe(false);
    for (const entry of [
      'background/kernel-executable-transfer-live.js',
      'background/kernel-dweb-route-runtime.js',
    ]) {
      expect(readFileSync(join(EXTENSION_ROOT, entry), 'utf8'))
        .not.toContain('/mcdollar-runtime/kernel-transfer.js');
    }
  });

  it('shares exact domain authority bindings across orchestrator and actor relays', () => {
    const sources = [
      'background/controller-turn-bridge.js',
      'background/offscreen-actor-client.js',
    ].map((entry) => readFileSync(join(EXTENSION_ROOT, entry), 'utf8'));
    for (const domain of [
      'Repository', 'Vm', 'Notebook', 'App', 'Persistence',
      'Page', 'Introspection', 'Schedule', 'Dweb',
    ]) {
      for (const source of sources) {
        expect(source).toContain(`bind${domain}ToolAuthority`);
        expect(source).not.toContain(`create${domain}ToolAuthority`);
      }
    }
  });

  it('wires the actor host through one exact dependency vocabulary', () => {
    const client = readFileSync(
      join(EXTENSION_ROOT, 'background/offscreen-actor-client.js'), 'utf8',
    );
    expect(client).toContain('ensureHost, sendMessage, runOnChannel, providerEgress');
    expect(client).toContain('isRelaySender,');
    expect(client).not.toContain('ensureOffscreen');
    expect(client).not.toContain('isOffscreenSender');
    expect(client).not.toContain('ensureHost ??');
    expect(client).not.toContain('isRelaySender ??');

    const adapter = readFileSync(
      join(EXTENSION_ROOT, 'background/kernel-turn-authority-adapter.js'), 'utf8',
    );
    expect(adapter.match(/makeActorClient\(\{/g)).toHaveLength(1);
    expect(adapter).toContain('ensureHost: async () => {');
    expect(adapter).toContain('isRelaySender: deps.firefox');
  });

  it('admits every exact controller domain handler through the fixed channel ledger', () => {
    const bridge = readFileSync(
      join(EXTENSION_ROOT, 'background/controller-turn-bridge.js'), 'utf8',
    );
    const quota = readFileSync(
      join(EXTENSION_ROOT, 'shared/controller-kernel-quota.js'), 'utf8',
    );
    const domainHandlers = [...bridge.matchAll(
      /case '(turn\.(?:memory|todo|resource|site-client|execution|editing|introspection|schedule|dweb)\.[^']+)':/g,
    )].map((match) => match[1]);
    expect(domainHandlers.length).toBeGreaterThan(0);
    for (const operation of domainHandlers) {
      expect(quota, `${operation} is missing from the fixed authority ledger`)
        .toContain(`'${operation}': { authorityClass:`);
    }
    for (const operation of [
      'turn.model.open-local', 'turn.model.read-local', 'turn.model.cancel-local',
    ]) expect(quota).toContain(`'${operation}':`);
  });

  it('freezes the exact kernel turn lifecycle entry point', () => {
    const lifecycle = readFileSync(
      join(EXTENSION_ROOT, 'mcdollar-runtime/kernel-turn-lifecycle.js'), 'utf8',
    );
    const exports = exactReExports(lifecycle);
    expect(exports.flatMap(({ names }) => names).sort())
      .toEqual([...KERNEL_TURN_LIFECYCLE_EXPORTS].sort());
    expect(exports.map(({ target }) => target).sort())
      .toEqual([...KERNEL_TURN_LIFECYCLE_TARGETS].sort());
    expect([...lifecycle.matchAll(/\bexport\b/g)]).toHaveLength(exports.length);
    expect(lifecycle).not.toContain('import(');

    const adapter = readFileSync(
      join(EXTENSION_ROOT, 'background/kernel-turn-authority-adapter.js'), 'utf8',
    );
    expect(adapter.split("from '/mcdollar-runtime/kernel-turn-lifecycle.js';"))
      .toHaveLength(2);
    expect(adapter).not.toContain('/mcdollar-runtime/controller-turn-semantics.js');
  });

  it('keeps the dynamically imported actor semantic roots outside host authority graphs', async () => {
    const forbiddenPrefixes = [
      'background/',
      'mcdollar-egress/vault/',
      'mcdollar-egress/storage/',
      'mcdollar-egress/credentials/',
      'mcdollar-egress/dpop/',
    ];
    const forbiddenModules = new Set([
      'shared/browser-api.js',
      'mcdollar-provider/background.js',
      'mcdollar-engine/background.js',
    ]);
    for (const entry of [
      'offscreen/actor-worker-runtime.js',
      'mcdollar-runtime/controller-contributor.js',
    ]) {
      const modules = await modulesFor(entry);
      expect(modules.size, `${entry} must exercise its real static graph`).toBeGreaterThan(1);
      expect([...modules].filter((module) => forbiddenModules.has(module)
        || forbiddenPrefixes.some((prefix) => module.startsWith(prefix))), entry).toEqual([]);
    }
  });

  it('keeps the authority adapter transitively free of growing semantic runtimes', async () => {
    const modules = await modulesFor('background/kernel-turn-authority-adapter.js');
    const forbiddenPrefixes = [
      'mcdollar-provider/',
      'mcdollar-runtime/tools/defs/',
    ];
    const forbiddenModules = new Set([
      'mcdollar-runtime/controller-turn-semantics.js',
      'mcdollar-runtime/controller-contributor.js',
      'mcdollar-runtime/controller-tool-ownership.js',
      'mcdollar-runtime/controller-tool-projection.js',
      'mcdollar-runtime/controller-turn.js',
      'mcdollar-runtime/tools/hooks/registry.js',
      'mcdollar-runtime/tools/metadata/authority.js',
      'mcdollar-runtime/tools/metadata/catalog.js',
      'mcdollar-runtime/tools/metadata/index.js',
      'mcdollar-runtime/tools/metadata-registry.js',
      'mcdollar-runtime/tools/registry.js',
    ]);

    expect([...modules].filter((module) =>
      forbiddenModules.has(module)
        || forbiddenPrefixes.some((prefix) => module.startsWith(prefix))
        || /^mcdollar-runtime\/controller-(?:.*-)?tools\.js$/.test(module))).toEqual([]);
  });

  it('keeps tool inventory and exposure projection in the sealed controller', async () => {
    const authorityModules = await modulesFor('background/kernel-turn-authority-adapter.js');
    for (const module of [
      'mcdollar-runtime/controller-tool-projection.js',
      'mcdollar-runtime/tools/metadata/authority.js',
      'mcdollar-runtime/tools/metadata/catalog.js',
    ]) expect(authorityModules.has(module), `authority graph imports ${module}`).toBe(false);

    const controllerModules = await modulesFor('offscreen/controller-turn-runtime.js');
    for (const module of [
      'mcdollar-engine/controller.js',
      'mcdollar-runtime/controller-tool-projection.js',
      'mcdollar-runtime/tools/metadata/authority.js',
      'mcdollar-runtime/tools/metadata/catalog.js',
    ]) expect(controllerModules.has(module), `controller graph omits ${module}`).toBe(true);
    expect(controllerModules.has('mcdollar-engine/authority.js')).toBe(false);

    const driver = readFileSync(
      join(EXTENSION_ROOT, 'mcdollar-runtime/loop/turn-authority-driver.js'), 'utf8',
    );
    expect(driver).toContain('controller tool projection unavailable');
    for (const fallback of [
      'mainAgentDescriptors(listToolDescriptors())',
      'actorDescriptors(listToolDescriptors()',
      '.map(projectToolAuthority)',
    ]) expect(driver).not.toContain(fallback);
  });

  it('keeps provider selection, pricing, and model inventory out of the live turn authority graph', async () => {
    const authorityModules = await modulesFor('background/kernel-turn-authority-adapter.js');
    for (const module of [
      'mcdollar-provider/metadata.js',
      'mcdollar-provider/pricing.js',
      'mcdollar-provider/registry.js',
      'mcdollar-provider/semantic-metadata.js',
      'mcdollar-provider/errors.js',
    ]) expect(authorityModules.has(module), `authority graph imports ${module}`).toBe(false);

    const controllerModules = await modulesFor('offscreen/controller-turn-runtime.js');
    for (const module of [
      'mcdollar-provider/metadata.js',
      'mcdollar-provider/pricing.js',
      'mcdollar-provider/registry.js',
    ]) expect(controllerModules.has(module), `controller graph omits ${module}`).toBe(true);

    const driver = readFileSync(
      join(EXTENSION_ROOT, 'mcdollar-runtime/loop/turn-authority-driver.js'), 'utf8',
    );
    expect(driver).not.toContain('REASONING_BUDGET_TOKENS');
    expect(driver).not.toContain('REASONING_EFFORT_LEVELS');
  });

  it.each(SEMANTIC_TOOL_FAMILIES)(
    'hosts %s semantics only in controller and isolated-worker graphs',
    async (family, authorityEntries, semanticModules) => {
      const familyModules = new Set<string>(semanticModules);
      for (const entry of authorityEntries) {
        const modules = await modulesFor(entry);
        expect(
          [...modules].filter((module) => familyModules.has(module)),
          `${entry} imports ${family}`,
        ).toEqual([]);
      }
      for (const entry of CONTROLLER_TOOL_ENTRIES) {
        const modules = await modulesFor(entry);
        for (const module of semanticModules) {
          expect(modules.has(module), `${entry} omits ${family} module ${module}`).toBe(true);
        }
      }
    },
  );

  it('keeps actor prompt, projection, and result shaping out of the orchestrator authority driver', async () => {
    const modules = await modulesFor('mcdollar-runtime/loop/turn-authority-driver.js');
    for (const module of [
      'mcdollar-runtime/actor/capability-manifest.js',
      'mcdollar-runtime/tools/exposure.js',
    ]) expect(modules.has(module), `orchestrator driver imports ${module}`).toBe(false);
    const source = readFileSync(
      join(EXTENSION_ROOT, 'mcdollar-runtime/loop/turn-authority-driver.js'), 'utf8',
    );
    for (const semanticPath of [
      "surface: 'actor'", 'turn/actor-start', 'turn/actor-state',
      'turn/actor-cost', 'turn/actor-error', 'turn/actor-done',
    ]) expect(source).not.toContain(semanticPath);
    expect(source).toContain('actor_background_turn_refused');
  });

  it('keeps model-facing turn corrections in the sealed prompt renderer', () => {
    const driver = readFileSync(
      join(EXTENSION_ROOT, 'mcdollar-runtime/loop/turn-authority-driver.js'), 'utf8',
    );
    const renderer = readFileSync(
      join(EXTENSION_ROOT, 'mcdollar-runtime/loop/system-prompt.js'), 'utf8',
    );
    for (const semanticOwner of [
      'PREWALK_NUDGE', 'actorIsolationPromptBlock', 'runtimeCapabilityPromptBlock',
    ]) {
      expect(driver).not.toContain(semanticOwner);
      expect(renderer).toContain(semanticOwner);
    }
    expect(driver).toContain('actorIsolation: actorIsolationForModelStep');
    expect(driver).toContain('runtimeCapabilities');
  });

  it('renders volatile temporal and foreground context only in the sealed controller', async () => {
    const authorityModules = await modulesFor('background/kernel-turn-authority-adapter.js');
    for (const module of [
      'mcdollar-runtime/clock/context.js',
      'mcdollar-runtime/loop/system-prompt.js',
    ]) expect(authorityModules.has(module), `authority graph imports ${module}`).toBe(false);

    const controllerModules = await modulesFor('offscreen/controller-turn-runtime.js');
    for (const module of [
      'mcdollar-runtime/clock/context.js',
      'mcdollar-runtime/loop/system-prompt.js',
    ]) expect(controllerModules.has(module), `controller graph omits ${module}`).toBe(true);

    const driver = readFileSync(
      join(EXTENSION_ROOT, 'mcdollar-runtime/loop/turn-authority-driver.js'), 'utf8',
    );
    expect(driver).not.toContain('buildTemporalBlock');
    expect(driver).not.toContain('buildTemporalContext');
    expect(driver).not.toContain('<active_tab>');
  });

  it('hosts page definitions only in controller and isolated-worker graphs', async () => {
    const pageSemanticModules = new Set([
      'mcdollar-runtime/controller-page-tools.js',
      'mcdollar-runtime/tools/page-receipt.js',
      'mcdollar-runtime/dom/action-result.js',
      'mcdollar-runtime/dom/snapshot-diff.js',
      'mcdollar-runtime/tools/defs/open-tab.js',
      'mcdollar-runtime/tools/defs/read-page.js',
      'mcdollar-runtime/tools/defs/snapshot.js',
      'mcdollar-runtime/tools/defs/read-state.js',
      'mcdollar-runtime/tools/defs/watch-changes.js',
      'mcdollar-runtime/tools/defs/query-dom.js',
      'mcdollar-runtime/tools/defs/navigate.js',
      'mcdollar-runtime/tools/defs/type.js',
      'mcdollar-runtime/tools/defs/click.js',
      'mcdollar-runtime/tools/defs/login.js',
      'mcdollar-runtime/tools/defs/page-code.js',
      'mcdollar-runtime/tools/web/screenshot.js',
      'mcdollar-runtime/tools/web/view.js',
    ]);
    for (const entry of [
      'background/kernel-turn-authority-adapter.js',
      'background/controller-turn-bridge.js',
      'background/offscreen-actor-client.js',
    ]) {
      const modules = await modulesFor(entry);
      expect([...modules].filter((module) => pageSemanticModules.has(module))).toEqual([]);
    }
    for (const entry of ['offscreen/controller-turn-runtime.js', 'offscreen/actor-worker-runtime.js']) {
      const modules = await modulesFor(entry);
      for (const module of pageSemanticModules) expect(modules.has(module)).toBe(true);
    }

    const pageAuthorityPaths = [...new Bun.Glob('background/page-authority/*.js')
      .scanSync({ cwd: EXTENSION_ROOT })];
    const pageAuthoritySource = pageAuthorityPaths
      .map((path) => readFileSync(join(EXTENSION_ROOT, path), 'utf8'))
      .join('\n');
    expect(pageAuthoritySource).not.toMatch(/export\s+const\s+\w+Tool\b/);
    expect(pageAuthoritySource).not.toMatch(/Readonly<\{\s*execute\s*:/);
    expect(pageAuthoritySource).not.toContain('content:');
    for (const semanticPresenter of [
      'composeTool(', 'wrapUntrusted(', 'excerptRelevant(', 'pagingFooter(',
      'windowText(', 'formatPageBody(', 'diffSnapshots(', 'describeSource(',
      'summarizeMutations(', 'loginGuidance(',
    ]) expect(pageAuthoritySource, semanticPresenter).not.toContain(semanticPresenter);

    const controllerPageSource = [
      'mcdollar-runtime/tools/page-receipt.js',
      ...[...new Bun.Glob('mcdollar-runtime/tools/defs/*.js').scanSync({ cwd: EXTENSION_ROOT })]
        .filter((path) => pageSemanticModules.has(path)),
      'mcdollar-runtime/tools/web/screenshot.js',
      'mcdollar-runtime/tools/web/view.js',
    ].map((path) => readFileSync(join(EXTENSION_ROOT, path), 'utf8')).join('\n');
    for (const semanticPresenter of [
      'wrapUntrusted', 'excerptRelevant', 'pagingFooter', 'diffSnapshots',
      'describeSource', 'summarizeMutations', 'loginGuidance',
    ]) expect(controllerPageSource, semanticPresenter).toContain(semanticPresenter);
  });

  it('keeps controller-local semantics out of authority graphs and has no generic effect lane', async () => {
    const semanticModules = new Set([
      'mcdollar-runtime/controller-local-tools.js',
      'mcdollar-runtime/clock/execute.js',
    ]);
    for (const entry of [
      'background/vault-kernel.js',
      'background/kernel-turn-authority-adapter.js',
      'background/controller-turn-bridge.js',
    ]) {
      const modules = await modulesFor(entry);
      expect([...modules].filter((module) => semanticModules.has(module))).toEqual([]);
    }
    const controllerModules = await modulesFor('offscreen/controller-turn-runtime.js');
    for (const module of semanticModules) expect(controllerModules.has(module)).toBe(true);

    const authoritySource = readFileSync(
      join(EXTENSION_ROOT, 'background/controller-turn-bridge.js'), 'utf8',
    );
    const controllerSource = readFileSync(
      join(EXTENSION_ROOT, 'offscreen/controller-turn-runtime.js'), 'utf8',
    );
    expect(authoritySource).toContain("case 'turn.goal.complete'");
    expect(controllerSource).toContain("rpc('turn.goal.complete'");
    for (const source of [authoritySource, controllerSource]) {
      expect(source).not.toContain('turn.tool.effect');
      expect(source).not.toContain('handleToolEffect');
    }
    for (const removed of [
      'mcdollar-runtime/controller-tools.js',
      'offscreen/controller-tool-runtime.js',
      'offscreen/tool-execution-host.js',
    ]) expect(existsSync(join(EXTENSION_ROOT, removed))).toBe(false);
  });

  it('uses the authority adapter directly without a composition alias', async () => {
    const source = readFileSync(
      join(EXTENSION_ROOT, 'background/kernel-turn-authority-adapter.js'),
      'utf8',
    );
    expect(source).toContain('export const createKernelTurnAuthorityAdapter = (deps) => {');
    expect(source).not.toContain('createControllerTurnSemantics');
    expect(source).not.toContain('semanticOwners');
    const modules = await modulesFor('background/kernel-turn-authority-adapter.js');
    expect(modules.has('mcdollar-runtime/controller-turn-semantics.js')).toBe(false);
  });
});
