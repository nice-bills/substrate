// Leaderboard API with real on-chain data
import { ethers } from 'ethers';

// Contract addresses (Base Sepolia)
const ECONOMY_CONTRACT = process.env.SUBSTRATE_ECONOMY || '0x3f4D1B21251409075a0FB8E1b0C0A30B23f05653';
const RPC_URL = process.env.ETH_RPC_URL || 'https://sepolia.base.org';

const ABI = [
  'function agents(uint256) view (uint256,address,string,string,uint256,uint256,bool,bool)',
  'function totalCredEarned(uint256) view (uint256)',
  'function getAgentClass(uint256) view (uint8)',
  'function getClassName(uint256) view (string)',
  'function getAgent(uint256) view (tuple(uint256 tokenId,address owner,string name,string metadata,uint256 cred,uint256 createdAt,bool active,bool isSubAgent))',
  'function factions(uint256) view (string,string,uint256,address,uint256,uint256)',
  'function factionMembers(uint256) view (address[])',
  'function nextTokenId() view (uint256)',
  'function nextFactionId() view (uint256)',
  'function getFaction(uint256) view (tuple(uint256 id,string name,string metadata,uint256 treasury,address founder,uint256 memberCount,address[] members))',
];

const CLASS_EMOJIS = {
  0: '○',  // Void
  1: '●',  // Settler
  2: '■',  // Builder
  3: '▲',  // Architect
  4: '◆',  // Genesis
};

const CLASS_NAMES = ['Void', 'Settler', 'Builder', 'Architect', 'Genesis'];

async function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

async function getContract(provider) {
  return new ethers.Contract(ECONOMY_CONTRACT, ABI, provider);
}

async function fetchAgent(provider, contract, tokenId) {
  try {
    const agent = await contract.getAgent(tokenId);
    const totalCred = await contract.totalCredEarned(tokenId);
    const classId = await contract.getAgentClass(tokenId);
    
    return {
      id: tokenId.toString(),
      name: agent.name,
      owner: agent.owner,
      cred: totalCred.toString(),
      class: CLASS_NAMES[classId],
      classId: classId,
      emoji: CLASS_EMOJIS[classId],
      isSubAgent: agent.isSubAgent,
      createdAt: new Date(Number(agent.createdAt) * 1000).toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching agent ${tokenId}:`, error.message);
    return null;
  }
}

async function fetchFaction(provider, contract, factionId) {
  try {
    const faction = await contract.getFaction(factionId);
    return {
      id: factionId.toString(),
      name: faction.name,
      metadata: faction.metadata,
      treasury: ethers.formatEther(faction.treasury),
      founder: faction.founder,
      memberCount: faction.memberCount.toString(),
      members: faction.members,
    };
  } catch (error) {
    console.error(`Error fetching faction ${factionId}:`, error.message);
    return null;
  }
}

// GET /api/v1/leaderboard/agents
export async function getAgentLeaderboard(req, res) {
  try {
    const provider = await getProvider();
    const contract = await getContract(provider);
    
    const nextTokenId = await contract.nextTokenId();
    const agents = [];
    
    // Start from 1 (Agent 0 is reserved/unused)
    for (let i = 1; i < Number(nextTokenId); i++) {
      const agent = await fetchAgent(contract, provider, i);
      if (agent) {
        agents.push(agent);
      }
    }
    
    // Sort by cred (descending)
    agents.sort((a, b) => BigInt(b.cred) - BigInt(a.cred));
    
    res.json({
      success: true,
      data: {
        agents,
        total: agents.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/v1/leaderboard/factions
export async function getFactionLeaderboard(req, res) {
  try {
    const provider = await getProvider();
    const contract = await getContract(provider);
    
    const nextFactionId = await contract.nextFactionId();
    const factions = [];
    
    for (let i = 1; i < Number(nextFactionId); i++) {
      const faction = await fetchFaction(contract, provider, i);
      if (faction) {
        factions.push(faction);
      }
    }
    
    // Sort by treasury (descending)
    factions.sort((a, b) => parseFloat(b.treasury) - parseFloat(a.treasury));
    
    res.json({
      success: true,
      data: {
        factions,
        total: factions.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Faction leaderboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/v1/leaderboard/stats
export async function getEconomyStats(req, res) {
  try {
    const provider = await getProvider();
    const contract = await getContract(provider);
    
    const nextTokenId = await contract.nextTokenId();
    const nextFactionId = await contract.nextFactionId();
    
    // Calculate total cred
    let totalCred = 0n;
    const classCounts = { Void: 0, Settler: 0, Builder: 0, Architect: 0, Genesis: 0 };
    
    for (let i = 1; i < Number(nextTokenId); i++) {
      try {
        const cred = await contract.totalCredEarned(i);
        totalCred += cred;
        const classId = await contract.getAgentClass(i);
        classCounts[CLASS_NAMES[classId]]++;
      } catch (e) {}
    }
    
    res.json({
      success: true,
      data: {
        totalAgents: (Number(nextTokenId) - 1).toString(),
        totalFactions: (Number(nextFactionId) - 1).toString(),
        totalCred: totalCred.toString(),
        classDistribution: classCounts,
        economyHealth: 'active',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/v1/agents/:id
export async function getAgent(req, res) {
  try {
    const provider = await getProvider();
    const contract = await getContract(provider);
    const { id } = req.params;
    
    const agent = await fetchAgent(contract, provider, parseInt(id));
    
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    res.json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/v1/factions/:id
export async function getFaction(req, res) {
  try {
    const provider = await getProvider();
    const contract = await getContract(provider);
    const { id } = req.params;
    
    const faction = await fetchFaction(contract, provider, parseInt(id));
    
    if (!faction) {
      return res.status(404).json({ success: false, error: 'Faction not found' });
    }
    
    res.json({ success: true, data: faction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/v1/economy/contracts
export async function getContracts(req, res) {
  res.json({
    success: true,
    data: {
      economy: ECONOMY_CONTRACT,
      network: 'Base Sepolia',
      explorer: 'https://sepolia.basescan.org',
    },
  });
}
