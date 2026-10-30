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
