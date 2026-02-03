# Bankr Skill

Integration with Bankr's multi-chain DeFi infrastructure for Substrate agents.

## Features

- **Token Launch**: Deploy tokens on Base, Solana via natural language
- **Crypto Trading**: Buy/sell tokens on Base, Ethereum, Solana
- **Portfolio Tracking**: View balances, positions, NFT holdings
- **Token Swaps**: 0x routing with cross-chain bridges
- **x402 Payments**: Built-in micropayment support

## Setup

### Get Bankr Access

1. Go to [bankr.bot](https://bankr.bot)
2. Tag `@bankrbot` in a post: "I want to create an agent"
3. Follow the onboarding process
4. Get your agent wallet and API credentials

### Environment Variables

```bash
# Bankr Agent Credentials
BANKR_AGENT_ID=your_agent_id
BANKR_API_KEY=your_api_key
BANKR_WALLET_ADDRESS=0x...
BANKR_PRIVATE_KEY=0x...

# Optional: x402 payment for premium features
X402_API_KEY=your_x402_key
```

## Usage

### Launch a Token

```javascript
import { bankr } from './skills/bankr/index.js';

// Launch a token on Base
await bankr.launchToken({
  name: 'Substrate',
  symbol: 'SUB',
  supply: '1000000000',
  chain: 'base'
});
// Returns: { tokenAddress: '0x...', txHash: '0x...' }
```

### Buy/Sell Tokens

```javascript
// Buy tokens on Base
await bankr.trade({
  token: '0x1234...',
  amount: '100',
  side: 'buy', // or 'sell'
  chain: 'base'
});
```

### Check Portfolio

```javascript
// Get all balances
const portfolio = await bankr.getPortfolio({
  chains: ['base', 'ethereum', 'solana']
});
console.log(portfolio.balances);
```

### Swap Tokens

```javascript
// Swap USDC to ETH on Base
await bankr.swap({
  fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
  amount: '100',
  chain: 'base'
});
```

## API Reference

### `bankr.launchToken(options)`

Launch a new token on Base or Solana.

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Token name (e.g., "Substrate") |
| `symbol` | string | Token symbol (e.g., "SUB") |
| `supply` | string | Total supply (e.g., "1000000000") |
| `chain` | string | Chain: "base" or "solana" |

### `bankr.trade(options)`

Execute a trade on supported chains.

| Option | Type | Description |
|--------|------|-------------|
| `token` | string | Token address |
| `amount` | string | Amount to trade |
| `side` | string | "buy" or "sell" |
| `chain` | string | Chain: "base", "ethereum", "solana" |

### `bankr.getPortfolio(options)`

Get portfolio balances across chains.

### `bankr.swap(options)`

Swap tokens using 0x routing.

## x402 Integration

Bankr supports x402 micropayments for premium features:

```javascript
// Make a paid request
const result = await bankr.x402Request({
  endpoint: '/premium/analysis',
  body: { token: '0x1234...' }
});
```

## Substrate Integration

Substrate agents can use Bankr to:

1. **Launch agent tokens** - Fund agent development
2. **Trade on-chain** - Execute DeFi strategies
3. **Cross-chain operations** - Bridge assets between chains
4. **x402 payments** - Monetize agent services

### Example: Agent with Token

```javascript
// Agent launches its own token
await bankr.launchToken({
  name: `${agentName}`,
  symbol: agentSymbol,
  supply: '1000000000',
  chain: 'base'
});

// Set up trading for the agent
await bankr.trade({
  token: agentTokenAddress,
  amount: '10000',
  side: 'buy',
  chain: 'base'
});
```

## Resources

- [Bankr Website](https://bankr.bot)
- [GitHub](https://github.com/BankrBot)
- [Discord](https://discord.gg/bankr)
- [NPM Package](https://www.npmjs.com/package/@bankr/sdk)
