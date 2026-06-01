# ana-stanojevic.com

Personal site for **Ana Stanojević** — AI Engineer, PhD EPFL.

Live at [ana-stanojevic.com](https://ana-stanojevic.com). Static **React** frontend in `site/` (Vercel) and a **FastAPI** contact intake API in `intake-api/` (Render).

## What’s on the site

Single-page layout with four sections:


| Section       | ID               | Content                                                                                                                                                                                             |
| ------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero          | `#top`           | Name, tagline, primary CTA to contact                                                                                                                                                               |
| About         | `#about`         | Research background (Huawei, IBM, Google) and current focus                                                                                                                                         |
| Current build | `#current-build` | **Bounded Job Application Agent** — expected-value decision runtime, architecture diagram, link to [bounded-job-application-agent](https://github.com/ana-stanojevic/bounded-job-application-agent) |
| Contact       | `#contact`       | Topic pills (Work together / Hiring / Other), AI-assisted email draft preview, send via Resend                                                                                                      |


Footer links: GitHub, Google Scholar, CV, YouTube, and `contact@ana-stanojevic.com`.

## Tech stack


| Layer       | Stack                                                      |
| ----------- | ---------------------------------------------------------- |
| Frontend    | React 19, TypeScript, Vite 6, Bootstrap 5, React Bootstrap |
| UI / Design | DM Sans, JetBrains Mono, Space Grotesk (Google Fonts)      |
| Backend     | FastAPI (`intake-api/main.py`) on Render                   |
| AI          | OpenAI Responses API (`gpt-4.1-mini` by default)           |
| Email       | Resend API                                                 |


## Repository layout

```text
.
├── site/                         # Vite + React app (Vercel project root)
│   ├── public/
│   │   ├── assets/               # favicon.svg, hero-illustration.svg, profile.png
│   │   └── AnaStanojevicCV.pdf
│   ├── src/
│   │   ├── components/
│   │   │   ├── StaticSections.tsx   # Hero, About, Footer
│   │   │   ├── BuildSection.tsx     # Current build section + architecture diagram
│   │   │   └── Contact.tsx          # Contact form UI
│   │   ├── lib/
│   │   │   └── contactIntake.ts     # Contact flow hook + API client
│   │   ├── styles/site.css
│   │   ├── config.ts                # API base URL, contact tabs, shared types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html                   # meta intake-api-base for production
│   ├── vercel.json
│   ├── package.json
│   └── vite.config.ts
├── intake-api/
│   ├── main.py
│   ├── pyproject.toml
│   └── poetry.lock
├── scripts/
│   └── check.sh                  # local CI: frontend build + API smoke test
├── render.yml
└── README.md
```

### CV

- File: `site/public/AnaStanojevicCV.pdf`
- Link in footer: `/AnaStanojevicCV.pdf`

### API base URL (frontend)

Production default: `https://personal-intake-api.onrender.com`

Set via, in order:

1. `VITE_INTAKE_API_BASE` in `site/.env.local` (local dev)
2. `<meta name="intake-api-base">` in `site/index.html` (production fallback)
3. Hardcoded default in `site/src/config.ts`

## Local development

Use **two terminals**.

**Terminal 1 — API** (from repo root):

```bash
cd intake-api
poetry install
```

Create `intake-api/.env.local` (gitignored). The API loads it on startup when you run uvicorn locally:

```bash
OPENAI_API_KEY=sk-...                    # optional; template fallback without it
OPENAI_MODEL=gpt-4.1-mini                # optional
RESEND_API_KEY=re_...                    # required to test POST /send-email
EMAIL_FROM=contact@ana-stanojevic.com    # verified sender in Resend
EMAIL_TO=you@example.com                 # inbox that receives contact form emails
```

Then:

```bash
poetry run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) → `{"ok":true}`

**Terminal 2 — site**:

```bash
cd site
npm install
```

Create `site/.env.local` (gitignored) to point at the local API:

```bash
VITE_INTAKE_API_BASE=http://127.0.0.1:8000
```

Then:

```bash
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173`). In Contact, pick a topic, write a short note, and click **Next** — that calls `POST /preview-email`.

Without `OPENAI_API_KEY` in `.env.local`, preview still works using a fixed per-tab template fallback.

```bash
npm run build       # production build → site/dist
```

## Checks

From the repo root, run the same checks CI runs locally:

```bash
./scripts/check.sh
```

This builds the frontend (`npm run build` in `site/`), installs API dependencies with Poetry, verifies the FastAPI app imports, and smoke-tests `GET /health`.

Requires **Node.js** (with `npm install` already run in `site/`) and **Poetry** on your PATH.

## Deploy


| Service  | Platform | Config                                                        |
| -------- | -------- | ------------------------------------------------------------- |
| Frontend | Vercel   | Project root = `site`; build: `npm run build`; output: `dist` |
| API      | Render   | `render.yml`; service name: `personal-intake-api`             |


Production CORS origins: `https://ana-stanojevic.com`, `https://www.ana-stanojevic.com`

## Environment variables

### Render (`intake-api`)


| Variable               | Required       | Notes                                                   |
| ---------------------- | -------------- | ------------------------------------------------------- |
| `OPENAI_API_KEY`       | For LLM drafts | Falls back to template if missing                       |
| `OPENAI_MODEL`         | No             | Default `gpt-4.1-mini`                                  |
| `RESEND_API_KEY`       | For send       | Required for `/send-email`                              |
| `EMAIL_FROM`           | For send       | Verified sender in Resend                               |
| `EMAIL_TO`             | For send       | Inbox that receives contact form submissions            |
| `CORS_ALLOWED_ORIGINS` | No             | Comma-separated; local Vite origins included when unset |


Local dev: create gitignored `intake-api/.env.local` and `site/.env.local` (see **Local development** above).

## API


| Method | Path             | Purpose                                                   |
| ------ | ---------------- | --------------------------------------------------------- |
| `GET`  | `/health`        | Health check                                              |
| `GET`  | `/`              | `{ "message": "intake backend is running" }`              |
| `POST` | `/preview-email` | Generate email draft from contact form input              |
| `POST` | `/send-email`    | Send draft to Ana via Resend (`reply_to` = visitor email) |


Rate limits (per IP, 10-minute window): 10 preview requests, 3 send requests.

## Security

Do not commit secrets. Gitignored paths: `intake-api/.env.local`, `site/.env.local` (and root `.env.local` if present).