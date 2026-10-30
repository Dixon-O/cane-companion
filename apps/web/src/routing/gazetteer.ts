import gaz from '../../../../data/gazetteer.json' with { type:'json' };

export type Place = typeof gaz.places[number];

function norm(s:string){ return s.toLowerCase().trim().replace(/\s+/g,' '); }
function tokens(s:string){ return norm(s).split(/[^a-z0-9]+/).filter(Boolean); }

// Simple Levenshtein for token fuzzy
function lev(a:string,b:string){
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]= a[i-1]===b[j-1] ? dp[i-1][j-1] : Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+1);
  return dp[m][n];
}
function tokenScore(qTok:string[], candTok:string[]){
  let s=0;
  for(const qt of qTok) {
    let best=1;
    for(const ct of candTok) {
      const d=lev(qt,ct), max=Math.max(qt.length,ct.length);
      const sim = max? 1 - d/max : 1;
      if(sim>best) best=sim;
    }
    // phonetic cheap: double-metaphone not bundled, use first 2 chars bonus
    if(qTok.some(t=> candTok.some(c=> c.startsWith(t.slice(0,2))))) best=Math.min(1, best+0.05);
    s+=best;
  }
  return qTok.length? s/qTok.length : 0;
}

export type ResolveResult = { place: Place; score:number; alias:string } | null;

export function resolvePlace(query:string): { result: ResolveResult; alternatives: {place:Place;score:number}[] }{
  const qTok = tokens(query);
  if(qTok.length===0) return { result:null, alternatives:[] };
  const scored = gaz.places.map(p=>{
    const candTok = [...p.aliases, ...p.names].flatMap(tokens);
    const score = tokenScore(qTok, candTok);
    return { place:p, score, alias: p.aliases[0] };
  }).sort((a,b)=> b.score - a.score);
  const top = scored[0];
  if(!top || top.score < 0.52) return { result:null, alternatives: scored.slice(0,2) };
  // tie: if second within 0.06, force disambiguation
  if(scored[1] && Math.abs(top.score - scored[1].score) < 0.06) return { result:null, alternatives: scored.slice(0,2) };
  return { result:{ place:top.place, score:top.score, alias:top.alias }, alternatives: scored.slice(1,2) };
}

export function places(): Place[]{ return gaz.places as Place[]; }
