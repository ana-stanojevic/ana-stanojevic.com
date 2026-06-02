# ana-stanojevic.com

Personal site for **Ana Stanojević** — React frontend in `site/` (Vercel) and FastAPI contact intake in `intake-api/` (Render).

## Site

- Hero `#top`, About `#about`, Current build `#current-build`
- Contact `#contact`: topic pills + AI email draft preview + “Send” via Resend

## Stack

Frontend: React 19, TypeScript, Vite, Bootstrap.  
Backend: FastAPI + OpenAI Responses (optional) + Resend.

## Local dev (2 terminals)

### Terminal 1 — API

```bash
cd intake-api
poetry install
```

Create `intake-api/.env.local`:

```bash
OPENAI_API_KEY=sk-...          # optional
OPENAI_MODEL=gpt-4.1-mini      # optional
RESEND_API_KEY=re_...          # required for /send-email
EMAIL_FROM=contact@ana-stanojevic.com
EMAIL_TO=you@example.com
```

Run:

```bash
poetry run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Check: http://127.0.0.1:8000/health → `{"ok": true}`

### Terminal 2 — site

```bash
cd site
npm install
```

Create `site/.env.local`:

```bash
VITE_INTAKE_API_BASE=http://127.0.0.1:8000
```

Run:

```bash
npm run dev
```

In Contact, click **Next** → `POST /preview-email`.

## Checks (CI equivalent)

```bash
./scripts/check.sh
```

Mirrors GitHub CI: `site/` (npm ci/build/test) + `intake-api/` (poetry install + pytest).

## Testing (what’s covered)

- Frontend: Contact UI flow (loading/success), API 500 error state, whitespace-only gating, email validation before Send.
- Backend: `/health`, preview success + template fallback when LLM is missing/fails, request validation (`422`), send success shape (Resend mocked), CORS preflight allow vs deny.

## Deploy

- Frontend: Vercel (`site/`, build `npm run build`, output `dist`)
- API: Render (`render.yml`, service `personal-intake-api`)
- Production CORS origins: `https://ana-stanojevic.com`, `https://www.ana-stanojevic.com`

## Environment variables (Render / `intake-api`)

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | If missing, preview uses fixed templates |
| `OPENAI_MODEL` | No | Default `gpt-4.1-mini` |
| `RESEND_API_KEY` | Yes (send) | Needed for `/send-email` |
| `EMAIL_FROM` | Yes (send) | Verified Resend sender |
| `EMAIL_TO` | Yes (send) | Inbox for submissions |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated; local Vite origins included when unset |

Local dev uses gitignored `intake-api/.env.local` and `site/.env.local`.

## API

- `GET /health`: `{"ok": true}`
- `POST /preview-email`: returns `{ subject, body }`
- `POST /send-email`: returns `{ sent, message }`

Rate limits: 10 preview + 3 send per IP per 10 minutes.

## Security

Do not commit secrets. Gitignored: `intake-api/.env.local`, `site/.env.local` (and root `.env.local` if present).
