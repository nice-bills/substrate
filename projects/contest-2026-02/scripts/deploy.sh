#!/bin/bash
# Substrate Contract Deployment Script
# Deploys SubstrateEconomy.sol to Base Sepolia

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying SubstrateEconomy to Base Sepolia${NC}"
echo ""

# Check environment
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Copy .env.example to .env and add your PRIVATE_KEY"
    exit 1
fi

# Load environment
source .env

if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ Error: PRIVATE_KEY not set in .env${NC}"
    exit 1
fi

# Check for forge
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}⚠️  Forge not found. Installing...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
fi

echo -e "${GREEN}✅ Environment check passed${NC}"
echo ""

# Build contracts first
echo -e "${YELLOW}🔨 Building contracts...${NC}"
forge build --quiet
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Deploy
echo -e "${GREEN}📤 Deploying SubstrateEconomy...${NC}"
DEPLOY_OUTPUT=$(forge create --rpc-url base-sepoia \
    --private-key $PRIVATE_KEY \
    src/SubstrateEconomy.sol:SubstrateEconomy 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract contract address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to extract contract address${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployed successfully!${NC}"
echo ""
echo -e "${GREEN}📋 Contract Address:${NC} $CONTRACT_ADDRESS"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify contract on Basescan:"
echo "   forge verify-contract --chain base-sepoia $CONTRACT_ADDRESS src/SubstrateEconomy.sol:SubstrateEconomy"
echo ""
echo "2. Update API configuration in api/src/server.js with new address"
echo ""
echo "3. Initialize economy state:"
echo "   Update data/economy-state.json with contract address"
echo ""

# Save deployment info
echo "{
  \"network\": \"base-sepolia\",
  \"contract\": \"SubstrateEconomy\",
  \"address\": \"$CONTRACT_ADDRESS\",
  \"deployed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"transaction_hash\": \"$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-fA-F0-9]{64}' | head -1)\"
}" > deployment.json

echo -e "${GREEN}📁 Deployment info saved to deployment.json${NC}"
