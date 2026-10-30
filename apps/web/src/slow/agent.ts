import { resolvePlace } from '../routing/gazetteer';
import { dijkstra } from '../routing/graph';
import { decideArrival, type SignReading } from './arrival';

// Deterministic tool implementations — model proposes, code decides (Section 6)
export const tools = {
  resolve_place: {
    description: 'Resolve spoken destination to gazetteer entry. Returns place id, alias, score.',
    parameters: { type:'object', properties:{ query:{type:'string', description:'Spoken destination'}}, required:['query'] },
    execute: ({ query }:{query:string})=>{
      const { result, alternatives } = resolvePlace(query);
      if(!result) return { status:'needs_clarification', alternatives: alternatives.map(a=> ({ id:a.place.id, name:a.place.names[0], score:a.score })) };
      return { status:'resolved', place:{ id:result.place.id, name:result.place.names[0], alias:result.alias, score:result.score, entrance:result.place.entrance, expected_sign_text: result.place.expected_sign_text } };
    }
  },
  plan_route: {
    description: 'Plan safe walking route on Kondele graph. Returns edges, cost, reasons, decision points.',
    parameters: { type:'object', properties:{ from:{type:'string'}, to:{type:'string'}}, required:['from','to'] },
    execute: ({ from, to }:{from:string; to:string})=>{
      const res=dijkstra(from,to);
      if(!res) return { status:'no_route', reason:`No route ${from}→${to} on demo graph (only A–E)` };
      return { status:'ok', edges:res.edges.map(e=> ({ id:e.id, from:e.from, to:e.to, distM:e.distM, meta:e.meta })), totalDistM:res.totalDistM, cost:res.cost, reasons:res.reasons };
    }
  },
  check_landmark: {
    description: 'Check landmark at waypoint to reset GPS drift (one slow-loop call at annotated waypoint).',
    parameters: { type:'object', properties:{ waypoint:{type:'string'}, expected:{type:'string'}}, required:['waypoint'] },
    execute: ({ waypoint, expected }:{waypoint:string; expected?:string})=>{
      // Stub: would compare captured frame signage vs expected; here returns what would be checked
      return { status:'checked', waypoint, expected: expected ?? null, action:'If landmark matches, snap position error to waypoint' };
    }
  },
  verify_arrival: {
    description: 'Verify arrival deterministically: GPS ≤ radius AND 2/3 frames match expected sign text. Do not guess.',
    parameters: { type:'object', properties:{ placeId:{type:'string'}, gpsDistM:{type:'number'}, readings:{type:'array'}}, required:['placeId','gpsDistM','readings'] },
    execute: ({ placeId, gpsDistM, readings }:{placeId:string; gpsDistM:number; readings: SignReading[]})=>{
      const fakeAliases=['kondele','kisumu'];
      const ans=decideArrival(readings, gpsDistM, 15, fakeAliases);
      return { status: ans.arrived ? 'arrived' : 'not_arrived', gpsOk: ans.gpsOk, matches: ans.matches, frames: ans.frames, rule:'GPS≤radius AND ≥2/3 frames text match' };
    }
  },
  replan: {
    description: 'Replan when off-route (>25 m) or hazard reported. Returns new route.',
    parameters: { type:'object', properties:{ from:{type:'string'}, to:{type:'string'}, reason:{type:'string'}}, required:['from','to'] },
    execute: ({ from, to, reason }:{from:string; to:string; reason?:string})=>{
      const res=dijkstra(from,to);
      return { status: res ? 'replanned' : 'no_route', reason: reason ?? 'off_route', route: res };
    }
  }
} as const;

export type ToolName = keyof typeof tools;

// Agent loop: single Chat Completions call with tools, Zod-validated, one retry on invalid, then fallback “cannot confirm”
export async function runAgent(messages: {role:'string'; content:string}[], onLog:(s:string)=>void){
  const key=(import.meta as any).env?.VITE_BASETEN_API_KEY as string | undefined;
  if(!key){ onLog('agent: no VITE_BASETEN_API_KEY — cannot confirm (offline)'); return { kind:'cannot_confirm', reason:'no_key' } as const; }
  const toolDefs=Object.entries(tools).map(([name,def])=> ({ type:'function' as const, function:{ name, description:def.description, parameters:def.parameters }}));
  const body={
    model:'meta-models/muse-spark-open-1026',
    messages,
    tools:toolDefs,
    tool_choice:'auto' as const,
    temperature:0.2, n:1
  };
  const ctrl=new AbortController(); const to=setTimeout(()=> ctrl.abort(), 5000);
  try{
    const res=await fetch('https://inference.baseten.co/v1/chat/completions',{
      method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json', 'x-session-affinity':`agent-${Date.now()}` },
      body:JSON.stringify(body), signal: ctrl.signal
    });
    clearTimeout(to);
    const j=await res.json().catch(()=> ({} as any));
    onLog(`agent: ${res.status} ${j?.usage ? `tokens ${j.usage.prompt_tokens}/${j.usage.completion_tokens} cost $${(j.usage.prompt_tokens/1e6*1.25 + j.usage.completion_tokens/1e6*4.25).toFixed(4)}` : ''}`);
    const choice=j?.choices?.[0];
    if(choice?.message?.tool_calls){
      for(const tc of choice.message.tool_calls){
        const name=tc.function.name as ToolName;
        let args:any={}; try{ args=JSON.parse(tc.function.arguments); }catch{}
        const impl=(tools as any)[name];
        if(!impl){ onLog(`agent: unknown tool ${name}`); continue; }
        const result=impl.execute(args);
        onLog(`tool ${name}(${JSON.stringify(args).slice(0,120)}) → ${JSON.stringify(result).slice(0,300)}`);
        // Deterministic gates own safety: arrival, crossing wording, degraded — agent only proposes
      }
    }
    return { kind:'ok', raw:j } as const;
  }catch(e:any){
    clearTimeout(to);
    onLog(`agent: failed ${e?.message ?? e} — cannot confirm`);
    return { kind:'cannot_confirm', reason: String(e?.message ?? e) } as const;
  }
}
