// @ts-check

export const REPOSITORY_KINDS = Object.freeze(new Set(['app', 'notebook', 'pod']));

/** @param {string} value */
const safeSegment = (value) => {
  const part = String(value || '');
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(part)) {
    throw new Error(`invalid repository id: ${part}`);
  }
  return part;
};

/** @param {{ kind: string, id: string }} ref */
export const repositoryPaths = ({ kind, id }) => {
  if (!REPOSITORY_KINDS.has(kind)) throw new Error(`unsupported repository kind: ${kind}`);
  const instanceId = safeSegment(id);
  const workingRoot = kind === 'app' ? 'mcdollar-apps'
    : kind === 'pod' ? 'mcdollar-pods'
    : 'mcdollar-notebooks';
  return Object.freeze({
    dir: `/${workingRoot}/${instanceId}`,
    gitdir: `/mcdollar-git/${kind}/${instanceId}`,
  });
};

/** @param {string} appId */
export const appRepositoryRef = (appId) => ({ kind: 'app', id: appId });
