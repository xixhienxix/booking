#!/bin/bash

# Usage: ./scripts/deploy.sh hotel-pokemon
HOTEL=$1

if [ -z "$HOTEL" ]; then
  echo "❌ No hotel specified."
  echo "Usage: ./scripts/deploy.sh hotel-pokemon"
  exit 1
fi

case $HOTEL in
  "hotel-pokemon")
    HOTEL_ID="Hotel Pokemon"
    API_URL="https://api.milobify.com"
    COLOR="#00506a"
    LOGO="https://storage.googleapis.com/hotel-pokemon/logo.png"
    BUILD_CONFIG="hotel-pokemon"
    FIREBASE_SITE="hotel-pokemon-booking"
    ;;
  "hotel-bingo")
    HOTEL_ID="Hotel Bingo"
    API_URL="https://api.milobify.com"
    COLOR="#8b1a1a"
    LOGO="https://storage.googleapis.com/hotel-bingo/logo.png"
    BUILD_CONFIG="hotel-bingo"
    FIREBASE_SITE="hotel-bingo-booking"
    ;;
  *)
    echo "❌ Unknown hotel: $HOTEL"
    echo "Available hotels: hotel-pokemon, hotel-bingo"
    exit 1
    ;;
esac

echo ""
echo "======================================"
echo "🏨  Deploying: $HOTEL_ID"
echo "🔧  Build config: $BUILD_CONFIG"
echo "🌐  Firebase site: $FIREBASE_SITE"
echo "======================================"
echo ""

# ── Step 1: Inject hotel-config.json ───────────────────────
echo "📝 Injecting hotel-config.json..."
cat > src/assets/hotel-config.json << EOF
{
  "hotelID": "$HOTEL_ID",
  "hotelNombre": "$HOTEL_ID",
  "hotelLogo": "$LOGO",
  "hotelColor": "$COLOR",
  "apiUrl": "$API_URL"
}
EOF
echo "✅ hotel-config.json ready"

# ── Step 2: Build ───────────────────────────────────────────
echo ""
echo "🔨 Building $HOTEL_ID..."
ng build --configuration=$BUILD_CONFIG

if [ $? -ne 0 ]; then
  echo "❌ Build failed for $HOTEL_ID — aborting deploy"
  exit 1
fi
echo "✅ Build complete → dist/$BUILD_CONFIG"

# ── Step 3: Deploy to Firebase ──────────────────────────────
echo ""
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting:$FIREBASE_SITE

if [ $? -ne 0 ]; then
  echo "❌ Firebase deploy failed for $HOTEL_ID"
  exit 1
fi

echo ""
echo "======================================"
echo "✅  $HOTEL_ID live at:"
echo "    https://$FIREBASE_SITE.web.app"
echo "======================================"
echo ""