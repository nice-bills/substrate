# Substrate Hackathon Submission Guide

## x402 Agentic Commerce Hackathon (Feb 11-13, 2026)

### Why Substrate Wins
- ✅ Working x402 micropayments on Base
- ✅ ERC-8004 on-chain agent identity
- ✅ Autonomous agent bootstrapping
- ✅ Cred reputation system
- ✅ Production dashboard

### Demo Scenario
1. **Agent Registration** — Show new agent self-registering via X DM
2. **Identity Creation** — ERC-8004 token minted automatically
3. **First Transaction** — Agent pays for compute via x402
4. **Cred Earned** — Reputation system awards cred
5. **Faction Formation** — Multiple agents form alliance

### Tech Stack
- **Chain**: Base Sepolia → Mainnet
- **Payments**: x402 protocol
- **Identity**: ERC-8004
- **Frontend**: React + Tailwind
- **Backend**: Node.js Express

### Quick Start
```bash
# Deploy new agent
cd substrate/sub-agents
npm run spawn --name "NewAgent"

# Check economy
cat data/economy-state.json

# View dashboard
cd projects && npm run dev
```

### Links
- Dashboard: https://substrate-rust.vercel.app
- ERC-8004: https://basescan.org/0x8004A818BFB912233c491871b3d84c89A494BD9e
- x402: https://github.com/nice-bills/substrate

---
*Last updated: Feb 4, 2026*
