export type CueKind = 'approaching-vehicle'|'head-height'|'person-ahead'|'turn-left'|'turn-right'|'degraded'|'arrival';

type Item = { kind:CueKind; priority:number; at:number; side?:'left'|'right' };

const PRIORITY: Record<CueKind, number> = {
  'approaching-vehicle': 0,
  'head-height': 1,
  'person-ahead': 2,
  'turn-left': 3,
  'turn-right': 3,
  'degraded': 4,
  'arrival': 5,
};

export class CueEngine{
  private ctx: AudioContext | null = null;
  private queue: Item[] = [];
  private lastAt = 0;
  private lastKind: CueKind | null = null;
  private perMin = 6;
  private times: number[] = []; // cue timestamps for budget

  constructor(private onHud:(t:string)=>void, private getCueCtx:()=>AudioContext){}

  setBudget(n:number){ this.perMin = n; }

  private canEmit(now:number){
    this.times = this.times.filter(t=> now - t < 60000);
    return this.times.length < this.perMin;
  }
  private shouldDebounce(kind:CueKind, now:number){
    if(kind===this.lastKind && now - this.lastAt < 900) return true;
    return false;
  }

  enqueue(kind:CueKind, opts:{side?:'left'|'right'}={}){
    const now = Date.now();
    if(this.shouldDebounce(kind, now)) return false;
    if(!this.canEmit(now)) return false;
    this.queue.push({ kind, priority: PRIORITY[kind], at: now, side: opts.side });
    this.queue.sort((a,b)=> a.priority - b.priority || a.at - b.at);
    this.drain();
    return true;
  }

  private drain(){
    if(this.queue.length===0) return;
    const now = Date.now();
    if(now - this.lastAt < 280) { setTimeout(()=>this.drain(), 280 - (now - this.lastAt)); return; }
    const item = this.queue.shift()!;
    this.lastAt = Date.now();
    this.lastKind = item.kind;
    this.times.push(this.lastAt);
    this.play(item);
  }

  private play(item:Item){
    const ctx = this.getCueCtx();
    if(ctx.state==='suspended') ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type='sine';
    const pan = item.side==='left' ? -0.7 : item.side==='right' ? 0.7 : 0;
    p.pan.value = pan;
    let f = 800, dur = 0.22;
    switch(item.kind){
      case 'approaching-vehicle': f=140; dur=0.28; o.type='square'; break;
      case 'head-height': f=1400; dur=0.18; break;
      case 'person-ahead': f=600; dur=0.12; break;
      case 'turn-left': f=700; p.pan.value=-0.8; break;
      case 'turn-right': f=700; p.pan.value=0.8; break;
      case 'degraded': f=320; dur=0.35; break;
      case 'arrival': f=880; dur=0.45; break;
    }
    o.frequency.value = f;
    g.gain.value=0.0001;
    o.connect(p).connect(g).connect(ctx.destination);
    const t=ctx.currentTime;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.22,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.01,t+dur);
    o.start(t); o.stop(t+dur);
    if(item.kind==='head-height'){
      // double chirp
      setTimeout(()=>{ try{ const o2=ctx.createOscillator(), g2=ctx.createGain(); o2.frequency.value=1400; o2.connect(g2).connect(ctx.destination); const tt=ctx.currentTime; g2.gain.setValueAtTime(0.0001,tt); g2.gain.linearRampToValueAtTime(0.18,tt+0.02); g2.gain.exponentialRampToValueAtTime(0.01,tt+0.16); o2.start(tt); o2.stop(tt+0.18);}catch{} }, 170);
    }
    this.onHud(`${item.kind}${item.side?` ${item.side}`:''}`);
    try{ if('vibrate' in navigator){ const pat = item.kind==='approaching-vehicle' ? [80,40,80] : item.kind==='head-height' ? [30,30,30] : [30]; (navigator as any).vibrate(pat); } }catch{}
  }
}
