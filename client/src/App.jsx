import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'

const API = 'https://salesradar-production-6013.up.railway.app'

const SIGNAL_LABELS = {
  expansion:   'Market Expansion',
  investment:  'Investment Activity',
  hiring:      'Talent Acquisition',
  technology:  'Technology Adoption',
  partnership: 'Partnership Activity'
}

const SIGNAL_DESCRIPTIONS = {
  expansion:   'Company is scaling operations or entering new markets',
  investment:  'Recent funding rounds, capital activity, or major budget signals',
  hiring:      'Significant recruitment or workforce growth detected',
  technology:  'Digital transformation or technology adoption underway',
  partnership: 'New partnerships, deals, or acquisitions in progress'
}

const priorityConfig = {
  Hot:  { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
  Warm: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
  Cool: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)'  },
  Cold: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' },
}

const sentimentConfig = {
  positive: { color: '#10b981', label: 'Positive' },
  negative: { color: '#ef4444', label: 'Negative' },
  neutral:  { color: '#6b7280', label: 'Neutral'  },
}

// Animated score gauge
function ScoreGauge({ score, size = 130 }) {
  const [displayed, setDisplayed] = useState(0)
  const r = 54
  const circumference = 2 * Math.PI * r
  const color = displayed >= 70 ? '#10b981' : displayed >= 50 ? '#f59e0b' : displayed >= 30 ? '#3b82f6' : '#6b7280'
  const offset = circumference - (displayed / 100) * circumference

  useEffect(() => {
    setDisplayed(0)
    const step = score / 40
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= score) { setDisplayed(score); clearInterval(timer) }
      else setDisplayed(Math.round(current))
    }, 20)
    return () => clearInterval(timer)
  }, [score])

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1a2235" strokeWidth="8" />
      <circle
        cx="60" cy="60" r={r}
        fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s' }}
      />
      <text x="60" y="56" textAnchor="middle" fill="#f8fafc" fontSize="24" fontWeight="700">{displayed}</text>
      <text x="60" y="72" textAnchor="middle" fill="#475569" fontSize="10" letterSpacing="1">SCORE</text>
    </svg>
  )
}

// Skeleton loading card
function SkeletonCard() {
  return (
    <div style={{
      background: '#0c1220', border: '1px solid #1a2235',
      borderRadius: '12px', padding: '28px 32px',
      display: 'flex', gap: '32px', alignItems: 'flex-start'
    }}>
      <div style={{
        width: '130px', height: '130px', borderRadius: '50%',
        background: 'linear-gradient(90deg, #1a2235 25%, #1e293b 50%, #1a2235 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite', flexShrink: 0
      }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ height: '28px', width: '200px', borderRadius: '6px', background: '#1a2235', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ height: '16px', width: '280px', borderRadius: '4px', background: '#1a2235', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          {[100, 80, 120, 90].map((w, i) => (
            <div key={i} style={{ height: '24px', width: `${w}px`, borderRadius: '4px', background: '#1a2235', animation: 'shimmer 1.5s infinite' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonSignals() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{
          background: '#0c1220', border: '1px solid #1a2235',
          borderRadius: '8px', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <div style={{ height: '16px', width: '140px', borderRadius: '4px', background: '#1a2235', animation: 'shimmer 1.5s infinite' }} />
          <div style={{ height: '12px', width: '90%', borderRadius: '4px', background: '#1a2235', animation: 'shimmer 1.5s infinite' }} />
          <div style={{ height: '12px', width: '70%', borderRadius: '4px', background: '#1a2235', animation: 'shimmer 1.5s infinite' }} />
        </div>
      ))}
    </div>
  )
}

function PushToSalesforce({ result }) {
  const [status, setPushStatus] = useState(null)
  const [pushing, setPushing] = useState(false)

  const push = async () => {
    setPushing(true)
    setPushStatus(null)
    try {
      const res = await axios.post(`${API}/api/push-to-salesforce`, {
        company:   result.company,
        score:     result.score,
        priority:  result.priority,
        sentiment: result.sentiment,
        signals:   result.signals,
        keywords:  result.keywords
      })
      setPushStatus({ success: true, url: res.data.salesforceUrl, message: res.data.message })
    } catch (e) {
      setPushStatus({ success: false, message: e.response?.data?.error || 'Push failed' })
    }
    setPushing(false)
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <button onClick={push} disabled={pushing} style={{
        background: pushing ? '#0f1929' : '#0070d2',
        border: '1px solid #0070d2', borderRadius: '6px',
        padding: '8px 18px', color: pushing ? '#475569' : 'white',
        fontSize: '13px', fontWeight: '600',
        cursor: pushing ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px',
        transition: 'all 0.15s'
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {pushing ? 'Pushing...' : 'Push to Salesforce'}
      </button>
      {status && (
        <div style={{
          marginTop: '10px', padding: '10px 14px', borderRadius: '6px',
          background: status.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${status.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          fontSize: '13px', color: status.success ? '#10b981' : '#f87171',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {status.message}
          {status.success && status.url && (
            <a href={status.url} target="_blank" rel="noreferrer" style={{
              color: '#3b82f6', fontSize: '12px', marginLeft: '4px'
            }}>View in Salesforce</a>
          )}
        </div>
      )}
    </div>
  )
}

function SignalsGrid({ signals }) {
  if (!signals || signals.length === 0) {
    return (
      <div style={{
        background: '#0c1220', border: '1px solid #1a2235',
        borderRadius: '8px', padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>—</div>
        <div style={{ fontSize: '13px', color: '#334155' }}>No buying signals detected in recent coverage</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
      {signals.map((signal, idx) => (
        <div key={signal.type} style={{
          background: '#0c1220', border: '1px solid #1a2235',
          borderRadius: '8px', padding: '16px',
          animation: `fadeUp 0.4s ease ${idx * 0.08}s both`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: '600', fontSize: '13px', color: '#e2e8f0' }}>
              {SIGNAL_LABELS[signal.type]}
            </span>
            <span style={{
              background: signal.strength === 'Strong' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
              color: signal.strength === 'Strong' ? '#10b981' : '#3b82f6',
              border: `1px solid ${signal.strength === 'Strong' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}`,
              padding: '2px 8px', borderRadius: '4px',
              fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em'
            }}>{signal.strength.toUpperCase()}</span>
          </div>
          <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px', lineHeight: '1.5' }}>
            {SIGNAL_DESCRIPTIONS[signal.type]}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {signal.evidence.map(e => (
              <span key={e} style={{
                background: '#0f1929', border: '1px solid #1a2235',
                padding: '2px 8px', borderRadius: '4px',
                fontSize: '11px', color: '#3b82f6', fontFamily: 'monospace'
              }}>{e}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ArticlesList({ articles }) {
  if (!articles || articles.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {articles.map((article, i) => (
        <a key={i} href={article.url} target="_blank" rel="noreferrer" style={{
          background: '#0c1220', border: '1px solid #1a2235',
          borderRadius: '8px', padding: '14px 16px',
          textDecoration: 'none', color: 'inherit', display: 'block',
          transition: 'border-color 0.15s',
          animation: `fadeUp 0.4s ease ${i * 0.06}s both`
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#2d3f55'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#1a2235'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', marginBottom: '4px', lineHeight: '1.4' }}>
                {article.title}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                {article.description?.slice(0, 120)}...
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: '90px', flexShrink: 0 }}>
              <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600', marginBottom: '2px' }}>
                {article.source}
              </div>
              <div style={{ fontSize: '11px', color: '#334155' }}>
                {new Date(article.publishedAt).toLocaleDateString('en-CA')}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '11px', color: '#334155', letterSpacing: '0.1em',
      fontWeight: '600', marginBottom: '10px'
    }}>{children}</div>
  )
}

function CompareCard({ result, isWinner }) {
  const pc = priorityConfig[result.priority] || priorityConfig.Cold
  const sc = sentimentConfig[result.sentiment] || sentimentConfig.neutral

  return (
    <div style={{
      background: '#0c1220',
      border: `1px solid ${isWinner ? 'rgba(16,185,129,0.3)' : '#1a2235'}`,
      borderRadius: '12px', padding: '24px', flex: 1,
      position: 'relative', minWidth: 0,
      animation: 'fadeUp 0.5s ease both'
    }}>
      {isWinner && (
        <div style={{
          position: 'absolute', top: '-11px', left: '50%',
          transform: 'translateX(-50%)',
          background: '#10b981', color: 'white',
          fontSize: '10px', fontWeight: '700',
          padding: '3px 10px', borderRadius: '20px',
          letterSpacing: '0.08em', whiteSpace: 'nowrap'
        }}>TOP PRIORITY</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>{result.company}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
              padding: '2px 8px', borderRadius: '4px',
              fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em'
            }}>{result.priority?.toUpperCase()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.color }} />
              <span style={{ fontSize: '12px', color: sc.color }}>{sc.label}</span>
            </div>
          </div>
        </div>
        <ScoreGauge score={result.score} size={90} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '8px' }}>
          BUYING SIGNALS
        </div>
        {!result.signals || result.signals.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#334155' }}>No signals detected</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {result.signals.map(signal => (
              <div key={signal.type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', width: '130px', flexShrink: 0 }}>
                  {SIGNAL_LABELS[signal.type]}
                </div>
                <div style={{ flex: 1, height: '4px', background: '#0f1929', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: signal.strength === 'Strong' ? '100%' : '55%',
                    background: signal.strength === 'Strong' ? '#10b981' : '#3b82f6',
                    borderRadius: '2px', transition: 'width 0.8s ease'
                  }} />
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: '600',
                  color: signal.strength === 'Strong' ? '#10b981' : '#3b82f6',
                  width: '50px', textAlign: 'right'
                }}>{signal.strength}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {result.keywords?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {result.keywords.slice(0, 5).map(k => (
            <span key={k} style={{
              background: '#0f1929', border: '1px solid #1a2235',
              padding: '2px 8px', borderRadius: '4px',
              fontSize: '10px', color: '#475569'
            }}>{k}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// Typewriter effect for the hero headline
function Typewriter({ text, speed = 40 }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, ++i)) }
      else clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text])
  return <span>{displayed}<span style={{ opacity: displayed.length < text.length ? 1 : 0, color: '#3b82f6' }}>|</span></span>
}

export default function App() {
  const [mode, setMode] = useState('single')
  const [query, setQuery] = useState('')
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [result, setResult] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [analysisCount, setAnalysisCount] = useState(0)
  const inputRef = useRef(null)

  // Auto-search as you type with debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) return
    const timer = setTimeout(() => { analyze(query.trim()) }, 700)
    return () => clearTimeout(timer)
  }, [query])

  const analyze = async (company) => {
    const target = (company || query).trim()
    if (!target) return
    setLoading(true)
    setError(null)
    setResult(null)
    setCompareResult(null)
    try {
      const res = await axios.get(`${API}/api/analyze/${encodeURIComponent(target)}`)
      setResult(res.data)
      setAnalysisCount(c => c + 1)
      setHistory(prev => [
        { company: target, score: res.data.score, priority: res.data.priority },
        ...prev.filter(h => h.company !== target).slice(0, 4)
      ])
    } catch (e) {
      setError('Analysis failed. Check the company name and try again.')
    }
    setLoading(false)
  }

  const compare = async () => {
    const a = compareA.trim()
    const b = compareB.trim()
    if (!a || !b) return
    setLoading(true)
    setError(null)
    setResult(null)
    setCompareResult(null)
    try {
      const res = await axios.get(`${API}/api/compare`, {
        params: { companies: `${a},${b}` }
      })
      setCompareResult(res.data)
    } catch (e) {
      setError('Comparison failed. Check both company names and try again.')
    }
    setLoading(false)
  }

  const inputStyle = {
    background: '#0c1220', border: '1px solid #1a2235',
    borderRadius: '8px', padding: '13px 16px',
    color: '#f8fafc', fontSize: '14px', outline: 'none', width: '100%',
    transition: 'border-color 0.15s'
  }

  const tabBtn = (active) => ({
    background: active ? '#1d4ed8' : 'transparent',
    border: `1px solid ${active ? '#1d4ed8' : '#1a2235'}`,
    borderRadius: '6px', padding: '8px 20px',
    color: active ? 'white' : '#475569',
    fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.15s'
  })

  const hasResult = result && !loading
  const hasCompare = compareResult && !loading

  return (
    <div style={{ minHeight: '100vh', background: '#080d19', color: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid #0f1929', padding: '0 48px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,13,25,0.95)', backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', background: '#1d4ed8',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <span style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '-0.3px' }}>SalesRadar</span>
          <span style={{
            background: '#0f1929', border: '1px solid #1e3a5f',
            color: '#3b82f6', fontSize: '10px', fontWeight: '600',
            padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em'
          }}>BETA</span>
        </div>

        {/* Nav stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {analysisCount > 0 && (
            <div style={{ fontSize: '12px', color: '#334155' }}>
              <span style={{ color: '#f8fafc', fontWeight: '600' }}>{analysisCount}</span> analyses this session
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', background: '#10b981', borderRadius: '50%' }} />
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>IBM Watson NLU</span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#0f1929', border: '1px solid #1e3a5f',
            borderRadius: '6px', padding: '4px 12px',
            fontSize: '11px', color: '#3b82f6', fontWeight: '600',
            letterSpacing: '0.06em', marginBottom: '20px'
          }}>
            <div style={{ width: '5px', height: '5px', background: '#3b82f6', borderRadius: '50%' }} />
            ACCOUNT INTELLIGENCE PLATFORM
          </div>
          <h1 style={{
            fontSize: '38px', fontWeight: '800', letterSpacing: '-1px',
            lineHeight: '1.1', marginBottom: '14px', color: '#f8fafc'
          }}>
            Know which accounts to<br />
            <span style={{ color: '#3b82f6' }}>
              <Typewriter text="prioritize before you call." speed={45} />
            </span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '480px', lineHeight: '1.65' }}>
            Real-time news analysis powered by IBM Watson NLU. Detect buying signals and score B2B purchase intent in seconds.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          <button style={tabBtn(mode === 'single')} onClick={() => {
            setMode('single')
            setCompareResult(null)
            setError(null)
            setTimeout(() => inputRef.current?.focus(), 100)
          }}>Single Account</button>
          <button style={tabBtn(mode === 'compare')} onClick={() => {
            setMode('compare')
            setResult(null)
            setError(null)
          }}>Compare Accounts</button>
        </div>

        {/* Single mode */}
        {mode === 'single' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                placeholder="Type a company name to analyze..."
                style={{ ...inputStyle, paddingRight: '120px' }}
                onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                onBlur={e => e.target.style.borderColor = '#1a2235'}
              />
              {/* Inline status indicator */}
              <div style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {loading && (
                  <div style={{ fontSize: '11px', color: '#475569' }}>analyzing...</div>
                )}
                {!loading && query.length >= 3 && (
                  <div style={{ fontSize: '11px', color: '#334155' }}>press Enter</div>
                )}
              </div>
            </div>

            {/* Quick search chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#334155', marginRight: '2px' }}>Quick search:</span>
              {['Shopify', 'Snowflake', 'Palantir', 'Stripe', 'Ingram Micro', 'Salesforce'].map(c => (
                <button key={c} onClick={() => { setQuery(c); analyze(c) }} style={{
                  background: query === c ? 'rgba(29,78,216,0.15)' : 'transparent',
                  border: `1px solid ${query === c ? '#1d4ed8' : '#1a2235'}`,
                  borderRadius: '20px', padding: '4px 12px',
                  color: query === c ? '#3b82f6' : '#64748b',
                  fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s'
                }}>{c}</button>
              ))}
            </div>
          </div>
        )}

        {/* Compare mode */}
        {mode === 'compare' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <input
                value={compareA}
                onChange={e => setCompareA(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && compare()}
                placeholder="First company"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                onBlur={e => e.target.style.borderColor = '#1a2235'}
              />
              <div style={{ fontSize: '12px', color: '#334155', textAlign: 'center', fontWeight: '600' }}>VS</div>
              <input
                value={compareB}
                onChange={e => setCompareB(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && compare()}
                placeholder="Second company"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                onBlur={e => e.target.style.borderColor = '#1a2235'}
              />
            </div>
            <button
              onClick={compare}
              disabled={loading || !compareA.trim() || !compareB.trim()}
              style={{
                background: loading ? '#0f1929' : '#1d4ed8',
                border: 'none', borderRadius: '8px',
                padding: '13px 24px', color: loading ? '#475569' : 'white',
                fontSize: '14px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer', width: '100%',
                transition: 'all 0.15s'
              }}
            >
              {loading ? `Comparing ${compareA} vs ${compareB}...` : 'Compare Accounts'}
            </button>

            {/* Compare quick suggestions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: '#334155' }}>Try:</span>
              {[['Shopify', 'Salesforce'], ['Snowflake', 'Palantir'], ['Stripe', 'Square']].map(([a, b]) => (
                <button key={a+b} onClick={() => { setCompareA(a); setCompareB(b) }} style={{
                  background: 'transparent', border: '1px solid #1a2235',
                  borderRadius: '20px', padding: '4px 12px',
                  color: '#64748b', fontSize: '12px', cursor: 'pointer'
                }}>{a} vs {b}</button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '14px 16px',
            color: '#fca5a5', fontSize: '14px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Skeleton loading */}
        {loading && mode === 'single' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SkeletonCard />
            <div>
              <SectionLabel>BUYING SIGNALS</SectionLabel>
              <SkeletonSignals />
            </div>
          </div>
        )}

        {loading && mode === 'compare' && (
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ flex: 1 }}><SkeletonCard /></div>
            <div style={{ flex: 1 }}><SkeletonCard /></div>
          </div>
        )}

        {/* Single result */}
        {hasResult && mode === 'single' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeUp 0.4s ease' }}>

            {/* Score card */}
            <div style={{
              background: '#0c1220', border: '1px solid #1a2235',
              borderRadius: '12px', padding: '28px 32px',
              display: 'flex', gap: '32px', alignItems: 'flex-start'
            }}>
              <ScoreGauge score={result.score} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>{result.company}</h2>
                  {result.priority && (
                    <span style={{
                      background: priorityConfig[result.priority]?.bg,
                      color: priorityConfig[result.priority]?.color,
                      border: `1px solid ${priorityConfig[result.priority]?.border}`,
                      padding: '3px 10px', borderRadius: '5px',
                      fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em'
                    }}>{result.priority.toUpperCase()}</span>
                  )}
                  <span style={{ fontSize: '12px', color: '#334155', marginLeft: 'auto' }}>
                    {new Date(result.analyzedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sentimentConfig[result.sentiment]?.color }} />
                    <span style={{ fontSize: '13px', color: sentimentConfig[result.sentiment]?.color, fontWeight: '500' }}>
                      {sentimentConfig[result.sentiment]?.label} Sentiment
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#334155' }}>|</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{result.articleCount} articles analyzed</span>
                  <span style={{ fontSize: '12px', color: '#334155' }}>|</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{result.signals?.length || 0} signals detected</span>
                </div>

                {/* Keywords with sentiment */}
                {result.keywordsWithSentiment?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {result.keywordsWithSentiment.map(k => (
                      <span key={k.text} style={{
                        background: '#0f1929',
                        border: `1px solid ${
                          k.sentiment === 'positive' ? 'rgba(16,185,129,0.25)' :
                          k.sentiment === 'negative' ? 'rgba(239,68,68,0.25)' : '#1a2235'
                        }`,
                        padding: '3px 9px', borderRadius: '4px',
                        fontSize: '11px', color: '#64748b'
                      }}>{k.text}</span>
                    ))}
                  </div>
                )}

                {/* Key people and orgs */}
                {(result.keyPeople?.length > 0 || result.keyOrgs?.length > 0) && (
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {result.keyPeople?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '6px' }}>KEY PEOPLE</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {result.keyPeople.map(p => (
                            <span key={p.name} style={{
                              background: '#0f1929', border: '1px solid #1a2235',
                              padding: '3px 9px', borderRadius: '4px',
                              fontSize: '11px', color: '#94a3b8'
                            }}>{p.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.keyOrgs?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '6px' }}>RELATED ORGS</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {result.keyOrgs.map(o => (
                            <span key={o} style={{
                              background: '#0f1929', border: '1px solid #1a2235',
                              padding: '3px 9px', borderRadius: '4px',
                              fontSize: '11px', color: '#94a3b8'
                            }}>{o}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <PushToSalesforce result={result} />
              </div>
            </div>

            {/* Buying signals */}
            <div>
              <SectionLabel>BUYING SIGNALS</SectionLabel>
              <SignalsGrid signals={result.signals} />
            </div>

            {/* Articles */}
            {result.articles?.length > 0 && (
              <div>
                <SectionLabel>SOURCE ARTICLES</SectionLabel>
                <ArticlesList articles={result.articles} />
              </div>
            )}

            {/* Analyze another prompt */}
            <div style={{
              background: '#0c1220', border: '1px solid #1a2235',
              borderRadius: '8px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '13px', color: '#475569' }}>Analyze another account or compare this one</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setResult(null); setQuery(''); setTimeout(() => inputRef.current?.focus(), 100) }} style={{
                  background: 'transparent', border: '1px solid #1a2235',
                  borderRadius: '6px', padding: '6px 14px',
                  color: '#64748b', fontSize: '12px', cursor: 'pointer'
                }}>New Search</button>
                <button onClick={() => { setMode('compare'); setCompareA(result.company); setResult(null) }} style={{
                  background: '#0f1929', border: '1px solid #1d4ed8',
                  borderRadius: '6px', padding: '6px 14px',
                  color: '#3b82f6', fontSize: '12px', cursor: 'pointer', fontWeight: '600'
                }}>Compare This Account</button>
              </div>
            </div>
          </div>
        )}

        {/* Compare result */}
        {hasCompare && mode === 'compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: '#0c1220', border: '1px solid #1a2235',
              borderRadius: '8px', padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: '10px',
              animation: 'fadeUp 0.3s ease'
            }}>
              <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#64748b' }}>Recommendation:</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                Prioritize <span style={{ color: '#10b981' }}>{compareResult.winner}</span> — highest purchase intent detected
                {compareResult.scoreDiff > 0 && (
                  <span style={{ color: '#475569', fontWeight: '400' }}> ({compareResult.scoreDiff} point lead)</span>
                )}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '14px' }}>
              {compareResult.results.map((r, i) => (
                <CompareCard key={r.company} result={r} isWinner={i === 0} />
              ))}
            </div>

            {compareResult.results.length >= 2 && (
              <div style={{
                background: '#0c1220', border: '1px solid #1a2235',
                borderRadius: '8px', padding: '20px',
                animation: 'fadeUp 0.5s ease 0.2s both'
              }}>
                <SectionLabel>SCORE COMPARISON</SectionLabel>
                {compareResult.results.map(r => (
                  <div key={r.company} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>{r.company}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{r.score}/100</span>
                    </div>
                    <div style={{ height: '6px', background: '#0f1929', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${r.score}%`,
                        background: r.company === compareResult.winner ? '#10b981' : '#3b82f6',
                        borderRadius: '3px', transition: 'width 1s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && !loading && !result && !compareResult && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <SectionLabel>RECENT SEARCHES</SectionLabel>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {history.map((h, i) => (
                <button key={i} onClick={() => { setMode('single'); setQuery(h.company); analyze(h.company) }} style={{
                  background: '#0c1220', border: '1px solid #1a2235',
                  borderRadius: '6px', padding: '8px 14px',
                  color: '#64748b', cursor: 'pointer',
                  fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'border-color 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2d3f55'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a2235'}
                >
                  {h.company}
                  <span style={{ color: priorityConfig[h.priority]?.color, fontWeight: '600', fontSize: '12px' }}>
                    {h.score}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}