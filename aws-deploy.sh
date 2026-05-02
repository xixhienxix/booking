#!/bin/bash

set -e

BUCKET_NAME="booking-widget-lobbify"
DIST_PATH="dist/main"
REGION="us-east-1"

echo "🔨 Building Angular app..."
ng build --configuration production

echo "🗑️  Clearing S3 bucket..."
aws s3 rm s3://$BUCKET_NAME --recursive

echo "🚀 Uploading new build..."
aws s3 sync $DIST_PATH s3://$BUCKET_NAME \
  --region $REGION \
  --delete \
  --cache-control "max-age=31536000,public"

echo "📄 Uploading index.html (no cache)..."
aws s3 cp $DIST_PATH/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

echo "⚙️  Uploading hotel-config.json (no cache)..."
aws s3 cp $DIST_PATH/assets/hotel-config.json s3://$BUCKET_NAME/assets/hotel-config.json \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "application/json"

echo "✅ Deploy complete! http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"