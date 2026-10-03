/** YAML subset for subsite front matter. No dependencies.
 *
 * Keys are `name:` or `name: value`, with a space after the colon when a
 * value follows. `town:buffalo` stays one string, because there is no space
 * after the colon. Full-line `#` comments are ignored. Tabs are rejected.
 */

export function splitDocument(text) {
  const src = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!src.startsWith('---\n')) {
    throw new Error('front matter must start with ---');
  }
  const end = src.indexOf('\n---\n', 4);
  if (end === -1) throw new Error('front matter must end with ---');
  return {
    data: parseYaml(src.slice(4, end)),
    body: src.slice(end + 5),
  };
}

export function parseYaml(yaml) {
  const lines = String(yaml).replace(/\r\n/g, '\n').split('\n');
  const [value, next] = parseMap(lines, 0, 0);
  for (let i = next; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed !== '' && !trimmed.startsWith('#')) {
      throw new Error(`trailing front matter at line ${i + 1}`);
    }
  }
  return value;
}

function indentOf(line, lineNo) {
  if (line.includes('\t')) throw new Error(`tab in front matter at line ${lineNo}`);
  return line.match(/^ */)[0].length;
}

function splitKey(s) {
  const m = s.match(/^([A-Za-z][A-Za-z0-9_]*):(.*)$/);
  if (!m) return null;
  if (m[2] !== '' && !/^\s/.test(m[2])) return null;
  return [m[1], m[2].trim()];
}

function stripComment(raw) {
  const t = raw.trim();
  if (t.startsWith('"') || t.startsWith("'")) return t;
  const i = t.search(/\s#/);
  return (i === -1 ? t : t.slice(0, i)).trim();
}

function parseScalar(raw) {
  const t = stripComment(raw);
  if (t === '' || t === '~' || t === 'null') return null;
  if (t === '[]') return [];
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t.startsWith('"')) {
    if (!t.endsWith('"') || t.length < 2) throw new Error(`unclosed string ${t}`);
    return t.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (t.startsWith("'")) {
    if (!t.endsWith("'") || t.length < 2) throw new Error(`unclosed string ${t}`);
    return t.slice(1, -1);
  }
  return t;
}

function parseMap(lines, i, indent) {
  const obj = {};
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) { i++; continue; }
    const ind = indentOf(line, i + 1);
    if (ind < indent) break;
    if (ind > indent) throw new Error(`unexpected indent at line ${i + 1}`);
    const keyParts = splitKey(trimmed);
    if (!keyParts) throw new Error(`expected a key at line ${i + 1}`);
    const [key, rest] = keyParts;
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      throw new Error(`duplicate key ${key} at line ${i + 1}`);
    }
    if (rest === '') {
      i++;
      while (i < lines.length && (lines[i].trim() === '' || lines[i].trim().startsWith('#'))) i++;
      if (i >= lines.length || indentOf(lines[i], i + 1) <= indent) {
        obj[key] = null;
        continue;
      }
      const child = indentOf(lines[i], i + 1);
      if (lines[i].trim().startsWith('- ')) {
        const [list, ni] = parseList(lines, i, child);
        obj[key] = list;
        i = ni;
      } else {
        const [map, ni] = parseMap(lines, i, child);
        obj[key] = map;
        i = ni;
      }
    } else {
      obj[key] = parseScalar(rest);
      i++;
    }
  }
  return [obj, i];
}

function parseList(lines, i, indent) {
  const list = [];
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) { i++; continue; }
    const ind = indentOf(line, i + 1);
    if (ind < indent) break;
    if (ind !== indent) throw new Error(`bad list indent at line ${i + 1}`);
    if (!trimmed.startsWith('- ')) throw new Error(`expected a list item at line ${i + 1}`);
    const rest = trimmed.slice(2).trim();
    const keyParts = splitKey(rest);
    let j = i + 1;
    while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) j++;
    const nextInd = j < lines.length ? indentOf(lines[j], j + 1) : null;
    const nextIsField = nextInd !== null && nextInd > indent && splitKey(lines[j].trim());
    if (keyParts && (nextIsField || keyParts[1] === '')) {
      const item = {};
      item[keyParts[0]] = keyParts[1] === '' ? null : parseScalar(keyParts[1]);
      i++;
      if (nextIsField) {
        const [more, ni] = parseMap(lines, j, nextInd);
        Object.assign(item, more);
        i = ni;
      }
      list.push(item);
    } else {
      list.push(parseScalar(rest));
      i++;
    }
  }
  return [list, i];
}
