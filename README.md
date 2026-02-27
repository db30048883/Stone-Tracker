# Stone Tracker

Offline-friendly tracker for logging stones with:

- Stone ID
- Weight (tons, imperial)
- Date
- Auto-generated unique tag code (`STONE-<uuid>`)

## Features

- Create and store stone records in browser storage.
- Optional Supabase sync so records work across multiple devices.
- Assign unique code per stone for QR/NFC workflows.
- QR labels encode a tracker lookup URL (`?tag=...`) so scanning can open directly to the matching stone.
- Lookup stones by scanned code.
- Large field result card highlights stone details for easy reading in the field after scan.
- NFC read/write support (on compatible devices/browsers).
- Service worker caching for offline usage.

## Run

Serve with any static server:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Multi-device setup with Supabase

1. Create a Supabase project.
2. In Supabase SQL editor, run:

```sql
create table if not exists public.stones (
  tag_code text primary key,
  stone_id text not null,
  weight_tons_imperial numeric not null,
  date date not null,
  created_at timestamptz not null default now()
);
```

3. Enable read/write for your app users (quick start policy for testing only):

```sql
alter table public.stones enable row level security;

create policy "allow anon read" on public.stones
for select to anon
using (true);

create policy "allow anon write" on public.stones
for insert to anon
with check (true);
```

4. Edit `config.js` and set:

- `SUPABASE_URL` = your project URL
- `SUPABASE_ANON_KEY` = your anon public key
- `PUBLIC_APP_URL` = public URL where this app is hosted (so QR works on other devices)

5. Host the app at that `PUBLIC_APP_URL` (Netlify/Vercel/GitHub Pages/etc).
6. On each device, open the app and click **Sync from Cloud** once.

After this, a stone created on device A can be looked up from a QR scan on device B.

> Note: the current policy example allows anonymous write for quick testing. Lock this down before production.
