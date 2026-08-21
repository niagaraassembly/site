/* Client-side validation and Google Form transport for every intake form.
 *
 * Why validation is heavier here than it looks like it needs to be: the
 * Board Google Form cannot mark ANY question required, because a `news`
 * post has no `When` and a required question would reject it. And
 * submitTo() posts no-cors, so the page cannot see a rejection — a
 * discarded submission looks identical to an accepted one. These
 * functions are therefore the only feedback a visitor ever gets.
 * scripts/approve_request.py mirrors the board rules as a second gate.
 */

export const MAX_TEXT = 2500;

export const LEVELS = ['List', 'Regional', 'Company', 'Champion'];

export const BOARD_TYPES = ['standup', 'talk', 'demo', 'space', 'news', 'idea'];

/* Field names are the stable HTML `name` attributes. The visible labels
   are rewritten per type by the page; these never change. */
const BOARD_REQUIRED = {
  standup: ['title', 'when', 'where', 'contact'],
  talk:    ['title', 'presenter', 'when', 'where', 'contact'],
  demo:    ['title', 'presenter', 'when', 'where', 'contact'],
  space:   ['where', 'description', 'contact'],
  news:    ['title', 'link', 'description'],
  idea:    ['title', 'description']
};

/* GitHub's own rule: alphanumeric, single hyphens only in the interior,
   39 characters maximum. Applied here so a bad value never reaches the
   shell command in .github/workflows/approve-request.yml. */
export const GH_USER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export function buildFormBody(values, entryMap) {
  const body = new URLSearchParams();
  for (const [field, entryId] of Object.entries(entryMap)) {
    const v = values[field];
    if (v !== undefined && v !== null && String(v).trim().length > 0) {
      body.append(entryId, String(v));
    }
  }
  return body;
}

const missing = (v, keys) => keys.filter(k => !String(v[k] ?? '').trim());

export function validateJoin(v) {
  const errors = missing(v, ['name', 'email']);
  if (!LEVELS.includes(v.level)) errors.push('level');
  return errors;
}

export function validateBoard(v) {
  const type = String(v.type ?? '');
  if (!BOARD_TYPES.includes(type)) return ['type'];

  const errors = missing(v, ['name', 'email', ...BOARD_REQUIRED[type]]);

  /* Checked on every type, not just the ones that require a link: an
     optional link is still an href on a public page. */
  const link = String(v.link ?? '').trim();
  if (link && !/^https?:\/\//i.test(link)) errors.push('link-not-http');

  if (String(v.description ?? '').length > MAX_TEXT) errors.push('description-too-long');
  return errors;
}

export function validateRegister(v) {
  const kind = String(v.kind ?? '');

  if (kind === 'expert') {
    return missing(v, ['name', 'email', 'expertise', 'region']);
  }

  if (kind === 'opensource') {
    const errors = missing(v, ['name', 'email', 'github_username']);
    const username = String(v.github_username ?? '').trim();
    if (username && !GH_USER.test(username)) errors.push('github-username');
    return errors;
  }

  return ['kind'];
}

export async function submitTo(action, body) {
  await fetch(action, { method: 'POST', mode: 'no-cors', body });
}
