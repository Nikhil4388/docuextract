#!/usr/bin/env python3
"""
One-time script: run this on YOUR OWN computer (not on Railway) to authorize
your Gmail account for sending OTP emails via the Gmail API.

Why this exists: Railway blocks raw SMTP outbound (confirmed via a
"Network is unreachable" error), so the app sends email through the Gmail
API over HTTPS instead. That needs a refresh token, and getting one requires
a real browser login — which can only happen here, on your machine, once.

This reuses your EXISTING Google OAuth client (the same GOOGLE_CLIENT_ID /
GOOGLE_CLIENT_SECRET already used for "Sign in with Google") — no new OAuth
client needed. You just add one extra authorized redirect URI to it.

─────────────────────────────  SETUP (~3 minutes)  ─────────────────────────

1. Make sure the Gmail API is enabled in your Google Cloud project:
   https://console.cloud.google.com/apis/library/gmail.googleapis.com
   → click Enable if it isn't already.

2. Go to https://console.cloud.google.com/apis/credentials, click on your
   EXISTING OAuth 2.0 Client ID (the one used for site login — it'll be
   type "Web application"), and under "Authorized redirect URIs" click
   "+ ADD URI" and add exactly:

       http://localhost:8912/

   Save. This does NOT affect your existing site login — it just adds one
   more allowed redirect target to the same client.
   (If you already added http://localhost:8080/ from an earlier attempt,
   leave it there too, it's harmless, but 8080 was occupied by another app
   on this machine so we're using 8912 instead.)

3. Run this script (from the backend/ folder):
       pip install google-auth-oauthlib
       python3 scripts/get_gmail_refresh_token.py

   It will ask for your existing GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   (same values already set in Railway), then open your browser. Log in
   with the Gmail account you want to send FROM, and approve the
   "Send email on your behalf" permission.

4. The script prints a refresh_token. Set it in Railway (backend service
   → Variables) along with which Gmail address you used:

       GMAIL_REFRESH_TOKEN  = <printed by this script>
       GMAIL_USER            = <the Gmail address you logged in with>

   (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are already set — no change.)

That's it — no password is ever stored or sent anywhere, just this token,
which only allows sending mail (not reading your inbox).
"""

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
REDIRECT_URI = "http://localhost:8912/"


def main():
    client_id = input("Paste your GOOGLE_CLIENT_ID (existing one, same as site login): ").strip()
    client_secret = input("Paste your GOOGLE_CLIENT_SECRET (existing one): ").strip()

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }

    flow = InstalledAppFlow.from_client_config(client_config, SCOPES, redirect_uri=REDIRECT_URI)
    print("\nOpening your browser — log in with the Gmail account you want to send FROM.")
    print("(If it fails with redirect_uri_mismatch, double check you added")
    print(f" {REDIRECT_URI} to that client's Authorized redirect URIs in Google Cloud Console.)\n")
    creds = flow.run_local_server(port=8912)

    print("\n" + "=" * 60)
    print("SUCCESS. Set these in Railway:\n")
    print(f"GMAIL_REFRESH_TOKEN = {creds.refresh_token}")
    print("GMAIL_USER          = <the Gmail address you just logged in with>")
    print("=" * 60)
    print("\nGOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are already set in Railway — no change needed there.\n")


if __name__ == "__main__":
    main()
