/**
 * Bound to the Join form's response Sheet. Paste alongside _shared.gs.
 *
 * Mailing list and membership interest. Nothing here becomes public, so
 * the issue carries no <!--DATA--> block and no label triggers anything —
 * an admin follows up and closes it by hand.
 *
 * Install onFormSubmit as an INSTALLABLE trigger (Triggers > + Add
 * Trigger > onFormSubmit > From spreadsheet > On form submit). The simple
 * trigger of the same name cannot call UrlFetchApp at all.
 *
 * Form question titles: Name, Email, Type
 *
 * "Type" is what the live Join form calls the membership level. It is not
 * the board's "Type" — different form, different Sheet, different script.
 */

var LEVEL_TAGS = {
  List:     'na-list',
  Regional: 'na-member-regional',
  Company:  'na-member-company',
  Champion: 'na-member-champion'
};

function buildJoinBody(r) {
  var lines = [
    'Level: **' + r.level + '**',
    '',
    'Name: ' + r.name,
    'Email: ' + r.email,
    ''
  ];
  lines.push(r.level === 'List'
    ? 'Mailing list only. Nothing to do — close this.'
    : 'Membership interest. Follow up, then close by hand. No label ' +
      'triggers anything on a join.');
  return lines.join('\n');
}

function onFormSubmit(e) {
  var pick = pickFrom_(e.namedValues);
  var r = { name: pick('Name'), email: pick('Email'), level: pick('Type') };

  if (!LEVEL_TAGS[r.level]) {
    Logger.log('join: unknown level "%s" — defaulting to List', r.level);
    r.level = 'List';
  }

  /* Unlike board and register, name and email DO appear in this issue
     body. Nothing on a join is ever committed to a public file, so the
     issue is a private work item, not a staging area for one. */
  createIssue_('Join: ' + r.name + ' (' + r.level + ')', buildJoinBody(r), ['join']);
  tagQuietly_(r.email, r.name, LEVEL_TAGS[r.level]);
}

function runSelfTest() {
  var props = assertProperties_();
  var kitApiKey = props.getProperty('KIT_API_KEY');

  var body = buildJoinBody({ name: 'Rosa Silva', email: 'rosa@example.ca', level: 'Champion' });
  if (body.indexOf('Champion') === -1) throw new Error('FAIL: level not carried');
  if (body.indexOf('<!--DATA') !== -1) {
    throw new Error('FAIL: a join must not carry a data block — nothing here is published');
  }

  for (var level in LEVEL_TAGS) {
    if (!findKitTag_(LEVEL_TAGS[level], kitApiKey)) {
      throw new Error('FAIL: Kit tag "' + LEVEL_TAGS[level] + '" does not exist');
    }
  }

  Logger.log('RESULT: all checks passed');
}
