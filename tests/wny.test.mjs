import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LANES, STAGES, FLAGS, publishable, byNewest, flagText, moneyLines, corridorPosition, corridorMarks,
  filterItems, filterOptions, parseFilters, filterQuery, moneyTotals, moneyByStage, renderMoneyTotal, tickerLine,
  moneyGroups, moneyKind, renderMoneyGroups, mentionsFor, renderMentions, renderCompanies,
  countyPath, tileGrow, storiesByCounty, coverageText, issueFor, apDate,
  newsTone, partialDate, comingUp, renderJobs, renderIncentives,
  districtText, districtKeys, renderCompanyGroups, storyUrl,
  moneyCells, renderMoneyCells, regionEquation, renderRegionEquation, articleFor,
  investmentLines, filterInvestments, investmentOptions, renderInvestments,
  formatAmount, companiesInNews, renderItem, renderCompact,
} from '../assets/js/wny.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const sample = read('./fixtures/wny-sample.json');
const live = read('../data/wny.json');
// na-research research/news/schema/controlled-values.json at 3095263.
const lanes = ['production', 'developing', 'corridor', 'excluded'];
const stages = ['intent', 'application', 'announced', 'approved_plan', 'award', 'under_way', 'completed', 'reported_only'];
const flagTypes = ['conflict', 'gap', 'follow_up', 'company_reported', 'secondary_source',
  'ceiling_not_obligation', 'identity_unresolved', 'research_only', 'not_wny_production'];

test('only approved or published records in a shown lane reach the page', () => {
  const shown = publishable(sample.items);
  assert.ok(shown.length > 0);
  assert.ok(shown.every((i) => ['approved', 'published'].includes(i.publish_status)));
  assert.ok(!shown.some((i) => i.id === 'S9'), 'the not_ready sample must be dropped');
  assert.ok(!shown.some((i) => i.id === 'S10'), 'lane excluded must never render');
  assert.deepEqual(publishable([{ id: 'x', lane: 'production' }]), [], 'no status is not publishable');
});

test('every controlled lane, stage and flag type has fixed wording', () => {
  assert.deepEqual(LANES.map((l) => l.id), lanes.filter((l) => l !== 'excluded'));
  for (const stage of stages) assert.ok(STAGES[stage], `stage ${stage} has no badge`);
  for (const type of flagTypes) assert.ok(FLAGS[type], `flag ${type} has no sentence`);
});

test('flag sentences put details into words', () => {
  assert.deepEqual(flagText({ type: 'conflict', detail: 'local_job_count' }),
                   { tone: 'warn', text: 'Sources disagree on local job count' });
  assert.equal(flagText({ type: 'gap', detail: 'production_location' }).text, 'Production location not disclosed');
  assert.equal(flagText({ type: 'follow_up', detail: 'contractor_identity' }).text, 'Being confirmed: contractor identity');
  assert.equal(flagText({ type: 'brand_new_flag', detail: '' }).text, 'brand new flag');
});

test('the money list takes production amounts only; ceilings never enter it', () => {
  const lines = moneyLines(publishable(sample.items));
  assert.deepEqual(lines.map((i) => i.id), ['S1', 'S2', 'S5']);  // S3 developing, S8 corridor
  assert.equal(lines.find((i) => i.id === 'S5').amount, 2000000, 'the obligated amount, not the 20.7B ceiling');
});

test('the total splits by stage on one line, coloured for completed and announced', () => {
  const lines = moneyLines(publishable(sample.items));
  assert.deepEqual(moneyByStage(lines), [{ currency: 'USD', amount: 126000000, parts: [
    { stage: 'announced', amount: 49000000 }, { stage: 'award', amount: 2000000 }, { stage: 'completed', amount: 75000000 }] }]);
  const html = renderMoneyTotal(lines);
  assert.match(html, /wny-amount--announced">\$49M<\/b> announced/);
  assert.match(html, /wny-amount--done">\$75M<\/b> completed/);
  assert.match(html, /\$2M<\/b> contract or award/);
  assert.match(html, /= <b class="wny-money__sum">\$126M<\/b>/);
});

test('cards colour amounts by stage and label ceilings', () => {
  const items = publishable(sample.items);
  assert.match(renderItem(items.find((i) => i.id === 'S2')), /wny-amount--done">\$75M/);
  assert.match(renderItem(items.find((i) => i.id === 'S1')), /wny-amount--announced">\$49M/);
  const s5 = renderItem(items.find((i) => i.id === 'S5'));
  assert.match(s5, /Contract ceiling \$20\.7B/);
  assert.doesNotMatch(s5, /wny-amount--/, 'award stage stays in ink');
});

test('conflicting values render side by side with their sources', () => {
  const html = renderItem(publishable(sample.items).find((i) => i.id === 'S4'));
  assert.match(html, /Sources disagree on local job count/);
  assert.match(html, /About 85 jobs across two sites/);
  assert.match(html, /60 local jobs/);
  assert.match(html, /Sample Filing/);
  assert.match(html, /Sample Gazette/);
});

test('the explainer shows under the headline; a blank one shows nothing', () => {
  const item = publishable(sample.items).find((i) => i.id === 'S1');
  assert.match(renderItem(item), /Sample explainer/);
  assert.doesNotMatch(renderItem({ ...item, note: '' }), /wny-item__note/);
});

test('compact entries carry no id, so cards keep unique ids', () => {
  assert.doesNotMatch(renderCompact(publishable(sample.items)[0]), /\bid=/);
});

test('newest first, ties keep data order', () => {
  const items = [{ id: 'a', date: '2026-10-06' }, { id: 'b', date: '2026-10-06' }, { id: 'c', date: '2026-10-09' }];
  assert.deepEqual(byNewest(items).map((i) => i.id), ['c', 'a', 'b']);
});

test('the corridor runs Niagara River to Syracuse; off-corridor items are not marked', () => {
  assert.ok(corridorPosition(-79.05) < corridorPosition(-78.88));
  assert.ok(corridorPosition(-77.61) < corridorPosition(-76.15));
  assert.equal(corridorPosition(-73.75), null, 'Albany is east of the line');
  assert.equal(corridorPosition(undefined), null);
  const marks = corridorMarks(publishable(sample.items));
  assert.ok(!marks.some((m) => m.id === 'S8'));
  const rochester = marks.filter((m) => m.item.place === 'Rochester');
  assert.deepEqual(rochester.map((m) => m.stack), [0, 1], 'stories at one place stack');
});

test('amounts read compactly', () => {
  assert.equal(formatAmount(49000000, 'USD'), '$49M');
  assert.equal(formatAmount(20700000000, 'USD'), '$20.7B');
  assert.equal(formatAmount(6000000, 'CAD'), 'C$6M');
  assert.equal(formatAmount('', 'USD'), '');
  assert.equal(formatAmount(0, 'USD'), '');
});

test('companies are counted across approved stories', () => {
  const companies = companiesInNews(publishable(sample.items), sample.entities);
  assert.equal(companies[0].name, 'Example Brands');
  assert.equal(companies[0].count, 2);
});

test('rendering escapes text and refuses script links', () => {
  const html = renderItem({ id: '"><x', headline: '<b>hi</b>', type: 'layoff', lane: 'production', note: '<s>',
    flags: [{ type: '<u>', detail: '' }], conflicts: [{ field: 'f', values: [{ value: '<q>', url: 'javascript:x', source: '<em>' }] }],
    sources: [{ url: 'javascript:alert(1)', publisher: '<i>' }] });
  for (const tag of ['<b>', '<i>', '<s>', '<u>', '<q>', '<em>', 'javascript:']) assert.ok(!html.includes(tag), tag);
  assert.ok(html.includes('<span class="issue-list__title">'), 'no safe URL means no link');
});

test('the published data file holds only publishable records', () => {
  assert.ok(Array.isArray(live.items));
  for (const item of live.items) {
    assert.ok(['approved', 'published'].includes(item.publish_status), `${item.id} is ${item.publish_status}`);
    assert.ok(lanes.includes(item.lane) && item.lane !== 'excluded', `${item.id} lane ${item.lane}`);
    assert.ok(!('summary' in item), `${item.id} must not carry the internal summary`);
  }
});

test('the sample file is marked fictional', () => {
  assert.match(sample._note, /FICTIONAL/);
});

test('search needs every word, across headline, explainer, place, company and sources', () => {
  const items = publishable(sample.items);
  assert.deepEqual(filterItems(items, { q: 'rochester example' }).map((i) => i.id), ['S2', 'S5']);
  assert.deepEqual(filterItems(items, { q: 'SAMPLE TOWN record' }).map((i) => i.id), ['S3'], 'publisher, any case');
  assert.deepEqual(filterItems(items, { q: 'ceiling' }).map((i) => i.id), ['S5'], 'flag wording is searchable');
  assert.equal(filterItems(items, { q: 'nothing-like-this' }).length, 0);
});

test('filters combine', () => {
  const items = publishable(sample.items);
  assert.deepEqual(filterItems(items, { lane: 'corridor' }).map((i) => i.id), ['S7', 'S8']);
  assert.deepEqual(filterItems(items, { flag: 'conflict', lane: 'production' }).map((i) => i.id), ['S1', 'S4']);
  assert.deepEqual(filterItems(items, { stage: 'award', type: 'major_contract' }).map((i) => i.id), ['S5']);
  assert.deepEqual(filterItems(items, { amount: '1', lane: 'production' }).map((i) => i.id), ['S1', 'S2', 'S5']);
  assert.equal(filterItems(items, {}).length, items.length);
});

test('dropdowns offer only values present, labelled from the vocabulary', () => {
  const opts = filterOptions(publishable(sample.items));
  assert.deepEqual(opts.lane.map(([v]) => v), ['production', 'developing', 'corridor']);
  assert.ok(opts.flag.some(([v, label]) => v === 'conflict' && label === 'Sources disagree'));
  assert.ok(!opts.stage.some(([v]) => v === 'reported_only'), 'no item has that stage');
  for (const type of Object.keys(FLAGS)) assert.ok(FLAGS[type].name, `${type} needs a filter name`);
});

test('filter state round-trips through the URL and ignores junk', () => {
  const state = parseFilters('?q=goodyear&lane=production&amount=1&evil=1');
  assert.equal(state.q, 'goodyear');
  assert.equal(state.amount, '1');
  assert.ok(!('evil' in state));
  assert.equal(filterQuery(state), '?q=goodyear&lane=production&amount=1');
  assert.equal(filterQuery(parseFilters('')), '');
  assert.equal(parseFilters('?amount=yes').amount, '');
});

test('front page section headings match the lane labels', () => {
  const html = readFileSync(new URL('../MAGS/WNY/issue/one/index.html', import.meta.url), 'utf8');
  for (const lane of LANES) {
    assert.match(html, new RegExp(`data-wny-lane="${lane.id}"[^>]*>\\s*<h2>${lane.label}</h2>`), lane.id);
  }
});

test('the money total sums the money list, one total per currency', () => {
  assert.deepEqual(moneyTotals(moneyLines(publishable(sample.items))), [{ currency: 'USD', amount: 126000000 }]);
  assert.deepEqual(moneyTotals([{ amount: 5e6, currency: 'USD' }, { amount: 2e6, currency: 'CAD' }, { amount: 1e6 }]),
                   [{ currency: 'USD', amount: 6e6 }, { currency: 'CAD', amount: 2e6 }]);
});

test('the ticker line is place then headline, escaped, linking to the card', () => {
  const html = tickerLine({ id: 'S1', place: '<b>Buffalo</b>', headline: 'Lab <i>expands</i>' });
  assert.match(html, /href="#wny-S1"/);
  assert.ok(!html.includes('<b>') && !html.includes('<i>'));
  assert.doesNotMatch(tickerLine({ id: 'S2', headline: 'No place' }), /wny-ticker__place/);
});

test('dollar figures group by kind of money and never sum across kinds', () => {
  const lines = moneyLines(publishable(sample.items));
  const groups = moneyGroups(lines);
  assert.deepEqual(groups.map((g) => [g.id, g.lines.map((i) => i.id)]),
                   [['investment', ['S1']], ['committed', ['S5']], ['deals', ['S2']]]);
  assert.equal(moneyKind({ amount_type: 'something_new' }), 'other');
  const html = renderMoneyGroups(lines);
  assert.match(html, /<h3 class="wny-money__kind">Investment<\/h3>/);
  assert.doesNotMatch(html, /wny-money__total/, 'a one-story kind has no total line');
  const two = renderMoneyGroups([...lines, { id: 'S9b', amount: 1e6, currency: 'USD', amount_type: 'obligated', stage: 'award', headline: 'h' }]);
  assert.match(two, /Contracts: money committed total/);
  assert.doesNotMatch(two, /Investment total|Deals total/);
  const mixed = moneyGroups([{ id: 'o', amount: 1, amount_type: 'obligated' }, { id: 'a', amount: 1, amount_type: 'award' }]);
  assert.deepEqual(mixed.map((g) => g.id), ['committed', 'awards'], 'obligated and award never share a total');
});

test('warning and info markings stay chips; plain ones fold into one sentence', () => {
  const html = renderItem({ id: 'x', headline: 'h', lane: 'production', flags: [
    { type: 'conflict', detail: 'local_job_count' }, { type: 'ceiling_not_obligation', detail: '' },
    { type: 'secondary_source', detail: '' }] });
  assert.match(html, /wny-flag--warn">Sources disagree on local job count/);
  assert.match(html, /wny-flags__plain">Contract ceiling, not money committed or spent\. From a secondary listing; original notice not accessed\.</);
  assert.doesNotMatch(html, /wny-flag--plain/);
});

test('mentions list people on published stories only, one entry per person and organization', () => {
  const items = publishable(sample.items);
  const people = [
    { event_id: 'S1', name: 'Ryan Hulse', role: 'Senior Director for R&D', organization: 'Sample Materials Co.' },
    { event_id: 'S2', name: 'Ryan Hulse', role: 'Senior Director for R&D', organization: 'Sample Materials Co.' },
    { event_id: 'S9', name: 'Held Back', role: 'x', organization: 'y' },
    { event_id: 'S4', name: 'Ana Bell', role: 'Plant manager', organization: 'Demo Chemical' },
  ];
  const m = mentionsFor(people, items);
  assert.deepEqual(m.map((p) => [p.name, p.events.length]), [['Ana Bell', 1], ['Ryan Hulse', 2]]);
  assert.match(renderMentions([{ name: '<b>x</b>', role: 'r', organization: 'o' }]), /&lt;b&gt;x&lt;\/b&gt;/);
  assert.deepEqual(mentionsFor(undefined, items), []);
});

test('the investments page lists every stated amount; totals count production only, per kind', () => {
  const lines = investmentLines(publishable(sample.items));
  assert.deepEqual(lines.map((i) => i.id).sort(), ['S1', 'S2', 'S3', 'S5', 'S8']);
  assert.deepEqual(filterInvestments(lines, { kind: 'committed' }).map((i) => i.id), ['S5']);
  assert.deepEqual(filterInvestments(lines, { lane: 'developing' }).map((i) => i.id), ['S3']);
  assert.deepEqual(filterInvestments(lines, { q: 'rochester' }).map((i) => i.id), ['S2', 'S5']);
  const html = renderInvestments(lines);
  assert.match(html, /href="\/MAGS\/WNY\/posts\/#wny-S5"/);
  assert.match(html, /ceiling \$20\.7B/);
  assert.match(html, /Proposed total<\/span><span class="wny-money__sums">Not totalled/, 'a kind with nothing countable says so');
  assert.match(html, /Grants total<\/span><span class="wny-money__sums">Not totalled/);
  assert.match(html, /Investment total/, 'a one-line kind still gets its total line');
  assert.match(renderInvestments(lines, { linkBase: '' }), /href="#wny-S5"/, 'issue page links cards on the same page');
  assert.equal(moneyKind({ amount_type: 'charge' }), 'charges');
  assert.deepEqual(investmentOptions(lines).kind.map(([v]) => v), ['investment', 'committed', 'deals', 'grants', 'proposed']);
});

test('every organisation name links: its website when known, else its story; counts are bare numbers', () => {
  const html = renderCompanies([
    { name: 'Has Site', website: 'https://example.com', count: 2, first: 'S1', city: 'Buffalo' },
    { name: 'No Site', website: '', count: 1, first: 'S2', city: '' },
  ]);
  assert.match(html, /<a href="https:\/\/example\.com" rel="noopener">Has Site<\/a>/);
  assert.match(html, /<a href="#wny-S2">No Site<\/a>/);
  assert.match(html, /Buffalo · 2</);
  assert.doesNotMatch(html, /stor(y|ies)/);
});

test('mentions link each person to their story', () => {
  assert.match(renderMentions([{ name: 'Ryan Hulse', role: 'r', organization: 'o', events: ['IEVT-1'] }]), /href="#wny-IEVT-1"/);
});

test('county band data covers the 21 counties in two rows, with drawable outlines', () => {
  const geo = JSON.parse(readFileSync(new URL('../data/geo/wny-counties.json', import.meta.url)));
  const names = geo.rows.flat();
  assert.equal(names.length, 21);
  assert.equal(new Set(names).size, 21);
  for (const name of ['Erie', 'Niagara', 'Monroe', 'Onondaga', 'Chautauqua']) assert.ok(names.includes(name), name);
  for (const name of names) {
    const c = geo.counties[name];
    assert.ok(c.rings.length >= 1 && c.rings[0].length >= 4, `${name} has an outline`);
    assert.match(countyPath(c), /^M[\d. ]+(L[\d. ]+)+Z/);
    const grow = Number(tileGrow(c));
    assert.ok(grow >= 0.7 && grow <= 1.8, `${name} grow ${grow}`);
  }
  assert.match(geo.source, /Census/);
});

test('stories are counted per county, linking to the newest', () => {
  const by = storiesByCounty([{ id: 'A', county: 'Erie' }, { id: 'B', county: 'Monroe' }, { id: 'C', county: 'Erie' }, { id: 'D' }]);
  assert.deepEqual([...by], [['Erie', { count: 2, first: 'A', tones: { news: 2 } }], ['Monroe', { count: 1, first: 'B', tones: { news: 1 } }]]);
});

test('coverage dates read in AP style, the year once when shared', () => {
  assert.equal(coverageText('2026-09-28', '2026-10-09'), 'Sept. 28 to Oct. 9, 2026');
  assert.equal(coverageText('2026-12-28', '2027-01-03'), 'Dec. 28, 2026 to Jan. 3, 2027');
  assert.equal(coverageText('', '2026-10-09'), '');
  assert.equal(apDate('2026-10-10'), 'Oct. 10, 2026');
  assert.equal(apDate('2026-03-05'), 'March 5, 2026');
});

test('an issue page finds its issue record', () => {
  const data = { issues: [{ id: 'WNY-2026-001', events: ['S1'] }] };
  assert.equal(issueFor(data, 'WNY-2026-001').events[0], 'S1');
  assert.equal(issueFor(data, 'WNY-2099-001'), null);
  assert.equal(issueFor(data, null), null);
});

test('county tones: completed green, announced yellow, everything else other news', () => {
  const by = storiesByCounty([
    { id: 'A', county: 'Monroe', stage: 'completed' }, { id: 'B', county: 'Monroe', stage: 'application' },
    { id: 'C', county: 'Monroe', stage: 'intent' }, { id: 'D', county: 'Erie', stage: 'announced' }]);
  assert.deepEqual(by.get('Monroe').tones, { done: 1, news: 2 });
  assert.deepEqual(by.get('Erie').tones, { announced: 1 });
  assert.equal(newsTone({ stage: 'award' }), 'news');
});

test('partial dates read naturally and malformed ones are dropped', () => {
  assert.equal(partialDate('2027'), '2027');
  assert.equal(partialDate('2027-06'), 'June 2027');
  assert.equal(partialDate('2026-10-31'), 'Oct. 31, 2026');
  assert.equal(partialDate('soon'), '');
});

test('coming up lists dated next steps soonest first; jobs and support render', () => {
  const items = [
    { id: 'A', headline: 'a', next_step: { text: 'Later', date: '2029-06-30' } },
    { id: 'B', headline: 'b', next_step: { text: 'Soon', date: '2026-10-31' } },
    { id: 'C', headline: 'c', next_step: { text: 'Undated', date: '' } },
    { id: 'D', headline: 'Solstice', jobs_added: 12, incentive: { program: 'Excelsior', amount: 1400000, type: 'tax_credit' }, currency: 'USD' },
    { id: 'E', headline: 'Goodyear', flags: [{ type: 'conflict', detail: 'jobs_lost' }] },
  ];
  assert.deepEqual(comingUp(items).map((i) => i.id), ['B', 'A']);
  assert.match(renderJobs(items), /\+12<\/span>/);
  assert.match(renderJobs(items), /Goodyear: sources disagree on jobs/);
  assert.match(renderIncentives(items), /\$1\.4M[\s\S]*Excelsior[\s\S]*tax credit/);
  const card = renderItem({ ...items[3], lane: 'production', stage: 'announced', stage_history: [{ stage: 'announced', date: '2026-10-09' }],
    next_step: { text: '12 new full-time jobs due', date: '2027-06' } });
  assert.match(card, /<dt>Jobs<\/dt><dd>12 added<\/dd>/);
  assert.match(card, /<dt>Public support<\/dt><dd>\$1\.4M tax credit \(Excelsior\)<\/dd>/);
  assert.match(card, /<dt>Next<\/dt><dd>12 new full-time jobs due, June 2027<\/dd>/);
  assert.match(card, /<dt>Stage<\/dt><dd>Announced Oct\. 9, 2026<\/dd>/);
});

test('districts read naturally and drive the district filter', () => {
  const d = { places: ['Penfield', 'Webster'], congress: ['25'], senate: ['55'], assembly: ['135', '130'] };
  assert.equal(districtText(d), 'NY-25 · Senate 55 · Assembly 135, 130 (Penfield, Webster)');
  assert.equal(districtText(null), '');
  const items = [{ id: 'A', districts: d }, { id: 'B', districts: { places: ['Buffalo'], congress: ['26'], senate: [], assembly: ['149'] } }];
  assert.deepEqual(districtKeys(items[0]), ['congress:25', 'senate:55', 'assembly:135', 'assembly:130']);
  assert.deepEqual(filterItems(items, { district: 'assembly:135' }).map((i) => i.id), ['A']);
  assert.deepEqual(filterOptions(items).district.map(([, label]) => label), ['NY-25', 'NY-26', 'Senate 55', 'Assembly 130', 'Assembly 135', 'Assembly 149']);
});

test('who-list groups by home region; unknown stays its own group', () => {
  const html = renderCompanyGroups([
    { name: 'Local', hq_region: 'wny', count: 1 }, { name: 'Away', hq_region: 'elsewhere', count: 1 }, { name: 'Unknown', hq_region: null, count: 1 }]);
  assert.ok(html.indexOf('Based in the region') < html.indexOf('Based outside the region'));
  assert.match(html, /Headquarters not stated[\s\S]*Unknown/);
  assert.doesNotMatch(html, /Based in Ontario/, 'empty groups are left out');
});

test('a story link points at its card', () => {
  assert.equal(storyUrl('https://x.org/MAGS/WNY/issue/one/#old', 'wny-IEVT-1'), 'https://x.org/MAGS/WNY/issue/one/#wny-IEVT-1');
});

test('money cells: one per kind, counted sums, muted when nothing counts', () => {
  const cells = moneyCells(publishable(sample.items));
  const by = Object.fromEntries(cells.map((c) => [c.kind, c]));
  assert.equal(by.investment.value, '$49M');
  assert.equal(by.investment.tone, 'announced');
  assert.equal(by.deals.tone, 'done');
  assert.equal(by.proposed.counted, false);
  assert.match(by.proposed.detail, /not counted: in development/);
  assert.match(by.grants.detail, /not counted: corridor news/);
  assert.match(renderMoneyCells(cells), /wny-cell--muted/);
});

test('the region equation adds announced investment and committed contract money, leaving out undisclosed shares', () => {
  const items = [
    { id: 'I', lane: 'production', stage: 'announced', amount: 49e6, currency: 'USD', amount_type: 'investment' },
    { id: 'C1', lane: 'production', stage: 'award', amount: 18.9e6, currency: 'USD', amount_type: 'obligated',
      flags: [{ type: 'secondary_source', detail: '' }] },
    { id: 'C2', lane: 'production', stage: 'award', amount: 11.2e6, currency: 'USD', amount_type: 'obligated', place: 'Liverpool, Lithuania',
      flags: [{ type: 'gap', detail: 'regional_share' }] },
    { id: 'A', lane: 'production', stage: 'award', amount: 37e6, currency: 'USD', amount_type: 'award' },
    { id: 'D', lane: 'production', stage: 'completed', amount: 75e6, currency: 'USD', amount_type: 'transaction' },
    { id: 'X', lane: 'corridor', stage: 'award', amount: 14317, currency: 'USD', amount_type: 'obligated' },
  ].map((i) => ({ ...i, publish_status: 'approved', headline: i.id }));
  const eq = regionEquation(items);
  assert.deepEqual(eq.terms.map((t) => t.id), ['I', 'C1'], 'no awards, deals, corridor money or undisclosed shares');
  assert.equal(eq.total, '$67.9M');
  const html = renderRegionEquation(eq);
  assert.match(html, /Announced investment and committed contract money tied to work in the region/);
  assert.match(html, /\$49M<\/a> <span class="wny-eq__kind">announced investment<\/span> \+ /);
  assert.match(html, /plus an undisclosed share of an <a href="#wny-C2">\$11\.2M contract<\/a> \(Liverpool, Lithuania\)/);
  assert.match(html, /secondary listing/);
  const withShare = regionEquation(items.map((i) => (i.id === 'C2' ? { ...i, regional_amount: 4e6 } : i)));
  assert.equal(withShare.total, '$71.9M', 'a recorded regional_amount is counted');
  assert.equal(withShare.left.length, 0);
  assert.equal(regionEquation(items.slice(3)), null, 'nothing to add, no equation');
});

test('the article before an amount follows how it is said', () => {
  assert.deepEqual(['$11.2M', '$18.9M', '$8M', '$80M', '$1.4M', '$110M', '$49M'].map(articleFor), ['an', 'an', 'an', 'an', 'a', 'a', 'a']);
});
