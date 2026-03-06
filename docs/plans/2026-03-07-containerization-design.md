# Containerization Design

**Date:** 2026-03-07
**Target:** Railway deployment, two separate containers

## Architecture

Two Railway services in one project:

1. **backend** — Node/Express + SQLite
2. **frontend** — nginx serving Vite static build, proxying to backend

## Backend Container (`server/Dockerfile`)

- Base: `node:20-alpine`
- Working dir: `/app`
- Install production deps only (`npm ci --omit=dev`)
- DB path: `/data/groceries.db` — Railway volume mounted at `/data`
- Env vars:
  - `PORT` — set automatically by Railway
  - `CLIENT_ORIGIN` — set to frontend Railway URL

## Frontend Container (`client/Dockerfile`)

Two-stage build:

**Stage 1 (build):** `node:20-alpine`
- Runs `npm ci` + `vite build`
- No VITE_ env vars needed (nginx handles all proxying)

**Stage 2 (serve):** `nginx:alpine`
- Serves static build from `/usr/share/nginx/html`
- nginx config template with `$BACKEND_URL` substituted at startup via `envsubst`
- Proxies:
  - `/api/` → `$BACKEND_URL`
  - `/tableData` → `$BACKEND_URL`
  - `/socket.io/` → `$BACKEND_URL` (with WebSocket upgrade headers)
- Env vars:
  - `BACKEND_URL` — set to backend Railway URL (e.g. `https://groceries-backend.up.railway.app`)

## docker-compose.yml (local testing)

Root-level compose file:
- `backend` service with named volume for `/data`
- `frontend` service with `BACKEND_URL=http://backend:3001`
- Shared network

## Code Change

`client/src/App.jsx`: Socket.IO connects to page origin (`'/'`) instead of hardcoded URL, so nginx can proxy it. Remove `VITE_SOCKET_URL` usage.

## Railway Setup

1. Create Railway project with two services
2. Backend: mount volume at `/data`, set `CLIENT_ORIGIN` to frontend URL
3. Frontend: set `BACKEND_URL` to backend URL
4. Deploy both services

## Files Created/Modified

| File | Action |
|---|---|
| `server/Dockerfile` | Create |
| `client/Dockerfile` | Create |
| `client/nginx.conf.template` | Create |
| `docker-compose.yml` | Create |
| `client/src/App.jsx` | Update socket URL |
| `server/index.js` | Update DB path to use env var |
