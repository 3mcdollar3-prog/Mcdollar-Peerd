// @ts-check
// mcdollar-distributed/content/uri.js — mcdollar:// parse/format (PROTOCOL §4.1).
//
//   mcdollar://<did>/<content_hash>[/<path>]   authored (signed by publisher)
//   mcdollar://<content_hash>[/<path>]         pure content-addressed
//
// content_hash is the 64-hex SHA-256 of the manifest. why: the did
// contains colons ("did:key:z…") so we can't naively split on ':'; we
// detect the "did:" prefix explicitly, then the first '/'.

const SCHEME = 'mcdollar://';
const HASH_RE = /^[0-9a-f]{64}$/;

/** @param {{ did?: string, hash?: string, path?: string }} parts */
export const formatMcdollarUri = ({ did, hash, path } = {}) => {
  if (!hash || !HASH_RE.test(hash)) {
    throw new Error('formatMcdollarUri: hash must be 64 lowercase hex chars');
  }
  let uri = SCHEME;
  if (did) uri += `${did}/`;
  uri += hash;
  if (path) uri += `/${path}`;
  return uri;
};

/**
 * @param {string} s
 * @returns {{ did?: string, hash: string, path?: string }}
 */
export const parseMcdollarUri = (s) => {
  if (typeof s !== 'string' || !s.startsWith(SCHEME)) {
    throw new Error('parseMcdollarUri: not a mcdollar:// URI');
  }
  let rest = s.slice(SCHEME.length);
  let did;
  if (rest.startsWith('did:')) {
    const slash = rest.indexOf('/');
    if (slash < 0) throw new Error('parseMcdollarUri: did present but no content hash');
    did = rest.slice(0, slash);
    rest = rest.slice(slash + 1);
  }
  const parts = rest.split('/');
  // why cast: String.split always yields ≥1 element, so shift() is never
  // undefined here — TS can't see that invariant.
  const hash = /** @type {string} */ (parts.shift());
  if (!HASH_RE.test(hash)) {
    throw new Error('parseMcdollarUri: invalid content hash');
  }
  const path = parts.length ? parts.join('/') : undefined;
  return { did, hash, path };
};
