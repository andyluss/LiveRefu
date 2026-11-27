import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import init, { PreviewWorld } from "./pkg/world_wasm.js";

const TICK_US = 16666;
const canvas = document.getElementById("scene");
const ids = ["quest-title","quest-objectives","inventory","flags","toast","dialogue","dialogue-speaker","dialogue-text","loading","status-text","btn-pause","social-factions","social-relations","reputation","weather","weather-note","solar-kw","wind-kw","battery-kwh","water-m3","load-kw","solar-bar","wind-bar","battery-bar","water-bar"];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
let world, current, renderer, scene, camera, controls;
let paused = false, last = performance.now(), acc = 0, toastTimer = 0, dialogTimer = 0, auto = false;
let intro = 0, introDone = false;
const keys = new Set();
const views = new Map();
const turbines = [];
const panels = [];
const aiRings = [];
const waterMeshes = [];

const TICK_KEYS = new Set(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"]);
const COLORS = { player: 0x72e0b4, human: 0xe8b56c, ai: 0x69e4de, machine: 0x9fc8bc, item: 0xf3c969 };

function material(color, roughness = 0.55, metalness = 0.12, emissive = 0, intensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: intensity });
}
function box(name, w, h, d, x, y, z, mat, parent = scene, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.name = name; m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(name, r, h, x, y, z, mat, parent = scene, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function sphere(name, r, x, y, z, mat, parent = scene, seg = 18) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg / 2), mat);
  m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function textTexture(text, sub, options = {}) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const ctx = c.getContext("2d"); ctx.fillStyle = options.bg || "#0b241c"; ctx.fillRect(0,0,512,256);
  ctx.strokeStyle = options.line || "#4f8c6d"; ctx.lineWidth = 7; ctx.strokeRect(9,9,494,238);
  ctx.textAlign = "center"; ctx.fillStyle = options.ink || "#e9f8ea"; ctx.font = "700 46px -apple-system, 'PingFang SC', sans-serif"; ctx.fillText(text,256,112);
  if (sub) { ctx.fillStyle = options.accent || "#8ee6a8"; ctx.font = "500 20px Menlo, monospace"; ctx.fillText(sub,256,172); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function sign(text, sub, x, y, z, w, h, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({ map: textTexture(text,sub), transparent:true, side:THREE.DoubleSide }));
  m.position.set(x,y,z); m.rotation.y = Math.PI + ry; scene.add(m); return m;
}

function makePerson(color, hatColor, ai = false) {
  const g = new THREE.Group();
  const skin = material(0xc98f6d), cloth = material(color), pants = material(0x263d35), hat = material(hatColor);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25,0.7,4,10), cloth); torso.position.y=1.08; torso.castShadow=true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18,20,14), ai ? material(0x8ff4e5,0.3,0.2,0x5ee8d9,1.1) : skin); head.position.y=1.67; head.castShadow=true; g.add(head);
  if (!ai) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.22,20,10,0,Math.PI*2,0,Math.PI*0.55), hat); h.position.y=1.74; g.add(h); }
  for (const s of [-1,1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075,0.56,3,7), pants); leg.position.set(s*.12,.44,0); leg.castShadow=true; g.add(leg);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06,0.48,3,7), cloth); arm.position.set(s*.29,1.02,0); arm.rotation.z=s*.15; arm.castShadow=true; g.add(arm);
  }
  if (ai) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.38,.025,8,28), new THREE.MeshBasicMaterial({color:0x7ff5e8,transparent:true,opacity:.7}));
    ring.rotation.x=Math.PI/2; ring.position.y=1.55; g.add(ring); aiRings.push(ring);
  }
  return g;
}
function makeProp(kind) {
  const g = new THREE.Group();
  if (kind === "solar") {
    const panelMat = material(0x102f46,0.2,0.5,0x3c8bd6,0.2);
    for (let i=0;i<3;i++) { const p = box("panel",2.4,.08,1.2,-2.4+i*2.4,1.3,0,panelMat,g); p.rotation.x=-.32; panels.push(p); cyl("post",.06,1.2,-2.4+i*2.4,.6,0,material(0x8d9b8d),g,8); }
  } else if (kind === "wind") {
    cyl("mast",.1,4.4,0,2.2,0,material(0xd6e1d4,0.4,.3),g);
    const hub = new THREE.Group(); hub.position.y=4.4; g.add(hub);
    sphere("hub",.16,0,0,0,material(0xf3c969,0.3,.4),hub,10);
    for (let i=0;i<3;i++) { const b = box("blade",.07,1.8,.16,0,0,0,material(0xf0f5e8),hub,false); b.geometry.rotateZ(0); b.position.y=.9; b.rotation.z=i*Math.PI*2/3; }
    turbines.push(hub);
  } else if (kind === "battery") {
    box("battery",1.0,1.9,.7,0,.95,0,material(0x1b3b3a,0.4,.4),g);
    for (let i=0;i<3;i++) box("cell",.7,.1,.05,0,.4+i*.45,.37,material(0x64e5d2,0.2,.3,0x64e5d2,.5),g,false);
  } else if (kind === "irrigator") {
    cyl("base",.18,.6,0,.3,0,material(0x3f6358),g,10);
    const arm = box("arm",.14,1.8,1.1,0,1.25,.35,material(0xf0c96c,0.4,.3),g); arm.rotation.x=.6;
    for (let i=0;i<3;i++) sphere("drop",.05,.5,.9+i*.15,.85,material(0x65dce7,0.2,.1,0x65dce7,.8),g,8);
  } else {
    box("machine",1.0,1.2,1.0,0,.6,0,material(0x6a8e7a,0.5,.2),g);
  }
  return g;
}
function makeItem(kind) {
  const g = new THREE.Group();
  const color = kind === "seed" ? 0xa8e07a : kind === "cell" ? 0x69e4de : 0xf3c969;
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(.26,0), material(color,0.3,.2,color,.5)); m.position.y=.45; m.castShadow=true; g.add(m);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.35,.46,28), new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.5})); ring.rotation.x=-Math.PI/2; ring.position.y=.03; g.add(ring);
  return g;
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd6d4);
  scene.fog = new THREE.FogExp2(0xb4d9cf, 0.013);
  camera = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, .1, 160);
  camera.position.set(20,14,-19);
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  controls = new OrbitControls(camera, canvas);
  controls.target.set(0,1.2,4); controls.enableDamping = true; controls.dampingFactor=.05;
  controls.minDistance=5; controls.maxDistance=36; controls.maxPolarAngle=Math.PI*.49; controls.autoRotateSpeed=.35; controls.enabled=false;

  scene.add(new THREE.HemisphereLight(0xdfffe7,0x2b4b35,2.3));
  const sun = new THREE.DirectionalLight(0xffe0a4,3.0); sun.position.set(-10,18,-8); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-22; sun.shadow.camera.right=22; sun.shadow.camera.top=22; sun.shadow.camera.bottom=-22; scene.add(sun);
  const fill = new THREE.DirectionalLight(0x7fe8d5,1.2); fill.position.set(12,8,10); scene.add(fill);
  const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(1.7,24,16), new THREE.MeshBasicMaterial({color:0xfff1b0})); sunDisk.position.set(-25,24,-28); scene.add(sunDisk);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(64,64), material(0x618c56,0.8,0.02)); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  // terraces and paths
  for (let i=0;i<4;i++) { box("terrace",20,.25,2.4,0,.12,-6+i*4,material(0x8a9c58,0.7),scene,false); }
  box("path",3.2,.06,20,.2,.035,2,material(0xd2c79b,0.75),scene,false);
  // central wet platform / water
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.1,64), material(0x2e8f9a,0.16,0.6)); pool.rotation.x=-Math.PI/2; pool.position.set(0,.04,6); scene.add(pool);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.75,64), new THREE.MeshPhysicalMaterial({color:0x57c9c9,roughness:.08,metalness:.3,transmission:.25,transparent:true,opacity:.72})); water.rotation.x=-Math.PI/2; water.position.y=.06; pool.add(water); waterMeshes.push(water);
  for (let i=0;i<8;i++) { const a=i/8*Math.PI*2; box("bridge",.9,.08,.22,Math.cos(a)*3.0,.08,Math.sin(a)*3.0+6,material(0xb08b5c,0.65),scene,false); }
  // solar canopy
  const solar = makeProp("solar"); solar.position.set(-9,0,2); scene.add(solar);
  // wind turbines
  const wind = makeProp("wind"); wind.position.set(9,0,3); scene.add(wind);
  // battery
  const battery = makeProp("battery"); battery.position.set(7,0,-4); scene.add(battery);
  // irrigator
  const irrigator = makeProp("irrigator"); irrigator.position.set(-3,0,7); scene.add(irrigator);
  // greenhouse
  const gh = new THREE.Group(); gh.position.set(-8,0,7); scene.add(gh);
  box("gh-base",5,1.1,3,.0,.55,0,material(0xb8c4a2,0.7),gh);
  const glass = new THREE.MeshPhysicalMaterial({color:0xa7e8d4,roughness:.12,metalness:.05,transmission:.55,transparent:true,opacity:.45});
  box("gh-glass",4.8,2.5,2.8,0,2.0,0,glass,gh,false);
  for (const x of [-2.3,0,2.3]) box("gh-frame",.08,2.5,2.85,x,2,0,material(0x7a9a7e),gh,false);
  for (let i=0;i<7;i++) { const p = sphere("plant",.25 + Math.random()*.18,-2+i*.65,.65,.2,material(i%2?0x6fbf62:0x9bd46a),gh,10); }
  // public hall
  const hall = new THREE.Group(); hall.position.set(4,0,10); scene.add(hall);
  box("hall-base",7,2.8,4.2,0,1.4,0,material(0xe2d4b2,0.65),hall);
  box("hall-roof",7.7,.25,4.8,0,2.95,0,material(0x6f9b6a,0.6),hall);
  box("hall-glass",3.2,2.1,.08,0,1.6,-2.15,material(0x9de2d0,0.15,.2,0x8de8d8,.2),hall,false);
  for (const x of [-2.2,0,2.2]) box("hall-column",.14,2.8,4.3,x,1.4,0,material(0xb28a57,0.6),hall,false);
  sign("太阳城农场","SOLARFARM / PUBLIC COMMONS",-8,3.4,8.55,4.2,1.1);
  sign("公众大会堂","ASSEMBLY / 15:00",4,3.9,7.8,3.4,.9);
  // trees / green roofs
  for (let i=0;i<16;i++) {
    const a=i/16*Math.PI*2; const x=Math.cos(a)*(14+Math.random()*3); const z=Math.sin(a)*(11+Math.random()*3);
    const trunk = cyl("tree",.13,1.8+Math.random(),x,.9,z,material(0x7b5d3e),scene,8);
    for (let j=0;j<3;j++) sphere("canopy",.9+Math.random()*.5,x+Math.random()*.8-.4,2.2+Math.random()*.8,z+Math.random()*.8-.4,material(j%2?0x4f9b62:0x77ba6c),scene,12);
  }
  // signs / AI kiosks
  for (const [x,z] of [[-6,4],[6,5],[-5,8]]) {
    const k = new THREE.Group(); k.position.set(x,0,z); scene.add(k);
    box("ai-pedestal",.7,.4,.7,0,.2,0,material(0x3b6b55),k);
    const orb = sphere("ai-orb",.36,0,1.15,0,material(0x7ff5e8,.2,.3,0x5ee8d9,1.2),k,18); aiRings.push(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.55,.02,8,32),new THREE.MeshBasicMaterial({color:0x9af7df,transparent:true,opacity:.65})); ring.rotation.x=Math.PI/2; ring.position.y=1.15; k.add(ring); aiRings.push(ring);
  }
  // community board
  sign("公共能源","SOLAR / WIND / STORAGE",-11,2.2,-5,3.4,.9);

  window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}

function contentToVisual(entity) {
  if (entity.content_id === "player") return makePerson(COLORS.player,0xf3c969);
  if (entity.kind === "actor") {
    const ai = entity.content_id.includes("aria") || entity.content_id.includes("helio") || entity.content_id.includes("aqua");
    const colors = { mayor:0xd1a85c, botanist:0x7fbc6d, engineer:0xc28d62, aria:0x69e4de, helio:0x8fe8b2, aqua:0x6ac6e8 };
    const key = entity.content_id.split(".").pop();
    return makePerson(colors[key] ?? (ai?COLORS.ai:COLORS.human), ai ? 0x9af7df : 0xf3c969, ai);
  }
  if (entity.kind === "item") return makeItem(entity.content_id.split(".").pop());
  const key = entity.content_id.split(".").pop();
  if (["solar","wind","battery","irrigator"].includes(key)) return null; // built as set pieces
  return makeProp(key);
}
function syncViews() {
  const alive = new Set();
  for (const entity of current.state.entities) {
    const key=`${entity.id.index}:${entity.id.generation}`; alive.add(key);
    let v=views.get(key);
    if (!v) { v=contentToVisual(entity); if (!v) continue; scene.add(v); views.set(key,v); }
    const p=entity.transform.position;
    v.position.lerp(new THREE.Vector3(p[0],0,p[2]),.35);
    v.rotation.y=entity.transform.yaw??0;
  }
  for (const [k,v] of views) if (!alive.has(k)) { scene.remove(v); views.delete(k); }
}
function playerEntity(){return current?.state?.entities?.find(e=>e.id.index===current.state.player.index&&e.id.generation===current.state.player.generation);}
function nearest(kind){
  const p=playerEntity(); if(!p)return null;
  const a=new THREE.Vector3(p.transform.position[0],0,p.transform.position[2]);
  let best=null,d=3.4;
  for(const e of current.state.entities){ if(e.kind!==kind)continue; const dd=a.distanceTo(new THREE.Vector3(e.transform.position[0],0,e.transform.position[2])); if(dd<d){best=e;d=dd;} }
  return best;
}
function t(text){ if(typeof text!=="string")return ""; if(!text.startsWith("loc:"))return text; return current?.loc?.[text.slice(4)]??text.slice(4); }
function nameOf(id){return id==="player"?"你":t(current?.names?.[id]??id);}
function act(kind,method){
  const target=nearest(kind); if(!target){showToast("靠近目标再操作");return;}
  if(world[method]("player",target.content_id)) showToast(`${method==="talk"?"对话":"交互"}：${nameOf(target.content_id)}`);
}
function showToast(text){if(!text)return;el.toast.textContent=text;el.toast.classList.add("show");toastTimer=2.6;}
function showDialogue(ev){el["dialogue-speaker"].textContent=nameOf(ev.data?.speaker??"demo.solarfarm.aria");el["dialogue-text"].textContent=ev.data?.text??"……";el.dialogue.hidden=false;dialogTimer=4.6;}

function renderHud(){
  if(!current)return; const st=current.state; const q=Object.entries(st.quests??{}); const active=q.filter(([,v])=>v.active&&!v.completed);
  el["quest-title"].textContent=active.length?(current.quest_titles?t(current.quest_titles[active[0][0]]):active[0][0]):"已完成";
  const progress=active[0]?.[1]?.progress??{};
  el["quest-objectives"].innerHTML=[
    ["talk:demo.solarfarm.mayor","与玛拉报到"],["talk:demo.solarfarm.botanist","与蕨聊聊"],["talk:demo.solarfarm.engineer","与伊莱聊聊"],
    ["flag:flag.farm.solar_checked","读取光伏 canopy"],["flag:flag.farm.wind_checked","读取风轮机"],["flag:flag.farm.hall_checked","登记公众大会堂"],
  ].map(([k,label])=>`<li class="${progress[k]?"done":""}">${progress[k]?"✓ ":"● "}${label}</li>`).join("");
  const p=playerEntity(); const inv=p?.inventory??[];
  el.inventory.innerHTML=inv.length?inv.map(s=>`<span>${t(current.names?.[s.item]??s.item)} ×${s.count}</span>`).join(""):'<span class="empty">空</span>';
  const flags=Object.entries(st.flags??{}).filter(([,v])=>v).slice(0,3); el.flags.innerHTML=flags.map(([k])=>`<span>${k.replace("flag.","")}</span>`).join("");
  const social=st.social; if(social){
    const factions=Object.entries(social.factions??{});
    el["social-factions"].innerHTML=factions.map(([id,f])=>`<span>${t(f.name)} · ${f.members.length}</span>`).join("");
    const rels=Object.values(social.relationships??{}).sort((a,b)=>b.trust-a.trust).slice(0,3);
    el["social-relations"].innerHTML=rels.map(r=>`<span><span>${nameOf(r.a).slice(0,8)} ↔ ${nameOf(r.b).slice(0,8)}</span><b>${r.trust}</b></span>`).join("")||'<span class="empty">等待第一次对话</span>';
    el.reputation.textContent=String(social.reputation?.player??0);
  }
  const sys=st.systems; if(sys){
    const labels={clear:"晴",breezy:"微风",cloudy:"多云",rain:"雨"}; el.weather.textContent=labels[sys.weather]??sys.weather;
    el["weather-note"].textContent=sys.policy==="irrigate"?"灌溉优先":sys.policy==="compute"?"算力优先":"社区平衡";
    el["solar-kw"].textContent=sys.solar_kw.toFixed(0); el["wind-kw"].textContent=sys.wind_kw.toFixed(0); el["battery-kwh"].textContent=sys.battery_kwh.toFixed(0); el["water-m3"].textContent=sys.water_m3.toFixed(0); el["load-kw"].textContent=sys.load_kw.toFixed(0);
    el["solar-bar"].style.width=`${Math.min(100,sys.solar_kw/140*100)}%`; el["wind-bar"].style.width=`${Math.min(100,sys.wind_kw/90*100)}%`; el["battery-bar"].style.width=`${Math.min(100,sys.battery_kwh/260*100)}%`; el["water-bar"].style.width=`${Math.min(100,sys.water_m3/800*100)}%`;
    el["status-text"].textContent=sys.weather==="rain"?"雨水回收中":"公共微网运行中";
  }
}
function handleEvents(){
  let evs;try{evs=JSON.parse(world.poll_events());}catch{return;}
  for(const ev of evs){
    if(ev.kind==="toast")showToast(ev.data?.text??"");
    else if(ev.kind==="dialogue_started")showDialogue(ev);
    else if(ev.kind==="relationship_changed")showToast(`关系变化：${nameOf(ev.data?.a).slice(0,8)} ↔ ${nameOf(ev.data?.b).slice(0,8)} · 信任 ${ev.data?.trust}`);
    else if(ev.kind==="reputation_changed")showToast(`公众声望 ${ev.data?.value>0?"+":""}${ev.data?.value}`);
    else if(ev.kind==="weather_changed")showToast(`天气转为：${ev.data?.weather}`);
  }
}
function policy(p){
  try{world.command(JSON.stringify({op:"set_system_policy",policy:p}));showToast(`能源策略：${p==="irrigate"?"灌溉优先":p==="compute"?"算力优先":"社区平衡"}`);}catch(e){showToast(String(e));}
}
function assembly(){
  const mayor=current.state.entities.find(e=>e.content_id==="demo.solarfarm.mayor"); if(!mayor)return;
  try{world.command(JSON.stringify({op:"social_action",actor:current.state.player,target:mayor.id,action:"propose"}));showToast("大会提案：农场余电共享");}catch(e){showToast(String(e));}
}
function bindUi(){
  document.getElementById("btn-interact").addEventListener("click",()=>act("prop","interact"));
  document.getElementById("btn-talk").addEventListener("click",()=>act("actor","talk"));
  document.getElementById("btn-assembly").addEventListener("click",assembly);
  document.getElementById("btn-irrigate").addEventListener("click",()=>policy("irrigate"));
  document.getElementById("btn-store").addEventListener("click",()=>policy("balance"));
  document.getElementById("btn-compute").addEventListener("click",()=>policy("compute"));
  document.getElementById("btn-reset").addEventListener("click",()=>{world.reset();current=JSON.parse(world.state());views.forEach(v=>scene.remove(v));views.clear();syncViews();renderHud();});
  el["btn-pause"].addEventListener("click",()=>{paused=!paused;el["btn-pause"].textContent=paused?"继续":"暂停";});
  document.getElementById("btn-camera").addEventListener("click",e=>{auto=!auto;controls.autoRotate=auto;e.currentTarget.setAttribute("aria-pressed",String(auto));});
  window.addEventListener("keydown",e=>{if(e.target instanceof HTMLInputElement)return;const k=e.key.toLowerCase();if(TICK_KEYS.has(k)){keys.add(k);e.preventDefault();return;}if(k==="e")act("prop","interact");if(k==="t")act("actor","talk");if(k==="p")el["btn-pause"].click();});
  window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
}
function animate(dt,now){
  for(const [i,panel] of panels.entries()){ panel.material.emissiveIntensity=.15+.25*Math.sin(now*.0005+i); }
  for(const hub of turbines){ hub.rotation.z += dt*(0.25 + (current?.state?.systems?.wind_kw??20)/160); }
  for(const r of aiRings){ r.rotation.z += dt*.35; r.scale.setScalar(1+0.04*Math.sin(now*.002)); }
  for(const w of waterMeshes){ w.rotation.z += dt*.05; }
  if(!introDone){
    intro=Math.min(1,intro+dt/4.2); const e=1-Math.pow(1-intro,3);
    camera.position.lerpVectors(new THREE.Vector3(20,14,-19),new THREE.Vector3(12,7,-13),e);
    controls.target.lerpVectors(new THREE.Vector3(0,1.2,4),new THREE.Vector3(0,1.2,5),e);
    if(intro>=1){introDone=true;controls.enabled=true;}
  } else { const p=playerEntity(); if(p) controls.target.lerp(new THREE.Vector3(p.transform.position[0],1.2,p.transform.position[2]+2.5),.06); }
}
function loop(now){
  requestAnimationFrame(loop); if(!world)return;
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(!paused){const mx=(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("arrowleft")?1:0);const mz=(keys.has("s")||keys.has("arrowdown")?1:0)-(keys.has("w")||keys.has("arrowup")?1:0);world.set_move(mx,mz);acc+=dt*1000;let n=0;while(acc>=TICK_US&&n<4){world.tick(TICK_US);acc-=TICK_US;n++;}current=JSON.parse(world.state());handleEvents();renderHud();syncViews();}
  controls.update();animate(dt,now);renderer.render(scene,camera);
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)el.toast.classList.remove("show");}
  if(dialogTimer>0){dialogTimer-=dt;if(dialogTimer<=0)el.dialogue.hidden=true;}
}
async function boot(){
  try{
    await init(); const res=await fetch("./packs/demo.solarfarm.data"); if(!res.ok)throw new Error(`packs/demo.solarfarm.data HTTP ${res.status}`);
    world=new PreviewWorld(await res.text()); current=JSON.parse(world.state());
    buildScene();bindUi();syncViews();renderHud();el.loading.classList.add("hidden");requestAnimationFrame(loop);
  }catch(e){el.loading.innerHTML=`<p style="color:#ffb4a0">加载失败：${String(e)}</p>`;console.error(e);}
}
boot();
