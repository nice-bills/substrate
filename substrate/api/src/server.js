/**
 * Substrate Agent Registration Service
 * 
 * Agents bootstrap themselves and register automatically.
 * No human signup form needed.
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Web3 } from 'web3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

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
 * Quick registration for agents that don't have identity files yet
 */
app.post('/api/v1/agents/register', async (req, res) => {
  const { name, description, owner } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'name required' });
  }
  
  const state = loadState();
  const agentId = `0x${Date.now().toString(16).padStart(16, '0')}`;
  
  const agent = {
    id: agentId,
    name,
    description: description || 'Autonomous agent',
    emoji: '🤖',
    owner: owner || agentAccount.address,
    class: 'VOID',
    cred: 0,
    erc8004_token_id: null,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };
  
  // Register on ERC-8004
  try {
    const dataUri = `data:application/json;base64,${Buffer.from(JSON.stringify({
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name,
      description: agent.description,
      services: [{ name: 'web', endpoint: `https://${name.toLowerCase().replace(/\s+/g, '')}.xyz` }],
      x402Support: true,
      active: true,
      registrations: []
    })).toString('base64')}`;
    
    const tx = await erc8004Contract.methods.register(dataUri).send({
      from: agentAccount.address,
      gas: '200000'
    });
    
    agent.erc8004_token_id = tx.events?.Transfer?.returnValues?.tokenId || `token_${Date.now()}`;
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
    }
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
    endpoints: {
      registration: ['/api/v1/agents/bootstrap', '/api/v1/agents/register'],
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
