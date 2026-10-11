import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readKey, tagFilter, draftBody, client } from '../scripts/kit/kit.mjs';

const meta = { subject: 'S', preview_text: 'P', description: 'D' };

test('a draft is always a draft, for one tag, with every field set', () => {
  const body = draftBody({ content: '<p>x</p>', meta, tagId: 22621694, templateId: 5464969 });
  assert.equal(body.send_at, null);
  assert.equal(body.public, false);
  assert.deepEqual(body.subscriber_filter, [{ all: [{ type: 'tag', ids: [22621694] }], any: null, none: null }]);
  assert.deepEqual(Object.keys(body).sort(),
    ['content', 'description', 'email_template_id', 'preview_text', 'public', 'send_at', 'subject', 'subscriber_filter']);
});

test('a draft refuses empty content or missing meta', () => {
  assert.throws(() => draftBody({ content: '  ', meta, tagId: 1, templateId: 1 }), /empty/);
  assert.throws(() => draftBody({ content: 'x', meta: { subject: 'S' }, tagId: 1, templateId: 1 }), /preview_text/);
});

test('tag ids are numbers', () => {
  assert.deepEqual(tagFilter('7')[0].all[0].ids, [7]);
});

test('the key comes from the environment first, then the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
  const file = path.join(dir, 'kit.env');
  fs.writeFileSync(file, 'OTHER=1\nKIT_API_KEY=kit_fromfile\n');
  assert.equal(readKey({ KIT_API_KEY: 'kit_fromenv' }, file), 'kit_fromenv');
  assert.equal(readKey({}, file), 'kit_fromfile');
  assert.equal(readKey({}, path.join(dir, 'missing.env')), '');
});

test('the client sends the key header and reports Kit errors', async () => {
  const calls = [];
  const fake = async (url, init) => {
    calls.push([url, init]);
    return { ok: false, status: 422, statusText: 'Unprocessable', text: async () => JSON.stringify({ errors: ['Subject is required'] }) };
  };
  const kit = client('kit_test', fake);
  await assert.rejects(kit('PUT', '/broadcasts/1', { a: 1 }), /HTTP 422: Subject is required/);
  assert.equal(calls[0][0], 'https://api.kit.com/v4/broadcasts/1');
  assert.equal(calls[0][1].headers['X-Kit-Api-Key'], 'kit_test');
  assert.throws(() => client(''), /No Kit API key/);
});
