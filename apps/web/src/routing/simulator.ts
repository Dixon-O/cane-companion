import { NODES, type Edge } from './graph';

function lerp(a:number,b:number,t:number){ return a + (b-a)*t; }

// Replays a route as GPS points at ~1 m/s walking speed.
export function* simulateWalk(edges: Edge[], opts:{ stepM?:number; jitterM?:number }={}){
  const stepM = opts.stepM ?? 1.2;
  const jitterM = opts.jitterM ?? 2;
  for(const e of edges){
    const from=NODES.find(n=>n.id===e.from)!, to=NODES.find(n=>n.id===e.to)!;
    const dist = hav(from.lat,from.lon,to.lat,to.lon);
    const steps = Math.max(1, Math.ceil(dist/stepM));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const lat=lerp(from.lat,to.lat,t) + (Math.random()-0.5)*jitterM*0.000009;
      const lon=lerp(from.lon,to.lon,t) + (Math.random()-0.5)*jitterM*0.000009;
      const heading = bearing(from.lat,from.lon,to.lat,to.lon);
      yield { lat, lon, heading, edgeId:e.id, t };
    }
  }
}
function hav(lat1:number,lon1:number,lat2:number,lon2:number){
  const R=6371000, toRad=(d:number)=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function bearing(lat1:number,lon1:number,lat2:number,lon2:number){
  const toRad=(d:number)=>d*Math.PI/180, toDeg=(r:number)=>r*180/Math.PI;
  const dLon=toRad(lon2-lon1);
  const y=Math.sin(dLon)*Math.cos(toRad(lat2)); const x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(dLon);
  return (toDeg(Math.atan2(y,x))+360)%360;
}
