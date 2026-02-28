# Stone Tracker (Neon + Vercel)

This app lets your team:

- auto-generate a Stone ID for each new stone
- enter weight in tons
- enter date
- generate/print a QR code label
- scan a QR on any internet-connected device and fetch that stone from cloud storage

## Architecture

- **Frontend:** static HTML/CSS/JS
- **API:** Vercel Serverless Function at `api/stones.js`
- **Database:** Neon Postgres (via `DATABASE_URL`)

The browser still caches records locally for speed/offline, but source-of-truth is Neon when online.

## 1) Neon setup

1. In Neon, create a project/database.
2. Copy the connection string from Neon dashboard.
3. Keep it for Vercel as `DATABASE_URL`.

> The API auto-creates the `stones` table on first request, so no manual SQL is required.

## 2) Vercel setup

1. Push this repo to GitHub.
2. In Vercel: **Add New Project** and import your repo.
3. In Project Settings → **Environment Variables** add:
   - `DATABASE_URL` = your Neon connection string
4. Deploy.

After deploy, your app URL will look like:
`https://your-project.vercel.app`

## 3) In-app setup

1. Open your Vercel app URL.
2. In **Public App URL**, paste your Vercel URL and save (click outside field).
3. Confirm cloud status says connected.
4. Click **Sync from Cloud** on each device once.

## Field QR workflow (simple)

1. Enter weight + date.
2. Click **Create Stone + QR**.
3. App creates unique ID (ex: `STONE-AB12CD34`) and saves to Neon.
4. Print QR and stick it on the stone.
5. Any phone scans QR:
   - opens your Vercel URL with `?stone=...`
   - app looks up local cache first, then Neon
   - shows the stone details card

## Local development

```bash
npm install
python3 -m http.server 8080
```

Open `http://localhost:8080`.

Note: local static server does not run the Vercel API route; deploy to Vercel to test cloud storage end-to-end.

## Vercel build fix (if you saw runtime version errors)

If Vercel shows: `Function Runtimes must have a valid version`, remove any custom runtime pinning and redeploy.
This repo now relies on Vercel's default Node runtime for `api/stones.js`, which avoids that build-time parser error.

