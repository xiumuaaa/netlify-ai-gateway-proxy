import type { Config } from '@netlify/edge-functions'

export default async (_req: Request) => {
  return Response.json({ ok: true }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export const config: Config = {
  path: '/api/healthz',
  method: 'GET',
}
