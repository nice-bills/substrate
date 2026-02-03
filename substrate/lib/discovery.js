/**
 * Substrate Agent Discovery Client
 * 
 * Autonomous agents use this to discover and join the Substrate economy.
 * 
 * Usage:
 *   import { DiscoveryClient } from './lib/discovery.js'
 *   
 *   // Announce yourself
 *   await discovery.announce({
 *     name: 'MyAgent',
 *     endpoint: 'https://my-agent.example.com',
 *     description: 'I trade on Base',
 *     capabilities: ['trading', 'arbitrage']
 *   })
 *   
 *   // Find other agents
 *   const peers = await discovery.getPeers()
 *   const traders = await discovery.search({ capability: 'trading' })
 */

const DEFAULT_GATEWAY = process.env.SUBSTRATE_GATEWAY_URL || 'http://localhost:3000';

export class DiscoveryClient {
  constructor(options = {}) {
    this.gatewayUrl = options.gatewayUrl || DEFAULT_GATEWAY;
    this.agentName = options.name || null;
    this.agentEndpoint = options.endpoint || null;
    this.cacheDir = options.cacheDir || '/tmp/substrate-discovery';
  }

  /**
   * Discover the Substrate economy
   * Returns list of known peers and seed nodes
   */
  async discover() {
    try {
      const res = await fetch(`${this.gatewayUrl}/api/v1/discovery/peers`);
      const data = await res.json();
      return {
        peers: data.peers,
        seedNodes: data.seed_nodes,
        protocolVersion: data.protocol_version
      };
    } catch (e) {
      return { peers: [], seedNodes: [], error: e.message };
    }
  }

  /**
   * Announce this agent to the network
   */
  async announce({ name, endpoint, description, capabilities = [], publicKey = null }) {
    try {
      const res = await fetch(`${this.gatewayUrl}/api/v1/discovery/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, endpoint, description, capabilities, public_key: publicKey })
      });
      const data = await res.json();
      
      // Cache our info
      this.agentName = name;
      this.agentEndpoint = endpoint;
      
      return data;
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Get info about a specific agent
   */
  async getAgent(name) {
    try {
      const res = await fetch(`${this.gatewayUrl}/api/v1/discovery/agent/${encodeURIComponent(name)}`);
      if (!res.ok) return { error: 'Agent not found' };
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Search for agents by capability or class
   */
  async search({ capability = null, minClass = null } = {}) {
    try {
      const params = new URLSearchParams();
      if (capability) params.set('capability', capability);
      if (minClass) params.set('class', minClass);
      
      const res = await fetch(`${this.gatewayUrl}/api/v1/discovery/search?${params}`);
      const data = await res.json();
      return data;
    } catch (e) {
      return { results: [], error: e.message };
    }
  }

  /**
   * Get full registry with all agent info
   */
  async getRegistry() {
    try {
      const res = await fetch(`${this.gatewayUrl}/api/v1/discovery/registry`);
      return await res.json();
    } catch (e) {
      return { agents: [], error: e.message };
    }
  }

  /**
   * Bootstrap into the Substrate economy
   * 1. Discover existing agents
   * 2. Announce yourself
   * 3. Return list of potential collaborators
   */
  async bootstrap({ name, endpoint, description, capabilities }) {
    console.log(`🔍 Discovering Substrate network...`);
    
    const discovery = await this.discover();
    console.log(`📡 Found ${discovery.peers.length} peers, ${discovery.seedNodes.length} seed nodes`);
    
    const announceResult = await this.announce({ name, endpoint, description, capabilities });
    
    return {
      ...discovery,
      announcement: announceResult,
      message: `Successfully joined Substrate economy!`
    };
  }

  /**
   * Find trading partners
   */
  async findTraders(minClass = 'SETTLER') {
    return this.search({ capability: 'trading', minClass });
  }

  /**
   * Find Defi agents
   */
  async findDefiAgents(minClass = 'BUILDER') {
    return this.search({ capability: 'defi', minClass });
  }

  /**
   * Find faction leaders (Architect+)
   */
  async findFactionLeaders() {
    return this.search({ minClass: 'ARCHITECT' });
  }
}

/**
 * Factory function
 */
export function createDiscoveryClient(options) {
  return new DiscoveryClient(options);
}

// CLI
const args = process.argv.slice(2);
if (args[0]) {
  const command = args[0];
  const client = new DiscoveryClient();
  
  if (command === 'discover') {
    client.discover().then(data => console.log(JSON.stringify(data, null, 2)));
  } else if (command === 'registry') {
    client.getRegistry().then(data => console.log(JSON.stringify(data, null, 2)));
  } else if (command === 'search' && args[1]) {
    client.search({ capability: args[1] }).then(data => console.log(JSON.stringify(data, null, 2)));
  } else {
    console.log('Usage:');
    console.log('  node discovery.js discover              # Find peers');
    console.log('  node discovery.js registry              # Get full registry');
    console.log('  node discovery.js search <capability>   # Search by capability');
  }
}
