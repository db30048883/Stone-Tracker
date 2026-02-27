# Stone Tracker

Offline-friendly tracker for logging stones with:

- Stone ID
- Weight
- Date
- Auto-generated unique tag code (`STONE-<uuid>`)

## Features

- Create and store stone records in browser storage.
- Assign unique code per stone for QR/NFC workflows.
- Lookup stones by scanned code.
- NFC read/write support (on compatible devices/browsers).
- Service worker caching for offline usage.

## Run

Serve with any static server:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.
