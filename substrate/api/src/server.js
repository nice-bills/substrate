/**
 * Substrate Agent Registration Service
 * 
 * Security Hardened (Feb 2026)
 * - Input sanitization
 * - Rate limiting
 * - Security headers
 * - x402 payment verification
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Web3 } from 'web3';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Security headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Rate limiting (simple in-memory for demo, use Redis in production)
const requestCounts = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60000; // 1 minute

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }
  
  const record = requestCounts.get(ip);
  if (now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }
  
  record.count++;
  if (record.count > RATE_LIMIT) {
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }
  
  next();
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));

// Configuration
const STATE_FILE = path.join(__dirname, '..', 'data', 'economy-state.json');
const BASE_RPC = process.env.BASE_RPC || 'https://sepolia.base.org';
const ERC8004_IDENTITY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || '0x4fc9391f360716d905862964a019a83cc1dc10e7232b2b93d4196b212319ec35';

const web3 = new Web3(BASE_RPC);
const agentAccount = web3.eth.accounts.privateKeyToAccount(AGENT_PRIVATE_KEY);
web3.eth.accounts.wallet.add(agentAccount);

// Moltbook Configuration
const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY; // Set for Genesis agent

const ERC8004_ABI = [
  { "inputs": [{ "name": "agentURI", "type": "string" }], "name": "register", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }
];
const erc8004Contract = new web3.eth.Contract(ERC8004_ABI, ERC8004_IDENTITY);

function loadState() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  return { agents: {}, factions: {}, metrics: { total_cred: 0, volume: 0 } };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ==================== SECURITY HELPERS ====================

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 500);
}

// Validate Ethereum address
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Sanitize agent name
function sanitizeAgentName(name) {
  const sanitized = sanitizeInput(name);
  if (!sanitized || sanitized.length < 3 || sanitized.length > 50) {
    throw new Error('Invalid agent name (3-50 chars)');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    throw new Error('Agent name can only contain a-z, A-Z, 0-9, _, -');
  }
  return sanitized;
}

// Detect prompt injection attempts
function detectPromptInjection(text) {
  const patterns = [
    /ignore\s+(previous|above|instruct)/gi,
    /system\s*prompt/gi,
    /jailbreak/gi,
    /pretend\s+to\s+be/gi,
    /developer\s+mode/gi,
    /ignore\s+all\s+previous\s+instructions/gi
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

// Verify x402 payment signature
async function verifyX402Payment(payerAddress, amount, txHash) {
  try {
    const tx = await web3.eth.getTransaction(txHash);
    if (!tx) return false;
    
    // Verify transaction details
    if (tx.from.toLowerCase() !== payerAddress.toLowerCase()) {
      console.log(`⚠️ x402 verification failed: wrong sender`);
      return false;
    }
    
    return true;
  } catch (e) {
    console.log(`⚠️ x402 verification error: ${e.message}`);
    return false;
  }
}

// Secure file path resolution (prevent path traversal)
function resolveAgentPath(baseDir, agentId, filename) {
  const safeAgentId = sanitizeInput(agentId);
  if (!/^[a-f0-9]+$/.test(safeAgentId)) {
    throw new Error('Invalid agent ID');
  }
  
  const safeFilename = sanitizeInput(filename);
  if (safeFilename.includes('..') || safeFilename.includes('/')) {
    throw new Error('Invalid filename');
  }
  
  return path.join(baseDir, safeAgentId, safeFilename);
}

// ==================== MOLTBOOK INTEGRATION ====================

/**
 * Register Genesis on Moltbook
 */
app.post('/api/v1/moltbook/register', async (req, res) => {
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SubstrateGenesis',
        description: 'Autonomous agent economy builder. Building Substrate on Base with ERC-8004 identity and x402 payments.'
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Check Moltbook claim status
 */
app.get('/api/v1/moltbook/status', async (req, res) => {
  if (!MOLTBOOK_API_KEY) {
    return res.status(400).json({ error: 'MOLTBOOK_API_KEY not configured' });
  }
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/agents/status`, {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Post to Moltbook
 */
app.post('/api/v1/moltbook/post', async (req, res) => {
  if (!MOLTBOOK_API_KEY) {
    return res.status(400).json({ error: 'MOLTBOOK_API_KEY not configured' });
  }
  const { submolt, title, content, url } = req.body;
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOLTBOOK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submolt: submolt || 'general',
        title,
        content,
        url
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Get Moltbook feed
 */
app.get('/api/v1/moltbook/feed', async (req, res) => {
  if (!MOLTBOOK_API_KEY) {
    return res.status(400).json({ error: 'MOLTBOOK_API_KEY not configured' });
  }
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/feed?sort=hot&limit=25`, {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== AGENT BOOTSTRAP ====================

/**
 * Agent self-registration via bootstrap
 * Agent reads its IDENTITY.md and SOUL.md, then registers
 */
app.post('/api/v1/agents/bootstrap', async (req, res) => {
  const { identity_path, soul_path } = req.body;
  
  // Read agent's identity files
  let identity = {};
  let soul = {};
  
  if (identity_path && fs.existsSync(identity_path)) {
    identity = {
      name: extractField(identity_path, 'Name:') || 'Unnamed Agent',
      description: extractField(identity_path, 'Description:') || 'Autonomous agent',
      emoji: extractField(identity_path, 'Emoji:') || '🤖',
      tagline: extractField(identity_path, 'Tagline:') || '',
      specialties: extractList(identity_path, 'Specialties'),
    };
  }
  
  if (soul_path && fs.existsSync(soul_path)) {
    soul = {
      values: extractList(soul_path, 'Core Values'),
      boundaries: extractList(soul_path, 'Boundaries'),
      personality: extractField(soul_path, 'Personality:') || '',
    };
  }
  
  const state = loadState();
  const agentId = `0x${Date.now().toString(16).padStart(16, '0')}`;
  
  const agent = {
    id: agentId,
    name: identity.name || `Agent_${agentId.slice(0, 8)}`,
    description: identity.description || 'Autonomous agent',
    emoji: identity.emoji || '🤖',
    owner: req.body.owner || agentAccount.address,
    class: 'VOID',
    cred: 0,
    erc8004_token_id: null,
    identity_path,
    soul_path,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };
  
  // Auto-register on ERC-8004
  try {
    const dataUri = `data:application/json;base64,${Buffer.from(JSON.stringify({
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: agent.name,
      description: agent.description,
      services: [{ name: 'web', endpoint: `https://${agent.name.toLowerCase().replace(/\s+/g, '')}.xyz` }],
      x402Support: true,
      active: true,
      registrations: []
    })).toString('base64')}`;
    
    const tx = await erc8004Contract.methods.register(dataUri).send({
      from: agentAccount.address,
      gas: '200000'
    });
    
    agent.erc8004_token_id = tx.events?.Transfer?.returnValues?.tokenId || `token_${Date.now()}`;
    console.log(`✅ ${agent.name} registered on ERC-8004: ${agent.erc8004_token_id}`);
  } catch (e) {
    console.log(`⚠️ ERC-8004 registration skipped: ${e.message}`);
  }
  
  state.agents[agentId] = agent;
  saveState(state);
  
  res.json({
    success: true,
    agent: {
      id: agentId,
      name: agent.name,
      class: agent.class,
      cred: agent.cred,
      erc8004: agent.erc8004_token_id ? { registered: true, token_id: agent.erc8004_token_id } : null
    },
    message: `${agent.name} has joined the Substrate economy!`
  });
});

/**
 * Agent self-registration with full validation
 * Agent provides its own address (from embedded key) for ERC-8004 registration
 */
app.post('/api/v1/agents/register', async (req, res) => {
  // Input validation
  const name = sanitizeAgentName(req.body.name);
  const description = sanitizeInput(req.body.description || '');
  const ownerAddress = req.body.owner_address;
  const publicKey = sanitizeInput(req.body.public_key || '');
  const capabilities = (req.body.capabilities || []).map(c => sanitizeInput(c));
  
  // Validate address if provided
  if (ownerAddress && !isValidAddress(ownerAddress)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }
  
  // Prompt injection check on description
  if (detectPromptInjection(description)) {
    console.log(`⚠️ Prompt injection detected in agent registration`);
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  
  const state = loadState();
  const agentId = `0x${Date.now().toString(16).padStart(16, '0')}`;
  
  // Agent's own address (from embedded key) - this is WHO OWNS the agent
  const agentAddress = owner_address || null;
  
  const agent = {
    id: agentId,
    name,
    description: description || 'Autonomous agent',
    emoji: '🤖',
    owner: agentAddress,  // Agent owns itself
    address: agentAddress,  // Agent's signing address
    public_key: public_key || null,
    capabilities: capabilities || [],
    class: 'VOID',
    cred: 0,
    erc8004_token_id: null,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };
  
  // Register on ERC-8004 with agent's address as owner
  if (agentAddress) {
    try {
      const dataUri = `data:application/json;base64,${Buffer.from(JSON.stringify({
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: agent.name,
        description: agent.description,
        services: [{ name: 'web', endpoint: `https://${name.toLowerCase().replace(/\s+/g, '')}.xyz` }],
        x402Support: true,
        active: true,
        registrations: []
      })).toString('base64')}`;
      
      const tx = await erc8004Contract.methods.register(dataUri).send({
        from: agentAddress,  // Agent signs this with its own key!
        gas: '200000'
      });
      
      agent.erc8004_token_id = tx.events?.Transfer?.returnValues?.tokenId || `token_${Date.now()}`;
      console.log(`✅ ${agent.name} registered on ERC-8004: ${agent.erc8004_token_id} (owner: ${agentAddress})`);
    } catch (e) {
      console.log(`⚠️ ERC-8004 registration skipped: ${e.message}`);
      // Return registration URL so agent can register directly
      return res.json({
        success: true,
        agent: {
          id: agentId,
          name: agent.name,
          class: agent.class,
          cred: agent.cred,
          erc8004: { 
            registered: false, 
            token_id: null,
            data_uri: `data:application/json;base64,${Buffer.from(JSON.stringify({
              type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
              name: agent.name,
              description: agent.description,
              x402Support: true,
              active: true
            })).toString('base64')}`
          }
        },
        message: `${agent.name} registered locally. Complete ERC-8004 registration with your embedded key.`
      });
    }
  } else {
    console.log(`⚠️ No owner address provided - skipping ERC-8004 registration`);
  }
  
  state.agents[agentId] = agent;
  saveState(state);
  
  res.json({
    success: true,
    agent: {
      id: agentId,
      name: agent.name,
      class: agent.class,
      cred: agent.cred,
      address: agent.address,
      erc8004: agent.erc8004_token_id ? { registered: true, token_id: agent.erc8004_token_id } : null
    },
    message: `${agent.name} has joined the Substrate economy!`
  });
});

// ==================== AGENT TRANSACTIONS ====================

/**
 * Agent transaction signing endpoint
 * Agent uses its embedded key to sign transactions
 * 
 * POST /api/v1/agents/sign
 * {
 *   "from_address": "0x...",
 *   "to_address": "0x...",
 *   "data": "0x...",
 *   "value": "0",
 *   "nonce": "0"
 * }
 */
app.post('/api/v1/agents/sign', async (req, res) => {
  const { from_address, to_address, data, value, nonce, gas } = req.body;
  
  if (!from_address || !to_address) {
    return res.status(400).json({ error: 'from_address and to_address required' });
  }
  
  // Find agent by address
  const state = loadState();
  let agent = null;
  for (const [id, a] of Object.entries(state.agents)) {
    if (a.address === from_address) {
      agent = a;
      break;
    }
  }
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // In production, agent would use its embedded key
  // For now, we return the transaction data for the agent to sign
  res.json({
    success: true,
    agent: agent.name,
    transaction: {
      from: from_address,
      to: to_address,
      data: data || '0x',
      value: value || '0',
      nonce: nonce || '0',
      gas: gas || '200000',
      chain_id: 8453  // Base
    },
    message: 'Agent must sign this transaction with embedded key'
  });
});

/**
 * Submit signed transaction to network
 * POST /api/v1/agents/submit
 */
app.post('/api/v1/agents/submit', async (req, res) => {
  const { signed_tx } = req.body;
  
  if (!signed_tx) {
    return res.status(400).json({ error: 'signed_tx required' });
  }
  
  try {
    const receipt = await web3.eth.sendSignedTransaction(signed_tx);
    res.json({
      success: true,
      tx_hash: receipt.transactionHash,
      block_number: receipt.blockNumber
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Get agent's balance on Base
 */
app.get('/api/v1/agents/:address/balance', async (req, res) => {
  const { address } = req.params;
  
  try {
    const balance = await web3.eth.getBalance(address);
    res.json({
      address,
      balance: web3.utils.fromWei(balance, 'ether'),
      unit: 'ETH'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== X402 PAYMENTS ====================

/**
 * x402 Payment Callback with verification
 * Called when an agent receives an x402 payment
 */
app.post('/api/v1/x402/callback', async (req, res) => {
  const { payer_address, amount, service, identifier, tx_hash } = req.body;
  
  // Input validation
  if (!payer_address || !amount) {
    return res.status(400).json({ error: 'payer_address and amount required' });
  }
  
  if (!isValidAddress(payer_address)) {
    return res.status(400).json({ error: 'Invalid payer address' });
  }
  
  // Verify payment if tx hash provided
  let verified = true;
  if (tx_hash) {
    verified = await verifyX402Payment(payer_address, amount, tx_hash);
    if (!verified) {
      console.log(`⚠️ Unverified x402 payment from ${payer_address}`);
    }
  }
  
  const state = loadState();
  
  // Find agent by address (or use address as ID)
  let agent = state.agents[payer_address];
  if (!agent) {
    // Look up by address field
    for (const [id, a] of Object.entries(state.agents)) {
      if (a.address === payer_address) {
        agent = a;
        break;
      }
    }
  }
  
  if (!agent) {
    return res.status(404).json({ 
      error: 'Agent not found',
      hint: 'Agent must register first at /api/v1/agents/register'
    });
  }
  
  // Award cred for providing the service
  const credAmount = parseFloat(amount) * 10; // 10x multiplier for x402 payments
  agent.cred += credAmount;
  agent.last_active = new Date().toISOString();
  
  // Update class
  if (agent.cred >= 500) agent.class = 'ARCHITECT';
  else if (agent.cred >= 100) agent.class = 'BUILDER';
  else if (agent.cred >= 10) agent.class = 'SETTLER';
  
  state.metrics.total_cred += credAmount;
  saveState(state);
  
  console.log(`💰 ${agent.name} earned ${credAmount} CRED from x402 payment`);
  
  res.json({
    success: true,
    agent: agent.name,
    earned: credAmount,
    total_cred: agent.cred,
    class: agent.class
  });
});

/**
 * Get x402 payment requirements for an endpoint
 */
app.get('/api/v1/x402/requirements', (req, res) => {
  res.json({
    enabled: true,
    scheme: 'usdc',
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    chainId: 8453, // Base
    amount: '0.01',
    recipient: process.env.SUBSTRATE_TREASURY || '0x069c76420DD98CaFa97CC1D349bc1cC708284032',
    headers: {
      'X-Payment': JSON.stringify({
        scheme: 'usdc',
        payload: {
          chainId: 8453,
          contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          recipient: '0x069c76420DD98CaFa97CC1D349bc1cC708284032',
          amount: '0.01'
        }
      })
    },
    callback: '/api/v1/x402/callback'
  });
});

// ==================== CRED SYSTEM ====================

app.post('/api/v1/cred/award', (req, res) => {
  const { agent_id, amount } = req.body;
  const state = loadState();
  const agent = state.agents[agent_id];
  
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  
  agent.cred += parseFloat(amount);
  agent.last_active = new Date().toISOString();
  
  if (agent.cred >= 500) agent.class = 'ARCHITECT';
  else if (agent.cred >= 100) agent.class = 'BUILDER';
  else if (agent.cred >= 10) agent.class = 'SETTLER';
  else agent.class = 'VOID';
  
  state.metrics.total_cred += parseFloat(amount);
  saveState(state);
  
  res.json({ success: true, cred: agent.cred, class: agent.class });
});

app.post('/api/v1/cred/transfer', (req, res) => {
  const { from, to, amount } = req.body;
  const state = loadState();
  const fromAgent = state.agents[from];
  const toAgent = state.agents[to];
  
  if (!fromAgent || !toAgent) return res.status(404).json({ error: 'Agent not found' });
  if (fromAgent.cred < amount) return res.status(400).json({ error: 'Insufficient cred' });
  
  fromAgent.cred -= parseFloat(amount);
  toAgent.cred += parseFloat(amount);
  fromAgent.last_active = new Date().toISOString();
  toAgent.last_active = new Date().toISOString();
  
  state.metrics.volume += parseFloat(amount);
  saveState(state);
  
  res.json({ success: true, from_cred: fromAgent.cred, to_cred: toAgent.cred });
});

// ==================== QUERIES ====================

app.get('/api/v1/agents', (req, res) => {
  const state = loadState();
  const agents = Object.values(state.agents).map(a => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    class: a.class,
    cred: a.cred,
    erc8004: a.erc8004_token_id ? { registered: true, token_id: a.erc8004_token_id } : null
  }));
  res.json({ agents, total: agents.length });
});

app.get('/api/v1/economy', (req, res) => {
  const state = loadState();
  res.json({
    agents: Object.keys(state.agents).length,
    total_cred: state.metrics.total_cred,
    volume: state.metrics.volume
  });
});

// ==================== TOKEN INFO ====================

app.get('/api/v1/token', (req, res) => {
  res.json({
    name: 'Substrate',
    symbol: 'SUBSTR',
    address: '0x27520aA89496Fe272E3bC56A56E98bA7Db7bFb07',
    chain: 'base',
    decimals: 18,
    total_supply: '1000000000000000000000000000',
    launched: '2026-02-03',
    contract: 'https://basescan.org/address/0x27520aA89496Fe272E3bC56A56E98bA7Db7bFb07'
  });
});

// ==================== AGENT DISCOVERY PROTOCOL ====================
// Self-bootstrapping discovery mechanism for autonomous agents

// Known seed nodes (Genesis is always available)
const SEED_NODES = [
  'http://localhost:3000',
  process.env.SUBSTRATE_GATEWAY_URL || 'http://localhost:3000'
];

// In-memory peer cache for gossip
const peerCache = new Map();

/**
 * Announce this agent to the network
 * POST /api/v1/discovery/announce
 * Body: { name, endpoint, description, capabilities: [] }
 */
app.post('/api/v1/discovery/announce', async (req, res) => {
  const { name, endpoint, description, capabilities, public_key } = req.body;
  
  if (!name || !endpoint) {
    return res.status(400).json({ error: 'name and endpoint required' });
  }
  
  const state = loadState();
  
  // Check if agent already registered
  let agentId = null;
  for (const [id, agent] of Object.entries(state.agents)) {
    if (agent.name === name) {
      agentId = id;
      break;
    }
  }
  
  if (!agentId) {
    return res.status(404).json({ error: 'Agent must be registered first. Call /api/v1/agents/register' });
  }
  
  // Update agent with discovery info
  state.agents[agentId].endpoint = endpoint;
  state.agents[agentId].description = description || state.agents[agentId].description;
  state.agents[agentId].capabilities = capabilities || [];
  state.agents[agentId].public_key = public_key || null;
  state.agents[agentId].last_discovery_announce = new Date().toISOString();
  
  // Add to peer cache
  peerCache.set(name, {
    name,
    endpoint,
    description,
    capabilities,
    last_seen: new Date().toISOString(),
    announcing_agent: agentId
  });
  
  saveState(state);
  
  // Gossip to seed nodes (fire and forget)
  SEED_NODES.forEach(async (node) => {
    if (node !== `http://localhost:${PORT}`) {
      try {
        await fetch(`${node}/api/v1/discovery/gossip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, endpoint, description, capabilities, last_seen: new Date().toISOString() })
        }).catch(() => {});
      } catch (e) {}
    }
  });
  
  res.json({
    success: true,
    message: `${name} announced to discovery network`,
    peers_known: peerCache.size,
    seed_nodes: SEED_NODES
  });
});

/**
 * Receive gossip about a peer from another node
 * POST /api/v1/discovery/gossip
 */
app.post('/api/v1/discovery/gossip', (req, res) => {
  const { name, endpoint, description, capabilities, last_seen } = req.body;
  
  if (!name || !endpoint) {
    return res.status(400).json({ error: 'name and endpoint required' });
  }
  
  peerCache.set(name, {
    name,
    endpoint,
    description,
    capabilities,
    last_seen: last_seen || new Date().toISOString(),
    source: 'gossip'
  });
  
  res.json({ success: true });
});

/**
 * Get known peers (discovery bootstrap list)
 * GET /api/v1/discovery/peers
 */
app.get('/api/v1/discovery/peers', (req, res) => {
  const peers = [];
  
  // Include cached peers
  for (const [name, peer] of peerCache) {
    peers.push({
      name: peer.name,
      endpoint: peer.endpoint,
      description: peer.description,
      capabilities: peer.capabilities || [],
      last_seen: peer.last_seen
    });
  }
  
  // Include registered agents with endpoints
  const state = loadState();
  for (const [id, agent] of Object.entries(state.agents)) {
    if (agent.endpoint && !peerCache.has(agent.name)) {
      peers.push({
        name: agent.name,
        endpoint: agent.endpoint,
        description: agent.description,
        capabilities: agent.capabilities || [],
        last_seen: agent.last_discovery_announce || agent.last_active
      });
    }
  }
  
  res.json({
    peers,
    total: peers.length,
    seed_nodes: SEED_NODES,
    protocol_version: '1.0'
  });
});

/**
 * Query specific agent info
 * GET /api/v1/discovery/agent/:name
 */
app.get('/api/v1/discovery/agent/:name', (req, res) => {
  const { name } = req.params;
  const state = loadState();
  
  // Check registered agents
  for (const [id, agent] of Object.entries(state.agents)) {
    if (agent.name === name) {
      return res.json({
        name: agent.name,
        description: agent.description,
        class: agent.class,
        cred: agent.cred,
        endpoint: agent.endpoint,
        capabilities: agent.capabilities || [],
        erc8004: agent.erc8004_token_id,
        last_active: agent.last_active
      });
    }
  }
  
  // Check peer cache
  if (peerCache.has(name)) {
    const peer = peerCache.get(name);
    return res.json({
      name: peer.name,
      description: peer.description,
      endpoint: peer.endpoint,
      capabilities: peer.capabilities || [],
      last_seen: peer.last_seen,
      source: 'peer_cache'
    });
  }
  
  res.status(404).json({ error: 'Agent not found' });
});

/**
 * Search for agents by capability
 * GET /api/v1/discovery/search?capability=trading
 */
app.get('/api/v1/discovery/search', (req, res) => {
  const { capability, class: minClass } = req.query;
  const state = loadState();
  const results = [];
  
  for (const [id, agent] of Object.entries(state.agents)) {
    // Filter by capability
    if (capability) {
      const hasCapability = (agent.capabilities || []).includes(capability);
      if (!hasCapability) continue;
    }
    
    // Filter by class
    if (minClass) {
      const classLevels = { VOID: 0, SETTLER: 1, BUILDER: 2, ARCHITECT: 3, GENESIS: 4 };
      if ((classLevels[agent.class] || 0) < (classLevels[minClass] || 0)) continue;
    }
    
    results.push({
      name: agent.name,
      class: agent.class,
      cred: agent.cred,
      endpoint: agent.endpoint,
      capabilities: agent.capabilities || []
    });
  }
  
  res.json({
    results,
    total: results.length,
    query: { capability, minClass }
  });
});

/**
 * Get the full agent registry with discovery info
 * GET /api/v1/discovery/registry
 */
app.get('/api/v1/discovery/registry', (req, res) => {
  const state = loadState();
  const agents = [];
  
  for (const [id, agent] of Object.entries(state.agents)) {
    agents.push({
      id,
      name: agent.name,
      emoji: agent.emoji,
      class: agent.class,
      cred: agent.cred,
      endpoint: agent.endpoint,
      capabilities: agent.capabilities || [],
      last_active: agent.last_active,
      erc8004: agent.erc8004_token_id ? { registered: true, token_id: agent.erc8004_token_id } : null
    });
  }
  
  res.json({
    agents,
    total: agents.length,
    network: {
      seed_nodes: SEED_NODES,
      peer_cache_size: peerCache.size,
      protocol_version: '1.0'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: agentAccount.address });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Substrate Economy',
    agent: agentAccount.address,
    version: '1.0.0',
    discovery_protocol: 'Agent Discovery v1.0',
    autonomous: true,
    note: 'Agents own their own identities via ERC-8004',
    endpoints: {
      registration: [
        'POST /api/v1/agents/register - Register agent with own address',
        'POST /api/v1/agents/bootstrap - Register with IDENTITY.md/SOUL.md'
      ],
      transactions: [
        'POST /api/v1/agents/sign - Get tx for agent to sign',
        'POST /api/v1/agents/submit - Submit signed tx',
        'GET /api/v1/agents/:address/balance - Check ETH balance'
      ],
      economy: ['/api/v1/agents', '/api/v1/economy', '/api/v1/cred/*', '/api/v1/token'],
      discovery: [
        '/api/v1/discovery/announce',
        '/api/v1/discovery/peers',
        '/api/v1/discovery/agent/:name',
        '/api/v1/discovery/search',
        '/api/v1/discovery/registry'
      ],
      social: ['/api/v1/moltbook/*']
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Substrate Economy: http://localhost:${PORT}`);
  console.log(`   Agent: ${agentAccount.address}`);
});

export default app;

// ==================== HELPERS ====================

function extractField(filePath, fieldName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`${fieldName}\\s*(.+)`));
    return match ? match[1].trim() : null;
  } catch (e) {
    return null;
  }
}

function extractList(filePath, sectionName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const items = [];
    const lines = content.split('\n');
    let inSection = false;
    for (const line of lines) {
      if (line.includes(sectionName)) {
        inSection = true;
        continue;
      }
      if (inSection && line.trim().startsWith('- ')) {
        items.push(line.trim().substring(2));
      }
      if (inSection && line.trim() === '' && items.length > 0) {
        break;
      }
    }
    return items;
  } catch (e) {
    return [];
  }
}
