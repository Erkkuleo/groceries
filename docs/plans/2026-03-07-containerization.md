# Containerization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Containerize the grocery app into two separate Docker images (backend + frontend) deployable to Railway, with a docker-compose for local testing.

**Architecture:** Backend runs Node/Express+SQLite in one container with a Railway volume at `/data` for DB persistence. Frontend is a multi-stage build: Vite builds static files, then nginx serves them and proxies all backend traffic (`/api/`, `/tableData`, `/socket.io/`) using `$BACKEND_URL` injected at container startup via `envsubst`. Socket.IO client connects to `'/'` so nginx can proxy it transparently.

**Tech Stack:** Docker, nginx:alpine, node:20-alpine, envsubst, docker-compose v3.8

---

### Task 1: Update DB path in server to use env var

**Files:**
- Modify: `server/index.js`

**Step 1: Update the DB path**

Change the `new sqlite3.Database(...)` call from `'groceries.db'` to use an env var with a fallback:

```js
const DB_PATH = process.env.DB_PATH || 'groceries.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
```

This keeps local dev working (no env var needed) while allowing Railway to point at `/data/groceries.db`.

**Step 2: Verify it still starts**

```bash
cd server && node index.js
```
Expected: `Server listening on 3001`
Ctrl+C to stop.

**Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: make SQLite DB path configurable via DB_PATH env var"
```

---

### Task 2: Create backend Dockerfile

**Files:**
- Create: `server/Dockerfile`

**Step 1: Write the Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY index.js ./

ENV PORT=3001
ENV DB_PATH=/data/groceries.db

EXPOSE 3001

CMD ["node", "index.js"]
```

**Step 2: Build and smoke-test**

```bash
cd server
docker build -t groceries-backend .
docker run --rm -p 3001:3001 -v groceries-data:/data groceries-backend
```
Expected: `Connected to database` and `Server listening on 3001`
Ctrl+C to stop.

**Step 3: Commit**

```bash
git add server/Dockerfile
git commit -m "feat: add backend Dockerfile"
```

---

### Task 3: Create nginx config template for frontend

**Files:**
- Create: `client/nginx.conf.template`

This template uses `$BACKEND_URL` which `envsubst` replaces at container startup.

**Step 1: Write the template**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy Socket.IO (must come before /api to avoid prefix conflicts)
    location /socket.io/ {
        proxy_pass $BACKEND_URL;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy REST API
    location /api/ {
        proxy_pass $BACKEND_URL;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy tableData endpoint
    location /tableData {
        proxy_pass $BACKEND_URL;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback — serve index.html for all unmatched routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Step 2: Commit**

```bash
git add client/nginx.conf.template
git commit -m "feat: add nginx config template with backend proxy"
```

---

### Task 4: Update Socket.IO client URL to connect via nginx proxy

**Files:**
- Modify: `client/src/App.jsx`

**Step 1: Change socket connect call**

Find this line at the top of `App.jsx`:
```js
const socket = socketIO.connect(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');
```

Replace with:
```js
const socket = socketIO.connect('/');
```

Connecting to `'/'` makes Socket.IO use the page's own origin, so nginx can proxy `/socket.io/` to the backend. This works in both local dev (Vite dev server proxies it) and production (nginx proxies it).

**Step 2: Verify Vite proxy config covers Socket.IO**

Open `client/vite.config.js` and confirm (or add) `/socket.io` to the proxy:

```js
server: {
  proxy: {
    '/api': 'http://localhost:3001',
    '/tableData': 'http://localhost:3001',
    '/socket.io': {
      target: 'http://localhost:3001',
      ws: true,
    },
  },
},
```

**Step 3: Commit**

```bash
git add client/src/App.jsx client/vite.config.js
git commit -m "feat: connect Socket.IO via page origin so nginx can proxy it"
```

---

### Task 5: Create frontend Dockerfile (multi-stage)

**Files:**
- Create: `client/Dockerfile`

**Step 1: Write the Dockerfile**

```dockerfile
# Stage 1: build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: serve
FROM nginx:alpine

# Install envsubst (comes with gettext)
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# nginx:alpine with the templates/ directory auto-runs envsubst on startup
# via the official nginx docker entrypoint — no custom script needed.
# BACKEND_URL must be set at runtime.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Note: The official `nginx:alpine` image automatically processes all `*.template` files in `/etc/nginx/templates/` using `envsubst` before starting. No custom entrypoint script is needed.

**Step 2: Build and test**

```bash
cd client
docker build -t groceries-frontend .
docker run --rm -p 8080:80 -e BACKEND_URL=http://localhost:3001 groceries-frontend
```
Expected: nginx starts, `curl http://localhost:8080` returns the HTML page.
Ctrl+C to stop.

**Step 3: Commit**

```bash
git add client/Dockerfile
git commit -m "feat: add multi-stage frontend Dockerfile with nginx proxy"
```

---

### Task 6: Create docker-compose.yml for local testing

**Files:**
- Create: `docker-compose.yml`

**Step 1: Write the compose file**

```yaml
services:
  backend:
    build: ./server
    environment:
      PORT: "3001"
      CLIENT_ORIGIN: "http://localhost:8080"
      DB_PATH: "/data/groceries.db"
    volumes:
      - groceries-data:/data
    ports:
      - "3001:3001"

  frontend:
    build: ./client
    environment:
      BACKEND_URL: "http://backend:3001"
    ports:
      - "8080:80"
    depends_on:
      - backend

volumes:
  groceries-data:
```

**Step 2: Build and run end-to-end**

```bash
docker compose up --build
```

Expected output (interleaved):
```
backend-1   | Connected to database
backend-1   | Server listening on 3001
frontend-1  | ... nginx started
```

Open http://localhost:8080 — grocery list should load and items can be added/removed.

Open a second tab to http://localhost:8080 — adding an item in one tab should appear in the other (Socket.IO real-time sync).

**Step 3: Stop and clean up**

```bash
docker compose down
```

**Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose for local container testing"
```

---

### Task 7: Update README with Docker instructions

**Files:**
- Modify: `README.md`

**Step 1: Add Docker section**

Add the following section to `README.md` after the existing "Running" section:

```markdown
## Docker (local)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3001

To stop: `docker compose down`

The SQLite database persists in a Docker named volume (`groceries-data`). To reset it: `docker compose down -v`

## Deploying to Railway

1. Create a new Railway project
2. Add two services, each pointed at this repo with the respective root directory:
   - **backend** → root dir: `server/`
   - **frontend** → root dir: `client/`
3. Set environment variables:
   - **backend**: `DB_PATH=/data/groceries.db`, `CLIENT_ORIGIN=<frontend Railway URL>`
   - **frontend**: `BACKEND_URL=<backend Railway URL>`
4. Add a Railway volume to the backend service, mounted at `/data`
5. Deploy both services
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Docker and Railway deployment instructions"
```

---

## Verification Checklist

- [ ] `docker compose up --build` starts both containers without errors
- [ ] http://localhost:8080 loads the grocery list
- [ ] Adding an item persists (survives `docker compose restart`)
- [ ] Real-time sync works between two browser tabs
- [ ] `docker compose down -v && docker compose up --build` starts fresh with empty DB
- [ ] `git status` shows no untracked DB files
