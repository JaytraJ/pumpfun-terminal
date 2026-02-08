import React, { useEffect, useMemo, useRef, useState } from "react"
import api from "./api"

function Section({ title, children, toolbar, className = "" }) {
  return (
    <section className={`panel p-5 md:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-wide text-[#9CFF7A]">{title}</h2>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="mb-2 flex items-center gap-2 text-sm">
      <span className="w-44 text-[#79d36b]">{label}</span>
      <div className="flex-1">{children}</div>
    </label>
  )
}

function Input(props) {
  return (
    <input
      {...props}
      className={(props.className || "") +
        " w-full rounded-xl input-field px-4 py-2.5 text-sm text-[#b6ff9d] placeholder-[#4a9d4a] transition-all duration-200"}
    />
  )
}

function Button({ children, type = "button", variant = "indigo", ...props }) {
  const variants = {
    indigo: "border border-[#00ff00] bg-[rgba(0,255,0,0.1)] text-[#b6ff9d] hover:bg-[#00ff00] hover:text-black",
    emerald: "border border-[#00ff00] bg-[rgba(0,255,0,0.16)] text-[#d8ffcc] hover:bg-[#00ff00] hover:text-black",
    rose: "border border-[#ff4d4d] bg-[rgba(255,77,77,0.14)] text-[#ff9d9d] hover:bg-[#ff4d4d] hover:text-black",
    sky: "border border-[#7af7ff] bg-[rgba(122,247,255,0.15)] text-[#d2fdff] hover:bg-[#7af7ff] hover:text-black",
    red: "border border-[#ff4d4d] bg-[rgba(255,77,77,0.15)] text-[#ff9d9d] hover:bg-[#ff4d4d] hover:text-black",
    outline: "border border-[#00ff00] bg-transparent text-[#a8ff90] hover:bg-[rgba(0,255,0,0.12)]",
    ghost: "border border-[rgba(0,255,0,0.25)] bg-transparent text-[#8be873] hover:bg-[rgba(0,255,0,0.1)]",
  }
  const base = "text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_0_1px_rgba(0,255,0,0.2),0_0_20px_rgba(0,255,0,0.08)]"
  const cls = variants[variant] || variants.indigo
  return (
    <button type={type} {...props} className={(props.className || "") + " " + cls + " " + base}>
      {children}
    </button>
  )
}

function Progress({ label, value, total, running, variant = "indigo" }) {
  const pct = total > 0 ? Math.min(100, Math.floor((value / total) * 100)) : 0
  const bars = {
    indigo: "from-[#00b300] to-[#00ff00]",
    emerald: "from-[#00b300] to-[#00ff00]",
    rose: "from-[#ff5f5f] to-[#ff9f66]",
  }
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-xs text-[#79d36b]">
        <span>{label}</span>
        <span>{value}/{total} ({pct}%) {running ? "in progress" : ""}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/70 ring-1 ring-[#00ff00]/40">
        <div className={`h-full bg-gradient-to-r ${bars[variant]}`} style={{ width: pct + "%" }} />
      </div>
    </div>
  )
}

function MiniField({ label, children }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-[#6ebd61]">{label}</div>
      {children}
    </div>
  )
}

function normalizeTrackedTokenEntries(entries = []) {
  const out = []
  const seen = new Set()
  for (const item of entries || []) {
    const mint = typeof item === 'string' ? item.trim() : String(item?.mint || '').trim()
    if (!mint || seen.has(mint)) continue
    // Backend performs full on-chain mint validation; this guards obvious local junk.
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) continue
    seen.add(mint)
    const name = typeof item === 'object' && item?.name ? String(item.name).trim() : ''
    const symbol = typeof item === 'object' && item?.symbol ? String(item.symbol).trim() : ''
    const fallback = `${mint.slice(0, 4)}...${mint.slice(-4)}`
    out.push({
      mint,
      name: name || symbol || fallback,
      symbol: symbol || name || fallback,
    })
    if (out.length >= 20) break
  }
  return out
}

function SegTabs({ value, onChange, options }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[#00ff00]/40 bg-black/60 p-1 shadow-[0_0_18px_rgba(0,255,0,0.1)]">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-xs transition ${value===opt.value ? 'bg-[#00ff00] text-black shadow-[0_0_14px_rgba(0,255,0,0.35)]' : 'text-[#84d572] hover:bg-[rgba(0,255,0,0.12)] hover:text-[#b8ff9f]'}`}
        >{opt.label}</button>
      ))}
    </div>
  )
}

function LogsPanel({ logs }) {
  const panelRef = useRef(null)
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    if (nearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [logs])
  return (
    <div
      ref={panelRef}
      className="h-full min-h-[210px] overflow-y-auto rounded-xl bg-black/90 px-4 py-3 text-xs text-[#a8ff90]"
    >
      {logs.length === 0 ? (
        <div className="text-[#5ea955]">Logs will appear here as actions run.</div>
      ) : (
        logs.map((l, i) => {
          const ts = new Date(l.ts).toLocaleTimeString()
          const payload = l.data ? JSON.stringify(l.data) : null
          return (
            <div key={i} className="break-words py-1">
              <span className="text-[#5ea955]">[{ts}]</span>
              <span className="ml-2 text-[#84e86d]">{l.category}</span>
              <span className="ml-2 text-[#b8ff9f]">{l.message}</span>
              {payload ? <span className="ml-2 text-[#6fbb62]">{payload}</span> : null}
            </div>
          )
        })
      )}
    </div>
  )
}

function CopyChip({ label, value, onCopy }) {
  const [copied, setCopied] = useState(false)
  const disabled = !value
  return (
    <button
      type="button"
      disabled={disabled}
      title={value || "Unavailable"}
      onClick={async () => {
        if (!value) return
        try { await navigator.clipboard.writeText(value) } catch {}
        setCopied(true)
        onCopy?.(value)
        setTimeout(() => setCopied(false), 1200)
      }}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${disabled ? 'border-[#145114] bg-black/70 text-[#4f9449]' : 'border-[#00ff00]/40 bg-[rgba(0,255,0,0.09)] text-[#b4ff9b] shadow-[0_0_15px_rgba(0,255,0,0.12)] hover:bg-[rgba(0,255,0,0.2)]'}`}
    >
      <span className="mr-1 text-[11px] uppercase tracking-wide text-[#79cf6b]">{label}:</span>
      <span className="max-w-[420px] inline-block align-middle truncate">{value || 'Unavailable'}</span>
      <span className={`ml-2 ${copied ? 'text-[#00ff00]' : 'text-[#5cae50]'}`}>{copied ? 'copied' : 'copy'}</span>
    </button>
  )
}

function CopyKey({ value, onCopy, className = '' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      title={value}
      onClick={async () => {
        try { await navigator.clipboard.writeText(value) } catch {}
        setCopied(true)
        onCopy?.(value)
        setTimeout(() => setCopied(false), 1000)
      }}
      className={`break-all font-mono text-xs text-[#5cab52] underline decoration-dotted underline-offset-2 hover:text-[#b8ff9f] ${className}`}
    >
      {value}
      <span className={`ml-2 ${copied ? 'text-[#00ff00]' : 'text-[#5cae50]'}`}>{copied ? 'copied' : 'copy'}</span>
    </button>
  )
}

const TAB_ITEMS = [
  { id: "templates", label: "TOKEN TEMPLATES" },
  { id: "wallet", label: "WALLET MANAGER" },
  { id: "launch", label: "LAUNCH" },
  { id: "trade", label: "TRADE CONTROLS" },
  { id: "tokens", label: "MY TOKENS" },
]

function makeTemplate(seed = 1, devWalletPubkey = "", defaults = { devBuySol: "0.01", slippage: "10", priorityFee: "0.00001" }) {
  return {
    id: `tpl-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: `Template ${seed}`,
    name: "",
    symbol: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
    devBuySol: defaults.devBuySol,
    slippage: defaults.slippage,
    priorityFee: defaults.priorityFee,
    devWalletPubkey: devWalletPubkey || "",
    imageFile: null,
    imagePreview: "",
    status: "idle",
    mint: "",
    signature: "",
    error: "",
  }
}

export default function App() {
  const [state, setState] = useState({ mint: "", recentMints: [] })
  const [wallets, setWallets] = useState([])
  const [balances, setBalances] = useState({ data: [] })
  const [walletMintSelection, setWalletMintSelection] = useState({})
  const [loading, setLoading] = useState(false)
  const [mintInput, setMintInput] = useState("")
  const [toasts, setToasts] = useState([])

  const [templateDefaults, setTemplateDefaults] = useState({ devBuySol: "0.01", slippage: "10", priorityFee: "0.00001" })
  const [templates, setTemplates] = useState(() => [makeTemplate(1, "", { devBuySol: "0.01", slippage: "10", priorityFee: "0.00001" })])
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0)
  const [launchMode, setLaunchMode] = useState("sequential")
  const [launchingTemplates, setLaunchingTemplates] = useState(false)
  const [tokenCatalog, setTokenCatalog] = useState([])
  const [templateCount, setTemplateCount] = useState(1)
  const [editingWalletNames, setEditingWalletNames] = useState({})
  const [serverConfig, setServerConfig] = useState({
    feeBufferSol: 0.03,
    maxConcurrency: 6,
    defaultSlippagePercent: 10,
    defaultPriorityFeeSol: 0.00001,
    defaultConcurrency: 4,
    defaultBuySol: 0.02,
    autoRefreshMs: 60000,
  })
  const [autoRefreshMs, setAutoRefreshMs] = useState(60000)

  const [buyForm, setBuyForm] = useState({ mode: 'concurrent', concurrency: "4", slippage: "10", priorityFee: "0.00001" })
  const [sellForm, setSellForm] = useState({ mode: 'concurrent', concurrency: "4", slippage: "10", priorityFee: "0.00001", percent: "100" })
  const [buyStatus, setBuyStatus] = useState({ running: false, done: 0, total: 0 })
  const [sellStatus, setSellStatus] = useState({ running: false, done: 0, total: 0 })
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState("templates")
  const [utilsTab, setUtilsTab] = useState("generate")
  const [templateOpen, setTemplateOpen] = useState({})
  const [launchSelection, setLaunchSelection] = useState({})
  const [launchBatchStatus, setLaunchBatchStatus] = useState({ running: false, done: 0, total: 0 })
  const [selected, setSelected] = useState({}) // map pubkey -> true
  const selectedWallets = useMemo(
    () => wallets.filter((w) => selected[w.publicKey]),
    [wallets, selected]
  )
  const selectedPublicKeys = useMemo(
    () => selectedWallets.map((w) => w.publicKey),
    [selectedWallets]
  )
  const selectedCount = selectedPublicKeys.length
  const hasSelection = selectedCount > 0
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showAllWallets, setShowAllWallets] = useState(false)
  const AUTO_REFRESH_MS = autoRefreshMs // configurable auto refresh interval
  const WALLET_PREVIEW_COUNT = 4

  const allWalletRows = useMemo(() => balances?.data ?? [], [balances?.data])
  const displayedWallets = useMemo(() => {
    if (showAllWallets) return allWalletRows
    if ((allWalletRows?.length || 0) <= WALLET_PREVIEW_COUNT) return allWalletRows
    return allWalletRows.slice(0, WALLET_PREVIEW_COUNT)
  }, [allWalletRows, showAllWallets, WALLET_PREVIEW_COUNT])
  const hiddenWalletCount = Math.max(0, (allWalletRows?.length || 0) - (displayedWallets?.length || 0))

  const allSelected = useMemo(() => {
    if (!wallets.length) return false
    return wallets.every((w) => selected[w.publicKey])
  }, [wallets, selected])

  const TOKEN_DISPLAY_LIMIT = 4
  const [showAllTokens, setShowAllTokens] = useState(false)
  const displayedTokens = useMemo(() => {
    if (showAllTokens) return tokenCatalog
    return tokenCatalog.slice(0, TOKEN_DISPLAY_LIMIT)
  }, [tokenCatalog, showAllTokens])

  const selectedLaunchTemplates = useMemo(
    () => templates.filter((tpl) => launchSelection[tpl.id]),
    [templates, launchSelection]
  )

  const allLaunchSelected = useMemo(
    () => templates.length > 0 && templates.every((tpl) => launchSelection[tpl.id]),
    [templates, launchSelection]
  )

  const launchedTokens = useMemo(() => {
    const seen = new Set()
    const combined = Array.isArray(state?.recentMints) ? state.recentMints : []
    return combined.filter((entry) => {
      if (!entry?.mint) return false
      if (seen.has(entry.mint)) return false
      seen.add(entry.mint)
      return true
    })
  }, [state?.recentMints])

  const walletManagerRows = useMemo(() => {
    const balMap = new Map((balances?.data || []).map((row) => [row.publicKey, row]))
    return wallets.map((wallet) => {
      const row = balMap.get(wallet.publicKey) || {}
      return {
        ...wallet,
        sol: Number(row.sol || 0),
        token: Number(row.token || 0),
      }
    })
  }, [wallets, balances?.data])

  const devWalletChoices = useMemo(() => {
    const list = []
    for (const w of wallets) {
      const suffix = w.publicKey ? `${w.publicKey.slice(0,4)}...${w.publicKey.slice(-4)}` : ''
      list.push({ label: `${w.name} - ${suffix}`, value: w.publicKey })
    }
    return list
  }, [wallets])

  const walletSelectOptions = useMemo(() => {
    const opts = []
    for (const w of wallets) {
      const suffix = w.publicKey ? `${w.publicKey.slice(0,4)}...${w.publicKey.slice(-4)}` : ''
      opts.push({ label: `${w.name} (${suffix})`, value: w.publicKey })
    }
    return opts
  }, [wallets])

  async function lookupTokenInfo(mint) {
    try {
      const res = await api.getTokenInfo(mint, 'lookupToken');
      if (res?.error) return null;
      return { name: res.name || '', symbol: res.symbol || '' };
    } catch {
      return null;
    }
  }

  async function validateMintAddress(mint) {
    try {
      const res = await api.validateMint(mint, 'validate-mint')
      if (res?.valid) return { ok: true }
      return { ok: false, error: res?.error || 'Invalid contract address' }
    } catch {
      return { ok: false, error: 'Unable to validate contract address' }
    }
  }

  function shortMintLabel(mint) {
    if (!mint) return '';
    return `${mint.slice(0,4)}...${mint.slice(-4)}`;
  }

  function pushToast({ title, detail, tx, status = 'pending' }) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts(prev => [...prev, { id, title, detail, tx, status }])
    return id
  }

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  function updateToast(id, patch = {}) {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function monitorTx(signature, toastId) {
    if (!signature) return
    const id = toastId || pushToast({ title: 'Transaction', detail: 'Submitted', tx: signature, status: 'pending' })
    const maxAttempts = 30
    for (let i = 0; i < maxAttempts; i++) {
      await delay(2000)
      try {
        const res = await api.getTxStatus(signature, 'toast-status')
        if (res?.err) {
          updateToast(id, { title: 'Transaction failed', detail: String(res.err), status: 'error' })
          return
        }
        const st = res?.status || (typeof res?.confirmations === 'number' && res.confirmations > 0 ? 'confirmed' : null)
        if (st === 'confirmed' || st === 'finalized') {
          updateToast(id, { title: 'Transaction confirmed', detail: 'Confirmed on-chain', status: 'success' })
          return
        }
      } catch (_) {}
    }
    updateToast(id, { title: 'Transaction pending', detail: 'Confirmation not seen yet', status: 'pending' })
  }

  function getWalletMint(pubkey) {
    if (!pubkey) return state.mint || '';
    const selected = walletMintSelection?.[pubkey];
    if (selected) return selected;
    return state.mint || '';
  }

useEffect(() => {
  setActiveTemplateIndex((idx) => {
    if (!templates.length) return 0
    return Math.min(idx, templates.length - 1)
  })
}, [templates.length])

useEffect(() => {
  setTemplateOpen((prev) => {
    const next = { ...prev }
    for (const tpl of templates) {
      if (!Object.prototype.hasOwnProperty.call(next, tpl.id)) next[tpl.id] = true
    }
    for (const id of Object.keys(next)) {
      if (!templates.find((tpl) => tpl.id === id)) delete next[id]
    }
    return next
  })
  setLaunchSelection((prev) => {
    const next = { ...prev }
    for (const tpl of templates) {
      if (!Object.prototype.hasOwnProperty.call(next, tpl.id)) next[tpl.id] = true
    }
    for (const id of Object.keys(next)) {
      if (!templates.find((tpl) => tpl.id === id)) delete next[id]
    }
    return next
  })
}, [templates])

useEffect(() => {
  if (wallets.length) {
    const first = wallets[0]
    setTemplates((prev) => prev.map((t) => t.devWalletPubkey ? t : { ...t, devWalletPubkey: first.publicKey }))
  }
}, [wallets])

  useEffect(() => {
    if ((balances?.data?.length || 0) <= WALLET_PREVIEW_COUNT) {
      setShowAllWallets(false)
    }
  }, [balances?.data])

  useEffect(() => {
    setWalletMintSelection((prev) => {
      const allowed = new Set()
      wallets.forEach((w) => allowed.add(w.publicKey))
      ;(balances?.data || []).forEach((r) => allowed.add(r.publicKey))
      const next = {}
      for (const [pk, mint] of Object.entries(prev || {})) {
        if (allowed.has(pk)) next[pk] = mint
      }
      return next
    })
  }, [wallets, balances?.data])

  useEffect(() => {
    setWalletMintSelection((prev) => {
      const allowedMints = new Set((tokenCatalog || []).map((t) => t.mint))
      const next = {}
      for (const [pk, mint] of Object.entries(prev || {})) {
        if (!mint || allowedMints.has(mint)) next[pk] = mint
      }
      return next
    })
  }, [tokenCatalog])

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.getConfig('init');
        if (cfg) {
          const parsed = {
            feeBufferSol: Number(cfg.FEE_BUFFER_SOL ?? cfg.feeBufferSol ?? 0.03),
            maxConcurrency: Number(cfg.MAX_CONCURRENCY ?? cfg.maxConcurrency ?? 6),
            defaultSlippagePercent: Number(cfg.DEFAULT_SLIPPAGE_PERCENT ?? cfg.defaultSlippagePercent ?? 10),
            defaultPriorityFeeSol: Number(cfg.DEFAULT_PRIORITY_FEE_SOL ?? cfg.defaultPriorityFeeSol ?? 0.00001),
            defaultConcurrency: Number(cfg.DEFAULT_CONCURRENCY ?? cfg.defaultConcurrency ?? 4),
            defaultBuySol: Number(cfg.DEFAULT_BUY_SOL ?? cfg.defaultBuySol ?? 0.02),
            autoRefreshMs: Number(cfg.AUTO_REFRESH_MS ?? cfg.autoRefreshMs ?? 60000),
          };
          setServerConfig(parsed);
          setAutoRefreshMs(Number.isFinite(parsed.autoRefreshMs) && parsed.autoRefreshMs > 0 ? parsed.autoRefreshMs : 60000);
          const tplDefaults = {
            devBuySol: String(parsed.defaultBuySol || "0.01"),
            slippage: String(parsed.defaultSlippagePercent ?? 10),
            priorityFee: String(parsed.defaultPriorityFeeSol ?? 0.00001),
          };
          setTemplateDefaults(tplDefaults);
          setTemplates((prev) => prev.map((t) => ({
            ...t,
            devBuySol: t.devBuySol == null || t.devBuySol === "" ? tplDefaults.devBuySol : t.devBuySol,
            slippage: t.slippage == null || t.slippage === "" ? tplDefaults.slippage : t.slippage,
            priorityFee: t.priorityFee == null || t.priorityFee === "" ? tplDefaults.priorityFee : t.priorityFee,
          })));
          setBuyForm((prev) => ({
            ...prev,
            concurrency: String(Math.max(1, Math.min(parsed.maxConcurrency, parsed.defaultConcurrency))),
            slippage: String(parsed.defaultSlippagePercent),
            priorityFee: String(parsed.defaultPriorityFeeSol),
          }));
          setSellForm((prev) => ({
            ...prev,
            concurrency: String(Math.max(1, Math.min(parsed.maxConcurrency, parsed.defaultConcurrency))),
            slippage: String(parsed.defaultSlippagePercent),
            priorityFee: String(parsed.defaultPriorityFeeSol),
          }));
        }
      } catch {}
      let initialMint = ""
      try {
        const s = await api.getState('init')
        if (s) {
          initialMint = s.mint || ""
          const tracked = normalizeTrackedTokenEntries(Array.isArray(s.trackedMints) ? s.trackedMints : [])
          setState((prev) => ({
            ...prev,
            mint: s.mint || "",
            recentMints: Array.isArray(s.recentMints) ? s.recentMints : [],
            trackedMints: tracked,
          }))
          setTokenCatalog(tracked)
        }
      } catch {}
      await refreshWallets()
      await refreshBalances('init', initialMint || state.mint)
    })()
  }, [])

  // Auto-refresh balances (SOL + SPL for current mint)
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      if (!loading) refreshBalances('auto')
    }, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [loading, state.mint, autoRefresh, AUTO_REFRESH_MS])

  useEffect(() => {
    const stop = api.streamLogs((evt) => {
      if (evt.type === 'init' && evt.data?.logs) {
        setLogs(evt.data.logs)
      } else if (evt.type === 'log' && evt.data) {
        setLogs((prev) => [...prev.slice(-999), evt.data])
        const { category, message, data } = evt.data
        if (category === 'buy' && message === 'progress') {
          setBuyStatus(p => ({ running: true, done: data?.done||0, total: data?.total||p.total }))
        }
        if (category === 'buy' && (message === 'Batch buy completed' || message === 'Batch buy failed')) {
          setBuyStatus(p => ({ ...p, running: false }))
        }
        if (category === 'sell' && message === 'progress') {
          setSellStatus(p => ({ running: true, done: data?.done||0, total: data?.total||p.total }))
        }
        if (category === 'sell' && (message === 'Batch sell completed' || message === 'Batch sell failed')) {
          setSellStatus(p => ({ ...p, running: false }))
        }
      }
    })
    return stop
  }, [])

  async function log(category, message, data) {
    try {
      // Prefer server SSE to avoid duplicate local + SSE entries
      await api.emitLog(category, message, data)
    } catch {
      // Fallback: add locally if SSE emit fails
      setLogs(prev => [...prev.slice(-999), { ts: Date.now(), category, message, data }])
    }
  }

  async function removeSelectedWallets() {
    if (!selectedPublicKeys.length) return
    const list = wallets.filter(w => selectedPublicKeys.includes(w.publicKey))
    const confirmLabel = list.length > 1 ? `${list.length} wallets` : list[0]?.name || selectedPublicKeys[0]
    const ok = window.confirm(`Remove ${confirmLabel}? This cannot be undone.`)
    if (!ok) return
    setWallets(prev => prev.filter(p => !selectedPublicKeys.includes(p.publicKey)))
    setBalances(prev => ({
      ...prev,
      data: Array.isArray(prev?.data) ? prev.data.filter(p => !selectedPublicKeys.includes(p.publicKey)) : prev?.data,
    }))
    setSelected({})
    for (const pubkey of selectedPublicKeys) {
      try {
        const res = await api.removeWallet({ publicKey: pubkey })
        if (res?.error) {
          await log('ui','Remove wallet failed',{ error: res.error, wallet: pubkey })
        }
      } catch (e) {
        await log('ui','Remove wallet failed',{ error: String(e), wallet: pubkey })
      }
    }
    await refreshWallets()
    await refreshBalances()
  }

  function computeTotals(rows = []) {
    return (rows || []).reduce((acc, r) => {
      acc.sol += Number(r.sol || 0)
      acc.token += Number(r.token || 0)
      return acc
    }, { sol: 0, token: 0 })
  }

  async function refreshWalletBalance(pubkey, mintOverride) {
    if (!pubkey) return
    const mintToUse = mintOverride ?? getWalletMint(pubkey)
    try {
      const res = await api.getWalletBalance({ wallet: pubkey, mint: mintToUse }, 'wallet-refresh')
      const row = res?.data?.find?.((r) => r.publicKey === pubkey) || res?.data?.[0]
      if (!row) return
      const withMint = { ...row, mint: row?.mint ?? mintToUse ?? res?.mint ?? null }
      setBalances((prev) => {
        const nextData = Array.isArray(prev?.data) ? [...prev.data] : []
        const idx = nextData.findIndex((x) => x.publicKey === pubkey)
        if (idx >= 0) nextData[idx] = { ...nextData[idx], ...withMint }
        else nextData.push(withMint)
        return { ...prev, data: nextData, totals: computeTotals(nextData) }
      })
    } catch (e) {
      await log('ui','Refresh wallet balance failed',{ wallet: pubkey, error: String(e) })
    }
  }

  async function refreshBalances(note, mintOverride) {
    setLoading(true)
    const targetMint = mintOverride ?? state.mint
    try {
      const res = await api.getBalances(targetMint, note)
      const baseMint = targetMint || res?.mint || ''
      let nextData = (res?.data || []).map((row) => ({ ...row, mint: row?.mint ?? (baseMint || null) }))
      const customEntries = Object.entries(walletMintSelection || {}).filter(([_, m]) => m && m !== baseMint)
      if (customEntries.length) {
        const updates = await Promise.all(customEntries.map(async ([pk, mint]) => {
          try {
            return await api.getWalletBalance({ wallet: pk, mint }, 'wallet-refresh')
          } catch (e) {
            await log('ui','Refresh wallet balance failed',{ wallet: pk, error: String(e) })
            return null
          }
        }))
        customEntries.forEach(([pk, mint], idx) => {
          const update = updates[idx]
          const row = update?.data?.find?.((r) => r.publicKey === pk) || update?.data?.[0]
          if (!row) return
          const withMint = { ...row, mint: row?.mint ?? mint }
          const existing = nextData.findIndex((r) => r.publicKey === pk)
          if (existing >= 0) nextData[existing] = { ...nextData[existing], ...withMint }
          else nextData.push(withMint)
        })
      }
      setBalances({ mint: baseMint || null, data: nextData, totals: computeTotals(nextData) })
    } catch {
      setBalances({ data: [] })
    } finally {
      setLoading(false)
    }
  }

  function clearLogs() {
    setLogs([])
  }

  async function copyContract() {
    if (!state.mint) return
    try {
      await navigator.clipboard.writeText(state.mint)
      await log('copy','contract address copied',{ value: state.mint })
    } catch {
      window.prompt('Copy contract address:', state.mint)
    }
  }

  async function refreshWallets() {
    try {
      const wl = await api.getWallets()
      const buyers = (wl?.buyers || []).map(b => ({
        ...b,
        buySol: Number(b.buySol || 0),
        buyPercent: Number(b.buyPercent || 0),
        sellPercent: Number(b.sellPercent || 0),
      }))
      setWallets(buyers)
      setSelected(prev => {
        if (!prev || typeof prev !== 'object') return {}
        const allowed = new Set(buyers.map(b => b.publicKey))
        const next = {}
        for (const pk of Object.keys(prev)) {
          if (allowed.has(pk) && prev[pk]) next[pk] = true
        }
        return next
      })
    } catch {
      setWallets([])
    }
  }

  function updateTemplateField(id, key, value) {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, [key]: value } : t))
  }

  function handleTemplateImageChange(id, file) {
    setTemplates((prev) => prev.map((t) => {
      if (t.id !== id) return t
      if (t.imagePreview) URL.revokeObjectURL(t.imagePreview)
      if (!file) return { ...t, imageFile: null, imagePreview: "" }
      return { ...t, imageFile: file, imagePreview: URL.createObjectURL(file) }
    }))
  }

  function addTemplate() {
    setTemplateCount((count) => {
      const next = count + 1
      setTemplates((prev) => {
        const defaultDev = wallets[0]?.publicKey || ""
        const result = prev.concat([makeTemplate(next, defaultDev, templateDefaults)])
        setActiveTemplateIndex(result.length - 1)
        return result
      })
      return next
    })
  }

  function removeTemplate(templateId) {
    const nextCount = templateCount + 1
    setTemplates((prev) => {
      const target = prev.find((t) => t.id === templateId)
      if (target?.imagePreview) URL.revokeObjectURL(target.imagePreview)
      const filtered = prev.filter((t) => t.id !== templateId)
      const defaultDev = wallets[0]?.publicKey || ""
      const nextList = filtered.length ? filtered : [makeTemplate(nextCount, defaultDev, templateDefaults)]
      setActiveTemplateIndex((idx) => Math.min(idx, nextList.length - 1))
      return nextList
    })
    setTemplateCount(nextCount)
  }

  async function persistTrackedTokens(entries) {
    const trimmed = normalizeTrackedTokenEntries(entries)
    setTokenCatalog(trimmed)
    setState((prev) => ({ ...prev, trackedMints: trimmed }))
    try {
      await api.setState({ trackedMints: trimmed }, 'tracked-tokens')
    } catch {}
    return trimmed
  }

  async function upsertTokenCatalog(entry) {
    if (!entry || !entry.mint) return
    const merged = [entry, ...(tokenCatalog || [])]
    await persistTrackedTokens(merged)
  }

  async function useMint(mint) {
    if (!mint) return
    setState((prev) => ({ ...prev, mint }))
    setWalletMintSelection({})
    try { await api.setState({ mint }) } catch {}
    await refreshBalances('switch', mint)
  }

  async function addMintFromInput() {
    const mint = (mintInput || "").trim()
    if (!mint) return
    setMintInput("")
    const validation = await validateMintAddress(mint)
    if (!validation.ok) {
      await log('ui', 'Track token rejected', { mint, error: validation.error })
      return
    }
    let meta = await lookupTokenInfo(mint)
    const label = meta?.name || meta?.symbol || shortMintLabel(mint)
    await upsertTokenCatalog({ mint, name: meta?.name || label, symbol: meta?.symbol || label })
    await useMint(mint)
  }

  async function saveMint() {
    await addMintFromInput()
  }

  async function launchTemplate(templateId) {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    const missing = []
    if (!tpl.name) missing.push('name')
    if (!tpl.symbol) missing.push('symbol')
    if (!tpl.description) missing.push('description')
    if (!tpl.imageFile) missing.push('image')
    if (!tpl.devWalletPubkey) missing.push('dev wallet')
    if (missing.length) {
      updateTemplateField(tpl.id, 'status', 'error')
      updateTemplateField(tpl.id, 'error', `Missing ${missing.join(', ')}`)
      await log("ui", "Create validation failed", { template: tpl.label, missing })
      return { ok: false }
    }
    const fd = new FormData()
    const fields = ['name', 'symbol', 'description', 'website', 'twitter', 'telegram', 'devBuySol', 'slippage', 'priorityFee']
    for (const key of fields) {
      const val = tpl[key]
      if (val !== undefined && val !== null && String(val).length) fd.append(key, val)
    }
    if (tpl.devWalletPubkey) fd.append('devWalletPubkey', tpl.devWalletPubkey)
    fd.append('templateId', tpl.id)
    if (tpl.imageFile) fd.append('image', tpl.imageFile)
    updateTemplateField(tpl.id, 'status', 'running')
    updateTemplateField(tpl.id, 'error', '')
    updateTemplateField(tpl.id, 'mint', '')
    updateTemplateField(tpl.id, 'signature', '')
    try {
      const res = await api.createToken(fd)
      if (res?.error) {
        updateTemplateField(tpl.id, 'status', 'error')
        updateTemplateField(tpl.id, 'error', res.error)
        await log('ui','Create failed',{ template: tpl.label, error: res.error })
        return { ok: false }
      }
      if (res?.mint) {
        updateTemplateField(tpl.id, 'status', 'success')
        updateTemplateField(tpl.id, 'mint', res.mint)
        updateTemplateField(tpl.id, 'signature', res.signature || res.sig || "")
        await useMint(res.mint)
        const devPk = res?.devWallet || tpl.devWalletPubkey || ""
        if (devPk) {
          setWalletMintSelection((prev) => ({ ...prev, [devPk]: res.mint }))
          await refreshWalletBalance(devPk, res.mint)
        }
      } else {
        updateTemplateField(tpl.id, 'status', 'idle')
      }
      return { ok: true }
    } catch (e) {
      updateTemplateField(tpl.id, 'status', 'error')
      updateTemplateField(tpl.id, 'error', String(e))
      await log('ui','Create failed',{ template: tpl.label, error: String(e) })
      return { ok: false }
    }
  }

  async function saveTemplateDraft(templateId) {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    updateTemplateField(tpl.id, 'status', 'idle')
    updateTemplateField(tpl.id, 'error', '')
    await log('template', 'Template saved as draft', { template: tpl.label || tpl.name || tpl.id })
  }

  async function runLaunchBatch(templateIds) {
    const ids = Array.from(new Set((templateIds || []).filter(Boolean)))
    if (!ids.length) return
    setLaunchingTemplates(true)
    setLaunchBatchStatus({ running: true, done: 0, total: ids.length })
    try {
      if (launchMode === 'sequential') {
        let done = 0
        for (const id of ids) {
          await launchTemplate(id)
          done += 1
          setLaunchBatchStatus({ running: true, done, total: ids.length })
        }
      } else {
        await Promise.all(ids.map(async (id) => {
          await launchTemplate(id)
          setLaunchBatchStatus((prev) => ({
            running: true,
            done: Math.min(ids.length, Number(prev.done || 0) + 1),
            total: ids.length,
          }))
        }))
      }
    } finally {
      setLaunchingTemplates(false)
      setLaunchBatchStatus((prev) => ({ ...prev, running: false }))
    }
  }

  async function launchAllTemplates() {
    if (!templates.length) return
    await runLaunchBatch(templates.map((tpl) => tpl.id))
  }

  async function launchSelectedTemplates() {
    const ids = selectedLaunchTemplates.map((tpl) => tpl.id)
    if (!ids.length) {
      await log('ui', 'Launch skipped', { reason: 'no templates selected' })
      return
    }
    await runLaunchBatch(ids)
  }

  async function claimTemplate(templateId) {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    if (!tpl.mint) {
      await log('ui','Collect fees failed',{ template: tpl.label, error: 'Template has no launched mint yet.' })
      return
    }
    const body = {}
    body.mint = tpl.mint
    if (tpl.priorityFee) body.priorityFee = Number(tpl.priorityFee)
    try {
      const res = await api.collectFees(body)
      if (res?.error) {
        await log('ui','Collect fees failed',{ template: tpl.label, error: res.error })
      } else {
        await log('fees','Creator fees claimed',{ template: tpl.label, mint: tpl.mint, signature: res?.signature, launchWallet: res?.launchWallet })
      }
    } catch (e) {
      await log('ui','Collect fees failed',{ template: tpl.label, error: String(e) })
    }
  }

  async function claimFeesForToken(token) {
    if (!token?.mint) return
    const templateMatch = templates.find((tpl) => tpl.mint === token.mint)
    const body = {}
    body.mint = token.mint
    if (templateMatch?.priorityFee) body.priorityFee = Number(templateMatch.priorityFee)
    try {
      const res = await api.collectFees(body)
      if (res?.error) {
        await log('ui', 'Collect fees failed', { mint: token.mint, error: res.error })
        return
      }
      await log('fees', 'Creator fees claimed', { mint: token.mint, signature: res?.signature, launchWallet: res?.launchWallet })
      if (res?.signature) {
        const tid = pushToast({ title: 'Claim Fees', detail: shortMintLabel(token.mint), tx: res.signature })
        monitorTx(res.signature, tid)
      }
    } catch (e) {
      await log('ui', 'Collect fees failed', { mint: token.mint, error: String(e) })
    }
  }

  async function doGen() {
    const body = { count: Number(document.getElementById('gen_count')?.value || 0) }
    const def = document.getElementById('gen_default')?.value
    const prefix = document.getElementById('gen_prefix')?.value
    if (def) body.defaultBuySol = Number(def)
    if (prefix) body.prefix = prefix
    try {
      const res = await api.genWallets(body)
      if (res?.error) { await log('ui','Generate wallets failed',{ error: res.error }); return }
      await refreshWallets()
      await refreshBalances()
    } catch (e) {
      await log('ui','Generate wallets failed',{ error: String(e) })
    }
  }

  async function doBuy(targetPublicKeys = selectedPublicKeys) {
    if (!state.mint) { await log('ui','Batch buy skipped',{ reason:'set contract address' }); return }
    const sel = (targetPublicKeys || []).filter(Boolean)
    if (!sel.length) { await log('ui','Batch buy skipped',{ reason:'no wallets selected' }); return }
    const targetSet = new Set(sel)
    const maxConc = Number(serverConfig.maxConcurrency || 6)
    const defaultConc = Number(serverConfig.defaultConcurrency || 4)
    const desiredConc = buyForm.mode === 'sequential' ? 1 : Number(buyForm.concurrency || defaultConc)
    const safeConc = Math.max(1, Math.min(isNaN(desiredConc) ? defaultConc : desiredConc, maxConc))
    const body = { mint: state.mint, sequential: buyForm.mode === 'sequential', wallets: sel, concurrency: safeConc }
    if (buyForm.slippage) body.slippage = Number(buyForm.slippage)
    if (buyForm.priorityFee) body.priorityFee = Number(buyForm.priorityFee)
    if (buyForm.percent) body.percent = Number(buyForm.percent)
    // Per-wallet overrides from current table (not persisted): buySol and buyPercent
    const source = wallets.filter((w) => targetSet.has(w.publicKey))
    const overrides = []
    for (const w of source) {
      const bs = Number(w.buySol || 0)
      const bp = Number(w.buyPercent || 0)
      if ((bs > 0) || (bp > 0)) overrides.push({ publicKey: w.publicKey, buySol: bs > 0 ? bs : undefined, buyPercent: bp > 0 ? bp : undefined })
    }
    if (overrides.length) body.overrides = overrides
    setBuyStatus({ running: true, done: 0, total: sel.length })
    try {
      const res = await api.buy(body)
      if (res?.error) { await log('ui','Buy failed',{ error: res.error }); return }
    } catch (e) {
      await log('ui','Buy failed',{ error: String(e) })
    } finally {
      setBuyStatus((prev) => ({ ...prev, running: false, total: Math.max(Number(prev.total || 0), sel.length) }))
      await refreshBalances()
    }
  }

  async function doSell(targetPublicKeys = selectedPublicKeys) {
    if (!state.mint) { await log('ui','Batch sell skipped',{ reason:'set contract address' }); return }
    const sel = (targetPublicKeys || []).filter(Boolean)
    if (!sel.length) { await log('ui','Batch sell skipped',{ reason:'no wallets selected' }); return }
    const targetSet = new Set(sel)
    const percent = Number(sellForm.percent || 100)
    const maxConc = Number(serverConfig.maxConcurrency || 6)
    const defaultConc = Number(serverConfig.defaultConcurrency || 4)
    const desiredConc = sellForm.mode === 'sequential' ? 1 : Number(sellForm.concurrency || defaultConc)
    const safeConc = Math.max(1, Math.min(isNaN(desiredConc) ? defaultConc : desiredConc, maxConc))
    const body = { mint: state.mint, percent: isNaN(percent) ? 100 : percent, sequential: sellForm.mode === 'sequential', wallets: sel, concurrency: safeConc }
    if (sellForm.slippage) body.slippage = Number(sellForm.slippage)
    if (sellForm.priorityFee) body.priorityFee = Number(sellForm.priorityFee)
    // Per-wallet sell percent overrides from table
    const source = wallets.filter((w) => targetSet.has(w.publicKey))
    const overrides = []
    for (const w of source) {
      const sp = Number(w.sellPercent || 0)
      if (sp > 0) overrides.push({ publicKey: w.publicKey, sellPercent: sp })
    }
    if (overrides.length) body.overrides = overrides
    setSellStatus({ running: true, done: 0, total: sel.length })
    try {
      const res = await api.sell(body)
      if (res?.error) { await log('ui','Sell failed',{ error: res.error }); return }
    } catch (e) {
      await log('ui','Sell failed',{ error: String(e) })
    } finally {
      setSellStatus((prev) => ({ ...prev, running: false, total: Math.max(Number(prev.total || 0), sel.length) }))
      await refreshBalances()
    }
  }

  async function saveWalletBuyAmounts() {
    const conflicts = wallets.filter(w => Number(w.buySol||0) > 0 && Number(w.buyPercent||0) > 0)
    if (conflicts.length) {
      window.alert(`Choose either Buy (SOL) or Buy (%) per wallet, not both. Conflicts: ${conflicts.length}`)
      return
    }
    const updates = wallets.map(w => ({
      publicKey: w.publicKey,
      buySol: Number(w.buySol || 0),
      buyPercent: Number(w.buyPercent || 0),
      sellPercent: Number(w.sellPercent || 0),
    }))
    try {
      const res = await api.updateBuyAmounts(updates)
      if (res?.error) await log('ui','Save buy amounts failed',{ error: res.error })
    } catch (e) {
      await log('ui','Save buy amounts failed',{ error: String(e) })
    }
    await refreshBalances()
  }

  async function removeWallet(pubkey) {
    const w = wallets.find(x => x.publicKey === pubkey)
    if (!w) return
    const ok = window.confirm(`Remove wallet ${w.name}?`)
    if (!ok) return
    setWallets(prev => prev.filter(p => p.publicKey !== pubkey))
    setBalances(prev => ({
      ...prev,
      data: Array.isArray(prev?.data) ? prev.data.filter(p => p.publicKey !== pubkey) : prev?.data,
    }))
    setSelected(prev => {
      const next = { ...prev }
      delete next[pubkey]
      return next
    })
    try {
      const res = await api.removeWallet({ publicKey: pubkey })
      if (res?.error) {
        await log('ui','Remove wallet failed',{ error: res.error, wallet: pubkey })
        await refreshWallets()
        await refreshBalances()
      }
    } catch (e) {
      await log('ui','Remove wallet failed',{ error: String(e), wallet: pubkey })
      await refreshWallets()
      await refreshBalances()
    }
  }

  async function addWalletManual() {
    const priv = window.prompt('Paste wallet private key (base58 or JSON array):')
    if (!priv) return
    try {
      const res = await api.addWallet({ secretKey: priv })
      if (res?.error) { await log('ui','Add wallet failed',{ error: res.error }) }
      // success is logged by server via SSE
    } catch (e) { await log('ui','Add wallet failed',{ error: String(e) }) }
    await refreshWallets()
    await refreshBalances()
  }

  async function renameWallet(pubkey, nextName) {
    const trimmed = (nextName || '').trim()
    if (!trimmed) { setEditingWalletNames(prev => { const n = { ...prev }; delete n[pubkey]; return n }) ; return }
    try {
      const res = await api.renameWallet({ publicKey: pubkey, name: trimmed })
      if (res?.error) { await log('ui','Rename wallet failed',{ wallet: pubkey, error: res.error }); return }
      setWallets((prev) => prev.map((w) => w.publicKey === pubkey ? { ...w, name: trimmed } : w))
      setBalances((prev) => {
        const data = Array.isArray(prev?.data) ? prev.data.map((row) => row.publicKey === pubkey ? { ...row, name: trimmed } : row) : prev?.data
        return { ...prev, data }
      })
      await refreshWallets()
      // ensure any cached balance rows reflect the new name
      await refreshBalances('rename')
    } catch (e) {
      await log('ui','Rename wallet failed',{ wallet: pubkey, error: String(e) })
    } finally {
      setEditingWalletNames(prev => { const n = { ...prev }; delete n[pubkey]; return n })
    }
  }

  async function viewWalletInTrade(pubkey) {
    if (!pubkey) return
    await refreshWalletBalance(pubkey)
    setActiveTab('trade')
    setShowAllWallets(true)
    setSelected((prev) => ({ ...prev, [pubkey]: true }))
    await log('wallets', 'Viewing wallet in trade controls', { wallet: pubkey })
    setTimeout(() => {
      const el = document.getElementById(`wallet-card-${pubkey}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  async function exportWalletSecret(pubkey) {
    if (!pubkey) return
    try {
      const res = await api.exportWallet({ publicKey: pubkey })
      if (res?.error) { await log('ui','Export wallet failed',{ wallet: pubkey, error: res.error }); return }
      if (res?.secretKey) {
        let copied = false
        try {
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(res.secretKey)
            copied = true
          }
        } catch {}
        if (copied) {
          window.alert('Private key copied to clipboard.')
        } else {
          window.prompt('Wallet private key (copy):', res.secretKey)
        }
        await log('wallets','Wallet secret exported',{ wallet: pubkey })
      }
    } catch (e) {
      await log('ui','Export wallet failed',{ wallet: pubkey, error: String(e) })
    }
  }

  const activeTemplate = templates[activeTemplateIndex] || null

  return (
    <div className="pt-app relative min-h-screen text-[#b6ff9d]">
      <div className="noise-overlay" />
      <header className="pt-header">
        <h1 className="pt-title">PUMP TERMINAL</h1>
        <nav className="pt-tabs">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pt-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="pt-layout">
      <main className="pt-main relative space-y-8">
        {activeTab === "wallet" ? (
        <div className="col-span-12">
          <Section title="WALLET MANAGER" className="panel-wallet" toolbar={
            <div className="flex items-center gap-2">
              <button onClick={()=>setUtilsTab('generate')} className={`px-3 py-1.5 text-xs rounded-md ${utilsTab==='generate'?'bg-[rgba(0,255,0,0.18)] text-[#b6ff9d] border border-[#00ff00]/40':'text-[#6ebd61] hover:text-[#b6ff9d] border border-transparent'}`}>Generate Wallets</button>
              <button onClick={()=>setUtilsTab('transfer')} className={`px-3 py-1.5 text-xs rounded-md ${utilsTab==='transfer'?'bg-[rgba(0,255,0,0.18)] text-[#b6ff9d] border border-[#00ff00]/40':'text-[#6ebd61] hover:text-[#b6ff9d] border border-transparent'}`}>Transfer</button>
              <button onClick={()=>setUtilsTab('sweep')} className={`px-3 py-1.5 text-xs rounded-md ${utilsTab==='sweep'?'bg-[rgba(0,255,0,0.18)] text-[#b6ff9d] border border-[#00ff00]/40':'text-[#6ebd61] hover:text-[#b6ff9d] border border-transparent'}`}>Sweep</button>
            </div>
          }>
            {utilsTab === "transfer" && (
              <div>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="From">
                    <select id="ts_from" className="w-full rounded-xl input-field px-4 py-2.5 text-sm text-slate-100">
                      <option value="">Select wallet</option>
                      {walletSelectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="To"><Input placeholder="Recipient address (base58)" id="ts_to" /></Field>
                  <Field label="Amount SOL">
                    <div className="flex items-center gap-2">
                      <Input type="number" step="0.01" id="ts_amount" placeholder="e.g. 0.25" />
                  <Button variant="outline" onClick={() => {
                    const from = document.getElementById("ts_from").value.trim()
                    const row = balances?.data?.find?.(x => x.publicKey === from)
                    if (row) {
                      const v = Number(row.sol || 0)
                      document.getElementById("ts_amount").value = v.toFixed(2)
                    }
                  }}>Max</Button>
                </div>
              </Field>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button onClick={async () => {
                    const from = document.getElementById("ts_from").value.trim()
                    const to = document.getElementById("ts_to").value.trim()
                    const amount = Number(document.getElementById("ts_amount").value || 0)
                    try { const res = await api.transferSolOne({ fromPubkey: from, toPubkey: to, amountSol: amount }); if (res?.error) await log('ui','Transfer SOL failed',{ error: res.error }); else { await log('transfer','Transfer SOL success',{ sig: res.signature }); const tid = pushToast({ title:'Transfer SOL', detail:'Transaction submitted', tx: res.signature }); monitorTx(res.signature, tid) } } catch (e) { await log('ui','Transfer SOL failed',{ error: String(e) }) }
                    await refreshBalances()
                  }}>Transfer SOL</Button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Field label="From">
                    <select id="tp_from" className="w-full rounded-xl input-field px-4 py-2.5 text-sm text-slate-100">
                      <option value="">Select wallet</option>
                      {walletSelectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="To"><Input placeholder="Recipient address" id="tp_to" /></Field>
                  <Field label="Amount Tokens">
                    <div className="flex items-center gap-2">
                      <Input type="number" step="0.01" id="tp_tokens" placeholder="e.g. 1000" />
                      <Button variant="outline" onClick={() => {
                        const from = document.getElementById("tp_from").value.trim()
                        const row = balances?.data?.find?.(x => x.publicKey === from)
                        if (row) {
                          const v = Number(row.token || 0)
                          document.getElementById("tp_tokens").value = v.toFixed(2)
                        }
                      }}>Max</Button>
                    </div>
                  </Field>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button onClick={async () => {
                    const from = document.getElementById("tp_from").value.trim()
                    const to = document.getElementById("tp_to").value.trim()
                    const tokens = Number(document.getElementById("tp_tokens").value || 0)
                    if (!state.mint) { await log('ui','Transfer SPL failed',{ error: 'No mint set' }); return }
                    try { const res = await api.transferSplOne({ fromPubkey: from, toPubkey: to, mint: state.mint, tokens }); if (res?.error) await log('ui','Transfer SPL failed',{ error: res.error }); else { await log('transfer','Transfer SPL success',{ sig: res.signature }); const tid = pushToast({ title:'Transfer SPL', detail:'Transaction submitted', tx: res.signature }); monitorTx(res.signature, tid) } } catch (e) { await log('ui','Transfer SPL failed',{ error: String(e) }) }
                    await refreshBalances()
                  }}>Transfer SPL</Button>
                </div>
              </div>
            )}
            {utilsTab === "sweep" && (
              <div>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="To (pubkey)"><Input id="sw_to" placeholder="Recipient address" /></Field>
                  <Field label="Keep SOL"><Input type="number" step="0.01" id="sw_keep" placeholder="e.g. 0.01" /></Field>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button onClick={async () => {
                    const to = document.getElementById("sw_to").value.trim()
                    const keep = Number(document.getElementById("sw_keep").value || 0.002)
                    try { const res = await api.sweepSol({ toPubkey: to, keepSol: keep }); if (res?.error) await log('ui','Sweep SOL failed',{ error: res.error }); else { await log('sweep','Sweep SOL done',{ success: res.results?.filter(r=>r.ok).length, failed: res.results?.filter(r=>!r.ok).length }); pushToast({ title:'Sweep SOL', detail:`Submitted (${res.results?.filter(r=>r.ok).length||0} ok)` }) } } catch (e) { await log('ui','Sweep SOL failed',{ error: String(e) }) }
                    await refreshBalances()
                  }}>Sweep SOL</Button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Field label="To (pubkey)"><Input id="swp_to" placeholder="Recipient address" /></Field>
                  <Field label="Mint"><Input id="swp_mint" placeholder="Token mint (base58)" /></Field>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button onClick={async () => {
                    const to = document.getElementById("swp_to").value.trim()
                    const mint = document.getElementById("swp_mint").value.trim()
                    try { const res = await api.sweepSpl({ toPubkey: to, mint }); if (res?.error) await log('ui','Sweep SPL failed',{ error: res.error }); else { await log('sweep','Sweep SPL done',{ success: res.results?.filter(r=>r.ok).length, failed: res.results?.filter(r=>!r.ok).length }); pushToast({ title:'Sweep SPL', detail:`Submitted (${res.results?.filter(r=>r.ok).length||0} ok)` }) } } catch (e) { await log('ui','Sweep SPL failed',{ error: String(e) }) }
                    await refreshBalances()
                  }}>Sweep SPL</Button>
                </div>
              </div>
            )}
            {utilsTab === "generate" && (
              <div>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Count"><Input type="number" id="gen_count" placeholder="Example: 3" /></Field>
                  <Field label="Default buy SOL"><Input type="number" step="0.01" id="gen_default" placeholder="e.g. 0.01" /></Field>
                  <Field label="Prefix"><Input id="gen_prefix" placeholder="e.g. buyer" /></Field>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={doGen}>Generate</Button>
                  <Button onClick={addWalletManual}>Import Wallet</Button>
                </div>
              </div>
            )}

            <div className="mt-6 panel-soft p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[#b8ff9f]">Connected Wallets</h3>
                <Button variant="outline" onClick={() => refreshBalances('wallet-manager')}>Refresh Balances</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-[#00ff00]/35 text-left text-[#84d572]">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Wallet Address</th>
                      <th className="pb-2">SOL Balance</th>
                      <th className="pb-2">Tokens</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletManagerRows.length ? walletManagerRows.map((row) => (
                      <tr key={row.publicKey} className="border-b border-[#00ff00]/20">
                        <td className="py-2 text-[#b8ff9f]">{row.name || 'unnamed-wallet'}</td>
                        <td className="py-2">
                          <CopyKey value={row.publicKey} onCopy={() => log('copy', 'Wallet pubkey copied', { wallet: row.publicKey })} />
                        </td>
                        <td className="py-2">{Number(row.sol || 0).toFixed(3)} SOL</td>
                        <td className="py-2">{Number(row.token || 0).toFixed(2)}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => viewWalletInTrade(row.publicKey)}>View</Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                const next = window.prompt('Rename wallet:', row.name || '')
                                if (next === null) return
                                await renameWallet(row.publicKey, next)
                              }}
                            >
                              Rename
                            </Button>
                            <Button variant="outline" onClick={() => {
                              setUtilsTab('transfer')
                              setTimeout(() => {
                                const to = document.getElementById('ts_to')
                                if (to) to.value = row.publicKey
                              }, 0)
                            }}>Fund</Button>
                            <Button variant="sky" onClick={() => exportWalletSecret(row.publicKey)}>Export</Button>
                            <Button variant="red" onClick={() => removeWallet(row.publicKey)}>Remove</Button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-[#6ebd61]">No wallets loaded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        </div>
        ) : null}

        {activeTab === "templates" ? (
        <div className="col-span-12">
          <Section
            title="TOKEN TEMPLATES"
            className="panel-templates"
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={addTemplate}>Add Template</Button>
              </div>
            }
          >
            <div className="space-y-4">
              {templates.length ? templates.map((tpl, idx) => {
                const isOpen = templateOpen[tpl.id] !== false
                const statusLabel = tpl.status === 'running' ? 'Launching...' : tpl.status === 'success' ? 'Launched' : 'Draft'
                const statusTone = tpl.status === 'running' ? 'is-running' : tpl.status === 'success' ? 'is-success' : 'is-draft'
                return (
                  <article key={tpl.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.45)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setTemplateOpen((prev) => ({ ...prev, [tpl.id]: !isOpen }))
                            setActiveTemplateIndex(idx)
                          }}
                          className="text-left"
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Template {idx + 1}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-100">{tpl.name || tpl.label}</h3>
                            {tpl.symbol ? <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-300">{tpl.symbol}</span> : null}
                          </div>
                          <div className={`pt-template-status ${statusTone}`}>{statusLabel}</div>
                        </button>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setTemplateOpen((prev) => ({ ...prev, [tpl.id]: !isOpen }))
                              setActiveTemplateIndex(idx)
                            }}
                          >
                            {isOpen ? 'Collapse' : 'Expand'}
                          </Button>
                          <Button variant="outline" onClick={() => saveTemplateDraft(tpl.id)}>Draft</Button>
                          <Button variant="red" onClick={() => removeTemplate(tpl.id)}>Remove</Button>
                        </div>
                      </div>

                    {isOpen ? (
                      <div className="space-y-4 pt-4">
                        <div className="w-full">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start">
                            <div className="relative aspect-square h-64 w-64 overflow-hidden rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/60">
                              {tpl.imagePreview ? (
                                <img src={tpl.imagePreview} alt={tpl.name || 'Token artwork'} className="h-full w-full object-cover block" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center px-3 text-center text-sm text-slate-400">Click to upload image</div>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                onChange={(e) => handleTemplateImageChange(tpl.id, e.target.files?.[0])}
                              />
                            </div>
                            <div className="max-w-md rounded-xl bg-black/30 p-4">
                              <div className="space-y-4 text-sm">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">File size and type</p>
                                  <p className="mt-1 text-slate-300">Image - max 15mb. '.jpg', '.gif' or '.png' recommended</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resolution and aspect ratio</p>
                                  <p className="mt-1 text-slate-300">Image - min. 1000x1000px, 1:1 square recommended</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Name</div>
                            <Input maxLength={31} placeholder="Token name" value={tpl.name} onChange={(e) => updateTemplateField(tpl.id, 'name', e.target.value)} />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Symbol</div>
                            <Input maxLength={10} placeholder="Ticker (e.g. PUMP)" value={tpl.symbol} onChange={(e) => updateTemplateField(tpl.id, 'symbol', e.target.value.toUpperCase())} />
                          </div>
                          <div className="md:col-span-2">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Description</div>
                            <textarea
                              rows={2}
                              placeholder="Short description"
                              value={tpl.description}
                              onChange={(e) => updateTemplateField(tpl.id, 'description', e.target.value)}
                              className="w-full rounded-xl border border-slate-800/70 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/60 transition-all"
                            />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Website</div>
                            <Input placeholder="(optional) https://..." value={tpl.website} onChange={(e) => updateTemplateField(tpl.id, 'website', e.target.value)} />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Twitter</div>
                            <Input placeholder="(optional) https://x.com/..." value={tpl.twitter} onChange={(e) => updateTemplateField(tpl.id, 'twitter', e.target.value)} />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Telegram</div>
                            <Input placeholder="(optional) https://t.me/..." value={tpl.telegram} onChange={(e) => updateTemplateField(tpl.id, 'telegram', e.target.value)} />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Dev Wallet</div>
                            <select
                              value={tpl.devWalletPubkey}
                              onChange={(e) => updateTemplateField(tpl.id, 'devWalletPubkey', e.target.value)}
                              className="w-full rounded-xl border border-slate-800/70 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/60"
                            >
                              <option value="">Select wallet for this launch</option>
                              {devWalletChoices.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex flex-col gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Dev Buy SOL</div>
                              <Input type="number" step="0.01" placeholder="e.g. 0.01" value={tpl.devBuySol} onChange={(e) => updateTemplateField(tpl.id, 'devBuySol', e.target.value)} />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Slippage %</div>
                              <Input type="number" step="1" placeholder="e.g. 10" value={tpl.slippage} onChange={(e) => updateTemplateField(tpl.id, 'slippage', e.target.value)} />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Priority Fee (SOL)</div>
                              <Input type="number" step="0.000001" placeholder="e.g. 0.00001" value={tpl.priorityFee} onChange={(e) => updateTemplateField(tpl.id, 'priorityFee', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              }) : (
                <div className="text-sm text-slate-400">No templates yet.</div>
              )}
            </div>
          </Section>
        </div>
        ) : null}

        {activeTab === "launch" ? (
        <div className="col-span-12">
          <Section title="LAUNCH" className="panel-launch">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="panel-soft p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-[#6ebd61]">Mode</span>
                    <SegTabs value={launchMode} onChange={setLaunchMode} options={[{ label: 'Sequential', value: 'sequential' }, { label: 'Parallel', value: 'parallel' }]} />
                  </div>
                </div>
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[#6ebd61]">Select Templates To Launch</p>
                <div className="max-h-[340px] space-y-2 overflow-auto">
                  {templates.length ? templates.map((tpl, idx) => (
                    <label key={tpl.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#00ff00]/20 bg-black/50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!launchSelection[tpl.id]}
                        onChange={(e) => setLaunchSelection((prev) => ({ ...prev, [tpl.id]: e.target.checked }))}
                      />
                      <span className="text-sm text-[#b8ff9f]">Template {idx + 1}: {tpl.name || tpl.label}</span>
                    </label>
                  )) : <div className="text-sm text-[#6ebd61]">No templates created yet.</div>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (allLaunchSelected) {
                        setLaunchSelection({})
                      } else {
                        const next = {}
                        for (const tpl of templates) next[tpl.id] = true
                        setLaunchSelection(next)
                      }
                    }}
                  >
                    {allLaunchSelected ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button onClick={launchSelectedTemplates} disabled={launchingTemplates || !selectedLaunchTemplates.length}>LAUNCH</Button>
                  <Button variant="outline" onClick={launchAllTemplates} disabled={launchingTemplates || !templates.length}>Launch All</Button>
                </div>
                <div className="mt-3">
                  <Progress label="Launch Progress" value={launchBatchStatus.done} total={launchBatchStatus.total} running={launchBatchStatus.running} />
                </div>
              </div>
              <div className="panel-soft p-5">
                <h3 className="mb-3 text-lg font-semibold text-[#b8ff9f]">Configuration Preview</h3>
                <div className="space-y-3">
                  {(selectedLaunchTemplates.length ? selectedLaunchTemplates : activeTemplate ? [activeTemplate] : []).map((tpl) => (
                    <div key={tpl.id} className="rounded-xl border border-[#00ff00]/25 bg-black/50 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-[#b8ff9f]">{tpl.name || tpl.label}</div>
                          <div className="text-xs text-[#6ebd61]">{tpl.symbol || 'NO SYMBOL'} - {tpl.devWalletPubkey ? shortMintLabel(tpl.devWalletPubkey) : 'No Dev Wallet'}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => runLaunchBatch([tpl.id])} disabled={launchingTemplates}>Launch Template</Button>
                          <Button variant="outline" onClick={() => claimTemplate(tpl.id)} disabled={!tpl.mint}>Claim Fees</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs text-[#84d572] sm:grid-cols-3">
                        <div>Dev Buy: {tpl.devBuySol || '0'}</div>
                        <div>Slippage: {tpl.slippage || '0'}%</div>
                        <div>Priority Fee: {tpl.priorityFee || '0'}</div>
                      </div>
                    </div>
                  ))}
                  {!selectedLaunchTemplates.length && !activeTemplate ? <div className="text-sm text-[#6ebd61]">No launch configuration selected.</div> : null}
                </div>
              </div>
            </div>
          </Section>
        </div>
        ) : null}

        {activeTab === "tokens" ? (
        <div className="col-span-12">
          <Section title="MY TOKENS" className="panel-tokens">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {launchedTokens.length ? launchedTokens.map((token) => {
                const title = token?.name || token?.symbol || 'Unnamed Token'
                const symbol = token?.symbol || 'N/A'
                const marketCap = token?.marketCap || token?.mc || null
                return (
                  <div key={token.mint} className="panel-soft p-5">
                    <h3 className="text-lg font-semibold text-[#b8ff9f]">{title}</h3>
                    <p className="mt-1 text-sm text-[#84d572]">{symbol}</p>
                    <p className="mt-2 break-all text-xs text-[#6ebd61]">{token.mint}</p>
                    <p className="mt-3 text-sm text-[#b8ff9f]">Market Cap: {marketCap != null ? marketCap : '--'}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        className="inline-flex items-center rounded-xl border border-[#00ff00]/50 bg-[rgba(0,255,0,0.1)] px-4 py-2 text-sm text-[#b8ff9f] transition hover:bg-[#00ff00] hover:text-black"
                        href={`https://pump.fun/coin/${token.mint}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Pump
                      </a>
                      <Button variant="rose" onClick={async () => {
                        await useMint(token.mint)
                        setActiveTab('trade')
                      }}>Sell</Button>
                      <Button variant="outline" onClick={() => claimFeesForToken(token)}>Claim Fees</Button>
                    </div>
                  </div>
                )
              }) : (
                <div className="rounded-xl border border-dashed border-[#00ff00]/35 bg-black/60 px-6 py-10 text-sm text-[#6ebd61]">
                  No launched tokens yet.
                </div>
              )}
            </div>
          </Section>
        </div>
        ) : null}

        {activeTab === "trade" ? (
        <div className="col-span-12">
          <Section title={`TRADE CONTROLS ${loading ? "(loading...)" : ""}`} className="panel-trade">
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="kpi-card px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Total Wallets</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{wallets.length}</p>
              </div>
              <div className="kpi-card px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Total SOL</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{Number(balances?.totals?.sol || 0).toFixed(3)} SOL</p>
              </div>
              <div className="kpi-card px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Total Token Holdings</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{Number(balances?.totals?.token || 0).toFixed(2)}</p>
                {!state.mint ? <p className="mt-1 text-xs text-slate-500">Set a mint to load token balances</p> : null}
              </div>
            </div>

            <div className="mb-6 panel-soft p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Contract Address</p>
                      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <Input
                          className="lg:flex-1"
                          placeholder="Enter contract / mint address"
                          value={mintInput}
                          onChange={(e) => setMintInput(e.target.value)}
                          onKeyDown={(e)=>{ if (e.key === 'Enter') saveMint() }}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={saveMint} disabled={!mintInput.trim()}>Add</Button>
                          <Button variant="outline" onClick={copyContract} disabled={!state.mint}>Copy CA</Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Tracked Tokens</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-3 min-h-[220px]">
                    {displayedTokens.length ? displayedTokens.map((t) => {
                      const isActive = t.mint === state.mint
                      const label = t.symbol || t.name || shortMintLabel(t.mint) || 'Token'
                      const shortMint = t.mint ? `${t.mint.slice(0,4)}...${t.mint.slice(-4)}` : ''
                      return (
                        <div
                          key={t.mint}
                          className={`rounded-xl border px-4 py-3 text-left text-sm transition flex items-center justify-between gap-3 min-w-[320px] ${isActive ? 'border-indigo-400/60 bg-indigo-500/10 text-indigo-100' : 'border-slate-800/70 bg-slate-900/70 text-slate-200 hover:border-indigo-500/60 hover:text-indigo-100'}`}
                        >
                          <button
                            onClick={() => useMint(t.mint)}
                            className="flex-1 text-left"
                          >
                            <div className="font-semibold leading-tight">{label}</div>
                            <div className="text-xs text-slate-400">{shortMint}</div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={async () => {
                              try { await navigator.clipboard.writeText(t.mint) } catch {}
                            }}>Copy CA</Button>
                            <Button variant="red" onClick={async () => {
                              const next = (tokenCatalog || []).filter(x => x.mint !== t.mint)
                              await persistTrackedTokens(next)
                            }}>Remove</Button>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-900/50 px-6 py-12 text-sm text-slate-500 w-full min-h-[200px] flex items-start justify-start">
                        <span className="self-start mt-2">Tracked tokens will appear here once added.</span>
                      </div>
                    )}
                    {tokenCatalog.length > TOKEN_DISPLAY_LIMIT ? (
                      <div>
                        <Button variant="outline" onClick={()=>setShowAllTokens(v=>!v)}>
                          {showAllTokens ? 'Show Less' : 'Show More'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 panel-soft p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-200">Batch Controls</h3>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Buy Mode</span>
                    <SegTabs value={buyForm.mode} onChange={(v)=>setBuyForm(p=>({...p, mode:v}))} options={[{label:'Concurrent', value:'concurrent'},{label:'Sequential', value:'sequential'}]} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Sell Mode</span>
                    <SegTabs value={sellForm.mode} onChange={(v)=>setSellForm(p=>({...p, mode:v}))} options={[{label:'Concurrent', value:'concurrent'},{label:'Sequential', value:'sequential'}]} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-4">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {buyForm.mode !== 'sequential' ? (
                      <MiniField label="Concurrency"><Input type="number" min="1" max={serverConfig.maxConcurrency || 6} value={buyForm.concurrency} onChange={e=>setBuyForm(p=>({...p, concurrency:e.target.value}))} placeholder={String(serverConfig.defaultConcurrency || 4)} /></MiniField>
                    ) : null}
                    <MiniField label="Slippage %"><Input type="number" step="1" value={buyForm.slippage} onChange={e=>setBuyForm(p=>({...p, slippage:e.target.value}))} placeholder="10" /></MiniField>
                    <MiniField label="Priority Fee (SOL)"><Input type="number" step="0.000001" value={buyForm.priorityFee} onChange={e=>setBuyForm(p=>({...p, priorityFee:e.target.value}))} placeholder="0.00001" /></MiniField>
                    <MiniField label="Buy % of SOL"><Input type="number" step="1" value={buyForm.percent||''} onChange={e=>setBuyForm(p=>({...p, percent:e.target.value}))} placeholder="50" /></MiniField>
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex gap-2">
                      <Button variant="emerald" onClick={() => doBuy()} disabled={buyStatus.running || !hasSelection}>Buy Selected</Button>
                      <Button variant="outline" onClick={() => doBuy(wallets.map((w) => w.publicKey))} disabled={buyStatus.running || !wallets.length}>Buy All</Button>
                    </div>
                    <div className="flex-1"><Progress variant="emerald" label="Buy Progress" value={buyStatus.done} total={buyStatus.total} running={buyStatus.running} /></div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-4">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {sellForm.mode !== 'sequential' ? (
                      <MiniField label="Concurrency"><Input type="number" min="1" max={serverConfig.maxConcurrency || 6} value={sellForm.concurrency} onChange={e=>setSellForm(p=>({...p, concurrency:e.target.value}))} placeholder={String(serverConfig.defaultConcurrency || 4)} /></MiniField>
                    ) : null}
                    <MiniField label="Slippage %"><Input type="number" step="1" value={sellForm.slippage} onChange={e=>setSellForm(p=>({...p, slippage:e.target.value}))} placeholder="10" /></MiniField>
                    <MiniField label="Priority Fee (SOL)"><Input type="number" step="0.000001" value={sellForm.priorityFee} onChange={e=>setSellForm(p=>({...p, priorityFee:e.target.value}))} placeholder="0.00001" /></MiniField>
                    <MiniField label="Global Sell %"><Input type="number" step="1" value={sellForm.percent} onChange={e=>{
                      let v = e.target.value
                      const n = Number(v)
                      const clamped = isNaN(n) ? '' : String(Math.max(0, Math.min(100, n)))
                      setSellForm(p=>({...p, percent: clamped }))
                    }} placeholder="100" /></MiniField>
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex gap-2">
                      <Button variant="rose" onClick={() => doSell()} disabled={sellStatus.running || !hasSelection}>Sell Selected</Button>
                      <Button variant="outline" onClick={() => doSell(wallets.map((w) => w.publicKey))} disabled={sellStatus.running || !wallets.length}>Sell All</Button>
                    </div>
                    <div className="flex-1"><Progress variant="rose" label="Sell Progress" value={sellStatus.done} total={sellStatus.total} running={sellStatus.running} /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setAutoRefresh(v=>!v)}>{autoRefresh ? 'Auto Refresh: On' : 'Auto Refresh: Off'}</Button>
              <Button variant="outline" onClick={()=>refreshBalances('manual')}>Refresh All Balances</Button>
              <Button variant="outline" onClick={saveWalletBuyAmounts}>Save Buy Amounts</Button>
              <span className="text-xs text-slate-400">Edits are local until saved</span>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Selected</span>
                <span className="rounded-full border border-slate-800/80 bg-slate-900/60 px-3 py-1 text-xs text-slate-200">{selectedCount}/{wallets.length}</span>
                <Button variant="outline" onClick={() => {
                  if (allSelected) {
                    setSelected({})
                  } else {
                    const next = {}
                    for (const w of wallets) next[w.publicKey] = true
                    setSelected(next)
                  }
                }}>{allSelected ? 'Deselect All Wallets' : 'Select All Wallets'}</Button>
                <Button variant="red" onClick={removeSelectedWallets} disabled={!hasSelection}>Remove Selected Wallets</Button>
              </div>
            </div>

            <div className="space-y-4">
              {displayedWallets.length === 0 ? (
                <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-400">No wallets loaded yet</div>
              ) : (
                displayedWallets.map((r) => {
                  const walletMeta = wallets.find(w => w.publicKey === r.publicKey) || r || {}
                  const isSelected = !!selected[r.publicKey]
                  const balanceRow = r
                  const cardClasses = "panel-soft p-6 space-y-4"
                  const displayName = walletMeta.name || r.name || 'Wallet'
                  const selectedMint = tokenCatalog.length ? getWalletMint(r.publicKey) : ''
                  const buySolValue = Number(walletMeta.buySol || 0)
                  const buyPercentValue = Number(walletMeta.buyPercent || 0)
                  const sellPercentValue = Number(walletMeta.sellPercent || 0)
                  return (
                    <div key={r.publicKey} id={`wallet-card-${r.publicKey}`} className={cardClasses}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="mt-1" checked={isSelected} onChange={e=>{
                            const checked = e.target.checked
                            setSelected(prev => ({ ...prev, [r.publicKey]: checked }))
                          }} />
                          <div className="flex flex-col">
                            {editingWalletNames[r.publicKey] !== undefined ? (
                              <input
                                autoFocus
                                value={editingWalletNames[r.publicKey]}
                                onChange={(e)=>setEditingWalletNames(prev=>({ ...prev, [r.publicKey]: e.target.value }))}
                                onBlur={()=>renameWallet(r.publicKey, editingWalletNames[r.publicKey])}
                                onKeyDown={(e)=>{
                                  if (e.key === 'Enter') renameWallet(r.publicKey, editingWalletNames[r.publicKey])
                                  if (e.key === 'Escape') setEditingWalletNames(prev=>{ const n={...prev}; delete n[r.publicKey]; return n })
                                }}
                                className="rounded-md bg-slate-900/80 border border-slate-700 px-2 py-1 text-sm text-slate-100"
                              />
                            ) : (
                              <span
                                className="text-sm font-semibold text-slate-100 cursor-text hover:text-emerald-200"
                                title="Double-click to rename"
                                onDoubleClick={() => { setEditingWalletNames(prev=>({ ...prev, [r.publicKey]: (walletMeta.name || r.name || '') })) }}
                              >
                                {displayName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 flex justify-center">
                          <CopyKey value={r.publicKey} onCopy={(v)=>log('copy','Wallet pubkey copied',{ wallet:r.publicKey })} className="text-white text-base" />
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-200">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">SOL</p>
                            <p className="mt-1 text-base font-semibold">{Number(balanceRow.sol).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Tokens</p>
                            <p className="mt-1 text-base font-semibold">{Number(balanceRow.token).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">Mint</span>
                          <select
                            value={selectedMint}
                            onChange={(e) => {
                              const val = e.target.value
                              setWalletMintSelection((prev) => {
                                const next = { ...prev }
                                if (val) next[r.publicKey] = val; else delete next[r.publicKey]
                                return next
                              })
                              refreshWalletBalance(r.publicKey, val || state.mint)
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200"
                          >
                            <option value="">{tokenCatalog.length ? (state.mint ? `Active (${shortMintLabel(state.mint)})` : 'Use active mint') : 'Select mint (none tracked)'}</option>
                            {tokenCatalog.map((t) => {
                              const label = t.symbol || t.name || shortMintLabel(t.mint) || 'Token'
                              return <option key={t.mint} value={t.mint}>{label} ({shortMintLabel(t.mint)})</option>
                            })}
                          </select>
                        </div>
                        <Button variant="outline" className="px-3 py-2" onClick={()=>refreshWalletBalance(r.publicKey)}>Refresh Balance</Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <MiniField label="Buy (SOL)">
                          <Input type="number" step="0.01" value={buySolValue} onChange={(e)=>{
                            const v = Number(e.target.value || 0)
                            setWallets(prev=>prev.map(p=>p.publicKey===r.publicKey?{
                              ...p,
                              buySol: v,
                              buyPercent: v>0 ? 0 : p.buyPercent,
                            }:p))
                          }} placeholder="0.00" />
                        </MiniField>
                        <MiniField label="Buy % of SOL">
                          <Input type="number" step="1" value={buyPercentValue} onChange={(e)=>{
                            let v = e.target.value
                            const n = Number(v)
                            const clamped = isNaN(n) ? '' : String(Math.max(0, Math.min(100, n)))
                            const num = Number(clamped || 0)
                            setWallets(prev=>prev.map(p=>p.publicKey===r.publicKey?{
                              ...p,
                              buyPercent: num,
                              buySol: num>0 ? 0 : p.buySol,
                            }:p))
                          }} placeholder="50" />
                        </MiniField>
                        <MiniField label="Sell %">
                          <Input type="number" step="1" value={sellPercentValue} onChange={(e)=>{
                            let v = e.target.value
                            const n = Number(v)
                            const clamped = isNaN(n) ? '' : String(Math.max(0, Math.min(100, n)))
                            const num = Number(clamped || 0)
                            setWallets(prev=>prev.map(p=>p.publicKey===r.publicKey?{...p, sellPercent: num}:p))
                          }} placeholder="50" />
                        </MiniField>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="emerald" onClick={async()=>{
                            if (!selectedMint) { await log('ui', 'Row buy skipped', { reason:'set contract address', wallet:r.publicKey }); return }
                            const amt = buySolValue
                            if (!amt || amt<=0) { await log('ui','Row buy skipped',{ reason:'no amount', wallet:r.publicKey }); return }
                            try {
                              const res = await api.buyOne({ pubkey:r.publicKey, mint: selectedMint, amountSol: amt, slippage: Number(buyForm.slippage), priorityFee: Number(buyForm.priorityFee) })
                              if (res?.error) { await log('ui','Row buy failed',{ wallet:r.publicKey, error: res.error }); return }
                              if (res?.signature) { await log('buy','Row buy success',{ wallet:r.publicKey, sig: res.signature }); const tid = pushToast({ title:'Buy submitted', detail:`Wallet ${walletMeta.name || shortMintLabel(r.publicKey)}`, tx: res.signature }); monitorTx(res.signature, tid) }
                            } catch (e) { await log('ui','Row buy failed',{ wallet:r.publicKey, error: String(e) }) }
                            await refreshWalletBalance(r.publicKey, selectedMint)
                          }}>Buy</Button>
                          <Button variant="emerald" onClick={async()=>{
                            if (!selectedMint) { await log('ui', 'Row buy% skipped', { reason:'set contract address', wallet:r.publicKey }); return }
                            const pct = buyPercentValue
                            if (!pct || pct<=0) { await log('ui','Row buy% skipped',{ reason:'no percent', wallet:r.publicKey }); return }
                            const balSol = Number(balanceRow?.sol || 0)
                            const feeBuffer = Number(serverConfig.feeBufferSol ?? 0.03)
                            const available = Math.max(0, balSol - feeBuffer)
                            const amt = Math.max(0, (pct / 100) * available)
                            if (!amt || amt<=0) { await log('ui','Row buy% skipped',{ reason:'insufficient SOL', wallet:r.publicKey }); return }
                            try {
                              const res = await api.buyOne({ pubkey:r.publicKey, mint: selectedMint, amountSol: amt, slippage: Number(buyForm.slippage), priorityFee: Number(buyForm.priorityFee) })
                              if (res?.error) { await log('ui','Row buy% failed',{ wallet:r.publicKey, error: res.error }); return }
                              if (res?.signature) { await log('buy','Row buy% success',{ wallet:r.publicKey, sig: res.signature }); const tid = pushToast({ title:'Buy % submitted', detail:`Wallet ${walletMeta.name || shortMintLabel(r.publicKey)}`, tx: res.signature }); monitorTx(res.signature, tid) }
                            } catch (e) { await log('ui','Row buy% failed',{ wallet:r.publicKey, error: String(e) }) }
                          await refreshWalletBalance(r.publicKey, selectedMint)
                        }}>Buy %</Button>
                        <Button variant="rose" onClick={async()=>{
                            if (!selectedMint) { await log('ui', 'Row sell skipped', { reason:'set contract address', wallet:r.publicKey }); return }
                            const pct = Number(walletMeta.sellPercent || 0)
                            if (!pct || pct<=0) { await log('ui','Row sell skipped',{ reason:'no percent', wallet:r.publicKey }); return }
                            const balTokens = Number(balanceRow?.token || 0)
                            const amt = (pct / 100) * balTokens
                            if (!amt || amt<=0) { await log('ui','Row sell skipped',{ reason:'no tokens to sell', wallet:r.publicKey }); return }
                            try {
                            const res = await api.sellOne({ pubkey:r.publicKey, mint: selectedMint, percent: pct, slippage: Number(sellForm.slippage), priorityFee: Number(sellForm.priorityFee) })
                              if (res?.error) { await log('ui','Row sell failed',{ wallet:r.publicKey, error: res.error }); return }
                              if (res?.signature) { await log('sell','Row sell success',{ wallet:r.publicKey, sig: res.signature }); const tid = pushToast({ title:'Sell submitted', detail:`Wallet ${walletMeta.name || shortMintLabel(r.publicKey)}`, tx: res.signature }); monitorTx(res.signature, tid) }
                            } catch (e) { await log('ui','Row sell failed',{ wallet:r.publicKey, error: String(e) }) }
                            await refreshWalletBalance(r.publicKey, selectedMint)
                          }}>Sell</Button>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="sky" onClick={()=>exportWalletSecret(r.publicKey)}>Export Key</Button>
                          <Button variant="red" onClick={()=>removeWallet(r.publicKey)}>Remove</Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {(hiddenWalletCount > 0 || showAllWallets) ? (
              <div className="mt-4 flex justify-center">
                <Button variant="emerald" onClick={()=>setShowAllWallets(v=>!v)}>{showAllWallets ? 'Collapse Wallets' : `Show All Wallets (${hiddenWalletCount} more)`}</Button>
              </div>
            ) : null}
          </Section>
        </div>
        ) : null}

      </main>
      <aside className="pt-logs">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-2xl font-semibold text-[#9cff7a]">LOGS</h3>
          <Button variant="ghost" onClick={clearLogs} disabled={!logs.length}>Clear</Button>
        </div>
        <LogsPanel logs={logs} />
      </aside>
      </div>

      {toasts.length ? (
        <div className="fixed bottom-6 right-6 z-40 space-y-3 max-w-sm">
          {toasts.map((t) => {
            const status = t.status || 'pending'
            const tone = {
              pending: 'border-amber-300/50 bg-slate-900/90',
              success: 'border-emerald-400/60 bg-slate-900/90',
              error: 'border-rose-400/60 bg-slate-900/90',
            }[status] || 'border-slate-700 bg-slate-900/90'
            return (
              <div key={t.id} className={`rounded-xl border px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.45)] text-sm text-slate-100 ${tone}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-emerald-300">{t.title || 'Transaction'}</div>
                    {t.detail ? <div className="text-slate-200 mt-1">{t.detail}</div> : null}
                    {t.tx ? (
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono truncate max-w-[160px]">{shortMintLabel(t.tx)}</span>
                        <a className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2" href={`https://solscan.io/tx/${t.tx}`} target="_blank" rel="noreferrer">View</a>
                      </div>
                    ) : null}
                  </div>
                  <button onClick={()=>removeToast(t.id)} className="text-slate-500 hover:text-slate-200 text-lg leading-none px-1">x</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

    </div>
  )
}
