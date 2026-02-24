#!/bin/bash

# ── Deploy ALL hotels ───────────────────────────────────────
# Use this when you push a code update and want every
# hotel rebuilt and redeployed with the latest code.
#
# Usage: ./scripts/deploy-all.sh

# List every hotel here — add new hotels to this array
HOTELS=(
  "hotel-pokemon"
  "hotel-bingo"
)

FAILED=()
SUCCEEDED=()

echo ""
echo "======================================"
echo "🚀  DEPLOYING ALL HOTELS"
echo "======================================"
echo ""

for HOTEL in "${HOTELS[@]}"; do
  echo "--------------------------------------"
  echo "▶  Starting: $HOTEL"
  echo "--------------------------------------"

  ./scripts/deploy.sh $HOTEL

  if [ $? -ne 0 ]; then
    echo "⚠️  $HOTEL FAILED"
    FAILED+=("$HOTEL")
  else
    SUCCEEDED+=("$HOTEL")
  fi

  echo ""
done

# ── Summary ─────────────────────────────────────────────────
echo "======================================"
echo "📊  DEPLOYMENT SUMMARY"
echo "======================================"

if [ ${#SUCCEEDED[@]} -gt 0 ]; then
  echo ""
  echo "✅  Succeeded (${#SUCCEEDED[@]}):"
  for H in "${SUCCEEDED[@]}"; do
    echo "    → $H"
  done
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo "❌  Failed (${#FAILED[@]}):"
  for H in "${FAILED[@]}"; do
    echo "    → $H"
  done
  echo ""
  echo "Run ./scripts/deploy.sh <hotel> to retry failed hotels"
  exit 1
fi

echo ""
echo "🎉  All hotels deployed successfully!"
echo ""