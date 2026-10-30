# L1 bench — live on 2510DRA23E

Record in `docs/FIELD_LOG.md` after each harness run. Target is `p95 <300 ms` (Section 4 provisional) — report what you measure, don’t claim the target.

## How to log

1. Open `http://localhost:5173/` (or Vite Network URL) on the 2510DRA23E, chest harness, camera forward, screen on + power bank.
2. Tap **Load detector** → wait for `Detector ready` (first load ~8–12 MB, Workbox-cached).
3. Tap **Start camera** → allow environment camera → walk the A→B→C route or stand with persons/vehicles in corridor.
4. Read pills: `lat p50` / `p95` / `mean` / `n` and `fps`. Copy values here.

## Bench log

| Date | Light | p50 | p95 | mean | n | fps | Notes (WebGPU/WASM, thermal, cues/min) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | day/dusk |  |  |  |  |  |  |

## After bench

- If p95 >300 ms: note it, keep claim honest (“measured p95 X ms on 2510DRA23E”), consider lower frame rate / smaller input.
- Paste this table into `eval/results/results.md` for the demo.
