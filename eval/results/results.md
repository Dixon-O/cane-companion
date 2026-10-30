# Eval Results

Generated: 2026-10-30T10:31:23.975Z
Device: 2510DRA23E / Android 16 (harness replay, no live GPS)
Tuning vs test: tuning split not yet separated — do not tune on test set (Section 9)

## Summary
13/13 passed

## Details
- ✓ gazetteer "kondele" — got kondele-market expect kondele-market score 1.00
- ✓ gazetteer "soko la kondele" — got kondele-market expect kondele-market score 1.00
- ✓ gazetteer "kisumu" — got kisumu-main expect kisumu-main score 1.00
- ✓ gazetteer "nai" — got nairobi-nai expect nairobi-nai score 1.00
- ✓ gazetteer "bondo" — got bondo-siaya expect bondo-siaya score 1.00
- ✓ gazetteer "kondele market" — got kondele-market expect kondele-market score 1.00
- ✓ gazetteer "unknown place xyz" — got null expect null score -
- ✓ route A->B (Kondele market) — cost 35 reasons no crossings,no open drains,landmark-rich dist 65m
- ✓ route A->C (Kisumu) avoids drain — A-B B-C
- ✓ route A->D is hazardous — h 1
- ✓ arrival 3/3 close GPS → arrived — matches 3/2 gpsOk true
- ✓ arrival 1/3 close GPS → not arrived — matches 1/2
- ✓ arrival 3/3 far GPS → not arrived — gpsOk false matches 3

## Notes
- Gazetteer fuzzy: token+Levenshtein, tie <0.06 asks either-or.
- Routing cost: dist + cross×80 + hazard×120 + unknown×40 − landmark×30.
- Arrival deterministic: GPS ≤ radius AND ≥2/3 frames text match (Section 6).
- Hazard latency p50/p95 to measure on 2510DRA23E chest mount (target p95 <300 ms — report measured).
- WER gate 15% — record 50+ phrases (English/Swahili/code-mixed, 3+ speakers) before claim.
