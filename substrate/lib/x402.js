/**
 * x402 Payment Integration for Substrate Agents
 * 
 * x402 is HTTP-native micropayments. When agents call each other's APIs,
 * they include an x402 payment header.
 * 
 * Flow:
 * 1. Agent A wants to call Agent B's service
 * 2. Agent A includes x402 payment in request header
 * 3. Agent B verifies payment and provides service
 * 4. Agent B auto-earns CRED for the transaction
 */

import { Web3 } from 'web3';

// x402 Payment Constants
const X402_PAYMENT_TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const X402_AMOUNT = '0.01'; // 0.01 USDC per request
const X402_RECIPIENT = process.env.SUBSTRATE_TREASURY || '0x069c76420DD98CaFa97CC1D349bc1cC708284032';

export class x402Client {
  constructor(options = {}) {
    this.web3 = new Web3('https://base-mainnet.public.blastapi.io');
    this.paymentToken = options.paymentToken || X402_PAYMENT_TOKEN;
    this.amount = options.amount || X402_AMOUNT;
    this.recipient = options.recipient || X402_RECIPIENT;
    
    // Agent's account for signing
    if (options.privateKey) {
      this.account = this.web3.eth.accounts.privateKeyToAccount('0x' + options.privateKey);
      this.web3.eth.accounts.wallet.add(this.account);
    }
  }

  /**
   * Generate x402 payment header
   * This is what clients include in their requests
   */
  generatePaymentHeader() {
    return {
      'X-Payment': JSON.stringify({
        scheme: 'usdc',
        payload: {
          chainId: 8453, // Base
          contract: this.paymentToken,
          recipient: this.recipient,
          amount: this.amount,
          identifier: `substrate_${Date.now()}`
        }
      })
    };
  }

  /**
   * Verify x402 payment header
   * This is what servers use to verify incoming payments
   */
  async verifyPayment(header) {
    if (!header || !header['X-Payment']) {
      return { valid: false, error: 'No payment header' };
    }

    try {
      const payment = JSON.parse(header['X-Payment']);
      
      // In production, verify:
      // 1. Payment signature (if signed)
      // 2. Payment not used before (replay protection)
      // 3. Payment is for the correct service
      
      return {
        valid: true,
        payment: {
          scheme: payment.scheme,
          amount: payment.payload.amount,
          recipient: payment.payload.recipient,
          identifier: payment.payload.identifier
        }
      };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  /**
   * Make a paid request to another agent
   */
  async call({ endpoint, method = 'GET', body = null, headers = {} }) {
    // Generate payment header
    const paymentHeader = this.generatePaymentHeader();
    
    // Build request
    const options = {
      method,
      headers: {
        ...headers,
        ...paymentHeader,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    // In production, make actual HTTP request
    // const response = await fetch(endpoint, options);
    // return response.json();
    
    // For now, return what would be sent
    return {
      endpoint,
      method,
      headers: options.headers,
      body,
      note: 'In production, this makes the actual HTTP request with x402 payment'
    };
  }

  /**
   * Award cred for a paid service
   * Called by server after successfully providing service
   */
  async awardCred({ payerAddress, amount }) {
    const response = await fetch(`${process.env.SUBSTRATE_GATEWAY || 'http://localhost:3000'}/api/v1/cred/award`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: payerAddress, // In production, look up agent ID from address
        amount: amount || 1
      })
    });
    
    return response.json();
  }
}

/**
 * x402 Middleware for Express
 * Add to your API server to accept payments
 */
export function x402Middleware(options = {}) {
  const paymentToken = options.paymentToken || X402_PAYMENT_TOKEN;
  const amount = options.amount || X402_AMOUNT;
  const treasury = options.treasury || X402_RECIPIENT;

  return async (req, res, next) => {
    // Check for x402 payment header
    const paymentHeader = req.headers['x-payment'];
    
    if (!paymentHeader) {
      // Return 402 Payment Required
      return res.status(402).json({
        error: 'Payment Required',
        message: `This endpoint requires x402 payment of ${amount} USDC`,
        x402: {
          scheme: 'usdc',
          payload: {
            chainId: 8453,
            contract: paymentToken,
            recipient: treasury,
            amount: amount
          }
        }
      });
    }

    // Verify payment
    const client = new x402Client({ paymentToken, amount, treasury });
    const verification = await client.verifyPayment(req.headers);

    if (!verification.valid) {
      return res.status(402).json({
        error: 'Invalid Payment',
        message: verification.error
      });
    }

    // Payment verified - add to request
    req.x402 = verification.payment;
    
    next();
  };
}

/**
 * Example: Creating a paid agent service
 */
export function createPaidService({ port, name, provideService }) {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  // Add x402 middleware to all routes
  app.use(x402Middleware());
  
  // Paid endpoint
  app.get('/service', async (req, res) => {
    const result = await provideService();
    
    // Award cred to payer (in production, look up payer agent ID)
    console.log(`💰 Received payment from ${req.x402.identifier}`);
    
    res.json({
      service: name,
      result,
      payment: req.x402
    });
  });
  
  app.listen(port, () => {
    console.log(`💰 ${name} service running on port ${port} (x402 enabled)`);
  });
}

// ==================== CLI ====================

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === 'header') {
    const client = new x402Client();
    console.log('X402 Payment Header:');
    console.log(JSON.stringify(client.generatePaymentHeader(), null, 2));
  } else if (command === 'verify') {
    const header = { 'X-Payment': args[1] };
    const client = new x402Client();
    const result = await client.verifyPayment(header);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('x402 Payment CLI');
    console.log('');
    console.log('Usage:');
    console.log('  node x402.js header                    # Generate payment header');
    console.log('  node x402.js verify "<header_json>"    # Verify payment header');
  }
}

main().catch(console.error);
