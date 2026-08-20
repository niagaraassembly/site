import json, tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import approve_request as ar

ISSUE = """Someone endorsed.

<!--DATA
{"kind":"endorsement","name":"Rosa Silva","trade":"Toolmaker",
 "location":"Welland, ON","email":"rosa@example.ca","comment":"Count me in."}
DATA-->
"""

class TestExtract(unittest.TestCase):
    def test_pulls_the_json_out_of_the_comment(self):
        self.assertEqual(ar.extract_block(ISSUE)["name"], "Rosa Silva")

    def test_missing_block_raises(self):
        with self.assertRaises(ValueError):
            ar.extract_block("no data here")

class TestValidate(unittest.TestCase):
    def test_endorsement_requires_its_fields(self):
        self.assertEqual(sorted(ar.validate({"kind": "endorsement"})),
                         ["location", "name", "trade"])

    def test_comment_over_cap_is_rejected(self):
        rec = {"kind":"endorsement","name":"a","trade":"b","location":"c","comment":"x"*2501}
        self.assertIn("comment-too-long", ar.validate(rec))

    def test_unknown_kind_is_rejected(self):
        self.assertIn("kind", ar.validate({"kind": "nonsense"}))

    def test_meetup_requires_its_fields(self):
        self.assertEqual(sorted(ar.validate({"kind": "meetup"})),
                         ["contact", "starts", "title", "venue"])

class TestWrite(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "endorsements.json"
        self.path.write_text("[]")

    def tearDown(self):
        self.dir.cleanup()

    def test_email_never_reaches_the_file(self):
        ar.append_record(self.path, ar.extract_block(ISSUE))
        written = json.loads(self.path.read_text())
        self.assertNotIn("email", written[0])
        self.assertEqual(written[0]["name"], "Rosa Silva")

    def test_comment_is_dropped_unless_publish_comment_is_set(self):
        rec = ar.extract_block(ISSUE)
        rec["publish_comment"] = False
        ar.append_record(self.path, rec)
        self.assertNotIn("comment", json.loads(self.path.read_text())[0])

    def test_publish_comment_label_overrides_the_block(self):
        rec = ar.extract_block(ISSUE)          # block says nothing
        rec["publish_comment"] = True          # ...or even says publish
        ar.apply_label_override(rec, {"PUBLISH_COMMENT": "false"})
        ar.append_record(self.path, rec)
        self.assertNotIn("comment", json.loads(self.path.read_text())[0])

    def test_publish_comment_label_present_publishes(self):
        rec = ar.apply_label_override(ar.extract_block(ISSUE),
                                      {"PUBLISH_COMMENT": "true"})
        ar.append_record(self.path, rec)
        self.assertEqual(json.loads(self.path.read_text())[0]["comment"],
                         "Count me in.")

    def test_absent_env_leaves_the_record_alone(self):
        rec = {"kind": "endorsement", "publish_comment": False}
        ar.apply_label_override(rec, {})
        self.assertIs(rec["publish_comment"], False)

    def test_ids_increment(self):
        ar.append_record(self.path, ar.extract_block(ISSUE))
        ar.append_record(self.path, ar.extract_block(ISSUE))
        ids = [r["id"] for r in json.loads(self.path.read_text())]
        self.assertEqual(ids, ["e-0001", "e-0002"])

if __name__ == "__main__":
    unittest.main()
