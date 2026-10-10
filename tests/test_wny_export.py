"""Tests for scripts/wny/export.py: only approved New York records leave na-research."""

import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "wny_export", Path(__file__).resolve().parents[1] / "scripts" / "wny" / "export.py")
assert SPEC is not None and SPEC.loader is not None
export = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(export)

EVENT_FIELDS = ["event_id", "event_candidate_id", "entity_id", "event_type", "event_date", "published_date",
                "headline", "summary", "amount", "currency", "amount_type", "ceiling_amount", "location", "county", "public_headline",
                "jurisdiction", "region_id", "source_url", "article_id", "source_article_ids", "confidence", "public_note",
                "publish_status", "lane", "stage", "flags", "integrated_at", "integration_run_id"]
ENTITY_FIELDS = ["entity_id", "name", "entity_type", "hq_city", "website", "hq_iso", "hq_region_id"]
CONFLICT_FIELDS = ["conflict_value_id", "event_id", "conflict_field", "value", "source_name", "source_url", "article_id"]
ARTICLE_FIELDS = ["article_id", "canonical_url", "title", "source_name", "article_type"]


def write(path, fields, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fields})


def event(eid, status="approved", location="Buffalo, NY", **kw):
    row = {"event_id": eid, "entity_id": "E1", "event_type": "facility_expansion", "event_date": "2026-10-06",
           "headline": f"Headline {eid}", "summary": "internal summary", "currency": "USD",
           "location": location, "jurisdiction": "US-NY", "region_id": "wny", "source_url": "https://example.com/x",
           "article_id": "ART-1", "publish_status": status, "lane": "production", "stage": "announced"}
    row.update(kw)
    return row


class ExportTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        write(self.root / "intel" / "entities.csv", ENTITY_FIELDS, [
            {"entity_id": "E1", "name": "Co One", "entity_type": "company", "hq_city": "Buffalo"},
            {"entity_id": "E2", "name": "Co Two", "entity_type": "company", "hq_city": "Hamilton"},
        ])
        write(self.root / "research" / "news" / "inbox" / "articles.csv", ARTICLE_FIELDS, [
            {"article_id": "ART-1", "canonical_url": "https://example.com/x", "title": "Release", "source_name": "Governor", "article_type": "government_release"},
            {"article_id": "ART-2", "canonical_url": "https://paper.example/a", "title": "Story", "source_name": "Gazette", "article_type": "news_report"},
        ])

    def tearDown(self):
        self.tmp.cleanup()

    def run_with(self, events, conflicts=()):
        write(self.root / "intel" / "entity_events.csv", EVENT_FIELDS, events)
        write(self.root / "intel" / "event_conflicts.csv", CONFLICT_FIELDS, list(conflicts))
        return export.build(self.root)

    def test_only_approved_or_published_are_exported(self):
        data = self.run_with([event("A"), event("B", "published"), event("C", "not_ready"),
                              event("D", "eligible"), event("F", "drafted")])
        self.assertEqual([i["id"] for i in data["items"]], ["A", "B"])

    def test_only_the_regions_events_are_exported(self):
        data = self.run_with([event("WNY"), event("ON", location="Hamilton", jurisdiction="CA-ON", region_id="niagara-brant"),
                              event("BLANK", region_id="")])
        self.assertEqual([i["id"] for i in data["items"]], ["WNY"])

    def test_home_region_from_iso_and_region_id(self):
        e = lambda iso, rid: {"hq_iso": iso, "hq_region_id": rid}
        self.assertEqual(export.hq_region_of(e("US-NY", "wny"), "wny"), "wny")
        self.assertEqual(export.hq_region_of(e("US-NY", ""), "wny"), "elsewhere")
        self.assertEqual(export.hq_region_of(e("CA-ON", "niagara-brant"), "wny"), "ontario")
        self.assertEqual(export.hq_region_of(e("PL-02", ""), "wny"), "elsewhere")
        self.assertIsNone(export.hq_region_of(e("", ""), "wny"))

    def test_an_empty_export_never_replaces_published_stories(self):
        write(self.root / "intel" / "entity_events.csv", EVENT_FIELDS, [event("A")])
        out = self.root / "site" / "wny.json"
        out.parent.mkdir()
        self.assertEqual(export.main(["--research", str(self.root), "--out", str(out)]), 0)
        write(self.root / "intel" / "entity_events.csv", EVENT_FIELDS, [event("A", region_id="other")])
        before = out.read_text()
        self.assertEqual(export.main(["--research", str(self.root), "--out", str(out)]), 3)
        self.assertEqual(out.read_text(), before, "the published file is left as it was")

    def test_excluded_never_exports_and_explainers_are_required(self):
        data = self.run_with([
            event("P"),
            event("X", lane="excluded", public_note="n"),
            event("D0", lane="developing"),
            event("D1", lane="developing", public_note="Application only."),
            event("C0", lane="corridor"),
        ])
        self.assertEqual([i["id"] for i in data["items"]], ["P", "D1"])

    def test_place_amounts_and_ceiling_stay_apart(self):
        item = self.run_with([event("A", location="Salt Road, Penfield or Webster, NY", amount="18899971",
                                    amount_type="obligated", ceiling_amount="1010243938",
                                    public_note="A note.")])["items"][0]
        self.assertEqual(item["place"], "Salt Road, Penfield or Webster", "both towns are kept")
        self.assertAlmostEqual(item["lng"], -77.47)
        self.assertEqual(item["amount"], 18899971.0)
        self.assertEqual(item["amount_type"], "obligated")
        self.assertEqual(item["ceiling_amount"], 1010243938.0)
        self.assertEqual(item["note"], "A note.")
        self.assertNotIn("summary", item, "the internal summary is never emitted")

    def test_sources_follow_source_article_ids_without_repeats(self):
        item = self.run_with([event("A", source_article_ids="ART-1;ART-2;ART-404")])["items"][0]
        self.assertEqual([(s["publisher"], s["kind"]) for s in item["sources"]],
                         [("Governor", "primary"), ("Gazette", "secondary")],
                         "own source first, listed articles after, unknown article ids skipped")

    def test_conflict_tables_come_from_event_conflicts_by_flag_detail(self):
        item = self.run_with(
            [event("A", flags="conflict:local_job_count;conflict:other_site;gap:warn_notice")],
            [{"event_id": "A", "conflict_field": "local_job_count", "value": "About 85", "source_name": "SEC", "source_url": "https://sec.example"},
             {"event_id": "A", "conflict_field": "local_job_count", "value": "60 local jobs", "source_name": "Gazette", "source_url": "https://paper.example"},
             {"event_id": "A", "conflict_field": "unflagged_field", "value": "x", "source_name": "y"},
             {"event_id": "B", "conflict_field": "local_job_count", "value": "other event", "source_name": "z"}],
        )["items"][0]
        self.assertEqual([c["field"] for c in item["conflicts"]], ["local_job_count"],
                         "only flagged fields, only this event, no empty tables")
        self.assertEqual([v["value"] for v in item["conflicts"][0]["values"]], ["About 85", "60 local jobs"])

    def test_people_come_only_from_event_people_for_exported_events(self):
        write(self.root / "intel" / "event_people.csv",
              ["event_id", "person_name", "role", "organization", "entity_id", "source_name", "source_url", "article_id"], [
                  {"event_id": "A", "person_name": "Ryan Hulse", "role": "Senior Director for R&D", "organization": "Solstice"},
                  {"event_id": "HELD", "person_name": "Not Shown", "role": "x", "organization": "y"},
                  {"event_id": "A", "person_name": " ", "role": "blank name", "organization": "z"},
              ])
        data = self.run_with([event("A"), event("HELD", "not_ready")])
        self.assertEqual([p["name"] for p in data["people"]], ["Ryan Hulse"])

    def test_no_people_file_means_no_people(self):
        self.assertEqual(self.run_with([event("A")])["people"], [])

    def test_flags_parse_into_type_and_detail(self):
        item = self.run_with([event("A", flags="conflict:local_job_count;company_reported")])["items"][0]
        self.assertEqual(item["flags"], [{"type": "conflict", "detail": "local_job_count"},
                                         {"type": "company_reported", "detail": ""}])

    def test_place_keeps_the_record_wording_without_the_state(self):
        self.assertEqual(export.place_for("Rochester NY (buyer HQ)"), ("Rochester (buyer HQ)", -77.61))
        self.assertEqual(export.place_for("Liverpool;Onondaga County"), ("Liverpool, Onondaga County", -76.21))
        self.assertEqual(export.place_for("Niagara Falls, NY")[0], "Niagara Falls")

    def test_county_from_record_else_from_the_place(self):
        self.assertEqual(export.county_of("Liverpool;Onondaga County"), ("Onondaga", "record"))
        self.assertEqual(export.county_of("Peabody Street, Buffalo, NY"), ("Erie", "site_gazetteer"))
        self.assertEqual(export.county_of("Salt Road, Penfield or Webster, NY"), ("Monroe", "site_gazetteer"),
                         "two towns in one county still give that county")
        self.assertEqual(export.county_of("Buffalo or Rochester"), (None, None), "towns in different counties: no guess")
        self.assertEqual(export.county_of("Somewhere, NY"), (None, None))

    def test_the_records_county_column_wins(self):
        item = self.run_with([event("A", location="Peabody Street, Buffalo, NY", county="Erie")])["items"][0]
        self.assertEqual((item["county"], item["county_source"]), ("Erie", "record"))
        item = self.run_with([event("B", location="Peabody Street, Buffalo, NY")])["items"][0]
        self.assertEqual((item["county"], item["county_source"]), ("Erie", "site_gazetteer"))

    def test_unknown_place_exports_without_a_mark(self):
        item = self.run_with([event("A", location="Somewhere, NY")])["items"][0]
        self.assertIsNone(item["lng"])

    def test_only_mentioned_companies_are_exported(self):
        data = self.run_with([event("A")])
        self.assertEqual([e["id"] for e in data["entities"]], ["E1"])

    def test_websites_become_full_addresses(self):
        self.assertEqual(export.website_of("solstice.com"), "https://solstice.com")
        self.assertEqual(export.website_of("https://www.goodyear.com"), "https://www.goodyear.com")
        self.assertEqual(export.website_of(""), "")
        self.assertEqual(export.website_of("javascript:alert(1)"), "")
        self.assertEqual(export.website_of("not a site"), "")

    def test_reader_headline_wins_and_falls_back(self):
        items = self.run_with([event("A", public_headline="Reader headline"), event("B")])["items"]
        self.assertEqual([i["headline"] for i in items], ["Reader headline", "Headline B"])

    def test_published_issues_export_with_their_exported_stories(self):
        write(self.root / "intel" / "issues.csv",
              ["issue_id", "mag", "title", "coverage_start", "coverage_end", "published_date", "public_summary", "publish_status"], [
                  {"issue_id": "WNY-1", "mag": "WNY", "title": "Issue One", "coverage_start": "2026-09-28",
                   "coverage_end": "2026-10-09", "published_date": "2026-10-10", "public_summary": "Sum.", "publish_status": "published"},
                  {"issue_id": "WNY-2", "mag": "WNY", "title": "Issue Two", "publish_status": "not_ready"},
                  {"issue_id": "ON-1", "mag": "ON", "title": "Other mag", "publish_status": "published"},
              ])
        write(self.root / "intel" / "issue_events.csv", ["issue_event_id", "issue_id", "event_id"], [
            {"issue_id": "WNY-1", "event_id": "A"}, {"issue_id": "WNY-1", "event_id": "HELD"}])
        data = self.run_with([event("A"), event("HELD", "not_ready")])
        self.assertEqual([(i["id"], i["events"], i["summary"]) for i in data["issues"]], [("WNY-1", ["A"], "Sum.")])

    def test_districts_merge_every_named_place_and_skip_unknown(self):
        table = {"Penfield": {"congress": [{"id": "25", "share": 1}], "senate": [{"id": "55", "share": 1}],
                              "assembly": [{"id": "135", "share": 1}]},
                 "Webster": {"congress": [{"id": "25", "share": 1}], "senate": [{"id": "55", "share": 1}],
                             "assembly": [{"id": "130", "share": 1}]},
                 "Tonawanda": {"congress": [{"id": "26", "share": 1}]},
                 "North Tonawanda": {"congress": [{"id": "26", "share": 1}]}}
        d = export.districts_of("Salt Road, Penfield or Webster, NY", table)
        self.assertEqual((d["places"], d["assembly"]), (["Penfield", "Webster"], ["135", "130"]))
        self.assertEqual(export.districts_of("North Tonawanda, NY", table)["places"], ["North Tonawanda"],
                         "a name inside a longer name is not counted twice")
        self.assertIsNone(export.districts_of("Somewhere, NY", table))

    def test_source_registry_skips_unknown_types_and_bad_domains(self):
        write(self.root / "research" / "news" / "exports" / "public-source-registry.csv",
              ["public_name", "public_domain", "public_source_type", "coverage", "language", "cited_in_published_story"], [
                  {"public_name": "Good", "public_domain": "good.org", "public_source_type": "news", "coverage": "wny", "language": "en", "cited_in_published_story": "yes"},
                  {"public_name": "Odd", "public_domain": "odd.org", "public_source_type": "<script>", "coverage": "US", "language": "en", "cited_in_published_story": "no"},
                  {"public_name": "Bad", "public_domain": "javascript:x", "public_source_type": "news", "coverage": "US", "language": "en", "cited_in_published_story": "no"},
              ])
        reg = export.build_sources(self.root)
        self.assertEqual([s["name"] for s in reg["sources"]], ["Good"])

    def test_changes_report_added_changed_removed(self):
        old = {"items": [{"id": "A", "v": 1}, {"id": "B", "v": 1}]}
        new = {"items": [{"id": "A", "v": 2}, {"id": "C", "v": 1}]}
        self.assertEqual(export.changes(old, new), {"added": ["C"], "changed": ["A"], "removed": ["B"]})

    def test_issue_flag_writes_a_frozen_copy(self):
        write(self.root / "intel" / "entity_events.csv", EVENT_FIELDS, [event("A")])
        out = self.root / "site" / "wny.json"
        out.parent.mkdir()
        self.assertEqual(export.main(["--research", str(self.root), "--out", str(out), "--issue", "one"]), 0)
        self.assertEqual(json.loads((out.parent / "wny" / "issue-one.json").read_text()), json.loads(out.read_text()))
        self.assertEqual(export.main(["--research", str(self.root), "--out", str(out), "--issue", "../x"]), 2)


if __name__ == "__main__":
    unittest.main()
