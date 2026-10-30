# STATUS — Cane Companion

Audited: 2026-10-30 (re-baselined plan, Section 11).
Builder answers recorded in `DECISIONS.md` (Oct 30).
Repo: `https://github.com/Dixon-O/cane-companion.git` (empty before this slice, branch `main`).

## Exit criteria vs Oct 27–29 (re-baselined)

| Day | Goal (handoff) | Status | Notes |
| --- | --- | --- | --- |
| Oct 27 | Repo public + MIT, PWA skeleton with camera/mic/GPS, hello-world to both providers, cost logger, Day-1 unknowns, builder answers | Partial → nearly done | Repo at `6513673`/`0dbba84` public on `main`. Baseten hello-world + tool + image base64 pass (p50 2548 p95 3217). **PWA skeleton now live** at `apps/web` (Vite+TS strict, PWA `vite-plugin-pwa` with Workbox, camera/mic/GPS stubs, cue test, gazetteer hook) — build 146 ms, typecheck pass. Preview deploy still to push; cost logger per-call in smoke harness. |
| Oct 28 | Safety loop L1, audio cues, latency instrumentation, data capture #1 | Partial | **L1 built**: MediaPipe EfficientDet-Lite0 (WebGPU→WASM), corridor ROI 20–80/25–95, 6-class filter, proximity from box height + growth (isApproaching), left/center/right, overlay, p50/p95/mean latency + fps, cue engine priority queue (≤6/min, debounce, StereoPanner + vibrate). Needs 2510DRA23E field benchmark + Kondele capture #1. |
| Oct 29 | Routing, gazetteer, guidance engine, GPS-trace simulator | Done (demo graph) | **Built**: `data/gazetteer.json` + `data/annotations.geojson`, `src/routing/gazetteer.ts` (token+Levenshtein fuzzy, tie <0.06), `graph.ts` (Dijkstra, cost = dist+cross×80+hazard×120+unknown×40−landmark×30, 5 nodes A–E Kondele, reasons no-crossings/landmark-rich), `guidance.ts` (snap to mid + 25 m off-route, bearing, GuidanceEngine), `simulator.ts` (1.2 m/step walk replay). Wired to PWA resolve → Dijkstra → simulate. |
| Oct 30 (re-baselined) | Status audit; Baseten smoke tests; finish missing L1/cue/routing/guidance; start destination voice | Partial → voice+arrival done | **Voice + arrival built**: push-to-talk MediaRecorder → `audio_url` data URL (5 s timeout, 1 retry, `cannot confirm`), read-back `ndiyo/hapana`, “Stop” always, arrival 3×768 px JPEG q70 + `readSign` + deterministic `2/3 + GPS≤radius` (strict), `speechSynthesis` fallback. Needs 2510DRA23E field test with real speech + signage. |
| Oct 31 (re-baselined) | Destination resolution with read-back; arrival verification and sign reading; field data capture #1 | In progress | Same — voice/arrival code done, field capture #1 + 2 entrances + interviews next. |

## Baseten blockers & decisions

- Only Baseten provider available (`$100`, model `meta-models/muse-spark-open-1026`). Modal and Fireworks unavailable — skip second-provider comparison and fine-tune unless WER gate forces a rethink.
- Phone for benchmarks: Xiaomi 2510DRA23E, Android 16 `BP2A.250605.031.A3` (Oct 30).
- Demo area: Kondele, Kisumu (~1 km² to survey). Gazetteer destinations: Kisumu, Kondele, Nairobi alias "Nai", Bondo (Siaya). Routing demo stays inside Kondele; distant names are gazetteer alias tests only.

## Next in re-baselined order

1. Baseten smoke tests (5 checks, Section 6) → record latency/cost in `DECISIONS.md`.
2. Whichever of L1 / cue engine / routing+guidance is missing → smallest vertical slice first.
3. Destination voice (transcribe → fuzzy resolve → read-back → confirmation).

## Deltas vs handoff schedule

Using the Oct 30 re-baselined cut list: stretch/L3/custom classes second-provider compare, haptics, Swahili TTS, landmark resets are deferred; arrival verification is kept.
