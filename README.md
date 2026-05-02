# Netlify AI Gateway Proxy

API-only OpenAI-compatible proxy for Netlify AI Gateway.

This project exposes `/v1/models` and `/v1/chat/completions` for OpenAI-compatible clients such as CherryStudio. It uses Netlify Edge Functions and Netlify AI Gateway, so you do not need to provide OpenAI or Anthropic provider keys on Netlify.

## Required Netlify environment variable

Set this in **Site settings > Environment variables**:

| Variable | Description |
| --- | --- |
| `PROXY_API_KEY` | Shared Bearer token used by your client to access this proxy |

Netlify AI Gateway automatically injects provider credentials and base URLs into Netlify compute. Do not set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` unless you intentionally want to use your own provider accounts instead of Netlify AI Gateway.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/healthz` | None | Health check |
| GET | `/v1/models` | Bearer | List models |
| POST | `/v1/chat/completions` | Bearer | OpenAI-compatible chat completions |

## CherryStudio

After deployment, configure CherryStudio with:

```text
Base URL: https://YOUR-SITE.netlify.app/v1
API Key: your PROXY_API_KEY value
```

Do not set the Base URL to `/v1/chat/completions`; CherryStudio appends endpoint paths itself.

## Deploy from GitHub

1. Import this repository in Netlify.
2. Use the existing `netlify.toml`.
3. Set `PROXY_API_KEY`.
4. Deploy.

The build command is:

```text
npm run build
```

The publish directory is:

```text
public
```

## Local development

```bash
npm install
netlify dev
```

For local testing without Netlify AI Gateway, set provider keys in `.env`.
