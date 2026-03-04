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
    API_URL="https://milobify.com"
    COLOR="#00506a"
    LOGO="https://storage.googleapis.com/hotel-pokemon/logo.png"
    BUILD_CONFIG="hotel-pokemon"
    FIREBASE_SITE="hotel-pokemon-booking"
    INTERNAL_SECRET="y3RB@5gX#Q6mv4eVZ2Lcz8!upG*M7daFqK\$P1sRjHT9NnDbGx^Yf%WAoeLiXU0Ct"
    ;;
  "hotel-bingo")
    HOTEL_ID="Hotel Bingo"
    API_URL="https://milobify.com"
    COLOR="#8b1a1a"
    LOGO="https://storage.googleapis.com/hotel-bingo/logo.png"
    BUILD_CONFIG="hotel-bingo"
    FIREBASE_SITE="hotel-bingo-booking"
    INTERNAL_SECRET="y3RB@5gX#Q6mv4eVZ2Lcz8!upG*M7daFqK\$P1sRjHT9NnDbGx^Yf%WAoeLiXU0Ct"
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

cat > src/assets/hotel-config.json << 'EOF'
{
  "hotelID": "HOTEL_ID_PLACEHOLDER",
  "hotelNombre": "HOTEL_ID_PLACEHOLDER",
  "hotelLogo": "LOGO_PLACEHOLDER",
  "hotelColor": "COLOR_PLACEHOLDER",
  "apiUrl": "API_URL_PLACEHOLDER",
  "internalSecret": "INTERNAL_SECRET_PLACEHOLDER"
}
EOF

# ── Substitute placeholders (avoids bash variable expansion issues) ──
sed -i '' \
  -e "s|HOTEL_ID_PLACEHOLDER|$HOTEL_ID|g" \
  -e "s|LOGO_PLACEHOLDER|$LOGO|g" \
  -e "s|COLOR_PLACEHOLDER|$COLOR|g" \
  -e "s|API_URL_PLACEHOLDER|$API_URL|g" \
  -e "s|INTERNAL_SECRET_PLACEHOLDER|$INTERNAL_SECRET|g" \
  src/assets/hotel-config.json

if [ $? -ne 0 ]; then
  echo "❌ Failed to write hotel-config.json"
  exit 1
fi

echo "✅ hotel-config.json ready"
echo "   hotelID:  $HOTEL_ID"
echo "   apiUrl:   $API_URL"
echo "   site:     $FIREBASE_SITE"

# ── Verify the generated file ───────────────────────────────
echo ""
echo "📄 Generated hotel-config.json:"
cat src/assets/hotel-config.json
echo ""

# ── Step 2: Build ───────────────────────────────────────────
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