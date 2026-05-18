#!/bin/bash

set -e

BUCKET_NAME="booking-widget-lobbify"
# This is the path confirmed by your 'find' command
DIST_PATH="dist/main" 
REGION="us-east-1"

echo "🧹 Cleaning local environment..."
rm -rf dist/ .angular/

echo "🔨 Building Angular app (Production)..."
ng build --configuration production

echo "🔍 Checking build output..."
if [ ! -f "$DIST_PATH/assets/hotel-config.json" ]; then
    echo "❌ ERROR: File not found at $DIST_PATH/assets/hotel-config.json"
    exit 1
fi

# Print the URL to the terminal so you can be 100% sure before it goes live
echo "✅ Found config. API URL is:"
grep "apiUrl" $DIST_PATH/assets/hotel-config.json

echo "🗑️  Clearing S3 bucket..."
aws s3 rm s3://$BUCKET_NAME --recursive

echo "🚀 Uploading new build..."
# Sync the majority of files with long cache
aws s3 sync $DIST_PATH s3://$BUCKET_NAME \
  --region $REGION \
  --delete \
  --exclude "assets/hotel-config.json" \
  --exclude "index.html" \
  --cache-control "max-age=31536000,public"

echo "📄 Uploading index.html and config (no-cache)..."
aws s3 cp $DIST_PATH/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

aws s3 cp $DIST_PATH/assets/hotel-config.json s3://$BUCKET_NAME/assets/hotel-config.json \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "application/json"

echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id E2ZG7WVPSOS5HW \
  --paths "/*"

echo "✅ Deploy complete! App should be live at https://d3lkfchxk2jil4.cloudfront.net"o