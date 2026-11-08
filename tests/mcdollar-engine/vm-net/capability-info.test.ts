import { describe, test, expect } from 'bun:test';
import {
  NET_CAPABILITIES, capabilitiesText, bannerText,
  mcdollarNetBash, aptShimsBash, friendlyFetchError,
} from '../../../extension/mcdollar-engine/vm-net/capability-info.js';

describe('capabilitiesText', () => {
  test('lists what works and what does not, names the doc', () => {
    const t = capabilitiesText();
    expect(t).toContain('WORKS:');
    expect(t).toContain('git clone');
    expect(t).toContain('NOT AVAILABLE');
    expect(t).toContain('apt-get install');
    expect(t).toContain('VM-NETWORKING.md');
  });
  test('covers every capability entry', () => {
    const t = capabilitiesText();
    for (const e of [...NET_CAPABILITIES.works, ...NET_CAPABILITIES.unavailable]) {
      expect(t).toContain(e.what);
    }
  });
});

describe('bannerText', () => {
  test('one line, points at mcdollar-net', () => {
    const b = bannerText();
    expect(b).not.toContain('\n');
    expect(b).toContain('mcdollar-net');
  });
});

describe('mcdollarNetBash', () => {
  test('defines + exports mcdollar-net via a quoted heredoc', () => {
    const b = mcdollarNetBash();
    expect(b).toContain('mcdollar-net() {');
    expect(b).toContain("cat <<'MCDOLLAR_NET_EOF'");
    expect(b).toContain('export -f mcdollar-net');
  });
});

describe('aptShimsBash', () => {
  test('defines smart apt/apt-get shims and full stubs for repo helpers', () => {
    const b = aptShimsBash();
    for (const tool of ['apt', 'apt-get', 'aptitude', 'add-apt-repository', 'apt-key']) {
      expect(b).toContain(`${tool}() {`);
      expect(b).toContain(`export -f ${tool}`);
    }
    expect(b).toContain('install'); // intercepts the network subcommand
    expect(b).not.toMatch(/[^\\]''[^\\]/); // quoting-safe
  });
});

describe('friendlyFetchError', () => {
  test('reframes denylist + SSRF, passes others through', () => {
    expect(friendlyFetchError('denylisted: https://bank.example.com')).toMatch(/denylist.*bank\.example\.com.*settings/);
    expect(friendlyFetchError('blocked by private_network')).toMatch(/LAN \/ localhost/);
    expect(friendlyFetchError('HTTP 503')).toBe('HTTP 503');
  });
});
