import { useEffect, useState, type ReactNode } from 'react'

const OPENAI_MODELS = ['gpt-5.2', 'gpt-5-mini', 'gpt-5-nano', 'o4-mini', 'o3']
const ANTHROPIC_MODELS = ['claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-0.5 text-xs rounded border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-between bg-black/30 rounded px-3 py-2 font-mono text-sm text-emerald-300 break-all">
      <span>{children}</span>
      <CopyButton text={children} />
    </div>
  )
}

function Badge({ color, label }: { color: 'blue' | 'orange'; label: string }) {
  const cls =
    color === 'blue'
      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'

  return <span className={`text-xs px-2 py-0.5 rounded font-mono ${cls}`}>{label}</span>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  )
}

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  const cls =
    method === 'GET'
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : 'bg-blue-500/20 text-blue-300 border-blue-500/30'

  return <span className={`text-xs font-bold px-2 py-0.5 rounded border font-mono ${cls}`}>{method}</span>
}

export default function App() {
  const [origin, setOrigin] = useState('https://your-site.netlify.app')
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    const currentOrigin = window.location.origin
    setOrigin(currentOrigin)

    fetch(`${currentOrigin}/api/healthz`)
      .then((r) => (r.ok ? setStatus('online') : setStatus('offline')))
      .catch(() => setStatus('offline'))
  }, [])

  const baseUrl = `${origin}/v1`

  return (
    <div className="min-h-screen text-white/85" style={{ background: 'hsl(222, 47%, 11%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">API Portal</h1>
            <div className="flex items-center gap-1.5 text-sm">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  status === 'online'
                    ? 'bg-green-400'
                    : status === 'offline'
                      ? 'bg-red-400'
                      : 'bg-yellow-400 animate-pulse'
                }`}
              />
              <span className="text-white/50 text-xs">
                {status === 'checking' ? 'Checking...' : status === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <p className="text-white/40 text-sm">OpenAI-compatible proxy API</p>
        </header>

        <Section title="Base URL">
          <CodeBlock>{baseUrl}</CodeBlock>
          <p className="text-sm text-white/45">
            Use this value in OpenAI-compatible clients. Do not add /chat/completions manually.
          </p>
        </Section>

        <Section title="Authentication">
          <p className="text-sm text-white/50">
            All API endpoints except <code className="text-white/70">/api/healthz</code> require a Bearer token from
            the <code className="text-white/70"> PROXY_API_KEY</code> environment variable.
          </p>
          <CodeBlock>{'Authorization: Bearer YOUR_PROXY_API_KEY'}</CodeBlock>
        </Section>

        <Section title="Endpoints">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MethodBadge method="GET" />
                <span className="font-mono text-sm text-white/80">/api/healthz</span>
              </div>
              <p className="text-sm text-white/40 pl-1">Service health check. No auth required.</p>
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MethodBadge method="GET" />
                <span className="font-mono text-sm text-white/80">/v1/models</span>
              </div>
              <p className="text-sm text-white/40 pl-1">List all available models.</p>
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MethodBadge method="POST" />
                <span className="font-mono text-sm text-white/80">/v1/chat/completions</span>
              </div>
              <p className="text-sm text-white/40 pl-1">
                OpenAI-compatible chat completions with streaming support.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Quick Start">
          <div className="bg-black/30 rounded p-3 font-mono text-xs text-white/70 space-y-0.5">
            <p>
              <span className="text-yellow-400">curl</span> {origin}/v1/chat/completions \
            </p>
            <p className="pl-4">
              -H <span className="text-green-300">"Authorization: Bearer YOUR_PROXY_API_KEY"</span> \
            </p>
            <p className="pl-4">
              -H <span className="text-green-300">"Content-Type: application/json"</span> \
            </p>
            <p className="pl-4">
              -d <span className="text-green-300">{'\'{"model":"gpt-5-mini","messages":[{"role":"user","content":"Hello"}]}\''}</span>
            </p>
          </div>
        </Section>

        <Section title="Available Models">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">OpenAI</p>
              <div className="flex flex-wrap gap-2">
                {OPENAI_MODELS.map((m) => (
                  <div key={m} className="flex items-center gap-1.5">
                    <Badge color="blue" label={m} />
                    <CopyButton text={m} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Anthropic</p>
              <div className="flex flex-wrap gap-2">
                {ANTHROPIC_MODELS.map((m) => (
                  <div key={m} className="flex items-center gap-1.5">
                    <Badge color="orange" label={m} />
                    <CopyButton text={m} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="CherryStudio Setup">
          <ol className="space-y-3 text-sm text-white/60">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-white/70 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Open CherryStudio Settings.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-white/70 text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>
                Add a new provider and select <strong className="text-white/80">OpenAI Compatible</strong>.
              </span>
            </li>
            <li className="flex gap-3 flex-col">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-white/70 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>Set the Base URL:</span>
              </div>
              <CodeBlock>{baseUrl}</CodeBlock>
            </li>
            <li className="flex gap-3 flex-col">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-white/70 text-xs flex items-center justify-center font-bold">
                  4
                </span>
                <span>Set the API Key to your PROXY_API_KEY value:</span>
              </div>
              <CodeBlock>YOUR_PROXY_API_KEY</CodeBlock>
            </li>
          </ol>
        </Section>

        <p className="text-center text-xs text-white/20 pb-4">
          Provider keys are read from Netlify Environment Variables and are never exposed to the browser.
        </p>
      </div>
    </div>
  )
}
