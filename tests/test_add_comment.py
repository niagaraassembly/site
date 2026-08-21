import json, tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import add_comment as ac


class TestAddComment(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp()) / "board.json"
        self.tmp.write_text(json.dumps([
            {"id": "b-0001", "category": "events", "kind": "stand-ups", "source": 3},
            {"id": "b-0002", "category": "tools", "kind": "electronics", "source": 7},
        ]))

    def read(self):
        return json.loads(self.tmp.read_text())

    def test_attaches_to_the_record_with_that_source(self):
        ac.add_comment(self.tmp, 7, "rosa-silva", "Still available.")
        self.assertNotIn("comments", self.read()[0])
        self.assertEqual(self.read()[1]["comments"][0]["body"], "Still available.")

    def test_source_matches_across_string_and_int(self):
        ac.add_comment(self.tmp, "3", "rosa-silva", "Bench is free.")
        self.assertEqual(len(self.read()[0]["comments"]), 1)

    def test_an_issue_with_no_record_is_a_no_op(self):
        self.assertIsNone(ac.add_comment(self.tmp, 999, "rosa-silva", "Hello"))
        self.assertEqual(self.read(), json.loads(self.tmp.read_text()))

    def test_an_empty_comment_is_ignored(self):
        self.assertIsNone(ac.add_comment(self.tmp, 3, "rosa-silva", "   "))

    def test_a_non_login_author_is_refused(self):
        with self.assertRaises(ValueError):
            ac.add_comment(self.tmp, 3, "not a login", "Hello")

    def test_body_is_capped(self):
        ac.add_comment(self.tmp, 3, "rosa-silva", "x" * (ac.MAX_COMMENT + 50))
        self.assertEqual(len(self.read()[0]["comments"][0]["body"]), ac.MAX_COMMENT)

    def test_oldest_is_dropped_past_the_cap(self):
        for i in range(ac.MAX_PER_RECORD + 3):
            ac.add_comment(self.tmp, 3, "rosa-silva", f"comment {i}")
        comments = self.read()[0]["comments"]
        self.assertEqual(len(comments), ac.MAX_PER_RECORD)
        self.assertEqual(comments[0]["body"], "comment 3")
        self.assertEqual(comments[-1]["body"], f"comment {ac.MAX_PER_RECORD + 2}")

    def test_never_writes_anything_but_author_body_date(self):
        ac.add_comment(self.tmp, 3, "rosa-silva", "Hello")
        self.assertEqual(sorted(self.read()[0]["comments"][0]), ["author", "body", "date"])


if __name__ == "__main__":
    unittest.main()
