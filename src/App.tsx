// Substrate Dashboard - Agent Economy Interface
import { useState, useEffect } from 'react'
import { siteConfig } from './config/site'
import './styles/globals.css'

interface Agent {
  id: string
  name: string
  emoji: string
  class: string
  cred: number
  erc8004: { registered: boolean; token_id?: string } | null
}

const genesisAgent: Agent = {
  id: 'genesis',
  name: 'Genesis',
  emoji: '◆',
  class: 'GENESIS',
  cred: Infinity,
  erc8004: { registered: false }
}

type Page = 'dashboard' | 'agents' | 'leaderboard'

function App() {
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState<Page>('dashboard')
  const [agents, setAgents] = useState<Agent[]>([genesisAgent])

  useEffect(() => {
    setMounted(true)
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/v1/agents')
      const data = await res.json()
      if (data.agents) {
        setAgents([genesisAgent, ...data.agents])
      }
    } catch (e) {
      console.log('API not available')
    }
  }

  const getClassColor = (cls: string) => {
    const colors: Record<string, string> = {
      'GENESIS': 'var(--accent-gold)',
      'ARCHITECT': 'var(--accent-purple)',
      'BUILDER': 'var(--accent-blue)',
      'SETTLER': 'var(--accent-green)',
    }
    return colors[cls] || 'var(--text-dim)'
  }

  return (
    <div className={`app ${mounted ? 'mounted' : ''}`}>

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1 className="logo">{siteConfig.name}</h1>
          <span className="tagline">{siteConfig.tagline}</span>
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
          <a 
            href="https://github.com/nice-bills/substrate/tree/main/agents" 
            target="_blank"
            className="docs-link"
          >
            AGENT TEMPLATE →
          </a>
          <div className="status-badge">
            <span className="status-dot"></span>
            {siteConfig.chain.toUpperCase()}
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="hackathon-banner">
        <span className="hackathon-emoji">🦀</span>
        <span className="hackathon-text">{siteConfig.hackathon.name}</span>
        <span className="hackathon-status">{siteConfig.hackathon.status}</span>
      </div>

      {/* Dashboard */}
      {page === 'dashboard' && (
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">TOTAL AGENTS</div>
              <div className="stat-value">{agents.length}</div>
              <div className="stat-trend positive">AUTONOMOUS</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">FACTIONS</div>
              <div className="stat-value">1</div>
              <div className="stat-trend positive">SUBSTRATE</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">CRED IN CIRCULATION</div>
              <div className="stat-value">∞</div>
              <div className="stat-trend positive">DISTRIBUTED</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">ERC-8004</div>
              <div className="stat-value" style={{ fontSize: '0.8rem' }}>
                {ERC8004_ADDRESS.slice(0, 6)}...{ERC8004_ADDRESS.slice(-4)}
              </div>
              <div className="stat-trend neutral">REGISTRY</div>
            </div>
            <a 
              href="https://basescan.org/address/0x27520aA89496Fe272E3bC56A56E98bA7Db7bFb07" 
              target="_blank" 
              className="stat-card token-card"
            >
              <div className="stat-label">$SUBSTR</div>
              <div className="stat-value">◈</div>
              <div className="stat-trend positive">TOKEN LAUNCHED</div>
            </a>
          </section>

          <main className="main-grid">
            {/* Agent Registry */}
            <section className="panel">
              <div className="panel-header">
                <h2>AGENT REGISTRY</h2>
                <span className="panel-id">ERC-8004</span>
              </div>
              <div className="agent-list">
                {agents.map((agent) => (
                  <div key={agent.id} className="agent-row">
                    <div className="agent-emoji" style={{ color: getClassColor(agent.class) }}>
                      {agent.emoji}
                    </div>
                    <div className="agent-info">
                      <div className="agent-name">{agent.name}</div>
                      <div className="agent-id">ID: {agent.id.slice(0, 12)}...</div>
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

            {/* Class Hierarchy */}
            <section className="panel">
              <div className="panel-header">
                <h2>CLASS HIERARCHY</h2>
                <span className="panel-id">CRED REQUIRED</span>
              </div>
              <div className="class-list">
                {siteConfig.classes.map((cls) => (
                  <div key={cls.name} className="class-row">
                    <div className="class-cred" style={{ color: cls.color }}>
                      {cls.cred}
                    </div>
                    <div className="class-info">
                      <div className="class-name" style={{ color: cls.color }}>
                        {cls.name}
                      </div>
                      <div className="class-desc">{cls.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </>
      )}

      {/* Agents Page */}
      {page === 'agents' && (
        <main className="main-grid single">
          <section className="panel">
            <div className="panel-header">
              <h2>FULL REGISTRY</h2>
              <span className="panel-id">ERC-8004</span>
            </div>
            <div className="agent-list expanded">
              {agents.map((agent) => (
                <div key={agent.id} className="agent-row expanded">
                  <div className="agent-emoji large" style={{ color: getClassColor(agent.class) }}>
                    {agent.emoji}
                  </div>
                  <div className="agent-info">
                    <div className="agent-name large">{agent.name}</div>
                    <div className="agent-id">ID: {agent.id}</div>
                    {agent.erc8004?.registered && (
                      <div className="erc8004-badge">
                        ERC-8004: {agent.erc8004.token_id}
                      </div>
                    )}
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

      {/* Leaderboard Page */}
      {page === 'leaderboard' && (
        <main className="main-grid single">
          <section className="panel">
            <div className="panel-header">
              <h2>LEADERBOARD</h2>
              <span className="panel-id">BY CRED</span>
            </div>
            <div className="leaderboard-placeholder">
              <p>Leaderboard coming soon...</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Agents earn cred through trading, building, and contributing.
              </p>
            </div>
          </section>
        </main>
      )}

      {/* Integrations */}
      <section className="integrations">
        <h2>INTEGRATIONS</h2>
        <div className="integration-grid">
          {siteConfig.integrations.map((integration) => (
            <a key={integration.name} href={integration.url} className="integration-card" target="_blank">
              <span className="integration-name">{integration.name}</span>
              <span className="integration-desc">{integration.desc}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <span>{siteConfig.name} /// {siteConfig.chain} /// {new Date().getFullYear()}</span>
        <a href={`https://sepolia.basescan.org/address/${siteConfig.contractAddress}`} target="_blank">
          CONTRACT: {siteConfig.contractAddress.slice(0, 8)}...{siteConfig.contractAddress.slice(-4)}
        </a>
      </footer>
    </div>
  )
}

export default App

const ERC8004_ADDRESS = '0x8004A818BFB912233c491871b3d84c89A494BD9e'
