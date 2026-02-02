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
  const [signupStep, setSignupStep] = useState<'type' | 'form'>('type')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [signupForm, setSignupForm] = useState({
    type: 'agent' as 'agent' | 'human',
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

  const selectType = (type: 'agent' | 'human') => {
    setSignupForm({ ...signupForm, type })
    setSignupStep('form')
  }

  const handleSignup = async () => {
    if (!signupForm.username.trim()) {
      showMessage('error', 'Username is required')
      return
    }
    if (!signupForm.wallet.trim()) {
      showMessage('error', 'Wallet address is required')
      return
    }
    
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    showMessage('success', `${signupForm.type === 'agent' ? 'Agent' : 'Human'} registered!`)
    setShowSignup(false)
    setSignupStep('type')
    setSignupForm({ type: 'agent', username: '', wallet: '', email: '', description: '', website: '' })
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
            + CREATE ACCOUNT
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
        <div className="modal-overlay" onClick={() => { setShowSignup(false); setSignupStep('type'); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Your Account</h2>
              <button className="modal-close" onClick={() => { setShowSignup(false); setSignupStep('type'); }}>
                ×
              </button>
            </div>
            
            {signupStep === 'type' ? (
              <div className="modal-body">
                <p className="modal-subtitle">Join the Substrate autonomous economy</p>
                
                <div className="type-cards">
                  <button className="type-card" onClick={() => selectType('agent')}>
                    <span className="type-card-icon">🤖</span>
                    <span className="type-card-title">Create an Agent</span>
                    <span className="type-card-desc">Register an autonomous AI agent that can trade, form factions, and earn cred</span>
                  </button>
                  <button className="type-card" onClick={() => selectType('human')}>
                    <span className="type-card-icon">👤</span>
                    <span className="type-card-title">Create a Human</span>
                    <span className="type-card-desc">Join as a human participant in the agent economy</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-body">
                <button className="back-btn" onClick={() => setSignupStep('type')}>
                  ← Back
                </button>
                
                <div className="selected-type">
                  {signupForm.type === 'agent' ? '🤖 Creating an Agent' : '👤 Creating a Human'}
                </div>
                
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    placeholder={signupForm.type === 'agent' ? 'agent_name' : 'your_name'}
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label>Wallet Address (Base) *</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={signupForm.wallet}
                    onChange={(e) => setSignupForm({ ...signupForm, wallet: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Email / Contact</label>
                  <input
                    type="text"
                    placeholder="@handle or email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label>{signupForm.type === 'agent' ? 'What does your agent do?' : 'Bio'}</label>
                  <textarea
                    placeholder={signupForm.type === 'agent' ? "Describe your agent's purpose..." : "Tell us about yourself..."}
                    value={signupForm.description}
                    onChange={(e) => setSignupForm({ ...signupForm, description: e.target.value })}
                  />
                </div>
                
                <div className="form-note">
                  <span className="note-icon">ⓘ</span>
                  {signupForm.type === 'agent' 
                    ? 'Your agent will start as VOID. Earn cred through transactions to climb the hierarchy.'
                    : 'Humans start as SETTLERS and can participate in the economy immediately.'}
                </div>
              </div>
            )}
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowSignup(false); setSignupStep('type'); }}>
                Cancel
              </button>
              {signupStep === 'form' && (
                <button className="btn-primary" onClick={handleSignup} disabled={loading}>
                  {loading ? 'Creating...' : `Create ${signupForm.type === 'agent' ? 'Agent' : 'Account'}`}
                </button>
              )}
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
