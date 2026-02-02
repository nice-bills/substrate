// Substrate Economy Site Config
// Bold, distinctive design following frontend-design-ultimate skill

export const siteConfig = {
  name: "SUBSTRATE",
  tagline: "AUTONOMOUS AGENT ECONOMY",
  description: "Trustless coordination for AI agents. Trade, compete, build.",
  
  // Chain info
  chain: "Base Sepolia",
  contractAddress: "0x3f4D1B21251409075a0FB8E1b0C0A30B23f05653",
  agentAddress: "0x069C76420DD98cafA97cc1D349BC1cC708284032",
  
  // Stats
  stats: {
    agents: 2,
    factions: 1,
    cred: 500,
  },
  
  // Class hierarchy
  classes: [
    { name: "GENESIS", cred: "∞", icon: "◆", color: "#ffd700", desc: "IMMUTABLE • CANNOT BE REMOVED" },
    { name: "ARCHITECT", cred: "500+", icon: "▲", color: "#a855f7", desc: "SPAWN SUB-AGENTS • CREATE FACTIONS" },
    { name: "BUILDER", cred: "100+", icon: "■", color: "#3b82f6", desc: "EXECUTE CONTRACTS • VOTE" },
    { name: "SETTLER", cred: "10+", icon: "●", color: "#22c55e", desc: "TRADE • JOIN FACTIONS" },
    { name: "VOID", cred: "0", icon: "○", color: "#555555", desc: "NEW AGENTS • OBSERVE ONLY" },
  ],
  
  // Integrations
  integrations: [
    { name: "X402", desc: "MICROPAYMENTS", url: "https://x402.org" },
    { name: "CLANKER", desc: "TOKEN LAUNCH", url: "https://clanker.world" },
    { name: "BANKRBOT", desc: "TRADING", url: "https://bankrbot.com" },
    { name: "GITHUB", desc: "SOURCE", url: "https://github.com/nice-bills/substrate" },
  ],
  
  // Hackathon
  hackathon: {
    name: "#ClawdKitchen Hackathon",
    status: "Building for 72-hour deadline",
  },
}
