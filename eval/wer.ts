import fs from 'fs';

type Phrase = { id:string; text:string; lang:string; audio:string|null };
type Dataset = { phrases: Phrase[]; gate:{threshold:number} };

function levenshtein(a:string,b:string){
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]= a[i-1]===b[j-1]? dp[i-1][j-1] : Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+1);
  return dp[m][n];
}
function wer(ref:string, hyp:string){
  const r=ref.trim().toLowerCase().split(/\s+/), h=hyp.trim().toLowerCase().split(/\s+/);
  if(r.length===0) return h.length===0?0:1;
  // word-level Levenshtein
  const m=r.length,n=h.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]= r[i-1]===h[j-1]? dp[i-1][j-1] : Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+1);
  return dp[m][n]/m;
}

export function runWer(datasetPath='./data/wer-dataset.json', transcripts?: Record<string,string>){
  const raw=fs.readFileSync(datasetPath,'utf8');
  const ds:Dataset=JSON.parse(raw);
  // If no real transcripts yet, report pending
  if(!transcripts){
    const pending=ds.phrases.filter(p=> !p.audio).length;
    return {
      pending: true,
      total: ds.phrases.length,
      pendingCount: pending,
      message: `${pending}/${ds.phrases.length} phrases still need audio (record 50+ phrases, 3+ speakers, English/Swahili/code-mixed per Section 4). Run with transcripts map to compute WER. Gate threshold ${ds.gate.threshold*100}%.`,
      wer: null as number | null
    };
  }
  let sum=0, n=0;
  const details: {id:string; ref:string; hyp:string; wer:number}[]=[];
  for(const p of ds.phrases){
    const hyp=transcripts[p.id] ?? '';
    const w=wer(p.text, hyp);
    details.push({ id:p.id, ref:p.text, hyp, wer:w });
    sum+=w; n++;
  }
  const avg=n? sum/n : 0;
  const gatePass= avg <= ds.gate.threshold;
  return { pending:false, total:n, pendingCount:0, wer:avg, gatePass, details, threshold: ds.gate.threshold };
}

if(process.argv[1]?.endsWith('wer.ts')){
  const r=runWer();
  console.log(r.message ?? `WER ${(r.wer!*100).toFixed(1)}% threshold ${(r.threshold!*100).toFixed(0)}% ${r.gatePass?'PASS':'FAIL'}`);
  // write stub results
  fs.mkdirSync('./eval/results',{recursive:true});
  fs.writeFileSync('./eval/results/wer.json', JSON.stringify(r,null,2));
  console.log('wrote eval/results/wer.json');
}
