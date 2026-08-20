/**
 * Bound to the Endorse form's response Sheet.
 * Deploy: open the Sheet → Extensions → Apps Script → paste → Save →
 * run runSelfTest → confirm "RESULT: all checks passed".
 * Script Properties required: GITHUB_TOKEN, KIT_API_KEY, KIT_FORM_ID.
 */
var REPO = 'niagaraassembly/site';
var MAX_COMMENT = 2500;
var KIT_TAG_ENDORSEMENT = 'niagara-endorsement';

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
  createIssue_('Endorsement — ' + r.name + ' (' + r.location + ')', buildIssueBody(r), ['endorsement']);
  tagQuietly_(r.email, r.name, KIT_TAG_ENDORSEMENT);
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

function tagQuietly_(email, name, tagName) {
  try {
    var props = PropertiesService.getScriptProperties();
    kitUpsertAndTag_(email, name, tagName,
      props.getProperty('KIT_API_KEY'),
      props.getProperty('KIT_FORM_ID'));
    Logger.log('kit: tagged %s with "%s"', email, tagName);
  } catch (err) {
    Logger.log('kit: FAILED to tag %s with "%s" — %s', email, tagName, err.message);
  }
}

function findKitTag_(tagName, apiKey) {
  var wanted = tagName.toLowerCase();
  var url = 'https://api.kit.com/v4/tags?per_page=1000';

  while (url) {
    var response = UrlFetchApp.fetch(url, {
      headers: { 'X-Kit-Api-Key': apiKey },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) {
      throw new Error('Kit rejected the tags request (HTTP '
        + response.getResponseCode() + '): ' + response.getContentText());
    }
    var payload = JSON.parse(response.getContentText());
    var match = (payload.tags || []).filter(function (t) {
      return t.name.toLowerCase() === wanted;
    })[0];
    if (match) return match;

    var page = payload.pagination || {};
    url = (page.has_next_page && page.end_cursor)
      ? 'https://api.kit.com/v4/tags?per_page=1000&after=' + encodeURIComponent(page.end_cursor)
      : null;
  }
  return null;
}

function kitUpsertAndTag_(email, firstName, tagName, apiKey, formId) {
  if (!apiKey) throw new Error('KIT_API_KEY script property is not set.');
  if (!formId) throw new Error('KIT_FORM_ID script property is not set.');
  if (!email) throw new Error('No email captured for Kit.');

  UrlFetchApp.fetch('https://api.kit.com/v4/subscribers', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email, first_name: firstName, state: 'inactive' }),
    muteHttpExceptions: true
  });

  UrlFetchApp.fetch('https://api.kit.com/v4/forms/' + formId + '/subscribers', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email }),
    muteHttpExceptions: true
  });

  var match = findKitTag_(tagName, apiKey);
  if (!match) throw new Error('Kit has no tag named "' + tagName + '" — create it first.');

  UrlFetchApp.fetch('https://api.kit.com/v4/tags/' + match.id + '/subscribers', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email }),
    muteHttpExceptions: true
  });
}

function runSelfTest() {
  var props = PropertiesService.getScriptProperties();
  var kitApiKey = props.getProperty('KIT_API_KEY');
  var kitFormId = props.getProperty('KIT_FORM_ID');
  var githubToken = props.getProperty('GITHUB_TOKEN');
  if (!kitApiKey) throw new Error('FAIL: KIT_API_KEY script property is not set');
  if (!kitFormId) throw new Error('FAIL: KIT_FORM_ID script property is not set');
  if (!githubToken) throw new Error('FAIL: GITHUB_TOKEN script property is not set');
  var body = buildIssueBody({ name: 'Rosa Silva', trade: 'Toolmaker',
                              email: 'rosa@example.ca', location: 'Welland, ON',
                              comment: 'Count me in.' });
  var m = body.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block');
  var parsed = JSON.parse(m[1]);
  if (parsed.kind !== 'endorsement') throw new Error('FAIL: wrong kind');
  if (parsed.name !== 'Rosa Silva') throw new Error('FAIL: name not carried');
  if ('email' in parsed) throw new Error('FAIL: email must never enter the issue');
  if ('publish_comment' in parsed) throw new Error('FAIL: publication is a label, not a field');
  if (!findKitTag_(KIT_TAG_ENDORSEMENT, kitApiKey)) {
    throw new Error('FAIL: Kit tag "' + KIT_TAG_ENDORSEMENT + '" does not exist');
  }
  Logger.log('RESULT: all checks passed');
}
