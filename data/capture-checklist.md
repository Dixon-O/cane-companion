# Field Capture Checklist — Kondele (~1 km²)

Consent first. Blur faces/plates before publishing. No personal data in repo (Section 3 #8).

## Session A (Oct 28) + B (Nov 1) — day and dusk

- [ ] Walk the 5-node demo route A→B→C (+ D/E spurs) with phone on chest harness, camera forward, screen on (power bank).
- [ ] Record walking video (for AI-assisted survey + eval clips) — keep raw in `data/raw/` ignored, index only in `data/capture-index.json` (no raw video committed).
- [ ] Log GPS traces (for harness replay) — save as `data/trace-YYYY-MM-DD.json`.
- [ ] Annotate 200+ frames for head-height / approaching hazards (SAM 3.1 assist, human verify every label per Section 9).
- [ ] At 2 entrances (Kondele market + one alternative): capture 3 frames each at ~20 m, 15 m, 8 m for arrival 2/3 test; measure tape distance vs GPS.

## Interviews (3–5 concept, no street testing)

- [ ] Ask blind pedestrian or O&M staff: preferred cue side (left/right), speech length (≤8 words), cue budget tolerance, landmark wording (“turn left at the shop with the red sign”).
- [ ] Record quotes for README/video — with explicit consent.

## Safety

- [ ] Sighted spotter present for any controlled obstacle trial. Blindfolded sighted testers labeled as proxy only. Blind testers only with O&M oversight and informed consent (Section 3 #9).
- [ ] Never claim drop-off/open-drain detection unless measured (Section 7 honest limit).

## After capture

- [ ] Run `npm --prefix eval run harness` → `eval/results/results.md` (table for demo).
