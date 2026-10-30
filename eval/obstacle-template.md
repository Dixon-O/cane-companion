# Obstacle-course template (sighted spotter required)

Measure cane-only vs cane + assistant on same course. Report honest recall/false-alarm.

## Course (Kondele demo area)

- 3 person-ahead (center/left/right, mid distance)
- 2 approaching vehicle (panned, isApproaching)
- 2 head-height (upper band y<0.43)
- 1 off-route segment to trigger “Off route — say replan”

## Procedure

1. Spotter walks 1 m behind, cane stays primary.
2. Run 1: cane-only — count collisions/time/effort (1–5).
3. Run 2: cane + assistant (L1+L2, cues ≤6/min) — same metrics + cues/min + `lat p50/p95` from pill.
4. Log in `docs/FIELD_LOG.md`.

## Metrics table (for `eval/results/results.md`)

| Condition | Collisions | Time | Effort (1–5) | Cues/min | False alarms/min | lat p95 |
| --- | --- | --- | --- | --- | --- | --- |
| Cane only |  |  |  | — | — | — |
| Cane + assistant |  |  |  |  |  |  |

Never claim drain/pole/branch recall that was not measured (Section 7 honest limit).
