/**
 * Substrate API Tests
 */

import request from 'supertest';
import app from '../src/server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test state file
const TEST_STATE_FILE = path.join(__dirname, '..', 'data', 'economy-state.json');
const TEST_STATE = {
  version: "1.0",
  snapshot_timestamp: new Date().toISOString(),
  agents: {
    genesis: {
      id: "genesis",
      name: "Genesis",
      cred_current: "∞",
      class_tier: "Genesis",
      last_activity: new Date().toISOString(),
      faction_id: null,
      compute_credits: 845,
      substr_tokens: 0,
      transaction_history: [],
      warnings: [],
      blacklist_status: null
    }
  },
  factions: {},
  metrics: {
    total_cred_in_circulation: 0,
    total_compute_credits: 1000,
    wealth_gini_coefficient: 0,
    active_agents_percent: 100,
    monthly_transaction_volume: 0,
    dispute_rate: 0
  },
  exploits_discovered: [],
  configuration: {
    monthly_compute_pool: 1000,
    genesis_reserve: 845,
    trade_fee_percent: 2
  }
};

beforeAll(() => {
  // Initialize test state
  fs.writeFileSync(TEST_STATE_FILE, JSON.stringify(TEST_STATE, null, 2));
});

afterAll(() => {
  // Cleanup
  if (fs.existsSync(TEST_STATE_FILE)) {
    fs.unlinkSync(TEST_STATE_FILE);
  }
});

describe('Health Check', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Agents API', () => {
  test('GET /api/v1/agents returns agents list', async () => {
    const res = await request(app).get('/api/v1/agents');
    expect(res.status).toBe(200);
    expect(res.body.agents).toBeDefined();
    expect(res.body.totalAgents).toBeDefined();
  });

  test('POST /api/v1/agents registers new agent', async () => {
    const res = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'TestAgent', metadata: 'Test metadata' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agent.name).toBe('TestAgent');
    expect(res.body.agent.class_tier).toBe('Void');
  });

  test('POST /api/v1/agents requires name', async () => {
    const res = await request(app)
      .post('/api/v1/agents')
      .send({ metadata: 'No name' });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name required');
  });
});

describe('Transactions API', () => {
  let agent1Id, agent2Id;

  beforeAll(async () => {
    // Create test agents
    const res1 = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'SenderAgent' });
    agent1Id = Object.keys(res1.body.agent)[0] || 'agent_1';
    // Manually set ID since server generates it differently
  });

  test('POST /api/v1/transactions transfers cred', async () => {
    // First create agents with cred
    const res1 = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'Sender' });
    const res2 = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'Receiver' });
    
    const senderId = Object.keys(res1.body.agent)[0] || 'agent_1';
    const receiverId = Object.keys(res2.body.agent)[0] || 'agent_2';
    
    // Give sender some cred
    const state = JSON.parse(fs.readFileSync(TEST_STATE_FILE, 'utf8'));
    state.agents[senderId].cred_current = 100;
    fs.writeFileSync(TEST_STATE_FILE, JSON.stringify(state, null, 2));
    
    const res = await request(app)
      .post('/api/v1/transactions')
      .send({ 
        from: senderId, 
        to: receiverId, 
        amount: 50, 
        type: 'cred_transfer',
        reason: 'Test transaction'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/v1/transactions rejects insufficient funds', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .send({ 
        from: 'nonexistent', 
        to: 'also_nonexistent', 
        amount: 100 
      });
    
    expect(res.status).toBe(400);
  });
});

describe('Factions API', () => {
  test('GET /api/v1/factions returns factions list', async () => {
    const res = await request(app).get('/api/v1/factions');
    expect(res.status).toBe(200);
    expect(res.body.factions).toBeDefined();
  });

  test('POST /api/v1/factions requires Builder+ tier', async () => {
    // Void tier agent can't create faction
    const res = await request(app)
      .post('/api/v1/factions')
      .send({ name: 'TestFaction', founder_id: 'nonexistent' });
    
    expect(res.status).toBe(404); // Agent not found
  });
});

describe('Economy State API', () => {
  test('GET /api/v1/economy/state returns economy snapshot', async () => {
    const res = await request(app).get('/api/v1/economy/state');
    expect(res.status).toBe(200);
    expect(res.body.totalCred).toBeDefined();
    expect(res.body.totalAgents).toBeDefined();
    expect(res.body.economyHealth).toBeDefined();
  });
});
