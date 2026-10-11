#!/usr/bin/env node
/* Kit (kit.com) broadcasts from this repository, through Kit's v4 API.
 *
 * The API key is read from KIT_API_KEY or ~/.config/na/kit.env
 * (KIT_API_KEY=...); it is never stored in the repository.
 *
 * Broadcasts are only ever saved as drafts here (send_at is always null).
 * Sending and scheduling are done by a person in Kit, after reading the
 * draft there.
 *
 * Usage:
 *   node scripts/kit/kit.mjs check
 *       Account, tags, templates and the latest broadcasts.
 *   node scripts/kit/kit.mjs draft <edition-dir> --tag <tag-name> [--broadcast <id>] [--public]
 *       Saves <edition-dir>/email.html with the subject, preview text and
 *       description in <edition-dir>/meta.json as a draft for subscribers
 *       with that tag. With --broadcast, updates that existing draft (it must
 *       not have been sent); without it, creates a new draft.
 *
 * Kit's API reference: https://developers.kit.com/api-reference
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const API = 'https://api.kit.com/v4';

export function readKey(env = process.env, file = path.join(os.homedir(), '.config/na/kit.env')) {
  if (env.KIT_API_KEY) return env.KIT_API_KEY.trim();
  if (!fs.existsSync(file)) return '';
  const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('KIT_API_KEY='));
  return line ? line.slice('KIT_API_KEY='.length).trim() : '';
}

/** The subscriber filter for one tag, in the shape Kit's v4 API takes. */
export function tagFilter(tagId) {
  return [{ all: [{ type: 'tag', ids: [Number(tagId)] }], any: null, none: null }];
}

/** The full body for a draft: every field is sent, so nothing is left to an
    unstated default; send_at is always null, which keeps it a draft. */
export function draftBody({ content, meta, tagId, templateId, isPublic = false }) {
  for (const key of ['subject', 'preview_text', 'description']) {
    if (!meta?.[key]) throw new Error(`meta.json is missing ${key}`);
  }
  if (!content || !content.trim()) throw new Error('email.html is empty');
  return {
    subject: meta.subject,
    preview_text: meta.preview_text,
    description: meta.description,
    content,
    email_template_id: templateId,
    public: Boolean(isPublic),
    send_at: null,
    subscriber_filter: tagFilter(tagId),
  };
}

export function client(key, fetchImpl = fetch) {
  if (!key) throw new Error('No Kit API key: set KIT_API_KEY or write it to ~/.config/na/kit.env');
  return async function kit(method, route, body) {
    const res = await fetchImpl(`${API}${route}`, {
      method,
      headers: { 'X-Kit-Api-Key': key, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    if (!res.ok) {
      const why = data?.errors?.join('; ') || data?.raw || res.statusText;
      throw new Error(`Kit ${method} ${route} failed: HTTP ${res.status}: ${why}`);
    }
    return data;
  };
}

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--public') out.public = true;
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
    else out._.push(a);
  }
  return out;
}

async function check(kit) {
  const { account } = await kit('GET', '/account');
  console.log(`Account: ${account.name} (${account.plan_type} plan), sends from ${account.primary_email_address}`);
  const { tags } = await kit('GET', '/tags');
  console.log(`Tags: ${tags.map((t) => `${t.name} ${t.id}`).join(', ')}`);
  const { email_templates: templates } = await kit('GET', '/email_templates');
  console.log(`Templates: ${templates.map((t) => `${t.name} ${t.id} (${t.category}${t.is_default ? ', default' : ''})`).join(', ')}`);
  const { broadcasts } = await kit('GET', '/broadcasts?per_page=5');
  for (const b of broadcasts) console.log(`Broadcast ${b.id}: ${b.subject} — ${b.send_at ? `sent or scheduled ${b.send_at}` : 'draft'}`);
}

async function draft(kit, opts) {
  const dirArg = opts._[1];
  if (!dirArg) throw new Error('draft needs an edition directory, e.g. MAGS/WNY/issue/one/email');
  if (!opts.tag) throw new Error('draft needs --tag <tag-name>, e.g. --tag na-list');
  const dir = path.resolve(dirArg);
  const content = fs.readFileSync(path.join(dir, 'email.html'), 'utf8');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));

  const { tags } = await kit('GET', '/tags');
  const tag = tags.find((t) => t.name === opts.tag);
  if (!tag) throw new Error(`No Kit tag named "${opts.tag}". Tags: ${tags.map((t) => t.name).join(', ')}`);
  const { email_templates: templates } = await kit('GET', '/email_templates');
  const template = templates.find((t) => t.is_default) ?? templates[0];
  if (template.category === 'Starting point') throw new Error(`Default template "${template.name}" is a Starting point template, which the API can't fill`);

  const body = draftBody({ content, meta, tagId: tag.id, templateId: template.id, isPublic: opts.public });
  let saved;
  if (opts.broadcast) {
    const { broadcast: current } = await kit('GET', `/broadcasts/${Number(opts.broadcast)}`);
    if (current.send_at) throw new Error(`Broadcast ${current.id} is already sent or scheduled (${current.send_at}); not changing it`);
    ({ broadcast: saved } = await kit('PUT', `/broadcasts/${current.id}`, body));
  } else {
    ({ broadcast: saved } = await kit('POST', '/broadcasts', body));
  }
  console.log(JSON.stringify({
    id: saved.id, subject: saved.subject, preview_text: saved.preview_text, public: saved.public,
    send_at: saved.send_at, template: saved.email_template?.name, subscriber_filter: saved.subscriber_filter,
    content_bytes: Buffer.byteLength(saved.content ?? ''), tag: `${tag.name} ${tag.id}`,
    edit: `https://app.kit.com/campaigns/${saved.id}/draft`,
  }, null, 2));
}

async function main(argv) {
  const opts = args(argv);
  const kit = client(readKey());
  if (opts._[0] === 'check') return check(kit);
  if (opts._[0] === 'draft') return draft(kit, opts);
  throw new Error('Usage: kit.mjs check | kit.mjs draft <edition-dir> --tag <tag-name> [--broadcast <id>] [--public]');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => { console.error(err.message); process.exit(1); });
}
