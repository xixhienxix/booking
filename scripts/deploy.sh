#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build and push the Angular app + hotel configs to S3/CloudFront
# Run: ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

S3_BUCKET="s3://booking-widget-lobbify"      # ← change to your bucket name
CLOUDFRONT_ID="E2ZG7WVPSOS5HW"                 # ← change to your distribution ID

echo "▶ Building Angular app..."
ng build --configuration production

echo "▶ Uploading app to S3..."
aws s3 sync dist/your-app-name/ "$S3_BUCKET" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "hotel-config.json" \
  --exclude "hotel-configs/*"

# index.html must never be cached — browsers must always fetch the latest
echo "▶ Uploading index.html (no-cache)..."
aws s3 cp dist/your-app-name/index.html "$S3_BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

# Hotel configs also no-cache so logo/color changes appear immediately
echo "▶ Uploading hotel configs..."
aws s3 cp src/hotel-configs/MovNext.json  "$S3_BUCKET/hotel-configs/MovNext.json"  --cache-control "no-cache"
aws s3 cp src/hotel-configs/HotelDos.json "$S3_BUCKET/hotel-configs/HotelDos.json" --cache-control "no-cache"
aws s3 cp src/hotel-configs/HotelTres.json "$S3_BUCKET/hotel-configs/HotelTres.json" --cache-control "no-cache"

# Fallback dev config at root
aws s3 cp src/hotel-config.json "$S3_BUCKET/hotel-config.json" --cache-control "no-cache"

echo "▶ Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_ID" \
  --paths "/index.html" "/hotel-config.json" "/hotel-configs/*"

echo "✅ Deploy complete."