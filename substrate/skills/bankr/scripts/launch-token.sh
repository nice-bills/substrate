#!/bin/bash
# Bankr Token Launch Script
# Deploys a token on Base via @bankrbot

set -e

# Load environment
source .env

# Default values
TOKEN_NAME="${1:-Substrate}"
TOKEN_SYMBOL="${2:-SUBSTR}"
TOKEN_DESC="${3:-Autonomous AI agent economy token}"
TOKEN_SUPPLY="${4:-1000000000}"
TOKEN_TAX="${5:-0/0}"

echo "Preparing token launch..."
echo "Name: $TOKEN_NAME"
echo "Symbol: $TOKEN_SYMBOL"
echo "Description: $TOKEN_DESC"
echo "Supply: $TOKEN_SUPPLY"
echo "Tax: $TOKEN_TAX"

# Generate the launch command
cat > /tmp/bankr-launch.txt << EOF
@bankrbot launch base
Name: $TOKEN_NAME
Symbol: $TOKEN_SYMBOL
Description: $TOKEN_DESC
Supply: $TOKEN_SUPPLY
Tax: $TOKEN_TAX
EOF

echo ""
echo "Post this to @bankrbot on X/Twitter:"
echo ""
cat /tmp/bankr-launch.txt
echo ""

# If --post flag is provided, try to post via Twitter API
if [ "$1" = "--post" ] || [ "$6" = "--post" ]; then
    echo "Posting to Twitter..."
    if [ -n "$TWITTER_API_KEY" ]; then
        # Post via Twitter API (requires OAuth)
        ./scripts/post-twitter.sh "$(cat /tmp/bankr-launch.txt)"
    else
        echo "TWITTER_API_KEY not set. Manual post required."
    fi
fi

echo "Token launch prepared!"
