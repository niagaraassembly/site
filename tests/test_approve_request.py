import json, os, tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import approve_request as ar

ISSUE = """A standup was posted.

<!--DATA
{"category":"events","kind":"standup","location":"niagara",
 "title":"Open bench night","when":"Thursday 7pm",
 "where":"Welland Fabrication, 12 Ross St","contact":"rosa@example.ca"}
DATA-->
"""

VALID = {
    "events":  {"title": "Open bench night", "when": "Thursday 7pm",
                "where": "12 Ross St", "contact": "rosa@example.ca"},
    "news":    {"title": "Plant reopens", "link": "https://example.ca/x",
                "description": "Two hundred jobs."},
    "spaces":  {"where": "12 Ross St", "description": "900 sq ft.",
                "contact": "rosa@example.ca"},
    "tools":   {"title": "Reflow oven", "where": "12 Ross St",
                "description": "Bookable evenings.", "contact": "rosa@example.ca"},
    "experts": {"title": "Rosa Silva", "description": "IPC-A-610 trainer.",
                "contact": "rosa@example.ca", "visibility": "public"},
}

FIRST_KIND = {"events": "standup", "news": "new-project", "spaces": "event-space",
              "tools": "electronics", "experts": "software"}


def post(category="events", **over):
    rec = {"category": category, "kind": FIRST_KIND[category], "location": "niagara"}
    rec.update(VALID[category])
    rec.update(over)
    return rec


def board(**over):
    return post("events", **over)


class TestExtract(unittest.TestCase):
    def test_pulls_the_json_out_of_the_comment(self):
        self.assertEqual(ar.extract_block(ISSUE)["title"], "Open bench night")

    def test_missing_block_raises(self):
        with self.assertRaises(ValueError):
            ar.extract_block("no data here")


class TestValidate(unittest.TestCase):
    def test_the_five_categories_match_the_nav(self):
        self.assertEqual(list(ar.CATEGORIES),
                         ["events", "news", "spaces", "tools", "experts"])

    def test_unknown_category_is_rejected(self):
        self.assertEqual(ar.validate({"category": "rumour"}), ["category"])

    def test_a_kind_from_the_wrong_category_is_rejected(self):
        self.assertEqual(ar.validate({"category": "events", "kind": "software"}), ["kind"])

    def test_warehouse_is_valid_under_both_spaces_and_tools(self):
        self.assertIn("warehouse", ar.KINDS["spaces"])
        self.assertIn("warehouse", ar.KINDS["tools"])
        self.assertNotIn("warehouse", ar.KINDS["news"])

    def test_every_category_validates_when_complete(self):
        for category in ar.CATEGORIES:
            self.assertEqual(ar.validate(post(category)), [], category)

    def test_every_category_requires_a_location(self):
        for category in ar.CATEGORIES:
            self.assertIn("location", ar.validate(post(category, location="")))

    def test_a_location_outside_the_list_is_rejected(self):
        self.assertIn("location", ar.validate(post("events", location="toronto")))

    def test_events_require_a_when_but_news_do_not(self):
        self.assertEqual(ar.validate(post("events", when="")), ["when"])
        self.assertEqual(ar.validate(post("news")), [])

    def test_a_private_expert_is_refused_publication(self):
        """visibility=private means staff follow-up only. If such a record
        ever reaches the writer, publishing it would be the exact leak the
        submitter opted out of."""
        self.assertIn("visibility", ar.validate(post("experts", visibility="private")))
        self.assertEqual(ar.validate(post("experts", visibility="both")), [])

    def test_description_over_cap_is_rejected(self):
        self.assertIn("description-too-long",
                      ar.validate(post("news", description="x" * (ar.MAX_TEXT + 1))))

    def test_non_http_link_is_rejected(self):
        self.assertIn("link-not-http", ar.validate(board(link="javascript:alert(1)")))


class TestAppend(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp()) / "board.json"
        self.tmp.write_text("[]")

    def read(self):
        return json.loads(self.tmp.read_text())

    def test_writes_the_public_fields_and_both_nav_levels(self):
        out = ar.append_record(self.tmp, board())
        self.assertEqual(out["category"], "events")
        self.assertEqual(out["kind"], "standup")
        self.assertEqual(out["location"], "niagara")
        self.assertEqual(self.read()[0]["where"], "12 Ross St")

    def test_never_writes_name_or_email(self):
        ar.append_record(self.tmp, board(name="Rosa Silva", email="rosa@example.ca"))
        written = self.read()[0]
        self.assertNotIn("name", written)
        self.assertNotIn("email", written)

    def test_drops_fields_that_are_not_public_for_that_category(self):
        # `presenter` is public on an event, not on a news item.
        ar.append_record(self.tmp, post("news", presenter="Someone"))
        self.assertNotIn("presenter", self.read()[0])

    def test_never_writes_visibility_itself(self):
        """It is a routing instruction, not content. Publishing it would put
        "private" on a public page, which is absurd on its face."""
        ar.append_record(self.tmp, post("experts"))
        self.assertNotIn("visibility", self.read()[0])

    def test_stamps_todays_date_when_absent(self):
        out = ar.append_record(self.tmp, board())
        self.assertRegex(out["date"], r"^\d{4}-\d{2}-\d{2}$")

    def test_ids_stay_sequential_across_mixed_categories(self):
        ar.append_record(self.tmp, post("events"))
        ar.append_record(self.tmp, post("news"))
        self.assertEqual([r["id"] for r in self.read()], ["b-0001", "b-0002"])

    def test_all_five_categories_land_in_one_file(self):
        for category in ar.CATEGORIES:
            self.assertEqual(ar.TARGET[category], ("data/board.json", "b"))


class TestMain(unittest.TestCase):
    def test_invalid_record_exits_non_zero(self):
        os.environ["ISSUE_BODY"] = '<!--DATA {"category":"events","kind":"standup"} DATA-->'
        self.assertEqual(ar.main(), 1)


if __name__ == "__main__":
    unittest.main()
