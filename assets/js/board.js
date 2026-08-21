/* Renders data/board.json.
 *
 * Split from the page so groupByType and cardHtml can be tested without a
 * DOM — mountBoard is the only function that touches one, and it touches
 * exactly one property.
 *
 * Every value here came from a public form and passed only an EDITORIAL
 * approval gate. Nothing is trusted to be inert; escapeHtml and
 * safeHttpUrl are applied at the point of interpolation, not upstream.
 */
import { escapeHtml, safeHttpUrl } from './escape.js';

export const TYPE_ORDER = ['standup', 'talk', 'demo', 'space', 'news', 'idea'];

export const TYPE_LABELS = {
  standup: 'Stand-ups',
  talk:    'Talks',
  demo:    'Demos',
  space:   'Space offered',
  news:    'News',
  idea:    'Ideas'
};

/* Newest first. Date is a plain ISO string so a string compare is a date
   compare; id breaks ties because two posts on one day are common and an
   unstable order would reshuffle the page on every load. */
function newestFirst(a, b) {
  const byDate = String(b.date ?? '').localeCompare(String(a.date ?? ''));
  return byDate !== 0 ? byDate : String(b.id ?? '').localeCompare(String(a.id ?? ''));
}

export function groupByType(records) {
  return TYPE_ORDER
    .map((type) => ({
      type,
      label: TYPE_LABELS[type],
      records: records.filter((r) => r.type === type).sort(newestFirst)
    }))
    .filter((group) => group.records.length > 0);
}

export function cardHtml(record) {
  const e = escapeHtml;
  const rows = [];

  if (record.title)       rows.push(`<h3 class="card__title">${e(record.title)}</h3>`);
  if (record.presenter)   rows.push(`<p class="card__by">${e(record.presenter)}</p>`);
  if (record.when)        rows.push(`<p class="card__when">${e(record.when)}</p>`);
  if (record.where)       rows.push(`<p class="card__where">${e(record.where)}</p>`);
  if (record.description) rows.push(`<p class="card__desc">${e(record.description)}</p>`);

  const url = safeHttpUrl(record.link);
  if (url) rows.push(`<p class="card__link"><a href="${e(url)}" rel="noopener">${e(url)}</a></p>`);

  if (record.contact) rows.push(`<p class="card__contact">${e(record.contact)}</p>`);

  return `<article class="card" data-sketch="box" data-type="${e(record.type)}">` +
         rows.join('') + `</article>`;
}

export function mountBoard(records, root) {
  const groups = groupByType(records ?? []);

  if (groups.length === 0) {
    root.innerHTML = `<p class="board__empty">There is nothing on the board yet. ` +
                     `Post the first thing.</p>`;
    return;
  }

  root.innerHTML = groups.map((group) =>
    `<section class="board__group">` +
      `<h2 class="board__heading">${escapeHtml(group.label)}</h2>` +
      group.records.map(cardHtml).join('') +
    `</section>`
  ).join('');
}
