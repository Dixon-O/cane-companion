import { resolvePlace } from '../apps/web/src/routing/gazetteer';
import { dijkstra } from '../apps/web/src/routing/graph';
import { decideArrival, type SignReading } from '../apps/web/src/slow/arrival';
import fs from 'fs';

type Result = { name:string; pass:boolean; detail:string };

function gazetteerTests(): Result[]{
  const cases:{q:string; expect:string|null}[]=[
    {q:'kondele', expect:'kondele-market'},
    {q:'soko la kondele', expect:'kondele-market'},
    {q:'kisumu', expect:'kisumu-main'},
    {q:'nai', expect:'nairobi-nai'},
    {q:'bondo', expect:'bondo-siaya'},
    {q:'kondele market', expect:'kondele-market'},
    {q:'unknown place xyz', expect:null},
  ];
  return cases.map(c=>{
    const { result } = resolvePlace(c.q);
    const got=result?.place.id ?? null;
    return { name:`gazetteer "${c.q}"`, pass: got===c.expect, detail:`got ${got} expect ${c.expect} score ${result?.score?.toFixed(2) ?? '-'}` };
  });
}

function routingTests(): Result[]{
  const a=dijkstra('A','B'), b=dijkstra('A','C'), c=dijkstra('A','D');
  return [
    { name:'route A->B (Kondele market)', pass: !!a && a.reasons.includes('landmark-rich'), detail: a ? `cost ${Math.round(a.cost)} reasons ${a.reasons.join(',')} dist ${a.totalDistM}m` : 'no route' },
    { name:'route A->C (Kisumu) avoids drain', pass: !!b && b.edges.every(e=> e.id!=='A-D'&&e.id!=='D-C'), detail: b ? b.edges.map(e=>e.id).join(' ') : 'no route' },
    { name:'route A->D is hazardous', pass: !!c && c.edges.some(e=> e.meta.hazard>0), detail: c ? `h ${c.edges.map(e=>e.meta.hazard).join(',')}` : 'no route' },
  ];
}

function arrivalTests(): Result[]{
  const alias=['kondele market','kondele'];
  const good: SignReading[]=[
    { visible_text:['KONDELE MARKET'], best_match_alias:'kondele market', confidence:0.82, position_in_frame:'center', frame_quality:'good'},
    { visible_text:['KONDELE'], best_match_alias:'kondele', confidence:0.78, position_in_frame:'center', frame_quality:'good'},
    { visible_text:['KONDELE MARKET'], best_match_alias:'kondele market', confidence:0.90, position_in_frame:'right', frame_quality:'good'},
  ];
  const oneOff: SignReading[]=[
    { visible_text:['KONDELE MARKET'], best_match_alias:'kondele market', confidence:0.82, position_in_frame:'center', frame_quality:'good'},
    { visible_text:['SHOP'], best_match_alias:null, confidence:0.4, position_in_frame:'left', frame_quality:'poor'},
    { visible_text:['OTHER'], best_match_alias:null, confidence:0.3, position_in_frame:'unknown', frame_quality:'poor'},
  ];
  const a=decideArrival(good, 8, 15, alias);
  const b=decideArrival(oneOff, 8, 15, alias);
  const c=decideArrival(good, 30, 15, alias); // far GPS
  return [
    { name:'arrival 3/3 close GPS → arrived', pass: a.arrived, detail:`matches ${a.matches}/2 gpsOk ${a.gpsOk}` },
    { name:'arrival 1/3 close GPS → not arrived', pass: !b.arrived, detail:`matches ${b.matches}/2` },
    { name:'arrival 3/3 far GPS → not arrived', pass: !c.arrived, detail:`gpsOk ${c.gpsOk} matches ${c.matches}` },
  ];
}

export function runHarness(){
  const all=[...gazetteerTests(), ...routingTests(), ...arrivalTests()];
  const pass=all.filter(r=>r.pass).length, total=all.length;
  const lines=all.map(r=> `${r.pass?'✓':'✗'} ${r.name} — ${r.detail}`);
  const md=`# Eval Results

Generated: ${new Date().toISOString()}
Device: 2510DRA23E / Android 16 (harness replay, no live GPS)
Tuning vs test: tuning split not yet separated — do not tune on test set (Section 9)

## Summary
${pass}/${total} passed

## Details
${lines.map(l=> `- ${l}`).join('\n')}

## Notes
- Gazetteer fuzzy: token+Levenshtein, tie <0.06 asks either-or.
- Routing cost: dist + cross×80 + hazard×120 + unknown×40 − landmark×30.
- Arrival deterministic: GPS ≤ radius AND ≥2/3 frames text match (Section 6).
- Hazard latency p50/p95 to measure on 2510DRA23E chest mount (target p95 <300 ms — report measured).
- WER gate 15% — record 50+ phrases (English/Swahili/code-mixed, 3+ speakers) before claim.
`;
  const json={ generated:new Date().toISOString(), pass, total, results:all };
  return { md, json, pass, total };
}

if(import.meta.url === `file://${process.argv[1]}`){
  const { md, json, pass, total } = runHarness();
  fs.mkdirSync('./eval/results', { recursive:true });
  fs.writeFileSync('./eval/results/results.json', JSON.stringify(json,null,2));
  fs.writeFileSync('./eval/results/results.md', md);
  console.log(md);
  console.log(`\n${pass}/${total} passed — wrote eval/results/results.json + results.md`);
}
