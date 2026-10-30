# Video storyboard — 3:00 (Section 12)

**Open with the problem in the first 10 s.** First-person harness footage, every cue captioned, detections overlaid, results table honest.

## 0:00–0:20 — The problem on a Nairobi/Kisumu street

- Builder voice: “I’ve walked Nairobi’s streets and seen blind pedestrians bump into passers-by. Streets have open drains, hawkers, matatus — not well-mapped.”
- B-roll: Kisumu/Kondele market, open drain, stage/shop signs (blur faces/plates). Text: “The cane stays primary.”

## 0:20–0:50 — Say where. Walk there.

- Hold to talk → “Kondele market” (English + one Swahili “Soko la Kondele” take) → transcript → fuzzy resolve → read-back “Go to Kondele Market?” → tap **ndiyo** → route reasons “no crossings, landmark-rich, avoids open drain” → turn cue preview.

## 0:50–1:40 — The walk

- Chest-mount video, overlay detections (person/vehicle boxes, head-height orange band), corridor ROI, `lat p50/p95` pills.
- Cues: approaching vehicle low pulse (panned left/right), head-height double chirp, person tick, turn tick. Caption every cue.
- Degraded: cover lens → “Vision degraded, rely on cane” (once/30 s) + two-tone.
- Off-route: step aside → “Off route — say replan” → replan tool call log.

## 1:40–2:10 — Arrival confirmed by sign

- Within 20 m, 3 frames (≈700 ms apart, ≤768 px JPEG q70) → show `visible_text` + `best_match_alias` + `confidence` + `position_in_frame` → deterministic `2/3 + GPS≤radius` → three-note rising chime + “Arrived at Kondele Market — please confirm.”
- Show tool log (`resolve_place`/`plan_route`/`verify_arrival`) for Best Agentic.

## 2:10–2:40 — Measured results (honest)

- Table from `eval/results/results.md` (13/13) + `eval/results/wer.json` (WER pending until 50+ phrases) + live on-device `lat p50/p95` from 2510DRA23E (report measured, not target), cues/min, false alarms.
- State test status: “Concept interviews only (1 contact), controlled obstacle trial with sighted spotter — no blind street testing until O&M review.”

## 2:40–3:00 — What’s next

- Phone harness today → cheap ultrasonic + lidar + camera wearable tomorrow — affordable, easy to wear, same on-device hazard loop.
- Repo QR + X clip (30–60 s: problem + one cue clip + repo link) for Most Viral / Community Vote.

**Craft:** first-person, captions on every cue, detection overlay visible, model calls logged, claims narrow and measured. Keep replay mode ready if live walk fails.
