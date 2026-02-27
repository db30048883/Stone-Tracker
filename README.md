# Stone Tracker

Offline-friendly tracker for logging stones with:

- Stone ID
- Weight (tons, imperial)
- Date
- Auto-generated unique tag code (`STONE-<uuid>`)

## Features

- Create and store stone records in browser storage (`localStorage`).
- Assign unique code per stone for QR/NFC workflows.
- QR labels encode a tracker lookup URL (`?tag=...`) so scanning can open directly to the matching stone.
- Lookup stones by scanned code.
- Large field result card highlights stone details for easy reading in the field after scan.
- NFC read/write support (on compatible devices/browsers).
- Service worker caching for offline usage.

## Run locally

Serve with any static server:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy to Netlify (simple option)

This app is fully static, so Netlify is the easiest way to put it online.

### Option A: Drag-and-drop deploy (fastest)

1. Go to Netlify.
2. Create/login to your account.
3. Drag this project folder (or zipped files) into Netlify's deploy area.
4. Netlify gives you a live URL immediately.

### Option B: Connect Git repo (recommended)

1. Push this repo to GitHub/GitLab.
2. In Netlify, choose **Add new site** → **Import from Git**.
3. Select your repo.
4. Build command: **(leave empty)**
5. Publish directory: **/** (root)
6. Deploy.

## Field usage tips

- Open the Netlify URL on each field device.
- Create stones, then use each row's **QR** button to generate labels.
- Scan QR in the field to open the app and show matching stone details.
- For offline use, open the app once while online so browser cache is populated.

> Note: without a backend, records are stored per device/browser.
