"""
Security middleware:
  1. SecurityHeadersMiddleware  — injects hardened HTTP response headers
  2. RateLimitMiddleware        — per-IP sliding-window rate limiting using in-process cache
                                  (upgrade to Redis-backed for multi-worker setups)
"""
import time
import asyncio
from collections import defaultdict, deque
from typing import Callable, Dict, Deque

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


# ── 1. Security Headers ───────────────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add OWASP-recommended security headers to every response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Prevent browsers from MIME-sniffing the content type
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Block the page from being embedded in iframes (clickjacking defence)
        response.headers["X-Frame-Options"] = "DENY"

        # Enforce HTTPS for 1 year, include subdomains
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Tighten referrer information sent to third parties
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Disable browser features we don't need
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        )

        # Content Security Policy — adjust if you add external scripts/fonts
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        # Remove the server banner (don't leak tech stack)
        response.headers["Server"] = "MultiPDFToExcel"
        response.headers.pop("X-Powered-By", None)

        # Disable caching for API responses (tokens, user data, etc.)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return response


# ── 2. Rate Limiting ──────────────────────────────────────────────────────────

# Sliding-window counters: ip → deque of timestamps
_counters: Dict[str, Deque[float]] = defaultdict(deque)
_lock = asyncio.Lock()

# Route-specific overrides: prefix → (max_requests, window_seconds)
_ROUTE_LIMITS: Dict[str, tuple] = {
    "/api/v1/auth/login":           (settings.RATE_LIMIT_AUTH_PER_MINUTE, 60),
    "/api/v1/auth/register":        (settings.RATE_LIMIT_AUTH_PER_MINUTE, 60),
    "/api/v1/auth/refresh":         (settings.RATE_LIMIT_AUTH_PER_MINUTE, 60),
    "/api/v1/auth/forgot-password": (5, 60),
    "/api/v1/auth/reset-password":  (5, 60),
}

_DEFAULT_LIMIT = (settings.RATE_LIMIT_API_PER_MINUTE, 60)

# Paths that are never rate-limited (health, static assets)
_EXEMPT_PREFIXES = ("/health", "/favicon", "/static")


def _get_client_ip(request: Request) -> str:
    """Extract real IP, respecting X-Forwarded-For from trusted proxies."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter.
    Returns 429 with Retry-After header when the limit is exceeded.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Skip exempt paths
        if any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            return await call_next(request)

        # Determine limit for this route
        max_req, window = _DEFAULT_LIMIT
        for prefix, (r, w) in _ROUTE_LIMITS.items():
            if path.startswith(prefix):
                max_req, window = r, w
                break

        ip = _get_client_ip(request)
        key = f"{ip}:{path}"
        now = time.monotonic()

        async with _lock:
            dq = _counters[key]
            # Drop timestamps outside the window
            while dq and now - dq[0] > window:
                dq.popleft()

            if len(dq) >= max_req:
                retry_after = int(window - (now - dq[0])) + 1
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(max_req),
                        "X-RateLimit-Window": f"{window}s",
                    },
                )
            dq.append(now)

        response = await call_next(request)

        # Add rate-limit headers to response so clients can self-throttle
        async with _lock:
            remaining = max(0, max_req - len(_counters[key]))
        response.headers["X-RateLimit-Limit"] = str(max_req)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = f"{window}s"

        return response
