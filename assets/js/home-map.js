/* The simple map remains the default, including when JavaScript is unavailable. */
const button = document.querySelector('#home-map-flip');
const simple = document.querySelector('#home-map-simple');
const detailed = document.querySelector('#home-map-detailed');
const image = document.querySelector('#home-region-image');
const status = document.querySelector('#home-map-status');

if (button && simple && detailed && image && status) {
  let showingDetail = false;
  function setView(detail) {
    showingDetail = detail;
    simple.hidden = detail;
    detailed.hidden = !detail;
    button.setAttribute('aria-pressed', String(detail));
    const label = detail ? 'Show simplified regional map' : 'Show detailed regional map';
    button.setAttribute('aria-label', label);
    button.title = label;
    status.textContent = detail ? 'Detailed regional map shown.' : 'Simplified regional map shown.';
  }
  function syncTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const source = dark ? '/sketches/region/region-map-dark.svg' : '/sketches/region/region-map.svg';
    if (image.getAttribute('src') !== source) image.setAttribute('src', source);
  }
  syncTheme();
  new MutationObserver(syncTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });
  button.hidden = false;
  button.addEventListener('click', () => setView(!showingDetail));
  image.addEventListener('error', () => {
    if (showingDetail) {
      setView(false);
      status.textContent = 'The detailed map could not load. The simplified map is shown.';
    }
  });
}
