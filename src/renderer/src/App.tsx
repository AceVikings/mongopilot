import {
  ArrowClockwise,
  ArrowsOutSimple,
  BracketsCurly,
  CaretDown,
  CaretRight,
  ChartLineUp,
  Check,
  CirclesThreePlus,
  Code,
  Database,
  DotsThree,
  FolderSimple,
  Funnel,
  HardDrives,
  Lightning,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plus,
  Robot,
  ShieldCheck,
  SidebarSimple,
  Sparkle,
  Star,
  Table,
  X,
} from "@phosphor-icons/react"
import { FormEvent, useEffect, useState } from "react"
import type {
  AccessMode,
  CollectionInfo,
  CopilotStatus,
  DatabaseInfo,
  SavedConnection,
  SaveConnectionInput,
} from "../../shared/types"

const demoDatabases: DatabaseInfo[] = [
  { name: "analytics", sizeOnDisk: 837_812_224 },
  { name: "commerce", sizeOnDisk: 194_263_040 },
  { name: "operations", sizeOnDisk: 68_157_440 },
]

const demoCollections: CollectionInfo[] = [
  { name: "events", type: "collection" },
  { name: "sessions", type: "collection" },
  { name: "weekly_rollups", type: "collection" },
]

const demoDocuments = [
  { _id: "evt_01J7F2QK8M", event: "checkout.completed", region: "eu-west", value: 184.2, createdAt: "2026-07-16T09:42:18Z" },
  { _id: "evt_01J7F2NG3R", event: "subscription.renewed", region: "us-east", value: 72.8, createdAt: "2026-07-16T09:41:53Z" },
  { _id: "evt_01J7F2JX9A", event: "cart.abandoned", region: "ap-south", value: 47.35, createdAt: "2026-07-16T09:40:27Z" },
  { _id: "evt_01J7F2H1VP", event: "checkout.completed", region: "us-west", value: 231.6, createdAt: "2026-07-16T09:38:04Z" },
]

type Message = { role: "assistant" | "user"; text: string }

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 shrink-0 place-items-center rounded-md text-muted transition-[background-color,color,transform] duration-150 ease-product hover:bg-raised hover:text-ink active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      {children}
    </button>
  )
}

function AccessBadge({ mode }: { mode: AccessMode }) {
  const label = mode === "read-only" ? "READ" : "READ / WRITE"
  return (
    <span className="rounded-sm border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted">
      {label}
    </span>
  )
}

function ConnectionDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (connection: SavedConnection) => void }) {
  const [name, setName] = useState("")
  const [uri, setUri] = useState("")
  const [accessMode, setAccessMode] = useState<AccessMode>("read-only")
  const [favorite, setFavorite] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!uri.trim()) {
      setError("Enter a connection string.")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (!window.mongoPilot) throw new Error("Connection storage is available in the Electron app.")
      const input: SaveConnectionInput = { name: name.trim() || "MongoDB deployment", uri, accessMode, favorite }
      onSaved(await window.mongoPilot.connections.save(input))
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this connection.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-canvas/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="connection-title"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-line-strong bg-panel shadow-2xl shadow-canvas/60"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-accent">New deployment</p>
            <h2 id="connection-title" className="text-xl font-semibold tracking-tight">Connect MongoDB</h2>
          </div>
          <IconButton label="Close connection dialog" onClick={onClose}><X size={18} aria-hidden="true" /></IconButton>
        </header>
        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="space-y-2">
            <label htmlFor="connection-name" className="block text-xs font-medium">Connection name</label>
            <input
              id="connection-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Production analytics"
              className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm placeholder:text-faint focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="connection-uri" className="block text-xs font-medium">Connection string <span className="text-danger">*</span></label>
            <input
              id="connection-uri"
              type="password"
              value={uri}
              onChange={(event) => setUri(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "connection-error" : "connection-hint"}
              placeholder="mongodb+srv://user:password@cluster.example.net"
              className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-sm placeholder:font-sans placeholder:text-faint focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:outline-none"
            />
            <p id="connection-hint" className="text-xs text-muted">Any connection string accepted by the MongoDB driver is supported. Credentials are encrypted with your operating system keychain.</p>
            {error && <p id="connection-error" role="alert" className="text-sm text-danger">{error}</p>}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium">Agent access</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["read-only", "read-write"] as const).map((mode) => (
                <label key={mode} className={`flex min-h-20 cursor-pointer flex-col justify-between rounded-md border p-3 transition-[border-color,background-color] duration-150 ease-product ${accessMode === mode ? "border-accent bg-accent-soft" : "border-line bg-canvas hover:border-line-strong"}`}>
                  <input className="sr-only" type="radio" name="access-mode" value={mode} checked={accessMode === mode} onChange={() => setAccessMode(mode)} />
                  <ShieldCheck size={18} className={accessMode === mode ? "text-accent" : "text-muted"} aria-hidden="true" />
                  <span className="text-xs font-medium capitalize">{mode.replace("-", " ")}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted">Pilot only receives MongoDB tools allowed by this mode. Every operation is checked again in the desktop process; MongoDB roles remain authoritative.</p>
          </fieldset>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-xs text-muted">
            <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} className="size-4 accent-accent" />
            Pin this connection to the top
          </label>
          <footer className="flex justify-end gap-2 border-t border-line pt-5">
            <button type="button" onClick={onClose} className="h-10 rounded-md px-4 text-sm font-medium text-muted transition-[background-color,color] duration-150 ease-product hover:bg-raised hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">Cancel</button>
            <button type="submit" disabled={saving} aria-busy={saving} className="h-10 rounded-md bg-accent px-4 text-sm font-semibold text-canvas transition-[background-color,transform] duration-150 ease-product hover:bg-accent-strong active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel focus-visible:outline-none disabled:cursor-wait disabled:opacity-60">
              {saving ? "Encrypting..." : "Save connection"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function CopilotPanel({
  status,
  context,
  canWrite,
  onModeChange,
}: {
  status: CopilotStatus
  context: {
    connectionId?: string
    connectionName: string
    connectionHost?: string
    database: string
    collection: string
    accessMode: AccessMode
    availableConnections: Array<{ name: string; host: string; accessMode: AccessMode; favorite: boolean }>
  }
  canWrite: boolean
  onModeChange: (mode: AccessMode) => void
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "I can draft filters, aggregation pipelines, schema checks, and report plans. Connect a deployment and I can use MongoDB tools within its agent access mode." },
  ])
  const [prompt, setPrompt] = useState("")
  const [sending, setSending] = useState(false)
  const [localStatus, setLocalStatus] = useState(status)
  const [modeMenuOpen, setModeMenuOpen] = useState(false)

  useEffect(() => setLocalStatus(status), [status])

  async function send(event: FormEvent) {
    event.preventDefault()
    const text = prompt.trim()
    if (!text || sending) return
    setMessages((current) => [...current, { role: "user", text }])
    setPrompt("")
    setSending(true)
    try {
      if (!window.mongoPilot) throw new Error("OpenCode is available in the Electron app.")
      if (localStatus.state !== "ready") setLocalStatus(await window.mongoPilot.copilot.start())
      const reply = await window.mongoPilot.copilot.prompt({ text, context })
      setMessages((current) => [...current, { role: "assistant", text: reply.text }])
      if (window.mongoPilot) setLocalStatus(await window.mongoPilot.copilot.status())
    } catch (reason) {
      setMessages((current) => [...current, { role: "assistant", text: `OpenCode error: ${reason instanceof Error ? reason.message : "Request failed."}` }])
      setLocalStatus(await window.mongoPilot.copilot.status())
    } finally {
      setSending(false)
    }
  }

  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-l border-line bg-shell max-lg:hidden">
      <div className="border-b border-line bg-panel px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-ink">{context.connectionId ? `${context.database}.${context.collection}` : "Saved connections"}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
              <span className={`size-1.5 rounded-full ${localStatus.state === "ready" ? "bg-accent" : localStatus.state === "error" ? "bg-danger" : "bg-warning"}`} />
              OpenCode {localStatus.state} · {context.connectionId ? `tools scoped to ${context.accessMode}` : `${context.availableConnections.length} available`}
            </p>
          </div>
          <AccessBadge mode={context.accessMode} />
        </div>
      </div>
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-3" aria-live="polite">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={message.role === "user" ? "ml-6 rounded-lg bg-raised p-3" : "pr-2"}>
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted">
              {message.role === "assistant" ? <Robot size={13} aria-hidden="true" /> : null}{message.role === "assistant" ? "Pilot" : "You"}
            </div>
            <p className="whitespace-pre-wrap text-xs leading-5 text-ink">{message.text}</p>
          </article>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-muted"><span className="size-1.5 rounded-full bg-accent" /><span>OpenCode is working<span className="cursor-blink">_</span></span></div>
        )}
      </div>
      <form onSubmit={send} className="border-t border-line p-3">
        <label htmlFor="pilot-prompt" className="sr-only">Ask Pilot</label>
        <div className="rounded-lg border border-line-strong bg-panel focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <div className="flex min-h-8 items-center gap-2 border-b border-line px-3 font-mono text-[10px] text-muted">
            <HardDrives size={13} className="shrink-0 text-accent" aria-hidden="true" />
            <span className="truncate">
              {context.connectionId
                ? `${context.connectionName} · ${context.connectionHost} · ${context.database}.${context.collection}`
                : `${context.availableConnections.length} saved connection${context.availableConnections.length === 1 ? "" : "s"} available`}
            </span>
          </div>
          <textarea
            id="pilot-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            rows={3}
            placeholder="Draft an aggregation for weekly revenue..."
            className="w-full resize-none bg-transparent px-3 pt-3 text-xs leading-5 placeholder:text-faint focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setModeMenuOpen(false)
              }}
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={modeMenuOpen}
                onClick={() => setModeMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setModeMenuOpen(false)
                }}
                className="flex h-7 items-center gap-1.5 rounded border border-line bg-canvas px-2 text-[10px] font-medium text-muted transition-[border-color,background-color,color] duration-150 ease-product hover:border-line-strong hover:text-ink focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:outline-none"
              >
                <ShieldCheck size={12} className="text-accent" aria-hidden="true" />
                Agent: {context.accessMode === "read-only" ? "Read" : "Read / write"}
                <CaretDown size={10} aria-hidden="true" />
              </button>
              {modeMenuOpen && (
                <div role="menu" aria-label="Agent mode" className="absolute bottom-full left-0 z-10 mb-2 w-40 overflow-hidden rounded-md border border-line-strong bg-raised p-1 shadow-xl shadow-canvas/50">
                  <button type="button" role="menuitemradio" aria-checked={context.accessMode === "read-only"} onClick={() => { onModeChange("read-only"); setModeMenuOpen(false) }} className="flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-[11px] text-muted hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                    <Check size={12} className={context.accessMode === "read-only" ? "opacity-100" : "opacity-0"} aria-hidden="true" /> Read
                  </button>
                  <button type="button" role="menuitemradio" aria-checked={context.accessMode === "read-write"} disabled={!canWrite} onClick={() => { onModeChange("read-write"); setModeMenuOpen(false) }} className="flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-[11px] text-muted hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40">
                    <Check size={12} className={context.accessMode === "read-write" ? "opacity-100" : "opacity-0"} aria-hidden="true" /> Read / write
                  </button>
                </div>
              )}
            </div>
            <button type="submit" disabled={!prompt.trim() || sending} aria-label="Send prompt" className="grid size-9 place-items-center rounded-md bg-accent text-canvas transition-[background-color,transform] duration-150 ease-product hover:bg-accent-strong active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel focus-visible:outline-none disabled:bg-line-strong disabled:text-muted">
              <PaperPlaneTilt size={16} weight="fill" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-faint">Review generated queries before running them.</p>
      </form>
    </aside>
  )
}

export default function App() {
  const [connections, setConnections] = useState<SavedConnection[]>([])
  const [activeConnection, setActiveConnection] = useState<SavedConnection | null>(null)
  const [databases, setDatabases] = useState<DatabaseInfo[]>(demoDatabases)
  const [collections, setCollections] = useState<CollectionInfo[]>(demoCollections)
  const [selectedDatabase, setSelectedDatabase] = useState("analytics")
  const [selectedCollection, setSelectedCollection] = useState("events")
  const [documents, setDocuments] = useState<unknown[]>(demoDocuments)
  const [filter, setFilter] = useState('{ "createdAt": { "$gte": "2026-07-16T00:00:00Z" } }')
  const [showConnectionDialog, setShowConnectionDialog] = useState(false)
  const [querying, setQuerying] = useState(false)
  const [error, setError] = useState("")
  const [duration, setDuration] = useState(42)
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatus>({ state: "starting" })
  const [agentMode, setAgentMode] = useState<AccessMode>("read-only")
  const [activeTab, setActiveTab] = useState("Documents")

  useEffect(() => {
    if (!window.mongoPilot) return
    void window.mongoPilot.connections.list().then(setConnections).catch((reason) => setError(String(reason)))
    void window.mongoPilot.copilot.start().then(setCopilotStatus).catch((reason) => {
      setCopilotStatus({ state: "error", message: reason instanceof Error ? reason.message : "OpenCode failed to start." })
    })
  }, [])

  async function connect(connection: SavedConnection) {
    setError("")
    try {
      if (!window.mongoPilot) throw new Error("Connections are available in the Electron app.")
      const result = await window.mongoPilot.connections.connect(connection.id)
      setActiveConnection(result.connection)
      setAgentMode("read-only")
      setDatabases(result.databases)
      setDocuments([])
      const first = result.databases[0]?.name
      if (first) await selectDatabase(connection.id, first)
      else {
        setCollections([])
        setSelectedDatabase("")
        setSelectedCollection("")
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connection failed.")
    }
  }

  async function selectDatabase(connectionId: string, name: string) {
    setSelectedDatabase(name)
    if (!window.mongoPilot) return
    const next = await window.mongoPilot.database.listCollections(connectionId, name)
    setCollections(next)
    setSelectedCollection(next[0]?.name ?? "")
    setDocuments([])
  }

  async function runQuery() {
    if (!activeConnection) {
      setDuration(42)
      setDocuments(demoDocuments)
      return
    }
    if (!window.mongoPilot) return
    if (!selectedDatabase || !selectedCollection) return
    setQuerying(true)
    setError("")
    try {
      const result = await window.mongoPilot.database.find({
        connectionId: activeConnection.id,
        database: selectedDatabase,
        collection: selectedCollection,
        filter,
        limit: 20,
      })
      setDocuments(result.documents)
      setDuration(result.durationMs)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Query failed.")
    } finally {
      setQuerying(false)
    }
  }

  const context = {
    connectionId: activeConnection?.id,
    connectionName: activeConnection?.name ?? "No active connection",
    connectionHost: activeConnection?.host,
    database: activeConnection ? selectedDatabase : "",
    collection: activeConnection ? selectedCollection : "",
    accessMode: agentMode,
    availableConnections: connections.map(({ name, host, accessMode, favorite }) => ({ name, host, accessMode, favorite })),
  }

  return (
    <main className="grid h-[100dvh] min-h-[720px] min-w-[1100px] grid-rows-[40px_minmax(0,1fr)] overflow-hidden bg-canvas text-ink">
      <header className="title-drag grid grid-cols-[240px_minmax(0,1fr)_320px] items-center border-b border-line bg-shell max-lg:grid-cols-[240px_minmax(0,1fr)] max-md:grid-cols-[72px_minmax(0,1fr)]">
        <div className="truncate pl-20 text-xs font-semibold tracking-tight max-md:pl-3">Mongo Pilot <span className="ml-1 font-mono text-[9px] font-normal uppercase tracking-widest text-faint max-md:hidden">alpha</span></div>
        <div className="flex h-full items-center border-x border-line px-3 max-lg:border-r-0">
          <MagnifyingGlass size={14} className="text-faint" aria-hidden="true" />
          <span className="ml-2 min-w-0 truncate text-xs text-faint">Search connections, databases, collections</span>
          <kbd className="ml-auto rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘ K</kbd>
        </div>
        <div className="flex items-center justify-between px-3 max-lg:hidden">
          <span className="flex items-center gap-2 text-xs font-semibold"><Sparkle size={14} weight="fill" className="text-accent" aria-hidden="true" /> Pilot</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted"><span className={`size-1.5 rounded-full ${copilotStatus.state === "ready" ? "bg-accent" : "bg-line-strong"}`} />{copilotStatus.state}</span>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[240px_minmax(480px,1fr)_320px] max-lg:grid-cols-[240px_minmax(0,1fr)] max-md:grid-cols-[72px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-line bg-shell">
          <div className="flex h-12 items-center justify-between border-b border-line px-3 max-md:justify-center">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted max-md:hidden">Connections</h2>
            <IconButton label="Add connection" onClick={() => setShowConnectionDialog(true)}><Plus size={16} aria-hidden="true" /></IconButton>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto py-2">
            <button type="button" onClick={() => { setActiveConnection(null); setAgentMode("read-only"); setDatabases(demoDatabases); setCollections(demoCollections); setSelectedDatabase("analytics"); setSelectedCollection("events"); setDocuments(demoDocuments) }} className={`flex min-h-11 w-full items-center gap-2.5 border-l-2 px-3 text-left text-xs transition-[background-color,border-color] duration-150 ease-product focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent focus-visible:outline-none ${!activeConnection ? "border-accent bg-accent-soft" : "border-transparent hover:bg-panel"}`}>
              <Database size={17} weight="duotone" className="shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0 flex-1 max-md:hidden"><span className="block truncate font-medium">Preview workspace</span><span className="block truncate font-mono text-[10px] text-muted">LOCAL DEMO</span></span>
            </button>
            {connections.sort((a, b) => Number(b.favorite) - Number(a.favorite)).map((connection) => (
              <button key={connection.id} type="button" onClick={() => void connect(connection)} className={`flex min-h-11 w-full items-center gap-2.5 border-l-2 px-3 text-left text-xs transition-[background-color,border-color] duration-150 ease-product focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent focus-visible:outline-none ${activeConnection?.id === connection.id ? "border-accent bg-accent-soft" : "border-transparent hover:bg-panel"}`}>
                <HardDrives size={17} className="shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 max-md:hidden"><span className="flex items-center gap-1.5 truncate font-medium">{connection.favorite && <Star size={11} weight="fill" className="text-warning" aria-label="Favorite" />}{connection.name}</span><span className={`block truncate font-mono text-[10px] ${activeConnection?.id === connection.id ? "text-muted" : "text-faint"}`}>{connection.host}</span></span>
              </button>
            ))}
            <div className="mx-3 my-3 border-t border-line max-md:mx-2" />
            <div className="px-3 max-md:hidden">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-faint">{selectedDatabase || "Databases"}</p>
              {databases.map((database) => (
                <div key={database.name}>
                  <button type="button" onClick={() => activeConnection ? void selectDatabase(activeConnection.id, database.name) : setSelectedDatabase(database.name)} className="flex min-h-9 w-full items-center gap-2 rounded px-1 text-left text-[11px] text-muted transition-[background-color,color] duration-150 ease-product hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                    {database.name === selectedDatabase ? <CaretDown size={12} aria-hidden="true" /> : <CaretRight size={12} aria-hidden="true" />}<FolderSimple size={14} aria-hidden="true" /><span className="truncate">{database.name}</span>
                  </button>
                  {database.name === selectedDatabase && collections.map((collection) => (
                    <button key={collection.name} type="button" onClick={() => { setSelectedCollection(collection.name); setDocuments([]) }} className={`ml-6 flex min-h-8 w-[calc(100%-1.5rem)] items-center gap-2 rounded px-2 text-left text-[11px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${selectedCollection === collection.name ? "bg-raised text-ink" : "text-faint hover:text-muted"}`}>
                      <CirclesThreePlus size={13} aria-hidden="true" /><span className="truncate">{collection.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-line p-2">
            <button type="button" onClick={() => setShowConnectionDialog(true)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-line text-xs font-medium text-muted transition-[border-color,background-color,color] duration-150 ease-product hover:border-line-strong hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><Plus size={14} aria-hidden="true" /><span className="max-md:hidden">New connection</span></button>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-canvas">
          <header className="flex h-12 items-center gap-3 border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-2 text-xs"><span className="truncate text-muted">{activeConnection?.name ?? "Preview workspace"}</span><CaretRight size={11} className="text-faint" aria-hidden="true" /><span className="truncate font-medium">{selectedDatabase}.{selectedCollection}</span></div>
            <div className="ml-auto flex items-center gap-1"><AccessBadge mode={context.accessMode} /><IconButton label="More collection options"><DotsThree size={18} weight="bold" aria-hidden="true" /></IconButton></div>
          </header>
          <nav aria-label="Collection views" className="scrollbar-thin flex h-11 shrink-0 items-end gap-5 overflow-x-auto border-b border-line px-4">
            {["Documents", "Aggregations", "Schema", "Indexes", "Reports"].map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`h-11 shrink-0 border-b-2 text-xs font-medium transition-[border-color,color] duration-150 ease-product focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${activeTab === tab ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>{tab}</button>
            ))}
          </nav>

          {activeTab === "Documents" ? (
            <>
              <div className="border-b border-line bg-shell p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 rounded-md border border-line-strong bg-canvas focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                    <div className="flex h-8 items-center border-b border-line px-3 font-mono text-[10px] uppercase tracking-wider text-faint"><Funnel size={13} className="mr-2" aria-hidden="true" />Filter</div>
                    <label htmlFor="filter" className="sr-only">MongoDB document filter</label>
                    <textarea id="filter" value={filter} onChange={(event) => setFilter(event.target.value)} spellCheck={false} rows={2} className="block w-full resize-none bg-transparent px-3 py-2 font-mono text-xs leading-5 text-ink focus:outline-none" />
                  </div>
                  <button type="button" onClick={() => void runQuery()} disabled={querying} aria-busy={querying} className="flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold text-canvas transition-[background-color,transform] duration-150 ease-product hover:bg-accent-strong active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-shell focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted"><Lightning size={14} weight="fill" aria-hidden="true" />{querying ? "Running" : "Run"}</button>
                </div>
                {error && <div role="alert" className="mt-2 flex items-center justify-between rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"><span>{error}</span><button type="button" onClick={() => setError("")} className="rounded p-1 focus-visible:ring-2 focus-visible:ring-danger focus-visible:outline-none" aria-label="Dismiss error"><X size={14} /></button></div>}
              </div>
              <div className="flex h-10 items-center border-b border-line px-3">
                <div className="flex items-center gap-1"><IconButton label="Refresh documents"><ArrowClockwise size={15} aria-hidden="true" /></IconButton><IconButton label="Expand document view"><ArrowsOutSimple size={15} aria-hidden="true" /></IconButton></div>
                <div className="mx-2 h-4 border-l border-line" />
                <button type="button" className="flex h-8 items-center gap-1.5 rounded bg-raised px-2.5 text-xs text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><BracketsCurly size={14} aria-hidden="true" />JSON</button>
                <button type="button" className="flex h-8 items-center gap-1.5 rounded px-2.5 text-xs text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"><Table size={14} aria-hidden="true" />Table</button>
                <p className="ml-auto font-mono text-[10px] text-faint">{documents.length} DOCUMENTS · {duration} MS</p>
              </div>
              <div className="scrollbar-thin flex-1 overflow-auto p-3">
                {querying ? (
                  <div className="space-y-2" aria-label="Loading documents">{[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-md border border-line bg-panel" />)}</div>
                ) : documents.length ? (
                  <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-panel">
                    {documents.map((document, index) => (
                      <article key={index} className="grid grid-cols-[36px_minmax(0,1fr)] text-xs">
                        <div className="border-r border-line bg-shell py-3 text-center font-mono text-faint">{String(index + 1).padStart(2, "0")}</div>
                        <pre className="scrollbar-thin overflow-x-auto whitespace-pre-wrap px-4 py-3 font-mono leading-5 text-muted">{JSON.stringify(document, null, 2)}</pre>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-line">
                    <div className="max-w-sm text-center"><Code size={28} className="mx-auto mb-3 text-faint" aria-hidden="true" /><h3 className="text-sm font-semibold">No documents loaded</h3><p className="mt-1 text-sm leading-6 text-muted">Run the filter to inspect this collection. Results are limited to 20 documents in this first pass.</p><button type="button" onClick={() => void runQuery()} className="mt-4 h-10 rounded-md border border-line-strong px-4 text-xs font-medium hover:bg-panel focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">Run query</button></div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8">
              <div className="max-w-md text-center"><ChartLineUp size={30} className="mx-auto mb-4 text-accent" aria-hidden="true" /><p className="font-mono text-xs uppercase tracking-widest text-accent">{activeTab}</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Workspace scaffolded</h2><p className="mt-2 text-sm leading-6 text-muted">This surface is included in the Compass-parity information architecture. Its database operations will be added after the document workflow is validated.</p></div>
            </div>
          )}
        </section>

        <CopilotPanel
          status={copilotStatus}
          context={context}
          canWrite={activeConnection?.accessMode === "read-write"}
          onModeChange={setAgentMode}
        />
      </div>
      {showConnectionDialog && <ConnectionDialog onClose={() => setShowConnectionDialog(false)} onSaved={(connection) => setConnections((current) => [...current, connection])} />}
    </main>
  )
}
