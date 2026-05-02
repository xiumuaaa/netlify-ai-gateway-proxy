import type { Config } from '@netlify/edge-functions'
import { CORS_HEADERS, isAuthorized, unauthorized } from './auth.ts'

interface Message {
  role: string
  content: unknown
}

interface ChatRequest {
  model: string
  messages: Message[]
  stream?: boolean
  max_tokens?: number
  max_completion_tokens?: number
  temperature?: number
  top_p?: number
  stop?: string | string[]
  stop_sequences?: string[]
}

function makeId(): string {
  return 'chatcmpl-' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
}

// --- OpenAI proxy (non-stream) ---
async function openaiNonStream(body: ChatRequest, apiKey: string): Promise<Response> {
  const baseUrl = (Netlify.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return Response.json(json, { status: res.status, headers: CORS_HEADERS })
}

// --- OpenAI proxy (stream) ---
async function openaiStream(body: ChatRequest, apiKey: string): Promise<Response> {
  const baseUrl = (Netlify.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, stream: true }),
  })

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text()
    return new Response(err, { status: upstream.status, headers: CORS_HEADERS })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// --- Anthropic request conversion ---
function toAnthropicBody(body: ChatRequest) {
  const system = body.messages
    .filter((m) => m.role === 'system')
    .map((m) => stringifyContent(m.content))
    .join('\n')

  const messages = body.messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: normalizeAnthropicContent(m.content) }))

  const stopSequences = body.stop_sequences ?? normalizeStop(body.stop)

  return {
    model: body.model,
    messages,
    ...(system ? { system } : {}),
    max_tokens: body.max_tokens ?? body.max_completion_tokens ?? 4096,
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
    ...(stopSequences.length > 0 ? { stop_sequences: stopSequences } : {}),
  }
}

function normalizeStop(stop: ChatRequest['stop']): string[] {
  if (typeof stop === 'string') return [stop]
  if (Array.isArray(stop)) return stop.filter((value): value is string => typeof value === 'string')
  return []
}

function stringifyContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .join('')
  }
  return ''
}

function normalizeAnthropicContent(content: unknown): unknown {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const text = stringifyContent(content)
    return text || ''
  }
  return ''
}

// --- Anthropic non-stream → OpenAI format ---
async function anthropicNonStream(body: ChatRequest, apiKey: string): Promise<Response> {
  const baseUrl = (Netlify.env.get('ANTHROPIC_BASE_URL') ?? 'https://api.anthropic.com/v1').replace(/\/$/, '')
  const res = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(toAnthropicBody(body)),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return Response.json(err, { status: res.status, headers: CORS_HEADERS })
  }

  const data = await res.json() as {
    id: string
    model: string
    content: Array<{ type: string; text: string }>
    stop_reason: string
    usage: { input_tokens: number; output_tokens: number }
  }

  const text = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('')
  const finishReason = data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason ?? 'stop'

  return Response.json({
    id: data.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: finishReason,
    }],
    usage: {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  }, { headers: CORS_HEADERS })
}

// --- Anthropic stream → OpenAI SSE format ---
async function anthropicStream(body: ChatRequest, apiKey: string): Promise<Response> {
  const baseUrl = (Netlify.env.get('ANTHROPIC_BASE_URL') ?? 'https://api.anthropic.com/v1').replace(/\/$/, '')
  const upstream = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ ...toAnthropicBody(body), stream: true }),
  })

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text()
    return new Response(err, { status: upstream.status, headers: CORS_HEADERS })
  }

  const id = makeId()
  const model = body.model
  const created = Math.floor(Date.now() / 1000)

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      // Send initial role chunk
      const roleChunk = {
        id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }],
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(roleChunk)}\n\n`))
    },
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true })
      const lines = text.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue

        let event: Record<string, unknown>
        try { event = JSON.parse(raw) } catch { continue }

        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string } | undefined
          if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
            const oaiChunk = {
              id,
              object: 'chat.completion.chunk',
              created,
              model,
              choices: [{ index: 0, delta: { content: delta.text }, finish_reason: null }],
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(oaiChunk)}\n\n`))
          }
        } else if (event.type === 'message_delta') {
          const delta = event.delta as { stop_reason?: string } | undefined
          const finishReason = delta?.stop_reason === 'end_turn' ? 'stop' : (delta?.stop_reason ?? 'stop')
          const doneChunk = {
            id,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`))
        } else if (event.type === 'message_stop') {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        }
      }
    },
    flush(controller) {
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    },
  })

  upstream.body.pipeTo(transform.writable).catch(() => {})

  return new Response(transform.readable, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (!isAuthorized(req)) {
    return unauthorized()
  }

  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { message: 'Invalid JSON body', type: 'invalid_request_error' } },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  if (!body.model) {
    return Response.json(
      { error: { message: 'model is required', type: 'invalid_request_error' } },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const model = body.model.toLowerCase()
  const isStream = body.stream === true

  if (model.startsWith('gpt') || model.startsWith('o')) {
    const apiKey = Netlify.env.get('OPENAI_API_KEY') ?? ''
    if (!apiKey) {
      return Response.json(
        { error: { message: 'OPENAI_API_KEY is not configured', type: 'server_error' } },
        { status: 500, headers: CORS_HEADERS },
      )
    }
    return isStream ? openaiStream(body, apiKey) : openaiNonStream(body, apiKey)
  }

  if (model.startsWith('claude')) {
    const apiKey = Netlify.env.get('ANTHROPIC_API_KEY') ?? ''
    if (!apiKey) {
      return Response.json(
        { error: { message: 'ANTHROPIC_API_KEY is not configured', type: 'server_error' } },
        { status: 500, headers: CORS_HEADERS },
      )
    }
    return isStream ? anthropicStream(body, apiKey) : anthropicNonStream(body, apiKey)
  }

  return Response.json(
    { error: { message: `Unsupported model: ${body.model}`, type: 'invalid_request_error' } },
    { status: 400, headers: CORS_HEADERS },
  )
}

export const config: Config = {
  path: '/v1/chat/completions',
  method: ['POST', 'OPTIONS'],
}
