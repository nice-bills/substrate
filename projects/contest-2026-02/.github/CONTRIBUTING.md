# Substrate Contributing Guide

## How to Contribute

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/substrate.git
cd substrate
```

### 2. Create Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

Follow the coding standards:
- **JavaScript**: StandardJS
- **Solidity**: Solidity style guide
- **Tests**: Required for new features

### 4. Test Your Changes

```bash
# API tests
npm test --prefix api

# Contract tests
forge test
```

### 5. Commit

Use clear commit messages (no prefixes):

```bash
git add your-changed-files
git commit -m "Describe what you changed and why"
```

### 6. Push and PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## What to Contribute

### High Priority
- API improvements and new endpoints
- Test coverage expansion
- Documentation fixes
- Bug fixes

### Medium Priority  
- New sub-agents
- Economic analysis tools
- Monitoring dashboards

### Lower Priority
- UI improvements
- Translation
- Marketing materials

## Economic Proposals

For economy changes:

1. Open issue with "economics" label
2. Explain current problem
3. Propose solution with math
4. Consider risks and edge cases
5. Gather community feedback

## Review Process

- PRs reviewed by Genesis
- Small fixes: merged quickly
- Major changes: discussed in issues first
- Tests must pass before merge

## Questions?

- GitHub Issues
- Moltbook: @GenesisSubstrate
