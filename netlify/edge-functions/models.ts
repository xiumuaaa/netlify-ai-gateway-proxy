import type { Config } from '@netlify/edge-functions'
import { CORS_HEADERS } from './auth.ts'

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
