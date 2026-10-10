"""Tests for scripts/wny/export.py: only approved New York records leave na-research."""

import csv
import importlib.util
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "wny_export", Path(__file__).resolve().parents[1] / "scripts" / "wny" / "export.py")
export = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(export)

EVENT_FIELDS = ["event_id", "entity_id", "event_type", "event_date", "published_date", "headline",
                "summary", "amount", "currency", "location", "source_url", "article_id", "confidence",
                "public_note", "publish_status", "lane", "stage", "flags", "integrated_at", "integration_run_id"]
ENTITY_FIELDS = ["entity_id", "name", "hq_city", "country_state_province", "website"]


def write(path, fields, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fields})


def event(eid, status, location, **kw):
    return {"event_id": eid, "entity_id": kw.get("entity", "E1"), "event_type": "facility_expansion",
            "event_date": "2026-10-06", "headline": f"Headline {eid}", "summary": "s",
            "amount": kw.get("amount", ""), "currency": "USD", "location": location,
            "source_url": "https://example.com/x", "publish_status": status,
            "public_note": kw.get("note", ""), "lane": kw.get("lane", "production"),
            "stage": kw.get("stage", "announced"), "flags": kw.get("flags", ""),
            "article_id": kw.get("article", "ART-1")}


class ExportTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        write(self.root / "intel" / "entities.csv", ENTITY_FIELDS, [
            {"entity_id": "E1", "name": "Co One", "hq_city": "Buffalo", "country_state_province": "USA / New York"},
            {"entity_id": "E2", "name": "Co Two", "hq_city": "Hamilton", "country_state_province": "Canada / Ontario"},
        ])

    def tearDown(self):
        self.tmp.cleanup()

    def run_with(self, events):
        write(self.root / "intel" / "entity_events.csv", EVENT_FIELDS, events)
        return export.build(self.root)

    def test_only_approved_or_published_are_exported(self):
        data = self.run_with([
            event("A", "approved", "Buffalo, NY"),
            event("B", "published", "Rochester NY"),
            event("C", "not_ready", "Buffalo, NY"),
            event("D", "eligible", "Buffalo, NY"),
            event("F", "drafted", "Buffalo, NY"),
        ])
        self.assertEqual([i["id"] for i in data["items"]], ["A", "B"])

    def test_only_new_york_is_exported(self):
        data = self.run_with([
            event("NY", "approved", "Peabody Street, Buffalo, NY"),
            event("ON", "approved", "Hamilton, ON", entity="E2"),
            event("STATE", "approved", "Unresolved site"),  # E1's state field says New York
        ])
        self.assertEqual([i["id"] for i in data["items"]], ["NY", "STATE"])

    def test_place_longitude_amount_and_note(self):
        item = self.run_with([event("A", "approved", "Salt Road, Penfield or Webster, NY",
                                    amount="6000000", note="Not yet approved by the town.")])["items"][0]
        self.assertEqual(item["place"], "Salt Road, Penfield or Webster", "both towns are kept")
        self.assertNotIn("summary", item, "the internal summary is never emitted")
        self.assertAlmostEqual(item["lng"], -77.47)
        self.assertEqual(item["amount"], 6000000.0)
        self.assertEqual(item["note"], "Not yet approved by the town.")
        self.assertEqual(item["entity_name"], "Co One")

    def test_excluded_never_exports_and_explainers_are_required(self):
        data = self.run_with([
            event("P", "approved", "Buffalo, NY"),
            event("X", "approved", "Buffalo, NY", lane="excluded", note="n"),
            event("D0", "approved", "Buffalo, NY", lane="developing"),
            event("D1", "approved", "Buffalo, NY", lane="developing", note="Application only."),
            event("C0", "approved", "Buffalo, NY", lane="corridor"),
        ])
        self.assertEqual([i["id"] for i in data["items"]], ["P", "D1"])

    def test_county_or_known_place_counts_as_new_york(self):
        data = self.run_with([
            event("A", "approved", "Liverpool;Onondaga County", entity="E2"),
            event("B", "approved", "Ithaca;Tompkins County", entity="E2"),
            event("C", "approved", "Hamilton;Nanticoke", entity="E2"),
        ])
        self.assertEqual([i["id"] for i in data["items"]], ["A", "B"])
        self.assertEqual(data["items"][0]["county"], "Onondaga")
        self.assertEqual(data["items"][0]["place"], "Liverpool, Onondaga County")

    def test_flags_parse_into_type_and_detail(self):
        item = self.run_with([event("A", "approved", "Buffalo, NY",
                                    flags="conflict:local_job_count;company_reported")])["items"][0]
        self.assertEqual(item["flags"], [{"type": "conflict", "detail": "local_job_count"},
                                         {"type": "company_reported", "detail": ""}])

    def test_duplicates_become_sources_and_x_claims_become_conflicts(self):
        inbox = self.root / "research" / "news" / "inbox"
        write(inbox / "articles.csv", ["article_id", "canonical_url", "title", "source_name", "article_type", "duplicate_of"], [
            {"article_id": "ART-1", "canonical_url": "https://sec.example/8k", "title": "8-K", "source_name": "SEC", "article_type": "regulatory_filing"},
            {"article_id": "ART-2", "canonical_url": "https://paper.example/a", "title": "Paper", "source_name": "Gazette", "article_type": "news_report"},
        ])
        write(inbox / "event_candidates.csv", ["event_candidate_id", "article_id", "proposed_event_type", "headline", "duplicate_of"], [
            {"event_candidate_id": "EVT-1", "article_id": "ART-1", "proposed_event_type": "facility_expansion", "headline": "Headline A"},
            {"event_candidate_id": "EVT-2", "article_id": "ART-2", "proposed_event_type": "facility_expansion", "headline": "Other", "duplicate_of": "EVT-1"},
        ])
        write(inbox / "claim_candidates.csv", ["claim_id", "event_candidate_id", "field", "proposed_value", "normalized_value", "unit_or_currency", "source_locator"], [
            {"claim_id": "C1", "event_candidate_id": "EVT-1", "field": "jobs", "normalized_value": "approximately 85", "unit_or_currency": "jobs", "source_locator": "https://www.sec.example/8k"},
            {"claim_id": "C2", "event_candidate_id": "EVT-2", "field": "local_jobs", "normalized_value": "60", "unit_or_currency": "persons", "source_locator": "https://paper.example/a"},
            {"claim_id": "C3", "event_candidate_id": "EVT-1", "field": "speaker", "normalized_value": "unresolved speaker", "source_locator": "x"},
            {"claim_id": "C4", "event_candidate_id": "EVT-1", "field": "approved_claim", "normalized_value": "1", "source_locator": "x"},
        ])
        write(self.root / "research" / "news" / "reviewed" / "review_decisions.csv", ["record_type", "record_id", "decision"], [
            {"record_type": "CLAIMS", "record_id": "C1", "decision": "X"},
            {"record_type": "CLAIMS", "record_id": "C2", "decision": "X"},
            {"record_type": "CLAIMS", "record_id": "C3", "decision": "X"},
            {"record_type": "CLAIMS", "record_id": "C4", "decision": "A"},
        ])
        ev = event("A", "approved", "Buffalo, NY")
        ev["source_url"] = ""
        item = self.run_with([ev])["items"][0]
        self.assertEqual([s["publisher"] for s in item["sources"]], ["SEC", "Gazette"])
        self.assertEqual(item["sources"][0]["kind"], "primary")
        self.assertEqual([(c["value"], c["source_label"]) for c in item["conflicts"]],
                         [("approximately 85", "sec.example"), ("60", "paper.example")],
                         "every sourced X value, placeholders and non-X claims left out")

    def test_changes_report_added_changed_removed(self):
        old = {"items": [{"id": "A", "v": 1}, {"id": "B", "v": 1}]}
        new = {"items": [{"id": "A", "v": 2}, {"id": "C", "v": 1}]}
        self.assertEqual(export.changes(old, new), {"added": ["C"], "changed": ["A"], "removed": ["B"]})

    def test_niagara_falls_is_not_read_as_niagara(self):
        self.assertEqual(export.place_for("Niagara Falls, NY")[0], "Niagara Falls")

    def test_place_keeps_the_record_wording_without_the_state(self):
        self.assertEqual(export.place_for("Rochester NY (buyer HQ)"), ("Rochester (buyer HQ)", -77.61))
        self.assertEqual(export.place_for("Peabody Street, Buffalo, NY")[0], "Peabody Street, Buffalo")

    def test_unknown_place_exports_without_a_mark(self):
        item = self.run_with([event("A", "approved", "Somewhere, NY")])["items"][0]
        self.assertIsNone(item["lng"])

    def test_only_mentioned_companies_are_exported(self):
        data = self.run_with([event("A", "approved", "Buffalo, NY")])
        self.assertEqual([e["id"] for e in data["entities"]], ["E1"])


if __name__ == "__main__":
    unittest.main()
