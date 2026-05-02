# API Portal

An OpenAI-compatible reverse proxy API deployed on Netlify, with a React frontend portal for documentation and setup guidance.

## What it does

- Exposes OpenAI-compatible endpoints: `/v1/models` and `/v1/chat/completions`
- Proxies requests to OpenAI or Anthropic based on the model name prefix
- Protects API endpoints with a shared Bearer token: `PROXY_API_KEY`
- Converts Anthropic message responses into OpenAI-compatible response shapes
- Supports streaming responses for both providers
- Provides a small portal page for setup instructions

## Environment variables

Netlify AI Gateway automatically injects provider keys and base URLs into Netlify Functions and Edge Functions. You do not need to add your own OpenAI or Anthropic keys on Netlify unless you explicitly want to bypass Netlify AI Gateway.

Set this variable in Netlify under **Site settings > Environment variables**:

| Variable | Description |
| --- | --- |
| `PROXY_API_KEY` | Any string, used as the shared Bearer token for API access |

Optional local or custom-upstream variables:

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | Optional. Only needed locally or if you want to use your own OpenAI key instead of Netlify AI Gateway |
| `ANTHROPIC_API_KEY` | Optional. Only needed locally or if you want to use your own Anthropic key instead of Netlify AI Gateway |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible upstream base URL. Netlify AI Gateway sets this automatically on Netlify |
| `ANTHROPIC_BASE_URL` | Optional Anthropic-compatible upstream base URL. Netlify AI Gateway sets this automatically on Netlify |

## API endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/healthz` | None | Health check |
| GET | `/v1/models` | Bearer | List available models |
| POST | `/v1/chat/completions` | Bearer | Chat completions, including streaming |

## Client setup

Use this Base URL in OpenAI-compatible clients such as CherryStudio:

```text
https://YOUR-SITE.netlify.app/v1
```

Do not point clients at `/v1/chat/completions`; clients append that path themselves.

Use your `PROXY_API_KEY` as the API key.

## GitHub to Netlify flow

1. Upload this folder to a GitHub repository.
2. In Netlify, choose **Add new project > Import an existing project**.
3. Select the GitHub repository.
4. Keep the detected build command as `vite build`.
5. Keep the publish directory as `dist`.
6. Add `PROXY_API_KEY` before the first production deploy.
7. Deploy.

No Netlify Agent rewrite step is required after this repository is ready.

## Running locally

```bash
npm install
netlify dev
```

The local app should be available at:

```text
http://localhost:8888
```
