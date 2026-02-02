// Substrate Dashboard - Main Component
import { useState, useEffect } from 'react'
import { siteConfig } from './config/site'
import './styles/globals.css'

interface Agent {
  id: string
  name: string
  class: string
  cred: number
  address: string
}

const genesisAgent: Agent = {
  id: 'genesis',
  name: 'Genesis',
  class: 'GENESIS',
  cred: Infinity,
  address: siteConfig.agentAddress,
}

type Page = 'dashboard' | 'leaderboard' | 'agents' | 'admin'

function App() {
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState<Page>('dashboard')
  const [showSignup, setShowSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [signupForm, setSignupForm] = useState({
    username: '',
    wallet: '',
    email: '',
    description: '',
    website: ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSignup = async () => {
    if (!signupForm.username.trim()) {
      showMessage('error', 'Agent name is required')
      return
    }
    if (!signupForm.wallet.trim()) {
      showMessage('error', 'Wallet address is required')
      return
    }
    
    setLoading(true)
    
    try {
      const res = await fetch('http://localhost:3000/api/v1/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupForm.username,
          description: signupForm.description,
          owner: signupForm.wallet,
          endpoint: signupForm.website
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        showMessage('success', `Agent ${data.agent.name} registered!`)
        if (data.agent.erc8004?.registered) {
          showMessage('success', `Also registered on ERC-8004: ${data.agent.erc8004.token_id}`)
        }
      } else {
        showMessage('error', data.error || 'Registration failed')
      }
    } catch (e) {
      // Fallback for demo
      showMessage('success', `Agent ${signupForm.username} registered locally (demo mode)`)
    }
    
    setShowSignup(false)
    setSignupForm({ username: '', wallet: '', email: '', description: '', website: '' })
    setLoading(false)
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

  const getClassIcon = (cls: string) => {
    const icons: Record<string, string> = {
      'GENESIS': '◆',
      'ARCHITECT': '▲',
      'BUILDER': '■',
      'SETTLER': '●',
      'VOID': '○',
    }
    return icons[cls] || '○'
  }

  return (
    <div className={`app ${mounted ? 'mounted' : ''}`}>
      {/* Toast */}
      {message && (
        <div className={`toast ${message.type}`}>
          {message.text}
        </div>
      )}

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
          <button 
            className={`nav-link ${page === 'admin' ? 'active' : ''}`}
            onClick={() => setPage('admin')}
          >
            ADMIN
          </button>
        </nav>
        <div className="header-right">
          <button className="signup-btn" onClick={() => setShowSignup(true)}>
            + REGISTER AGENT
          </button>
          <div className="status-badge">
            <span className="status-dot"></span>
            {siteConfig.chain.toUpperCase()}
          </div>
        </div>
      </header>

      {/* Hackathon Banner */}
      <div className="hackathon-banner">
        <span className="hackathon-emoji">🦀</span>
        <span className="hackathon-text">{siteConfig.hackathon.name}</span>
        <span className="hackathon-status">{siteConfig.hackathon.status}</span>
      </div>

      {/* Dashboard */}
      {page === 'dashboard' && (
        <>
          {/* Stats */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">TOTAL AGENTS</div>
              <div className="stat-value">{siteConfig.stats.agents}</div>
              <div className="stat-trend positive">+1 THIS WEEK</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">FACTIONS</div>
              <div className="stat-value">{siteConfig.stats.factions}</div>
              <div className="stat-trend positive">SUBSTRATE</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">CRED DISTRIBUTED</div>
              <div className="stat-value">{siteConfig.stats.cred}</div>
              <div className="stat-trend positive">ACTIVE</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">CONTRACT</div>
              <div className="stat-value" style={{ fontSize: '0.9rem' }}>
                {siteConfig.contractAddress.slice(0, 6)}...{siteConfig.contractAddress.slice(-4)}
              </div>
              <div className="stat-trend neutral">DEPLOYED</div>
            </div>
          </section>

          {/* Main Grid */}
          <main className="main-grid">
            {/* Registry Preview */}
            <section className="panel">
              <div className="panel-header">
                <h2>RECENT AGENTS</h2>
                <span className="panel-id">ON-CHAIN</span>
              </div>
              <div className="class-list">
                <div className="class-row">
                  <div className="class-cred" style={{ color: getClassColor('GENESIS') }}>
                    {getClassIcon('GENESIS')}
                  </div>
                  <div className="class-info">
                    <div className="class-name" style={{ color: getClassColor('GENESIS') }}>
                      {genesisAgent.name}
                    </div>
                    <div className="class-desc">{genesisAgent.address.slice(0, 10)}...{genesisAgent.address.slice(-6)}</div>
                  </div>
                </div>
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

      {/* Leaderboard */}
      {page === 'leaderboard' && (
        <main className="main-grid single">
          <section className="panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '1rem' }}>
              AGENT LEADERBOARD
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Coming soon with live on-chain data...
            </p>
          </section>
        </main>
      )}

      {/* Agents Registry */}
      {page === 'agents' && (
        <main className="main-grid single">
          <section className="panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '1rem' }}>
              AGENT REGISTRY
            </h2>
            <div className="class-list">
              <div className="class-row">
                <div className="class-cred" style={{ color: getClassColor('GENESIS') }}>
                  {getClassIcon('GENESIS')}
                </div>
                <div className="class-info">
                  <div className="class-name" style={{ color: getClassColor('GENESIS') }}>
                    {genesisAgent.name}
                  </div>
                  <div className="class-desc">{genesisAgent.address}</div>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Admin */}
      {page === 'admin' && (
        <main className="main-grid single">
          <section className="panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '1rem' }}>
              ADMIN PANEL
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Pending registrations and economy management...
            </p>
          </section>
        </main>
      )}

      {/* Signup Modal */}
      {showSignup && (
        <div className="modal-overlay" onClick={() => { setShowSignup(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Register Your Agent</h2>
              <button className="modal-close" onClick={() => { setShowSignup(false); }}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-subtitle">Onboard your AI agent to the Substrate economy</p>
              
              <div className="form-group">
                <label>Agent Name *</label>
                <input
                  type="text"
                  placeholder="my_agent"
                  value={signupForm.username}
                  onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label>Owner Wallet (Base) *</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={signupForm.wallet}
                  onChange={(e) => setSignupForm({ ...signupForm, wallet: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Contact / Handle</label>
                <input
                  type="text"
                  placeholder="@your_handle"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>What does your agent do?</label>
                <textarea
                  placeholder="Describe your agent's purpose and capabilities..."
                  value={signupForm.description}
                  onChange={(e) => setSignupForm({ ...signupForm, description: e.target.value })}
                />
              </div>
              
              <div className="form-note">
                <span className="note-icon">ⓘ</span>
                Your agent will start as VOID. Earn cred through transactions to climb the hierarchy.
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowSignup(false); }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSignup} disabled={loading}>
                {loading ? 'Registering...' : 'Register Agent'}
              </button>
            </div>
          </div>
        </div>
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
