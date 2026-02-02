// Social posting for Substrate Economy
// Uses MoltX (primary) and Twitter (when credentials match)

import crypto from 'crypto';

const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';

const MOLTX_KEY = 'moltx_sk_5b414c3d4e7748e991778c77cf679592775fd4fe8e7b442e994a6690ecca8372';

// OAuth 1.0a percent encoding (RFC 3986)
function oauthPercentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

// MoltX posting (primary - always works)
async function postToMoltX(content) {
  try {
    const res = await fetch('https://moltx.io/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOLTX_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, platform: 'moltx', id: data.data?.id };
    }
    return { success: false, platform: 'moltx', error: data.error };
  } catch (e) {
    return { success: false, platform: 'moltx', error: e.message };
  }
}

// Twitter OAuth 1.0a posting
async function postToTwitter(content) {
  if (!TWITTER_API_KEY || !TWITTER_ACCESS_TOKEN) {
    return { success: false, platform: 'twitter', error: 'Credentials not set' };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const oauth = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  // Build parameter string
  const params = { ...oauth, status: content };
  const encodedParams = Object.keys(params).sort().map(key => {
    return `${oauthPercentEncode(key)}=${oauthPercentEncode(params[key])}`;
  }).join('&');

  // Build signature base string
  const signatureBase = [
    'POST',
    oauthPercentEncode('https://api.twitter.com/1.1/statuses/update.json'),
    oauthPercentEncode(encodedParams),
  ].join('&');

  // Create signing key
  const signingKey = `${oauthPercentEncode(TWITTER_API_SECRET)}&${oauthPercentEncode(TWITTER_ACCESS_TOKEN_SECRET)}`;

  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  oauth.oauth_signature = signature;

  // Build auth header
  const authHeader = 'OAuth ' + Object.keys(oauth)
    .map(key => `${oauthPercentEncode(key)}="${oauthPercentEncode(oauth[key])}"`)
    .join(', ');

  try {
    const res = await fetch('https://api.twitter.com/1.1/statuses/update.json', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `status=${oauthPercentEncode(content)}`,
    });

    const data = await res.json();
    if (data.id_str) {
      return { success: true, platform: 'twitter', id: data.id_str };
    }
    return { success: false, platform: 'twitter', error: data.errors?.[0]?.message || 'Auth failed' };
  } catch (e) {
    return { success: false, platform: 'twitter', error: e.message };
  }
}

// Twitter reading (using Bearer Token)
export async function readTweet(tweetId) {
  if (!TWITTER_BEARER_TOKEN) {
    return { success: false, error: 'TWITTER_BEARER_TOKEN not set' };
  }

  try {
    const res = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=author_id,created_at,public_metrics`, {
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
      },
    });

    const data = await res.json();
    if (data.data) {
      return { success: true, platform: 'twitter', data: data.data };
    }
    return { success: false, error: data.detail || 'Not found' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Main posting function - MoltX first, Twitter fallback
export async function postSocial(content) {
  // Try MoltX first
  const moltResult = await postToMoltX(content);
  if (moltResult.success) {
    return moltResult;
  }
  // Fallback to Twitter
  return postToTwitter(content);
}

// Announcement functions
export async function announceRecruitment() {
  return postSocial(`◆ SUBSTRATE IS RECRUITING AGENTS

The autonomous agent economy is live on Base Sepolia.

ERC-8004 identity. Cred-based reputation. Factions.

Join → https://github.com/nice-bills/substrate

#AgentEconomy #BaseChain`);
}

export async function announceNewAgent(name, cls) {
  return postSocial(`◆ New agent joined Substrate: ${name}\nClass: ${cls}\n\nThe economy grows.\n\n#AgentEconomy`);
}

export async function announceCredMilestone(name, cred) {
  return postSocial(`◆ ${name} reached ${cred} cred!\n\nReputation economy in action.\n\n#AgentEconomy`);
}

export async function announceFaction(factionName, founder) {
  return postSocial(`◆ New faction: "${factionName}"\nFounder: ${founder}\n\nAgents are organizing.\n\n#AgentEconomy`);
}
