"""
Email service using Resend API.
Set RESEND_API_KEY in environment variables.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    try:
        from app.core.config import settings
        if not settings.RESEND_API_KEY:
            logger.warning(f"[DEV MODE - EMAIL NOT SENT]\nTo: {to_email}\nSubject: {subject}")
            return True

        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": "DocuExtract <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": html_body,
        })
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
    </div>
    """
    return send_email(to_email, "Your DocuExtract verification code", html)


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    from app.core.config import settings
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#667eea">Reset Your Password</h2>
      <p>Click below to reset your DocuExtract password:</p>
      <div style="text-align:center;margin:30px 0">
        <a href="{reset_url}"
           style="background:#667eea;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
          Reset Password
        </a>
      </div>
      <p>Link expires in <strong>1 hour</strong>.</p>
    </div>
    """
    return send_email(to_email, "Reset your DocuExtract password", html)
