/* Whether the empty margin beside the drawn frame is wide enough to hold a
 * side block (the Apps panel, a subsite's margin notes).
 *
 * The page widths grow with the screen (see --w-page and --w-mag in
 * site.css), so a fixed viewport breakpoint would drift from the frame. This
 * measures the frame as drawn instead. 12rem of margin leaves the block
 * 8.5rem once its 1.5rem gap and the 2rem kept clear of the screen edge are
 * taken out; site.css's .subsite-nav media query is set to the same room on
 * a page-width frame.
 */

export const MIN_MARGIN_REM = 12;

export function marginFits(viewportPx, framePx, remPx = 16) {
  return (viewportPx - framePx) / 2 >= MIN_MARGIN_REM * remPx;
}

export function frameHasMargin(frame) {
  if (!frame) return false;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  /* innerWidth, like CSS media queries and 100vw, includes the scrollbar, so
     this agrees with the .subsite-nav query and the side blocks' 100vw widths. */
  return marginFits(window.innerWidth, frame.getBoundingClientRect().width, rem);
}
