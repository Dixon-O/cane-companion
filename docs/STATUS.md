# STATUS — Cane Companion

Audited: 2026-10-30 (re-baselined plan, Section 11).
Builder answers recorded in `DECISIONS.md` (Oct 30).
Repo: `https://github.com/Dixon-O/cane-companion.git` (empty before this slice, branch `main`).

## Exit criteria vs Oct 27–29 (re-baselined)

| Day | Goal (handoff) | Status | Notes |
| --- | --- | --- | --- |
| Oct 27 | Repo public + MIT, PWA skeleton with camera/mic/GPS, hello-world to both providers, cost logger, Day-1 unknowns, builder answers | Partial | Repo cloned empty, now scaffolding in this slice. Builder answers done. Hello-world calls and cost logger not yet run. PWA skeleton missing. |
| Oct 28 | Safety loop L1, audio cues, latency instrumentation, data capture #1 | Missing | L1 detector, cue engine, instrumentation not built. No capture yet. |
| Oct 29 | Routing, gazetteer, guidance engine, GPS-trace simulator | Missing | Graph search, gazetteer, snap/replan not built. |
| Oct 30 (re-baselined) | Status audit; Baseten smoke tests; finish missing L1/cue/routing/guidance; start destination voice | In progress | This file is the audit. Smoke tests next (needs `BASETEN_API_KEY` in env). |

## Baseten blockers & decisions

- Only Baseten provider available (`$100`, model `meta-models/muse-spark-open-1026`). Modal and Fireworks unavailable — skip second-provider comparison and fine-tune unless WER gate forces a rethink.
- Phone for benchmarks: Xiaomi Redmi Note 15 (Android version TBD — confirm on device, Section 7).
- Demo area: Kondele, Kisumu (~1 km² to survey). Gazetteer destinations: Kondele (local), Kisumu, Nairobi alias "Nai", Bondo (Siaya). Routing demo stays inside Kondele; distant names are in gazetteer for alias/fuzzy-match testing only — not city-wide routing.

## Next in re-baselined order

1. Baseten smoke tests (5 checks, Section 6) → record latency/cost in `DECISIONS.md`.
2. Whichever of L1 / cue engine / routing+guidance is missing → smallest vertical slice first.
3. Destination voice (transcribe → fuzzy resolve → read-back → confirmation).

## Deltas vs handoff schedule

Using the Oct 30 re-baselined cut list: stretch/L3/custom classes second-provider compare, haptics, Swahili TTS, landmark resets are deferred; arrival verification is kept.
