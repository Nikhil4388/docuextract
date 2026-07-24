/**
 * Converts any API/network error into a plain-language message suitable
 * for end users. Never exposes stack traces, status codes, or technical detail.
 *
 * Every message ends with a prompt to contact support so customers know
 * exactly what to do next.
 */

const SUPPORT_NOTE = 'If this keeps happening, please contact us at nikhil1996shelke@multipdfstoexcel.com.';

export function friendlyError(err: unknown): string {
  const e = err as any;
  const status: number | undefined = e?.response?.status;

  // ── HTTP status-based messages ───────────────────────────────────────────
  if (status === 400) {
    return `We couldn't process that request — something in the details looks off. Please double-check your input and try again. ${SUPPORT_NOTE}`;
  }
  if (status === 401) {
    return `Your session has expired. Please sign in again.`;
  }
  if (status === 403) {
    return `You don't have permission to perform this action. ${SUPPORT_NOTE}`;
  }
  if (status === 404) {
    return `We couldn't find what you were looking for — it may have been deleted or moved. ${SUPPORT_NOTE}`;
  }
  if (status === 409) {
    return `This action couldn't be completed because something already exists with the same name. Please try a different name or contact support. ${SUPPORT_NOTE}`;
  }
  if (status === 413) {
    return `The file you uploaded is too large. Please try with a smaller file or split it into multiple parts.`;
  }
  if (status === 422) {
    return `We couldn't process your request — some of the information provided isn't in the right format. Please check your input and try again. ${SUPPORT_NOTE}`;
  }
  if (status === 429) {
    return `You've been doing a lot at once — please wait a moment and try again.`;
  }
  if (status !== undefined && status >= 500) {
    return `Something went wrong on our end. Our team has been notified. Please try again in a few minutes. ${SUPPORT_NOTE}`;
  }

  // ── Network / connection errors (no HTTP response) ───────────────────────
  if (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error' || !e?.response) {
    return `We couldn't reach the server. Please check your internet connection and try again. ${SUPPORT_NOTE}`;
  }

  // ── Catch-all ────────────────────────────────────────────────────────────
  return `Something unexpected happened. Please try again. ${SUPPORT_NOTE}`;
}

/** Shorthand for use inside catch blocks where err type is unknown */
export function toFriendly(err: unknown): string {
  return friendlyError(err);
}
