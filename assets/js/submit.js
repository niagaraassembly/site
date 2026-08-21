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

import { CATEGORIES, REQUIRED, OFFERS, isKind } from './nav.js';

export const MAX_TEXT = 2500;

export const LEVELS = ['List', 'Regional', 'Company', 'Champion'];

/* Field names are the stable HTML `name` attributes. The visible labels
   are rewritten per category by the page; these never change. */
export const VISIBILITY = ['public', 'private', 'both'];

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
  const category = String(v.category ?? '');
  if (!CATEGORIES.includes(category)) return ['category'];
  if (!isKind(category, v.kind)) return ['kind'];

  const errors = missing(v, ['name', 'email', 'location', ...REQUIRED[category]]);
  /* Always submitted (the control has a default), so this only ever fires
     on a tampered payload — but it is the difference between a listing
     that filters and one that silently never matches. */
  if (v.offer && !OFFERS[v.offer]) errors.push('offer');

  /* Experts choose whether their entry is published, kept for staff
     follow-up, or both. Every other category is a board post by
     definition, so the field is only meaningful here. */
  if (category === 'experts' && !VISIBILITY.includes(String(v.visibility ?? ''))) {
    errors.push('visibility');
  }

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
