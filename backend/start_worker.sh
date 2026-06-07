#!/bin/bash
set -e

PORT=${PORT:-8080}

# Start health check HTTP server in background
python3 -c "
import http.server, os
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')
    def log_message(self, *a): pass
print('Starting healthcheck server on port $PORT')
http.server.HTTPServer(('0.0.0.0', $PORT), H).serve_forever()
" &

HEALTH_PID=$!
echo "Healthcheck server PID: $HEALTH_PID"

# Start Celery worker (foreground)
python -m celery -A app.tasks.celery_app worker --loglevel=info -Q extraction --concurrency=2
