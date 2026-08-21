import json, tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import sync_comment as sc
import remove_record as rr


def board():
    return [
        {"id": "b-0001", "category": "events", "kind": "stand-ups", "source": 3},
        {"id": "b-0002", "category": "tools", "kind": "electronics", "source": 7},
    ]


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp()) / "board.json"
        self.tmp.write_text(json.dumps(board()))

    def read(self):
        return json.loads(self.tmp.read_text())

    def add(self, issue=3, cid=100, author="rosa-silva", body="Bench is free."):
        return sc.sync(self.tmp, "created", issue, cid, author, body)


class TestCreate(Base):
    def test_attaches_to_the_record_with_that_source(self):
        self.add(issue=7, cid=1)
        self.assertNotIn("comments", self.read()[0])
        self.assertEqual(self.read()[1]["comments"][0]["body"], "Bench is free.")

    def test_source_matches_across_string_and_int(self):
        self.add(issue="3")
        self.assertEqual(len(self.read()[0]["comments"]), 1)

    def test_an_issue_with_no_record_is_a_no_op(self):
        record, why = sc.sync(self.tmp, "created", 999, 1, "rosa-silva", "Hi")
        self.assertIsNone(record)
        self.assertEqual(self.read(), board())

    def test_an_empty_comment_is_ignored(self):
        self.assertIsNone(sc.sync(self.tmp, "created", 3, 1, "rosa-silva", "   ")[0])

    def test_a_non_login_author_is_refused(self):
        with self.assertRaises(ValueError):
            sc.sync(self.tmp, "created", 3, 1, "not a login", "Hi")

    def test_body_is_capped(self):
        self.add(body="x" * (sc.MAX_COMMENT + 50))
        self.assertEqual(len(self.read()[0]["comments"][0]["body"]), sc.MAX_COMMENT)

    def test_oldest_is_dropped_past_the_cap(self):
        for i in range(sc.MAX_PER_RECORD + 3):
            self.add(cid=i, body=f"comment {i}")
        comments = self.read()[0]["comments"]
        self.assertEqual(len(comments), sc.MAX_PER_RECORD)
        self.assertEqual(comments[0]["body"], "comment 3")

    def test_stores_only_id_author_body_date(self):
        self.add()
        self.assertEqual(sorted(self.read()[0]["comments"][0]),
                         ["author", "body", "date", "id"])


class TestEdit(Base):
    def test_edit_updates_that_comment_and_no_other(self):
        self.add(cid=100, body="first")
        self.add(cid=200, body="second")
        sc.sync(self.tmp, "edited", 3, 200, "rosa-silva", "second, corrected")
        bodies = [c["body"] for c in self.read()[0]["comments"]]
        self.assertEqual(bodies, ["first", "second, corrected"])

    def test_edit_does_not_reorder(self):
        self.add(cid=100, body="first")
        self.add(cid=200, body="second")
        sc.sync(self.tmp, "edited", 3, 100, "rosa-silva", "first, corrected")
        self.assertEqual([c["id"] for c in self.read()[0]["comments"]], [100, 200])

    def test_editing_a_comment_to_empty_removes_it(self):
        self.add(cid=100)
        sc.sync(self.tmp, "edited", 3, 100, "rosa-silva", "   ")
        self.assertNotIn("comments", self.read()[0])

    def test_editing_an_unpublished_comment_adds_it(self):
        """A member edits a comment made before they joined the org: the
        edit is the first event we are allowed to act on."""
        sc.sync(self.tmp, "edited", 3, 100, "rosa-silva", "now visible")
        self.assertEqual(self.read()[0]["comments"][0]["body"], "now visible")


class TestDelete(Base):
    def test_delete_removes_that_comment_only(self):
        self.add(cid=100, body="first")
        self.add(cid=200, body="second")
        sc.sync(self.tmp, "deleted", 3, 100)
        self.assertEqual([c["id"] for c in self.read()[0]["comments"]], [200])

    def test_deleting_the_last_comment_drops_the_key(self):
        self.add(cid=100)
        sc.sync(self.tmp, "deleted", 3, 100)
        self.assertNotIn("comments", self.read()[0])

    def test_deleting_something_never_published_is_a_no_op(self):
        record, why = sc.sync(self.tmp, "deleted", 3, 999)
        self.assertIsNone(record)


class TestRemoveRecord(Base):
    def test_removes_the_record_published_from_that_issue(self):
        removed = rr.remove_record(self.tmp, 3)
        self.assertEqual(removed["id"], "b-0001")
        self.assertEqual([r["id"] for r in self.read()], ["b-0002"])

    def test_matches_across_string_and_int(self):
        self.assertIsNotNone(rr.remove_record(self.tmp, "7"))

    def test_an_unknown_issue_is_a_no_op(self):
        self.assertIsNone(rr.remove_record(self.tmp, 999))
        self.assertEqual(len(self.read()), 2)

    def test_takes_the_comments_with_it(self):
        self.add(issue=3, cid=1)
        rr.remove_record(self.tmp, 3)
        self.assertEqual([r["id"] for r in self.read()], ["b-0002"])

    def test_leaves_records_with_no_source_alone(self):
        """Records published before `source` existed must not be swept up
        by an empty or mismatched issue number."""
        recs = self.read()
        del recs[0]["source"]
        self.tmp.write_text(json.dumps(recs))
        self.assertIsNone(rr.remove_record(self.tmp, ""))
        self.assertEqual(len(self.read()), 2)


if __name__ == "__main__":
    unittest.main()
