/**
 * Bound to the Register form's response Sheet. Paste alongside _shared.gs.
 *
 * Open source only. Experts no longer come through here — they post to
 * the Experts category of the board form and choose there whether to be
 * published, so this form has exactly one job.
 *
 * The data block carries `github_username` and nothing else. It is read
 * by a workflow that interpolates the value into a shell command, so the
 * less it carries, the smaller the surface. The username is validated
 * here as well as in the browser and, later, in the workflow.
 *
 * Form question titles: Name, Email, GitHub username, Interest
 */

var KIT_TAG_OPENSOURCE = 'na-opensource';

/* GitHub's own rule: alphanumeric, single interior hyphens, 39 max. */
var GH_USER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

function buildOpenSourceBody(r) {
  var valid = GH_USER.test(r.github_username);
  var data = { kind: 'opensource', github_username: r.github_username };

  return [
    (valid ? '' : '**The username below does not look valid — check it before approving.**\n'),
    'GitHub: @' + r.github_username,
    '',
    'Name: ' + r.name,
    'Email: ' + r.email,
    'Wants to work on: ' + (r.interest || '—'),
    '',
    '**`approved`** — add this label to invite them to the niagaraassembly org.',
    '',
    '<!--DATA',
    JSON.stringify(data, null, 1),
    'DATA-->'
  ].join('\n');
}

function onFormSubmit(e) {
  var pick = pickFrom_(e.namedValues);
  var r = {
    name: pick('Name'), email: pick('Email'),
    github_username: pick('GitHub username'), interest: pick('Interest')
  };

  createIssue_('Open source: @' + r.github_username, buildOpenSourceBody(r), ['opensource']);
  tagQuietly_(r.email, r.name, KIT_TAG_OPENSOURCE);
}

function runSelfTest() {
  var props = assertProperties_();

  var body = buildOpenSourceBody({ name: 'Rosa Silva', email: 'rosa@example.ca',
                                   github_username: 'rosa-silva', interest: 'Maps' });
  var m = body.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block');
  var parsed = JSON.parse(m[1]);

  if (parsed.github_username !== 'rosa-silva') throw new Error('FAIL: username not carried');
  var keys = Object.keys(parsed).sort().join(',');
  if (keys !== 'github_username,kind') {
    throw new Error('FAIL: the block must carry nothing but kind and ' +
                    'github_username — found: ' + keys);
  }

  if (!GH_USER.test('rosa-silva')) throw new Error('FAIL: valid username rejected');
  if (GH_USER.test('rosa silva')) throw new Error('FAIL: invalid username accepted');
  if (GH_USER.test('rosa--silva')) throw new Error('FAIL: double hyphen accepted');

  if (!findKitTag_(KIT_TAG_OPENSOURCE, props.getProperty('KIT_API_KEY'))) {
    throw new Error('FAIL: Kit tag "' + KIT_TAG_OPENSOURCE + '" does not exist');
  }

  Logger.log('RESULT: all checks passed');
}
