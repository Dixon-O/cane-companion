import './style.css';

type Hud = { text: string; tone: 'idle'|'ok'|'warn'|'danger' };

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="shell">
    <div class="top">
      <div>
        <div class="brand">Cane Companion — chest harness preview</div>
        <div class="muted">Camera forward · open-ear audio · cane stays primary</div>
      </div>
      <div class="badge">Indie · Kondele</div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Camera — safety loop preview</h2>
        <div class="video"><video id="cam" autoplay playsinline muted></video></div>
        <div class="controls">
          <button id="startCam" class="btn primary">Start camera</button>
          <button id="stopCam" class="btn">Stop</button>
          <button id="ping" class="btn">Test cue</button>
          <span id="camStatus" class="status muted">Idle — allow camera on chest mount.</span>
        </div>
        <p class="muted">On-device hazard loop runs here (no network). Slow-loop model calls only at events: destination, route, arrival. Section 7: lower band = approaching, upper band = head-height.</p>
        <div id="hud" class="pill">HUD: idle</div>
      </div>

      <div class="card">
        <h2>Destination · Route</h2>
        <div class="row">
          <input id="dest" placeholder="Say: Kondele market" style="flex:1;min-width:160px;padding:10px;border:1px solid #e2e8f0;border-radius:10px" />
          <button id="resolve" class="btn">Resolve</button>
        </div>
        <p class="muted">Fuzzy match against <span class="kbd">data/gazetteer.json</span> (Kisumu, Kondele, Nai, Bondo) then read-back before start. Future cheap device: same engine with ultrasonic + lidar + camera.</p>
        <div id="route" class="log">No route yet.</div>

        <h2 style="margin-top:14px">GPS · Guidance</h2>
        <div class="row">
          <button id="gps" class="btn">Start GPS</button>
          <button id="stopGps" class="btn">Stop</button>
          <span id="gpsStatus" class="status muted">GPS idle</span>
        </div>
        <div id="gpsLog" class="log">Waiting for position…</div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <h2>Slow-loop log (Baseten)</h2>
      <div id="slowLog" class="log">No calls yet. Model: meta-models/muse-spark-open-1026 via https://inference.baseten.co/v1 — frames ≤768px, 1–3 per call, 5 s timeout.</div>
      <div class="row" style="margin-top:8px">
        <span class="pill">Hazards: on-device</span>
        <span class="pill">Cues: ≤6/min</span>
        <span class="pill">Crossing: "Road crossing ahead."</span>
      </div>
    </div>

    <p class="muted" style="margin-top:10px">Build: 2510DRA23E · Android 16 · Chrome PWA. Workbox caches route/gazetteer/models; network loss never disables hazard warnings.</p>
  </div>
`;

const video = document.getElementById('cam') as HTMLVideoElement;
const camStatus = document.getElementById('camStatus')!;
const hud = document.getElementById('hud')!;
const slowLog = document.getElementById('slowLog')!;
let stream: MediaStream | null = null;
let cueCtx: AudioContext | null = null;
let gpsWatch: number | null = null;

function setHud(h: Hud){
  hud.textContent = `HUD: ${h.text}`;
  hud.style.borderColor = h.tone==='danger' ? '#be123c' : h.tone==='warn' ? '#b45309' : h.tone==='ok' ? '#0f766e' : '#e2e8f0';
}

async function startCam(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }, audio: false });
    video.srcObject = stream;
    camStatus.textContent = `Camera on — ${stream.getVideoTracks()[0]?.label ?? 'environment'}`;
    setHud({ text:'camera on · corridor ROI active (stub)', tone:'ok'});
    appendSlow(`camera: started ${new Date().toISOString()}`);
  }catch(e:any){
    camStatus.textContent = `Camera failed: ${e?.message ?? e}`;
    setHud({ text:'camera blocked — check permission', tone:'warn'});
  }
}
function stopCam(){
  stream?.getTracks().forEach(t=>t.stop());
  stream=null;
  video.srcObject=null;
  camStatus.textContent='Camera stopped';
  setHud({ text:'idle', tone:'idle'});
}

function ensureAudio(){
  if(!cueCtx) cueCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if(cueCtx.state==='suspended') cueCtx.resume();
  return cueCtx!;
}
function cue(kind:'tick'|'chirp'|'pulse'){
  const ctx = ensureAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const p = ctx.createStereoPanner();
  o.type = 'sine';
  o.frequency.value = kind==='chirp' ? 1200 : kind==='pulse' ? 180 : 800;
  p.pan.value = kind==='chirp' ? 0.6 : -0.2;
  g.gain.value = 0.0001;
  o.connect(p).connect(g).connect(ctx.destination);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.2, t+0.02);
  g.gain.exponentialRampToValueAtTime(0.01, t+0.22);
  o.start(t); o.stop(t+0.24);
  setHud({ text:`cue: ${kind}`, tone: kind==='chirp' ? 'warn' : 'ok'});
}

function appendSlow(s:string){
  slowLog.textContent = (slowLog.textContent?.startsWith('No calls') ? '' : slowLog.textContent + '\n') + s;
  slowLog.scrollTop = slowLog.scrollHeight;
}

document.getElementById('startCam')!.addEventListener('click', startCam);
document.getElementById('stopCam')!.addEventListener('click', stopCam);
document.getElementById('ping')!.addEventListener('click', ()=> cue('chirp'));

document.getElementById('resolve')!.addEventListener('click', async ()=>{
  const q = (document.getElementById('dest') as HTMLInputElement).value.trim();
  if(!q) return;
  const route = document.getElementById('route')!;
  route.textContent = `Resolving "${q}" against gazetteer… (Kisumu/Kondele/Nai/Bondo)\nWould call /resolve → read-back → confirm ndiyo/hapana — stub in this slice.`;
  appendSlow(`resolve stub: query="${q}" — would call Baseten tool resolve_place (see eval/smoke-baseten.mjs)`);
  cue('tick');
});

function startGps(){
  if(!('geolocation' in navigator)){ document.getElementById('gpsStatus')!.textContent='GPS not available'; return; }
  document.getElementById('gpsStatus')!.textContent='GPS watching…';
  gpsWatch = navigator.geolocation.watchPosition(pos=>{
    const { latitude, longitude, accuracy } = pos.coords;
    const log = document.getElementById('gpsLog')!;
    log.textContent = `lat ${latitude.toFixed(6)} lon ${longitude.toFixed(6)} ±${Math.round(accuracy)}m\nheading ${pos.coords.heading ?? '—'} speed ${pos.coords.speed ?? '—'}\nMap-match to Kondele route (stub) — replan prompt on off-route.`;
  }, err=>{
    document.getElementById('gpsStatus')!.textContent = `GPS error: ${err.message}`;
  }, { enableHighAccuracy:true, maximumAge:1000, timeout:5000 });
}
function stopGps(){
  if(gpsWatch!==null) navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch=null;
  document.getElementById('gpsStatus')!.textContent='GPS stopped';
}
document.getElementById('gps')!.addEventListener('click', startGps);
document.getElementById('stopGps')!.addEventListener('click', stopGps);

// Honest empty-state for screen wake lock
if('wakeLock' in navigator){
  // request on interaction to keep preview alive with screen on (requires power bank per Section 7)
}

setHud({ text:'ready — start camera on chest mount', tone:'idle'});
