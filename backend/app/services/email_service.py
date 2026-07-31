"""
Email service — sends directly over SMTP using your own email account.
No third-party email API required. Set these in Railway (or .env locally):

    SMTP_HOST      e.g. smtp.gmail.com
    SMTP_PORT      587 (STARTTLS) or 465 (SSL)
    SMTP_USER      the mailbox you're sending from, e.g. nikhil1996shelke@multipdfstoexcel.com
    SMTP_PASSWORD  an app password (NOT your normal login password — see note below)
    SMTP_TLS       true/false — only matters for port 587, ignored for 465

Gmail / Google Workspace note: Google blocks plain password SMTP login. You
must create an "App Password" (Google Account → Security → 2-Step Verification
→ App passwords) and use that as SMTP_PASSWORD, with SMTP_USER as the full
Gmail address. A normal account password will fail with "Application-specific
password required".

If your domain email is hosted elsewhere (Zoho, Google Workspace, a cPanel
host, etc.), use the SMTP host/port that provider gives you instead.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    from app.core.config import settings

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"[DEV MODE - EMAIL NOT SENT]\nTo: {to_email}\nSubject: {subject}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"MultiPDFsToExcel <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())

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
