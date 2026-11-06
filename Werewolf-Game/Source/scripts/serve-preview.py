#!/usr/bin/env python3
"""Online preview entry without changing the game's conservative offline policy.

/latest-preview.html always reads the current index.html from disk. Existing
workers deliberately do not intercept this navigation path. Relative assets,
settings and recovery retain the original installation directory. No storage,
service-worker activation or active-page reload is performed by this server.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path == "/latest-preview.html":
            # Map, don't redirect: navigating back to / would hit the old worker.
            self.path = "/index.html"
            for header in ("If-Modified-Since", "If-None-Match"):
                if header in self.headers:
                    del self.headers[header]
        super().do_GET()

    def do_HEAD(self):
        if urlsplit(self.path).path == "/latest-preview.html":
            self.path = "/index.html"
            for header in ("If-Modified-Since", "If-None-Match"):
                if header in self.headers:
                    del self.headers[header]
        super().do_HEAD()

    def end_headers(self):
        if urlsplit(self.path).path in ("/", "/index.html", "/sw.js"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=3009)
    parser.add_argument("--directory", type=Path,
                        default=Path(__file__).resolve().parents[2] / "Website")
    args = parser.parse_args()
    directory = args.directory.resolve()
    if not (directory / "index.html").is_file():
        parser.error(f"Missing game entry: {directory / 'index.html'}")
    server = ThreadingHTTPServer(("0.0.0.0", args.port),
                                 partial(PreviewHandler, directory=str(directory)))
    print(f"Game preview ready on port {args.port}; latest entry: /latest-preview.html", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
