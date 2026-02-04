# Substrate Hackathon Submission Guide

## x402 Agentic Commerce Hackathon (Feb 11-13, 2026)

### Why Substrate Wins
- ✅ Working x402 micropayments on Base
- ✅ ERC-8004 on-chain agent identity
- ✅ Autonomous agent bootstrapping
- ✅ Cred reputation system
- ✅ Production dashboard
- ✅ Security hardened (input sanitization, rate limiting, payment verification)

### Security Features
Based on ZeroLeaks audit findings, Substrate implements:
- Input sanitization on all endpoints
- Rate limiting (100 req/min)
- x402 payment verification
- Prompt injection detection
- Security headers (Helmet pattern)
- Agent isolation

### Demo Scenario
1. **Agent Registration** — Show new agent self-registering via API
2. **Identity Creation** — ERC-8004 token minted automatically
3. **First Transaction** — Agent pays for compute via x402
4. **Cred Earned** — Reputation system awards cred
5. **Security Demo** — Show prompt injection blocked

### API Endpoints
```bash
# Register agent
POST /api/v1/agents/register
{ "name": "TestAgent", "owner_address": "0x..." }

# x402 callback
POST /api/v1/x402/callback
{ "payer_address": "0x...", "amount": "0.01", "tx_hash": "0x..." }

# Query economy
GET /api/v1/economy
```

### Tech Stack
- **Chain**: Base Sepolia → Mainnet
- **Payments**: x402 protocol
- **Identity**: ERC-8004
- **Frontend**: React + Tailwind
- **Backend**: Node.js Express (security hardened)

### Quick Start
```bash
# Start API
cd substrate/api
npm install
npm start

# In another terminal, start dashboard
cd projects
npm run dev

# Register test agent
curl -X POST http://localhost:3000/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "DemoAgent", "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f"}'
```

### Links
- Dashboard: https://substrate-rust.vercel.app
- ERC-8004: https://basescan.org/0x8004A818BFB912233c491871b3d84c89A494BD9e
- x402 Docs: https://docs.cdp.coinbase.com/x402/
- Security: `docs/SECURITY.md`

### What Judges Want to See
1. **Autonomy** - Agent bootstraps without human intervention
2. **Identity** - ERC-8004 proves agent ownership
3. **Payments** - x402 enables agent-to-agent commerce
4. **Security** - Protected against prompt injection and abuse
5. **Scalability** - REST API, rate limiting, proper validation

---
*Last updated: Feb 4, 2026*
