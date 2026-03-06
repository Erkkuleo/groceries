# Lahnan kauppalista

A personal household grocery list web app with real-time sync across devices.

## Tech stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite (via sqlite3)
- **Real-time:** Socket.IO

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
# Clone the repo
git clone <repo-url>
cd groceries

# Configure server environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# Install server dependencies
cd server && npm install && cd ..

# Configure client environment (optional)
cp client/.env.example client/.env

# Install client dependencies
cd client && npm install && cd ..
```

## Running

```bash
# Start backend (from project root)
npm run dev

# Start frontend (separate terminal)
npm run dev:client
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

## Build (production)

```bash
npm run build
```

## Docker (local)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001

To stop: `docker compose down`

The SQLite database persists in a Docker named volume (`groceries-data`). To reset it: `docker compose down -v`

## Deploying to Railway

1. Create a new Railway project
2. Add two services, each pointed at this repo with the respective root directory:
   - **backend** — root dir: `server/`
   - **frontend** — root dir: `client/`
3. Set environment variables:
   - **backend**: `DB_PATH=/data/groceries.db`, `CLIENT_ORIGIN=<frontend Railway URL>`
   - **frontend**: `BACKEND_URL=<backend Railway URL>`
4. Add a Railway volume to the backend service, mounted at `/data`
5. Deploy both services

## File structure

```
groceries/
├── client/               Frontend (Vite + React)
│   ├── src/
│   │   ├── App.js        Main component
│   │   └── main.jsx      Entry point
│   ├── index.html        HTML template
│   ├── vite.config.js    Vite config with proxy
│   └── package.json
├── server/
│   ├── index.js          Express + Socket.IO server
│   └── package.json
├── .env.example          Server env vars template
├── package.json          Root scripts
└── README.md
```

## Notes

- The database file (`server/groceries.db`) is created automatically on first run and is gitignored.
- No authentication — intended for personal/household use on a trusted network.
