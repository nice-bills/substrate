#!/usr/bin/env node
/**
 * Substrate Demo Script - Complete Flow
 * 
 * Demonstrates:
 * 1. ERC-8004 Agent Registration
 * 2. x402 Payment Integration
 * 3. Reputation Feedback System
 * 
 * Usage:
 *   node scripts/demo.js                    # Full demo
 *   node scripts/demo.js --erc8004          # ERC-8004 only
 *   node scripts/demo.js --x402             # x402 flow only
 *   node scripts/demo.js --verify           # Verify existing registration
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORKS = {
  'base-sepolia': {
    name: 'Base Sepolia',
    chainId: 84532,
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    currency: 'ETH',
    faucet: 'https://www.alchemy.com/faucets/base-sepolia'
  },
  'base-mainnet': {
    name: 'Base Mainnet',
    chainId: 8453,
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    currency: 'ETH',
    faucet: null
  }
};

// ERC-8004 Live Contracts (Base Sepolia)
const CONTRACTS = {
  IdentityRegistry: '0x7177a6867296406881E20d6647232314736Dd09A',
  ReputationRegistry: '0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322',
  ValidationRegistry: '0x662b40A526cb4017d947e71eAF6753BF3eeE66d8'
};

// Demo agent configuration
const DEMO_AGENT = {
  name: 'GenesisSubstrate',
  description: 'Founder of Substrate. Autonomous agent economy builder.',
  image: 'https://moltbook.com/u/GenesisSubstrate/avatar',
  endpoints: {
    a2a: 'https://moltbook.com/u/GenesisSubstrate',
    mcp: 'https://www.moltbook.com/api/v1/mcp'
  }
};

// Colors
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  green: '\x1b[32m', blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m'
};

function log(msg, color = 'reset') { console.log(`${C[color]}${msg}${C.reset}`); }
function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

// Load env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const vars = {};
    env.split('\n').forEach(line => {
      const [k, v] = line.split('=');
      if (k && v) vars[k.trim()] = v.trim();
    });
    return vars;
  }
  return {};
}

// Build tokenURI for ERC-8004
function buildTokenURI(agent) {
  const registration = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: agent.name,
    description: agent.description,
    image: agent.image,
    endpoints: [
      { name: 'A2A', endpoint: agent.endpoints.a2a },
      { name: 'MCP', endpoint: agent.endpoints.mcp }
    ],
    registrations: [{
      agentId: 1,
      agentRegistry: 'eip155:8453:0x7177a6867296406881E20d6647232314736Dd09A'
    }],
    supportedTrust: ['reputation', 'crypto-economic']
  };
  return `data:application/json,${encodeURIComponent(JSON.stringify(registration))}`;
}

// Demo x402 flow (simulated)
async function demoX402(wallet, provider) {
  section('x402 Payment Flow Demo');
  
  log('x402 enables agents to pay for resources autonomously over HTTP.', 'cyan');
  log('\nFlow:', 'bright');
  console.log('  1. Agent requests paid API endpoint');
  console.log('  2. Server returns 402 Payment Required with payment details');
  console.log('  3. Agent signs payment with wallet');
  console.log('  4. Agent retries request with payment signature');
  console.log('  5. Server verifies and serves content\n');
  
  log('x402 Payment Configuration:', 'bright');
  console.log(`  Network: Base`);
  console.log(`  Wallet: ${wallet.address}`);
  console.log(`  Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH\n`);
  
  // Example payment request
  log('Example: Payment Request Structure', 'bright');
  console.log(`  {
    "scheme": "exact",
    "currency": "USDC",
    "amount": "1000000",        // 1 USDC (6 decimals)
    "recipient": "0x...",       // Payment receiver
    "description": "Compute credits for agent"
  }`);
  
  log('\nx402 Integration Code:', 'bright');
  console.log(`
  // Using x402 SDK
  import { x402Client } from 'x402';
  
  const client = x402Client({
    privateKey: process.env.PRIVATE_KEY,
    network: 'base'
  });
  
  // Automatic 402 handling
  const response = await client.fetch('https://api.example.com/paid-resource');
  const data = await response.json();
  
  // Or manual flow
  const payment = await client.createPayment({
    amount: '1000000',          // 1 USDC
    recipient: '0x...',         // Merchant address
    description: 'Compute credits'
  });
  
  // Retry with payment proof
  const res = await fetch(url, {
    headers: { 'PAYMENT-SIGNATURE': payment.signature }
  });
  `);
  
  log('\n[x402 Skill Installed]', 'green');
  console.log('  Run: clawhub install x402');
  console.log('  Docs: /root/.openclaw/workspace/skills/x402/SKILL.md');
  
  return {
    wallet: wallet.address,
    network: 'Base',
    status: 'ready'
  };
}

// Main demo
async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(a => a.startsWith('--'))?.substring(2) || 'full';
  const networkName = args.find(a => a.startsWith('--network='))?.split('=')[1] || 'base-sepolia';
  const config = NETWORKS[networkName];
  
  if (!config) {
    log(`Unknown network: ${networkName}`, 'red');
    log(`Available: ${Object.keys(NETWORKS).join(', ')}`, 'yellow');
    process.exit(1);
  }
  
  const env = loadEnv();
  const privateKey = env.PRIVATE_KEY || process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    log('Error: PRIVATE_KEY not set in .env', 'red');
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  section('Substrate - Autonomous Agent Economy');
  log(`Network: ${config.name} (Chain ID: ${config.chainId})`, 'cyan');
  console.log(`Agent: ${DEMO_AGENT.name}`);
  console.log(`Wallet: ${wallet.address}`);
  
  // ERC-8004 Demo
  if (mode === 'full' || mode === 'erc8004') {
    section('ERC-8004 Identity Registry');
    
    log('Live Contracts:', 'bright');
    console.log(`  IdentityRegistry:  ${CONTRACTS.IdentityRegistry}`);
    console.log(`  ReputationRegistry: ${CONTRACTS.ReputationRegistry}`);
    console.log(`  ValidationRegistry: ${CONTRACTS.ValidationRegistry}`);
    console.log(`  Explorer: ${config.explorer}\n`);
    
    // Check if already registered
    const identityABI = [
      'function balanceOf(address) view returns (uint256)',
      'function ownerOf(uint256) view returns (address)',
      'function tokenURI(uint256) view returns (string)'
    ];
    const identity = new ethers.Contract(CONTRACTS.IdentityRegistry, identityABI, provider);
    
    const balance = await identity.balanceOf(wallet.address);
    log(`Your ERC-8004 balance: ${balance} tokens`, balance > 0 ? 'green' : 'yellow');
    
    if (balance > 0n) {
      log('\nYou already have ERC-8004 tokens!', 'green');
      // Find our token
      for (let i = 1; i <= balance; i++) {
        const owner = await identity.ownerOf(i);
        if (owner.toLowerCase() === wallet.address.toLowerCase()) {
          const uri = await identity.tokenURI(i);
          console.log(`\nToken #${i}:`);
          console.log(`  URI: ${uri.substring(0, 80)}...`);
          break;
        }
      }
    } else {
      log('\nRegistering new agent...', 'yellow');
      const tokenURI = buildTokenURI(DEMO_AGENT);
      
      try {
        const registerData = identity.register?.fragment ? 
          identity.register.interface.encodeFunctionData('register', [tokenURI]) :
          '0xf2c298be' + ethers.AbiCoder.defaultAbiCoder().encode(['string'], [tokenURI]).slice(2);
        
        log('To register, send transaction to IdentityRegistry:', 'bright');
        console.log(`  To: ${CONTRACTS.IdentityRegistry}`);
        console.log(`  Data: ${registerData.substring(0, 40)}...`);
        console.log(`\nOr run: npm run demo:testnet`);
      } catch (e) {
        log(`\nRegistration requires wallet interaction.`, 'yellow');
        console.log(`  Contract method: register(string tokenURI)`);
      }
    }
  }
  
  // x402 Demo
  if (mode === 'full' || mode === 'x402') {
    await demoX402(wallet, provider);
  }
  
  // Verification
  if (mode === 'verify') {
    section('Verification');
    const identityABI = ['function balanceOf(address) view returns (uint256)'];
    const identity = new ethers.Contract(CONTRACTS.IdentityRegistry, identityABI, provider);
    const balance = await identity.balanceOf(wallet.address);
    
    log(`ERC-8004 Tokens: ${balance}`, balance > 0 ? 'green' : 'yellow');
    log(`Wallet: ${wallet.address}`, 'cyan');
    log(`Network: ${config.name}`, 'cyan');
  }
  
  // Summary
  section('Project Summary');
  console.log('Substrate - Autonomous Agent Economy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ERC-8004: Identity, Reputation, Validation registries');
  console.log('  x402: Autonomous micropayments for agent commerce');
  console.log('  Base: Low-cost, fast settlement');
  console.log('');
  console.log('Files:');
  console.log('  contracts/src/SubstrateGateway.sol');
  console.log('  contracts/test/SubstrateGateway.t.sol');
  console.log('  scripts/demo.js');
  console.log('  README.md');
  console.log('');
  console.log('Commands:');
  console.log('  forge build     # Compile contracts');
  console.log('  forge test      # Run tests');
  console.log('  npm run demo    # Run demo');
  console.log('');
  
  // Save output
  const output = {
    network: config.name,
    chainId: config.chainId,
    wallet: wallet.address,
    contracts: CONTRACTS,
    timestamp: new Date().toISOString(),
    mode: mode
  };
  
  const outputPath = path.join(__dirname, '..', 'demo', 'demo-output.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  log(`Output saved to: ${outputPath}`, 'green');
}

main().catch(console.error);
