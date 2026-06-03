#!/bin/bash
set -e

echo "🚀 DocuExtract Deploy"
echo "====================="

# Check git status
if [[ -n $(git status --porcelain) ]]; then
  echo "📦 Committing changes..."
  git add -A
  git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
fi

echo "⬆️  Pushing to GitHub (Railway auto-deploys)..."
git push origin main

echo ""
echo "✅ Done! Railway is now building your app."
echo "   Check progress at: https://railway.app"
echo ""
echo "   Your API will be live at your Railway URL + /api/docs"
