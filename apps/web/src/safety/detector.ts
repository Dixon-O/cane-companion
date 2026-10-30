export type Position = 'left'|'center'|'right';
export type Detection = {
  label: string;
  score: number;
  bbox: { x:number; y:number; w:number; h:number }; // 0-1 normalized
  position: Position;
  proximity: 'close'|'mid'|'far';
  isApproaching: boolean;
};

// Walking corridor for chest mount ~1.2m height, slight downward tilt.
// ROI is central 60% width, vertical 25% to 95% — upper band is head-height (L2).
export const CORRIDOR = { x0:0.20, x1:0.80, y0:0.25, y1:0.95 };
const HEAD_BAND_Y0 = 0.25; // top of corridor, used by L2 later
const ALLOWED = new Set(['person','bicycle','motorcycle','car','bus','truck']);

function positionFromX(cx: number): Position{
  if(cx < 0.38) return 'left';
  if(cx > 0.62) return 'right';
  return 'center';
}
function proximityFromHeight(h: number){
  if(h > 0.45) return 'close' as const;
  if(h > 0.22) return 'mid' as const;
  return 'far' as const;
}
function overlapsCorridor(b:{x:number;y:number;w:number;h:number}){
  const ix0 = Math.max(b.x, CORRIDOR.x0), iy0 = Math.max(b.y, CORRIDOR.y0);
  const ix1 = Math.min(b.x+b.w, CORRIDOR.x1), iy1 = Math.min(b.y+b.h, CORRIDOR.y1);
  if(ix1<=ix0 || iy1<=iy0) return 0;
  const inter=(ix1-ix0)*(iy1-iy0), area=b.w*b.h;
  return area>0 ? inter/area : 0;
}

// Simple tracker to estimate growth (approaching) from box area.
type Track = { area:number; t:number };
const tracks = new Map<string, Track>();

function approachingKey(label: string, cx: number, cy: number){
  // coarse spatial key so same object maps to nearby cell
  return `${label}:${Math.round(cx*4)}:${Math.round(cy*4)}`;
}

export function filterAndEnrich(raw:{label:string;score:number;bbox:{x:number;y:number;w:number;h:number}}[], now:number): Detection[]{
  const out: Detection[] = [];
  for(const r of raw){
    if(!ALLOWED.has(r.label)) continue;
    if(r.score < 0.45) continue;
    const overlap = overlapsCorridor(r.bbox);
    if(overlap < 0.30) continue;
    const cx = r.bbox.x + r.bbox.w/2;
    const position = positionFromX(cx);
    const proximity = proximityFromHeight(r.bbox.h);
    const area = r.bbox.w * r.bbox.h;
    const key = approachingKey(r.label,cx, r.bbox.y + r.bbox.h/2);
    const prev = tracks.get(key);
    const isApproaching = !!prev && (area - prev.area) / Math.max(prev.area, 1e-6) > 0.12 && (now - prev.t) < 900;
    tracks.set(key, { area, t: now });
    out.push({ label:r.label, score:r.score, bbox:r.bbox, position, proximity, isApproaching });
  }
  // keep newest by score
  out.sort((a,b)=>b.score-a.score);
  // prune stale tracks
  for(const [k,v] of tracks) if(now - v.t > 2000) tracks.delete(k);
  return out.slice(0,4);
}

// MediaPipe Tasks Vision loader — WebGPU where available, WASM fallback.
// Model is EfficientDet-Lite0 via CDN; we do not bundle the .tflite (service worker will cache).
export type Detector = {
  ready: boolean;
  latencyMs: number[];
  detect(video: HTMLVideoElement): Promise<Detection[]>;
  dispose(): void;
};

let detectorInstance: any = null;
let fileset: any = null;

export async function createDetector(onLog:(s:string)=>void): Promise<Detector>{
  const lat: number[] = [];
  let ready = false;
  onLog('detector: loading @mediapipe/tasks-vision…');
  const vision = await import('@mediapipe/tasks-vision');
  const { FilesetResolver, ObjectDetector } = vision as any;

  const wasmBase = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
  fileset = await FilesetResolver.forVisionTasks(wasmBase);
  onLog('detector: fileset ready, loading EfficientDet-Lite0…');
  // 0.10.14 ships efficientdet_lite0.tflite via storage.googleapis — use explicit URL for determinism
  const modelUrl = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite';
  detectorInstance = await ObjectDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: modelUrl, delegate: (navigator as any).gpu ? 'GPU' : 'CPU' },
    scoreThreshold: 0.45,
    maxResults: 6,
    runningMode: 'VIDEO'
  });
  ready = true;
  onLog('detector: ready (delegate ' + (detectorInstance ? 'GPU/CPU' : 'CPU') + ')');

  return {
    get ready(){ return ready; },
    get latencyMs(){ return lat; },
    async detect(video: HTMLVideoElement){
      if(!detectorInstance || !ready) return [];
      const t0 = performance.now();
      const res = detectorInstance.detectForVideo(video, Date.now());
      const t1 = performance.now();
      lat.push(t1 - t0);
      if(lat.length>120) lat.shift();
      const raw = (res.detections||[]).flatMap((d:any)=> d.categories?.map((c:any)=> ({
        label: c.categoryName, score: c.score,
        bbox:{ x: d.boundingBox.originX / video.videoWidth, y: d.boundingBox.originY / video.videoHeight, w: d.boundingBox.width / video.videoWidth, h: d.boundingBox.height / video.videoHeight }
      })) || []);
      return filterAndEnrich(raw, t1);
    },
    dispose(){ try{ detectorInstance?.close(); }catch{} }
  };
}

export function latencyStats(lat:number[]){
  if(lat.length===0) return { p50:0, p95:0, mean:0 };
  const s=[...lat].sort((a,b)=>a-b);
  const p50=s[Math.floor(s.length/2)], p95=s[Math.floor(s.length*0.95)] ?? s[s.length-1];
  const mean=s.reduce((a,b)=>a+b,0)/s.length;
  return { p50:Math.round(p50), p95:Math.round(p95), mean:Math.round(mean), n:s.length };
}
