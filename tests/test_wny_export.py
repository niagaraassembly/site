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
                "headline", "summary", "amount", "currency", "amount_type", "ceiling_amount", "location",
                "jurisdiction", "source_url", "article_id", "source_article_ids", "confidence", "public_note",
                "publish_status", "lane", "stage", "flags", "integrated_at", "integration_run_id"]
ENTITY_FIELDS = ["entity_id", "name", "entity_type", "hq_city", "website"]
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
           "location": location, "jurisdiction": "NY", "source_url": "https://example.com/x",
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

    def test_only_jurisdiction_ny_is_exported(self):
        data = self.run_with([event("NY"), event("ON", location="Hamilton", jurisdiction="ON"),
                              event("BLANK", jurisdiction="")])
        self.assertEqual([i["id"] for i in data["items"]], ["NY"])

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

    def test_flags_parse_into_type_and_detail(self):
        item = self.run_with([event("A", flags="conflict:local_job_count;company_reported")])["items"][0]
        self.assertEqual(item["flags"], [{"type": "conflict", "detail": "local_job_count"},
                                         {"type": "company_reported", "detail": ""}])

    def test_place_keeps_the_record_wording_without_the_state(self):
        self.assertEqual(export.place_for("Rochester NY (buyer HQ)"), ("Rochester (buyer HQ)", -77.61))
        self.assertEqual(export.place_for("Liverpool;Onondaga County"), ("Liverpool, Onondaga County", -76.21))
        self.assertEqual(export.place_for("Niagara Falls, NY")[0], "Niagara Falls")

    def test_unknown_place_exports_without_a_mark(self):
        item = self.run_with([event("A", location="Somewhere, NY")])["items"][0]
        self.assertIsNone(item["lng"])

    def test_only_mentioned_companies_are_exported(self):
        data = self.run_with([event("A")])
        self.assertEqual([e["id"] for e in data["entities"]], ["E1"])

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
