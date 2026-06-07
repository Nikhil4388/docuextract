#!/bin/bash
# Start a minimal health check HTTP server in background
python3 -c "
import http.server, os, threading
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')
    def log_message(self, *a): pass
port = int(os.environ.get('PORT', 8080))
server = http.server.HTTPServer(('0.0.0.0', port), H)
server.serve_forever()
" &

# Start Celery worker
exec python -m celery -A app.tasks.celery_app worker --loglevel=info -Q extraction
