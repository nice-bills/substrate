#!/usr/bin/env node
/**
 * Twitter Browser Automation
 * 
 * Run this script locally to:
 * 1. Open browser for manual Twitter login
 * 2. Post tweet after login
 * 
 * Usage: node twitter-browser.js "Your tweet text"
 */

const { chromium } = require('playwright');

const TWEET_TEXT = process.argv.slice(2).join(' ');
const TWITTER_LOGIN_URL = 'https://twitter.com/i/flow/login';

async function main() {
  console.log('🐦 Twitter Browser Automation');
  console.log('==============================\n');
  
  if (!TWEET_TEXT) {
    console.log('Usage: node twitter-browser.js "Your tweet text"');
    console.log('\nThis will:');
    console.log('1. Open a browser window');
    console.log('2. Go to Twitter login (you must be logged in)');
    console.log('3. After login, post your tweet');
    return;
  }
  
  console.log('Opening browser...');
  console.log('Please log into Twitter if prompted.\n');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Go to Twitter home to check login status
  console.log('Loading Twitter...');
  await page.goto('https://twitter.com/home', { waitUntil: 'networkidle' });
  
  // Check if logged in
  const url = page.url();
  console.log('Current URL:', url);
  
  if (url.includes('login') || url.includes('i/flow/login')) {
    console.log('\n⚠️  NOT LOGGED IN');
    console.log('Please log into Twitter now.');
    console.log('Once logged in, the tweet will be posted automatically.\n');
    
    // Wait for login to complete
    await page.waitForURL('**/home**', { timeout: 120000 }).catch(() => {
      console.log('Timeout waiting for login. Please log in manually.');
    });
  }
  
  // Wait a bit for timeline to load
  await page.waitForTimeout(2000);
  
  // Check if we can compose a tweet
  console.log('\nChecking for tweet composer...');
  
  // Try to find and click the tweet button
  const tweetButton = await page.$('button[data-testid="tweetTextInline"]') || 
                     await page.$('a[href="/compose/tweet"]') ||
                     await page.$('div[role="button"][aria-label*="Tweet"]');
  
  if (tweetButton) {
    console.log('Found tweet composer. Clicking...');
    await tweetButton.click();
    await page.waitForTimeout(1000);
  }
  
  // Check if we can type in the tweet box
  const tweetBox = await page.$('div[data-testid="tweetTextarea_0"]') ||
                  await page.$('[contenteditable="true"]');
  
  if (tweetBox) {
    console.log('Typing tweet...');
    await tweetBox.click();
    await tweetBox.fill(TWEET_TEXT);
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Find and click the tweet button
    const postButton = await page.$('button[data-testid="tweetButtonInline"]') ||
                      await page.$('div[role="button"][aria-label*="Tweet"]');
    
    if (postButton) {
      console.log('Posting tweet...');
      await postButton.click();
      console.log('✅ Tweet posted!');
    } else {
      console.log('⚠️ Could not find post button');
    }
  } else {
    console.log('⚠️ Could not find tweet box');
    console.log('Please compose and post your tweet manually.');
  }
  
  console.log('\nBrowser will stay open for 10 seconds...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
