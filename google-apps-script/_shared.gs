/**
 * Shared helpers for every Niagara Assembly form processor.
 *
 * Apps Script files in one project share a single global scope, so this
 * file is pasted into each of the three projects ALONGSIDE its processor
 * (join.gs, board.gs or register.gs) rather than duplicated inside each.
 * One place to fix a bug in the Kit client.
 *
 * Deploy: Sheet > Extensions > Apps Script > + > Script > name it
 * "_shared" > paste > Save.
 *
 * Script Properties required in every project:
 *   GITHUB_TOKEN  — fine-grained PAT, Issues: write on niagaraassembly/site
 *   KIT_API_KEY   — Kit v4 API key
 *   KIT_FORM_ID   — the double-opt-in form new subscribers are added through
 */

var REPO = 'niagaraassembly/site';
var MAX_TEXT = 2500;

/** Reads a form response by its QUESTION TITLE. A mistyped title yields an
 *  empty string, not an error — the silent failure this whole pipeline is
 *  built around. Change a title in Google, change it here. */
function pickFrom_(namedValues) {
  return function (title) {
    var v = namedValues[title];
    return (v && v[0] ? v[0] : '').trim();
  };
}

function assertProperties_() {
  var props = PropertiesService.getScriptProperties();
  var names = ['GITHUB_TOKEN', 'KIT_API_KEY', 'KIT_FORM_ID'];
  for (var i = 0; i < names.length; i++) {
    if (!props.getProperty(names[i])) {
      throw new Error('FAIL: ' + names[i] + ' script property is not set');
    }
  }
  return props;
}

function createIssue_(title, body, labels) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  var response = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/issues', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ title: title, body: body, labels: labels }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() >= 300) {
    Logger.log('github: issue creation FAILED (HTTP %s): %s',
               response.getResponseCode(), response.getContentText());
  }
  return response;
}

/** Kit failures must never take down issue creation — the issue is the
 *  record of record; the mailing list can be reconciled by hand. */
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
    method: 'post', contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email, first_name: firstName, state: 'inactive' }),
    muteHttpExceptions: true
  });

  /* Adding to the double-opt-in form is what makes Kit send its
     confirmation email. Everyone lands on the mailing list this way,
     whatever else they are tagged with. */
  UrlFetchApp.fetch('https://api.kit.com/v4/forms/' + formId + '/subscribers', {
    method: 'post', contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email }),
    muteHttpExceptions: true
  });

  var match = findKitTag_(tagName, apiKey);
  if (!match) throw new Error('Kit has no tag named "' + tagName + '" — create it first.');

  UrlFetchApp.fetch('https://api.kit.com/v4/tags/' + match.id + '/subscribers', {
    method: 'post', contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email }),
    muteHttpExceptions: true
  });
}
