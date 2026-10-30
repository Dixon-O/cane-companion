# LOG — Cane Companion

Append after each small vertical slice: what changed, what was measured.

## Slice 1 — 2026-10-30 — Repo foundations + Day-1 decisions (audit)

- **What:** Cloned empty `Dixon-O/cane-companion`, created scaffold (`apps/web`, `services/api`, `packages/shared`, `data`, `eval`, `docs`), added `.gitignore` (covers `.env`, raw media, handoff doc), `.env.example` (BASETEN_API_KEY, META_API_KEY, caps, KILL_SWITCH), `README.md`, `docs/STATUS.md` (audit vs Oct 27–29, re-baselined), `docs/DECISIONS.md` (8 builder answers + future sensor device note), this log. Tagged `hackathon-start` intent; no PWA/API code yet.
- **Measured:** Repo empty before slice (no commits, branch `main`). Toolchain: git 2.52, node 24.12, npm 11.6.2. No Baseten calls yet.
- **Decisions:** Phone 2510DRA23E Android 16 `BP2A.250605.031.A3`; demo Kondele/Kisumu + gazetteer aliases Nai/Bondo; Indie track; 1 blind contact; bonuses Open-Weight + Agentic + Viral + Community Vote; WER 15%; clean start; only Baseten $100.
- **Next:** Baseten 5 smoke tests (needs `BASETEN_API_KEY` in env) → fill `DECISIONS.md` unknowns table; then smallest missing vertical slice of L1/cue/routing per re-baselined order.

## Slice 2 — 2026-10-30 — Baseten smoke tests + phone build confirmed

- **What:** Ran 7 Baseten calls via `eval/smoke-baseten.mjs` (Chat Completions `meta-models/muse-spark-open-1026`). Fixed key parsing (strip quotes) and image b64 handling. Updated `docs/DECISIONS.md` unknowns table + smoke table, `docs/STATUS.md` to Partial for Oct 27/30. Device confirmed 2510DRA23E Android 16.
- **Measured:** Text 200 3217 ms $0.0032 (prompt 152 comp 702 cached 128, reasoning 710); tool `resolve_place` 200 1528 ms $0.0020; valid image 200 ~1280–1800 ms $0.0039 (malformed b64 → 400 fixed; https URL → 400/403 blocked — base64 path is the one to use per Section 6). Audio data URL silent WAV 200 3433 ms $0.0027 but model said "no audio" — needs real speech fixture; https audio blocked. Latency p50 2548 ms p95 3217 ms (n=6). Spending ~$0.019 so far.
- **Decisions:** Keep slow-loop at events only with 5 s timeout + retry + "cannot confirm" fallback (Section 6). Frame rule: longest side ≤768 px, JPEG q~70, 1–3 frames. Caching via `x-session-affinity` + `cached_tokens` verified. Next fixture: record 50+ destination phrases (English/Swahili/code-mixed, 3+ speakers) for WER.
- **Next:** Smallest vertical slice of L1/cue/routing — start PWA skeleton + on-device detector benchmark on the 2510DRA23E, then gazetteer + guidance.

## Slice 3 — 2026-10-30 — PWA skeleton (chest-harness preview) + gazetteer

- **What:** `apps/web` Vite 5.4 + TS strict + `vite-plugin-pwa` (Workbox, manifest). `src/main.ts` harness preview: camera (environment facing), GPS watch, cue engine stub (Web Audio StereoPanner tick/chirp/pulse + HUD), destination resolve stub reading `data/gazetteer.json` (Kondele/Kisumu/Nai/Bondo), slow-loop log. Added `data/gazetteer.json`, `packages/shared` Zod schemas + `isArrived` deterministic rule. Taste guardrails applied (no purple gradient, no glassmorphism).
- **Measured:** `npm install` 334 packages 1m, `vite build` 146 ms 9.41 KiB precache + 6.78 kB JS, `tsc --noEmit` pass, dev server 200 on `http://localhost:5173/` (561 ms ready). Probe via node fetch 200, curl 200. Preview deploy pending.
- **Next:** On-device L1 detector benchmark (MediaPipe EfficientDet-Lite) + audio cue tuning on 2510DRA23E, then routing graph + guidance engine.

## Slice 4 — 2026-10-30 — L1 safety loop (detector + cue engine)

- **What:** Added `src/safety/detector.ts` (EfficientDet-Lite0 via `@mediapipe/tasks-vision` 0.10.14, FilesetResolver CDN WASM, score 0.45, corridor 20–80/25–95 with 30% overlap, 6 classes, left/center/right, proximity close/mid/far from bbox height + isApproaching from area growth, tracker prune) + `src/safety/cue.ts` (priority queue, ≤6/min budget, 280 ms gap, 900 ms debounce, StereoPannerNode panning, vibrate pattern). Wired `src/main.ts` overlay canvas, `detector.detect` per-frame `requestAnimationFrame`, latency p50/p95/mean/fps pills, cue on person/vehicle.
- **Measured:** `npm i @mediapipe/tasks-vision` 336 packages, `tsc --noEmit` pass (after fixing implicit any), `vite build` 788 ms 15.22 kB + 135.93 kB vision bundle (gzip 40.67 kB), dev 200 still serving. On-phone p50/p95 to measure on 2510DRA23E — harness shows live pills.
- **Next:** Field benchmark on 2510DRA23E chest mount (Section 4: p50/p95 <300 ms target, report measured) + Kondele capture #1 + routing/guidance slice.

## Slice 5 — 2026-10-30 — Routing + guidance + simulator (Kondele demo graph)

- **What:** Added `data/annotations.geojson` (5 features: crossing, open drain, steps, red-sign landmark, missing pavement) + `src/routing/gazetteer.ts` (normalize/token/Levenshtein tokenScore + tie <0.06 → ask either-or), `graph.ts` (5 nodes A–E Kondele, haversine, DEFAULT_WEIGHTS cross80/hazard120/unknown40/turn25/landmark30, Dijkstra + reasons), `guidance.ts` (hav/bearing, snapToRoute mid, offRoute 25 m, nextTurnInstruction, GuidanceEngine), `simulator.ts` (lerp walk 1.2 m/step + jitter). Wired `src/main.ts` resolve → fuzzy → Dijkstra A→B/C → GuidanceEngine → Simulate walk (90 ms/step, turn cues).
- **Measured:** `tsc --noEmit` pass (fixed implicit msg), `vite build` 832 ms 23.85 kB + 135.93 kB vision (gzip 9.61 kB), dev 200 still serving. Demo: "kondele" → B 1 crossing/landmark, "kisumu" → C via A-B-C, "nai"/"bondo" → alias-only message, simulator replays ~60 points with map-match logging.
- **Next:** Destination voice (push-to-talk → Baseten audio_url + read-back ndiyo/hapana + stop) + arrival verification (2/3 frames + GPS radius per Section 6), then degraded mode + L2 head-height band, then full eval + obstacle trial.

## Slice 6 — 2026-10-30 — Voice push-to-talk + arrival verification

- **What:** Added `src/voice/pushToTalk.ts` (MediaRecorder → data URL, `transcribeAudio` via Baseten `audio_url` with 5 s timeout, falls back to local typed input if no `VITE_BASETEN_API_KEY`) + `src/slow/arrival.ts` (`captureFrame` ≤768 q70, `readSign` → Zod `signReadingSchema` + 5 s abort + `cannot confirm`, `decideArrival` deterministic 2/3 + GPS≤radius). Wired `src/main.ts`: Hold-to-talk (pointerdown/up), transcript log, pendingPlace read-back `speechSynthesis` "Go to X?", ndiyo/hapana, Stop (clears state, cane stays primary), Verify arrival (captures 3 frames 700 ms apart → 3 reads → decide).
- **Measured:** `npm i zod` 337 packages, `tsc --noEmit` pass (fixed implicit t), `vite build` 1.66 s 120.92 kB + 135.93 kB vision (gzip 38.17 kB), dev 200. On-phone test pending with real speech (English/Swahili/code-mixed) + signage frames.
- **Next:** Degraded-mode monitor (brightness/blur/occlusion, hysteresis, once per 30 s) + L2 head-height band, then `eval` harness + obstacle trial + interviews + storyboard.

## Slice 7 — 2026-10-30 — Degraded monitor + L2 head-height

- **What:** Added `src/safety/quality.ts` (64×48 downscale, brightness avg, blur var-of-Laplacian, occlusion dark-ratio 0.72, thresholds dark 35/glare 220/blur 80, hysteresis N=3, cooldown 30 s) + wired `src/main.ts` loop: every 800 ms `assessFrame(overlay)`, updates camStatus `b/blur`, `shouldAnnounce` → `degraded` cue + speech “Vision degraded, rely on cane” once per 30 s. **L2**: head-height upper band `y<0.43` (30% of corridor) with orange dashed box, thicker border, `head` label, filtered `headDets` → `head-height` cue panned. `draw` now shows corridor + band.
- **Measured:** `tsc --noEmit` pass (fixed implicit d), `vite build` 1.59 s 122.72 kB + 135.93 kB vision (gzip 38.88 kB), dev 200 still serving. On-phone degraded/L2 to verify via covering lens / bright glare and overhead branches.
- **Next:** `eval` harness + obstacle course with spotter + concept interviews + storyboard + video (Nov 3 12:00 EAT freeze, Nov 4 12:00 EAT submit).

## Slice 8 — 2026-10-30 — Agent loop + eval harness (13/13) + gazetteer fix

- **What:** Added `src/slow/agent.ts` (5 tools: resolve_place/plan_route/check_landmark/verify_arrival/replan, deterministic gates own safety, 5 s abort → `cannot confirm`, `x-session-affinity`, logs each tool + cost) + `data/capture-checklist.md` + `eval/harness.ts` (gazetteer 7, routing 3, arrival 3). **Fix:** `gazetteer.ts` `tokenScore` `best=1→0` (was always 1 → every query tied → all 6 gazetteer tests returned null; now 13/13 pass). Wrote `eval/results/results.json` + `results.md` via harness replay (harness replay, no live GPS).
- **Measured:** `tsc --noEmit` pass (removed `require`), `vite build` 1.49–1.55 s 122.72 kB + 135.93 kB vision (gzip 38.88 kB), dev 200 on `http://localhost:5173/` (curl 200). Harness: **13/13 passed** (gazetteer kondele/soko/kisumu/nai/bondo/kondele market/unknown, routing A→B cost 35/landmark-rich, arrival 3/3 close→arrived, 1/3→not, far→not). Installed `tsx` for harness.
- **Next:** Field capture #1 (Kondele video + 2 entrances 3 frames each + GPS traces) + concept interviews (3–5, no street testing) + obstacle course with spotter + video storyboard → freeze Nov 3 12:00 EAT, submit Nov 4 12:00 EAT (platform Nov 5 05:00 EAT).

## Slice 9 — 2026-10-30 — Field capture prep + WER stub + obstacle template

- **What:** Added `data/wer-dataset.json` (8-phrase stub, note for 50+ phrases 3+ speakers English/Swahili/Sheng, gate 15%) + `eval/wer.ts` (word-level lev WER, pending count, avg, gatePass) → `eval/results/wer.json` (8/8 pending, message pending 50+), `docs/FIELD_LOG.md` (session/interview/obstacle templates per Section 8/3), `eval/obstacle-template.md` (cane-only vs cane+assistant metrics table). No raw audio/video committed (ignored).
- **Measured:** `wer.ts` reports `8/8 pending — need 50+ phrases` (stub correct), `tsc --noEmit` pass, `vite build` 1.49 s, dev 200. Field capture #1/#2 + live 2510DRA23E p50/p95 + WER still to run on device/chest mount before claims.
- **Next:** Run field captures in Kondele (day + dusk) per `data/capture-checklist.md` + fill `docs/FIELD_LOG.md` + record 50+ phrases to retire WER pending → storyboard + video by Nov 3 12:00 EAT.

## Slice 10 — 2026-10-30 — WER 52-phrase + capture index/trace + storyboard + bench

- **What:** Expanded `data/wer-dataset.json` 8→52 phrases (English/Swahili/Sheng/code-mixed, Kenyan-accented, 52 ids p01–p52 including “Stop/Simama/Ndiyo”, gate 15%) + `data/capture-index.json` + `data/trace-2026-10-30-A.json` (5-point A→B→C stub for simulator replay, not raw video) + `docs/STORYBOARD.md` (0:00–3:00 per Section 12: problem 0:00–0:20, say-walk 0:20–0:50, walk 0:50–1:40 with cues + degraded + off-route, arrival 1:40–2:10 with 3 frames + tool log, results 2:10–2:40, next 2:40–3:00, Most Viral cut) + `docs/L1_BENCH.md` (p50/p95 bench table for 2510DRA23E, Workbox-cached).
- **Measured:** `wer.ts` now **52/52 pending** (need 3+ speakers, real Baseten `audio_url` transcripts before WER claim), `harness.ts` still **13/13**, `tsc --noEmit` pass, `vite build` 1.46 s 122.72 kB + 135.93 kB vision, dev 200 on `http://localhost:5173/` (`curl` 200). Captures + bench to run in Kondele, then freeze Nov 3 12:00 EAT.
- **Next:** Execute field walks + interviews + obstacle trial (spotter present) → fill `docs/FIELD_LOG.md` + `eval/results` → record video takes.
