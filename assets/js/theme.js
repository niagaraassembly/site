/* Wires the light/dark toggle.
 *
 * The theme is applied in an inline <head> script, not here: this file is
 * deferred, and anything deferred runs after first paint, which would show
 * a flash of light before switching to dark. This file only handles the
 * click.
 */
const KEY = 'na-theme';

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* private mode */ }

  /* sketch.js reads --ink once, at draw time, and bakes it into the SVG
     stroke. Without this the hand-drawn borders keep the old theme's ink
     and vanish against the new background. */
  if (window.NASketch) window.NASketch.redraw();
}

for (const button of document.querySelectorAll('[data-theme-toggle]')) {
  button.addEventListener('click', () => {
    apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}
