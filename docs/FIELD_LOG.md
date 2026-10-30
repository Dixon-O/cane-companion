# FIELD_LOG — Kondele (~1 km²)

Record each survey walk. Keep raw video in `data/raw/` (ignored). Commit only this log, `data/annotations.geojson` diffs, `data/trace-*.json`, and `data/capture-index.json` (index, no raw).

## Session template (copy per walk)

### Session YYYY-MM-DD — #1 (day) / #2 (dusk) — 2510DRA23E

- **Time:** EAT
- **Weather/light:** 
- **Route:** A→B→C (+ D/E if hazard check)
- **Harness:** chest, camera facing forward, screen on + power bank
- **Video:** `data/raw/YYYY-MM-DD-#.mp4` (not committed) — duration, consent, blur faces/plates before publish
- **GPS trace:** `data/trace-YYYY-MM-DD-#.json` — points, gap check
- **L1 latency on device:** p50 / p95 / mean / n (from pill `lat p50/p95/mean`) — target p95 <300 ms, report measured
- **Degraded:** triggers (dark/glare/blur/occlusion) count + 30 s cooldown respected?
- **Arrival frames:** 3 frames per entrance at ~20/15/8 m, tape vs GPS distance, `verify_arrival` result per entrance (pass/fail)
- **Notes:** matatu/hawker/open drain observations for `annotations.geojson` deltas

## Interview log (concept, no street testing per Section 3 #9)

### Interview YYYY-MM-DD — # — blind pedestrian / O&M staff

- **Consent:** yes/no, anonymized?
- **Cues:** audio samples played (tick/chirp/pulse + panned), preferred side/word count
- **Route prefs:** landmark wording (“shop with red sign”), crossing handling
- **Quote for README/video:** 

## Obstacle trial (controlled, sighted spotter present)

### Trial YYYY-MM-DD — cane-only vs cane + assistant

- **Setup:** course with person/vehicle/head-height proxies, spotter at 1 m
- **Metrics:** collisions, time, tester effort rating, cues/min, false alarms/min
- **Note:** blindfolded sighted = rough proxy, label as such. Blind testers only with informed consent + O&M oversight.
