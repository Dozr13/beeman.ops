# @ops/mobile

Expo (React Native) app that mirrors the web app: Sites, Huts, Alerts, Settings.

## Configure API URL
Create `packages/mobile/.env` (see `.env.example`):

```
EXPO_PUBLIC_API_URL=http://localhost:3002
```

Use the **API server origin only** (port **3002**). The app adds `/v1` to paths so it talks to the same API as the web app.

- **Simulator/emulator:** `http://localhost:3002` is fine.
- **Physical device:** Use your machine’s LAN IP, e.g. `http://192.168.1.146:3002`, so the phone can reach the API. Ensure the API is running and not bound to localhost only.

The **Settings** tab can override this URL (stored on device). Use the origin only (no `/v1`). In dev, Metro logs each request as `[API] GET https://...` so you can confirm the URL.

## Run
From repo root:

```bash
yarn
yarn workspace @ops/api dev   # terminal 1
yarn workspace @ops/mobile dev # terminal 2
```

## Admin actions
Create/update endpoints require setting `OPS_READ_KEY` inside the app (Settings tab).
This uses the same `x-ops-read-key` header the API expects.

## Alerts
- `Alerts` tab calls `GET /alerts/recent` and can `POST /alerts/:id/resolve` (requires OPS_READ_KEY).
