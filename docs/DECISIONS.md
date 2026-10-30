# DECISIONS — Cane Companion

All Day-1 unknowns and [BUILDER] answers. Update after each measurement. Follow Section 6 spec; do not guess API behavior.

## Builder answers (2026-10-30)

- **(1) Phone + OS:** Xiaomi Redmi Note 15, model **2510DRA23E**, Android **16** `BP2A.250605.031.A3` (confirmed Oct 30). This is the target for all L1/latency/thermal benchmarks (Section 7/4).
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

| # | Question | Result (measured 2026-10-30) |
| --- | --- | --- |
| 1 | Can Muse Spark Open read storefront signs in Nairobi/Kisumu frames? | **Partial pass.** Base64 image with correct JPEG (picsum 768×512) returned 200, prompt 641, completion 734, cached 128, cost ~$0.0039, reasoning 710 tokens. Earlier tiny malformed b64 → 400 "Excess data after padding" (fixed). https URL fetch → 400/403 forbidden (host blocked). So base64 path works. Sign-reading fields not yet tested on real Nairobi/Kisumu shopfront — needs recorded street frames from Kondele. |
| 2 | Does Muse Spark Open handle Kenyan-accented English + Swahili place names (audio_url)? | **Transport pass, content inconclusive.** `audio_url` data URL (silent WAV 0.5s) → 200, prompt 164, completion 583, cached 128, but model reported "no audio" (silent). Public https audio → 400 "Cannot connect to host". Needs real recorded destinations (English/Swahili/code-mixed) from Section 4 test set to measure WER. Gate unchanged: WER 15% with `eval/results.md` card. |
| 3 | Does either model support Swahili? | **Deferred.** Muse Spark Open via Baseten not tested for Swahili transcription yet (audio fixture missing). Meta Voice Transcribe unavailable (no META_API_KEY). Will test Swahili + code-mixed once fixtures are recorded. |
| 4 | Per-call latency from Kenya (p50/p95) + tokens/cost | **Measured on home fiber (Kenya):** text p50 ~2548 ms p95 ~3217 ms (n=6: 1980, 2548, 2868, 3217 plus tool 1528, image 1780). Image call ~1280–1800 ms. Typical cost $0.0020–$0.0039 per call. Slow-loop must budget for this — hazard loop stays on-device (Section 3 #3) and slow-loop calls only at events with 5 s timeout + retry + "cannot confirm" fallback. |
| 5 | Rate limits seen (headers + `GET /v1/model_apis/...`) | No `x-ratelimit-*` headers on chat responses. `GET /v1/model_apis/<slug>` → 403 Permission denied with inference key (needs org key). Will monitor 429/529 + 402 at runtime with backoff. |
| 6 | Caching via `x-session-affinity` + `cached_tokens` | `x-session-affinity` sent, `usage.prompt_tokens_details.cached_tokens` returned 128 on repeated system-prompt calls (seen on text + audio + second image). Keep system prompt + tool defs identical and first per Section 6. |

## Baseten smoke tests (Section 6, 5 checks) — results 2026-10-30

Run with `BASETEN_API_KEY` in env only (never commit). 5 s timeout, one retry, "cannot confirm" fallback.

| # | Test | Status | Latency | Usage | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Text ("Say hello in 5 words") | 200 | 3217 ms | prompt 152 comp 702 cached 128 cost $0.0032 | Reasoning included (702 output). |
| 2 | Image base64 (tiny malformed) | 400 | 1780 ms | — | "Excess data after padding" — b64 malformed. |
| 2b | Image base64 (picsum 768×512 valid) | 200 | ~1280–1800 ms | prompt 641 comp 734 cached 128 cost $0.0039 | Describes scene correctly. Confirms base64 path; max 8 images/100 MiB, no PDFs. |
| 3 | Tool `resolve_place` ("Nai near Kondele market") | 200 | 1528 ms | prompt 651 comp 282 cached 0 cost $0.0020 | Tool call returned `{query:"Nai near Kondele market"}` correctly. |
| 4 | Audio `audio_url` silent WAV data URL | 200 | 3433 ms | prompt 164 comp 583 cached 128 cost $0.0027 | Model said "no audio" — silent fixture not useful. https URL → 400 cannot fetch. Real speech fixture needed for WER. |
| 5 | Latency probes (3× text) | 200 | p50 2548 ms p95 3217 ms | 1980, 2548, 2868 ms | Slow-loop must account for ~2.5–3.2 s. Keep reasoning low. |

Spending to date: 7 calls ~$0.019, well under 2000-call dev budget; ≥30% reserve intact.

## Baseten spec anchors (Oct 30, supersedes earlier basics)

- Base URL `https://inference.baseten.co/v1`, header `Authorization: Bearer $BASETEN_API_KEY`, Chat Completions, model `meta-models/muse-spark-open-1026`. No dedicated deployments.
- Images `image_url` (https or base64 data URL), ≤8/request, 10 MB by URL, 100 MiB body, no PDFs. Audio `audio_url`, WAV/MP3/FLAC/OGG/M4A up to 4 files/25 MB/5 min. Tool calling works, JSON mode/structured outputs do not, `n` must be 1, logprobs ignored, seed/temperature 0 not reproducible.
- Price: $1.25/M input, $0.15 cached, $4.25 output. One 3-frame 768 px call ~5k in + 400 out ≈ $0.008.
- Limits: check `GET https://api.baseten.co/v1/model_apis/<slug>` + `x-ratelimit-*`. Retry 429/529 with backoff+jitter; 402 = exhausted stop.
