#!/usr/bin/env node
/**
 * Twitter/X Posting via bird CLI with cookie authentication
 * 
 * Usage:
 *   TWITTER_AUTH_TOKEN=xxx TWITTER_CT0=xxx node twitter-cookies.js auth
 *   TWITTER_AUTH_TOKEN=xxx TWITTER_CT0=xxx node twitter-cookies.js "Hello world"
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const AUTH_TOKEN = process.env.TWITTER_AUTH_TOKEN;
const CT0 = process.env.TWITTER_CT0;

function runBird(args) {
  const cmd = ['bird', ...args];
  try {
    const result = execSync(cmd.map(a => `'${a}'`).join(' '), { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, output: error.stdout || error.message };
  }
}

function checkAuth() {
  if (!AUTH_TOKEN || !CT0) {
    console.log('🔐 Auth check requires TWITTER_AUTH_TOKEN and TWITTER_CT0 env vars');
    console.log('   These cookies come from a browser where Twitter is logged in');
    console.log('   Get them from DevTools → Application → Cookies → twitter.com');
    return false;
  }
  
  console.log('🔐 Checking Twitter auth...');
  const result = runBird([
    '--auth-token', AUTH_TOKEN,
    '--ct0', CT0,
    'read', '20' // Tweet ID for @SubstrateGenesis profile test
  ]);
  
  if (result.success) {
    console.log('✅ Twitter auth working');
    return true;
  } else {
    console.log('❌ Twitter auth failed');
    console.log(result.output);
    return false;
  }
}

async function postTweet(text) {
  if (!AUTH_TOKEN || !CT0) {
    console.error('❌ Missing TWITTER_AUTH_TOKEN or TWITTER_CT0');
    console.log('   Set these environment variables:');
    console.log('   export TWITTER_AUTH_TOKEN="your_auth_token"');
    console.log('   export TWITTER_CT0="your_ct0"');
    return false;
  }
  
  console.log('📝 Posting tweet...');
  const result = runBird([
    '--auth-token', AUTH_TOKEN,
    '--ct0', CT0,
    'tweet', text
  ]);
  
  if (result.success) {
    console.log('✅ Tweet posted successfully');
    console.log(result.output);
    return true;
  } else {
    console.error('❌ Failed to post tweet');
    console.error(result.output);
    return false;
  }
}

// CLI
const args = process.argv.slice(2);

if (!AUTH_TOKEN && !CT0) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Twitter Posting via Browser Cookies (bird CLI)            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Requires: TWITTER_AUTH_TOKEN and TWITTER_CT0              ║');
  console.log('║                                                            ║');
  console.log('║  Get cookies from browser where Twitter is logged in:      ║');
  console.log('║  1. Open DevTools (F12) → Application → Cookies            ║');
  console.log('║  2. Select twitter.com                                     ║');
  console.log('║  3. Copy auth_token and ct0 values                        ║');
  console.log('║                                                            ║');
  console.log('║  Set environment variables:                                ║');
  console.log('║  export TWITTER_AUTH_TOKEN="your_auth_token"              ║');
  console.log('║  export TWITTER_CT0="your_ct0"                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
}

if (args[0] === 'auth') {
  checkAuth();
} else if (args[0]) {
  postTweet(args.join(' ')).then(success => process.exit(success ? 0 : 1));
} else {
  console.log('Usage:');
  console.log('  node twitter-cookies.js auth          # Check authentication');
  console.log('  node twitter-cookies.js "Hello world" # Post a tweet');
  console.log('');
  console.log('Environment variables required:');
  console.log('  TWITTER_AUTH_TOKEN - Twitter auth_token cookie');
  console.log('  TWITTER_CT0       - Twitter ct0 cookie');
}
