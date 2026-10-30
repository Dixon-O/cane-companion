import { z } from 'zod';

export const signReadingSchema = z.object({
  visible_text: z.array(z.string()),
  best_match_alias: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  position_in_frame: z.enum(['left','center','right','unknown']),
  frame_quality: z.enum(['good','poor'])
});
export type SignReading = z.infer<typeof signReadingSchema>;

// Deterministic arrival: GPS within radius AND fuzzy text agrees in ≥2 of 3 frames.
// Caller captures 1–3 frames (longest side ≤768, JPEG q~70) and calls this.
export function decideArrival(readings: SignReading[], gpsDistM:number, radiusM:number, destAliases:string[]){
  const norm = (s:string)=> s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliasSet = new Set(destAliases.map(norm));
  let matches=0;
  for(const r of readings){
    const texts = r.visible_text.map((t:string)=> norm(t));
    const hit = texts.some(t=> aliasSet.has(t) || [...aliasSet].some(a=> t.includes(a) || a.includes(t) || lev(t,a)<=2));
    if(hit && r.confidence>=0.55) matches++;
    else if(r.best_match_alias && aliasSet.has(norm(r.best_match_alias)) && r.confidence>=0.55) matches++;
  }
  const gpsOk = gpsDistM <= radiusM;
  const arrived = gpsOk && matches >= 2 && readings.length >= 2;
  return { arrived, gpsOk, matches, need:2, frames: readings.length };
}
function lev(a:string,b:string){
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]= a[i-1]===b[j-1]? dp[i-1][j-1] : Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+1);
  return dp[m][n];
}

// Helper to capture and downscale video frame to ≤768 longest side, JPEG q70 data URL
export async function captureFrame(video:HTMLVideoElement): Promise<string>{
  const canvas=document.createElement('canvas');
  const vw=video.videoWidth, vh=video.videoHeight;
  if(!vw || !vh) throw new Error('video not ready');
  const max=768;
  let w=vw, h=vh;
  if(Math.max(w,h)>max){ if(w>h){ h=Math.round(h*max/w); w=max; } else { w=Math.round(w*max/h); h=max; } }
  canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d')!;
  ctx.drawImage(video,0,0,w,h);
  return canvas.toDataURL('image/jpeg',0.70);
}

// Call Baseten for one frame — returns SignReading via tool or JSON prompt. Fallback to cannot-confirm on 5s timeout.
export async function readSign(dataURL:string, destAliases:string[], onLog:(s:string)=>void): Promise<SignReading | null>{
  const key=(import.meta as any).env?.VITE_BASETEN_API_KEY as string | undefined;
  if(!key){ onLog('sign: no VITE_BASETEN_API_KEY — cannot confirm'); return null; }
  const ctrl=new AbortController(); const to=setTimeout(()=> ctrl.abort(), 5000);
  try{
    const res=await fetch('https://inference.baseten.co/v1/chat/completions',{
      method:'POST',
      headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json', 'x-session-affinity':`arrival-${Date.now()}` },
      signal: ctrl.signal,
      body: JSON.stringify({
        model:'meta-models/muse-spark-open-1026',
        messages:[{ role:'user', content:[
          { type:'text', text:`Read storefront signs. Return JSON with visible_text (string array), best_match_alias (string or null matching one of [${destAliases.join(', ')}]), confidence 0-1, position_in_frame left/center/right/unknown, frame_quality good/poor. Only JSON, no prose.`},
          { type:'image_url', image_url:{ url:dataURL }}
        ]}],
        temperature:0.1, n:1
      })
    });
    clearTimeout(to);
    const j=await res.json();
    const content=j?.choices?.[0]?.message?.content ?? '';
    // Extract JSON block
    const m=content.match(/\{[\s\S]*\}/);
    if(!m) { onLog(`sign: no JSON in response ${content.slice(0,120)}`); return null; }
    const parsed=JSON.parse(m[0]);
    const validated=signReadingSchema.parse(parsed);
    onLog(`sign: ${validated.visible_text.join('|')} → ${validated.best_match_alias} ${validated.confidence}`);
    return validated;
  }catch(e:any){
    clearTimeout(to);
    onLog(`sign: failed ${e?.message ?? e} — cannot confirm`);
    return null;
  }
}
