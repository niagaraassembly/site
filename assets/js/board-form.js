/* The "Post to the Board" form, shared by the homepage (#post) and the
 * Board page's posting bar. One copy of the markup, labels and submission
 * rules, so the two can never drift.
 *
 * mountBoardForm(container) writes the form into the container and wires
 * it. Field names never change; only what the visitor reads does.
 */

import { buildFormBody, submitTo, MAX_TEXT, validateBoard } from './submit.js';
import { CATEGORIES, CATEGORY_LABELS, KINDS, REQUIRED, OPTIONAL } from './nav.js';

export const FORM_HTML = `<form id="board-form" novalidate>
    <fieldset id="register" data-sketch="box">
      <legend>Your posting</legend>

      <label>Section
        <select name="category" id="board-category"></select></label>
      <label>Which kind
        <select name="kind" id="board-kind"></select></label>
      <label>Location <span class="opt">just the town or city — this is what people filter by</span>
        <input name="location" id="board-location" required
               placeholder="Welland"></label>

      <p class="fineprint" id="board-hint"></p>

      <label>Your name (for submitting - not public)<input name="name" required autocomplete="name"></label>
      <label>Your email (for submitting - not public) <input name="email" type="email" required autocomplete="email"></label>

      <label data-field="offer"><span data-label-for="offer">Are you</span>
        <select name="offer">
          <option value="offering">Offering</option>
          <option value="seeking">Seeking</option>
        </select></label>
      <label data-field="title"><span data-label-for="title">Title</span>
        <input name="title"></label>
      <label data-field="presenter"><span data-label-for="presenter">Presenter</span>
        <input name="presenter"></label>
      <label data-field="when"><span data-label-for="when">When</span>
        <input name="when" placeholder="2026-09-04, or 'Thursdays 7pm'"></label>
      <label data-field="where"><span data-label-for="where">Where</span>
        <input name="where"></label>
      <label data-field="specs"><span data-label-for="specs">Specs</span>
        <input name="specs"></label>
      <label data-field="price"><span data-label-for="price">Price</span>
        <input name="price" placeholder="$400/mo, free to members, negotiable…"></label>
      <label data-field="description"><span data-label-for="description">Description</span>
        <textarea name="description"></textarea>
        <span class="opt" id="board-counter"></span></label>
      <label data-field="link"><span data-label-for="link">Link</span>
        <input name="link" type="url" placeholder="https://"></label>
      <label data-field="contact"><span data-label-for="contact">Public contact</span>
        <input name="contact" placeholder="an email or phone you're happy to publish"></label>

      <label data-field="visibility">How should this be handled?
        <select name="visibility">
          <option value="public">Publish me on the board</option>
          <option value="private">Register me with NA only — staff follow-up</option>
          <option value="both">Both</option>
        </select></label>

      <p class="fineprint">Your name and email are used for follow-up and are
      never published. Everything else appears on the board once reviewed.</p>
      <button type="submit">Send</button>
      <p class="status" id="board-status" role="status"></p>
    </fieldset>
  </form>`;

/* Read from FB_PUBLIC_LOAD_DATA_ in the live form's page source, not from a
   pre-filled link — that method yields ids that look right and silently
   drop values for some question types. */
  const BOARD_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfD9HocHkf_2xZOtT0_Jr358bqlx2SAa70AaADSfdv_i0CDJw/formResponse';
  const BOARD_MAP = { category:    'entry.572165348',
                      kind:        'entry.1518496677',
                      offer:       'entry.443300922',
                      location:    'entry.2090290740',
                      name:        'entry.699246176',
                      email:       'entry.1276802258',
                      title:       'entry.1851806435',
                      presenter:   'entry.1350405615',
                      when:        'entry.1717420552',
                      where:       'entry.208848275',
                      specs:       'entry.848637377',
                      price:       'entry.327182467',
                      description: 'entry.174033124',
                      link:        'entry.527562516',
                      contact:     'entry.999193750',
                      visibility:  'entry.1277514393' };

  /* Per-category labelling. The `name` attributes never change; only what
     the visitor reads does. Which fields SHOW is derived from nav.js
     rather than restated here — one list, not two that can drift. */
  const LABELS = {
    events:  { title: 'Event title', when: 'When', where: 'Venue',
               presenter: 'Speaker or host', price: 'Ticket or fee',
               contact: 'Public contact' },
    news:    { title: 'Headline', description: 'Why it matters here',
               link: 'Link to the story', where: 'Company or place',
               price: 'Amount, if there is one',
               contact: 'Who to contact — how to apply, for a hiring post' },
    spaces:  { title: 'Name for the space', where: 'Where the space is',
               when: 'Available from', specs: 'Size and specs',
               price: 'Rent or terms',
               description: 'What suits it, and anything else worth saying',
               contact: 'Public contact' },
    tools:   { title: 'What the tool is', where: 'Where it lives',
               specs: 'Make, model, capacity',
               price: 'Price, or free to borrow',
               description: 'What it does, and how to get at it',
               presenter: 'Who owns it', contact: 'Public contact' },
    experts: { title: 'Your name as it should appear publicly',
               description: 'Expertise and credentials',
               when: 'Availability', where: 'Where you work',
               price: 'Your rate, if you have one',
               contact: 'Public contact' },
    shows:   {
              title: 'Show title',
              presenter: 'Work',
              specs: 'Subject',
              description: 'About the show',
              link: 'Where to follow it'}
  };

  /* A category that does not name a field falls back to these. Without a
     fallback the span keeps the PREVIOUS category's text — which is how
     "Link to the story" ended up on Spaces, Tools and Experts. */
  const DEFAULT_LABELS = {
    offer: 'Are you', title: 'Title', presenter: 'Presenter', when: 'When',
    where: 'Where', specs: 'Specs', price: 'Price', description: 'Description',
    link: 'Link', contact: 'Public contact'
  };

  const HINTS = {
    events:  'Something happening on a date, at a place.',
    news:    'A link and a few lines about what changed.',
    spaces:  'Space someone else could use. Roughly what, roughly on what terms.',
    tools:   'A machine or tool others could get at.',
    experts: 'Offer training or workshops. You choose whether this is published.',
    shows:   'A personal or shared practice being narrated over time.'
  };

export function mountBoardForm(container, { category } = {}) {
  container.innerHTML = FORM_HTML;
  const boardForm = container.querySelector('#board-form');
  const categorySelect = container.querySelector('#board-category');
  const kindSelect = container.querySelector('#board-kind');
  const boardHint = container.querySelector('#board-hint');

  const option = (value, label) => {
    const o = document.createElement('option');
    o.value = value; o.textContent = label;
    return o;
  };

  for (const c of CATEGORIES) categorySelect.append(option(c, CATEGORY_LABELS[c]));

  function shapeBoardForm() {
    const category = categorySelect.value;

    kindSelect.replaceChildren();
    for (const [slug, label] of Object.entries(KINDS[category])) {
      kindSelect.append(option(slug, label));
    }

    boardHint.textContent = HINTS[category];

    const shown = new Set([...REQUIRED[category], ...OPTIONAL[category]]);
    if (category === 'experts') shown.add('visibility');

    for (const label of boardForm.querySelectorAll('[data-field]')) {
      const field = label.dataset.field;
      const on = shown.has(field);
      label.hidden = !on;
      /* A hidden field must not carry a stale value into the submission —
         switching Events to News would otherwise post a presenter. */
      if (!on) for (const input of label.querySelectorAll('input, textarea, select')) {
        input.value = input.tagName === 'SELECT' ? input.options[0].value : '';
      }

      const span = label.querySelector('[data-label-for]');
      const text = LABELS[category]?.[field] ?? DEFAULT_LABELS[field];
      if (span && text) {
        span.textContent = text + (REQUIRED[category].includes(field) ? '' : ' (optional)');
      }
    }
  }

  categorySelect.addEventListener('change', shapeBoardForm);
  shapeBoardForm();

  const counter = container.querySelector('#board-counter');
  const description = boardForm.querySelector('[name=description]');
  description.setAttribute('maxlength', String(MAX_TEXT));
  description.addEventListener('input', () => {
    counter.textContent = `${description.value.length} / ${MAX_TEXT}`;
  });

  const MESSAGES = {
    'link-not-http': 'Links need to start with http:// or https://.',
    'description-too-long': `That description is over the ${MAX_TEXT}-character limit.`,
    'github-username': "That doesn't look like a GitHub username.",
    'visibility': 'Please choose how this should be handled.',
    'location': 'Please choose a location.',
    'default': 'Please fill in every field shown.'
  };

  /* Start on the section the visitor is looking at, when there is one. */
  if (category && CATEGORIES.includes(category)) { categorySelect.value = category; shapeBoardForm(); }

  const status = container.querySelector('#board-status');
  boardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(boardForm).entries());
    /* A hidden field must not reach the Google Form. */
    for (const label of boardForm.querySelectorAll('[data-field]')) {
      if (label.hidden) delete values[label.dataset.field];
    }
    const errors = validateBoard(values);
    if (errors.length) {
      status.dataset.state = 'error';
      status.textContent = MESSAGES[errors.find((k) => k in MESSAGES)] ?? MESSAGES.default;
      return;
    }
    status.dataset.state = 'sending';
    status.textContent = 'Sending…';
    try {
      await submitTo(BOARD_ACTION, buildFormBody(values, BOARD_MAP));
      boardForm.reset();
      shapeBoardForm();
      counter.textContent = '';
      status.dataset.state = 'done';
      status.textContent = "Thank you — that's been sent. Posts appear on the board once reviewed.";
    } catch {
      status.dataset.state = 'error';
      status.textContent = 'That did not go through. Please try again.';
    }
  });
  return boardForm;
}
