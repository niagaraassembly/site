/* The email edition of Western New York, Issue One, for a Kit broadcast.
 *
 * Reads the frozen issue export and reuses the website's editorial logic in
 * assets/js/wny.js (which stories are publishable and in the issue, their
 * order, stages, amounts, flags, figures and the region equation), so the
 * email says exactly what the issue page says. Only the presentation is
 * email-specific: one 600px column of tables with inline styles, system
 * fonts, no scripts or SVG, and the two graphics as hosted PNGs. Kit's
 * "Text only" (Classic) template wraps this body and adds the unsubscribe
 * link and postal address.
 *
 * Writes, next to this file:
 *   email.html    the body sent to Kit as the broadcast's content
 *   preview.html  that body inside a plain 600px page, for checking locally
 *   meta.json     subject, preview text and description for the broadcast
 *
 * Run from the repository root:
 *   node MAGS/WNY/issue/one/email/build.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as w from '../../../../../assets/js/wny.js';
import { escapeHtml as esc, safeHttpUrl } from '../../../../../assets/js/escape.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../../../..');
const SITE = 'https://niagaraassembly.com';
const ISSUE_URL = `${SITE}/MAGS/WNY/issue/one/`;
const IMG = `${SITE}/MAGS/WNY/issue/one/email/`;
/* Kit broadcasts cannot carry attachments, so the PDF edition is linked. */
const PDF_URL = `${SITE}/MAGS/WNY/issue/one/pdf/wny-issue-one.pdf`;
const pdfBytes = fs.statSync(path.join(dir, '../pdf/wny-issue-one.pdf')).size;
const pdfSize = `${Math.round(pdfBytes / 1024)} KB`;

const data = JSON.parse(fs.readFileSync(path.join(root, 'data/wny/issue-one.json'), 'utf8'));
const issue = w.issueFor(data, 'WNY-2026-001');
const items = w.byNewest(w.publishable(data.items)).filter((i) => issue.events.includes(i.id));

/* Colours: the site's light tokens (site.css, mag.css), written out because
   email clients do not read custom properties. */
const C = {
  ink: '#17181a', soft: '#55585d', rule: '#c9c6bf', sheet: '#fcfbf9',
  done: '#1f6b34', announced: '#7a6200', warn: '#8a5300', info: '#1d5a8c',
};
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const TONE = { done: C.done, announced: C.announced };
const toneOf = (stage) => TONE[w.AMOUNT_TONES[stage]] ?? C.ink;

const link = (href, text, style = '') =>
  `<a href="${esc(href)}" style="color:${C.ink};text-decoration:underline;${style}">${text}</a>`;
const p = (html, style = '') =>
  `<p style="margin:0 0 14px;font:16px/1.55 ${SANS};color:${C.ink};${style}">${html}</p>`;
const small = (html, style = '') => p(html, `font-size:13px;line-height:1.5;color:${C.soft};${style}`);
const h2 = (text) =>
  `<h2 style="margin:36px 0 6px;padding-top:14px;border-top:1px solid ${C.ink};font:700 20px/1.25 ${SANS};color:${C.ink};">${text}</h2>`;
/* The first row is padded from the top: the Text only template puts the body
   right against its top edge. */
const row = (html, pad = '0') => `<tr><td style="padding:${pad};">${html}</td></tr>`;
const storyHref = (item) => `${ISSUE_URL}#wny-${item.id}`;

/* ---- opening -------------------------------------------------------------- */

const counties = w.storiesByCounty(items);
const countyAlt = `County map of Western New York's 21 counties. Stories in this issue: ${
  [...counties].map(([name, c]) => `${name} ${c.count}`).join(', ')}.`;
const span = w.coverageText(issue.coverage_start, issue.coverage_end);

const opening = [
  `<p style="margin:0 0 6px;font:12px/1.4 ${MONO};color:${C.soft};">Niagara Assembly MAG</p>`,
  `<h1 style="margin:0 0 6px;font:700 34px/1.1 ${SANS};color:${C.ink};">Western New York</h1>`,
  `<p style="margin:0 0 18px;font:13px/1.5 ${MONO};color:${C.soft};">${esc([issue.title, w.apDate(issue.published), span ? `News from ${span}` : ''].filter(Boolean).join(' · '))}</p>`,
  `<img src="${IMG}county-band.png" width="600" alt="${esc(countyAlt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0 0 6px;">`,
  /* The image is small on a phone, so the counts are also given as text. */
  small(`Stories by county: ${[...counties].map(([name, c]) => `${esc(name)} <b style="color:${C.ink};">${c.count}</b>`).join(' · ')}. <span style="color:${C.done};font-weight:700;">Green</span>: completed. <span style="color:${C.announced};font-weight:700;">Yellow</span>: announced. Grey: other news.`, 'margin-bottom:20px;'),
  p(esc(issue.summary), 'font-size:18px;line-height:1.5;'),
  p('Reviewed news from the Niagara River to Syracuse: who is investing, building, hiring and starting up. Every story has passed Niagara Assembly’s source review, and each one carries our reading of it: how far along it is, and what is still unconfirmed.'),
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;"><tr><td style="background:${C.ink};border-radius:3px;"><a href="${ISSUE_URL}" style="display:inline-block;padding:11px 20px;font:700 15px/1 ${SANS};color:#ffffff;text-decoration:none;white-space:nowrap;">Read Issue One online</a></td>`
    + `<td style="padding-left:18px;font:15px/1.3 ${SANS};">${link(PDF_URL, 'Download the PDF')} <span style="font-size:12px;color:${C.soft};">(${pdfSize})</span></td></tr></table>`,
  `<img src="${IMG}corridor.png" width="600" alt="Where this issue's stories sit between Buffalo, Rochester and Syracuse." style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0 0 4px;">`,
  small('Story locations from the Niagara River to Syracuse. Green: completed. Yellow: announced. Hollow: in development, not yet built or confirmed.'),
].join('');

/* ---- figures -------------------------------------------------------------- */

function cellsTable(cells) {
  const td = (c) => `<td width="33%" valign="top" style="padding:10px 8px 10px 0;border-top:1px solid ${C.rule};">`
    + `<div style="font:700 22px/1.2 ${SANS};color:${c.counted ? (TONE[c.tone] ?? C.ink) : C.soft};">${esc(c.value)}</div>`
    + `<div style="font:13px/1.35 ${SANS};color:${C.ink};">${esc(c.caption)}</div>`
    + `<div style="font:12px/1.35 ${SANS};color:${C.soft};">${esc(c.detail)}</div></td>`;
  const rows = [];
  for (let i = 0; i < cells.length; i += 3) {
    const three = cells.slice(i, i + 3);
    rows.push(`<tr>${three.map(td).join('')}${'<td width="33%"></td>'.repeat(3 - three.length)}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px;">${rows.join('')}</table>`;
}

const TERM_WORDS = { investment: 'announced investment', committed: 'committed contract money' };
function equation(eq) {
  if (!eq) return '';
  const parts = eq.terms.map((t, i) => {
    const next = eq.terms[i + 1];
    const label = !next || next.kind !== t.kind ? ` ${TERM_WORDS[t.kind]}` : '';
    return `<b style="color:${TONE[t.tone] ?? C.ink};">${esc(t.value)}</b>${esc(label)}`;
  });
  const left = eq.left.map((l) => `an undisclosed share of ${w.articleFor(l.value)} ${esc(l.value)} contract${l.place ? ` (${esc(l.place)})` : ''}`);
  return small('Announced investment and committed contract money tied to work in the region', `margin:0 0 4px;color:${C.ink};font-weight:700;`)
    + p(`${parts.join(' + ')} = <b>${esc(eq.total)}</b>`, 'margin-bottom:4px;')
    + (left.length ? small(`plus ${left.join(', and ')}`, 'margin-bottom:4px;') : '')
    + (eq.secondary ? small('Contract amounts come from a secondary listing; the original notice wasn’t accessed.') : '');
}

/* Lines of "figure | what | meta", used for Coming up, Jobs and Public support. */
function lines(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 8px;">${rows.map(([figure, what, meta, colour]) =>
    `<tr><td valign="top" width="96" style="padding:8px 10px 8px 0;border-top:1px solid ${C.rule};font:700 14px/1.4 ${SANS};color:${colour ?? C.ink};white-space:nowrap;">${esc(figure)}</td>`
    + `<td valign="top" style="padding:8px 0;border-top:1px solid ${C.rule};font:14px/1.4 ${SANS};color:${C.ink};">${what}`
    + (meta ? `<br><span style="font-size:12px;color:${C.soft};">${esc(meta)}</span>` : '') + '</td></tr>').join('')}</table>`;
}

const comingRows = w.comingUp(items).map((i) =>
  [w.partialDate(i.next_step.date), link(storyHref(i), esc(i.next_step.text)), [i.entity_name, i.place].filter(Boolean).join(' · ')]);
const jobRows = w.jobLines(items).map((i) => {
  const figure = i.jobs_added != null ? `+${i.jobs_added}` : i.jobs_lost != null ? `−${i.jobs_lost}` : 'Disputed';
  const what = i.jobs_added != null || i.jobs_lost != null ? i.headline : `${i.headline}: sources disagree on jobs`;
  return [figure, link(storyHref(i), esc(what)), [w.STAGES[i.stage], i.place].filter(Boolean).join(' · '), i.jobs_added != null ? C.done : C.ink];
});
const supportRows = items.filter((i) => i.incentive).map((i) =>
  [w.formatAmount(i.incentive.amount, i.currency) || '—', link(storyHref(i), esc(i.incentive.program || i.headline)), [w.words(i.incentive.type), i.entity_name].filter(Boolean).join(' · ')]);

const figures = [
  h2('Dollar figures'),
  small('Amounts as stated in the stories, grouped by kind of money. Each figure is its own kind of money; contract ceilings are excluded.'),
  cellsTable(w.moneyCells(items)),
  equation(w.regionEquation(items)),
  comingRows.length ? h2('Coming up') + small('Dated next steps in this issue’s stories, soonest first.') + lines(comingRows) : '',
  jobRows.length ? h2('Jobs') + small('Job figures as the sources state them. Where they disagree, the story shows each one.') + lines(jobRows) : '',
  supportRows.length ? h2('Public support') + small('Tax credits and other public awards; kept apart from the dollar figures.') + lines(supportRows) : '',
].join('');

/* ---- stories -------------------------------------------------------------- */

function story(item) {
  const amount = w.formatAmount(item.amount, item.currency);
  const ceiling = w.formatAmount(item.ceiling_amount, item.currency);
  const stage = w.STAGES[item.stage];
  const top = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td style="font:12px/1 ${SANS};color:${C.ink};">${stage ? `<span style="display:inline-block;padding:4px 7px;border:1px solid ${C.soft};border-radius:3px;">${esc(stage)}</span>` : ''}</td>`
    + `<td align="right" style="font:12px/1.3 ${SANS};color:${C.soft};">`
    + (amount ? `<b style="font:700 18px/1.2 ${SANS};color:${toneOf(item.stage)};">${esc(amount)}</b>${item.amount_type ? ` ${esc(w.words(item.amount_type))}` : ''}` : '')
    + (ceiling ? `${amount ? '<br>' : ''}Contract ceiling ${esc(ceiling)}` : '')
    + '</td></tr></table>';
  const facts = [];
  const jobs = [item.jobs_added != null ? `${item.jobs_added} added` : '', item.jobs_lost != null ? `${item.jobs_lost} lost` : ''].filter(Boolean).join(', ');
  if (jobs) facts.push(['Jobs', jobs]);
  if (item.incentive) facts.push(['Public support', w.incentiveText(item.incentive, item.currency)]);
  if (item.next_step?.text) facts.push(['Next', [item.next_step.text, w.partialDate(item.next_step.date)].filter(Boolean).join(', ')]);
  const steps = (item.stage_history ?? []).filter((h) => w.STAGES[h.stage]);
  if (steps.length) facts.push(['Stage', steps.map((h) => [w.STAGES[h.stage], w.apDate(h.date)].filter(Boolean).join(' ')).join(' → ')]);
  const factsHtml = facts.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;">${facts.map(([k, v]) =>
      `<tr><td valign="top" style="padding:2px 12px 2px 0;font:700 13px/1.45 ${SANS};color:${C.soft};white-space:nowrap;">${k}</td><td valign="top" style="padding:2px 0;font:13px/1.45 ${SANS};color:${C.ink};">${esc(v)}</td></tr>`).join('')}</table>`
    : '';
  /* A disagreement that the story spells out below is not flagged twice. */
  const spelled = new Set((item.conflicts ?? []).filter((c) => c.values?.length).map((c) => c.field));
  const flags = (item.flags ?? []).filter((f) => !(f.type === 'conflict' && spelled.has(f.detail))).map(w.flagText);
  const flagHtml = flags.length
    ? small(flags.map((f) => `<span style="color:${f.tone === 'warn' ? C.warn : f.tone === 'info' ? C.info : C.soft};">${esc(f.text.replace(/\.?$/, '.'))}</span>`).join(' '), 'margin-bottom:8px;')
    : '';
  const conflicts = (item.conflicts ?? []).map((c) => {
    const values = (c.values ?? []).map((v) => {
      const url = safeHttpUrl(v.url);
      const source = v.source ? (url ? link(url, esc(v.source), `color:${C.soft};`) : esc(v.source)) : 'source not named';
      return `${esc(v.value)} (${source})`;
    });
    return values.length ? small(`<b style="color:${C.ink};">Sources disagree on ${esc(w.words(c.field))}:</b> ${values.join('; ')}`, 'margin-bottom:8px;') : '';
  }).join('');
  const sources = (item.sources ?? []).map((s) => {
    const url = safeHttpUrl(s.url);
    const name = s.publisher || s.title || 'Source';
    const kind = w.SOURCE_KINDS[s.kind] ? ` (${w.SOURCE_KINDS[s.kind]})` : '';
    return (url ? link(url, esc(name), `color:${C.soft};`) : esc(name)) + esc(kind);
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;border-top:1px solid ${C.rule};"><tr><td style="padding:16px 0 10px;">`
    + top
    + `<h3 style="margin:10px 0 4px;font:700 18px/1.3 ${SANS};">${link(storyHref(item), esc(item.headline), 'text-decoration:none;')}</h3>`
    + `<p style="margin:0 0 10px;font:12px/1.45 ${MONO};color:${C.soft};">${esc([w.typeLabel(item.type), w.formatDate(item.date), item.place, item.entity_name].filter(Boolean).join(' · '))}</p>`
    + (item.note ? p(esc(item.note), 'font-size:15px;margin-bottom:10px;') : '')
    + factsHtml + flagHtml + conflicts
    + (sources.length ? small(`${sources.length > 1 ? 'Sources' : 'Source'}: ${sources.join('; ')}`, 'margin-bottom:0;') : '')
    + '</td></tr></table>';
}

/* The issue page's lane banners (MAGS/WNY/issue/one/index.html). */
const LANE_NOTES = {
  production: 'Direct investment, contracts and closures.',
  developing: 'Announced plans and applications: not yet built or confirmed.',
  corridor: 'Regional news, not counted in production or investment totals.',
};
const stories = w.LANES.map((lane) => {
  const inLane = items.filter((i) => i.lane === lane.id);
  return inLane.length ? h2(esc(lane.label)) + small(LANE_NOTES[lane.id] ?? '') + inLane.map(story).join('') : '';
}).join('');

/* ---- close ---------------------------------------------------------------- */

const close = [
  h2('More in the online issue'),
  p(`${link(`${ISSUE_URL}`, 'Issue One online')} also lists the people mentioned, the organisations these stories are about, and the stories by Congressional, State Senate and Assembly district.`),
  p(`Read about our ${link(`${SITE}/research/methods/news/`, 'news methods')}, or see ${link(`${SITE}/MAGS/WNY/posts/`, 'all articles')} and ${link(`${ISSUE_URL}sources/`, 'news sources')}.`),
  p(`Forward this email to anyone who follows industry in Western New York. They can sign up at ${link(`${SITE}/MAGS/WNY/`, 'niagaraassembly.com/MAGS/WNY')}.`),
  small(`Niagara Assembly (unincorporated) · ${link('mailto:office@niagaraassembly.com', 'office@niagaraassembly.com', `color:${C.soft};`)}`, 'margin-top:24px;'),
  small(`This edition uses the Issue One export of ${esc(data.generated_at.slice(0, 10))}; the reporting and review status are those of the issue.`),
].join('');

/* ---- assemble ------------------------------------------------------------- */

const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">`
  + row(opening, '28px 0 0') + row(figures) + row(stories) + row(close) + '</table>';

const subject = 'Western New York MAG, Issue One (@niagaraassembly)';
const previewText = 'Solstice’s $49M Buffalo R&D expansion, Goodyear’s Niagara Falls closure, and defense contracts from Liverpool to Niagara Falls.';
const meta = {
  subject,
  preview_text: previewText,
  description: `WNY MAG ${issue.title} (${issue.id}), built ${new Date().toISOString().slice(0, 10)} from data/wny/issue-one.json generated ${data.generated_at}`,
  stories: items.length,
};

const preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>`
  /* Local copies of the images, so the preview works before they are published. */
  + `<body style="margin:0;padding:24px 12px;background:#f1f0ed;"><div style="max-width:600px;margin:0 auto;padding:28px 24px;background:#ffffff;">${body.replaceAll(IMG, '')}`
  + `<p style="margin:32px 0 0;font:12px/1.5 ${SANS};color:#999;text-align:center;">[Kit adds the unsubscribe link and postal address here]</p></div></body></html>`;

fs.writeFileSync(path.join(dir, 'email.html'), body);
fs.writeFileSync(path.join(dir, 'preview.html'), preview);
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(JSON.stringify({ stories: items.length, bytes: Buffer.byteLength(body), subject }));
