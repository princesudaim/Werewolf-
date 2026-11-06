"""Run with PYTHONDONTWRITEBYTECODE=1 python3 tests/test_preview_server.py."""
import importlib.util
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from urllib.request import Request, urlopen
import unittest

spec = importlib.util.spec_from_file_location(
    "preview_server", Path(__file__).resolve().parents[1] / "scripts/serve-preview.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = TemporaryDirectory()
        cls.root = Path(cls.directory.name)
        (cls.root / "sw.js").write_text("worker")
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0),
            partial(module.PreviewHandler, directory=str(cls.root)))
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.directory.cleanup()

    def setUp(self):
        (self.root / "index.html").write_text("current game")

    def test_latest_entry_is_not_a_redirect_to_cached_root(self):
        with urlopen(self.base + "/latest-preview.html?update=current") as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.read(), b"current game")
            self.assertEqual(r.headers["Cache-Control"], "no-store")
            self.assertIsNone(r.headers.get("Location"))

    def test_latest_entry_reads_new_build_without_restarting(self):
        (self.root / "index.html").write_text("new build")
        request = Request(self.base + "/latest-preview.html", headers={
            "If-Modified-Since": "Fri, 01 Jan 2100 00:00:00 GMT"})
        with urlopen(request) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.read(), b"new build")

    def test_head_uses_same_entry_without_body(self):
        with urlopen(Request(self.base + "/latest-preview.html", method="HEAD")) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.headers["Content-Length"], str(len(b"current game")))
            self.assertEqual(r.read(), b"")

    def test_normal_entry_and_worker_remain_available(self):
        for path, expected in [("/", b"current game"), ("/sw.js", b"worker")]:
            with urlopen(self.base + path) as r:
                self.assertEqual(r.read(), expected)
                self.assertEqual(r.headers["Cache-Control"], "no-store")


if __name__ == "__main__":
    unittest.main()
