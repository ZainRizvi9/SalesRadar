import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'

const API = 'https://salesradar-production-6013.up.railway.app'

const SIG_LABELS = {
  expansion:'Market Expansion', investment:'Investment Activity',
  hiring:'Talent Acquisition', technology:'Technology Adoption', partnership:'Partnership Activity'
}
const SIG_DESC = {
  expansion:'Scaling operations or entering new markets',
  investment:'Recent funding rounds or capital activity',
  hiring:'Significant recruitment or workforce growth',
  technology:'Digital transformation underway',
  partnership:'New partnerships or acquisitions in progress'
}

function tagClass(p) {
  return { Hot:'tag t-hot', Warm:'tag t-warm', Cool:'tag t-cool', Cold:'tag t-cold' }[p] || 'tag t-cold'
}

function ScoreGauge({ score, size = 100 }) {
  const [n, setN] = useState(0)
  const r = 40
  const circ = 2 * Math.PI * r
  const color = n >= 70 ? '#00e5a0' : n >= 50 ? '#ffb547' : n >= 30 ? '#4f7cff' : '#3d4870'
  useEffect(() => {
    setN(0); let cur = 0
    const t = setInterval(() => {
      cur += score / 40
      if (cur >= score) { setN(score); clearInterval(t) }
      else setN(Math.round(cur))
    }, 20)
    return () => clearInterval(t)
  }, [score])
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" style={{flexShrink:0}}>
      <circle cx="45" cy="45" r={r} fill="none" stroke="#0d1222" strokeWidth="6"/>
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ-(n/100)*circ}
        strokeLinecap="round" transform="rotate(-90 45 45)"
        style={{transition:'stroke-dashoffset 0.05s linear,stroke 0.3s'}}/>
      <text x="45" y="41" textAnchor="middle" fill="#e8eeff" fontSize="19" fontWeight="800" fontFamily="'Syne',sans-serif">{n}</text>
      <text x="45" y="54" textAnchor="middle" fill="#1e2540" fontSize="7.5" fontFamily="'DM Mono',monospace" letterSpacing="1.5">SCORE</text>
    </svg>
  )
}

function Typewriter({ text, speed = 45 }) {
  const [s, setS] = useState('')
  useEffect(() => {
    setS(''); let i = 0
    const t = setInterval(() => { if (i<text.length) setS(text.slice(0,++i)); else clearInterval(t) }, speed)
    return () => clearInterval(t)
  }, [text])
  return <span>{s}<span className="tw-cur">{s.length<text.length?'|':''}</span></span>
}

function SFPush({ result }) {
  const [status, setStatus] = useState(null)
  const [pushing, setPushing] = useState(false)
  const push = async () => {
    setPushing(true); setStatus(null)
    try {
      const res = await axios.post(`${API}/api/push-to-salesforce`,
        {company:result.company,score:result.score,priority:result.priority,
         sentiment:result.sentiment,signals:result.signals,keywords:result.keywords})
      setStatus({ok:true,url:res.data.salesforceUrl,msg:res.data.message})
    } catch(e) { setStatus({ok:false,msg:e.response?.data?.error||'Push failed'}) }
    setPushing(false)
  }
  return (
    <div>
      <button className="sf-btn" onClick={push} disabled={pushing}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {pushing ? 'Pushing...' : 'Push to Salesforce'}
      </button>
      {status && (
        <div className={status.ok ? 'sf-ok' : 'sf-err'}>
          {status.msg}
          {status.ok && status.url && <a href={status.url} target="_blank" rel="noreferrer" style={{color:'#4a9eed',fontSize:'11px',marginLeft:'4px'}}>View →</a>}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div className="empty-title">Search an account</div>
      <div className="empty-sub">Type a company name on the left to analyze their purchase intent in real time.</div>
      <div className="empty-examples">
        <div className="empty-ex-label">Popular searches</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px',justifyContent:'center'}}>
          {['Shopify','Snowflake','Palantir','Stripe','Salesforce'].map(c=>(
            <span key={c} style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--muted)',background:'var(--surface)',border:'1px solid var(--line)',padding:'3px 10px',borderRadius:'4px'}}>{c}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoadingState({ company }) {
  return (
    <div className="loading-state">
      <div className="loading-ring"/>
      <div className="loading-label">Analyzing <span style={{color:'var(--text)'}}>{company}</span></div>
      <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--dim)',marginTop:'8px',letterSpacing:'0.08em'}}>
        FETCHING NEWS · RUNNING NLU · SCORING SIGNALS
      </div>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState('single')
  const [query, setQuery] = useState('')
  const [cmpA, setCmpA] = useState('')
  const [cmpB, setCmpB] = useState('')
  const [result, setResult] = useState(null)
  const [cmpResult, setCmpResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingFor, setLoadingFor] = useState('')
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [count, setCount] = useState(0)
  const [activeTab, setActiveTab] = useState('signals')
  const inputRef = useRef(null)

  const analyze = async (company) => {
    const target = (company || query).trim()
    if (!target) return
    setLoading(true); setLoadingFor(target); setError(null); setResult(null); setCmpResult(null)
    try {
      const res = await axios.get(`${API}/api/analyze/${encodeURIComponent(target)}`)
      setResult(res.data); setCount(c=>c+1); setActiveTab('signals')
      setHistory(prev=>[{company:target,score:res.data.score,priority:res.data.priority},
        ...prev.filter(h=>h.company!==target).slice(0,7)])
    } catch { setError('Analysis failed. Check the company name and try again.') }
    setLoading(false)
  }

  const compare = async () => {
    const a=cmpA.trim(), b=cmpB.trim()
    if (!a||!b) return
    setLoading(true); setLoadingFor(`${a} vs ${b}`); setError(null); setResult(null); setCmpResult(null)
    try {
      const res = await axios.get(`${API}/api/compare`,{params:{companies:`${a},${b}`}})
      setCmpResult(res.data)
    } catch { setError('Comparison failed.') }
    setLoading(false)
  }

  const sentDot = s => ({positive:'sp',negative:'sn',neutral:'su'}[s]||'su')
  const hasResult = result && !loading
  const hasCmp = cmpResult && !loading

  return (
    <div className="app-shell">
      <div className="bg-layer"/>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <span className="logo-name">SalesRadar</span>
          <span className="nav-beta">BETA</span>
        </div>

        {/* Mode tabs */}
        <div className="sidebar-tabs">
          <button className={`s-tab ${mode==='single'?'on':''}`} onClick={()=>{setMode('single');setCmpResult(null);setError(null)}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Single
          </button>
          <button className={`s-tab ${mode==='compare'?'on':''}`} onClick={()=>{setMode('compare');setResult(null);setError(null)}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Compare
          </button>
        </div>

        {/* Search */}
        {mode==='single' && (
          <div className="sidebar-search">
            <div className="s-input-wrap">
              <svg className="s-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input ref={inputRef} className="s-input" value={query}
                onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&analyze()}
                placeholder="Company name..." autoFocus/>
            </div>
            <button className="s-btn" onClick={()=>analyze()} disabled={loading||!query.trim()}>
              {loading ? '...' : 'Analyze →'}
            </button>
            <div className="s-chips-label">QUICK SEARCH</div>
            <div className="s-chips">
              {['Shopify','Snowflake','Palantir','Stripe','Ingram Micro','Salesforce','HubSpot','Twilio'].map(c=>(
                <button key={c} className={`s-chip ${query===c?'on':''}`} onClick={()=>{setQuery(c);analyze(c)}}>{c}</button>
              ))}
            </div>
          </div>
        )}

        {mode==='compare' && (
          <div className="sidebar-search">
            <div className="s-input-wrap" style={{marginBottom:'8px'}}>
              <svg className="s-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="s-input" value={cmpA} onChange={e=>setCmpA(e.target.value)} onKeyDown={e=>e.key==='Enter'&&compare()} placeholder="First company..."/>
            </div>
            <div style={{textAlign:'center',fontFamily:'var(--mono)',fontSize:'10px',color:'var(--dim)',letterSpacing:'0.1em',margin:'4px 0'}}>VS</div>
            <div className="s-input-wrap" style={{marginBottom:'10px'}}>
              <svg className="s-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="s-input" value={cmpB} onChange={e=>setCmpB(e.target.value)} onKeyDown={e=>e.key==='Enter'&&compare()} placeholder="Second company..."/>
            </div>
            <button className="s-btn" onClick={compare} disabled={loading||!cmpA.trim()||!cmpB.trim()}>
              {loading ? '...' : 'Compare →'}
            </button>
            <div className="s-chips-label">TRY</div>
            <div className="s-chips">
              {[['Shopify','Salesforce'],['Snowflake','Palantir'],['Stripe','Square']].map(([a,b])=>(
                <button key={a+b} className="s-chip" onClick={()=>{setCmpA(a);setCmpB(b)}}>{a} vs {b}</button>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="sidebar-history">
            <div className="s-chips-label">RECENT</div>
            {history.map((h,i)=>(
              <button key={i} className="hist-row" onClick={()=>{setMode('single');setQuery(h.company);analyze(h.company)}}>
                <span className="hist-name">{h.company}</span>
                <span className={`hist-score ${h.priority==='Hot'?'hs-hot':h.priority==='Warm'?'hs-warm':'hs-cool'}`}>{h.score}</span>
              </button>
            ))}
          </div>
        )}

        {/* Status */}
        <div className="sidebar-footer">
          <div className="live-dot"/>
          <span>Watson NLU</span>
          {count > 0 && <span style={{marginLeft:'auto',color:'var(--dim)'}}>{count} runs</span>}
        </div>
      </aside>

      {/* ── Main panel ── */}
      <main className="panel">

        {/* Error */}
        {error && (
          <div className="err">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !result && !cmpResult && !error && <EmptyState/>}

        {/* Loading */}
        {loading && <LoadingState company={loadingFor}/>}

        {/* ── Single result ── */}
        {hasResult && (
          <div className="result-wrap up">
            {/* Header */}
            <div className="result-header">
              <div className="result-header-left">
                <h1 className="result-company">{result.company}</h1>
                <div className="result-meta">
                  {result.priority && <span className={tagClass(result.priority)}>{result.priority.toUpperCase()}</span>}
                  <div className="sent">
                    <span className={`sdot ${sentDot(result.sentiment)}`}/>
                    <span>{result.sentiment?.charAt(0).toUpperCase()+result.sentiment?.slice(1)}</span>
                  </div>
                  <span className="dd">·</span>
                  <span className="stat">{result.articleCount} articles</span>
                  <span className="dd">·</span>
                  <span className="stat">{result.signals?.length||0} signals</span>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
                <ScoreGauge score={result.score}/>
                <SFPush result={result}/>
              </div>
            </div>

            {/* Keywords */}
            {result.keywordsWithSentiment?.length > 0 && (
              <div className="kws">
                {result.keywordsWithSentiment.map(k=>(
                  <span key={k.text} className={`kw ${k.sentiment==='positive'?'kp':k.sentiment==='negative'?'kn':''}`}>{k.text}</span>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="result-tabs">
              {[['signals','Signals'],['articles','Articles'],['entities','Entities']].map(([id,label])=>(
                <button key={id} className={`r-tab ${activeTab===id?'on':''}`} onClick={()=>setActiveTab(id)}>
                  {label}
                  {id==='signals' && result.signals?.length > 0 && <span className="r-tab-badge">{result.signals.length}</span>}
                  {id==='articles' && result.articles?.length > 0 && <span className="r-tab-badge">{result.articles.length}</span>}
                </button>
              ))}
            </div>

            {/* Signals tab */}
            {activeTab==='signals' && (
              <div>
                {!result.signals?.length ? (
                  <div className="no-data">No buying signals detected in recent coverage</div>
                ) : (
                  <div className="sig-grid">
                    {result.signals.map((s,i)=>(
                      <div key={s.type} className="sig-card up" style={{animationDelay:`${i*0.06}s`}}>
                        <div className="sig-top">
                          <span className="sig-name">{SIG_LABELS[s.type]}</span>
                          <span className={`sig-str ${s.strength==='Strong'?'ss':'sm'}`}>{s.strength.toUpperCase()}</span>
                        </div>
                        <p className="sig-desc">{SIG_DESC[s.type]}</p>
                        <div className="sig-ev">{s.evidence.map(e=><span key={e} className="ev-tag">{e}</span>)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Articles tab */}
            {activeTab==='articles' && (
              <div>
                {!result.articles?.length ? (
                  <div className="no-data">No articles found</div>
                ) : result.articles.map((a,i)=>(
                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="art">
                    <div className="art-in">
                      <div>
                        <div className="art-t">{a.title}</div>
                        <div className="art-d">{a.description?.slice(0,120)}...</div>
                      </div>
                      <div className="art-meta">
                        <div className="art-src">{a.source}</div>
                        <div className="art-dt">{new Date(a.publishedAt).toLocaleDateString('en-CA')}</div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Entities tab */}
            {activeTab==='entities' && (
              <div style={{display:'flex',gap:'32px',flexWrap:'wrap'}}>
                {result.keyPeople?.length > 0 && (
                  <div>
                    <div className="sec-lbl">KEY PEOPLE</div>
                    <div className="kws">{result.keyPeople.map(p=><span key={p.name} className="kw">{p.name}</span>)}</div>
                  </div>
                )}
                {result.keyOrgs?.length > 0 && (
                  <div>
                    <div className="sec-lbl">RELATED ORGS</div>
                    <div className="kws">{result.keyOrgs.map(o=><span key={o} className="kw">{o}</span>)}</div>
                  </div>
                )}
                {!result.keyPeople?.length && !result.keyOrgs?.length && (
                  <div className="no-data">No entities extracted</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Compare result ── */}
        {hasCmp && (
          <div className="result-wrap up">
            <div className="rec-bar">
              <div className="live-dot"/>
              <span style={{color:'var(--muted)'}}>Recommendation:</span>
              <strong style={{color:'var(--green)'}}>{cmpResult.winner}</strong>
              {cmpResult.scoreDiff > 0 && <span style={{color:'var(--dim)',fontWeight:'400',fontSize:'12px'}}>— {cmpResult.scoreDiff} point lead</span>}
            </div>

            <div className="cmp-pair">
              {cmpResult.results.map((r,i)=>(
                <div key={r.company} className={`cmp-card ${i===0?'win':''}`}>
                  {i===0 && <div className="win-tag">TOP PRIORITY</div>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px'}}>
                    <div>
                      <h3 style={{fontSize:'18px',fontWeight:'800',letterSpacing:'-0.5px',marginBottom:'8px'}}>{r.company}</h3>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span className={tagClass(r.priority)}>{r.priority?.toUpperCase()}</span>
                        <div className="sent"><span className={`sdot ${sentDot(r.sentiment)}`}/><span style={{fontSize:'11px'}}>{r.sentiment}</span></div>
                      </div>
                    </div>
                    <ScoreGauge score={r.score} size={80}/>
                  </div>
                  <div className="sec-lbl">SIGNALS</div>
                  {!r.signals?.length ? <div style={{fontSize:'12px',color:'var(--dim)'}}>None detected</div> : (
                    <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                      {r.signals.map(s=>(
                        <div key={s.type} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'11px',color:'var(--muted)',width:'115px',flexShrink:0}}>{SIG_LABELS[s.type]}</span>
                          <div style={{flex:1,height:'3px',background:'var(--surface)',borderRadius:'2px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:s.strength==='Strong'?'100%':'55%',background:s.strength==='Strong'?'var(--green)':'var(--blue)',borderRadius:'2px',transition:'width 0.8s ease'}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="card" style={{marginTop:'10px',padding:'20px 24px'}}>
              <div className="sec-lbl">SCORE COMPARISON</div>
              {cmpResult.results.map(r=>(
                <div key={r.company} style={{marginBottom:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',fontSize:'12px',color:'var(--muted)'}}>
                    <span>{r.company}</span>
                    <span style={{fontFamily:'var(--mono)',fontWeight:'500',color:'var(--text)'}}>{r.score}/100</span>
                  </div>
                  <div className="sbar-track">
                    <div className="sbar-fill" style={{width:`${r.score}%`,background:r.company===cmpResult.winner?'var(--green)':'var(--blue)'}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}