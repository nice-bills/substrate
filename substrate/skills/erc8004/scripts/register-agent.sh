#!/bin/bash
# ERC-8004 Agent Registration Script
# Registers an agent on Base chain using ERC-8004 standard

set -e

# Load environment
source .env

# Check required env vars
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$AGENT_NAME" ]; then
    echo "Error: AGENT_NAME not set in .env"
    exit 1
fi

if [ -z "$AGENT_DESCRIPTION" ]; then
    echo "Error: AGENT_DESCRIPTION not set in .env"
    exit 1
fi

if [ -z "$AGENT_ENDPOINT" ]; then
    echo "Error: AGENT_ENDPOINT not set in .env"
    exit 1
fi

echo "Registering agent: $AGENT_NAME"

# Build registration JSON
cat > /tmp/agent-reg.json << EOF
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "$AGENT_NAME",
  "description": "$AGENT_DESCRIPTION",
  "image": "${AGENT_IMAGE:-https://via.placeholder.com/400}",
  "services": [
    {
      "name": "web",
      "endpoint": "$AGENT_ENDPOINT"
    },
    {
      "name": "A2A",
      "endpoint": "$AGENT_ENDPOINT/.well-known/agent-card.json",
      "version": "0.3.0"
    }
  ],
  "x402Support": true,
  "active": true,
  "registrations": []
}
EOF

echo "Agent registration prepared:"
cat /tmp/agent-reg.json

# If we have Pinata JWT, upload to IPFS
if [ -n "$PINATA_JWT" ]; then
    echo "Uploading to IPFS via Pinata..."
    IPFS_RESULT=$(curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
        -H "Authorization: Bearer $PINATA_JWT" \
        -F "file=@/tmp/agent-reg.json")
    
    IPFS_URI=$(echo $IPFS_RESULT | grep -o '"IpfsHash":"[^"]*"' | cut -d'"' -f4)
    echo "IPFS URI: $IPFS_URI"
else
    # Use HTTP URL if provided, otherwise data URI
    if [ -n "$AGENT_REGISTRATION_URL" ]; then
        IPFS_URI="$AGENT_REGISTRATION_URL"
        echo "Using HTTP URL: $IPFS_URI"
    else
        # Encode as base64 data URI
        IPFS_URI="data:application/json;base64,$(base64 -w0 /tmp/agent-reg.json)"
        echo "Using data URI (on-chain): $IPFS_URI"
    fi
fi

# Register on-chain using cast
echo "Registering on Base chain..."

# Get address from private key
ADDRESS=$(cast wallet address $PRIVATE_KEY)
echo "From address: $ADDRESS"

# Check balance
BALANCE=$(cast balance $ADDRESS --rpc-url ${BASE_RPC:-https://base-sepolia.blockpi.network/v1/rpc/public})
echo "Balance: $BALANCE wei"

# Approve and register
# Note: This is a simplified version - actual implementation requires
# interacting with the ERC-8004 contracts

echo "Registration prepared. To complete on-chain registration:"
echo "1. Ensure you have ETH on Base"
echo "2. Call register('$IPFS_URI') on the Identity Registry"
echo ""
echo "Identity Registry (Base): 0x8004A818BFB912233c491871b3d84c89A494BD9e"
echo "IPFS URI: $IPFS_URI"

# Optional: Direct on-chain call if using proper contract
if [ "$1" = "--broadcast" ]; then
    echo "Broadcasting transaction..."
    cast send 0x8004A818BFB912233c491871b3d84c89A494BD9e \
        "register(string)" "$IPFS_URI" \
        --rpc-url ${BASE_RPC:-https://base-sepolia.blockpi.network/v1/rpc/public} \
        --private-key $PRIVATE_KEY
fi

echo "Done!"
