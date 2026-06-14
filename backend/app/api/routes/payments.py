"""
PayPal subscription endpoints
  POST /payments/create-checkout-session  → create PayPal subscription, return approval URL
  POST /payments/capture                  → called after user returns from PayPal to confirm
  POST /payments/webhook                  → PayPal webhook (IPN)
  GET  /payments/status                   → current user subscription info
  POST /payments/cancel                   → cancel subscription
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
import httpx
import structlog

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user

logger = structlog.get_logger()
router = APIRouter(prefix="/payments", tags=["Payments"])

FREE_LIMIT = settings.FREE_JOB_LIMIT

PAYPAL_BASE = (
    "https://api-m.sandbox.paypal.com"
    if settings.PAYPAL_MODE == "sandbox"
    else "https://api-m.paypal.com"
)


# ── PayPal helpers ────────────────────────────────────────────────────────────

async def _paypal_access_token() -> str:
    """Get a short-lived OAuth2 access token from PayPal."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYPAL_BASE}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
            headers={"Accept": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


async def _paypal(method: str, path: str, **kwargs) -> dict:
    """Make an authenticated PayPal API call."""
    token = await _paypal_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient() as client:
        resp = await getattr(client, method)(
            f"{PAYPAL_BASE}{path}",
            headers=headers,
            timeout=20,
            **kwargs,
        )
        if not resp.is_success:
            logger.error("paypal_api_error", status=resp.status_code, body=resp.text, path=path)
            raise HTTPException(status_code=502, detail=f"PayPal error: {resp.text}")
        return resp.json() if resp.content else {}


# ── Create PayPal Subscription ────────────────────────────────────────────────

@router.post("/create-checkout-session")
async def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.PAYPAL_CLIENT_ID or not settings.PAYPAL_PLAN_ID:
        raise HTTPException(status_code=503, detail="Payment system not configured yet.")

    if current_user.is_subscribed:
        raise HTTPException(status_code=400, detail="Already subscribed.")

    frontend_url = settings.FRONTEND_URL.rstrip("/")

    body = {
        "plan_id": settings.PAYPAL_PLAN_ID,
        "subscriber": {
            "name": {"given_name": (current_user.full_name or "User").split()[0]},
            "email_address": current_user.email,
        },
        "application_context": {
            "brand_name": "MultiPDFToExcel",
            "locale": "en-US",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "SUBSCRIBE_NOW",
            "return_url": f"{frontend_url}/payment/success",
            "cancel_url": f"{frontend_url}/pricing",
        },
        "custom_id": str(current_user.id),
    }

    data = await _paypal("post", "/v1/billing/subscriptions", json=body)

    # Find approval URL in PayPal response links
    approval_url = next(
        (link["href"] for link in data.get("links", []) if link.get("rel") == "approve"),
        None,
    )
    if not approval_url:
        raise HTTPException(status_code=502, detail="PayPal did not return approval URL.")

    # Store subscription ID so we can confirm later
    current_user.stripe_subscription_id = data["id"]   # reusing field for PayPal sub ID
    await db.commit()

    logger.info("paypal_subscription_created", user_id=str(current_user.id), sub_id=data["id"])
    return {"checkout_url": approval_url}


# ── Capture / confirm after PayPal redirect ────────────────────────────────────

@router.post("/capture")
async def capture_subscription(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    body = await request.json()
    subscription_id = body.get("subscription_id")

    if not subscription_id:
        raise HTTPException(status_code=400, detail="subscription_id required")

    # Verify with PayPal that subscription is ACTIVE
    data = await _paypal("get", f"/v1/billing/subscriptions/{subscription_id}")
    status = data.get("status", "")
    logger.info("paypal_capture", subscription_id=subscription_id, status=status)

    if status in ("ACTIVE", "APPROVED"):
        current_user.is_subscribed = True
        current_user.stripe_subscription_id = subscription_id   # PayPal sub ID
        # Parse next billing time as subscription_end_date
        try:
            next_billing = data.get("billing_info", {}).get("next_billing_time")
            if next_billing:
                current_user.subscription_end_date = datetime.fromisoformat(
                    next_billing.replace("Z", "+00:00")
                )
        except Exception:
            pass
        await db.commit()
        return {"message": "Subscription activated", "status": status}
    else:
        raise HTTPException(status_code=400, detail=f"Subscription not active: {status}")


# ── PayPal Webhook ────────────────────────────────────────────────────────────

@router.post("/webhook")
async def paypal_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event.get("event_type", "")
    resource = event.get("resource", {})
    logger.info("paypal_webhook", event_type=event_type)

    # Subscription activated
    if event_type in ("BILLING.SUBSCRIPTION.ACTIVATED", "BILLING.SUBSCRIPTION.RENEWED"):
        subscription_id = resource.get("id")
        custom_id = resource.get("custom_id")  # user ID we passed
        if custom_id:
            result = await db.execute(select(User).where(User.id == custom_id))
            user = result.scalar_one_or_none()
            if user:
                user.is_subscribed = True
                user.stripe_subscription_id = subscription_id
                await db.commit()
                logger.info("subscription_activated_webhook", user_id=custom_id)

    # Subscription cancelled or suspended
    elif event_type in (
        "BILLING.SUBSCRIPTION.CANCELLED",
        "BILLING.SUBSCRIPTION.SUSPENDED",
        "BILLING.SUBSCRIPTION.EXPIRED",
    ):
        subscription_id = resource.get("id")
        if subscription_id:
            result = await db.execute(
                select(User).where(User.stripe_subscription_id == subscription_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.is_subscribed = False
                user.stripe_subscription_id = None
                user.subscription_end_date = None
                await db.commit()
                logger.info("subscription_cancelled_webhook", subscription_id=subscription_id)

    return {"received": True}


# ── Get subscription status ───────────────────────────────────────────────────

@router.get("/status")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    return {
        "is_subscribed": current_user.is_subscribed,
        "jobs_used": current_user.jobs_used,
        "free_limit": FREE_LIMIT,
        "jobs_remaining": max(0, FREE_LIMIT - (current_user.jobs_used or 0)) if not current_user.is_subscribed else None,
        "subscription_end_date": current_user.subscription_end_date.isoformat() if current_user.subscription_end_date else None,
        "subscription_id": current_user.stripe_subscription_id,
    }


# ── Cancel subscription ───────────────────────────────────────────────────────

@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.is_subscribed or not current_user.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription.")

    subscription_id = current_user.stripe_subscription_id
    try:
        await _paypal(
            "post",
            f"/v1/billing/subscriptions/{subscription_id}/cancel",
            json={"reason": "Cancelled by user"},
        )
    except Exception as e:
        logger.error("paypal_cancel_error", error=str(e))
        raise HTTPException(status_code=500, detail="Could not cancel subscription.")

    current_user.is_subscribed = False
    current_user.stripe_subscription_id = None
    current_user.subscription_end_date = None
    await db.commit()
    return {"message": "Subscription cancelled."}
