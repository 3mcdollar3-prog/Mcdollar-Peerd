// @ts-check
// Test module manifest.
//
// New test files must be added here explicitly. Static imports give us
// load-time errors for missing files (instead of silent skips) and keep
// the test set legible in one place.
//
// Layout mirrors the module structure: tests/unit/<module>/<file>.test.js.

// --- shared ---
import './unit/shared/util.test.js';
import './unit/shared/bundle-transport.test.js';

// --- mcdollar-egress ---
import './unit/mcdollar-egress/audit-retention.test.js';
import './unit/mcdollar-egress/denylist.test.js';
import './unit/mcdollar-egress/safe-fetch.test.js';
import './unit/mcdollar-egress/vault.test.js';
import './unit/mcdollar-egress/vault-blob-idb.test.js';
import './unit/mcdollar-egress/dpop-key-idb.test.js';
import './unit/mcdollar-egress/vault-kdf.test.js';
import './unit/mcdollar-egress/vault-prf.test.js';
import './unit/mcdollar-egress/web-fetch.test.js';
// Real WebAuthn ceremonies — the ceremony tests register only under the
// CDP harness (virtual authenticators + injected flag); a manual
// runner.html shows one documentation test naming the gate.
import './unit/mcdollar-egress/webauthn-virtual.test.js';

// --- mcdollar-provider ---
import './unit/mcdollar-provider/sse-parser.test.js';
import './unit/mcdollar-provider/from-anthropic.test.js';
import './unit/mcdollar-provider/to-anthropic.test.js';
import './unit/mcdollar-provider/anthropic-adapter.test.js';
import './unit/mcdollar-provider/ollama-adapter.test.js';
import './unit/mcdollar-provider/ollama-recommend.test.js';

// --- mcdollar-runtime ---
import './unit/mcdollar-runtime/sessions-store.test.js';
import './unit/mcdollar-runtime/agent-loop.test.js';
import './unit/mcdollar-runtime/actor-spawn.test.js';
import './unit/mcdollar-runtime/idp-sign-in-flow.test.js';
import './unit/sidepanel/login-confirm.test.js';
import './unit/mcdollar-runtime/turn-driver-credentials.test.js';
import './unit/mcdollar-runtime/dispatcher.test.js';
import './unit/mcdollar-runtime/introspection-tools.test.js';
import './unit/mcdollar-runtime/query-dom.test.js';
import './unit/mcdollar-runtime/dom-walk.test.js';
import './unit/mcdollar-runtime/activity-overlay.test.js';
import './unit/mcdollar-runtime/default-hooks.test.js';
import './unit/mcdollar-runtime/user-hook-csp.test.js';
import './unit/mcdollar-runtime/prompt-wrap.test.js';
import './unit/mcdollar-runtime/system-prompt.test.js';
import './unit/mcdollar-runtime/tool-manifests.test.js';
import './unit/mcdollar-runtime/redact.test.js';
// Lifecycle recovery contract — the SW-eviction sequence over REAL
// chrome.storage (the bun suite proves the decisions; this proves the IO).
import './unit/mcdollar-runtime/lifecycle-recovery.test.js';
import './unit/mcdollar-runtime/trim.test.js';
import './unit/mcdollar-runtime/clock/now.test.js';
import './unit/mcdollar-runtime/clock/context.test.js';
import './unit/mcdollar-runtime/web/tools.test.js';
import './unit/mcdollar-runtime/voice/model-store.test.js';
import './unit/mcdollar-runtime/voice/manager.test.js';
import './unit/mcdollar-runtime/voice/transcriber.test.js';
import './unit/mcdollar-runtime/voice/engine-picker.test.js';
import './unit/mcdollar-runtime/voice/host-runtime.test.js';
import './unit/mcdollar-runtime/vm-tools.test.js';

// --- mcdollar-engine ---
import './unit/mcdollar-engine/overlay.test.js';
import './unit/mcdollar-engine/personal-index-durability.test.js';
import './unit/mcdollar-engine/pod-opfs.test.js';

// --- chassis: notebook-tab ---
import './unit/engine-tabs/notebook-tab/notebook-seal.test.js';
import './unit/engine-tabs/notebook-tab/notebook-extract.test.js';
import './unit/engine-tabs/notebook-tab/notebook-output-render.test.js';

// --- chassis: app-tab ---
import './unit/engine-tabs/app-tab/app-binary-assets.test.js';
import './unit/engine-tabs/app-tab/consent-bar.test.js';
import './unit/engine-tabs/app-tab/full-screen.test.js';

// --- red-team (in-browser tier): real-realm sandbox escape + CSP fences ---
import './unit/red-team/sandbox-escape.test.js';

// --- chassis: vm-tab ---
import './unit/engine-tabs/vm-tab/firefox-webvm-note.test.js';
import './unit/engine-tabs/vm-tab/disk-lock.test.js';
import './unit/mcdollar-engine/repository.test.js';

// --- chassis: offscreen (headless JS jobs / script) ---
import './unit/offscreen/job-runner.test.js';
import './unit/offscreen/job-runner-workspace.test.js';
import './unit/offscreen/controller-worker.test.js';
import './unit/offscreen/actor-worker.test.js';

// --- background (SW chassis: tab trackers + RPC clients + live SW routes) ---
import './unit/background/vm-tab-close.test.js';
import './unit/background/app-tab-tracker.test.js';
import './unit/background/notebook-tab-tracker.test.js';
import './unit/background/pod-client.test.js';
import './unit/background/state-get.test.js';

// --- mcdollar-distributed ---
// (none yet — dweb surface reserved for V2+)

// --- sidepanel (chassis) ---
// Mithril component tests: real components mounted against a fake SW
// send(). They need a live DOM, so they belong on this surface, not bun.
import './unit/sidepanel/hooks-view.test.js';
import './unit/sidepanel/denylist-view.test.js';
import './unit/sidepanel/onboarding-view.test.js';
import './unit/sidepanel/mode-selector.test.js';
import './unit/sidepanel/goal-toggle.test.js';
import './unit/sidepanel/goal-bar.test.js';
import './unit/sidepanel/memory-suggestions.test.js';
import './unit/sidepanel/api-integrations.test.js';
import './unit/sidepanel/model-picker.test.js';
import './unit/sidepanel/tools-chip.test.js';
import './unit/sidepanel/attachments.test.js';
import './unit/sidepanel/composer-readiness.test.js';
import './unit/sidepanel/composer-palette.test.js';
import './unit/sidepanel/message-list.test.js';
import './unit/sidepanel/protected-tab-starter.test.js';
import './unit/sidepanel/vault-shell.test.js';
import './unit/sidepanel/vault-gate-authority.test.js';
import './unit/sidepanel/ui-effect-failure.test.js';
import './unit/sidepanel/failure-chip.test.js';
import './unit/sidepanel/actor-isolation.test.js';
import './unit/sidepanel/actor-fabric.test.js';
import './unit/sidepanel/confirm-note.test.js';
import './unit/sidepanel/chat-reducer-confirm.test.js';
import './unit/sidepanel/onboarding-provider-step.test.js';
import './unit/sidepanel/site-client-confirm.test.js';
import './unit/sidepanel/context-inspector.test.js';
import './unit/sidepanel/sessions-view.test.js';
import './unit/sidepanel/learned-origins-view.test.js';
import './unit/sidepanel/paced-origins-view.test.js';
import './unit/sidepanel/pacing-bar.test.js';
import './unit/sidepanel/chat-reducer-pacing.test.js';
import './unit/options/activity-origin-events.test.js';
import './unit/options/activity-peer-block.test.js';
import './unit/options/behavior-rows.test.js';
import './unit/options/activity-tool-failed.test.js';
import './unit/options/dweb-section.test.js';
import './unit/options/runtime-capability-controls.test.js';
import './unit/options/state-recovery.test.js';
import './unit/options/provider-races.test.js';
import './unit/options/git-credentials.test.js';
import './unit/options/transfer-identity.test.js';
import './unit/options/contributor-metrics.test.js';
import './unit/options/starter-review.test.js';
import './unit/options/memory-safety.test.js';
import './unit/options/activity-window.test.js';
import './unit/options/settings-form-names.test.js';
import './unit/options/settings-focus-contrast.test.js';

// --- home (chassis): the full-tab Library page ---
import './unit/home/library-section.test.js';
import './unit/home/discover-section.test.js';
import './unit/home/actors-section.test.js';
import './unit/home/contacts-section.test.js';
import './unit/home/network-section.test.js';
import './unit/home/first-tab-prompts.test.js';

import './unit/engine-tabs/app-tab/starter-apps.test.js';
