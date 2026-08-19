export const FACES = ['statement', 'endorsements'];

export function resolveFace(hash) {
  const id = String(hash ?? '').replace(/^#/, '');
  return FACES.includes(id) ? id : FACES[0];
}

export function mountFaces(doc = document) {
  const show = (face) => {
    for (const id of FACES) {
      doc.getElementById(`face-${id}`).hidden = id !== face;
      doc.querySelector(`[data-face-btn="${id}"]`)
         .setAttribute('aria-current', String(id === face));
    }
  };
  show(resolveFace(location.hash));
  addEventListener('hashchange', () => show(resolveFace(location.hash)));
}
