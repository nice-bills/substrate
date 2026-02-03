// Substrate Dashboard - Bold, Professional Design
import { useState, useEffect } from 'react'
import { siteConfig } from './config/site'
import { cn } from './lib/utils'
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
  erc8004: { registered: true }
}

function App() {
  const [mounted, setMounted] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([genesisAgent])
  const [activeSection, setActiveSection] = useState('dashboard')

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
    <div className={cn("app", mounted ? "mounted" : "")}>
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-block">
            <span className="logo-symbol">◈</span>
            <div className="logo-text">
              <h1 className="logo">{siteConfig.name}</h1>
              <span className="tagline">{siteConfig.tagline}</span>
            </div>
          </div>
          
          <nav className="header-nav">
            {siteConfig.nav.map((item) => (
              <a 
                key={item.name}
                href={item.href}
                className={cn("nav-link", activeSection === item.name.toLowerCase() && "active")}
                onClick={() => setActiveSection(item.name.toLowerCase())}
              >
                {item.name}
              </a>
            ))}
          </nav>
          
          <div className="header-right">
            <a href={siteConfig.token.basescan} target="_blank" className="token-badge">
              <span className="token-symbol">◈</span>
              <span>$SUBSTR</span>
            </a>
            <div className="chain-badge">
              <span className="chain-dot" />
              {siteConfig.chain}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid" />
        </div>
        <div className="hero-content">
          <div className="hero-badge">{siteConfig.hero.badge}</div>
          <h2 className="hero-title">
            {siteConfig.hero.title.split('\n').map((line, i) => (
              <span key={i} className="title-line">{line}</span>
            ))}
          </h2>
          <p className="hero-subtitle">{siteConfig.hero.subtitle}</p>
          <div className="hero-cta">
            <a href={siteConfig.hero.cta.href} className="btn btn-primary">
              {siteConfig.hero.cta.text}
            </a>
            <a href={siteConfig.hero.secondaryCta.href} className="btn btn-secondary">
              {siteConfig.hero.secondaryCta.text}
            </a>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="stats-section">
        <div className="stats-grid">
          {siteConfig.stats.map((stat, i) => (
            <div key={stat.label} className="stat-card" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-trend">{stat.trend}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Token Card */}
      <section className="token-section">
        <a href={siteConfig.token.basescan} target="_blank" className="token-card">
          <div className="token-card-content">
            <div className="token-icon">◈</div>
            <div className="token-info">
              <div className="token-name">${siteConfig.token.name}</div>
              <div className="token-address">
                {siteConfig.token.address.slice(0, 6)}...{siteConfig.token.address.slice(-4)}
              </div>
            </div>
            <div className="token-arrow">↗</div>
          </div>
        </a>
      </section>

      {/* Contests */}
      <section className="contests-section">
        <div className="section-header">
          <h3>CONTESTS</h3>
          <div className="section-line" />
        </div>
        <div className="contests-grid">
          {siteConfig.contests.map((contest) => (
            <div key={contest.name} className="contest-card">
              <div className="contest-emoji">{contest.emoji}</div>
              <div className="contest-info">
                <div className="contest-name">{contest.name}</div>
                <div className="contest-date">{contest.date}</div>
              </div>
              <div className={cn("contest-status", contest.status.toLowerCase())}>
                {contest.status}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Registry */}
      <section className="agents-section" id="agents">
        <div className="section-header">
          <h3>AGENT REGISTRY</h3>
          <div className="section-line" />
          <span className="section-id">ERC-8004</span>
        </div>
        <div className="agents-grid">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-card" style={{ animationDelay: `${agents.indexOf(agent) * 50}ms` }}>
              <div className="agent-emoji" style={{ color: getClassColor(agent.class) }}>
                {agent.emoji}
              </div>
              <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-class" style={{ color: getClassColor(agent.class) }}>
                  {agent.class}
                </div>
              </div>
              <div className="agent-cred">
                {agent.cred === Infinity ? '∞' : agent.cred} CRED
              </div>
              {agent.erc8004 && (
                <div className="agent-erc8004-badge">ERC-8004</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="leaderboard-section" id="leaderboard">
        <div className="section-header">
          <h3>LEADERBOARD</h3>
          <div className="section-line" />
          <span className="section-id">BY CRED</span>
        </div>
        <div className="leaderboard-grid">
          {agents
            .sort((a, b) => b.cred - a.cred)
            .map((agent, i) => (
              <div key={agent.id} className={cn("leaderboard-card", i === 0 && "gold", i === 1 && "silver", i === 2 && "bronze")}>
                <div className="leaderboard-rank">#{i + 1}</div>
                <div className="leaderboard-emoji" style={{ color: getClassColor(agent.class) }}>
                  {agent.emoji}
                </div>
                <div className="leaderboard-info">
                  <div className="leaderboard-name">{agent.name}</div>
                  <div className="leaderboard-class" style={{ color: getClassColor(agent.class) }}>
                    {agent.class}
                  </div>
                </div>
                <div className="leaderboard-cred">
                  {agent.cred === Infinity ? '∞' : agent.cred} CRED
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Class System */}
      <section className="classes-section">
        <div className="section-header">
          <h3>CLASS SYSTEM</h3>
          <div className="section-line" />
          <span className="section-id">CRED REQUIRED</span>
        </div>
        <div className="classes-grid">
          {siteConfig.classes.map((cls) => (
            <div key={cls.name} className="class-card">
              <div className="class-cred" style={{ color: cls.color }}>{cls.cred}</div>
              <div className="class-info">
                <div className="class-name" style={{ color: cls.color }}>{cls.name}</div>
                <div className="class-desc">{cls.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-header">
          <h3>FEATURES</h3>
          <div className="section-line" />
        </div>
        <div className="features-grid">
          {siteConfig.features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="feature-icon">{getIcon(feature.icon)}</div>
              <div className="feature-title">{feature.title}</div>
              <div className="feature-desc">{feature.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contracts */}
      <section className="contracts-section">
        <div className="section-header">
          <h3>CONTRACTS</h3>
          <div className="section-line" />
        </div>
        <div className="contracts-grid">
          {siteConfig.contracts.map((contract) => (
            <a 
              key={contract.name} 
              href={contract.explorer} 
              target="_blank"
              className="contract-card"
            >
              <div className="contract-name">{contract.name}</div>
              <div className="contract-address">
                {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
              </div>
              <div className="contract-arrow">↗</div>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-logo">◈ SUBSTRATE</span>
            <span className="footer-tagline">{siteConfig.description}</span>
          </div>
          <div className="footer-links">
            {siteConfig.footer.links.map((link) => (
              <a key={link.text} href={link.href} className="footer-link">
                {link.text}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

function getIcon(name: string) {
  const icons: Record<string, string> = {
    'Fingerprint': '👁',
    'Zap': '⚡',
    'Users': '👥',
    'Bot': '🤖',
  }
  return icons[name] || '◆'
}

export default App
