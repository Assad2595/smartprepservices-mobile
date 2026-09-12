# Smart Prep Services — Mobile (React Native / Expo)

Sanctum token client for `smartprepservices-app` API.

> Flutter scaffold under `lib/` is obsolete and can be deleted after you confirm Expo runs.

## Setup

```bash
cd D:\Projects\smartprepservices-mobile
npm install
npx expo start
```

API base (Android emulator → host): `http://10.0.2.2:8000/api`  
Change in `app.json` → `expo.extra.apiUrl` for device LAN IP.

## Screens

- **Login** — Operator + Super Admin only (Amazon Prep, internal warehouse staff).
- **Dashboard** — KPI tiles from `/dashboard`.
- **Shipments** — list with status filter chips, detail screen with:
  - Status transition buttons, gated client-side by role/permission (mirrors backend
    `ShipmentServiceTypeConfig`; Super Admin bypasses all checks, same as backend).
  - Record Receiving (+ photos), Record Inspection, Report Damage (+ photos), Add Carton
    — each a dedicated modal screen, gated by permission (`shipments.receive` /
    `shipments.inspect` / `shipments.packing`).
  - Services checklist (tap to cycle pending → in_progress → done), add-on badge.
  - Cartons list with per-carton "Apply box label" action.
  - Receiving/inspection/damage records, invoice summary (filtered client-side from
    `/invoices`), and the activity timeline.
- **Products** · **Invoices** — read-only lists.

Sender/receiver details are not shown — `shipment_parties` isn't implemented on the
backend yet (see dashboard `CLAUDE.md` §3.3).

## Auth

`POST /api/login` → Bearer token in SecureStore · `Authorization` on requests.
Both `Super Admin` and `Operator` roles can sign in; Super Admin sees all companies'
shipments (not company-scoped), same as the backend's `isCompanyScoped()` check.
