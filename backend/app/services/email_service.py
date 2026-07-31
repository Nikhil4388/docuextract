"""
Email service — sends via the Gmail API over HTTPS (NOT raw SMTP).

Raw SMTP (ports 25/465/587) is blocked outbound on Railway's network to
prevent spam abuse — confirmed via "[Errno 101] Network is unreachable"
when we tried smtplib directly. The Gmail API works over plain HTTPS
(port 443, same as every other outbound call this app already makes to
Google/Anthropic/etc.), so it isn't affected by that block.

One-time setup (see backend/scripts/get_gmail_refresh_token.py for the
exact steps): reuses your EXISTING GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET
(the same OAuth app already used for "Sign in with Google" — no new OAuth
client needed, you just add one extra authorized redirect URI to it).
You authorize your own Gmail account with the gmail.send scope, which
produces a refresh_token. Set these in Railway:

    GOOGLE_CLIENT_ID       (already set)
    GOOGLE_CLIENT_SECRET   (already set)
    GMAIL_REFRESH_TOKEN    printed by the one-time script
    GMAIL_USER             the Gmail address you authorized, e.g. yourname@gmail.com

If any of those are missing, this falls back to a dev-mode no-op that
just logs the email instead of sending it.
"""
import base64
import logging
from email.mime.text import MIMEText
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


def _get_access_token() -> Optional[str]:
    from app.core.config import settings
    try:
        resp = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": settings.GMAIL_REFRESH_TOKEN,
                "grant_type": "refresh_token",
            },
            timeout=10,
        )
        data = resp.json()
        if "access_token" not in data:
            logger.error(f"Gmail token refresh failed: {data}")
            return None
        return data["access_token"]
    except Exception as e:
        logger.error(f"Gmail token refresh request failed: {e}")
        return None


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    from app.core.config import settings

    if not (settings.GMAIL_REFRESH_TOKEN and settings.GOOGLE_CLIENT_ID
            and settings.GOOGLE_CLIENT_SECRET and settings.GMAIL_USER):
        logger.warning(f"[DEV MODE - EMAIL NOT SENT]\nTo: {to_email}\nSubject: {subject}")
        return True

    access_token = _get_access_token()
    if not access_token:
        return False

    try:
        msg = MIMEText(html_body, "html")
        msg["To"] = to_email
        msg["From"] = f"MultiPDFsToExcel <{settings.GMAIL_USER}>"
        msg["Subject"] = subject
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

        resp = httpx.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"raw": raw},
            timeout=10,
        )
        if resp.status_code >= 400:
            logger.error(f"Gmail send failed ({resp.status_code}): {resp.text}")
            return False

        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_otp_email(to_email: str, otp: str, full_name: Optional[str] = None) -> bool:
    name = full_name or to_email.split("@")[0]
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#6366f1">Welcome to MultiPDFsToExcel!</h2>
      <p>Hi {name},</p>
      <p>Your verification code is:</p>
      <div style="background:#f0f0f0;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6366f1">{otp}</span>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you didn't create an account, ignore this email.</p>
    </div>
    """
    return send_email(to_email, "Your MultiPDFsToExcel verification code", html)


def send_password_reset_otp_email(to_email: str, otp: str, full_name: Optional[str] = None) -> bool:
    name = full_name or to_email.split("@")[0]
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#6366f1">Reset Your Password</h2>
      <p>Hi {name},</p>
      <p>Use this code to reset your MultiPDFsToExcel password:</p>
      <div style="background:#f0f0f0;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6366f1">{otp}</span>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    return send_email(to_email, "Your MultiPDFsToExcel password reset code", html)
