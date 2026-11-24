# Smart Prep Services — Mobile (React Native / Expo)

Sanctum token client for the `smartprepservices-dashboard` API. One app for
warehouse staff and admins; what each user can see and do is decided by their
**permissions** (a role is just a bundle of permissions — nothing in the app
checks role names).

## Environments

Three env files under `env/`. Pick one with `APP_ENV`; the npm scripts do that for you.

| APP_ENV | File            | Points at                                 |
|---------|-----------------|-------------------------------------------|
| `local` | `env/local.env` | Laravel on this machine (`php artisan serve`) |
| `dev`   | `env/dev.env`   | https://portal-dev.smartprepservices.com  |
| `prod`  | `env/prod.env`  | https://portal.smartprepservices.com      |

Each file has the same keys — `API_URL`, `ENV_LABEL`, `APP_DISPLAY_NAME`,
`REQUEST_TIMEOUT_MS`, `SHOW_ENV_BADGE`, `ANDROID_ALLOW_CLEARTEXT`. To point a
build somewhere else, edit `API_URL` in the matching file; nothing in the code
changes.

`local.env` — which address to use depends on where the app runs:

```
browser on this machine  ->  http://127.0.0.1:8000/api
phone (Expo Go / APK)    ->  http://<your LAN IP>:8000/api   (ipconfig; run Laravel with --host=0.0.0.0)
Android emulator         ->  http://10.0.2.2:8000/api
```

## Run

```bash
npm install

# backend (in smartprepservices-dashboard)
php artisan serve --host=0.0.0.0 --port=8000

# app
npm run start:local     # or start:dev / start:prod
```

Then either:

- **Browser** — open http://localhost:8081 (quick testing; camera/photo picking uses the browser file dialog).
- **Phone** — install Expo Go, same Wi-Fi, scan the QR code (or open `exp://<LAN IP>:8081`).

## Build an APK

```bash
npm run apk:local       # builds on this machine with EAS local build
npm run apk:dev
npm run apk:prod
```

`build:<env>` does the same on EAS's cloud builders. Profiles live in `eas.json`
(`local` / `dev` / `prod`) and each one sets `APP_ENV`, so the APK bakes in the
matching `env/<env>.env`.

## What's in the app

- **Login** — any active user. The backend gates every endpoint with the same
  permission its web page uses; company users are scoped to their own company.
- **Home** — KPI tiles (open shipments, awaiting FNSKU/payment, ready to ship,
  unpaid invoices, payments to verify) that open the matching list, plus quick
  actions the user has permission for.
- **Shipments** — both service types (Amazon Prep, Receiving & Forwarding), with
  search and type/status filters. Create shipment (company, product(s), tracking,
  shipper, services with pricing options, optional FNSKU label photo). Detail:
  status transitions (as allowed for this user by the backend), receiving
  (+ photos), inspection, damage reports (+ photos), boxes and box labels,
  services checklist, sender/receiver, invoices & payments, timeline.
- **Products** — search/filter, detail, create and edit (with photos).
- **Invoices** — list with status/overdue filters, detail (line items, payments),
  record a payment, settle from company balance, create a manual invoice.
- **Payments** — list, detail with proof, record a payment (against an invoice or
  as a balance top-up), verify / reject.

## API

All endpoints are under `routes/api.php` in the dashboard project. JSON keys are
`snake_case`, exactly as Laravel serialises them (`requested_services`,
`pricing_rule`, `file_asset`).
