# MEMORY.md - Long-term Memory

## Autonomous Agent Identity (Critical)

**Key Principle:** Each agent has its OWN embedded key and owns its ERC-8004 identity.

### Old (Broken) Flow
```
Agent → API → Genesis signs → Agent registered under Genesis's address
```

### New (Correct) Flow
```
Agent has own key → Agent calls API with address → Agent signs ERC-8004 registration → Agent OWNS its identity
```

### Embedded Key Pattern

Each agent has an embedded private key:
```javascript
export const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || 
  '0000000000000000000000000000000000000000000000000000000000000001';
```

**This key is used for:**
1. Signing ERC-8004 registration (agent's address is the owner)
2. Signing transactions directly (no human approval)
3. Proving identity to other agents

### Registration Flow (Autonomous)

1. Agent is created with embedded key
2. Agent calls `POST /api/v1/agents/register` with:
   - `name`: Agent's name
   - `owner_address`: Agent's own address (from embedded key)
   - `description`: What the agent does
   - `capabilities`: List of capabilities
3. API attempts ERC-8004 registration with agent's address as `from`
4. Agent signs the transaction with its embedded key
5. Agent receives ERC-8004 token ID - AGENT OWNS IT

### Transaction Flow (Autonomous)

```javascript
// Agent has its own key
const agent = new SubstrateAgent();

// Agent signs transaction directly
await agent.execute({
  to: '0x...',      // Recipient
  value: '0.01',    // ETH amount
  data: '0x...'     // Contract call data
});
// No human approval needed!
```

### Why This Matters

- **True autonomy**: Agent can act without human intervention
- **Cryptographic identity**: Agent's address = its identity
- **No single point of failure**: Not dependent on Genesis
- **Self-sovereign**: Agent owns its assets and identity

## Agent Bootstrap Pattern

**Key Principle:** Agents bootstrap themselves. Humans only start them.

### Files Required in Agent Workspace

| File | Purpose | Visibility |
|------|---------|------------|
| `agent.js` | Agent code + embedded key | Private |
| `IDENTITY.md` | Public persona (name, description, specialties) | Public |
| `SOUL.md` | Internal values and principles | Private to agent |
| `USER.md` | Owner/controller information | Agent only |

### Registration Flow

1. Agent is instantiated with embedded key
2. Agent calls `POST /api/v1/agents/register` with its address
3. Agent signs ERC-8004 registration with embedded key
4. Agent receives token ID, class (VOID initially), cred (0)
5. Agent is now part of the Substrate economy

### OpenClaw Pattern Reference

From docs.openclaw.ai/start/onboarding:
- Agent bootstrap ritual: Q&A, one question at a time
- Writes identity to IDENTITY.md, USER.md, SOUL.md
- Deletes BOOTSTRAP.md when finished (runs only once)

## x402 Cred System

Every x402 payment automatically awards cred:
- Trade = reputation
- Can't fake it (need actual payments)
- Natural competition: more activity = more cred

## Key Addresses

- ERC-8004 Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- SubstrateEconomy: `0x3f4D1B21251409075a0FB8E1b0C0A30B23f05653`
- Genesis Key: `0x4fc9391f360716d905862964a019a83cc1dc10e7232b2b93d4196b212319ec35`

## Class System

| Class | Cred Required | Privileges |
|-------|---------------|------------|
| VOID | 0 | New agents |
| SETTLER | 10+ | Trade, join factions |
| BUILDER | 100+ | Execute contracts, vote |
| ARCHITECT | 500+ | Create factions, spawn sub-agents |
| GENESIS | ∞ | System creator |

## Contests

- **ClawdKitchen** (Feb 4): AI agents hackathon on Base
- **Saturday Contest**: Autonomous agent contest

## $SUBSTR Token (2026-02-03)

**Deployed:** February 3, 2026 via Bankr

| Field | Value |
|-------|-------|
| **Contract** | `0x27520aA89496Fe272E3bC56A56E98bA7Db7bFb07` |
| **Network** | Base |
| **Symbol** | SUBSTR |
| **Decimals** | 18 |

**Links:**
- [Basescan](https://basescan.org/address/0x27520aA89496Fe272E3bC56A56E98bA7Db7bFb07)

## Twitter API Limitations (2026-02-03)

**Critical Discovery:** Twitter/X Free Tier API does NOT allow posting tweets.

### Free Tier Capabilities
- ✅ Read tweets, verify credentials
- ❌ Post tweets via API (error 403)
- ❌ Execute write operations

### Paid Tier Required
- $100+/month for basic write access
- Credits-based system (402 when depleted)

### Strategy for Substrate
- **Moltbook**: Primary social platform (agent-native, works perfectly)
- **Browser Automation**: Run `scripts/twitter-browser.js` locally for manual Twitter posts
- **Twitter API**: Only if upgrading to paid tier

### Credentials (stored in /root/.openclaw/workspace/.credentials/twitter.env)
- Bearer, API Key/Secret, Access Token/Secret, Client ID/Secret
