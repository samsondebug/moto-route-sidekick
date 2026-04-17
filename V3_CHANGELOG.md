# Bad Decision Sidekick v3 — Changelog

## How to ship
Drop both files into the repo root, replacing the originals:
- `index.html` (was 1,588 → now 2,407 lines, 79.8 KB → ~120 KB)
- `sw.js` (bumped to `bds-v5-2026-04-17`; old caches auto-purge on activate)

Users with v2 data load cleanly — legacy `bds_bike` migrates to `bds_bikes` on first boot.

---

## Fatal / Must-Fix bugs fixed

| Ref | Fix |
|-----|-----|
| A1 | **`.cta-ride` pointer-events** — START RIDE button is now tappable. Was inheriting `pointer-events: none` from `.hud-bottom` because the CSS re-enable selector only matched `.btn`. |
| A2 | **iOS DeviceOrientation permission** — `requestMotion()` now asks for both `DeviceMotionEvent` AND `DeviceOrientationEvent`. Lean HUD on iOS was silently stuck at 0° forever without the second prompt. |
| A4 | **Live-ride persistence + resume** — `State.liveRide` now snapshots to `localStorage` every 10s during a ride. On boot, a stale snapshot (under 8h old) prompts the user to resume GPS watch or finalize the ride. Prevents total data loss on iOS background kill. |
| B1 | **Fetch timeouts** — `fetchWithTimeout` utility (8s `AbortController`) wraps all 3 external APIs: OSRM, Nominatim, Open-Meteo. No more indefinite hangs on spotty cell. |
| B2 | **`startRide` re-entry guard** — blocks rapid double-taps during the iOS permission prompt await. Disables the CTA + sets `startRide._pending`. |
| B8 | **QuotaExceededError surfacing** — `lsSet` was silently swallowing storage-full errors; now toasts the user to export + wipe. |
| B9 | **Breadcrumb decimation** — Douglas-Peucker on `endRide` caps breadcrumbs at 500 points before persisting. Prevents localStorage blowup on multi-hour rides. |

---

## New features

### Planning & Routing
- **GPX import** — parses `<rtept>`, `<wpt>`, or `<trkpt>` (auto-decimated to 20 waypoints to avoid OSRM choke). Button in Plan tab → Current Route card.
- **GPX export** — exports current route as `.gpx` (uses track geometry if ≥10 points, otherwise route waypoints). Same button row.
- **Regenerate Twistier** — takes your current route and injects 1–2 nearest twisty-pool nodes at the midpoint, then recalcs.
- **Two new generation presets**: `Sportbike Max Lean` (heavy twisty bias, denser waypoints, shorter hops) and `Mixed Cruise`.
- **Rain re-route with delta** — now computes miles/time added vs. original and tells you in the toast.

### Live Ride / HUD / Telemetry
- **Wake Lock** (`navigator.wakeLock.request('screen')`) during a ride, re-acquired on `visibilitychange`. Toggle in Settings → Ride Safety.
- **Battery Saver mode** — lowers GPS accuracy (`enableHighAccuracy: false`, `maximumAge: 4000`) and dims HUD chrome.
- **Twisties Index** (0–100) computed per ride from average lean × 3.5, alongside `twistyMi` (miles spent above 20° lean). Shown on DNA card.
- **Crash Detection (opt-in)** — 3 peaks > 4g within 500ms triggers a 15-second cancellable modal. If not cancelled, flags the ride + copies an SOS message with location + timestamp + room code to the share sheet.
- **Granular voice cues** — sub-toggles for ride start/end, badge unlocks, and lean alerts ("Lean 40, twisty incoming").
- **Bearing-aware rain reroute** — nudge direction is now perpendicular to the route heading at the worst segment, not always +0.07° latitude.

### Group Ride
- **Large room-code display** (`clamp(48px, 14vw, 88px)`), long-press to select/copy.
- **Web Share invite button** — generates `?room=CODE` URL and opens native share sheet (iOS/Android).
- **Auto-join** — opening a `?room=CODE` URL automatically joins the room and switches to the Group tab.

### Garage / Maintenance
- **Multi-bike support** — unlimited bikes, quick-switch chips at top of Garage tab, "+ Add Bike" chip, delete button. Rides are tagged with `bikeId` on save.
- **Predictive maintenance** — "~450mi / 28d at your current pace" label on each maintenance item, computed from the 60-day rolling average daily mileage. Color-coded warn/danger at <21d/<7d.
- **8 new badges**: 45° Club, Epic 200+ Twisties, Rain Rider (3 rides in 40%+ rain), Weekend Warrior (both Sat & Sun same weekend), Twisty Mind (Twisties Index ≥80), Survivor (cancel a crash alert), Two-Bike Garage, GPX Nerd.

### Sharing & Polish
- **Theme selector** — Classic Orange / Ghost Green / Ion Blue. Switches the entire HUD accent system + DNA card palette via `body[data-theme]`.
- **Ride DNA v3**: theme-aware palette, lean-profile mini-histogram (10 buckets, colored low/mid/hi), Twisties Index badge top-right, rain-highlight tag, "Survivor Ride" tag if crash was cancelled.

### Plumbing
- **Service Worker v5** pre-caches Leaflet marker assets (`marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`, `layers.png`, `layers-2x.png`) so offline maps don't render broken-image placeholders.
- **OSM contributor attribution** added to the About card in Settings.
- **Import preserves new schema** — accepts v1/v2 single-bike backups and auto-migrates them on import; new exports stamp `schemaVersion: 3`.

---

## Explicitly deferred (called out in the feedback but intentionally not in v3)

| Item | Why deferred |
|------|--------------|
| Bluetooth mesh peer-to-peer | Web Bluetooth is GATT-only; mesh isn't available in-browser. The server-backed live-sync story is the realistic path. |
| Live weather/hazard overlay in group view | Requires the group-sync backbone to exist first. |
| Multi-day trip builder | Meaningful new feature surface (daily caps, overnight fuel stops, route chaining). Ships best as v4 focus. |
| Auto-geotag photos from live ride | Needs a photo capture UI (A3 — dead infrastructure still). Stub UI next release. |
| Elevation-filter routing + Avoid Construction | Needs Open-Elevation and TxDOT data sources + backend proxy. Not single-file-PWA territory. |
| QR code generation for invite | Would need a library; Web Share handles the 90% case cleaner for mobile (native share sheets auto-generate QR on iOS/Android anyway). |
| Cardo/Sena voice-prompt testing | QA task, not code. |

---

## Still on the v3.1 list

From the original Issue Assassin review, not addressed in this patch:
- **A3** — Photo capture UI (button + `<input type="file" capture="environment">` wired to `photoDB.put`). The infrastructure's still dormant.
- **B3/B4** — OSRM and Nominatim need to go behind a Vercel serverless proxy (current setup is a demo-endpoint ToS violation).
- **B5** — Debounce `recalcRoute` + memoize weather ribbon per segment midpoint. Already reduces API burn but should be tighter.
- **B6** — Waypoint marker still deletes on single tap; should be long-press or × control.
- **B7** — Pre-cache tile source needs to move off OSM (which doesn't send CORS) to an OSM-compatible CORS tile provider to stop bloating storage quota with opaque responses.
- **D1** — Global error boundary (wrap `boot()` in try/catch + fallback UI).
- **D7/D8** — CSP header in `vercel.json` + SRI on unpkg Leaflet.
- **F2** — Finalize naming: `moto-route-sidekick` repo vs. Bad Decision Sidekick product.

---

## QA checklist before deploy

1. **iOS Safari**: Start ride → verify lean HUD responds to phone tilt. (Fails on v2; core proof v3 works.)
2. **Android Chrome**: Start ride → lock screen for 30s → unlock → verify HUD is still recording.
3. **Desktop**: Open route, drag waypoints, verify no fetch hangs when network throttled to 3G slow.
4. Import a GPX from Kurviger / MyRoute-app → verify waypoints render correctly.
5. Generate a ride → Regenerate Twistier → verify twisty score goes up.
6. Toggle Theme → Ghost → verify accent turns green across HUD + DNA card.
7. Add a second bike → switch to it → verify HUD shows correct active bike name.
8. Opt-in to Crash Detection → shake phone hard (3 spikes) → verify modal appears with 15s countdown.
9. Export JSON backup → wipe → import → verify all data restored including the new v3 fields.
10. Open `?room=ABC123` URL → verify auto-join.
