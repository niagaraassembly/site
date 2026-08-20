/**
 * Bound to the Meetup form's response Sheet.
 * Deploy: open the Sheet → Extensions → Apps Script → paste → Save →
 * run runSelfTest → confirm "RESULT: all checks passed".
 * Script Properties required: GITHUB_TOKEN, KIT_API_KEY, KIT_FORM_ID.
 */
var REPO = 'niagaraassembly/site';
var KIT_TAG_MEETUP = 'niagara-meetup';

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
  tagQuietly_(r.email, r.name, KIT_TAG_MEETUP);
}

function mapResponse_(e) {
  var v = e.namedValues;
  var pick = function (k) { return (v[k] && v[k][0] ? v[k][0] : '').trim(); };
  return { name: pick('Name'), email: pick('Email'), title: pick('What'),
           starts: pick('When'), venue: pick('Where'), contact: pick('Contact'),
           calendar_url: pick('Calendar link') };
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
  var body = buildIssueBody({ name: 'Rosa Silva', email: 'rosa@example.ca',
                              title: 'Tool Library Open House', starts: '2026-09-12T18:00:00-04:00',
                              venue: 'Welland Legion Hall', contact: 'organize@example.org',
                              calendar_url: 'https://example.org/cal/tool-library' });
  var m = body.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block');
  var parsed = JSON.parse(m[1]);
  if (parsed.kind !== 'meetup') throw new Error('FAIL: wrong kind');
  if (parsed.starts !== '2026-09-12T18:00:00-04:00') throw new Error('FAIL: starts not carried');
  if ('email' in parsed) throw new Error('FAIL: email must never enter the issue');
  if ('name' in parsed) throw new Error('FAIL: private submitter name must never enter the issue');
  if ('publish_comment' in parsed) throw new Error('FAIL: publication is a label, not a field');
  if (!findKitTag_(KIT_TAG_MEETUP, kitApiKey)) {
    throw new Error('FAIL: Kit tag "' + KIT_TAG_MEETUP + '" does not exist');
  }
  Logger.log('RESULT: all checks passed');
}
