export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key, X-Proxy-Password',
}

export function getProxyKey(): string {
  return Netlify.env.get('PROXY_API_KEY') ?? ''
}

export function getRequestToken(req: Request): string {
  const auth = req.headers.get('Authorization') ?? ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }

  return (
    req.headers.get('x-api-key') ??
    req.headers.get('api-key') ??
    req.headers.get('x-proxy-password') ??
    req.headers.get('proxy-password') ??
    ''
  ).trim()
}

export function isAuthorized(req: Request): boolean {
  const proxyKey = getProxyKey()
  if (!proxyKey) return false
  return getRequestToken(req) === proxyKey
}

export function unauthorized(): Response {
  return Response.json(
    { error: { message: 'Unauthorized', type: 'invalid_request_error' } },
    { status: 401, headers: CORS_HEADERS },
  )
}
