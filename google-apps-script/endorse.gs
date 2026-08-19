/**
 * Bound to the Endorse form's response Sheet.
 * Deploy: open the Sheet → Extensions → Apps Script → paste → Save →
 * run runSelfTest → confirm "RESULT: all checks passed".
 * Script Properties required: GITHUB_TOKEN, KIT_API_KEY.
 */
var REPO = 'niagaraassembly/site';
var MAX_COMMENT = 2500;

function buildIssueBody(r) {
  var data = {
    kind: 'endorsement',
    name: r.name, trade: r.trade, location: r.location,
    comment: (r.comment || '').slice(0, MAX_COMMENT)
  };
  // Two labels, per spec §8.3. The workflow reads the issue's label set and
  // passes the comment decision to approve_request.py, so nothing in this
  // block controls publication — an editor never hand-edits the JSON.
  return 'Endorsement from ' + r.name + ' — ' + r.trade + ', ' + r.location +
         '\n\n**`approved`** — add this label to put them on the roster.\n' +
         '**`publish-comment`** — add this one too to publish their comment.\n' +
         'Adding `approved` alone keeps them on the roster with the comment withheld.\n\n' +
         '<!--DATA\n' + JSON.stringify(data, null, 1) + '\nDATA-->';
}

function onFormSubmit(e) {
  var r = mapResponse_(e);
  upsertKit_(r);
  createIssue_('Endorsement — ' + r.name + ' (' + r.location + ')', buildIssueBody(r), ['endorsement']);
}

function mapResponse_(e) {
  var v = e.namedValues;
  var pick = function (k) { return (v[k] && v[k][0] ? v[k][0] : '').trim(); };
  return { name: pick('Name'), email: pick('Email'), location: pick('City / Town / Township'),
           trade: pick('Trade / Expertise'), comment: pick('Comment') };
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

function upsertKit_(r) {
  var key = PropertiesService.getScriptProperties().getProperty('KIT_API_KEY');
  if (!key) return;
  UrlFetchApp.fetch('https://api.convertkit.com/v3/tags', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ api_key: key, email: r.email, first_name: r.name }),
    muteHttpExceptions: true
  });
}

function runSelfTest() {
  var body = buildIssueBody({ name: 'Rosa Silva', trade: 'Toolmaker',
                              location: 'Welland, ON', comment: 'Count me in.' });
  var m = body.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block');
  var parsed = JSON.parse(m[1]);
  if (parsed.kind !== 'endorsement') throw new Error('FAIL: wrong kind');
  if (parsed.name !== 'Rosa Silva') throw new Error('FAIL: name not carried');
  if ('email' in parsed) throw new Error('FAIL: email must never enter the issue');
  if ('publish_comment' in parsed) throw new Error('FAIL: publication is a label, not a field');
  Logger.log('RESULT: all checks passed');
}
