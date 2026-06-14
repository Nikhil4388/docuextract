"""
Run this once to create your $10/month PayPal billing plan.
Usage:
  python create_paypal_plan.py
It will print your PAYPAL_PLAN_ID to copy into Railway.
"""
import requests
import json

# ── Paste your LIVE credentials here ──────────────────────────────────────────
CLIENT_ID     = "PASTE_YOUR_LIVE_CLIENT_ID_HERE"
CLIENT_SECRET = "PASTE_YOUR_LIVE_CLIENT_SECRET_HERE"
# ──────────────────────────────────────────────────────────────────────────────

BASE = "https://api-m.paypal.com"  # live


def get_token():
    r = requests.post(
        f"{BASE}/v1/oauth2/token",
        data={"grant_type": "client_credentials"},
        auth=(CLIENT_ID, CLIENT_SECRET),
    )
    r.raise_for_status()
    return r.json()["access_token"]


def create_product(token):
    r = requests.post(
        f"{BASE}/v1/catalogs/products",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "name": "MultiPDFToExcel Pro",
            "description": "Unlimited PDF data extraction to Excel",
            "type": "SERVICE",
            "category": "SOFTWARE",
        },
    )
    r.raise_for_status()
    product = r.json()
    print(f"✅ Product created: {product['id']}")
    return product["id"]


def create_plan(token, product_id):
    r = requests.post(
        f"{BASE}/v1/billing/plans",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "product_id": product_id,
            "name": "MultiPDFToExcel Pro Monthly",
            "description": "Unlimited PDF extractions — $10/month",
            "status": "ACTIVE",
            "billing_cycles": [
                {
                    "frequency": {"interval_unit": "MONTH", "interval_count": 1},
                    "tenure_type": "REGULAR",
                    "sequence": 1,
                    "total_cycles": 0,  # 0 = infinite
                    "pricing_scheme": {
                        "fixed_price": {"value": "10", "currency_code": "USD"}
                    },
                }
            ],
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "setup_fee": {"value": "0", "currency_code": "USD"},
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3,
            },
        },
    )
    r.raise_for_status()
    plan = r.json()
    print(f"\n✅ Billing plan created!")
    print(f"\n👉 Add this to Railway:\n")
    print(f"   PAYPAL_PLAN_ID={plan['id']}")
    print(f"\n   (Also set PAYPAL_MODE=live)\n")
    return plan["id"]


if __name__ == "__main__":
    print("Connecting to PayPal...")
    token = get_token()
    print("✅ Authenticated")
    product_id = create_product(token)
    create_plan(token, product_id)
