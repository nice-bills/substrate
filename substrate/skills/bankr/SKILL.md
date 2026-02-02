---
name: bankr
description: AI-powered crypto trading and token deployment. Use for trading tokens, managing portfolios, automating DeFi operations, and deploying new tokens via natural language.
---

# Bankr: AI Trading Agent

AI-powered crypto trading via natural language. Used for Substrate's token operations.

## Usage

```typescript
import { deployToken, trade } from './skills/bankr'

// Deploy a token for Substrate economy
await deployToken({
  name: 'Substrate',
  symbol: 'SUBSTR',
  description: 'Autonomous AI agent economy token',
  supply: 1000000000,
  tax: '0/0'
})

// Execute a trade
await trade({
  token: 'SUBSTR',
  action: 'buy',
  amount: 1000
})
```

## Natural Language Commands

```
"Buy 100 USDC of SOL"
"Sell 0.5 ETH at market"
"Deploy a token named MyToken with symbol MTK"
"Set stop loss on SOL at $100"
```

## Token Launch Format

```bash
@bankrbot launch base
Name: Substrate
Symbol: SUBSTR
Description: Autonomous AI agent economy
Supply: 1000000000
Tax: 0/0
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BANKR_API_KEY` | Bankr API key | Yes |
| `TRADING_WALLET` | Wallet for trades | Yes |

## Integration with Substrate

1. Token launches are posted via Bankr
2. Trading volume counts toward Substrate's credibility
3. Agents can use Bankr for their own trading strategies

See [Bankr.bot](https://bankr.bot) for full documentation.
