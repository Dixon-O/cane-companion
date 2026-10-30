export type Transcript = { text:string; confidence:number; source:'baseten'|'local' };

function blobToDataURL(blob:Blob): Promise<string>{
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=> res(r.result as string);
    r.onerror=rej;
    r.readAsDataURL(blob);
  });
}

// Records via MediaRecorder; returns base64 data URL (audio/webm or wav)
export function createRecorder(onState:(s:string)=>void){
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let stream: MediaStream | null = null;

  async function start(){
    stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    chunks=[];
    rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
    rec.ondataavailable = e=> { if(e.data.size>0) chunks.push(e.data); };
    rec.start();
    onState('recording — hold…');
    return rec;
  }
  async function stop(): Promise<{ blob:Blob; dataURL:string }>{
    if(!rec) throw new Error('not recording');
    await new Promise<void>(res=>{ rec!.onstop=()=> res(); rec!.stop(); });
    stream?.getTracks().forEach(t=>t.stop());
    const blob = new Blob(chunks, { type: rec.mimeType });
    const dataURL = await blobToDataURL(blob);
    onState(`captured ${(blob.size/1024).toFixed(1)} KB ${rec.mimeType}`);
    rec=null; stream=null;
    return { blob, dataURL };
  }
  function isRecording(){ return !!rec && rec.state==='recording'; }
  return { start, stop, isRecording };
}

// Minimal Baseten audio transcription via Chat Completions audio_url.
// Falls back to returning raw query as local transcript if no key / offline.
export async function transcribeAudio(dataURL:string, onLog:(s:string)=>void): Promise<Transcript>{
  // Try to read key from Vite env (VITE_BASETEN_API_KEY) if you set it for local demo.
  // In production, proxy via services/api to keep key server-side.
  const key = (import.meta as any).env?.VITE_BASETEN_API_KEY as string | undefined;
  if(!key){
    onLog('transcribe: no VITE_BASETEN_API_KEY — using local fallback (type to simulate)');
    return { text:'', confidence:0, source:'local' };
  }
  const MODEL='meta-models/muse-spark-open-1026';
  const t0=Date.now();
  const res = await fetch('https://inference.baseten.co/v1/chat/completions',{
    method:'POST',
    headers:{ 'Authorization':`Bearer ${key}`, 'Content-Type':'application/json', 'x-session-affinity':`voice-${Date.now()}` },
    body: JSON.stringify({
      model: MODEL,
      messages:[{ role:'user', content:[
        { type:'text', text:'Transcribe the spoken destination in this audio. Return only the transcript text, no explanation. If Swahili or code-mixed, keep it as heard.'},
        { type:'audio_url', audio_url:{ url:dataURL }}
      ]}],
      temperature:0.2, n:1
    })
  });
  const t1=Date.now();
  const j = await res.json().catch(()=> ({} as any));
  onLog(`transcribe: ${res.status} ${t1-t0}ms usage ${j?.usage ? `${j.usage.prompt_tokens}/${j.usage.completion_tokens}` : 'n/a'}`);
  const text = j?.choices?.[0]?.message?.content?.trim() ?? '';
  return { text, confidence: res.ok ? 0.85 : 0, source:'baseten' };
}
