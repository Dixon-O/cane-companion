import type { Edge, Node } from './graph';
import { NODES } from './graph';

function hav(lat1:number, lon1:number, lat2:number, lon2:number){
  const R=6371000, toRad=(d:number)=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function bearing(lat1:number,lon1:number,lat2:number,lon2:number){
  const toRad=(d:number)=>d*Math.PI/180, toDeg=(r:number)=>r*180/Math.PI;
  const dLon=toRad(lon2-lon1);
  const y=Math.sin(dLon)*Math.cos(toRad(lat2));
  const x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(dLon);
  return (toDeg(Math.atan2(y,x))+360)%360;
}

export type GuidanceState = {
  edges: Edge[];
  idx: number; // current edge index
  offRoute: boolean;
  distToTurnM: number;
  bearingToNext: number;
};

export function snapToRoute(lat:number, lon:number, edges:Edge[]): { edgeIdx:number; distM:number }{
  let bestIdx=0, bestD=Infinity;
  for(let i=0;i<edges.length;i++){
    const e=edges[i];
    const nFrom=NODES.find(n=>n.id===e.from)!, nTo=NODES.find(n=>n.id===e.to)!;
    // distance to segment midpoint as cheap snap (good enough for demo; Section 8: nearest segment + heading continuity)
    const midLat=(nFrom.lat+nTo.lat)/2, midLon=(nFrom.lon+nTo.lon)/2;
    const d=hav(lat,lon,midLat,midLon);
    if(d<bestD){ bestD=d; bestIdx=i; }
  }
  return { edgeIdx:bestIdx, distM:bestD };
}

export function nextTurnInstruction(state:GuidanceState, heading:number|null){
  const e = state.edges[state.idx];
  if(!e) return null;
  const nFrom=NODES.find(n=>n.id===e.from)!, nTo=NODES.find(n=>n.id===e.to)!;
  const br=bearing(nFrom.lat,nFrom.lon,nTo.lat,nTo.lon);
  const turn = heading===null ? null : ((br - heading + 540)%360)-180; // -180..180
  if(turn!==null && Math.abs(turn) < 25) return { text:`Continue straight`, bearing:br };
  if(turn!==null && turn > 0) return { text:`Turn left at the ${e.meta.landmarkBonus? 'shop with red sign' : 'next point'}`, bearing:br };
  if(turn!==null && turn < 0) return { text:`Turn right`, bearing:br };
  return { text: `Head toward ${nTo.name ?? nTo.id}`, bearing:br };
}

export class GuidanceEngine{
  state: GuidanceState;
  constructor(public edges:Edge[]){
    this.state={ edges, idx:0, offRoute:false, distToTurnM: edges[0]?.distM ?? 0, bearingToNext:0 };
  }
  update(pos:{lat:number;lon:number;heading:number|null}, onMid:(s:string)=>void){
    const snap=snapToRoute(pos.lat,pos.lon,this.edges);
    const off = snap.distM > 25; // Section 8: replan prompt threshold (tunable)
    this.state.offRoute = off;
    if(off){ onMid(`Off route — ${Math.round(snap.distM)} m from path. Say "replan".`); return; }
    this.state.idx = snap.edgeIdx;
    const e=this.edges[this.state.idx];
    const nTo=NODES.find(n=>n.id===e.to)!;
    this.state.distToTurnM = hav(pos.lat,pos.lon,nTo.lat,nTo.lon);
    const instr = nextTurnInstruction(this.state, pos.heading);
    if(instr) onMid(`${instr.text} — ${Math.round(this.state.distToTurnM)} m`);
  }
}
