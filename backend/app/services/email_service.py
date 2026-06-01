"""
Email service for OTP verification and password reset.
Uses SMTP — configure SMTP_* vars in .env.
For Gmail: enable "App Passwords" in Google Account settings.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email. Returns True on success, False on failure."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        # Dev mode: just log the email instead of sending
        logger.warning(f"[DEV MODE - EMAIL NOT SENT]\nTo: {to_email}\nSubject: {subject}\nBody:\n{html_body}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"DocuExtract <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_otp_email(to_email: str, otp: str, full_name: Optional[str] = None) -> bool:
    name = full_name or to_email.split("@")[0]
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#667eea">Welcome to DocuExtract!</h2>
      <p>Hi {name},</p>
      <p>Your verification code is:</p>
      <div style="background:#f0f0f0;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#667eea">{otp}</span>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you didn't create an account, ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <p style="color:#999;font-size:12px">DocuExtract — AI-Powered PDF Data Extraction</p>
    </div>
    """
    return send_email(to_email, "Your DocuExtract verification code", html)


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#667eea">Reset Your Password</h2>
      <p>We received a request to reset your DocuExtract password.</p>
      <div style="text-align:center;margin:30px 0">
        <a href="{reset_url}"
           style="background:#667eea;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
          Reset Password
        </a>
      </div>
      <p>Or copy this link:<br>
         <a href="{reset_url}" style="color:#667eea">{reset_url}</a>
      </p>
      <p>This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <p style="color:#999;font-size:12px">DocuExtract — AI-Powered PDF Data Extraction</p>
    </div>
    """
    return send_email(to_email, "Reset your DocuExtract password", html)
