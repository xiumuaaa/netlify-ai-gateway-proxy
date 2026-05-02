import type { Config } from '@netlify/edge-functions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

const MODELS = [
  { id: 'gpt-5.2', owned_by: 'openai' },
  { id: 'gpt-5-mini', owned_by: 'openai' },
  { id: 'gpt-5-nano', owned_by: 'openai' },
  { id: 'o4-mini', owned_by: 'openai' },
  { id: 'o3', owned_by: 'openai' },
  { id: 'claude-opus-4-7', owned_by: 'anthropic' },
  { id: 'claude-opus-4-6', owned_by: 'anthropic' },
  { id: 'claude-sonnet-4-6', owned_by: 'anthropic' },
  { id: 'claude-haiku-4-5', owned_by: 'anthropic' },
]

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const proxyApiKey = Netlify.env.get('PROXY_API_KEY')
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (!proxyApiKey || token !== proxyApiKey) {
    return Response.json({ error: { message: 'Unauthorized', type: 'invalid_request_error' } }, {
      status: 401,
      headers: CORS_HEADERS,
    })
  }

  const data = MODELS.map((m) => ({
    id: m.id,
    object: 'model',
    created: 0,
    owned_by: m.owned_by,
  }))

  return Response.json({ object: 'list', data }, { headers: CORS_HEADERS })
}

export const config: Config = {
  path: '/v1/models',
  method: ['GET', 'OPTIONS'],
}
