import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import init, { PreviewWorld } from "./pkg/world_wasm.js";

const TICK_US = 16666;
const canvas = document.getElementById("scene");
const names = ["quest-title","quest-objectives","inventory","flags","toast","dialogue","dialogue-speaker","dialogue-text","loading","status-text","btn-pause","social-factions","social-relations","reputation","weather","weather-note","solar-kw","wind-kw","battery-kwh","water-m3","load-kw","solar-bar","wind-bar","battery-bar","water-bar"];
const el = Object.fromEntries(names.map((id) => [id, document.getElementById(id)]));
let world, current, renderer, scene, camera, controls;
let paused = false, acc = 0, last = performance.now(), toastTimer = 0, dialogTimer = 0, auto = false, intro = 0, introDone = false;
const keys = new Set();
const views = new Map(), neon = [], trains = [], drones = [], rain = [], holo = [];
const TICK_KEYS = new Set(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"]);
const COLORS = { player:0x54e7ff, human:0xd8b08a, ai:0xff6fc7, machine:0x7a91a8, item:0xffc15a };

function mat(color, rough=.6, metal=.1, emit=0, strength=0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: emit, emissiveIntensity: strength });
}
function box(name,w,h,d,x,y,z,m,parent=scene,cast=true){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.name=name;o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;}
function cyl(name,r,h,x,y,z,m,parent=scene,seg=16){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),m);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(name,r,x,y,z,m,parent=scene,seg=16){const o=new THREE.Mesh(new THREE.SphereGeometry(r,seg,seg/2),m);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function neonMat(color, opacity=1) { return new THREE.MeshBasicMaterial({ color, transparent: opacity<1, opacity }); }
function textTexture(title, sub, color="#54e7ff", bg="#080914") {
  const c=document.createElement("canvas"); c.width=512; c.height=256; const x=c.getContext("2d");
  x.fillStyle=bg; x.fillRect(0,0,512,256); x.strokeStyle=color; x.lineWidth=7; x.strokeRect(8,8,496,240);
  x.textAlign="center"; x.fillStyle=color; x.shadowColor=color; x.shadowBlur=22; x.font="800 50px -apple-system, 'PingFang SC', sans-serif"; x.fillText(title,256,112);
  if(sub){x.shadowBlur=0;x.fillStyle="#a8c8dc";x.font="500 20px Menlo, monospace";x.fillText(sub,256,174);}
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t;
}
function sign(title, sub, x, y, z, w, h, color="#54e7ff", ry=0) {
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:textTexture(title,sub,color),transparent:true,side:THREE.DoubleSide}));
  m.position.set(x,y,z); m.rotation.y=Math.PI+ry; scene.add(m); neon.push(m); return m;
}
function makeHuman(color, coat, hasUmbrella=true) {
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.24,.72,4,10),mat(coat)); body.position.y=1.05; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.18,18,12),mat(color)); head.position.y=1.64; head.castShadow=true; g.add(head);
  for(const s of [-1,1]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.07,.56,3,7),mat(0x1b2733));leg.position.set(s*.12,.42,0);g.add(leg);const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.48,3,7),mat(coat));arm.position.set(s*.28,1.0,0);g.add(arm);}
  if(hasUmbrella){const pole=cyl("umbrella-pole",.018,1.2,.28,1.55,.1,mat(0x95a5b2),g,6);const canopy=new THREE.Mesh(new THREE.ConeGeometry(.75,.3,16),new THREE.MeshStandardMaterial({color:0x1a2638,roughness:.55,emissive:0x224466,emissiveIntensity:.25}));canopy.position.set(.28,2.12,.1);g.add(canopy);}
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.46,.055,.3),neonMat(color,.8));stripe.position.set(0,1.28,-.02);g.add(stripe);
  return g;
}
function makeAI() {
  const g=new THREE.Group();
  cyl("ai-base",.3,.18,0,.09,0,mat(0x1b2d3c),g,12);
  const core=sphere("ai-core",.34,0,1.15,0,new THREE.MeshStandardMaterial({color:0xff6fc7,emissive:0xff4fa7,emissiveIntensity:1.4,roughness:.2}),g,18);holo.push(core);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.018,8,32),neonMat(0x54e7ff,.7));ring.rotation.x=Math.PI/2;ring.position.y=1.15;g.add(ring);holo.push(ring);
  return g;
}
function makeItem(kind) {
  const g=new THREE.Group();const col=kind==="shard"?0x54e7ff:kind==="medkit"?0x8fd19a:0xffc15a;
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.25,0),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.8,roughness:.2}));m.position.y=.4;g.add(m);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.46,28),neonMat(col,.55));ring.rotation.x=-Math.PI/2;ring.position.y=.03;g.add(ring);return g;
}
function makeProp(kind) {
  const g=new THREE.Group();
  if(kind==="substation"){box("sub",1.4,2.2,1.2,0,1.1,0,mat(0x1a2833),g);for(let i=0;i<4;i++)box("coil",.12,.8,.12,-.4+i*.27,.8,0,neonMat(i%2?0xffc15a:0x54e7ff),g,false);}
  else if(kind==="vending"){box("vend",.8,1.9,.6,0,.95,0,mat(0x1a2c3a),g);box("screen",.55,1.1,.05,0,1.2,.32,neonMat(0xff6fc7,.9),g,false);}
  else if(kind==="billboard"){box("bill-post",.2,5,.2,0,2.5,0,mat(0x263b47),g);}
  else if(kind==="elevator"){box("lift",1.6,3.4,1.4,0,1.7,0,mat(0x1b2b38),g);box("lift-light",1.2,2.5,.08,0,1.7,.72,neonMat(0x54e7ff,.25),g,false);}
  else if(kind==="drone"){const d=new THREE.Group();d.position.y=2.2;box("drone-body",.5,.16,.5,0,0,0,mat(0x506575),d,false);for(const s of [-1,1]){const rotor=new THREE.Mesh(new THREE.TorusGeometry(.28,.02,6,20),neonMat(0xff6fc7));rotor.rotation.x=Math.PI/2;rotor.position.set(s*.35,.06,0);d.add(rotor);}g.add(d);drones.push(d);}
  return g;
}

function buildScene() {
  scene=new THREE.Scene(); scene.background=new THREE.Color(0x0a1020); scene.fog=new THREE.FogExp2(0x10182c,.02);
  camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,180); camera.position.set(0,14,-26);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.35;
  controls=new OrbitControls(camera,canvas); controls.target.set(0,1.4,4); controls.enableDamping=true; controls.dampingFactor=.05; controls.minDistance=5; controls.maxDistance=38; controls.maxPolarAngle=Math.PI*.49; controls.autoRotateSpeed=.3; controls.enabled=false;
  scene.add(new THREE.HemisphereLight(0x8fb8e8,0x10182a,3.0));
  scene.add(new THREE.AmbientLight(0x355070,0.7));
  const moon=new THREE.DirectionalLight(0xa9c9ff,3.0); moon.position.set(-10,18,-6); moon.castShadow=true; moon.shadow.mapSize.set(2048,2048); scene.add(moon);
  const pink=new THREE.PointLight(0xff4fa7,45,26); pink.position.set(-6,6,-2); scene.add(pink);
  const cyan=new THREE.PointLight(0x54e7ff,40,26); cyan.position.set(7,5,4); scene.add(cyan);
  const amber=new THREE.PointLight(0xffc15a,22,16); amber.position.set(0,4,8); scene.add(amber);

  const street=new THREE.Mesh(new THREE.PlaneGeometry(60,60),mat(0x182431,.22,.6));street.rotation.x=-Math.PI/2;street.receiveShadow=true;scene.add(street);
  for(let i=0;i<18;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(1+Math.random()*2.2,32),new THREE.MeshBasicMaterial({color:i%2?0x1f3144:0x291b3b,transparent:true,opacity:.3}));p.rotation.x=-Math.PI/2;p.position.set(-12+Math.random()*24,.012,-8+Math.random()*20);scene.add(p);}
  // road strips
  for(let i=-2;i<=2;i++) box("lane",.08,.01,34,i*2.5,.02,3,neonMat(0x54e7ff,.18),scene,false);
  // towers
  const towerMat=mat(0x1b2b44,.45,.3), dark=mat(0x142033,.55,.35);
  for(const side of [-1,1]) for(let i=0;i<6;i++) {
    const h=8+Math.random()*15, w=3+Math.random()*2, z=-12+i*5.2;
    const t=box("tower",w,h,3.2,side*(12+Math.random()*2),h/2,z,dark);
    for(let f=0;f<Math.floor(h/1.6);f++) for(let c=0;c<4;c++) {
      if(Math.random()<.35) continue;
      const win=box("window",.25,.22,.03,side*(12+Math.random()*2)-side*w/2+ .4+c*.5,1+f*1.6,z+1.62,neonMat(f%3?0x54e7ff:0xff6fc7,.8),scene,false);
    }
    if(i%2===0) sign(["HOTEL","NOODLE","CORP","DATA"][i%4],"24H / CASH ONLY",side*(9.4),4+Math.random()*3,z+1.7,2.6,.8,side<0?"#ff4fa7":"#54e7ff",side<0?0.18:-0.18);
  }
  // central megabuilding
  box("mega",8,22,4,0,11,12,mat(0x0b1420,.5,.35));
  for(let f=0;f<12;f++) for(let c=0;c<6;c++) box("mega-win",.5,.35,.05,-2.8+c*1.1,2+f*1.6,9.95,neonMat(f%4?0x54e7ff:0xff4fa7,.75),scene,false);
  sign("赫利俄斯","HELIOS CORP / DISTRICT 07",0,9,9.9,5.2,1.3,"#ff4fa7");
  // elevated rail
  for(const z of [-2,8]) box("rail",24,.18,.3,0,7.2,z,mat(0x2f4050,.4,.7));
  for(const x of [-10,-4,0,4,10]) box("rail-pillar",.22,7.2,.22,x,3.6,-2,mat(0x273848,.5,.5));
  for(let i=0;i<2;i++){const tr=new THREE.Group();tr.position.set(-8+i*12,7.5,-2);box("car",4,.9,1.1,0,0,0,mat(0x1b2b38,.4,.5),tr);for(let j=0;j<4;j++)box("car-window",.5,.28,.04,-1.4+j*.9,.1,.56,neonMat(0x54e7ff,.7),tr,false);scene.add(tr);trains.push(tr);}
  // billboards
  sign("霓虹下城","NEON UNDERTOWN / 21:40",-8,4.8,-7,4.2,1.1,"#54e7ff",.1);
  sign("你的脸","也是可售资产",8,5.5,6,3.6,1.1,"#ff4fa7",-.15);
  sign("下城互助","MUTUAL AID / FREE CLINIC",-5,3.2,8,3.0,.8,"#ffc15a",.1);
  // substation / props
  const sub=makeProp("substation");sub.position.set(-8,0,1);scene.add(sub);
  const badge=makeProp("billboard");badge.position.set(8,0,-1);scene.add(badge);
  const vend=makeProp("vending");vend.position.set(5,0,1);scene.add(vend);
  const lift=makeProp("elevator");lift.position.set(6,0,8);scene.add(lift);
  const drone=makeProp("drone");drone.position.set(0,2.2,-4);scene.add(drone);
  // AI pylons
  for(const [x,z,col] of [[-6,4,"#ff4fa7"],[6,5,"#54e7ff"],[-5,7,"#ffc15a"]]) {
    const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    cyl("pylon",.1,2.2,0,1.1,0,mat(0x24323d),g,8);
    const orb=sphere("orb",.28,0,2.4,0,new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.3,roughness:.2}),g,16);holo.push(orb);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.018,8,28),neonMat(col,.7));ring.rotation.x=Math.PI/2;ring.position.y=2.4;g.add(ring);holo.push(ring);
  }
  // steam / rain
  for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(.5+Math.random()*.7,2+Math.random()*2,12,1,true),new THREE.MeshBasicMaterial({color:0x6c879a,transparent:true,opacity:.06,side:THREE.DoubleSide}));s.position.set(-8+Math.random()*16,1,-4+Math.random()*12);scene.add(s);}
  const rainGeo=new THREE.BufferGeometry();const rp=[];for(let i=0;i<1100;i++)rp.push(-25+Math.random()*50,Math.random()*18,-15+Math.random()*34);rainGeo.setAttribute("position",new THREE.Float32BufferAttribute(rp,3));
  const rainMesh=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x8fbad8,size:.032,transparent:true,opacity:.42,depthWrite:false}));scene.add(rainMesh);rain.push(rainMesh);
  sign("第七码头","DISTRICT 07 / RAIN 92%",0,2.7,-8,3.0,.85,"#54e7ff");
  for (const [x,z,c] of [[-5,2,0x54e7ff],[5,2,0xff4fa7],[-4,-5,0xffc15a],[4,-5,0x54e7ff]]) {
    const l = new THREE.PointLight(c, 24, 14); l.position.set(x, 3.2, z); scene.add(l);
  }
  window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}

function visualFor(entity) {
  if(entity.content_id==="player") return makeHuman(COLORS.player,0x153d4d);
  if(entity.kind==="actor") {
    const key=entity.content_id.split(".").pop();
    if(["warden","muse","transit"].includes(key)) return makeAI();
    const coats={fixer:0x5a2140,medic:0x2a4d43,runner:0x263a55};
    return makeHuman(COLORS.human,coats[key]??0x2c4350);
  }
  if(entity.kind==="item") return makeItem(entity.content_id.split(".").pop());
  const key=entity.content_id.split(".").pop();
  if(["billboard","substation","elevator","drone","vending"].includes(key)) return null;
  return makeProp(key);
}
function syncViews(){
  const alive=new Set();
  for(const e of current.state.entities){const k=`${e.id.index}:${e.id.generation}`;alive.add(k);let v=views.get(k);if(!v){v=visualFor(e);if(!v)continue;scene.add(v);views.set(k,v);}const p=e.transform.position;v.position.lerp(new THREE.Vector3(p[0],0,p[2]),.35);v.rotation.y=e.transform.yaw??0;}
  for(const [k,v] of views)if(!alive.has(k)){scene.remove(v);views.delete(k);}
}
function playerEntity(){return current?.state?.entities?.find(e=>e.id.index===current.state.player.index&&e.id.generation===current.state.player.generation);}
function nearest(kind){const p=playerEntity();if(!p)return null;const a=new THREE.Vector3(p.transform.position[0],0,p.transform.position[2]);let b=null,d=3.4;for(const e of current.state.entities){if(e.kind!==kind)continue;const dd=a.distanceTo(new THREE.Vector3(e.transform.position[0],0,e.transform.position[2]));if(dd<d){b=e;d=dd;}}return b;}
function t(text){if(typeof text!=="string")return "";if(!text.startsWith("loc:"))return text;return current?.loc?.[text.slice(4)]??text.slice(4);}
function nameOf(id){return id==="player"?"你":t(current?.names?.[id]??id);}
function showToast(text){if(!text)return;el.toast.textContent=text;el.toast.classList.add("show");toastTimer=2.6;}
function showDialogue(ev){el["dialogue-speaker"].textContent=nameOf(ev.data?.speaker??"demo.cybercity.warden");el["dialogue-text"].textContent=ev.data?.text??"……";el.dialogue.hidden=false;dialogTimer=4.6;}
function act(kind,method){const target=nearest(kind);if(!target){showToast("靠近目标再操作");return;}if(world[method]("player",target.content_id))showToast(`${method==="talk"?"对话":"交互"}：${nameOf(target.content_id)}`);}
function renderHud(){
  if(!current)return;const st=current.state;const q=Object.entries(st.quests??{});const active=q.filter(([,v])=>v.active&&!v.completed);
  el["quest-title"].textContent=active.length?(current.quest_titles?t(current.quest_titles[active[0][0]]):active[0][0]):"已完成";
  const progress=active[0]?.[1]?.progress??{};
  el["quest-objectives"].innerHTML=[["talk:demo.cybercity.fixer","与岚接洽"],["talk:demo.cybercity.medic","与针聊聊"],["talk:demo.cybercity.runner","与零聊聊"],["flag:flag.cyber.billboard_checked","接管全息广告"],["flag:flag.cyber.substation_checked","接入街区配电站"],["flag:flag.cyber.elevator_checked","登记轨道电梯"]].map(([k,l])=>`<li class="${progress[k]?"done":""}">${progress[k]?"✓ ":"● "}${l}</li>`).join("");
  const p=playerEntity();const inv=p?.inventory??[];el.inventory.innerHTML=inv.length?inv.map(s=>`<span>${t(current.names?.[s.item]??s.item)} ×${s.count}</span>`).join(""):'<span class="empty">空</span>';
  const flags=Object.entries(st.flags??{}).filter(([,v])=>v).slice(0,3);el.flags.innerHTML=flags.map(([k])=>`<span>${k.replace("flag.","")}</span>`).join("");
  const social=st.social;if(social){const f=Object.entries(social.factions??{});el["social-factions"].innerHTML=f.map(([,v])=>`<span>${t(v.name)} · ${v.members.length}</span>`).join("");const rel=Object.values(social.relationships??{}).sort((a,b)=>b.trust-a.trust).slice(0,3);el["social-relations"].innerHTML=rel.map(r=>`<span><span>${nameOf(r.a).slice(0,7)} ↔ ${nameOf(r.b).slice(0,7)}</span><b>${r.trust}</b></span>`).join("")||'<span class="empty">等待第一次接触</span>';el.reputation.textContent=String(social.reputation?.player??0);}
  const sys=st.systems;if(sys){const labels={clear:"晴",breezy:"微风",cloudy:"多云",rain:"酸雨"};el.weather.textContent=labels[sys.weather]??sys.weather;el["weather-note"].textContent=sys.policy==="profit"?"公司优先":sys.policy==="commons"?"公共供电":sys.policy==="compute"?"算力优先":"租界平衡";el["solar-kw"].textContent=sys.solar_kw.toFixed(0);el["wind-kw"].textContent=sys.wind_kw.toFixed(0);el["battery-kwh"].textContent=sys.battery_kwh.toFixed(0);el["water-m3"].textContent=sys.water_m3.toFixed(0);el["load-kw"].textContent=sys.load_kw.toFixed(0);el["solar-bar"].style.width=`${Math.min(100,sys.solar_kw/60*100)}%`;el["wind-bar"].style.width=`${Math.min(100,sys.wind_kw/90*100)}%`;el["battery-bar"].style.width=`${Math.min(100,sys.battery_kwh/180*100)}%`;el["water-bar"].style.width=`${Math.min(100,sys.water_m3/120*100)}%`;el["status-text"].textContent=sys.policy==="commons"?"街坊供电中":"租界电网运行中";}
}
function handleEvents(){let evs;try{evs=JSON.parse(world.poll_events());}catch{return;}for(const ev of evs){if(ev.kind==="toast")showToast(ev.data?.text??"");else if(ev.kind==="dialogue_started")showDialogue(ev);else if(ev.kind==="relationship_changed")showToast(`关系变化：${nameOf(ev.data?.a).slice(0,7)} ↔ ${nameOf(ev.data?.b).slice(0,7)} · 信任 ${ev.data?.trust}`);else if(ev.kind==="reputation_changed")showToast(`市民信用 ${ev.data?.value>0?"+":""}${ev.data?.value}`);else if(ev.kind==="weather_changed")showToast(`天气：${ev.data?.weather}`);}}
function policy(p){try{world.command(JSON.stringify({op:"set_system_policy",policy:p}));showToast(`电网策略：${p==="profit"?"公司优先":p==="commons"?"公共供电":"算力优先"}`);}catch(e){showToast(String(e));}}
function contract(){const fixer=current.state.entities.find(e=>e.content_id==="demo.cybercity.fixer");if(!fixer)return;try{world.command(JSON.stringify({op:"social_action",actor:current.state.player,target:fixer.id,action:"propose"}));showToast("合约提案：下城配电站共享");}catch(e){showToast(String(e));}}
function bindUi(){
  document.getElementById("btn-interact").addEventListener("click",()=>act("prop","interact"));
  document.getElementById("btn-talk").addEventListener("click",()=>act("actor","talk"));
  document.getElementById("btn-contract").addEventListener("click",contract);
  document.getElementById("btn-profit").addEventListener("click",()=>policy("profit"));
  document.getElementById("btn-commons").addEventListener("click",()=>policy("commons"));
  document.getElementById("btn-compute").addEventListener("click",()=>policy("compute"));
  document.getElementById("btn-reset").addEventListener("click",()=>{world.reset();current=JSON.parse(world.state());views.forEach(v=>scene.remove(v));views.clear();syncViews();renderHud();});
  el["btn-pause"].addEventListener("click",()=>{paused=!paused;el["btn-pause"].textContent=paused?"继续":"暂停";});
  document.getElementById("btn-camera").addEventListener("click",e=>{auto=!auto;controls.autoRotate=auto;e.currentTarget.setAttribute("aria-pressed",String(auto));});
  window.addEventListener("keydown",e=>{if(e.target instanceof HTMLInputElement)return;const k=e.key.toLowerCase();if(TICK_KEYS.has(k)){keys.add(k);e.preventDefault();return;}if(k==="e")act("prop","interact");if(k==="t")act("actor","talk");if(k==="p")el["btn-pause"].click();});
  window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
}
function animate(dt,now){
  for(const n of neon)n.material.opacity=.75+.25*Math.sin(now*.001+n.position.x);
  for(const h of holo){h.rotation.z+=dt*.4;h.scale.setScalar(1+.05*Math.sin(now*.002));}
  for(const [i,t] of trains.entries()){t.position.x=((now*.003+i*12)%24)-12;}
  for(const d of drones){d.position.y=2.2+Math.sin(now*.001+d.position.x)*.3;d.rotation.y+=dt*.5;}
  const r=rain[0];if(r){const pos=r.geometry.attributes.position;for(let i=0;i<pos.count;i++){let y=pos.getY(i)-18*dt;if(y<0)y=18;pos.setY(i,y);}pos.needsUpdate=true;}
  if(!introDone){intro=Math.min(1,intro+dt/4.2);const e=1-Math.pow(1-intro,3);camera.position.lerpVectors(new THREE.Vector3(0,14,-26),new THREE.Vector3(0,8,-20),e);controls.target.lerpVectors(new THREE.Vector3(0,1.8,4),new THREE.Vector3(0,1.8,5),e);if(intro>=1){introDone=true;controls.enabled=true;}}
  else{const p=playerEntity();if(p)controls.target.lerp(new THREE.Vector3(p.transform.position[0],1.3,p.transform.position[2]+2.6),.06);}
}
function loop(now){requestAnimationFrame(loop);if(!world)return;const dt=Math.min((now-last)/1000,.05);last=now;if(!paused){const mx=(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("arrowleft")?1:0);const mz=(keys.has("s")||keys.has("arrowdown")?1:0)-(keys.has("w")||keys.has("arrowup")?1:0);world.set_move(mx,mz);acc+=dt*1000;let n=0;while(acc>=TICK_US&&n<4){world.tick(TICK_US);acc-=TICK_US;n++;}current=JSON.parse(world.state());handleEvents();renderHud();syncViews();}controls.update();animate(dt,now);renderer.render(scene,camera);if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)el.toast.classList.remove("show");}if(dialogTimer>0){dialogTimer-=dt;if(dialogTimer<=0)el.dialogue.hidden=true;}}
async function boot(){try{await init();const res=await fetch("./packs/demo.cybercity.data");if(!res.ok)throw new Error(`packs/demo.cybercity.data HTTP ${res.status}`);world=new PreviewWorld(await res.text());current=JSON.parse(world.state());buildScene();bindUi();syncViews();renderHud();el.loading.classList.add("hidden");requestAnimationFrame(loop);}catch(e){el.loading.innerHTML=`<p style="color:#ffb4a0">加载失败：${String(e)}</p>`;console.error(e);}}
boot();
