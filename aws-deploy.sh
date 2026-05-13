#!/bin/bash

set -e

BUCKET_NAME="booking-widget-lobbify"
# Updated: Based on your 'ls', the files are in 'dist', not 'dist/main'
DIST_PATH="dist" 
REGION="us-east-1"

echo "🔨 Building Angular app..."
ng build --configuration production

echo "🗑️  Clearing S3 bucket..."
aws s3 rm s3://$BUCKET_NAME --recursive

echo "🚀 Uploading new build..."
aws s3 sync $DIST_PATH s3://$BUCKET_NAME \
  --region $REGION \
  --delete \
  --exclude "assets/hotel-config.json" \
  --exclude "index.html" \
  --cache-control "max-age=31536000,public"

echo "📄 Uploading index.html (no cache)..."
aws s3 cp $DIST_PATH/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

echo "⚙️  Uploading hotel-config.json (no cache)..."
if [ -f "$DIST_PATH/assets/hotel-config.json" ]; then
  aws s3 cp $DIST_PATH/assets/hotel-config.json s3://$BUCKET_NAME/assets/hotel-config.json \
    --cache-control "no-cache,no-store,must-revalidate" \
    --content-type "application/json"
else
  echo "⚠️  Warning: hotel-config.json not found in $DIST_PATH/assets/"
fi

echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id E2ZG7WVPSOS5HW \
  --paths "/*"

echo "✅ Deploy complete!"