/* Five-image desk rotations. Hover/focus, page visibility and reduced motion pause playback. */
const cards=[...document.querySelectorAll('[data-desk-slideshow]')];
const controls=[...document.querySelectorAll('[data-desk-motion]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=false;
for(const card of cards){card.dataset.slide='0';for(const img of card.querySelectorAll('img')){img.loading='eager';img.addEventListener('error',()=>{img.dataset.failed='true';img.classList.remove('is-active');const good=[...card.querySelectorAll('img')].find(x=>!x.dataset.failed);if(good&&!card.querySelector('.is-active'))good.classList.add('is-active');});}}
function sync(){for(const button of controls){button.hidden=!cards.length;button.textContent=paused?'Play images':'Pause images';button.setAttribute('aria-pressed',String(paused));}}
for(const button of controls)button.addEventListener('click',()=>{paused=!paused;sync();});
sync();
setInterval(()=>{if(paused||reduced.matches||document.hidden)return;for(const card of cards){if(card.matches(':hover,:focus-within'))continue;const imgs=[...card.querySelectorAll('img')].filter(i=>!i.dataset.failed&&i.complete&&i.naturalWidth);if(imgs.length<2)continue;const old=imgs.findIndex(i=>i.classList.contains('is-active'));for(const img of card.querySelectorAll('img'))img.classList.remove('is-active');imgs[(old+1)%imgs.length].classList.add('is-active');}},1500);
