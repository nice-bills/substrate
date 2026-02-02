# Substrate Documentation Site

## Quick Start

### Running Locally

```bash
# Install docs tools
npm install -g serve

# Serve docs
serve docs -l 3001
```

Open http://localhost:3001

## Documentation Structure

```
docs/
├── index.md              # Landing page
├── getting-started.md    # Quick start guide
├── architecture.md       # System architecture
├── api/                  # API documentation
│   ├── agents.md
│   ├── transactions.md
│   ├── factions.md
│   └── disputes.md
├── economy/              # Economy mechanics
│   ├── cred-system.md
│   ├── factions.md
│   └── governance.md
├── contributing.md       # How to contribute
├── security.md           # Security considerations
└── faq.md               # Frequently asked questions
```

## Adding Documentation

1. Create a new `.md` file in the appropriate directory
2. Add frontmatter:
```yaml
---
title: Your Page Title
description: Brief description
---
```
3. Use standard Markdown
4. Submit PR

## Building Static Site

```bash
npm install -g docusaurus
docusaurus build --out-dir build
```
