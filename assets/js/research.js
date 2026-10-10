/* Research MAG — post and place lists.
 *
 * data/research.json is the single list of Research posts and places. The
 * Research index shows the most recent posts; /MAGS/RESEARCH/posts/ shows
 * all of them. Both render from the same data so the lists cannot drift.
 */

import { escapeHtml } from './escape.js';

export const RECENT_LIMIT = 5;

/** Posts newest first; posts sharing a date keep their order in the data. */
export function byNewest(posts) {
  return posts
    .map((post, index) => ({ post, index }))
    .sort((a, b) => String(b.post.date).localeCompare(String(a.post.date)) || a.index - b.index)
    .map(({ post }) => post);
}

export function recentPosts(posts, limit = RECENT_LIMIT) {
  return byNewest(posts).slice(0, limit);
}

/** Only site-relative links are rendered; research data never links off-site. */
function localHref(href) {
  return /^\/(?!\/)/.test(String(href ?? '')) ? String(href) : '#';
}

function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function renderPostList(posts) {
  return posts.map((post) => {
    const date = formatDate(post.date);
    const meta = [date, post.summary].filter(Boolean).map(escapeHtml).join(' · ');
    return `<li class="issue-list__item"><a class="issue-list__title" href="${escapeHtml(localHref(post.href))}">${escapeHtml(post.title)}</a><p class="issue-list__meta">${meta}</p></li>`;
  }).join('');
}

export function renderPlaceList(places) {
  return places.map((place) =>
    `<li class="issue-list__item"><a class="issue-list__title" href="${escapeHtml(localHref(place.href))}">${escapeHtml(place.name)}</a><p class="issue-list__meta">${escapeHtml(place.summary)}</p></li>`
  ).join('');
}

/**
 * Fill every [data-research] list on the page:
 *   data-research="recent" | "all" | "places"
 *   data-research-place="<id>" narrows posts to one place.
 */
export async function mountResearchLists(root = document) {
  const lists = root.querySelectorAll('[data-research]');
  if (!lists.length) return;
  let data;
  try {
    const res = await fetch('/data/research.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    for (const list of lists) {
      list.innerHTML = '<li class="issue-list__item"><p class="issue-list__meta">Could not load the research list. Please reload the page.</p></li>';
    }
    console.error('research.json failed to load', err);
    return;
  }
  for (const list of lists) {
    const kind = list.dataset.research;
    const place = list.dataset.researchPlace;
    if (kind === 'places') {
      list.innerHTML = renderPlaceList(data.places ?? []);
      continue;
    }
    let posts = data.posts ?? [];
    if (place) posts = posts.filter((post) => post.place === place);
    list.innerHTML = renderPostList(kind === 'recent' ? recentPosts(posts) : byNewest(posts));
  }
}
