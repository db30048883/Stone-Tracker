# Stone Tracker

A clean field-focused tracker with:

- Auto-generated Stone IDs
- Weight entry in tons
- Date entry
- QR label generation for each stone
- Scan/lookup flow from QR URLs

## How this works (important)

This version is static and stores records in browser `localStorage`.

To make QR scans work on any internet-connected device:

1. Host the app on Netlify.
2. Set the **Public App URL** field in the app to your Netlify URL.
3. Create stones and print QR labels from that hosted app.
4. When scanned, QR opens `?stone=STONE-...` on your Netlify URL.

## Netlify integration steps

### Fastest: Drag-and-drop

1. Go to Netlify and sign in.
2. Drag this project folder (or zip) into the deploy box.
3. Copy the generated Netlify URL.
4. Open that URL, paste it into **Public App URL** in the app, and save by clicking outside the input.

### Recommended: Git-connected deploy

1. Push this repo to GitHub.
2. In Netlify: **Add new site** → **Import from Git**.
3. Select your repo.
4. Build command: *(leave empty)*
5. Publish directory: `/`
6. Deploy.

## QR process (field workflow)

1. Enter **Weight (tons)** and **Date**.
2. Click **Create Stone + QR**.
3. Stone ID is auto-generated like `STONE-AB12CD34`.
4. QR dialog appears with QR image + URL.
5. Click **Print Label**, print it, and stick it on stone.
6. In field, scan QR on any phone with internet:
   - It opens your hosted Netlify app URL with `?stone=...`
   - App auto-shows that stone's details if that device has that record.

## Key limitation

Without a backend, records live per device/browser. If you need guaranteed cross-device record lookup for all stones, you will need a backend store (Supabase/Firebase/API) in a follow-up.


## Troubleshooting

- If **Create Stone + QR** seems to do nothing on older devices, update browser and ensure JavaScript is enabled.
- The app now has an automatic Stone ID fallback when `crypto.randomUUID()` is unavailable.
- If the QR dialog cannot open in an older browser, it falls back to opening the stone URL directly in a new tab.

## Local run

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.
