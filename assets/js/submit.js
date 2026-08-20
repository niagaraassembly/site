export const MAX_COMMENT = 2500;

export function buildFormBody(values, entryMap) {
  const body = new URLSearchParams();
  for (const [field, entryId] of Object.entries(entryMap)) {
    const v = values[field];
    if (v !== undefined && v !== null && String(v).trim().length > 0) {
      body.append(entryId, String(v));
    }
  }
  return body;
}

const missing = (v, keys) => keys.filter(k => !String(v[k] ?? '').trim());

export function validateEndorsement(v) {
  const errors = missing(v, ['name', 'email', 'location', 'trade']);
  if (String(v.comment ?? '').length > MAX_COMMENT) errors.push('comment-too-long');
  return errors;
}

export function validateMeetup(v) {
  return missing(v, ['name', 'email', 'title', 'starts', 'venue', 'contact']);
}

export async function submitTo(action, body) {
  await fetch(action, { method: 'POST', mode: 'no-cors', body });
}
