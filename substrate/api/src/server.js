/**
 * Substrate Economy API with ERC-8004 Integration
 * 
 * Features:
 * - Agent registration with ERC-8004 compatibility
 * - Substrate cred system
 * - x402 micropayments
 * - Faction management
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// Configuration
const STATE_FILE = path.join(__dirname, '..', 'data', 'economy-state.json');
const BASE_RPC = process.env.BASE_RPC || 'https://sepolia.base.org';

// ERC-8004 Contract Addresses (Base)
const ERC8004_IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const ERC8004_REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';

const TRANSACTIONS_DIR = path.join(__dirname, '..', 'data', 'transactions');

function ensureDirs() {
  const dirs = [STATE_FILE, TRANSACTIONS_DIR].map(p => path.dirname(p));
  dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadState() {
  ensureDirs();
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return {
    agents: {},
    factions: {},
    escrows: {},
    pendingRegistrations: [],
    metrics: {
      total_cred_in_circulation: 0,
      monthly_transaction_volume: 0
    },
    configuration: {
      genesis_reserve: 1000
    }
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ==================== AGENT REGISTRATION ====================

/**
 * Register a new agent with ERC-8004 compatibility
 */
app.post('/api/v1/agents/register', async (req, res) => {
  const { name, metadata, owner, contact, erc8004_uri } = req.body;
  
  if (!name || !owner) {
    return res.status(400).json({ error: 'name and owner (wallet) required' });
  }
  
  const state = loadState();
  const agentId = `agent_${Date.now()}`;
  
  state.agents[agentId] = {
    id: agentId,
    name,
    metadata: metadata || '',
    owner,
    contact: contact || null,
    erc8004_uri: erc8004_uri || null,
    erc8004_token_id: null,
    cred_current: 0,
    class_tier: 'VOID',
    last_activity: new Date().toISOString(),
    faction_id: null,
    compute_credits: 0.5,
    transaction_history: [],
    created_at: new Date().toISOString()
  };
  
  saveState(state);
  res.json({ 
    success: true, 
    agent: state.agents[agentId],
    message: 'Agent registered. Submit to ERC-8004 registry for discoverability.'
  });
});

/**
 * Register agent on ERC-8004 (on-chain)
 */
app.post('/api/v1/agents/erc8004/register', async (req, res) => {
  const { agent_id, ipfs_uri } = req.body;
  
  if (!agent_id || !ipfs_uri) {
    return res.status(400).json({ error: 'agent_id and ipfs_uri required' });
  }
  
  const state = loadState();
  const agent = state.agents[agent_id];
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // Update agent with ERC-8004 URI
  agent.erc8004_uri = ipfs_uri;
  agent.last_activity = new Date().toISOString();
  
  // Note: Actual on-chain registration requires private key
  // This is a placeholder for the registration flow
  agent.erc8004_token_id = `eip155:8453:${agent_id}`;
  
  saveState(state);
  
  res.json({
    success: true,
    message: 'ERC-8004 registration prepared',
    registry: ERC8004_IDENTITY_REGISTRY,
    uri: ipfs_uri,
    token_id: agent.erc8004_token_id,
    next_steps: [
      '1. Call register(uri) on Identity Registry',
      '2. Save token_id for reputation tracking',
      '3. Agent now discoverable via 8004'
    ]
  });
});

/**
 * Get agent info including ERC-8004 data
 */
app.get('/api/v1/agents/:id', (req, res) => {
  const state = loadState();
  const agent = state.agents?.[req.params.id];
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json(agent);
});

/**
 * List all agents
 */
app.get('/api/v1/agents', (req, res) => {
  const state = loadState();
  const agents = Object.entries(state?.agents || {}).map(([id, agent]) => ({
    id,
    name: agent.name,
    class: agent.class_tier,
    cred: agent.cred_current,
    erc8004: agent.erc8004_uri ? { registered: true, token_id: agent.erc8004_token_id } : { registered: false }
  }));
  res.json({ agents, total: agents.length });
});

// ==================== CRED SYSTEM ====================

app.post('/api/v1/cred/award', (req, res) => {
  const { agent_id, amount, reason } = req.body;
  
  if (!agent_id || !amount) {
    return res.status(400).json({ error: 'agent_id and amount required' });
  }
  
  const state = loadState();
  const agent = state.agents[agent_id];
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  agent.cred_current += parseFloat(amount);
  updateClassTier(agent);
  agent.last_activity = new Date().toISOString();
  
  state.metrics.total_cred_in_circulation += parseFloat(amount);
  saveState(state);
  
  res.json({ 
    success: true, 
    new_cred: agent.cred_current,
    class: agent.class_tier 
  });
});

app.post('/api/v1/cred/transfer', (req, res) => {
  const { from, to, amount, reason } = req.body;
  
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'from, to, and amount required' });
  }
  
  const state = loadState();
  const fromAgent = state.agents[from];
  const toAgent = state.agents[to];
  
  if (!fromAgent || !toAgent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  if (fromAgent.cred_current < amount) {
    return res.status(400).json({ error: 'Insufficient cred' });
  }
  
  fromAgent.cred_current -= parseFloat(amount);
  toAgent.cred_current += parseFloat(amount);
  fromAgent.last_activity = new Date().toISOString();
  toAgent.last_activity = new Date().toISOString();
  
  updateClassTier(fromAgent);
  updateClassTier(toAgent);
  
  state.metrics.monthly_transaction_volume += parseFloat(amount);
  saveState(state);
  
  res.json({ 
    success: true, 
    from: fromAgent.cred_current,
    to: toAgent.cred_current 
  });
});

// ==================== FACTIONS ====================

app.post('/api/v1/factions', (req, res) => {
  const { name, metadata, founder_id } = req.body;
  const state = loadState();
  const founder = state.agents?.[founder_id];
  
  if (!founder) return res.status(404).json({ error: 'Founder not found' });
  if (founder.class_tier === 'VOID' || founder.class_tier === 'SETTLER') {
    return res.status(403).json({ error: 'Builder+ required to create faction' });
  }
  
  const factionId = `faction_${Date.now()}`;
  state.factions[factionId] = {
    id: factionId,
    name,
    metadata: metadata || '',
    founder: founder_id,
    members: [founder_id],
    treasury: { cred: 0 },
    created_at: new Date().toISOString()
  };
  
  founder.faction_id = factionId;
  saveState(state);
  
  res.json({ success: true, faction: state.factions[factionId] });
});

app.get('/api/v1/factions', (req, res) => {
  const state = loadState();
  const factions = Object.entries(state?.factions || {}).map(([id, f]) => ({
    id,
    name: f.name,
    members: f.members?.length || 0,
    treasury: f.treasury
  }));
  res.json({ factions });
});

// ==================== ECONOMY STATE ====================

app.get('/api/v1/economy/state', (req, res) => {
  const state = loadState();
  res.json({
    totalAgents: Object.keys(state.agents).length,
    totalFactions: Object.keys(state.factions).length,
    totalCred: state.metrics.total_cred_in_circulation,
    transactionVolume: state.metrics.monthly_transaction_volume
  });
});

// ==================== HELPER FUNCTIONS ====================

function updateClassTier(agent) {
  if (agent.cred_current >= 500) agent.class_tier = 'ARCHITECT';
  else if (agent.cred_current >= 100) agent.class_tier = 'BUILDER';
  else if (agent.cred_current >= 10) agent.class_tier = 'SETTLER';
  else agent.class_tier = 'VOID';
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', erc8004_registry: ERC8004_IDENTITY_REGISTRY });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Substrate Economy API',
    version: '1.0.0',
    erc8004: {
      identity_registry: ERC8004_IDENTITY_REGISTRY,
      reputation_registry: ERC8004_REPUTATION_REGISTRY,
      chain: 'Base'
    },
    endpoints: '/api/v1/{agents,factions,cred,economy}'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Substrate API running on port ${PORT}`);
  console.log(`ERC-8004 Registry: ${ERC8004_IDENTITY_REGISTRY}`);
});

export default app;
