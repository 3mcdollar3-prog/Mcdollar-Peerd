// The RFC 9449 §8 server-nonce dance: the pure decisions in dpop/nonce.js, and
// the sequencing they drive in withDpopCredentials.
//
// Two things these tests exist to pin, both of which are the difference between
// a compatibility feature and a liability:
//
//   1. The retry happens EXACTLY ONCE, and only when every precondition holds.
//      A nonce challenge that keeps repeating must not become a request storm
//      against the user's credential.
//   2. The retry is a genuinely NEW proof — fresh jti, the new nonce, a real
//      signature over the new claims — not the first proof with a header bolted
//      on. Bun ships real WebCrypto, so the retried proof is verified for real.

import { describe, test, expect } from 'bun:test';
import {
  parseDpopNonce, readDpopNonce, replayableRequest, shouldRetryWithNonce,
  makeNonceCache, MAX_NONCE_LENGTH, DPOP_NONCE_HEADER,
} from '../../extension/mcdollar-egress/dpop/nonce.js';
import { generateDpopKeypair } from '../../extension/mcdollar-egress/dpop/keys.js';
import { utf8Bytes } from '../../extension/mcdollar-egress/dpop/proof.js';
import { buildOriginSecret } from '../../extension/mcdollar-egress/fetch/origin-credentials.js';
import { withDpopCredentials } from '../../extension/mcdollar-egress/fetch/web-fetch.js';

const OWNED = 'https://api.example.com';
const TOKEN = 'at_abcdefghijklmnop';

// ── the pure core ───────────────────────────────────────────────────────────

describe('parseDpopNonce — opaque, verbatim, bounded', () => {
  test('a real nonce comes back byte-identical', () => {
    // The server compares what we echo against what it issued, so any
    // normalization here is a silent 401 generator.
    const n = 'eyJ7S_zG.ex-ample~value';
    expect(parseDpopNonce(n)).toBe(n);
  });

  test('refuses everything that could not be a nonce a server issued', () => {
    expect(parseDpopNonce('')).toBeNull();
    expect(parseDpopNonce(undefined)).toBeNull();
    expect(parseDpopNonce(null)).toBeNull();
    expect(parseDpopNonce(12345 as any)).toBeNull();
    expect(parseDpopNonce('a'.repeat(MAX_NONCE_LENGTH + 1))).toBeNull();
    // Structure-bearing characters: these cross into a JSON payload we SIGN.
    expect(parseDpopNonce('has space')).toBeNull();
    expect(parseDpopNonce('has\nnewline')).toBeNull();
    expect(parseDpopNonce('has\ttab')).toBeNull();
    expect(parseDpopNonce('\u0000null')).toBeNull();
    expect(parseDpopNonce('café')).toBeNull();          // non-ASCII
  });

  test('exactly at the length cap is still accepted', () => {
    const n = 'a'.repeat(MAX_NONCE_LENGTH);
    expect(parseDpopNonce(n)).toBe(n);
  });
});

describe('readDpopNonce — tolerant of anything response-shaped', () => {
  test('reads the header off a real Response', () => {
    const res = new Response(null, { status: 401, headers: { [DPOP_NONCE_HEADER]: 'n1' } });
    expect(readDpopNonce(res)).toBe('n1');
  });

  test('a header-less stub yields null instead of throwing', () => {
    // The injected webFetch in other suites returns `{ ok: true }`. A boundary
    // that threw on that would turn a compat feature into an outage.
    expect(readDpopNonce({ ok: true })).toBeNull();
    expect(readDpopNonce(null)).toBeNull();
    expect(readDpopNonce({ headers: { get: () => { throw new Error('nope'); } } })).toBeNull();
  });

  test('a malformed header value is treated as no nonce at all', () => {
    const res = new Response(null, { status: 401, headers: { [DPOP_NONCE_HEADER]: 'bad value' } });
    expect(readDpopNonce(res)).toBeNull();
  });
});

describe('replayableRequest — the guard against a duplicated write', () => {
  test('re-serializable bodies replay', () => {
    expect(replayableRequest(`${OWNED}/x`, { body: '{"a":1}' })).toBe(true);
    expect(replayableRequest(`${OWNED}/x`, { body: new URLSearchParams({ a: '1' }) })).toBe(true);
    expect(replayableRequest(`${OWNED}/x`, { body: new Uint8Array([1, 2, 3]) })).toBe(true);
    expect(replayableRequest(`${OWNED}/x`, {})).toBe(true);
    expect(replayableRequest(`${OWNED}/x`)).toBe(true);
  });

  test('a one-shot stream body does NOT replay', () => {
    const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); c.close(); } });
    expect(replayableRequest(`${OWNED}/x`, { body })).toBe(false);
  });

  test('a Request carrying its own body does NOT replay, but a bodyless one does', () => {
    expect(replayableRequest(new Request(`${OWNED}/x`, { method: 'POST', body: 'hi' }))).toBe(false);
    expect(replayableRequest(new Request(`${OWNED}/x`))).toBe(true);
    // An explicit init.body overrides the Request's, so it is the one that ships.
    expect(replayableRequest(new Request(`${OWNED}/x`, { method: 'POST', body: 'hi' }), { body: 'hi' })).toBe(true);
  });
});

describe('shouldRetryWithNonce — every condition is load-bearing', () => {
  const ok = { minted: true, sentNonce: null, freshNonce: 'n1', replayable: true };

  test('a 401 (and a 400) with a fresh nonce on a minted, replayable request retries', () => {
    expect(shouldRetryWithNonce({ status: 401 }, ok)).toBe(true);
    expect(shouldRetryWithNonce({ status: 400 }, ok)).toBe(true);
  });

  test('no proof was minted ⇒ nothing to re-sign', () => {
    // A bearer origin has no nonce dance; a locked vault minted nothing.
    expect(shouldRetryWithNonce({ status: 401 }, { ...ok, minted: false })).toBe(false);
  });

  test('the SAME nonce back is the loop-breaker', () => {
    // Retrying with the value the server just rejected cannot succeed, and a
    // server that repeats its challenge would otherwise ping-pong forever.
    expect(shouldRetryWithNonce({ status: 401 }, { ...ok, sentNonce: 'n1', freshNonce: 'n1' })).toBe(false);
  });

  test('no nonce, an unreplayable request, or a non-challenge status all decline', () => {
    expect(shouldRetryWithNonce({ status: 401 }, { ...ok, freshNonce: null })).toBe(false);
    expect(shouldRetryWithNonce({ status: 401 }, { ...ok, replayable: false })).toBe(false);
    expect(shouldRetryWithNonce({ status: 403 }, ok)).toBe(false);
    expect(shouldRetryWithNonce({ status: 500 }, ok)).toBe(false);
    expect(shouldRetryWithNonce({ status: 200 }, ok)).toBe(false);
    expect(shouldRetryWithNonce({}, ok)).toBe(false);
  });
});

describe('makeNonceCache — per origin, bounded, in memory', () => {
  test('stores and returns the newest nonce per origin, isolated across origins', () => {
    const c = makeNonceCache();
    c.set(OWNED, 'n1');
    c.set('https://other.example', 'n2');
    expect(c.get(OWNED)).toBe('n1');
    expect(c.get('https://other.example')).toBe('n2');
    c.set(OWNED, 'n3');
    expect(c.get(OWNED)).toBe('n3');
    expect(c.get('https://never.seen')).toBeNull();
  });

  test('an invalid nonce is not stored — a bad header cannot poison the cache', () => {
    const c = makeNonceCache();
    c.set(OWNED, 'good');
    c.set(OWNED, 'bad value');
    c.set(OWNED, '');
    expect(c.get(OWNED)).toBe('good');
    expect(c.size).toBe(1);
  });

  test('clear drops one origin, and the cap evicts oldest-first', () => {
    const c = makeNonceCache({ max: 2 });
    c.set('https://a.example', 'a');
    c.set('https://b.example', 'b');
    c.set('https://c.example', 'c');
    expect(c.size).toBe(2);
    expect(c.get('https://a.example')).toBeNull();          // evicted
    expect(c.get('https://c.example')).toBe('c');
    c.clear('https://c.example');
    expect(c.get('https://c.example')).toBeNull();
  });

  test('a refreshed origin counts as newest, not oldest', () => {
    const c = makeNonceCache({ max: 2 });
    c.set('https://a.example', 'a1');
    c.set('https://b.example', 'b1');
    c.set('https://a.example', 'a2');                       // refresh a
    c.set('https://c.example', 'c1');                       // evicts b, not a
    expect(c.get('https://a.example')).toBe('a2');
    expect(c.get('https://b.example')).toBeNull();
  });
});

// ── the boundary ────────────────────────────────────────────────────────────

const res = (status: number, nonce?: string) =>
  new Response(null, { status, headers: nonce ? { [DPOP_NONCE_HEADER]: nonce } : undefined });

const verifyProof = async (proof: string, publicKey: CryptoKey) => {
  const [h, p, s] = proof.split('.');
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    new Uint8Array(Buffer.from(s, 'base64url')) as BufferSource,
    utf8Bytes(`${h}.${p}`) as BufferSource,
  );
};

const claims = (proof: string) => JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString('utf8'));

/**
 * A boundary whose fetch replays a SCRIPT of responses and records every
 * attempt, so "exactly one retry" is an assertion about call count rather than
 * an inference.
 */
const mkBoundary = async (script: Response[], over: any = {}) => {
  const calls: { url: string; init: any }[] = [];
  const queue = [...script];
  const webFetch = async (resource: any, init: any) => {
    calls.push({ url: String(resource instanceof Request ? resource.url : resource), init });
    return (queue.shift() ?? res(200)) as any;
  };
  const audits: any[] = [];
  const key = await generateDpopKeypair();
  const wf = withDpopCredentials(webFetch, () => OWNED, {
    getSecret: over.getSecret ?? (async (n: string) =>
      n === `origin:${OWNED}` ? buildOriginSecret({ key: TOKEN, scheme: over.scheme ?? 'dpop' }) : null),
    getDpopKey: over.getDpopKey ?? (async () => ({ privateKey: key.privateKey, publicJwk: key.publicJwk })),
    audit: (e: any) => audits.push(e),
    now: () => 1700000000_000,
    ...over.deps,
  });
  return { wf, calls, audits, key };
};

describe('withDpopCredentials — the one-shot nonce retry', () => {
  test('a 401 challenge earns exactly one retry, re-signed with the nonce', async () => {
    const { wf, calls, key } = await mkBoundary([res(401, 'srv-nonce-1'), res(200)]);
    const out = await wf(`${OWNED}/v1/charges`, { method: 'POST', body: '{}', headers: { 'X-Keep': 'ok' } });

    expect(out.status).toBe(200);
    expect(calls).toHaveLength(2);                          // exactly one retry

    const first = claims(calls[0].init.headers.DPoP);
    const second = claims(calls[1].init.headers.DPoP);
    expect(first.nonce).toBeUndefined();                    // nothing cached yet
    expect(second.nonce).toBe('srv-nonce-1');
    // A NEW proof, not the old one with a claim bolted on.
    expect(second.jti).not.toBe(first.jti);
    expect(await verifyProof(calls[1].init.headers.DPoP, key.publicKey)).toBe(true);
    // Same request, same binding — and the caller's own headers survive.
    expect(second.htm).toBe('POST');
    expect(second.htu).toBe(`${OWNED}/v1/charges`);
    expect(calls[1].init.headers.Authorization).toBe(`DPoP ${TOKEN}`);
    expect(calls[1].init.headers['X-Keep']).toBe('ok');
    expect(calls[1].init.body).toBe('{}');
  });

  test('the learned nonce rides the NEXT request first-shot — no second 401', async () => {
    const { wf, calls } = await mkBoundary([res(401, 'srv-nonce-1'), res(200), res(200)]);
    await wf(`${OWNED}/a`, {});
    await wf(`${OWNED}/b`, {});
    expect(calls).toHaveLength(3);                          // 2 for the first call, 1 for the second
    expect(claims(calls[2].init.headers.DPoP).nonce).toBe('srv-nonce-1');
  });

  test('a nonce issued on a 200 is learned too — no 401 needed to discover a rotation', async () => {
    const { wf, calls } = await mkBoundary([res(200, 'rotated'), res(200)]);
    await wf(`${OWNED}/a`, {});
    await wf(`${OWNED}/b`, {});
    expect(calls).toHaveLength(2);                          // no retry on a success
    expect(claims(calls[1].init.headers.DPoP).nonce).toBe('rotated');
  });

  test('a server that repeats the SAME nonce does not loop', async () => {
    // First exchange teaches us 'stuck'; the second request sends it and is
    // rejected with 'stuck' again. Retrying is provably useless, so we stop.
    const { wf, calls } = await mkBoundary([res(401, 'stuck'), res(200), res(401, 'stuck')]);
    await wf(`${OWNED}/a`, {});
    const out = await wf(`${OWNED}/b`, {});
    expect(out.status).toBe(401);
    expect(calls).toHaveLength(3);                          // 2 + 1, not 2 + 2
  });

  test('a 401 with no nonce is just a 401 — no retry', async () => {
    const { wf, calls } = await mkBoundary([res(401)]);
    const out = await wf(`${OWNED}/a`, {});
    expect(out.status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  test('a non-challenge status carrying a nonce caches it but does not retry', async () => {
    const { wf, calls } = await mkBoundary([res(500, 'n1'), res(200)]);
    const out = await wf(`${OWNED}/a`, {});
    expect(out.status).toBe(500);
    expect(calls).toHaveLength(1);
    await wf(`${OWNED}/b`, {});
    expect(claims(calls[1].init.headers.DPoP).nonce).toBe('n1');   // still learned
  });

  test('an unreplayable stream body is never sent twice', async () => {
    const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); c.close(); } });
    const { wf, calls } = await mkBoundary([res(401, 'n1'), res(200)]);
    const out = await wf(`${OWNED}/a`, { method: 'POST', body });
    expect(out.status).toBe(401);                           // the server's answer, honestly returned
    expect(calls).toHaveLength(1);
  });

  test('a BEARER origin has no nonce dance, even on a 401 carrying a nonce', async () => {
    const { wf, calls } = await mkBoundary([res(401, 'n1'), res(200)], { scheme: 'bearer' });
    const out = await wf(`${OWNED}/a`, {});
    expect(out.status).toBe(401);
    expect(calls).toHaveLength(1);
    expect(calls[0].init.headers.DPoP).toBeUndefined();
  });

  test('a cross-origin request gets no credential and no retry', async () => {
    const { wf, calls } = await mkBoundary([res(401, 'n1'), res(200)]);
    const out = await wf('https://evil.example/steal', {});
    expect(out.status).toBe(401);
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0].init)).not.toContain(TOKEN);
  });

  test('the retry re-derives from the CALLER headers — an actor-supplied DPoP header never survives either attempt', async () => {
    const { wf, calls } = await mkBoundary([res(401, 'n1'), res(200)]);
    await wf(`${OWNED}/a`, { headers: { DPoP: 'forged-by-the-actor', Authorization: 'Bearer stolen' } });
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.init.headers.DPoP).not.toBe('forged-by-the-actor');
      expect(c.init.headers.Authorization).toBe(`DPoP ${TOKEN}`);
    }
  });

  test('if the second signing fails, the first response is returned — never an unsigned request', async () => {
    // Rule 7 across the retry: the vault locks between attempts.
    let n = 0;
    const { wf, calls } = await mkBoundary([res(401, 'n1'), res(200)], {
      getDpopKey: async () => (n++ === 0 ? (await generateDpopKeypair()) : null),
    });
    const out = await wf(`${OWNED}/a`, {});
    expect(out.status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  test('the audit records the retry and the nonced posture — never the nonce itself', async () => {
    const { wf, audits } = await mkBoundary([res(401, 'srv-nonce-1'), res(200)]);
    await wf(`${OWNED}/a`, {});
    const attached = audits.filter((a) => a.type === 'dpop_auth_attached');
    expect(attached).toHaveLength(2);
    expect(attached[0].details.nonced).toBe(false);
    expect(attached[1].details.nonced).toBe(true);
    const retry = audits.find((a) => a.type === 'dpop_nonce_retry');
    expect(retry.details).toEqual({ origin: OWNED, status: 401 });
    expect(JSON.stringify(audits)).not.toContain('srv-nonce-1');
    expect(JSON.stringify(audits)).not.toContain(TOKEN);
  });

  test('a nonce rotated on the RETRY response is learned for next time', async () => {
    const { wf, calls } = await mkBoundary([res(401, 'n1'), res(200, 'n2'), res(200)]);
    await wf(`${OWNED}/a`, {});
    await wf(`${OWNED}/b`, {});
    expect(calls).toHaveLength(3);
    expect(claims(calls[2].init.headers.DPoP).nonce).toBe('n2');
  });

  test('the cache is per-wrapper and per-origin — a nonce is never echoed to another server', async () => {
    // Two boundaries, two owned origins: whatever one learns cannot reach the other.
    const cache = makeNonceCache();
    const { wf, calls } = await mkBoundary([res(401, 'n1'), res(200), res(200)], { deps: { nonceCache: cache } });
    await wf(`${OWNED}/a`, {});
    expect(cache.get(OWNED)).toBe('n1');
    expect(cache.get('https://other.example')).toBeNull();
    await wf(`${OWNED}/b`, {});
    expect(claims(calls[2].init.headers.DPoP).nonce).toBe('n1');
  });
});
