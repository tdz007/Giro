# Giro d’Italia 2027 interactive map

A separate static GitHub Pages edition at `/Giro/2027/`, based on the layout and interactions in `../giro_2026_map.html`. All original 2026 HTML and 21 GPX files remain byte-for-byte unchanged.

## Verified content and current limits

Checked **4 November 2026** against the [official route table](https://www.giroditalia.it/il-percorso/) and [official route announcement](https://www.giroditalia.it/en/news/from-trieste-to-rome-giro-ditalia-2027-route-unveiled/).

- 21 stages, 8–30 May 2027, 3,418.9 km. Rest days: 17 and 24 May.
- All stage names, dates and distances were extracted from the official table, not inferred from the previous edition. Weekdays are calculated in UTC.
- All 21 official JPEG altitude profiles are bundled under `assets/`. Their exact original URLs and SHA-256 hashes are recorded in `assets-manifest.json`. Images remain the organizer’s material; no ownership or license is asserted.
- No verified 2027 GPX files, stage-map images, or stage PDFs were found in the checked official route page or targeted official-site searches. A check of Cyclingstage’s 2027 listing did not establish a verified track download. This is an availability finding as of the verification date, not a claim that files cannot exist elsewhere.
- `gpxUrl`, `mapUrl` and `pdfUrl` are deliberately null for all stages. No filenames are guessed, 2026 assets are not repurposed as 2027 data, and no OSRM/driving or straight-line route fallback exists.
- Coordinates are manually approximated host-area locations, **not verified start/finish lines**. Both the map and hover cards disclose that limitation. When a verified GPX is added, its first/last points replace the approximate markers.
- Thus this edition is an interactive stage/location and official-profile map, pending authentic track publication. It cannot yet display actual 2027 road geometry.

## Features

Retains the 2026 pink sidebar/map layout, OpenStreetMap, stage selection/zoom, search, country filter, fit-to-view, and shared route/start/finish hover cards with date, weekday, distance, start, finish and altitude profile. Adds explicit show/hide checkboxes and all-stage controls, full-viewport PDF/image viewing, keyboard Escape and focus restoration, empty/error states, and responsive scrolling.

The original 2026 viewer was image-only. The new viewer supports a PDF iframe plus a direct original-asset link for browsers that cannot embed PDFs. Missing PDF/map buttons are disabled. PDF display may depend on browser support and remote framing restrictions; local verified PDFs are preferable.

GPX 1.0/1.1 track and route points are supported. Disconnected segments stay separate. If an official profile is absent, an altitude chart can be derived only from real GPX elevation samples; missing elevation samples stay gaps and horizontal distances use geodesic distances. Profiles are not invented.

## Preview and deploy

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/2027/`. Serve over HTTP: directly opening the HTML as `file://` prevents reliable JSON/GPX fetching.

To deploy after reviewing the PR:

1. Merge `feat/giro-2027-map` into `main`.
2. In repository Settings → Pages, retain the existing publishing configuration. For branch-based Pages, use `main` and `/(root)`. If an existing workflow publishes a subset, ensure it includes `2027/` unchanged.
3. Wait for the Pages deployment to succeed, then open **https://tdz007.github.io/Giro/2027/**.
4. The existing map stays at **https://tdz007.github.io/Giro/giro_2026_map.html**. This change does not replace the repository root or alter Pages settings.

No build, server backend, API key, or package installation is required. Leaflet loads from unpkg with pinned version/integrity; base-map tiles require the internet. Profiles and metadata are served locally by Pages.

## Add verified assets later

For each stage in `stages.json`:

1. Verify the asset’s edition, stage and complete route against the organizer; do not infer a race route from endpoints.
2. Prefer storing the authentic file in `assets/` and set `gpxUrl`, `pdfUrl` or `mapUrl` to its relative path. Remote GPX URLs must allow CORS.
3. Add the corresponding `gpxUrlSource`, `pdfUrlSource` or `mapUrlSource` field containing its provenance URL. Record the verification date and asset hash. A failed GPX request leaves only labelled approximate markers; no substitute is drawn.
4. Retain null for anything unavailable. Update the visible verification date and availability wording when re-verifying.
5. Run the checks below and inspect the actual stage in the browser. PDF controls enable automatically when `pdfUrl` is set.

## Tests

```sh
python3 2027/tests/validate.py
node --check 2027/app.js
node --check 2027/route.js
```

With the local server running, open `http://127.0.0.1:8765/2027/tests/browser.html`. It runs isolated browser regression checks and shows a PASS/FAIL report. The test iframe loads one real **2026** GPX only as a parser/rendering fixture; it never changes the 2027 manifest. `tests/sample.pdf` is explicitly marked **TEST FIXTURE — NOT RACE DATA**.

Checks cover metadata and dates, asset integrity, unchanged 2026 files, filters and visibility, empty results, route/start/finish tooltip contents, GPX parsing and segmented tracks, invalid and missing geometry, missing elevations, profile viewing, Escape/focus restoration, PDF wiring and unloading. A real 2027 PDF/GPX cannot be end-to-end verified until available.
