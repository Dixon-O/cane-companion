export type Quality = 'good'|'poor'|'degraded';
export type QualityState = { quality: Quality; reason?: 'dark'|'glare'|'blur'|'occlusion'; brightness:number; blur:number };

const DARK_T=35, GLARE_T=220, BLUR_T=80, OCCLUSION_DARK_RATIO=0.72;
const HYSTERESIS_N=3; // need N consecutive poor to enter degraded
const ANNOUNCE_COOLDOWN_MS=30000;

let poorStreak=0, goodStreak=0, degraded=false, lastAnnounce=0;

function varianceOfLaplacian(gray: Uint8Array, w:number, h:number){
  // Approx LoG variance: simplified Laplacian kernel
  let sum=0, sumSq=0, n=0;
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    const i=y*w+x;
    const v = -4*gray[i] + gray[i-1] + gray[i+1] + gray[i-w] + gray[i+w];
    sum+=v; sumSq+=v*v; n++;
  }
  const mean=sum/n, vari=sumSq/n - mean*mean;
  return vari;
}

function toGray(data: Uint8ClampedArray, w:number, h:number){
  const out=new Uint8Array(w*h);
  for(let i=0, j=0;i<data.length;i+=4, j++) out[j]= (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114);
  return out;
}

export function assessFrame(canvas:HTMLCanvasElement): QualityState{
  const w=64, h=48; // downscale for cheap compute
  const tmp=document.createElement('canvas');
  tmp.width=w; tmp.height=h;
  const ctx=tmp.getContext('2d')!;
  ctx.drawImage(canvas,0,0,w,h);
  const img=ctx.getImageData(0,0,w,h);
  const gray=toGray(img.data,w,h);
  let bright=0; for(let i=0;i<gray.length;i++) bright+=gray[i];
  bright/=gray.length;
  const blur=varianceOfLaplacian(gray,w,h);
  const darkRatio = gray.filter(v=> v<20).length / gray.length;

  let quality:Quality='good', reason:QualityState['reason']=undefined;
  if(darkRatio > OCCLUSION_DARK_RATIO){ quality='poor'; reason='occlusion'; }
  else if(bright < DARK_T){ quality='poor'; reason='dark'; }
  else if(bright > GLARE_T){ quality='poor'; reason='glare'; }
  else if(blur < BLUR_T){ quality='poor'; reason='blur'; }

  // Hysteresis: require streaks
  if(quality==='poor'){ poorStreak++; goodStreak=0; } else { goodStreak++; poorStreak=0; }
  if(!degraded && poorStreak >= HYSTERESIS_N) degraded=true;
  if(degraded && goodStreak >= HYSTERESIS_N) degraded=false;

  return { quality: degraded?'degraded':quality, reason, brightness:Math.round(bright), blur:Math.round(blur) };
}

export function shouldAnnounce(state:QualityState): boolean{
  if(state.quality!=='degraded') return false;
  const now=Date.now();
  if(now - lastAnnounce < ANNOUNCE_COOLDOWN_MS) return false;
  lastAnnounce=now;
  return true;
}

export function resetQuality(){
  poorStreak=0; goodStreak=0; degraded=false; lastAnnounce=0;
}
