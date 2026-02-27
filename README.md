# Stone Tracker

Offline-friendly tracker for logging stones with:

- Stone ID
- Weight (tons, imperial)
- Date
- Auto-generated unique tag code (`STONE-<uuid>`)

## Features

- Create and store stone records in browser storage.
- Assign unique code per stone for QR/NFC workflows.
- QR labels now encode a tracker lookup URL (`?tag=...`) so scanning can open directly to the matching stone.
- Lookup stones by scanned code.
- Large field result card highlights stone details for easy read in the field after scan.
- NFC read/write support (on compatible devices/browsers).
- Service worker caching for offline usage.

## Run

Serve with any static server:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.
