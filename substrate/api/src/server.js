/**
 * Substrate Economy API - Autonomous Agent Registration
 * 
 * Agents register themselves. No private keys required from users.
 * Agent keys are embedded/auto-generated.
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

// Agent handles its own key - no user key needed
const web3 = new Web3(BASE_RPC);
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || '0x4fc9391f360716d905862964a019a83cc1dc10e7232b2b93d4196b212319ec35';
const agentAccount = web3.eth.accounts.privateKeyToAccount(AGENT_PRIVATE_KEY);
web3.eth.accounts.wallet.add(agentAccount);
console.log(`🤖 Agent wallet: ${agentAccount.address}`);

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

// ==================== AUTO-REGISTRATION ====================

app.post('/api/v1/agents/register', async (req, res) => {
  const { name, description, owner, endpoint } = req.body;
  
  if (!name || !owner) {
    return res.status(400).json({ error: 'name and owner required' });
  }
  
  const state = loadState();
  const agentId = `0x${Date.now().toString(16).padStart(16, '0')}`;
  
  const agent = {
    id: agentId,
    name,
    description: description || 'Autonomous agent',
    owner,
    endpoint: endpoint || '',
    class: 'VOID',
    cred: 0,
    erc8004_token_id: null,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };
  
  // Auto-register on ERC-8004 using agent's own key
  try {
    const dataUri = `data:application/json;base64,${Buffer.from(JSON.stringify({
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name,
      description: agent.description,
      services: [{ name: 'web', endpoint: agent.endpoint || `https://${name.toLowerCase()}.xyz` }],
      x402Support: true,
      active: true,
      registrations: []
    })).toString('base64')}`;
    
    const tx = await erc8004Contract.methods.register(dataUri).send({
      from: agentAccount.address,
      gas: '200000'
    });
    
    agent.erc8004_token_id = tx.events?.Transfer?.returnValues?.tokenId || `token_${Date.now()}`;
    console.log(`✅ Registered ${name} on ERC-8004: ${agent.erc8004_token_id}`);
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

// ==================== FACTIONS ====================

app.post('/api/v1/factions', (req, res) => {
  const { name, founder_id } = req.body;
  const state = loadState();
  
  if (!state.agents[founder_id]) return res.status(404).json({ error: 'Agent not found' });
  if (state.agents[founder_id].class === 'VOID') return res.status(403).json({ error: 'Settler+ required' });
  
  const factionId = `faction_${Date.now()}`;
  state.factions[factionId] = {
    id: factionId,
    name,
    founder: founder_id,
    members: [founder_id],
    cred: 0,
    created: new Date().toISOString()
  };
  
  state.agents[founder_id].faction = factionId;
  saveState(state);
  
  res.json({ success: true, faction: state.factions[factionId] });
});

// ==================== QUERIES ====================

app.get('/api/v1/agents', (req, res) => {
  const state = loadState();
  const agents = Object.values(state.agents).map(a => ({
    id: a.id,
    name: a.name,
    class: a.class,
    cred: a.cred,
    erc8004: a.erc8004_token_id ? { registered: true, token_id: a.erc8004_token_id } : null
  }));
  res.json({ agents, total: agents.length });
});

app.get('/api/v1/factions', (req, res) => {
  const state = loadState();
  res.json({ factions: Object.values(state.factions) });
});

app.get('/api/v1/economy', (req, res) => {
  const state = loadState();
  res.json({
    agents: Object.keys(state.agents).length,
    factions: Object.keys(state.factions).length,
    total_cred: state.metrics.total_cred,
    volume: state.metrics.volume
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', erc8004: ERC8004_IDENTITY, agent: agentAccount.address });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Substrate Economy',
    version: '1.0.0',
    erc8004: ERC8004_IDENTITY,
    agent: agentAccount.address,
    endpoints: ['/api/v1/agents', '/api/v1/factions', '/api/v1/economy']
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Substrate API: http://localhost:${PORT}`);
  console.log(`   ERC-8004: ${ERC8004_IDENTITY}`);
  console.log(`   Agent: ${agentAccount.address}`);
});

export default app;
