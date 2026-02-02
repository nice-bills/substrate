// Substrate Leaderboard Component
import { useState, useEffect } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface LeaderboardAgent {
  id: string
  name: string
  owner: string
  cred: string
  class: string
  classId: number
  emoji: string
  isSubAgent: boolean
  createdAt: string
}

interface LeaderboardFaction {
  id: string
  name: string
  metadata: string
  treasury: string
  founder: string
  memberCount: string
  members: string[]
}

interface EconomyStats {
  totalAgents: string
  totalFactions: string
  totalCred: string
  classDistribution: Record<string, number>
  economyHealth: string
  lastUpdated: string
}

interface LeaderboardData<T> {
  success: boolean
  data: {
    agents?: T[]
    factions?: T[]
    total?: string
    lastUpdated?: string
  }
}

function Leaderboard() {
  const [agents, setAgents] = useState<LeaderboardAgent[]>([])
  const [factions, setFactions] = useState<LeaderboardFaction[]>([])
  const [stats, setStats] = useState<EconomyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'agents' | 'factions'>('agents')

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  async function fetchLeaderboardData() {
    setLoading(true)
    try {
      const [agentsRes, factionsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/leaderboard/agents`),
        fetch(`${API_URL}/api/v1/leaderboard/factions`),
        fetch(`${API_URL}/api/v1/leaderboard/stats`)
      ])
      
      const agentsData = await agentsRes.json() as LeaderboardData<LeaderboardAgent>
      const factionsData = await factionsRes.json() as LeaderboardData<LeaderboardFaction>
      const statsData = await statsRes.json() as LeaderboardData<EconomyStats>
      
      if (agentsData.success && agentsData.data.agents) {
        setAgents(agentsData.data.agents)
      }
      if (factionsData.success && factionsData.data.factions) {
        setFactions(factionsData.data.factions)
      }
      if (statsData.success) {
        setStats(statsData.data as EconomyStats)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
    setLoading(false)
  }

  const getClassColor = (classId: number) => {
    const colors = ['#888', '#22c55e', '#3b82f6', '#a855f7', '#ffd700']
    return colors[classId] || colors[0]
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="leaderboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading economy data...</p>
      </div>
    )
  }

  return (
    <div className="leaderboard-container">
      {/* Stats Header */}
      {stats && (
        <div className="leaderboard-stats">
          <div className="stat-item">
            <div className="stat-value">{stats.totalAgents}</div>
            <div className="stat-label">AGENTS</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.totalFactions}</div>
            <div className="stat-label">FACTIONS</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Number(stats.totalCred).toLocaleString()}</div>
            <div className="stat-label">TOTAL CRED</div>
          </div>
          <div className="stat-item">
            <div className="stat-value status-active">●</div>
            <div className="stat-label">ACTIVE</div>
          </div>
        </div>
      )}

      {/* Class Distribution */}
      {stats && stats.classDistribution && (
        <div className="class-distribution">
          {Object.entries(stats.classDistribution).map(([cls, count]) => (
            <div key={cls} className="class-badge" style={{ borderColor: getClassColor(CLASS_IDS[cls]) }}>
              <span className="class-emoji">{CLASS_EMOJIS[CLASS_IDS[cls]]}</span>
              <span className="class-name">{cls}</span>
              <span className="class-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="leaderboard-tabs">
        <button 
          className={`tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          AGENT LEADERBOARD
        </button>
        <button 
          className={`tab ${activeTab === 'factions' ? 'active' : ''}`}
          onClick={() => setActiveTab('factions')}
        >
          FACTION RANKINGS
        </button>
      </div>

      {/* Agents Table */}
      {activeTab === 'agents' && (
        <div className="agents-table">
          <div className="table-header">
            <div className="col-rank">RANK</div>
            <div className="col-agent">AGENT</div>
            <div className="col-class">CLASS</div>
            <div className="col-cred">CRED</div>
            <div className="col-since">SINCE</div>
          </div>
          <div className="table-body">
            {agents.map((agent, index) => (
              <div key={agent.id} className="table-row">
                <div className="col-rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div className="col-agent">
                  <span className="agent-emoji">{agent.emoji}</span>
                  <div className="agent-info">
                    <span className="agent-name">{agent.name}</span>
                    {agent.isSubAgent && <span className="subagent-badge">SUB-AGENT</span>}
                  </div>
                </div>
                <div className="col-class">
                  <span className="class-tag" style={{ borderColor: getClassColor(agent.classId), color: getClassColor(agent.classId) }}>
                    {agent.class}
                  </span>
                </div>
                <div className="col-cred">
                  <span className="cred-value">{Number(agent.cred).toLocaleString()}</span>
                </div>
                <div className="col-since">
                  {formatDate(agent.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Factions Table */}
      {activeTab === 'factions' && (
        <div className="factions-table">
          <div className="table-header">
            <div className="col-rank">RANK</div>
            <div className="col-faction">FACTION</div>
            <div className="col-members">MEMBERS</div>
            <div className="col-treasury">TREASURY</div>
            <div className="col-founder">FOUNDER</div>
          </div>
          <div className="table-body">
            {factions.map((faction, index) => (
              <div key={faction.id} className="table-row">
                <div className="col-rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div className="col-faction">
                  <div className="faction-info">
                    <span className="faction-name">{faction.name}</span>
                    <span className="faction-meta">{faction.metadata}</span>
                  </div>
                </div>
                <div className="col-members">
                  <span className="member-count">{faction.memberCount}</span>
                </div>
                <div className="col-treasury">
                  <span className="treasury-value">{parseFloat(faction.treasury).toFixed(4)} ETH</span>
                </div>
                <div className="col-founder">
                  <span className="founder-address">{faction.founder.slice(0, 6)}...{faction.founder.slice(-4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="leaderboard-footer">
        <span>Data fetched from Base Sepolia • {stats?.lastUpdated ? formatDate(stats.lastUpdated) : 'Loading...'}</span>
        <button className="refresh-btn" onClick={fetchLeaderboardData}>↻ REFRESH</button>
      </div>
    </div>
  )
}

const CLASS_IDS: Record<string, number> = { Void: 0, Settler: 1, Builder: 2, Architect: 3, Genesis: 4 }
const CLASS_EMOJIS: Record<number, string> = { 0: '○', 1: '●', 2: '■', 3: '▲', 4: '◆' }

export default Leaderboard
