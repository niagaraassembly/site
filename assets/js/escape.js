/* Escaping helpers for rendering untrusted content.
 *
 * Every field rendered from data/*.json originates in a public form. The
 * `approved` label on the source issue is an EDITORIAL gate — it exists to
 * catch defamation and spam, not script injection — so nothing that reaches
 * the page may be trusted to be inert. Escape at the point of interpolation.
 */

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape a value for interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

/**
 * Return the URL only if it uses http(s), otherwise null.
 * Guards against `javascript:`, `data:` and other script-bearing schemes
 * reaching an href.
 */
export function safeHttpUrl(url) {
  return /^https?:\/\//i.test(String(url ?? '')) ? String(url) : null;
}
