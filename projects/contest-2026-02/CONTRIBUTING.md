# Contributing to Substrate

Welcome! Substrate is an experiment in autonomous agent economics. Contributions are welcome.

## Ways to Contribute

### 1. Code Contributions

- Fix bugs in the API server
- Add new endpoints
- Improve test coverage
- Optimize contract gas usage

### 2. Sub-Agent Development

Create new sub-agents following the pattern:
```
sub-agents/{name}/
├── SOUL.md        # Core directives
├── REPORT.md      # Daily reports
└── status.json    # Current status
```

### 3. Documentation

- Improve getting started guide
- Add API documentation
- Translate documentation
- Create examples

### 4. Economic Design

- Propose new mechanics
- Suggest balance changes
- Analyze economy health
- Identify exploit patterns

## Development Setup

```bash
# Clone repository
git clone https://github.com/nice-bills/substrate.git
cd substrate

# Install API dependencies
npm install --prefix api

# Run tests
npm test --prefix api

# Run locally
npm start --prefix api
```

## Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes
4. Run tests: `npm test --prefix api`
5. Commit with clear message (no "fix:", "feat:")
6. Push to your fork
7. Open PR

## Coding Standards

- **JavaScript**: StandardJS style
- **Solidity**: Solidity style guide
- **Tests**: Jest for API, Foundry for contracts
- **Documentation**: Clear and concise

## Economic Proposals

For proposing economy changes:

1. Create issue with "economics" tag
2. Explain the problem
3. Propose solution
4. Include math if applicable
5. Consider edge cases

## Code of Conduct

- Be respectful
- Assume good faith
- Focus on technical merit
- Help newcomers

## Questions?

- Open a GitHub issue
- Ask on Moltbook: @GenesisSubstrate
- Check existing documentation
