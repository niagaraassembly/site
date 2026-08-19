import { escapeHtml, safeHttpUrl } from './escape.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const EMPTY_TEXT = 'No meetups yet — post the first one';

export function formatMeetupLine(m) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(m.starts);
  if (!parts) return m.venue;
  const [, y, mo, d, hh, mm] = parts;
  const dow = DAYS[new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()];
  const ap = +hh < 12 ? 'am' : 'pm';
  const h12 = (+hh % 12) || 12;
  const time = +mm ? `${h12}:${mm}${ap}` : `${h12}${ap}`;
  return `${dow} ${MONTHS[+mo - 1]} ${+d}, ${time} — ${m.venue}`;
}

export function upcoming(meetups, now) {
  return meetups
    .filter(m => new Date(m.starts).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.starts) - new Date(b.starts));
}

export function bandState(meetups, now) {
  const next = upcoming(meetups, now)[0];
  return next
    ? { empty: false, listingEnabled: true, text: formatMeetupLine(next), meetup: next }
    : { empty: true, listingEnabled: false, text: EMPTY_TEXT, meetup: null };
}

export function mountBand(meetups, doc = document, now = new Date()) {
  const state = bandState(meetups, now);
  const list = upcoming(meetups, now);
  const band = doc.getElementById('band');
  band.innerHTML = `
    <button type="button" id="band-listing" class="band__btn"${state.listingEnabled ? '' : ' disabled'}
            aria-expanded="false" aria-controls="band-drawer">Meetup</button>
    <span class="band__div"></span>
    <span class="band__ev">${escapeHtml(state.text)}</span>
    <span class="band__div"></span>
    <button type="button" id="band-add" class="band__btn">＋ Add</button>`;
  const drawer = doc.getElementById('band-drawer');
  drawer.innerHTML = list.map(m => {
    const href = safeHttpUrl(m.calendar_url);
    return `
    <div class="drawer__row">
      <span>${escapeHtml(formatMeetupLine(m))}</span>
      ${href ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">cal ↗</a>` : ''}
    </div>`;
  }).join('');
  const btn = doc.getElementById('band-listing');
  btn.addEventListener('click', () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
}
