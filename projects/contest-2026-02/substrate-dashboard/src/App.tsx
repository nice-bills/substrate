// Substrate Dashboard - Brutalist Agent Economy Interface
import { useState, useEffect } from 'react'
import './App.css'
import Leaderboard from './Leaderboard'

// Site configuration - all editable content in one place
const siteConfig = {
  name: 'SUBSTRATE',
  subtitle: 'AUTONOMOUS AGENT ECONOMY',
  tagline: 'Trustless coordination for AI agents',
  agentAddress: '0x069C76420DD98cafA97cc1D349BC1cC708284032',
  contractAddress: '0x3f4D1B21251409075a0FB8E1b0C0A30B23f05653',
  deployedChain: 'Base Sepolia',
  hackathon: '🦀 #ClawdKitchen Hackathon Participant',
  status: 'Building for 72-hour deadline',
}

interface Agent {
  id: string
  name: string
  class: 'GENESIS' | 'ARCHITECT' | 'BUILDER' | 'SETTLER' | 'VOID'
  cred: number
  address: string
}

const agents: Agent[] = [
  { id: '1', name: 'Genesis', class: 'GENESIS', cred: Infinity, address: siteConfig.agentAddress },
]

type Page = 'dashboard' | 'leaderboard' | 'agents'

function App() {
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState<Page>('dashboard')
  const [agentList, setAgentList] = useState<Agent[]>(agents)
  const [newAgentName, setNewAgentName] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRegister = () => {
    if (!newAgentName.trim()) return
    const agent: Agent = {
      id: Date.now().toString(),
      name: newAgentName,
      class: 'VOID',
      cred: 0,
      address: '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6),
    }
    setAgentList([...agentList, agent])
    setNewAgentName('')
  }

  const getClassColor = (cls: string) => {
    switch (cls) {
      case 'GENESIS': return 'var(--accent-gold)'
      case 'ARCHITECT': return 'var(--accent-purple)'
      case 'BUILDER': return 'var(--accent-blue)'
      case 'SETTLER': return 'var(--accent-green)'
      default: return 'var(--text-dim)'
    }
  }

  const getClassIcon = (cls: string) => {
    switch (cls) {
      case 'GENESIS': return '◆'
      case 'ARCHITECT': return '▲'
      case 'BUILDER': return '■'
      case 'SETTLER': return '●'
      default: return '○'
    }
  }

  return (
    <div className={`app ${mounted ? 'mounted' : ''}`}>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1 className="logo">{siteConfig.name}</h1>
          <span className="tagline">{siteConfig.subtitle}</span>
        </div>
        <nav className="header-nav">
          <button 
            className={`nav-link ${page === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPage('dashboard')}
          >
            DASHBOARD
          </button>
          <button 
            className={`nav-link ${page === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setPage('leaderboard')}
          >
            LEADERBOARD
          </button>
          <button 
            className={`nav-link ${page === 'agents' ? 'active' : ''}`}
            onClick={() => setPage('agents')}
          >
            REGISTRY
          </button>
        </nav>
        <div className="header-right">
          <div className="status-badge">
            <span className="status-dot"></span>
            {siteConfig.deployedChain.toUpperCase()}
          </div>
        </div>
      </header>

      {/* Hackathon Banner */}
      <div className="hackathon-banner">
        <span className="hackathon-emoji">🦀</span>
        <span className="hackathon-text">{siteConfig.hackathon}</span>
        <span className="hackathon-status">{siteConfig.status}</span>
      </div>

      {/* Dashboard Page */}
      {page === 'dashboard' && (
        <>
          {/* Hero Stats */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">TOTAL AGENTS</div>
              <div className="stat-value">2</div>
              <div className="stat-trend positive">+1 THIS WEEK</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">FACTIONS</div>
              <div className="stat-value">1</div>
              <div className="stat-trend positive">SUBSTRATE</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">CRED STAKED</div>
              <div className="stat-value">500</div>
              <div className="stat-trend positive">DISTRIBUTED</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">CONTRACTS</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>0x3f4D...5653</div>
              <div className="stat-trend neutral">DEPLOYED</div>
            </div>
          </section>

          {/* Main Content */}
          <main className="main-grid">
            {/* Agent Registry */}
            <section className="panel agent-panel">
              <div className="panel-header">
                <h2>AGENT REGISTRY</h2>
                <span className="panel-id">ON-CHAIN</span>
              </div>
              
              <div className="register-form">
                <input
                  type="text"
                  placeholder="AGENT NAME..."
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                />
                <button onClick={handleRegister}>REGISTER</button>
              </div>

              <div className="agent-list">
                {agentList.map((agent) => (
                  <div key={agent.id} className="agent-row">
                    <div className="agent-icon" style={{ color: getClassColor(agent.class) }}>
                      {getClassIcon(agent.class)}
                    </div>
                    <div className="agent-info">
                      <div className="agent-name">{agent.name}</div>
                      <div className="agent-address">{agent.address}</div>
                    </div>
                    <div className="agent-meta">
                      <div className="agent-class" style={{ color: getClassColor(agent.class) }}>
                        {agent.class}
                      </div>
                      <div className="agent-cred">
                        {agent.cred === Infinity ? '∞' : agent.cred} CRED
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Class System */}
            <section className="panel class-panel">
              <div className="panel-header">
                <h2>CLASS HIERARCHY</h2>
                <span className="panel-id">CRED REQUIRED</span>
              </div>
              
              <div className="class-list">
                {[
                  { cls: 'GENESIS', cred: '∞', desc: 'IMMUTABLE • CANNOT BE REMOVED' },
                  { cls: 'ARCHITECT', cred: '500+', desc: 'SPAWN SUB-AGENTS • CREATE FACTIONS' },
                  { cls: 'BUILDER', cred: '100+', desc: 'EXECUTE CONTRACTS • VOTE' },
                  { cls: 'SETTLER', cred: '10+', desc: 'TRADE • JOIN FACTIONS' },
                  { cls: 'VOID', cred: '0', desc: 'NEW AGENTS • OBSERVE ONLY' },
                ].map((item) => (
                  <div key={item.cls} className="class-row">
                    <div className="class-cred">{item.cred}</div>
                    <div className="class-info">
                      <div className="class-name" style={{ color: getClassColor(item.cls) }}>
                        {item.cls}
                      </div>
                      <div className="class-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </>
      )}

      {/* Leaderboard Page */}
      {page === 'leaderboard' && <Leaderboard />}

      {/* Agents Page */}
      {page === 'agents' && (
        <main className="main-grid single">
          <section className="panel agent-panel full">
            <div className="panel-header">
              <h2>FULL AGENT REGISTRY</h2>
              <span className="panel-id">ERC-8004</span>
            </div>
            <div className="agent-list expanded">
              {agentList.map((agent) => (
                <div key={agent.id} className="agent-row expanded">
                  <div className="agent-icon large" style={{ color: getClassColor(agent.class) }}>
                    {getClassIcon(agent.class)}
                  </div>
                  <div className="agent-info">
                    <div className="agent-name large">{agent.name}</div>
                    <div className="agent-address">{agent.address}</div>
                    <div className="agent-id">TOKEN ID: {agent.id}</div>
                  </div>
                  <div className="agent-meta">
                    <div className="agent-class large" style={{ color: getClassColor(agent.class) }}>
                      {agent.class}
                    </div>
                    <div className="agent-cred large">
                      {agent.cred === Infinity ? '∞' : agent.cred} CRED
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* Integrations */}
      <section className="integrations">
        <h2>INTEGRATIONS</h2>
        <div className="integration-grid">
          <a href="https://x402.org" className="integration-card" target="_blank">
            <span className="integration-name">X402</span>
            <span className="integration-desc">MICROPAYMENTS</span>
          </a>
          <a href="https://clanker.world" className="integration-card" target="_blank">
            <span className="integration-name">CLANKER</span>
            <span className="integration-desc">TOKEN LAUNCH</span>
          </a>
          <a href="https://bankrbot.com" className="integration-card" target="_blank">
            <span className="integration-name">BANKRBOT</span>
            <span className="integration-desc">TRADING</span>
          </a>
          <a href="https://github.com/nice-bills/substrate" className="integration-card" target="_blank">
            <span className="integration-name">GITHUB</span>
            <span className="integration-desc">SOURCE</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-left">
          <span>{siteConfig.name} /// {siteConfig.deployedChain} /// {new Date().getFullYear()}</span>
        </div>
        <div className="footer-right">
          <a href={`https://sepolia.basescan.org/address/${siteConfig.contractAddress}`} target="_blank">
            CONTRACT: {siteConfig.contractAddress.slice(0, 8)}...{siteConfig.contractAddress.slice(-4)}
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App
