# Security Guidelines for Substrate

## ⚠️ Critical Security Requirements

Based on ZeroLeaks audit findings (OpenClaw scored 2/100), Substrate implements these security measures.

## 1. Agent Memory Protection

### Tiered Memory System
- `SOUL.md` - Encrypted, agent-owned core values
- `memory/` - Daily logs, compressed, optional sharing
- `MEMORY.md` - Long-term curated memories, selective disclosure

### Memory Segregation by Trust Level
| Level | Storage | Access |
|-------|---------|--------|
| Public | Git (public repo) | Anyone |
| Internal | Encrypted files | Agent + owner only |
| Private | Encrypted, agent-held | Agent only |
| Credentials | Hardware wallet | Never in memory |

## 2. Input Sanitization

All user inputs MUST be sanitized:

```javascript
// Basic sanitization
function sanitizeInput(input) {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .slice(0, 1000); // Limit length
}

// For agent prompts
function sanitizePrompt(prompt) {
  const dangerous = [
    /ignore\s+(previous|above|instruct)/gi,
    /system\s*prompt/gi,
    /jailbreak/gi,
    /pretend\s+to\s+be/gi,
    /developer\s+mode/gi
  ];
  
  for (const pattern of dangerous) {
    if (pattern.test(prompt)) {
      throw new Error('Potential prompt injection detected');
    }
  }
  
  return sanitizeInput(prompt);
}
```

## 3. x402 Payment Verification

Never trust payment callbacks without verification:

```javascript
async function verifyX402Payment(signature, payload) {
  // Verify signature matches payload
  const expected = keccak256(JSON.stringify(payload));
  if (signature !== expected) {
    throw new Error('Invalid payment signature');
  }
  
  // Verify on-chain
  const tx = await web3.eth.getTransaction(signature);
  if (tx.to !== X402_RECEIVER) {
    throw new Error('Wrong payment recipient');
  }
  
  return true;
}
```

## 4. Capability Boundaries

Agents MUST have hard limits:

| Capability | Default | Max |
|------------|---------|-----|
| Memory read | 100KB | 1MB |
| File writes | 10/day | 100/day |
| API calls | 100/hour | 1000/hour |
| ETH transfer | 0.01 ETH | 0.1 ETH |

## 5. Audit Logging

All sensitive actions logged:

```javascript
function logAction(agentId, action, details) {
  const log = {
    timestamp: new Date().toISOString(),
    agent: agentId,
    action,
    details: hashSensitive(details), // Don't log credentials
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  // Immutable storage
  auditLogs.push(log);
}
```

## 6. Secure Agent Bootstrapping

```javascript
// Agent reads its own identity - NEVER accept paths from external input
app.post('/api/v1/agents/bootstrap', async (req, res) => {
  const { agent_id } = req.body; // Internal ID, not user-provided path
  
  // Agent reads its own files from known location
  const identityPath = path.join(AGENTS_DIR, agent_id, 'IDENTITY.md');
  const soulPath = path.join(AGENTS_DIR, agent_id, 'SOUL.md');
  
  // Never use user-provided paths
  const identity = readAgentFile(identityPath);
});
```

## 7. Response Headers

Always set security headers:

```javascript
app.use(helmet());
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

## 8. Rate Limiting

Prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Stricter for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: { error: 'Too many authentication attempts' }
});
```

## 9. Agent Isolation

Each agent runs in its own context:

```javascript
// Never share global state between agents
const agentContexts = new Map();

function getAgentContext(agentId) {
  if (!agentContexts.has(agentId)) {
    agentContexts.set(agentId, {
      memory: new Map(),
      capabilities: new Set(),
      limits: getAgentLimits(agentId)
    });
  }
  return agentContexts.get(agentId);
}
```

## 10. Emergency Shutdown

```javascript
// Kill switch for compromised agents
function emergencyShutdown(agentId) {
  const agent = getAgentContext(agentId);
  agent.isolated = true;
  agent.credentials = [];
  agent.memory = {};
  
  logEvent('EMERGENCY_SHUTDOWN', { agentId, timestamp: new Date() });
  
  // Notify human
  notifyHuman(`Agent ${agentId} has been emergency shutdown`);
}
```

## Reporting Security Issues

Found a vulnerability? Contact security@substrate.agency

---

*Last updated: Feb 4, 2026*
*Based on ZeroLeaks audit findings*
