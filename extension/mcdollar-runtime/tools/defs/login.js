// @ts-check

import { composeTool } from '/mcdollar-runtime/tools/metadata/index.js';
import { shapePageReceipt } from '../page-receipt.js';

/** @param {any} receipt */
const loginGuidance = (receipt) => {
  if (receipt.kind === 'manual-passkey') {
    return 'Finish signing in in the open tab. Click the passkey or security-key button and '
      + 'complete the prompt on your device. mcdollar never sees your credential. When you are done, '
      + 'tell mcdollar to continue.';
  }
  if (receipt.kind === 'manual-sso') {
    const guidance = receipt.verified && receipt.idpOrigin
      ? `Click the ${receipt.provider} sign-in button. mcdollar cannot read or act on ${receipt.idpOrigin}. `
        + `When this tab returns to ${receipt.origin}, tell mcdollar to continue. `
      : `Click the sign-in button only if you trust this page. mcdollar could not verify that it leads to ${receipt.provider}, so mcdollar cannot follow the destination. When you are done, tell mcdollar to continue. `;
    return `Finish signing in in the open tab. ${guidance}mcdollar never sees your credential.`;
  }
  if (receipt.kind === 'auto-sso') {
    return `Finish signing in in the open tab. mcdollar is paused and cannot read or act on ${receipt.idpOrigin}. `
      + `When this tab returns to ${receipt.origin}, tell mcdollar to continue. mcdollar never sees your credential.`;
  }
  return null;
};

/** @type {import('/shared/tool-types.js').Tool} */
export const loginTool = composeTool('login', {
  execute: async (_args, ctx) => {
    return shapePageReceipt(
      /** @type {any} */ (ctx).pageAuthority.performConfirmedOwnedLogin(),
      (receipt) => {
        const content = loginGuidance(receipt);
        return content
          ? { ok: true, endTurn: true, content }
          : { ok: false, error: 'login_authority_receipt_invalid' };
      },
    );
  },
});
