import fs from 'fs';
const env = fs.readFileSync('./source/repos/cane-companion/.env','utf8');
const m = env.match(/BASETEN_API_KEY=([^\r\n]+)/);
let key = m ? m[1].trim().replace(/^Bearer\s+/,'') : '';
key = key.replace(/^["']+|["']+$/g, '');
if(!key){ console.error('no key'); process.exit(1); }
const BASE_URL = 'https://inference.baseten.co/v1';
const MODEL = 'meta-models/muse-spark-open-1026';

async function callChat(body){
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'x-session-affinity': `smoke-${Date.now()}`
    },
    body: JSON.stringify(body)
  });
  const t1 = Date.now();
  const latency = t1 - t0;
  const headers = Object.fromEntries(res.headers.entries());
  const text = await res.text();
  let json;
  try{ json = JSON.parse(text);} catch{ json = { raw:text } }
  return { status: res.status, latency, headers, json, text };
}

function logResult(name, r){
  console.log(`\n=== ${name} ===`);
  console.log(`status ${r.status} latency ${r.latency}ms`);
  if(r.json?.usage){
    const u=r.json.usage;
    const cost = (u.prompt_tokens||0)/1e6*1.25 + (u.completion_tokens||0)/1e6*4.25;
    const cached = u.prompt_tokens_details?.cached_tokens ?? 0;
    console.log(`usage prompt=${u.prompt_tokens} completion=${u.completion_tokens} cached=${cached} estCost=$${cost.toFixed(4)}`);
  }
  if(r.json?.choices) console.log('choices len', r.json.choices.length, 'finish', r.json.choices[0]?.finish_reason);
  if(r.json?.error) console.log('error', JSON.stringify(r.json.error).slice(0,800));
  console.log(JSON.stringify(r.json).slice(0,1200));
  console.log('rate headers', ['x-ratelimit-remaining','x-ratelimit-limit','x-ratelimit-reset','retry-after'].map(k=>`${k}:${r.headers[k]||'-'}`).join(' '));
}

// tiny 1x1 white JPEG base64 (~600 bytes)
const tinyJpegB64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMSEhUSEhIVFRUVFRUVFRUVFRUVFRUVFRUVFRUWFhUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIABQAFAMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAAEBQIDBgABB//EADEQAAIBAwMCBAMFBQkFAQAAAAECAwAEEQUSITFBBhMiUWEyYXGBkaEHIzKx0RQjQlJicpLh8RUzYnKCksIkQ3Oy0yRDU2OC0v/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD7AOOzKkIoQhCECEAhCEIQhCECEAhCEIQhCEIQgAIOAMwAAAAGABgAAMAAAAAwAqCQgCEIQCECEIQCEIQhCAIIQhCECEAhCEIQCEIQCECEAhCEAhCECEAhCEIQhCEIS5+1f1qD/2Q==';
// minimal silent WAV 0.1s 8kHz mono 16bit (approx)
function silentWavBase64(){
  const sr=8000, dur=0.5, samples=Math.floor(sr*dur);
  const buf=Buffer.alloc(44+samples*2);
  buf.write('RIFF',0); buf.writeUInt32LE(36+samples*2,4); buf.write('WAVE',8);
  buf.write('fmt ',12); buf.writeUInt32LE(16,16); buf.writeUInt16LE(1,20); buf.writeUInt16LE(1,22);
  buf.writeUInt32LE(sr,24); buf.writeUInt32LE(sr*2,28); buf.writeUInt16LE(2,32); buf.writeUInt16LE(16,34);
  buf.write('data',36); buf.writeUInt32LE(samples*2,40);
  // silence already zero
  return buf.toString('base64');
}
const wavB64 = silentWavBase64();

async function main(){
  // smoke 1: text
  const r1 = await callChat({
    model: MODEL,
    messages:[{role:'user', content:'Say hello in 5 words.'}],
    temperature:0.2,
    n:1
  });
  logResult('1 text', r1);

  // smoke 2: one base64 frame -> visible text
  const r2 = await callChat({
    model: MODEL,
    messages:[{role:'user', content:[
      {type:'text', text:'Read visible storefront signs in this image. Return visible_text array, best_match_alias or null, confidence 0-1, position_in_frame, frame_quality.'},
      {type:'image_url', image_url:{url:`data:image/jpeg;base64,${tinyJpegB64}`}}
    ]}],
    temperature:0.2,
    n:1
  });
  logResult('2 image base64', r2);

  // smoke 3: tool call resolve_place
  const r3 = await callChat({
    model: MODEL,
    messages:[{role:'user', content:'Destination is Nai near Kondele market'}],
    tools:[{type:'function', function:{name:'resolve_place', description:'Resolve spoken destination to gazetteer entry', parameters:{type:'object', properties:{query:{type:'string'}, candidate_alias:{type:'string'}, confidence:{type:'number'}}, required:['query']}}}],
    tool_choice:'auto',
    temperature:0.2,
    n:1
  });
  logResult('3 tool resolve_place', r3);

  // smoke 4: audio_url silent wav
  const r4 = await callChat({
    model: MODEL,
    messages:[{role:'user', content:[
      {type:'text', text:'Transcribe the audio: what destination was spoken?'},
      {type:'audio_url', audio_url:{url:`data:audio/wav;base64,${wavB64}`}}
    ]}],
    temperature:0.2,
    n:1
  });
  logResult('4 audio_url silent wav', r4);

  // smoke 5: latency sample - repeat text 3 times for p50/p95
  const lat=[];
  for(let i=0;i<3;i++){
    const r=await callChat({model:MODEL, messages:[{role:'user',content:`Latency probe ${i+1}`}], temperature:0.2, n:1});
    lat.push(r.latency);
    console.log(`probe ${i+1} ${r.latency}ms status ${r.status}`);
  }
  lat.sort((a,b)=>a-b);
  const p50=lat[Math.floor(lat.length/2)], p95=lat[lat.length-1];
  console.log(`\n=== 5 latency summary === p50 ${p50}ms p95 ${p95}ms samples ${lat.join(',')}`);

  // rate limits check
  try{
    const rr=await fetch(`https://api.baseten.co/v1/model_apis/${encodeURIComponent(MODEL)}`, {headers:{Authorization:`Bearer ${key}`}});
    console.log(`\n=== rate limits GET === status ${rr.status}`);
    console.log(await rr.text().then(t=>t.slice(0,2000)));
  }catch(e){ console.log('rate limit check failed',e.message)}
}
main().catch(e=>{console.error(e); process.exit(1)});
