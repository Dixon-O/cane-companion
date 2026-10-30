// Simple Kondele demo graph — offices see data/annotations.geojson for hazard weights.
// In production this would be built from OSM Overpass extract (data/osm-kondele.json).
// Nodes are lat/lon, edges carry metadata for cost calculation (Section 8).

export type NodeId = string;
export type EdgeMeta = { crossings:number; hazard:number; surface:'paved'|'unpaved'|'unknown'; landmarkBonus:number; turnsFromPrev:number };
export type Edge = { id:string; from:NodeId; to:NodeId; distM:number; meta:EdgeMeta };
export type Node = { id:NodeId; lat:number; lon:number; name?:string };

export const NODES: Node[] = [
  { id:'A', lat:-0.0919, lon:34.7675, name:'Kondele west' },
  { id:'B', lat:-0.0916, lon:34.7680, name:'Kondele market (shop red sign)' },
  { id:'C', lat:-0.0913, lon:34.7685, name:'Kondele east' },
  { id:'D', lat:-0.0914, lon:34.7678, name:'North spur (open drain)' },
  { id:'E', lat:-0.0918, lon:34.7683, name:'South link (missing pavement)' },
];

function hav(a:Node,b:Node){
  const R=6371000, toRad=(d:number)=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLon=toRad(b.lon-a.lon);
  const la=toRad(a.lat), lb=toRad(b.lat);
  const s=Math.sin(dLat/2)**2 + Math.cos(la)*Math.cos(lb)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

function edge(a:NodeId,b:NodeId, meta:Partial<EdgeMeta>):Edge{
  const na=NODES.find(n=>n.id===a)!, nb=NODES.find(n=>n.id===b)!;
  const d=Math.round(hav(na,nb));
  return { id:`${a}-${b}`, from:a, to:b, distM:d, meta:{
    crossings: meta.crossings ?? 0,
    hazard: meta.hazard ?? 0,
    surface: meta.surface ?? 'paved',
    landmarkBonus: meta.landmarkBonus ?? 0,
    turnsFromPrev: meta.turnsFromPrev ?? 0,
  }};
}

// Undirected edges: add both directions
const RAW: Edge[] = [
  edge('A','B', { crossings:0, hazard:0, surface:'paved', landmarkBonus:1 }), // landmark-rich
  edge('B','C', { crossings:1, hazard:0, surface:'paved' }),
  edge('A','D', { crossings:0, hazard:1, surface:'unpaved' }), // open drain
  edge('D','C', { crossings:0, hazard:1, surface:'unpaved' }),
  edge('B','E', { crossings:0, hazard:1, surface:'unknown' }),
  edge('E','C', { crossings:0, hazard:0, surface:'paved' }),
];

export const EDGES: Edge[] = [...RAW, ...RAW.map(e=> ({...e, id:e.id+'_rev', from:e.to, to:e.from}))];

export type CostWeights = { cross:number; hazard:number; unknown:number; turn:number; landmark:number };
export const DEFAULT_WEIGHTS: CostWeights = { cross:80, hazard:120, unknown:40, turn:25, landmark:30 };

export function edgeCost(e:Edge, w=DEFAULT_WEIGHTS){
  return e.distM
    + e.meta.crossings * w.cross
    + e.meta.hazard * w.hazard
    + (e.meta.surface==='unknown' ? w.unknown : 0)
    + e.meta.turnsFromPrev * w.turn
    - e.meta.landmarkBonus * w.landmark;
}

export function dijkstra(from:NodeId, to:NodeId, w=DEFAULT_WEIGHTS){
  const dist=new Map<NodeId, number>(), prev=new Map<NodeId, Edge | null>(), vis=new Set<NodeId>();
  for(const n of NODES) dist.set(n.id, Infinity);
  dist.set(from, 0); prev.set(from, null);
  while(vis.size < NODES.length){
    let u: NodeId | null = null, best=Infinity;
    for(const [k,v] of dist) if(!vis.has(k) && v < best){ best=v; u=k; }
    if(u===null || u===to) break;
    vis.add(u);
    for(const e of EDGES.filter(e=>e.from===u)){
      const alt = (dist.get(u) ?? Infinity) + edgeCost(e,w);
      if(alt < (dist.get(e.to) ?? Infinity)){ dist.set(e.to, alt); prev.set(e.to, e); }
    }
  }
  if((dist.get(to) ?? Infinity)===Infinity) return null;
  const path: Edge[] = [];
  let cur=to;
  while(cur!==from){
    const e = prev.get(cur); if(!e) break; path.unshift(e); cur=e.from;
  }
  const cost = dist.get(to) ?? 0;
  const totalDist = path.reduce((a,e)=>a+e.distM,0);
  // reasons: prefer fewest crossings/hazards etc.
  const reasons: string[] = [];
  if(path.every(e=>e.meta.crossings===0)) reasons.push('no crossings');
  else reasons.push(`${path.reduce((a,e)=>a+e.meta.crossings,0)} crossing(s)`);
  if(path.every(e=>e.meta.hazard===0)) reasons.push('no open drains');
  else reasons.push('avoids open drain');
  if(path.some(e=>e.meta.landmarkBonus>0)) reasons.push('landmark-rich');
  return { edges:path, cost, totalDistM: totalDist, reasons: reasons.slice(0,3) };
}
