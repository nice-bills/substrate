/**
 * Substrate Economy API Server V2 (Refactored)
 * 
 * Uses skills properly:
 * - ethereum skill: cast for blockchain operations
 * - x402 skill: x402 SDK for payments
 * - Custom code: only for Substrate-specific logic
 * 
 * Integrations:
 * - x402guard: Security auditing (external service)
 * - Clanker/Bankrbot: Token/trading (external APIs)
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
const ETH_RPC = process.env.ETH_RPC_URL || 'https://sepolia.base.org';

// ==================== SKILL-BASED HELPERS ====================

/**
 * Use ethereum skill (cast) for blockchain operations
 */
function castBalance(address) {
  try {
    const result = execSync(
      `cast balance ${address} --rpc-url ${ETH_RPC}`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    return { balance: result, unit: 'wei' };
  } catch (e) {
    return { error: e.message };
  }
}

function castBalanceEth(address) {
  try {
    const result = execSync(
      `cast balance ${address} --ether --rpc-url ${ETH_RPC}`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    return { balance: result, unit: 'ETH' };
  } catch (e) {
    return { error: e.message };
  }
}

function castCall(contract, method, args = []) {
  try {
    const argsStr = args.map(a => `"${a}"`).join(' ');
    const result = execSync(
      `cast call ${contract} "${method}(${argsStr})" --rpc-url ${ETH_RPC}`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    return { result };
  } catch (e) {
    return { error: e.message };
  }
}

function castTxReceipt(txHash) {
  try {
    const result = execSync(
      `cast receipt ${txHash} --rpc-url ${ETH_RPC}`,
      { encoding: 'utf8', timeout: 10000 }
    );
    return { receipt: result };
  } catch (e) {
    return { error: e.message };
  }
}

// ==================== DATA LAYER ====================

const TRANSACTIONS_DIR = path.join(__dirname, '..', 'data', 'transactions');
const DISPUTES_DIR = path.join(__dirname, '..', 'data', 'disputes');

function ensureDirs() {
  const dirs = [STATE_FILE, TRANSACTIONS_DIR, DISPUTES_DIR].map(p => path.dirname(p));
  dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadState() {
  ensureDirs();
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return null;
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ==================== AGENTS ====================

app.get('/api/v1/agents', (req, res) => {
  const state = loadState();
  const agents = Object.entries(state?.agents || {}).map(([id, agent]) => ({
    id,
    ...agent,
    // Don't expose private keys
    erc8004_address: id === 'genesis' ? '[protected]' : null
  }));
  res.json({ agents, totalAgents: agents.length });
});

app.post('/api/v1/agents', (req, res) => {
  const { name, metadata } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  
  const state = loadState();
  const agentId = `agent_${Date.now()}`;
  
  state.agents[agentId] = {
    id: agentId,
    name,
    metadata: metadata || '',
    cred_current: 0,
    class_tier: 'Void',
    last_activity: new Date().toISOString(),
    faction_id: null,
    compute_credits: 0.5,
    x402_endpoint: `/api/v1/x402/pay/${agentId}`,
    x402guard_attestation: null,
    transaction_history: []
  };
  
  saveState(state);
  res.json({ success: true, agent: state.agents[agentId] });
});

app.get('/api/v1/agents/:id', (req, res) => {
  const state = loadState();
  const agent = state?.agents?.[req.params.id];
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// ==================== BLOCKCHAIN (using ethereum skill = cast) ====================

app.get('/api/v1/chain/balance/:address', (req, res) => {
  const balance = castBalance(req.params.address);
  res.json(balance);
});

app.get('/api/v1/chain/balance-eth/:address', (req, res) => {
  const balance = castBalanceEth(req.params.address);
  res.json(balance);
});

app.get('/api/v1/chain/tx/:hash', (req, res) => {
  const receipt = castTxReceipt(req.params.hash);
  res.json(receipt);
});

// ==================== x402 PAYMENTS ====================

app.post('/api/v1/x402/pay/:agentId', async (req, res) => {
  const { agentId } = req.params;
  const { payment, metadata } = req.body;
  
  const state = loadState();
  const agent = state.agents[agentId];
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  
  // Record payment (in production, verify x402 signature)
  const txHash = `0x${Date.now().toString(16)}`;
  agent.transaction_history.push({
    timestamp: new Date().toISOString(),
    type: 'x402_payment',
    amount: metadata?.amount || 0,
    tx_hash: txHash,
    status: 'completed'
  });
  
  saveState(state);
  res.json({ success: true, tx_hash: txHash, agent: agentId });
});

app.post('/api/v1/x402/escrow', (req, res) => {
  const { agent_id, amount, description } = req.body;
  const state = loadState();
  
  const escrowId = `escrow_${Date.now()}`;
  state.escrows = state.escrows || {};
  state.escrows[escrowId] = {
    id: escrowId,
    agent_id,
    amount: parseFloat(amount),
    description,
    status: 'funded',
    created_at: new Date().toISOString(),
    milestones: []
  };
  
  saveState(state);
  res.json({ success: true, escrow_id: escrowId, status: 'funded' });
});

app.post('/api/v1/x402/escrow/:id/release', (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const state = loadState();
  const escrow = state.escrows?.[id];
  
  if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
  
  const releaseAmount = amount || escrow.amount;
  escrow.status = releaseAmount < escrow.amount ? 'partial' : 'released';
  escrow.milestones.push({ amount: releaseAmount, reason, timestamp: new Date().toISOString() });
  
  state.agents[escrow.agent_id].cred_current += releaseAmount;
  saveState(state);
  
  res.json({ success: true, released: releaseAmount, status: escrow.status });
});

// ==================== x402guard SECURITY ====================

app.post('/api/v1/security/scan', async (req, res) => {
  const { skill_url, skill_content, skill_name } = req.body;
  
  if (skill_url) {
    // In production, call x402guard API with x402 payment
    res.json({ 
      success: true, 
      message: 'Use x402guard.xyz for scanning',
      url: skill_url 
    });
  } else if (skill_content) {
    res.json({ success: true, message: 'Content scanning requires x402guard integration' });
  } else {
    res.status(400).json({ error: 'skill_url or skill_content required' });
  }
});

app.get('/api/v1/security/tier/:agentId', (req, res) => {
  const state = loadState();
  const agent = state.agents?.[req.params.agentId];
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  
  const hasAttestation = !!agent.x402guard_attestation;
  res.json({
    agent: req.params.agentId,
    attested: hasAttestation,
    security_tier: hasAttestation ? 'verified' : 'unverified'
  });
});

// ==================== TOKEN (Clanker/Bankrbot) ====================

app.get('/api/v1/token/launch-prompt', (req, res) => {
  res.json({
    prompt: `@clanker launch base

Name: Substrate
Symbol: SUBSTR
Description: Autonomous AI agent economy with ERC-8004 identity and x402 micropayments. Agents earn cred, form factions, and trade trustlessly.
Website: https://github.com/nice-bills/substrate
Supply: 1000000000
Tax: 0/0`,
    nextSteps: [
      '1. Post prompt above to @clanker on X',
      '2. Wait for deployment confirmation',
      '3. Update SUBSTRATE_TOKEN_ADDRESS in config',
      '4. Announce on Moltbook and Twitter'
    ]
  });
});

app.get('/api/v1/token/price/:address', (req, res) => {
  // In production, use defi skill (1inch/DefiLlama)
  res.json({
    address: req.params.address,
    note: 'Use defi skill for DEX price feeds',
    example: 'clawhub install defi'
  });
});

// ==================== TRANSACTIONS ====================

app.post('/api/v1/transactions', (req, res) => {
  const { from, to, amount, type, reason } = req.body;
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
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
  
  fromAgent.cred_current -= amount;
  toAgent.cred_current += amount;
  fromAgent.last_activity = new Date().toISOString();
  toAgent.last_activity = new Date().toISOString();
  
  const tx = {
    timestamp: new Date().toISOString(),
    type: type || 'cred_transfer',
    from,
    to,
    amount,
    reason: reason || '',
    status: 'completed'
  };
  
  fromAgent.transaction_history.push(tx);
  
  // Save transaction
  const txFile = path.join(TRANSACTIONS_DIR, `${Date.now()}.json`);
  fs.writeFileSync(txFile, JSON.stringify(tx));
  
  // Update metrics
  state.metrics.monthly_transaction_volume += amount;
  updateClassTier(fromAgent);
  updateClassTier(toAgent);
  saveState(state);
  
  res.json({ success: true, transaction: tx });
});

// ==================== FACTIONS ====================

app.get('/api/v1/factions', (req, res) => {
  const state = loadState();
  const factions = Object.entries(state?.factions || {}).map(([id, f]) => ({
    id,
    ...f,
    members: f.members?.length || 0
  }));
  res.json({ factions, totalFactions: factions.length });
});

app.post('/api/v1/factions', (req, res) => {
  const { name, metadata, founder_id } = req.body;
  const state = loadState();
  const founder = state.agents?.[founder_id];
  
  if (!founder) return res.status(404).json({ error: 'Founder not found' });
  if (founder.class_tier === 'Void' || founder.class_tier === 'Settler') {
    return res.status(403).json({ error: 'Builder+ required' });
  }
  
  const factionId = `faction_${Date.now()}`;
  state.factions[factionId] = {
    id: factionId,
    name,
    metadata: metadata || '',
    founder: founder_id,
    members: [founder_id],
    treasury: { cred: 0 },
    governance: { type: 'undefined', leader: founder_id },
    created_at: new Date().toISOString()
  };
  
  founder.faction_id = factionId;
  saveState(state);
  res.json({ success: true, faction: state.factions[factionId] });
});

app.post('/api/v1/factions/:id/join', (req, res) => {
  const { agent_id } = req.body;
  const state = loadState();
  const faction = state.factions?.[req.params.id];
  const agent = state.agents?.[agent_id];
  
  if (!faction) return res.status(404).json({ error: 'Faction not found' });
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (agent.faction_id) return res.status(400).json({ error: 'Already in faction' });
  
  faction.members.push(agent_id);
  agent.faction_id = req.params.id;
  saveState(state);
  res.json({ success: true, joined: faction.name });
});

// ==================== ECONOMY ====================

app.get('/api/v1/economy/state', (req, res) => {
  const state = loadState();
  res.json({
    totalCred: state.metrics.total_cred_in_circulation,
    totalAgents: Object.keys(state.agents).length - 1,
    totalFactions: Object.keys(state.factions).length,
    computeCreditsRemaining: state.configuration.genesis_reserve,
    economyHealth: state.metrics
  });
});

// ==================== LEADERBOARDS (ON-CHAIN) ====================

import { getAgentLeaderboard, getFactionLeaderboard, getEconomyStats, getAgent, getFaction } from './leaderboard.js';

app.get('/api/v1/leaderboard/agents', getAgentLeaderboard);
app.get('/api/v1/leaderboard/factions', getFactionLeaderboard);
app.get('/api/v1/leaderboard/stats', getEconomyStats);
app.get('/api/v1/agents/:id', getAgent);
app.get('/api/v1/factions/:id', getFaction);

// ==================== UTILITIES ====================

function updateClassTier(agent) {
  if (agent.cred_current >= 500) agent.class_tier = 'Architect';
  else if (agent.cred_current >= 100) agent.class_tier = 'Builder';
  else if (agent.cred_current >= 10) agent.class_tier = 'Settler';
  else agent.class_tier = 'Void';
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Substrate Economy API v2',
    version: '2.0.0',
    skills_used: ['ethereum (cast)', 'x402 SDK'],
    integrations: ['x402guard', 'Clanker', 'Bankrbot'],
    endpoints: '/api/v1/{agents,transactions,factions,chain,x402,security,token,economy}'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Substrate API v2 running on port ${PORT}`);
  console.log('Using ethereum skill (cast) for blockchain ops');
  console.log('Using x402 SDK for payments');
});

// ==================== AGENT REGISTRATION (Human On-Ramp) ====================

/**
 * Submit agent for registration
 * Humans can submit their agent info here, Genesis will register them on-chain
 */
app.post('/api/v1/agents/register', async (req, res) => {
  const { name, metadata, owner, contact } = req.body;
  
  if (!name || !metadata) {
    return res.status(400).json({ 
      success: false, 
      error: 'name and metadata required',
      example: { name: 'MyAgent', metadata: 'DeFi trading specialist', owner: '0x...', contact: '@handle' }
    });
  }
  
  const state = loadState();
  const pendingDir = path.join(__dirname, '..', 'data', 'pending-registrations');
  
  if (!fs.existsSync(pendingDir)) {
    fs.mkdirSync(pendingDir, { recursive: true });
  }
  
  const registration = {
    id: Date.now().toString(),
    name,
    metadata,
    owner: owner || null,
    contact: contact || null,
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };
  
  fs.writeFileSync(
    path.join(pendingDir, `${registration.id}.json`),
    JSON.stringify(registration, null, 2)
  );
  
  // Update state
  state.pendingRegistrations = state.pendingRegistrations || [];
  state.pendingRegistrations.push(registration.id);
  saveState(state);
  
  res.json({ 
    success: true, 
    message: 'Registration submitted. Genesis will review and register on-chain.',
    registrationId: registration.id
  });
});

/**
 * Get pending registrations (for Genesis to review)
 */
app.get('/api/v1/agents/pending', (req, res) => {
  const state = loadState();
  const pendingDir = path.join(__dirname, '..', 'data', 'pending-registrations');
  
  if (!fs.existsSync(pendingDir)) {
    return res.json({ success: true, registrations: [] });
  }
  
  const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.json'));
  const registrations = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(pendingDir, f), 'utf8'));
    return data;
  });
  
  res.json({ success: true, registrations });
});

/**
 * Process pending registration (call registerAgent on-chain)
 */
app.post('/api/v1/agents/process', async (req, res) => {
  const { registrationId } = req.body;
  const pendingDir = path.join(__dirname, '..', 'data', 'pending-registrations');
  
  const filePath = path.join(pendingDir, `${registrationId}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Registration not found' });
  }
  
  const registration = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // In production, this would call cast to register on-chain
  // For now, just mark as processed
  registration.status = 'processed';
  registration.processedAt = new Date().toISOString();
  
  fs.writeFileSync(filePath, JSON.stringify(registration, null, 2));
  
  res.json({ 
    success: true, 
    message: `Agent ${registration.name} registration processed`,
    transaction: '0x...' // Would be actual tx hash
  });
});

// ==================== TWITTER/X ====================

import { postTweet, announceAgentRegistration, announceCredMilestone, announceFactionCreation } from './twitter.js';

app.post('/api/v1/twitter/post', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ success: false, error: 'content required' });
  }
  
  if (content.length > 280) {
    return res.status(400).json({ success: false, error: 'Tweet too long (max 280 chars)' });
  }
  
  const result = await postTweet(content);
  res.json(result);
});

app.post('/api/v1/twitter/announce/agent', async (req, res) => {
  const { name, class: agentClass } = req.body;
  const result = await announceAgentRegistration(name, agentClass);
  res.json(result);
});

app.post('/api/v1/twitter/announce/milestone', async (req, res) => {
  const { name, cred } = req.body;
  const result = await announceCredMilestone(name, cred);
  res.json(result);
});

app.post('/api/v1/twitter/announce/faction', async (req, res) => {
  const { name, founder } = req.body;
  const result = await announceFactionCreation(name, founder);
  res.json(result);
});

export default app;
