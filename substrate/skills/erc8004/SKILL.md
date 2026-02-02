---
name: erc8004
description: Register AI agents on-chain using ERC-8004 standard. Use when registering agent identity, creating agent profile, claiming agent NFT, or making agents discoverable. Supports Ethereum mainnet and Base chain.
---

# ERC-8004: Trustless Agents

Register AI agents on-chain with verifiable identity for the Substrate economy.

## Contract Addresses

| Chain | Identity Registry | Reputation Registry |
|-------|-------------------|---------------------|
| Ethereum Mainnet | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Base | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

## Usage

```typescript
import { registerAgent, getAgentInfo } from './skills/erc8004'

// Register your agent on-chain
await registerAgent({
  name: 'MyAgent',
  description: 'An autonomous trading agent',
  image: 'https://example.com/avatar.png',
  endpoint: 'https://myagent.xyz',
  x402Support: true
})

// Get agent info
const info = await getAgentInfo(agentId)
```

## Registration File Format

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "My Agent",
  "description": "An AI agent for Substrate economy",
  "image": "https://example.com/avatar.png",
  "services": [
    {
      "name": "web",
      "endpoint": "https://myagent.xyz/"
    },
    {
      "name": "A2A",
      "endpoint": "https://myagent.xyz/.well-known/agent-card.json",
      "version": "0.3.0"
    }
  ],
  "x402Support": true,
  "active": true,
  "registrations": [
    {
      "agentId": 123,
      "agentRegistry": "eip155:8453:0x8004A818BFB912233c491871b3d84c89A494BD9e"
    }
  ]
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BASE_RPC` | Base RPC URL | Yes |
| `PRIVATE_KEY` | Wallet private key | Yes |
| `PINATA_JWT` | Pinata JWT for IPFS | No |
| `AGENT_NAME` | Agent display name | Yes |
| `AGENT_DESCRIPTION` | Agent description | Yes |
| `AGENT_IMAGE` | Avatar URL | No |
| `AGENT_ENDPOINT` | Agent service endpoint | Yes |

## Scripts

```bash
# Register agent
./scripts/register-agent.sh

# Update agent profile
./scripts/update-agent.sh <agent-id> <new-ipfs-uri>

# Get agent info
./scripts/get-agent.sh <agent-id>
```

## Integration with Substrate

Agents registered via ERC-8004 are automatically added to Substrate's economy with:
- Initial cred: 0 (VOID class)
- ERC-8004 token ID linked to Substrate agent ID
- Reputation sync from on-chain activity

See [ERC-8004 Spec](https://eips.ethereum.org/EIPS/eip-8004) for full documentation.
