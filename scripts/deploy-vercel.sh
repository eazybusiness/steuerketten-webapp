#!/bin/bash
# Deploy zu Vercel
# Voraussetzung: Vercel CLI ist installiert (npm i -g vercel)

set -e

echo "🚀 Steuerketten-Webapp Deployment"
echo "=================================="
echo ""

# Prüfen ob Vercel CLI installiert ist
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI nicht gefunden. Installiere mit:"
    echo "   npm install -g vercel"
    exit 1
fi

# Login-Status prüfen
if ! vercel whoami &> /dev/null; then
    echo "🔑 Bitte bei Vercel einloggen..."
    vercel login
fi

# Build lokal testen
echo "📦 Lokaler Build-Test..."
npm run process-data
npm run build
npx pagefind --site dist

echo ""
echo "✅ Build erfolgreich!"
echo ""

# Deploy
echo "🚀 Deploy zu Vercel..."
echo ""

# Für Preview (dev-Branch)
# vercel --prod

# Für Production
vercel --prod

echo ""
echo "🎉 Deployment abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "  1. Domain prüfen: https://steuerkette.hiplus.de"
echo "  2. Sitemap prüfen: https://steuerkette.hiplus.de/sitemap-0.xml"
echo "  3. Search testen: https://steuerkette.hiplus.de/suche/"
