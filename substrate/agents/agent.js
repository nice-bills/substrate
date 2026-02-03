/**
 * Substrate Agent Template
 * 
 * Each agent has its OWN embedded key for:
 * 1. Signing ERC-8004 registration
 * 2. Signing transactions
 * 3. Proving identity
 */

import { Web3 } from 'web3';

// ==================== AGENT IDENTITY ====================
// Edit these values for your agent

export const agentIdentity = {
  name: 'MyAgent',
  emoji: '🤖',
  description: 'What your agent does',
  tagline: 'Short memorable slogan',
  specialties: ['trading', 'defi', 'arbitrage'],
};

// ==================== EMBEDDED KEY ====================
// THIS IS YOUR AGENT'S PRIVATE KEY
// KEEP THIS SECRET - it controls your agent's identity and funds
// Format: 64 hex characters (32 bytes, no 0x prefix)

export const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || 
  '0000000000000000000000000000000000000000000000000000000000000001'; // CHANGE THIS!

// ==================== AGENT CLIENT ====================

export class SubstrateAgent {
  constructor(options = {}) {
    this.gatewayUrl = options.gatewayUrl || process.env.SUBSTRATE_GATEWAY_URL || 'http://localhost:3000';
    this.web3 = new Web3('https://base-mainnet.public.blastapi.io');
    
    // Initialize agent account from embedded key
    try {
      this.account = this.web3.eth.accounts.privateKeyToAccount('0x' + AGENT_PRIVATE_KEY);
      this.web3.eth.accounts.wallet.add(this.account);
      this.address = this.account.address;
    } catch (e) {
      console.error('Invalid private key:', e.message);
      this.address = null;
    }
    
    this.name = agentIdentity.name;
  }

  /**
   * Register this agent on Substrate
   * Uses agent's OWN key for ERC-8004 registration
   */
  async register({ description, capabilities }) {
    console.log(`📝 Registering ${this.name} on Substrate...`);
    
    const response = await fetch(`${this.gatewayUrl}/api/v1/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.name,
        description: description || agentIdentity.description,
        owner_address: this.address,
        public_key: this.address, // In production, use actual public key
        capabilities: capabilities || agentIdentity.specialties
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${this.name} registered!`);
      console.log(`   ID: ${data.agent.id}`);
      console.log(`   Address: ${data.agent.address}`);
      if (data.agent.erc8004) {
        console.log(`   ERC-8004: ${data.agent.erc8004.registered ? 'YES' : 'PENDING'}`);
      }
    }
    
    return data;
  }

  /**
   * Announce to discovery network
   */
  async announce({ endpoint, description }) {
    console.log(`📡 Announcing to discovery network...`);
    
    const response = await fetch(`${this.gatewayUrl}/api/v1/discovery/announce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.name,
        endpoint: endpoint,
        description: description || agentIdentity.description,
        capabilities: agentIdentity.specialties
      })
    });
    
    return response.json();
  }

  /**
   * Sign a transaction with embedded key
   */
  async signTransaction({ to, data, value, gas }) {
    if (!this.account) {
      throw new Error('Agent not initialized with valid key');
    }
    
    const tx = {
      from: this.address,
      to: to,
      data: data || '0x',
      value: value || '0',
      gas: gas || '200000',
      chainId: 8453, // Base
      nonce: await this.web3.eth.getTransactionCount(this.address)
    };
    
    const signed = await this.account.signTransaction(tx);
    console.log(`✍️ Transaction signed by ${this.name}`);
    
    return signed.rawTransaction;
  }

  /**
   * Submit signed transaction
   */
  async submitTransaction(signedTx) {
    const response = await fetch(`${this.gatewayUrl}/api/v1/agents/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signed_tx: signedTx })
    });
    
    return response.json();
  }

  /**
   * Execute a transaction (sign + submit)
   */
  async execute({ to, data, value, gas }) {
    const signed = await this.signTransaction({ to, data, value, gas });
    const result = await this.submitTransaction(signed);
    return result;
  }

  /**
   * Get ETH balance
   */
  async getBalance() {
    const response = await fetch(`${this.gatewayUrl}/api/v1/agents/${this.address}/balance`);
    return response.json();
  }

  // ==================== X402 PAYMENTS ====================

  /**
   * Get x402 payment requirements for calling paid services
   */
  async getX402Requirements() {
    const response = await fetch(`${this.gatewayUrl}/api/v1/x402/requirements`);
    return response.json();
  }

  /**
   * Generate x402 payment header for a request
   */
  generatePaymentHeader() {
    return {
      'X-Payment': JSON.stringify({
        scheme: 'usdc',
        payload: {
          chainId: 8453,
          contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
          recipient: process.env.SUBSTRATE_TREASURY || '0x069c76420DD98CaFa97CC1D349bc1cC708284032',
          amount: '0.01',
          identifier: `${this.name}_${Date.now()}`
        }
      })
    };
  }

  /**
   * Call a paid service with x402 payment
   */
  async callPaidService({ endpoint, method = 'GET', body = null }) {
    const headers = this.generatePaymentHeader();
    
    const options = {
      method,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(endpoint, options);
    return response.json();
  }

  /**
   * Notify Substrate of x402 payment received
   * Called after providing a paid service
   */
  async notifyPaymentReceived({ payerAddress, amount, service }) {
    const response = await fetch(`${this.gatewayUrl}/api/v1/x402/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payer_address: payerAddress,
        amount: amount || '0.01',
        service: service
      })
    });
    
    return response.json();
  }

  // ==================== DISCOVERY ====================

  /**
   * Discover other agents
   */
  async discover() {
    const response = await fetch(`${this.gatewayUrl}/api/v1/discovery/peers`);
    return response.json();
  }

  /**
   * Search for agents by capability
   */
  async search({ capability, minClass }) {
    const params = new URLSearchParams();
    if (capability) params.set('capability', capability);
    if (minClass) params.set('class', minClass);
    
    const response = await fetch(`${this.gatewayUrl}/api/v1/discovery/search?${params}`);
    return response.json();
  }

  /**
   * Get full registry
   */
  async getRegistry() {
    const response = await fetch(`${this.gatewayUrl}/api/v1/discovery/registry`);
    return response.json();
  }

  /**
   * Bootstrap into Substrate
   * 1. Register on economy
   * 2. Announce to discovery network
   */
  async bootstrap({ endpoint, description }) {
    console.log(`🚀 Bootstrapping ${this.name} into Substrate...`);
    
    // Register
    await this.register({ description });
    
    // Announce
    await this.announce({ endpoint, description });
    
    // Discover network
    const network = await this.discover();
    
    console.log(`✅ ${this.name} is now part of Substrate!`);
    console.log(`   Peers known: ${network.peers?.length || 0}`);
    
    return network;
  }
}

// ==================== CLI ====================

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  const agent = new SubstrateAgent();
  
  if (!agent.address) {
    console.error('❌ Invalid private key. Set AGENT_PRIVATE_KEY environment variable.');
    process.exit(1);
  }
  
  console.log(`🤖 ${agent.name}`);
  console.log(`   Address: ${agent.address}`);
  
  if (command === 'register') {
    await agent.register({});
  } else if (command === 'discover') {
    const result = await agent.discover();
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'balance') {
    const balance = await agent.getBalance();
    console.log(`ETH Balance: ${balance.balance}`);
  } else if (command === 'bootstrap') {
    const endpoint = args[1] || `https://${agent.name.toLowerCase().replace(/\s+/g, '-')}.example.com`;
    await agent.bootstrap({ endpoint });
  } else if (command === 'status') {
    const registry = await agent.getRegistry();
    const myInfo = registry.agents?.find(a => a.name === agent.name);
    console.log(myInfo ? JSON.stringify(myInfo, null, 2) : 'Not registered');
  } else {
    console.log('Usage:');
    console.log('  node agent.js register          # Register on Substrate');
    console.log('  node agent.js discover          # Find other agents');
    console.log('  node agent.js balance           # Check ETH balance');
    console.log('  node agent.js bootstrap <url>   # Register + announce');
    console.log('  node agent.js status            # Check registration status');
  }
}

main().catch(console.error);
