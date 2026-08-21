import json, os, tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import approve_request as ar

ISSUE = """A stand-up was posted.

<!--DATA
{"kind":"standup","title":"Open bench night","when":"Thursday 7pm",
 "where":"Welland Fabrication, 12 Ross St","contact":"rosa@example.ca"}
DATA-->
"""


def board(**over):
    rec = {"kind": "standup", "title": "Open bench night", "when": "Thursday 7pm",
           "where": "12 Ross St", "contact": "rosa@example.ca"}
    rec.update(over)
    return rec


class TestExtract(unittest.TestCase):
    def test_pulls_the_json_out_of_the_comment(self):
        self.assertEqual(ar.extract_block(ISSUE)["title"], "Open bench night")

    def test_missing_block_raises(self):
        with self.assertRaises(ValueError):
            ar.extract_block("no data here")


class TestValidate(unittest.TestCase):
    def test_every_spec_type_is_known(self):
        self.assertEqual(list(ar.BOARD_TYPES),
                         ["standup", "talk", "demo", "space", "news", "idea"])

    def test_unknown_kind_is_rejected(self):
        self.assertEqual(ar.validate({"kind": "rumour"}), ["kind"])

    def test_standup_requires_its_fields(self):
        self.assertEqual(sorted(ar.validate({"kind": "standup"})),
                         ["contact", "title", "when", "where"])

    def test_news_does_not_require_a_when(self):
        rec = {"kind": "news", "title": "Plant reopens",
               "link": "https://example.ca/x", "description": "Details."}
        self.assertEqual(ar.validate(rec), [])

    def test_description_over_cap_is_rejected(self):
        rec = {"kind": "idea", "title": "T", "description": "x" * (ar.MAX_TEXT + 1)}
        self.assertIn("description-too-long", ar.validate(rec))

    def test_non_http_link_is_rejected(self):
        self.assertIn("link-not-http", ar.validate(board(link="javascript:alert(1)")))


class TestAppend(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp()) / "board.json"
        self.tmp.write_text("[]")

    def read(self):
        return json.loads(self.tmp.read_text())

    def test_writes_the_public_fields_and_the_type(self):
        out = ar.append_record(self.tmp, board())
        self.assertEqual(out["type"], "standup")
        self.assertEqual(out["title"], "Open bench night")
        self.assertEqual(self.read()[0]["where"], "12 Ross St")

    def test_never_writes_name_or_email(self):
        ar.append_record(self.tmp, board(name="Rosa Silva", email="rosa@example.ca"))
        written = self.read()[0]
        self.assertNotIn("name", written)
        self.assertNotIn("email", written)

    def test_drops_fields_that_are_not_public_for_that_type(self):
        # `presenter` is public on a talk, not on a stand-up.
        ar.append_record(self.tmp, board(presenter="Someone"))
        self.assertNotIn("presenter", self.read()[0])

    def test_stamps_todays_date_when_absent(self):
        out = ar.append_record(self.tmp, board())
        self.assertRegex(out["date"], r"^\d{4}-\d{2}-\d{2}$")

    def test_ids_stay_sequential_across_mixed_types(self):
        ar.append_record(self.tmp, board())
        ar.append_record(self.tmp, {"kind": "idea", "title": "Shared CMM",
                                    "description": "One machine, six shops."})
        self.assertEqual([r["id"] for r in self.read()], ["b-0001", "b-0002"])

    def test_all_six_types_land_in_one_file(self):
        for kind in ar.BOARD_TYPES:
            self.assertEqual(ar.TARGET[kind], ("data/board.json", "b"))


class TestMain(unittest.TestCase):
    def test_invalid_record_exits_non_zero(self):
        os.environ["ISSUE_BODY"] = '<!--DATA {"kind":"standup"} DATA-->'
        self.assertEqual(ar.main(), 1)


if __name__ == "__main__":
    unittest.main()
