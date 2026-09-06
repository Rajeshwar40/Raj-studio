# Raj Studio — Frontend

Modern, dark-studio web UI for the **ACE-Step V1.5** music generation backend.
Developed by **Rajeshwar Singh**.

Built with React 18 + TypeScript + Vite + Tailwind CSS, this frontend talks to
the FastAPI service defined in [`acestep/api_server.py`](../acestep/api_server.py)
over the network. It does not duplicate or replace any backend logic — it only
consumes the real HTTP endpoints.

---

## Quick start

```bash
# from the repo root
cd frontend
cp .env.example .env.local           # adjust VITE_API_URL if your backend is not on http://127.0.0.1:8001
npm install
npm run dev
```

Then open http://localhost:5173.

Make sure the ACE-Step API server is running in another terminal:

```bash
# repo root
./start_api_server_macos.sh          # macOS
# or
./start_api_server.sh                # Linux
# or
start_api_server.bat                 # Windows
```

Default backend URL: `http://127.0.0.1:8001` (matches `ACESTEP_API_PORT=8001`).
You can change it any time in **Settings → Backend connection**.

## Environment variables

| Variable        | Purpose                                                        | Default                    |
| --------------- | -------------------------------------------------------------- | -------------------------- |
| `VITE_API_URL`  | Base URL of the ACE-Step FastAPI server                        | `http://127.0.0.1:8001`    |
| `VITE_API_KEY`  | Optional Bearer key, only if backend has `ACESTEP_API_KEY` set | *(empty)*                  |
| `VITE_REPO_URL` | Shown in header/footer as "GitHub" link, if set                | *(empty)*                  |

Copy `.env.example` to `.env.local` (never commit `.env.local`).

## Scripts

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR on http://localhost:5173 |
| `npm run typecheck` | Strict TypeScript project references check     |
| `npm run lint`      | ESLint (max-warnings 0)                        |
| `npm run build`     | Type-check + production bundle into `dist/`   |
| `npm run preview`   | Serve the built bundle for smoke testing      |

## Endpoints consumed

All requests target the FastAPI service. The client is in
[`src/api/client.ts`](src/api/client.ts).

| Endpoint                 | Where it's used                    |
| ------------------------ | ---------------------------------- |
| `GET /health`            | Header status pill, Settings page  |
| `GET /v1/models`         | (available for future model picker) |
| `POST /release_task`     | Studio → Generate                  |
| `POST /query_result`     | Studio → poll for completion       |
| `GET /v1/audio?path=…`   | Audio player + downloads           |
| `POST /create_random_sample` | Studio → "Random sample" button |
| `POST /format_input`     | Studio → "Enhance" button          |

The request body for `/release_task` mirrors
[`GenerateMusicRequest`](../acestep/api/http/release_task_models.py). Types
are in [`src/types/api.ts`](src/types/api.ts).

## Project structure

```
frontend/
├── src/
│   ├── api/            HTTP client + polling helper
│   ├── components/     Layout, header, sidebar, audio player, UI primitives
│   ├── hooks/          Settings, history, backend status
│   ├── lib/            Constants, formatting, className helpers
│   ├── pages/          Studio, History, Projects, Library, Settings, About
│   ├── styles/         Tailwind base + component layers
│   └── types/          API type definitions
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig*.json
```

## Deployment

The bundle produced by `npm run build` is a **static** SPA. Any static host
(GitHub Pages, Netlify, Vercel, S3, Nginx, Caddy) can serve `dist/`. Ensure
your host rewrites unknown paths back to `index.html` (SPA fallback).

The **ACE-Step backend cannot run on GitHub Pages** — it is a Python service
that needs a GPU (or MPS/CPU) to run inference. Options:

- Run the backend locally and set `VITE_API_URL` to your LAN address, or
- Host the backend on a GPU VM (Runpod, Lambda, Vast.ai, your own box) and
  point `VITE_API_URL` at its public URL. Configure CORS in the backend
  (see [`acestep/api/route_setup.py`](../acestep/api/route_setup.py)) to
  allow the frontend origin.

The frontend also ships with a Docker image ([`Dockerfile`](Dockerfile)) that
builds and serves the bundle over Nginx on port 80.

## Security & privacy notes

- No secrets are baked into the bundle. The optional API key is only read from
  the runtime `.env.local` / Settings page and lives in your browser.
- Uploaded audio is size- and type-checked before being sent to the backend
  (`≤ 50 MB`, only common audio MIME types).
- The backend already restricts `GET /v1/audio` to a whitelisted output
  directory — the frontend just consumes those URLs.
- History, projects, and library are stored in `localStorage` in your browser.
  Nothing is sent to a third party.
