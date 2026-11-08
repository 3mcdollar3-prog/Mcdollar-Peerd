import { describe, test, expect } from 'bun:test';
import { formatMcdollarUri, parseMcdollarUri } from '../../extension/mcdollar-distributed/content/uri.js';

const HASH = 'a'.repeat(64);
const DID = 'did:key:z6MkExampleExampleExampleExampleExampleExample';

describe('mcdollar:// URIs', () => {
  test('authored form roundtrips (did + hash)', () => {
    const uri = formatMcdollarUri({ did: DID, hash: HASH });
    expect(uri).toBe(`mcdollar://${DID}/${HASH}`);
    expect(parseMcdollarUri(uri)).toEqual({ did: DID, hash: HASH, path: undefined });
  });

  test('pure content-addressed form roundtrips (hash only)', () => {
    const uri = formatMcdollarUri({ hash: HASH });
    expect(uri).toBe(`mcdollar://${HASH}`);
    expect(parseMcdollarUri(uri)).toEqual({ did: undefined, hash: HASH, path: undefined });
  });

  test('carries an optional path', () => {
    const parsed = parseMcdollarUri(`mcdollar://${DID}/${HASH}/assets/logo.png`);
    expect(parsed).toEqual({ did: DID, hash: HASH, path: 'assets/logo.png' });
  });

  test('rejects a malformed hash and a non-mcdollar scheme', () => {
    expect(() => parseMcdollarUri('mcdollar://deadbeef')).toThrow();
    expect(() => parseMcdollarUri(`https://example.com/${HASH}`)).toThrow();
    expect(() => formatMcdollarUri({ hash: 'tooshort' })).toThrow();
  });
});
