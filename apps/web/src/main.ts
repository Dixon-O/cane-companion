import './style.css';
import { createDetector, latencyStats, type Detection } from './safety/detector';
import { CueEngine } from './safety/cue';
import { resolvePlace } from './routing/gazetteer';
import { dijkstra, NODES } from './routing/graph';
import { GuidanceEngine } from './routing/guidance';
import { simulateWalk } from './routing/simulator';

type Hud = { text: string; tone: 'idle'|'ok'|'warn'|'danger' };

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="shell">
    <div class="top">
      <div>
        <div class="brand">Cane Companion — chest harness preview</div>
        <div class="muted">Camera forward · open-ear audio · cane stays primary</div>
      </div>
      <div class="badge">Indie · Kondele · L1</div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Camera — safety loop L1 (on-device)</h2>
        <div class="video" style="position:relative"><video id="cam" autoplay playsinline muted></video><canvas id="overlay" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
        <div class="controls">
          <button id="startCam" class="btn primary">Start camera</button>
          <button id="stopCam" class="btn">Stop</button>
          <button id="detToggle" class="btn">Load detector</button>
          <button id="ping" class="btn">Test cue</button>
          <span id="camStatus" class="status muted">Idle — allow camera on chest mount.</span>
        </div>
        <div class="row" style="margin-top:8px"><span id="lat" class="pill">lat p50 — p95 —</span><span id="fps" class="pill">fps —</span><span id="budget" class="pill">cues 0/6 per min</span></div>
        <p class="muted">L1: EfficientDet-Lite0 via MediaPipe (WebGPU → WASM). Corridor ROI central 60%, proximity from box height + growth, panned cues. No network in loop.</p>
        <div id="hud" class="pill">HUD: idle</div>
        <div id="detLog" class="log" style="margin-top:8px">Detector idle — tap Load detector, then Start camera on the 2510DRA23E.</div>
      </div>

      <div class="card">
        <h2>Destination · Route</h2>
        <div class="row">
          <input id="dest" placeholder="Say: Kondele market" style="flex:1;min-width:160px;padding:10px;border:1px solid #e2e8f0;border-radius:10px" />
          <button id="resolve" class="btn">Resolve</button>
          <button id="sim" class="btn">Simulate walk</button>
        </div>
        <p class="muted">Fuzzy (token + lev + phonetic) vs <span class="kbd">data/gazetteer.json</span> (Kisumu, Kondele, Nai, Bondo) → read-back <span class="kbd">ndiyo/hapana</span> → graph Dijkstra (cost = dist + crossings + hazard − landmark). Future cheap device: same engine with ultrasonic + lidar + camera.</p>
        <div id="route" class="log">No route yet. Try: "kondele", "kisumu", "nai", "bondo", "soko la kondele".</div>

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
const overlay = document.getElementById('overlay') as HTMLCanvasElement;
const camStatus = document.getElementById('camStatus')!;
const hud = document.getElementById('hud')!;
const slowLog = document.getElementById('slowLog')!;
const detLog = document.getElementById('detLog')!;
const latPill = document.getElementById('lat')!;
const fpsPill = document.getElementById('fps')!;
const budgetPill = document.getElementById('budget')!;
let stream: MediaStream | null = null;
let cueCtx: AudioContext | null = null;
let gpsWatch: number | null = null;
let detector: any = null;
let raf = 0;
let frames = 0, lastFpsAt = performance.now();

function setHud(h: Hud){
  hud.textContent = `HUD: ${h.text}`;
  hud.style.borderColor = h.tone==='danger' ? '#be123c' : h.tone==='warn' ? '#b45309' : h.tone==='ok' ? '#0f766e' : '#e2e8f0';
}

function ensureAudio(){
  if(!cueCtx) cueCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if(cueCtx.state==='suspended') cueCtx.resume();
  return cueCtx!;
}
const cueEngine = new CueEngine((t)=> setHud({ text:t, tone: t.includes('approaching')||t.includes('head')?'warn':'ok'}), ensureAudio);

function appendSlow(s:string){
  slowLog.textContent = (slowLog.textContent?.startsWith('No calls') ? '' : slowLog.textContent + '\n') + s;
  slowLog.scrollTop = slowLog.scrollHeight;
}
function appendDet(s:string){
  detLog.textContent = (detLog.textContent?.startsWith('Detector idle') ? '' : detLog.textContent + '\n') + s;
  detLog.scrollTop = detLog.scrollHeight;
}

async function startCam(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }, audio: false });
    video.srcObject = stream;
    await video.play();
    camStatus.textContent = `Camera on — ${stream.getVideoTracks()[0]?.label ?? 'environment'}`;
    setHud({ text:'camera on', tone:'ok'});
    appendSlow(`camera: started ${new Date().toISOString()}`);
    if(detector?.ready) loop();
  }catch(e:any){
    camStatus.textContent = `Camera failed: ${e?.message ?? e}`;
    setHud({ text:'camera blocked — check permission', tone:'warn'});
  }
}
function stopCam(){
  cancelAnimationFrame(raf);
  stream?.getTracks().forEach(t=>t.stop());
  stream=null;
  video.srcObject=null;
  camStatus.textContent='Camera stopped';
  setHud({ text:'idle', tone:'idle'});
}

function draw(dets: Detection[]){
  const c = overlay.getContext('2d')!;
  const w = overlay.width = video.videoWidth || 640;
  const h = overlay.height = video.videoHeight || 480;
  c.clearRect(0,0,w,h);
  // corridor
  c.strokeStyle='rgba(15,118,110,0.5)'; c.lineWidth=2; c.setLineDash([6,4]);
  c.strokeRect(w*0.20, h*0.25, w*0.60, h*0.70);
  c.setLineDash([]);
  for(const d of dets){
    const x=d.bbox.x*w, y=d.bbox.y*h, ww=d.bbox.w*w, hh=d.bbox.h*h;
    c.strokeStyle = d.proximity==='close' ? '#be123c' : d.proximity==='mid' ? '#b45309' : '#0f766e';
    c.lineWidth=2; c.strokeRect(x,y,ww,hh);
    c.fillStyle='rgba(0,0,0,0.6)'; c.fillRect(x, Math.max(0,y-16), 110, 14);
    c.fillStyle='#fff'; c.font='11px ui-monospace,monospace';
    c.fillText(`${d.label} ${d.proximity}${d.isApproaching?' ↗':''}`, x+2, y-4);
  }
}

async function loop(){
  if(!detector?.ready || !stream) return;
  const dets = await detector.detect(video);
  draw(dets);
  frames++;
  const now = performance.now();
  if(now - lastFpsAt > 1000){
    const fps = Math.round(frames*1000/(now-lastFpsAt));
    fpsPill.textContent = `fps ${fps}`;
    frames=0; lastFpsAt=now;
    const s = latencyStats(detector.latencyMs);
    latPill.textContent = `lat p50 ${s.p50} p95 ${s.p95} mean ${s.mean} n=${s.n}`;
    budgetPill.textContent = `cues budget ${cueEngine['times']?.length ?? 0}/6 per min`;
  }
  for(const d of dets){
    if(d.label==='person' && d.proximity!=='far') cueEngine.enqueue('person-ahead', { side:d.position });
    if(['car','bus','truck','motorcycle'].includes(d.label) && (d.proximity==='close' || d.isApproaching)) cueEngine.enqueue('approaching-vehicle', { side:d.position });
  }
  if(dets.length>0) appendDet(`${new Date().toISOString().slice(11,19)} ${(dets as Detection[]).map((d: Detection)=>`${d.label}:${d.position}:${d.proximity}${d.isApproaching?'↗':''}`).join(' | ')} | p50 ${latencyStats(detector.latencyMs).p50}ms`);
  raf = requestAnimationFrame(loop);
}

document.getElementById('startCam')!.addEventListener('click', startCam);
document.getElementById('stopCam')!.addEventListener('click', stopCam);
document.getElementById('ping')!.addEventListener('click', ()=> cueEngine.enqueue('head-height', {side:'right'}));
document.getElementById('detToggle')!.addEventListener('click', async ()=>{
  const btn = document.getElementById('detToggle') as HTMLButtonElement;
  if(detector?.ready){ appendDet('detector already ready'); if(stream) loop(); return; }
  btn.disabled=true; btn.textContent='Loading…';
  try{
    appendDet('loading detector… (first load ~8–12 MB, cached by SW)');
    detector = await createDetector(appendDet);
    btn.textContent='Detector ready';
    appendDet(`ready — delegate ${detector.ready?'ok':'unknown'} — start camera to benchmark on 2510DRA23E`);
    if(stream) loop();
  }catch(e:any){ btn.disabled=false; btn.textContent='Load detector'; appendDet(`load failed: ${e?.message ?? e}`); }
});

let currentEdges: any = null;
let guidance: any = null;
document.getElementById('resolve')!.addEventListener('click', async ()=>{
  const q = (document.getElementById('dest') as HTMLInputElement).value.trim();
  if(!q) return;
  const route = document.getElementById('route')!;
  const { result, alternatives } = resolvePlace(q);
  if(!result){
    const alts = alternatives.map(a=> `${a.place.names[0]} (${a.score.toFixed(2)})`).join(' or ');
    route.textContent = `No confident match for "${q}".` + (alts ? ` Did you mean: ${alts}?` : '') + `\nTry: kondele / kisumu / nai / bondo / soko la kondele`;
    appendSlow(`resolve miss: "${q}" alts=${alts}`);
    cueEngine.enqueue('head-height');
    return;
  }
  route.textContent = `Heard "${q}" → "${result.place.names[0]}" (score ${result.score.toFixed(2)}) alias "${result.alias}"\nRead-back: "Go to ${result.place.names[0]}?" — say ndiyo/hapana (yes/no).`;
  appendSlow(`resolve hit: "${q}" → ${result.place.id} score ${result.score.toFixed(2)} — would call Baseten resolve_place check`);
  // Map place to graph node for demo route (Kondele graph only — Nairobi/Bondo are alias-only per DECISIONS)
  const map: Record<string,string> = { 'kondele-market':'B', 'kisumu-main':'C' };
  const destNode = map[result.place.id];
  if(!destNode){
    route.textContent += `\nNo walking graph for ${result.place.names[0]} — not on Kondele demo route (alias test only). Add its entrance + OSM extract to extend.`;
    return;
  }
  const startNode = 'A'; // Kondele west — in production: nearest to GPS
  const res = dijkstra(startNode, destNode);
  if(!res){ route.textContent += `\nNo route from ${startNode} to ${destNode}`; return; }
  currentEdges = res.edges;
  guidance = new GuidanceEngine(currentEdges);
  route.textContent += `\nRoute ${startNode}→${destNode}: ${res.edges.map(e=>e.from+'-'+e.to).join(' → ')} — ${res.totalDistM} m — ${res.reasons.join(', ')} — cost ${Math.round(res.cost)}`;
  route.textContent += `\nTap Simulate walk to replay GPS trace through guidance (snap + turn cue).`;
  cueEngine.enqueue('person-ahead');
});
document.getElementById('sim')!.addEventListener('click', async ()=>{
  const route = document.getElementById('route')!;
  if(!currentEdges){ route.textContent = 'Resolve a Kondele destination first (kondele / kisumu).'; return; }
  route.textContent += `\nSimulating walk…`;
  const gpsLog = document.getElementById('gpsLog')!;
  let steps=0;
  for(const pt of simulateWalk(currentEdges, { stepM:2, jitterM:1.5 })){
    guidance.update({ lat:pt.lat, lon:pt.lon, heading:pt.heading }, (msg:string)=> gpsLog.textContent = msg + `\nlat ${pt.lat.toFixed(5)} lon ${pt.lon.toFixed(5)} edge ${pt.edgeId}`);
    // turn cue at start of each edge
    if(steps % 18 === 0){
      const last = currentEdges[Math.floor(steps/18)];
      if(last) cueEngine.enqueue(steps%36===0?'turn-left':'turn-right');
    }
    steps++;
    await new Promise(r=> setTimeout(r, 90));
    if(steps>120) break;
  }
  gpsLog.textContent += `\nSim done — ${steps} points. Arrival check: deterministic isArrived(GPS≤radius + 2/3 frames with text match) — see packages/shared.`;
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
