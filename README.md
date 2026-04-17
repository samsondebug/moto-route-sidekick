# Bad Decision Sidekick

The moto cockpit for bad decisions. Plan. Ride. Survive. Share.

Single-file PWA. No build step. Hosts on Vercel static. Works offline. Stores nothing on a server.

## What's in V2

- **Ride HUD home** — map-first, big red START RIDE button in the thumb zone
- **Live Ride Mode** — GPS breadcrumb, speed tile, lean sensor (iOS permission handled), distance, ride time
- **Curviness Index** — 0–5 twisty score from the actual OSRM route geometry
- **Segment Weather Ribbon** — weather at 5 points along the route, not just the start
- **Offline Tiles** — pre-caches Hill Country tiles when you save a route
- **The Garage** — maintenance reminders per bike, photo pins (IndexedDB), post-ride telemetry card
- **Badges** — ride-count and behavior-based unlocks with BDS voice
- **Ride DNA Card** — one-tap shareable IG/Twitter card, drawn on canvas
- **Group Ride Rooms** — room code generation scaffold (live sync coming soon)
- **MAX TWISTIES vs FASTEST** toggle on route generation
- Rebranded manifest, shortcuts, theme

## Legacy V1

Original single-file cockpit with Route / Weather / Fuel / Rides / Bike tabs. V2 preserves every feature, reorganized around the Ride HUD.

## Deploy

Pushes to `main` auto-deploy to Vercel. No env vars needed. No backend.

## Storefront

Badge → merch linking is stubbed. Wire up when the Shopify store is live — search `TODO(store)` in `index.html`.
