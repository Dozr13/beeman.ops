# Beeman Ops (Unified Wells + Hashhuts Monitoring)

## scripts:

### start db

./scripts/dev-db-up.sh

### apply csv to db

./scripts/apply-hut-mapping.sh GH180

A production-minded, offline-tolerant monitoring system designed for Starlink-connected remote sites:

- **Edge Agent** at each site buffers data locally and pushes to central (no inbound ports required).
- **API** receives heartbeats + metrics, stores them, and serves dashboards.
- **Web** dashboard shows site health, devices, metrics, and alerts.
- **Collectors** are cleanly separated (hashhut vs wellsite) and plug into the agent.

## Stack

- Monorepo: Yarn 4 + Turborepo
- API: Fastify (TypeScript)
- DB: Postgres + Prisma
- Web: Next.js App Router + Tailwind
- Agent: Node + plugin collectors + local SQLite queue

---

## Quick start (local dev)

### 1) Prereqs

- Node 20+
- Docker
- Yarn 4 (repo pins yarn)

### 2) Setup

```bash
cp .env.example .env
yarn install
yarn docker:up
yarn db:push
```

### 3) Run dev

In separate terminals:

```bash
yarn dev:api
yarn dev:web
yarn dev:agent
```

Open:

- Web: http://localhost:3001
- API: http://localhost:3002/health

---

## How data flows

Agent → API (outbound HTTPS):

- `POST /v1/ingest` (batch metrics)
- `POST /v1/heartbeat`

Web → API:

- sites/devices/alerts list
- metric queries for charts

---

## Security (minimum viable)

- API-key header: `x-ops-key: <OPS_INGEST_KEY>`
- Separate keys recommended per site (supported in schema; add later)

---

## Deploy notes (real world)

- Run API + Web behind a TLS reverse proxy (Caddy/Nginx/Cloudflare)
- Use outbound-only agent pushes to avoid CGNAT issues on Starlink
- Put router + agent on a small UPS

---

## Collectors

Collectors are under `packages/agent/src/collectors`:

- `hut/*` for hashhut monitoring (miners, switch, router/starlink health)
- `well/*` for wellsite monitoring (Modbus TCP/RTU, vendor APIs, IO modules)

They share a single interface and can be enabled per-site via config.

---

## Next steps (production hardening)

- Per-site keys + RBAC
- Alert rule engine + SMS (Twilio)
- TimescaleDB for long-term metrics
- Agent auto-discovery + inventory snapshots
