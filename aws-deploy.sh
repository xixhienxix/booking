#!/bin/bash

set -e

BUCKET_NAME="booking-widget-lobbify"
DIST_PATH="dist/main"
REGION="us-east-1"
CLOUDFRONT_ID="E2ZG7WVPSOS5HW"

echo "🧹 Cleaning local environment..."
rm -rf dist/ .angular/

echo "🔨 Building Angular app (Production)..."
ng build --configuration production

echo "🔍 Checking build output..."
if [ ! -d "$DIST_PATH" ]; then
    echo "❌ ERROR: Build output folder not found at $DIST_PATH"
    exit 1
fi

echo "🗑️  Clearing S3 bucket..."
aws s3 rm s3://$BUCKET_NAME --recursive

echo "🚀 Uploading app files (long cache for hashed assets)..."
aws s3 sync $DIST_PATH s3://$BUCKET_NAME \
  --region $REGION \
  --delete \
  --exclude "index.html" \
  --cache-control "max-age=31536000,public"

echo "📄 Uploading index.html (no-cache)..."
aws s3 cp $DIST_PATH/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

echo "🏨 Uploading hotel configs (no-cache)..."
aws s3 cp src/hotel-config.json s3://$BUCKET_NAME/hotel-config.json \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "application/json"

aws s3 cp src/hotel-configs/movnext.json s3://$BUCKET_NAME/hotel-configs/movnext.json \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "application/json"

aws s3 cp src/hotel-configs/hotel-palomas.json s3://$BUCKET_NAME/hotel-configs/hotel-palomas.json \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "application/json"

aws s3 cp src/hotel-configs/hotel-palomas-express.json s3://$BUCKET_NAME/hotel-configs/hotel-palomas-express.json \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "application/json"

aws s3 cp src/hotel-configs/hotel-palomas-nayarit.json s3://$BUCKET_NAME/hotel-configs/hotel-palomas-nayarit.json \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "application/json"

echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*"

echo "✅ Deploy complete!"
echo "🌐 App live at: https://d3lkfchxk2jil4.cloudfront.net"
echo ""
echo "🏨 Hotel URLs:"
echo "   MovNext:         https://d3lkfchxk2jil4.cloudfront.net?hotel=movnext"
echo "   Hotel Palomas:   https://d3lkfchxk2jil4.cloudfront.net?hotel=hotel-palomas"
echo "   Palomas Express: https://d3lkfchxk2jil4.cloudfront.net?hotel=hotel-palomas-express"
echo "   Palomas Nayarit: https://d3lkfchxk2jil4.cloudfront.net?hotel=hotel-palomas-nayarit"