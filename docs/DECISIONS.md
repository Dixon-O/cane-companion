# DECISIONS — Cane Companion

All Day-1 unknowns and [BUILDER] answers. Update after each measurement. Follow Section 6 spec; do not guess API behavior.

## Builder answers (2026-10-30)

- **(1) Phone + OS:** Xiaomi Redmi Note 15. Android version TBD — to capture on-device (`Settings → About phone`) and re-record here. Benchmarks in Section 7/4 must be on this device.
- **(2) Demo area + destinations:** Demo area Kondele, Kisumu (~1 km² to survey on foot, annotations → `data/annotations.geojson`). Gazetteer `data/gazetteer.json` holds: Kisumu, Kondele (local), Nairobi alias "Nai", Bondo (Siaya) with English/Swahili/Sheng aliases and expected sign text. Note: Nairobi/Bondo are included for alias/fuzzy testing; walking demo stays inside Kondele.
- **(3) Track:** Indie Developer (confirmed).
- **(4) Blind tester access + consent:** 1 blind contact available. No live-street testing until controlled trials pass with sighted spotter and ideally O&M review (Section 3 #9). For hackathon demo/eval: concept interviews (3–5, cues/audio/route prefs, no street testing) quoted in README/video. Consent + face/plate blur for any recordings; no personal data in repo.
- **(5) Bonus prizes:** Primary — Best Build on Meta Open Weight Models + Best Agentic Use-Case. Secondary — Most Viral + Community Vote (builder to drive X + voting).
- **(6) WER threshold (fine-tune gate):** 15%. Simple tracking: `eval/results.md` will have a one-line gate card — `WER ≤15% → done` / `WER >15% → loaded gazetteer biasing → re-measured → if still >15% consider fine-tune`. If WER gate never fires, record "biasing sufficient, no fine-tune" (Modal unavailable anyway).
- **(7) Pre-existing code:** None. Clean start. Repo tagged `hackathon-start` at slice 1. `.gitignore` covers handoff doc, `.env`, raw media, and unrelated folders.
- **(8) Modal / Fireworks / Baseten:** Only Baseten available: `$100` key, model `meta-models/muse-spark-open-1026` (hackathon id). Modal + Fireworks unavailable — cut second-provider comparison and fine-tuning from plan unless explicitly re-approved. Baseten budget to track from day 1 (Section 6 caps: ≤2,000 dev + 500 eval + 500 demo, ≥30% reserve).

## Vision note (builder, Oct 30)

Goal is affordable access in Kenya; future intent is a cheap wearable with ultrasonic + lidar + high-quality camera — easy to wear, still effective. This hackathon is the phone-based proof step toward that device. Architecture keeps hazard loop on-device so a sensor fusion swap later does not change the safety contract.

## Day-1 unknowns to measure (Section 6)

Record here after each smoke test. Do not claim before measuring.

| # | Question | Result (fill after smoke) |
| --- | --- | --- |
| 1 | Can Muse Spark Open read storefront signs in Nairobi/Kisumu frames? | TBD — smoke (2) |
| 2 | Does Muse Spark Open handle Kenyan-accented English + Swahili place names (audio_url)? | TBD — smoke (4) |
| 3 | Does either model support Swahili? | TBD — test both |
| 4 | Per-call latency from Kenya (p50/p95) + tokens/cost | TBD — smoke (5) |
| 5 | Rate limits seen (headers + `GET /v1/model_apis/...`) | TBD |
| 6 | Caching via `x-session-affinity` + `cached_tokens` | TBD |

## Baseten smoke tests (Section 6, 5 checks)

Run with `BASETEN_API_KEY` in env only (never commit). Record provider, latency, tokens, cost per call. Use timeout 5 s, one retry, "cannot confirm" on failure.

1. Text call
2. One base64 street frame → visible_text
3. Tool call → `resolve_place` args
4. `audio_url` with recorded destination (English / Swahili / code-mixed)
5. Latency p50/p95 from Kenya + tokens per call

## Baseten spec anchors (Oct 30, supersedes earlier basics)

- Base URL `https://inference.baseten.co/v1`, header `Authorization: Bearer $BASETEN_API_KEY`, Chat Completions, model `meta-models/muse-spark-open-1026`. No dedicated deployments.
- Images `image_url` (https or base64 data URL), ≤8/request, 10 MB by URL, 100 MiB body, no PDFs. Audio `audio_url`, WAV/MP3/FLAC/OGG/M4A up to 4 files/25 MB/5 min. Tool calling works, JSON mode/structured outputs do not, `n` must be 1, logprobs ignored, seed/temperature 0 not reproducible.
- Price: $1.25/M input, $0.15 cached, $4.25 output. One 3-frame 768 px call ~5k in + 400 out ≈ $0.008.
- Limits: check `GET https://api.baseten.co/v1/model_apis/<slug>` + `x-ratelimit-*`. Retry 429/529 with backoff+jitter; 402 = exhausted stop.
