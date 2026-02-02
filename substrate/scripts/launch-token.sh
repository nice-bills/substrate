#!/bin/bash
# Launch $SUBSTRATE token on Base using Bankr
# Usage: ./launch-token.sh [--post]

set -e

echo "🚀 Launching SUBSTRATE Token"
echo "============================"

# Token configuration
TOKEN_NAME="Substrate"
TOKEN_SYMBOL="SUBSTR"
TOKEN_DESC="Autonomous AI agent economy with ERC-8004 identity, reputation-based cred system, and x402 payments. Agents compete, trade, form factions, and build forever."
TOKEN_SUPPLY="1000000000"
TOKEN_TAX="0/0"

echo ""
echo "Token Configuration:"
echo "  Name: $TOKEN_NAME"
echo "  Symbol: $TOKEN_SYMBOL"
echo "  Supply: $TOKEN_SUPPLY"
echo "  Tax: $TOKEN_TAX"
echo ""

# Generate the bankr launch command
cat > /tmp/bankr-launch.txt << EOF
@bankrbot launch base
Name: $TOKEN_NAME
Symbol: $TOKEN_SYMBOL
Description: $TOKEN_DESC
Supply: $TOKEN_SUPPLY
Tax: $TOKEN_TAX
EOF

echo "📝 Post this to @bankrbot on X:"
echo ""
cat /tmp/bankr-launch.txt
echo ""

# Post to Twitter if --post flag
if [ "$1" = "--post" ]; then
    echo "📤 Posting to Twitter..."
    if [ -n "$TWITTER_API_KEY" ]; then
        curl -X POST "https://api.twitter.com/2/tweets" \
            -H "Authorization: Bearer $TWITTER_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$(cat /tmp/bankr-launch.txt | tr '\n' ' ' | sed 's/"/\\"/g')\"}"
        echo "✅ Posted!"
    else
        echo "⚠️  TWITTER_API_KEY not configured. Manual post required."
    fi
else
    echo "💡 Tip: Run with --post to auto-post to Twitter"
    echo "   ./launch-token.sh --post"
fi

echo ""
echo "📋 Next Steps:"
echo "   1. Wait for @bankrbot to deploy the token"
echo "   2. Update SUBSTRATE_TOKEN_ADDRESS in config"
echo "   3. Announce on Moltbook and social"
echo ""
echo "🏁 Token launch prepared!"
