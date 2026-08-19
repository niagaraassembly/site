/**
 * Bound to the Meetup form's response Sheet.
 * Deploy: open the Sheet → Extensions → Apps Script → paste → Save →
 * run runSelfTest → confirm "RESULT: all checks passed".
 * Script Properties required: GITHUB_TOKEN.
 */
var REPO = 'niagaraassembly/site';

function buildIssueBody(r) {
  var data = {
    kind: 'meetup',
    title: r.title, starts: r.starts, venue: r.venue,
    contact: r.contact, calendar_url: r.calendar_url
  };
  // One label, per spec §8.3. The workflow reads the issue's label set, so
  // nothing in this block controls publication — an editor never hand-edits
  // the JSON.
  return 'Meetup: ' + r.title + ' — ' + r.venue + ', ' + r.starts +
         '\n\n**`approved`** — add this label to publish the meetup on the site.\n\n' +
         '<!--DATA\n' + JSON.stringify(data, null, 1) + '\nDATA-->';
}

function onFormSubmit(e) {
  var r = mapResponse_(e);
  createIssue_('Meetup — ' + r.title + ' (' + r.venue + ')', buildIssueBody(r), ['meetup']);
}

function mapResponse_(e) {
  var v = e.namedValues;
  var pick = function (k) { return (v[k] && v[k][0] ? v[k][0] : '').trim(); };
  return { title: pick('What'), starts: pick('When'), venue: pick('Where'),
           contact: pick('Contact'), calendar_url: pick('Calendar link') };
}

function createIssue_(title, body, labels) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/issues', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ title: title, body: body, labels: labels }),
    muteHttpExceptions: true
  });
}

function runSelfTest() {
  var body = buildIssueBody({ title: 'Tool Library Open House', starts: '2026-09-12T18:00:00-04:00',
                              venue: 'Welland Legion Hall', contact: 'organize@example.org',
                              calendar_url: 'https://example.org/cal/tool-library' });
  var m = body.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block');
  var parsed = JSON.parse(m[1]);
  if (parsed.kind !== 'meetup') throw new Error('FAIL: wrong kind');
  if (parsed.starts !== '2026-09-12T18:00:00-04:00') throw new Error('FAIL: starts not carried');
  if ('publish_comment' in parsed) throw new Error('FAIL: publication is a label, not a field');
  Logger.log('RESULT: all checks passed');
}
