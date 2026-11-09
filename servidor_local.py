#!/usr/bin/env python3
"""Servidor local para probar la app: python servidor_local.py [puerto]  ->  http://localhost:8080"""
import http.server, os, sys, socketserver, mimetypes
mimetypes.add_type("application/wasm", ".wasm"); mimetypes.add_type("text/javascript", ".mjs"); mimetypes.add_type("application/manifest+json", ".webmanifest")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache"); super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("", PORT), Handler) as httpd:
    print(f"Marvel Champions offline -> http://localhost:{PORT}   (Ctrl+C para parar)")
    httpd.serve_forever()
