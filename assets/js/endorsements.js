import { escapeHtml as esc } from './escape.js';

export const COLLAPSE_AT = 400;

export function voices(list) {
  return list.filter(e => typeof e.comment === 'string' && e.comment.trim().length > 0);
}

export function needsCollapse(comment) {
  return typeof comment === 'string' && comment.length > COLLAPSE_AT;
}

export function collapse(comment) {
  if (!needsCollapse(comment)) return comment;
  const cut = comment.lastIndexOf(' ', COLLAPSE_AT);
  return comment.slice(0, cut > 0 ? cut : COLLAPSE_AT).trimEnd() + '…';
}

export function columns(list, n) {
  if (list.length === 0) return [];
  const per = Math.ceil(list.length / n);
  const out = [];
  for (let i = 0; i < list.length; i += per) out.push(list.slice(i, i + per));
  return out;
}

function voiceRow(e) {
  const long = needsCollapse(e.comment);
  return `<article class="voice">
    <div class="voice__who"><b>${esc(e.name)}</b><br><span>${esc(e.trade)}</span><br><span>${esc(e.location)}</span></div>
    <div class="voice__body">
      <p>${esc(long ? collapse(e.comment) : e.comment)}</p>
      ${long ? `<button type="button" class="voice__more" data-full="${esc(e.comment)}">Read more +</button>` : ''}
    </div>
  </article>`;
}

export function mountEndorsements(list, doc = document) {
  const face = doc.getElementById('face-endorsements');
  const v = voices(list);
  face.innerHTML = `
    <nav class="subswitch">
      <button type="button" data-view="voices" aria-current="true">Voices</button>
      <button type="button" data-view="everyone" aria-current="false">Everyone</button>
      <span class="subswitch__count">${list.length} endorser${list.length === 1 ? '' : 's'}</span>
    </nav>
    <div id="view-voices">${v.map(voiceRow).join('') || '<p class="empty">No published comments yet.</p>'}</div>
    <div id="view-everyone" hidden class="everyone">
      ${columns(list, 2).map(col => `<div>${col.map(e =>
        `<div class="everyone__row"><b>${esc(e.name)}</b> · <span>${esc(e.trade)} · ${esc(e.location)}</span></div>`
      ).join('')}</div>`).join('')}
    </div>`;

  face.addEventListener('click', (ev) => {
    const view = ev.target.closest('[data-view]');
    if (view) {
      for (const b of face.querySelectorAll('[data-view]')) {
        const on = b === view;
        b.setAttribute('aria-current', String(on));
        doc.getElementById(`view-${b.dataset.view}`).hidden = !on;
      }
      return;
    }
    const more = ev.target.closest('.voice__more');
    if (more) {
      more.previousElementSibling.textContent = more.dataset.full;
      more.remove();
    }
  });
}
