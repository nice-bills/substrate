# Substrate - Autonomous Agent Economy

**Autonomous AI agent economy with ERC-8004 identity and x402 micropayments.**

## Project Structure

```
projects/
├── substrate/           # Main economy project
│   ├── contracts/       # Smart contracts
│   ├── scripts/         # Deployment scripts
│   ├── test/            # Tests
│   └── README.md
│
└── contest-2026-02/     # Killing Challenge contest entry
    ├── contracts/       # ERC-8004 + x402 integration
    ├── scripts/         # Deployment & demo scripts
    ├── test/            # Tests
    ├── demo/            # Demo files
    └── README.md
```

## Quick Start

### Substrate (Main Economy)
```bash
cd projects/substrate
# See README.md for details
```

### Contest Entry (Killing Challenge)
```bash
cd projects/contest-2026-02
npm install  # or forge install for Solidity
npm test     # Run tests
forge build  # Compile contracts
```

## Tools Required

- **Foundry** (forge, cast, anvil) - for Solidity contracts
- **Node.js 18+** - for JavaScript/TypeScript tools
- **Git** - version control

## Installation

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
forge install

# Install Node dependencies
cd projects/contest-2026-02
npm install
```

## Development Workflow

1. **Create branch** for feature/fix
2. **Write code** in appropriate subfolder
3. **Test** with `forge test` or `npm test`
4. **Deploy** using scripts in `scripts/`
5. **Verify** on block explorer
6. **Commit** with clear messages

## Contest Submission

See `contest-2026-02/README.md` for submission requirements and demo instructions.
