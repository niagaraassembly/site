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
                "public_note", "publish_status", "integrated_at", "integration_run_id"]
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
            "public_note": kw.get("note", "")}


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
        self.assertEqual(item["place"], "Penfield")
        self.assertAlmostEqual(item["lng"], -77.47)
        self.assertEqual(item["amount"], 6000000.0)
        self.assertEqual(item["note"], "Not yet approved by the town.")
        self.assertEqual(item["entity_name"], "Co One")

    def test_niagara_falls_is_not_read_as_niagara(self):
        self.assertEqual(export.place_for("Niagara Falls, NY")[0], "Niagara Falls")

    def test_unknown_place_exports_without_a_mark(self):
        item = self.run_with([event("A", "approved", "Somewhere, NY")])["items"][0]
        self.assertIsNone(item["lng"])

    def test_only_mentioned_companies_are_exported(self):
        data = self.run_with([event("A", "approved", "Buffalo, NY")])
        self.assertEqual([e["id"] for e in data["entities"]], ["E1"])


if __name__ == "__main__":
    unittest.main()
