// ================= PARTS & VEHICLES =================
// Parts are rectangles: x = centre, y = bottom, in units of 10 cm (UM = 0.1 m per unit), so a 40 × 300 tank is a real-size
// 4 m × 30 m tank holding about 136 t. They join wherever two of them touch, so the editor and the flight both read the
// rocket straight from its shape: no hidden attachment tree to get out of sync.
// v1.16 made rockets real size: ten times longer than before, so masses (volume) and thrust are MK = 1000× the old numbers.
// Your test-stand engine is a 2D slice a few cm across; in flight it is scaled up to the part's size the same way
// (thrust grows with the nozzle's area, Isp stays what you measured).
const UM=0.1,MK=1000;
// RCS: each block of jets pushes 250 kN in any direction it's asked and carries its own 2.5 t of monopropellant (Isp 180 s).
// The fuel's weight stays in the part's mass the whole flight: it's small next to the rocket and not worth the bookkeeping.
const RCS_F=250*MK,RCS_ISP=180,RCS_MONO=2.5*MK;
const G0=9.80665,RHO_P=360;   // bulk density of liquid hydrogen + liquid oxygen, kg/m³
const tankCap=(w,h)=>RHO_P*Math.PI*(w*UM/2)**2*(h*UM);
// solid boosters carry their own propellant, packed much denser than the liquids (real solid propellant is ~1,750 kg/m³;
// 900 allows for the hollow core);
// the bottom 2 m is the nozzle, so it holds no propellant
const RHO_S=900,SRB_NZ=20,SRB_REF=18;   // SRB_REF: a booster this wide pushes its listed thrust × MK (real SLS boosters: ~15 MN at 3.7 m)
const srbCap=(w,h)=>RHO_S*Math.PI*(w*UM/2)**2*(Math.max(0,h-SRB_NZ)*UM);
const capOf=p=>p.t==="tank"?tankCap(p.w,p.h):p.t==="srb"?srbCap(p.w,p.h):0;
const hasProp=p=>p.t==="tank"||p.t==="srb";
const isEng=p=>p.t==="engine"||p.t==="srb";
const isBrain=p=>p.t==="probe"||p.t==="capsule";   // a capsule is a probe core with a heat shield, parachutes and a crew
// engine clusters: an engine part can hold k engines side by side under one thrust plate (like SLS 4, New Glenn 7, Falcon 9 9).
// Up to 3 sit in one row; more go in two rows (the back row is drawn behind, a little higher). Each engine is ew wide.
function clusterGeo(p){const k=Math.max(1,p.k||1),E=ENG[engKey(p)],rows=k<=3?1:2,front=Math.ceil(k/rows),ew=k===1?p.w:Math.min(p.w*0.96/front,E.w*1.15),plate=k>1?5:0;
  const xs=[];for(let i=0;i<front;i++)xs.push([(i-(front-1)/2)*ew*1.02,0]);for(let i=0;i<k-front;i++)xs.push([(i-(k-front-1)/2)*ew*1.02,1]);
  return{k,ew,plate,eh:Math.round(E.h*ew/E.w),xs};}
const engH=p=>{const g=clusterGeo(p);return g.plate+g.eh;};
// thrust in readable units: kN up to 1 MN, then MN
// masses in readable units: kg up to 10 t, then tonnes
const fM=m=>m>=1e4?Math.round(m/1000).toLocaleString()+" t":Math.round(m).toLocaleString()+" kg";
const fF=F=>F>=1e6?(F/1e6).toFixed(2)+" MN":Math.round(F/1000)+" kN";
const A2=(w,r)=>(w/r)**2;   // how a part's mass (or an engine's thrust) grows with its width: by cross-section area
// ws: [default width]; wr: [narrowest, widest] the editor lets you stretch it to (free width for everything in the stack)
const PT={
  probe:  {name:"Probe core",     ws:[40], wr:[10,160], h:w=>Math.round(w*0.5), m:w=>4*MK*A2(w,60), desc:"The brain. You need one to steer, and its reaction wheels turn the rocket even with the engine off."},
  nose:   {name:"Nose cone",      ws:[40], wr:[10,160], h:w=>Math.round(w*1.6), m:w=>1.5*MK*A2(w,60), desc:"Cuts air drag a lot. Put one on top of every stack that leads the way."},
  tank:   {name:"Fuel tank",      ws:[40], wr:[10,160], h:()=>200, m:(w,h)=>MK*A2(w,60)*h/90+0.08*tankCap(w,h), desc:"Liquid hydrogen + oxygen. Shift+wheel stretches its length, Ctrl+wheel its width."},
  adapter:{name:"Adapter",        ws:[84], wr:[14,160], h:w=>40, m:w=>3*MK*A2(w,120), desc:"Joins a wide stack (below) to a narrower one (above). Set both widths in its settings."},
  engine: {name:"Engine",         ws:[30], wr:[8,120],  h:w=>w, m:()=>9*MK, desc:"An engine."},
  srb:    {name:"Solid booster",  ws:[37], wr:[10,120], h:()=>300,m:(w,h)=>2*MK*A2(w,60)*h/150+0.12*srbCap(w,h), desc:"Fuel and engine in one. Lights when you throttle up and can't be stopped or throttled until it burns out. Stretch it for a longer burn."},
  dec:    {name:"Decoupler",      ws:[40], wr:[10,160], h:()=>6,  m:w=>2*MK*A2(w,60), desc:"Space drops everything below it. Engines sitting on one stay off until it fires."},
  sdec:   {name:"Side decoupler", ws:[3],               h:()=>40, m:()=>1.5*MK, radial:1, desc:"Hang boosters on the side, almost touching the core. Space drops them (it goes with the booster)."},
  fin:    {name:"Fin",            ws:[30],              h:()=>50, m:()=>1.2*MK, radial:1, desc:"Keeps the rocket pointing where it's going while in the air."},
  rcs:    {name:"RCS thrusters",  ws:[10],              h:()=>20, m:()=>0.8*MK+RCS_MONO, radial:1, desc:"Little gas jets. T turns RCS on: they help the rocket turn (in space too), and I J K L nudge it forward, back and sideways. Own fuel."},
  capsule:{name:"Crew capsule",   ws:[50], wr:[16,120], h:w=>Math.round(w*0.66), m:w=>9*MK*A2(w,50), desc:"Orion-style capsule: the brain (like a probe core) with a heat shield underneath and parachutes (P). Come home heat-shield first."},
  les:    {name:"Escape tower",   ws:[14], wr:[6,60],  h:w=>Math.round(w*4.4), m:w=>6*MK*A2(w,14), desc:"Launch escape tower: goes on top of the capsule. ABORT (Backspace) fires it and pulls the capsule away from the rocket. It drops off by itself in space."},
  leg:    {name:"Landing leg",    ws:[30],              h:()=>90, m:()=>2.5*MK, radial:1, desc:"G deploys. Lets you land at up to 9 m/s instead of about 3."},
};
// engines: your own (numbers from the test stand) and four ready-made ones, at their default size (w × h units).
// Numbers here are at that size, in the old small units; engStat() scales them by MK and by the nozzle area of the actual part.
const ENG={
  stand:{name:"Your engine",w:30,h:46,m:9,desc:"Your engine, with the thrust and Isp it made on the test stand, scaled up to this size."},
  wren: {name:"Wren",w:22,h:32,m:5,sl:{F:1100,isp:285},vac:{F:1250,isp:322},desc:"Small and light, for sea level. Good for hoppers and landers."},
  mule: {name:"Mule",w:32,h:46,m:12,sl:{F:3300,isp:305},vac:{F:3650,isp:338},desc:"The workhorse: lots of push at sea level for its size."},
  bison:{name:"Bison",w:56,h:70,m:28,sl:{F:7500,isp:300},vac:{F:8300,isp:330},desc:"Big, powerful sea-level engine for heavy first stages."},
  vac:  {name:"Lumen Vac",w:36,h:84,m:7,sl:{F:800,isp:140},vac:{F:2600,isp:445},desc:"Huge bell for space: best Isp of all, but weak at sea level (the exhaust is over-expanded)."},
  lib:  {name:"Saved engine",w:30,h:46,m:9,desc:"An engine you tested and saved in the engine library, scaled up to this size."}};
// solid boosters: what's inside the casing. "Your booster" = your last burn on the test stand; saved ones keep a copy of their numbers
// on the part (p.n), so a rocket still flies the same after the library entry is deleted. The curve is thrust (relative to the
// average) against how much of the propellant has burned, sampled evenly from first to last.
const BOOST={
  stand:  {name:"Your booster",desc:"Your booster, with the thrust, Isp and thrust curve of your last full burn on the test stand."},
  thumper:{name:"Thumper",sl:{F:3400,isp:215},vac:{F:3750,isp:237},curve:[1.2,1.15,1.1,1.05,1,1,1,0.98,0.95,0.92,0.9,0.85],desc:"A ready-made booster: hard kick at lift-off that tapers off."},
  lib:    {name:"Saved booster",desc:"A booster you burned on the test stand and saved in the engine library."}};
const boostKey=p=>p.b&&BOOST[p.b]?p.b:"stand";
function boostStat(p){const k=boostKey(p);return scaleStat(k==="lib"&&p.n?p.n:k==="stand"?boosterNums():BOOST[k],MK*A2(p.w,SRB_REF));}
// numbers at real size: thrust × k (Isp unchanged); keeps the extra fields (curve, name, est, src)
function scaleStat(E,k){const o=Object.assign({},E);o.sl=Object.assign({},E.sl,{F:E.sl.F*k});o.vac=Object.assign({},E.vac,{F:E.vac.F*k});return o;}
// thrust multiplier when a fraction u of the propellant is gone (straight lines between the curve's samples)
function curveAt(c,u){if(!c||c.length<2)return 1;const x=Math.max(0,Math.min(1,u))*(c.length-1),i=Math.min(c.length-2,Math.floor(x));return c[i]+(c[i+1]-c[i])*(x-i);}
const ENG_ORDER=["stand","wren","mule","bison","vac"];
const engKey=p=>p.e&&ENG[p.e]?p.e:"stand";
function engStat(p){if(p.t==="srb")return boostStat(p);const k=engKey(p);return scaleStat(k==="lib"&&p.n?p.n:k==="stand"?engineNums():ENG[k],MK*A2(clusterGeo(p).ew,ENG[k].w)*(p.k||1));}
const PT_ORDER=["probe","nose","tank","adapter","engine:stand","engine:wren","engine:mule","engine:bison","engine:vac","engine:stand:4","srb:stand","srb:thumper","dec","sdec","fin","rcs","leg","capsule","les"];
let partId=1;
// t can carry a model: "engine:mule", "srb:thumper"; n = a saved library entry's numbers to copy onto the part
function mkPart(t,w,h,e,n){let b,k=1;if(t.startsWith("engine:")){e=t.slice(7);t="engine";if(e.includes(":")){k=+e.split(":")[1];e=e.split(":")[0];}}else if(t.startsWith("srb:")){b=t.slice(4);t="srb";}const d=PT[t];
  if(t==="engine"){e=e||"stand";const E=ENG[e];w=w||(k>1?Math.round(E.w*(k<=3?k:Math.ceil(k/2))*1.05):E.w);if(!h){h=engH({t,e,w,k});}}w=w||d.ws[0];const p={id:partId++,t,x:0,y:0,w,h:h||d.h(w),f:1,tw:0};if(e)p.e=e;if(t==="srb")p.b=b||"stand";
  if(t==="adapter")p.w2=Math.round(w*0.48);if(k>1)p.k=k;
  if(n)p.n=JSON.parse(JSON.stringify(n));return p;}
const partMass=p=>p.t==="engine"?ENG[engKey(p)].m*MK*A2(clusterGeo(p).ew,ENG[engKey(p)].w)*(p.k||1)+(p.k>1?0.6*MK*A2(p.w,40):0):PT[p.t].m(p.w,p.h);
const partName=p=>p.t==="engine"?(engKey(p)==="lib"&&p.n?p.n.name:ENG[engKey(p)].name)+(p.k>1?" ×"+p.k:""):p.t==="srb"?(boostKey(p)==="lib"&&p.n?p.n.name:BOOST[boostKey(p)].name):PT[p.t].name;
// a decoupler under an engine gets a shroud (interstage) that covers the engine until it separates
function shroudsOf(ps){const out=[];ps.forEach((d,i)=>{if(d.t!=="dec"||d.shed)return;let top=-1e9;
  for(const e of ps)if(e.t==="engine"&&near(e.y,d.y+d.h)&&ovl(e.x-e.w/2,e.x+e.w/2,d.x-d.w/2,d.x+d.w/2)>0.5)top=Math.max(top,e.y+e.h);
  if(top>-1e9)out.push({i,x:d.x,w:d.w,y0:d.y+d.h,y1:top});});return out;}
function drawShroud(c,s,al){c.save();c.globalAlpha=al==null?1:al;const L=s.x-s.w/2,R=s.x+s.w/2;   // black carbon interstage, like Falcon 9's
  c.fillStyle=cyl(c,L,R,[42,44,50]);c.fillRect(L,s.y0,s.w,s.y1-s.y0);c.fillStyle="rgba(255,255,255,.045)";for(let yy=s.y0+3;yy<s.y1;yy+=3)c.fillRect(L,yy,s.w,0.6);
  c.fillStyle="rgba(255,255,255,.16)";c.fillRect(L,s.y1-1.2,s.w,1.2);c.fillStyle="rgba(0,0,0,.4)";c.fillRect(s.x-0.5,s.y0,1,s.y1-s.y0);c.restore();}
const isRad=p=>!!PT[p.t].radial;
const topW=p=>p.t==="nose"||p.t==="les"?0:p.t==="capsule"?Math.round(p.w*0.34):p.t==="adapter"?(p.w2||Math.round(p.w*0.48)):p.w;
const ovl=(a0,a1,b0,b1)=>Math.min(a1,b1)-Math.max(a0,b0);
const near=(a,b)=>Math.abs(a-b)<0.01;
function touching(a,b){
  if(near(a.y+a.h,b.y)&&ovl(a.x-topW(a)/2,a.x+topW(a)/2,b.x-b.w/2,b.x+b.w/2)>0.5)return true;
  if(near(b.y+b.h,a.y)&&ovl(b.x-topW(b)/2,b.x+topW(b)/2,a.x-a.w/2,a.x+a.w/2)>0.5)return true;
  if((near(a.x+a.w/2,b.x-b.w/2)||near(b.x+b.w/2,a.x-a.w/2))&&ovl(a.y,a.y+a.h,b.y,b.y+b.h)>0.5)return true;
  return false;}
const collide=(a,b)=>ovl(a.x-a.w/2,a.x+a.w/2,b.x-b.w/2,b.x+b.w/2)>0.5&&ovl(a.y,a.y+a.h,b.y,b.y+b.h)>0.5;
function adjOf(ps){const adj=ps.map(()=>[]);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(touching(ps[i],ps[j])){adj[i].push(j);adj[j].push(i);}return adj;}
function rootIdx(ps){let r=-1;ps.forEach((p,i)=>{if(isBrain(p)&&(r<0||p.y>ps[r].y))r=i;});return r;}
function bfs(adj,start,allow){const seen=new Set([start]),q=[start];while(q.length){const i=q.pop();for(const j of adj[i])if(!seen.has(j)&&allow(j)){seen.add(j);q.push(j);}}return seen;}
// an engine sitting on a stack decoupler waits for it to fire
function engOn(ps,adj,i,inSet){const e=ps[i];for(const j of adj[i]){const d=ps[j];if(inSet&&!inSet.has(j))continue;if(d.t==="dec"&&near(d.y+d.h,e.y))return false;}return true;}
// the tanks an engine can drink from: everything joined to it without passing a decoupler
function feedOf(ps,adj,i,inSet){if(ps[i].t==="srb")return[i];   // a solid booster burns only what's inside it
  const s=bfs(adj,i,j=>(!inSet||inSet.has(j))&&ps[j].t!=="dec"&&ps[j].t!=="sdec");return[...s].filter(j=>ps[j].t==="tank").sort((a,b)=>a-b);}
// the decouplers that fire on the next Space: the lowest ones (mirror twins and anything level with them)
function nextDecs(ps,inSet){let lo=1e9;for(const i of inSet){const p=ps[i];if(p.t==="dec"||p.t==="sdec")lo=Math.min(lo,p.y+p.h/2);}
  if(lo>1e8)return[];return[...inSet].filter(i=>(ps[i].t==="dec"||ps[i].t==="sdec")&&Math.abs(ps[i].y+ps[i].h/2-lo)<3);}
// fire decouplers: what stays joined to the probe without crossing them, and the pieces that fall away
function split(ps,adj,inSet,decs,root){const D=new Set(decs);
  const keep=bfs(adj,root,j=>inSet.has(j)&&!D.has(j));
  const rest=[...inSet].filter(i=>!keep.has(i)),restS=new Set(rest),pieces=[],done=new Set();
  for(const i of rest)if(!done.has(i)){const c=bfs(adj,i,j=>restS.has(j));c.forEach(j=>done.add(j));pieces.push(c);}
  return{keep,pieces};}
// stage-by-stage Δv: burn until whatever the next decoupler drops has run dry, drop it, repeat
function analyze(ps,_eng,fuel){
  const out={stages:[],total:0,warn:[],root:rootIdx(ps),m0:0,H:0,mass:0};
  if(!ps.length){out.warn.push("Drag parts in from the left to build a rocket.");return out;}
  if(out.root<0){out.warn.push("Add a probe core. It's the brain, and the rocket is built around it.");return out;}
  const adj=adjOf(ps),all=bfs(adj,out.root,()=>true);
  const loose=ps.length-all.size;if(loose)out.warn.push(`${loose} part${loose>1?"s aren't":" isn't"} attached (shown red) and will be left behind.`);
  const F=ps.map((p,i)=>hasProp(p)?(fuel?fuel[i]:capOf(p)):0);
  let S=all,first=true,lo=1e9,hi=-1e9;for(const i of all){lo=Math.min(lo,ps[i].y);hi=Math.max(hi,ps[i].y+ps[i].h);}out.H=(hi-lo)*UM;
  const massOf=set=>{let m=0;for(const i of set)m+=partMass(ps[i])+F[i];return m;};
  out.mass=massOf(all);
  for(let k=0;k<12;k++){
    const act=[...S].filter(i=>isEng(ps[i])&&engOn(ps,adj,i,S)),decs=nextDecs(ps,S);
    const sp=decs.length?split(ps,adj,S,decs,out.root):null,drop=new Set(sp?[...S].filter(i=>!sp.keep.has(i)):[]);
    const must=decs.length?act.filter(i=>drop.has(i)):act;
    const feeds=act.map(i=>feedOf(ps,adj,i,S)),m0=massOf(S);let m=m0,dv=0,t=0;
    const est=act.map(i=>engStat(ps[i])),Fsl=est.reduce((q,e)=>q+e.sl.F,0),Fv=est.reduce((q,e)=>q+e.vac.F,0),mdE=est.map(e=>e.vac.F/(e.vac.isp*G0));
    for(let it=0;it<20;it++){
      const live=act.map((e,n)=>feeds[n].reduce((s,j)=>s+F[j],0)>1e-6);
      if(!must.some((e,n)=>live[act.indexOf(e)]))break;
      // each distinct tank group drains at the rate of the engines on it
      const grp=new Map();let FT=0;act.forEach((e,n)=>{if(!live[n])return;const key=feeds[n].join(",");const g=grp.get(key)||{tanks:feeds[n],md:0};g.md+=mdE[n];FT+=est[n].vac.F;grp.set(key,g);});
      let dt=1e9,mdT=0;for(const g of grp.values()){const f=g.tanks.reduce((s,j)=>s+F[j],0);dt=Math.min(dt,f/g.md);mdT+=g.md;}
      if(!(dt<1e8)||mdT<=0)break;
      for(const g of grp.values()){const f=g.tanks.reduce((s,j)=>s+F[j],0),use=g.md*dt;for(const j of g.tanks)F[j]=Math.max(0,F[j]-use*(f>0?F[j]/f:0));}
      const m1=m-mdT*dt,ve=FT/mdT;dv+=ve*Math.log(m/Math.max(m1,1e-6));m=m1;t+=dt;}
    out.stages.push({dv,twr:(first?Fsl:Fv)/(m0*G0),burn:t,eng:act.length,m0,decs,dropKind:decs.length?(decs.some(i=>ps[i].t==="sdec")?"boosters":"stage"):null});
    out.total+=dv;
    if(!decs.length)break;
    S=sp.keep;first=false;}
  out.m0=massOf(all);return out;}
// ---------- drawing (in centimetres, y up) ----------
function hazard(c,x0,y0,w,h,vert){c.save();c.beginPath();c.rect(x0,y0,w,h);c.clip();c.fillStyle="#1f232c";c.fillRect(x0,y0,w,h);c.fillStyle="#e8b923";
  const st=10;for(let k=-Math.max(w,h);k<Math.max(w,h)*2;k+=st*2){c.beginPath();if(vert){c.moveTo(x0,y0+k);c.lineTo(x0+w,y0+k+w);c.lineTo(x0+w,y0+k+w+st);c.lineTo(x0,y0+k+st);}else{c.moveTo(x0+k,y0);c.lineTo(x0+k+h,y0+h);c.lineTo(x0+k+h+st,y0+h);c.lineTo(x0+k+st,y0);}c.closePath();c.fill();}
  c.restore();c.strokeStyle="rgba(0,0,0,.5)";c.lineWidth=1.5;c.strokeRect(x0,y0,w,h);}
function metal(c,L,R,a,b,cA,cB){const g=c.createLinearGradient(L,0,R,0);g.addColorStop(0,a);g.addColorStop(0.42,cA);g.addColorStop(0.72,cB);g.addColorStop(1,b);return g;}
// cylinder lighting: dark at both edges, a soft highlight a third of the way across (light from the upper left), so a flat
// rectangle reads as a round tube
// tank finish: chosen per tank in the editor (p.sk); otherwise narrow tanks are white and wide ones orange foam
const TANK_SKINS=[["white","White"],["steel","Stainless"],["foam","Orange foam"]];
const tankSkin=p=>p.sk||(p.w>=120?"foam":"white");
function cyl(c,L,R,col){const g=c.createLinearGradient(L,0,R,0),sh=m=>`rgb(${col.map(v=>Math.max(0,Math.min(255,Math.round(v*m)))).join()})`;
  g.addColorStop(0,sh(0.52));g.addColorStop(0.1,sh(0.8));g.addColorStop(0.32,sh(1.07));g.addColorStop(0.48,sh(1));g.addColorStop(0.78,sh(0.76));g.addColorStop(1,sh(0.48));return g;}
// a real nozzle bell: from the throat (half-width tw at yt) it flares fast, then straightens toward the exit (half-width ew at ye).
// Top part regen-cooled (copper tubes), lower part darker; thin lines follow the cooling tubes; a lit rim at the exit.
function bell(c,x,yt,ye,tw,ew,cLow,cTop,split){const H=yt-ye,path=()=>{c.beginPath();c.moveTo(x-tw,yt);c.bezierCurveTo(x-tw-(ew-tw)*0.32,yt-H*0.22,x-ew*0.9,ye+H*0.32,x-ew,ye);
    c.lineTo(x+ew,ye);c.bezierCurveTo(x+ew*0.9,ye+H*0.32,x+tw+(ew-tw)*0.32,yt-H*0.22,x+tw,yt);c.closePath();};
  path();c.fillStyle=cyl(c,x-ew,x+ew,cLow);c.fill();c.save();c.clip();
  const sy=ye+H*(split==null?0.55:split);c.fillStyle=cyl(c,x-ew,x+ew,cTop);c.fillRect(x-ew,sy,ew*2,yt-sy);
  c.strokeStyle="rgba(0,0,0,.22)";c.lineWidth=0.6;for(let t=-0.9;t<=0.9;t+=0.15){c.beginPath();c.moveTo(x+t*tw,yt);c.lineTo(x+t*ew,ye);c.stroke();}
  c.fillStyle="rgba(0,0,0,.25)";c.fillRect(x-ew,sy-0.6,ew*2,1.2);c.restore();
  c.fillStyle="rgba(235,225,210,.55)";c.fillRect(x-ew,ye,ew*2,1.6);}
// engines: each one drawn after a real type. Mount on top, turbopump + plumbing, combustion chamber, throat, bell.
// The exit widths stay what they were, because the flame in flight starts there.
function drawEngine(c,x,y,w,h,k){const T=y+h,dk=[46,48,54],cu=[176,108,62],ch=[150,152,158];
  const pipe=(pts,wd,col)=>{c.strokeStyle=col;c.lineWidth=wd;c.lineCap="round";c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke();c.lineCap="butt";};
  const box=(x0,y0,bw,bh,col)=>{c.fillStyle=cyl(c,x0,x0+bw,col);c.fillRect(x0,y0,bw,bh);};
  const mount=(yb,hw)=>{c.beginPath();c.moveTo(x-w*0.36,T);c.lineTo(x+w*0.36,T);c.lineTo(x+hw,yb);c.lineTo(x-hw,yb);c.closePath();c.fillStyle=cyl(c,x-w*0.36,x+w*0.36,dk);c.fill();};
  if(k==="vac"){   // vacuum engine (MVac-style): small regen chamber on top, then a huge, thin, dark radiatively cooled extension
    const yt=y+h*0.74;mount(y+h*0.92,w*0.1);box(x+w*0.06,y+h*0.76,w*0.12,h*0.13,[120,124,132]);
    box(x-w*0.09,yt,w*0.18,h*0.18,ch);
    bell(c,x,yt,y,w*0.05,w*0.47,[52,54,62],cu,0.85);
    c.fillStyle="rgba(255,255,255,.07)";for(const q of[0.2,0.4])c.fillRect(x-w*0.5,y+(yt-y)*q,w,0.8);
    pipe([[x+w*0.14,y+h*0.78],[x+w*0.2,y+h*0.7]],1.6,"#3a3d44");return;}
  if(k==="bison"){   // big staged-combustion engine (BE-4 / Raptor style): squat, dense plumbing, two pumps
    const yt=y+h*0.62;mount(y+h*0.9,w*0.12);
    box(x-w*0.3,y+h*0.68,w*0.14,h*0.2,[128,132,140]);box(x+w*0.16,y+h*0.68,w*0.14,h*0.2,[128,132,140]);
    box(x-w*0.1,yt,w*0.2,h*0.26,ch);
    pipe([[x-w*0.23,y+h*0.68],[x-w*0.23,y+h*0.64],[x-w*0.1,y+h*0.64]],2.4,"#6c707a");pipe([[x+w*0.23,y+h*0.68],[x+w*0.23,y+h*0.64],[x+w*0.1,y+h*0.64]],2.4,"#6c707a");
    pipe([[x-w*0.2,y+h*0.84],[x-w*0.06,y+h*0.8]],1.8,"#8a8e98");pipe([[x+w*0.2,y+h*0.84],[x+w*0.06,y+h*0.8]],1.8,"#8a8e98");
    bell(c,x,yt,y,w*0.075,w*0.44,[64,66,72],cu,0.8);return;}
  if(k==="wren"){   // small pressure-fed engine: no pump, just valves; short bell
    const yt=y+h*0.62;mount(y+h*0.88,w*0.1);box(x-w*0.08,yt,w*0.16,h*0.26,ch);
    box(x+w*0.1,y+h*0.72,w*0.1,h*0.1,[100,104,112]);pipe([[x+w*0.15,y+h*0.72],[x+w*0.08,y+h*0.68]],1.4,"#7a7e88");
    bell(c,x,yt,y,w*0.06,w*0.3,[70,72,78],cu,0.78);return;}
  // your engine / Mule / saved engines: gas-generator kerosene-style engine (Merlin-like): pump on one side, its exhaust pipe down the bell
  const yt=y+h*0.7,sd=k==="mule"?-1:1;mount(y+h*0.92,w*0.1);
  box(x-w*0.1,yt,w*0.2,h*0.22,ch);c.fillStyle="rgba(0,0,0,.2)";c.fillRect(x-w*0.1,y+h*0.86,w*0.2,1);   // chamber + injector-head line
  box(x+sd*w*0.12-(sd<0?w*0.14:0),y+h*0.72,w*0.14,h*0.16,[120,124,132]);                                    // turbopump
  bell(c,x,yt,y,w*0.065,w*0.4,[64,66,72],cu,0.8);
  pipe([[x+sd*w*0.2,y+h*0.72],[x+sd*w*0.24,y+h*0.5],[x+sd*w*0.34,y+h*0.1]],2.4,"#2c2e33");   // gas-generator exhaust
  pipe([[x+sd*w*0.13,y+h*0.78],[x+sd*w*0.08,y+h*0.75]],1.6,"#8a8e98");}
// frost on a cryogenic tank: the super-cold propellant freezes the air's moisture onto the skin, so it shows exactly up to
// the fuel level. k (0..1) fades it as it flakes off on the way up. Patchy streaks from a fixed hash, so it doesn't flicker.
function frost(c,L,w,y,h,fuel,k){const fh=h*Math.max(0,Math.min(1,fuel==null?1:fuel));if(fh<2)return;c.save();c.beginPath();c.rect(L,y,w,fh);c.clip();
  c.fillStyle=`rgba(236,242,248,${0.55*k})`;c.fillRect(L,y,w,fh);
  for(let i=0,n=w*fh/14;i<n;i++){const xx=L+(i*37.7)%w,yy=y+(i*53.3)%fh,a=(0.15+((i*7)%5)*0.06)*k;c.fillStyle=i%3?`rgba(255,255,255,${a})`:`rgba(170,185,200,${a*0.8})`;c.fillRect(xx,yy,0.6+(i%3)*0.5,2+(i%4)*2.5);}
  c.fillStyle=`rgba(255,255,255,${0.5*k})`;c.fillRect(L,y+fh-0.8,w,0.8);c.restore();}
function drawPart(c,p,o={}){
  const{x,y,w,h,f}=p,L=x-w/2,R=x+w/2,T=y+h;
  c.lineJoin="round";
  switch(p.t){
    case"tank":{const sk=tankSkin(p);
      if(sk==="steel"){   // bare stainless steel, Starship-style: a sharp mirror highlight, brushed grain, welded rings with a slight heat tint
        const g=c.createLinearGradient(L,0,R,0);[[0,"#4b4f56"],[0.07,"#8f949c"],[0.2,"#dfe2e6"],[0.28,"#fbfcfd"],[0.34,"#c7cbd1"],[0.55,"#8d9299"],[0.8,"#b3b7be"],[0.92,"#7d8289"],[1,"#41454c"]].forEach(([q,cc])=>g.addColorStop(q,cc));
        c.fillStyle=g;c.fillRect(L,y,w,h);
        for(let i=0;i<w*1.4;i++){const xx=L+(i*37.31)%w;c.fillStyle=i%3?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)";c.fillRect(xx,y,0.5,h);}
        let n=0;for(let yy=y+22;yy<T-8;yy+=22,n++){c.fillStyle=n%2?"rgba(190,140,90,.05)":"rgba(120,140,170,.05)";c.fillRect(L,yy-22,w,22);
          c.fillStyle="rgba(0,0,0,.22)";c.fillRect(L,yy,w,0.7);c.fillStyle="rgba(255,255,255,.18)";c.fillRect(L,yy+0.7,w,0.5);}
        c.fillStyle="rgba(0,0,0,.3)";c.fillRect(L,y+2,w,1);c.fillRect(L,T-3,w,1);if(o.frost>0)frost(c,L,w,y,h,o.fuel,o.frost);break;}
      const foam=sk==="foam";
      // white: painted Falcon-style skin; foam: SLS-style orange spray-on insulation (mottled)
      c.fillStyle=cyl(c,L,R,foam?[196,96,36]:[236,238,241]);c.fillRect(L,y,w,h);
      if(foam){   // like the SLS core in sunlight: burnt orange, uneven where the foam was sprayed in passes, faint vertical streaks
        for(let i=0;i<w*0.6;i++){const xx=L+(i*41.7)%w,a=0.03+((i*7)%5)*0.012;c.fillStyle=i%2?`rgba(90,35,5,${a})`:`rgba(255,190,130,${a*0.7})`;c.fillRect(xx,y,1+(i%3),h);}
        for(let i=0,n=w*h/700;i<n;i++){const px=L+(i*73.7)%w,py=y+(i*37.3)%h;c.fillStyle=i%2?"rgba(100,40,8,.045)":"rgba(255,200,150,.04)";c.beginPath();c.ellipse(px,py,4+(i%4),2+(i%3),0,0,6.2832);c.fill();}
        if(h>=90){const ib=Math.min(16,h*0.12);c.fillStyle=cyl(c,L,R,[178,84,30]);c.fillRect(L,T-ib-3,w,ib);   // intertank: ribbed band near the top
          c.fillStyle="rgba(70,25,0,.22)";for(let xx=L+2;xx<R;xx+=3.2)c.fillRect(xx,T-ib-3,0.9,ib);c.fillStyle="rgba(0,0,0,.2)";c.fillRect(L,T-ib-3,w,0.8);c.fillRect(L,T-3,w,0.8);}}
      c.fillStyle="rgba(0,0,0,.2)";c.fillRect(L,y+2.5,w,1);c.fillRect(L,T-3.5,w,1);                 // dome welds at each end
      c.fillStyle="rgba(0,0,0,.06)";for(let yy=y+40;yy<T-15;yy+=40)c.fillRect(L,yy,w,0.8);           // barrel-section welds
      if(h>=45){const rx=L+w*0.74;c.fillStyle=cyl(c,rx,rx+4,foam?[170,88,36]:[205,208,214]);c.fillRect(rx,y+5,4,h-10);   // cable raceway running down the side
        c.fillStyle="rgba(0,0,0,.18)";c.fillRect(rx+4,y+5,0.8,h-10);}
      if(o.frost>0)frost(c,L,w,y,h,o.fuel,o.frost);
      break;}
    case"probe":{   // avionics ring in black carbon composite, an access hatch and two vents
      c.fillStyle=cyl(c,L,R,[44,46,52]);c.fillRect(L,y,w,h);
      c.fillStyle="rgba(255,255,255,.05)";for(let yy=y+3;yy<T;yy+=3)c.fillRect(L,yy,w,0.6);
      c.fillStyle="rgba(255,255,255,.14)";c.fillRect(L,y,w,1.2);c.fillRect(L,T-1.2,w,1.2);
      c.strokeStyle="rgba(255,255,255,.22)";c.lineWidth=0.8;c.strokeRect(x+w*0.08,y+h*0.25,w*0.22,h*0.5);
      c.fillStyle="rgba(0,0,0,.4)";for(const q of[-0.32,-0.24])c.fillRect(x+w*q,y+h*0.62,2.5,2);break;}   // two vent holes
    case"nose":{   // payload fairing: a smooth white ogive with the split line down the middle (or a straight cone: SLS booster tips)
      c.beginPath();if(p.ns==="cone"){c.moveTo(L,y);c.lineTo(x-w*0.04,T-1.5);c.quadraticCurveTo(x,T+0.5,x+w*0.04,T-1.5);c.lineTo(R,y);c.closePath();}else{c.moveTo(L,y);c.bezierCurveTo(L,y+h*0.42,x-w*0.22,y+h*0.86,x-w*0.03,T-0.6);c.quadraticCurveTo(x,T+0.3,x+w*0.03,T-0.6);c.bezierCurveTo(x+w*0.22,y+h*0.86,R,y+h*0.42,R,y);c.closePath();}
      c.fillStyle=cyl(c,L,R,[240,241,244]);c.fill();c.save();c.clip();
      c.fillStyle="rgba(0,0,0,.18)";c.fillRect(x-0.5,y,1,h);c.fillStyle="rgba(0,0,0,.25)";c.fillRect(L,y,w,2);
      c.fillStyle="rgba(0,0,0,.05)";c.fillRect(L,y+h*0.3,w,0.8);c.restore();break;}
    case"adapter":{   // carbon interstage cone
      const tw2=topW(p)/2;c.beginPath();c.moveTo(L,y);c.lineTo(x-tw2,T);c.lineTo(x+tw2,T);c.lineTo(R,y);c.closePath();c.fillStyle=cyl(c,L,R,[46,48,54]);c.fill();
      c.save();c.clip();c.fillStyle="rgba(255,255,255,.05)";for(let yy=y+3;yy<T;yy+=3)c.fillRect(L,yy,w,0.6);c.restore();
      c.fillStyle="rgba(255,255,255,.16)";c.fillRect(L,y,w,1.2);c.fillRect(x-tw2,T-1.2,tw2*2,1.2);break;}
    case"engine":{const g=clusterGeo(p);if(g.k===1){drawEngine(c,x,y,w,h,engKey(p));break;}
      for(const[ex,row]of g.xs.slice().sort((a,b)=>b[1]-a[1])){c.save();if(row){c.globalAlpha=0.75;}drawEngine(c,x+ex+(row?g.ew*0.51:0),y+(row?2:0),g.ew,g.eh,engKey(p));c.restore();}
      c.fillStyle=cyl(c,L,R,[70,73,80]);c.fillRect(L,T-g.plate,w,g.plate);c.fillStyle="rgba(0,0,0,.35)";c.fillRect(L,T-g.plate,w,0.8);break;}   // thrust plate on top
    case"capsule":{   // Orion-style: a blunt cone of white panels, dark heat shield underneath, two windows, docking ring on top
      const tw=topW(p)/2;c.beginPath();c.moveTo(L,y+2);c.lineTo(x-tw,T-2);c.lineTo(x+tw,T-2);c.lineTo(R,y+2);c.closePath();c.fillStyle=cyl(c,L,R,[226,228,232]);c.fill();
      c.save();c.clip();c.strokeStyle="rgba(0,0,0,.12)";c.lineWidth=0.5;for(let yy=y+6;yy<T;yy+=5){c.beginPath();c.moveTo(L,yy);c.lineTo(R,yy);c.stroke();}c.restore();
      c.fillStyle="#2b2723";c.beginPath();c.moveTo(L-0.5,y);c.lineTo(R+0.5,y);c.lineTo(R,y+2.5);c.lineTo(L,y+2.5);c.closePath();c.fill();   // heat shield
      c.fillStyle="#1d2128";for(const q of[-0.18,0.05]){const wx=x+q*w,wy=y+h*0.55;c.beginPath();c.moveTo(wx,wy);c.lineTo(wx+w*0.09,wy);c.lineTo(wx+w*0.08,wy+h*0.13);c.lineTo(wx+w*0.01,wy+h*0.13);c.closePath();c.fill();}
      c.fillStyle=cyl(c,x-tw,x+tw,[150,154,162]);c.fillRect(x-tw,T-2.4,tw*2,2.4);break;}
    case"les":{   // launch escape tower: a nose spike, the abort motor with four angled nozzles, the jettison motor and a truss
      const mw=w*0.5;c.fillStyle=cyl(c,L,R,[200,202,206]);c.beginPath();c.moveTo(L,y);c.lineTo(x-mw*0.6,y+h*0.25);c.lineTo(x+mw*0.6,y+h*0.25);c.lineTo(R,y);c.closePath();c.fill();
      c.strokeStyle="#9aa0a8";c.lineWidth=0.6;c.beginPath();c.moveTo(x-mw*0.6,y+h*0.25);c.lineTo(x+mw*0.6,y+h*0.32);c.moveTo(x+mw*0.6,y+h*0.25);c.lineTo(x-mw*0.6,y+h*0.32);c.stroke();
      c.fillStyle=cyl(c,x-mw/2,x+mw/2,[232,233,236]);c.fillRect(x-mw/2,y+h*0.32,mw,h*0.5);c.fillStyle="#2a2d33";for(const sd of[-1,1]){c.beginPath();c.moveTo(x+sd*mw/2,y+h*0.52);c.lineTo(x+sd*mw*0.85,y+h*0.47);c.lineTo(x+sd*mw/2,y+h*0.6);c.fill();}
      c.fillStyle="#c23b2e";c.fillRect(x-mw/2,y+h*0.74,mw,1.2);c.fillStyle="#d8dade";c.beginPath();c.moveTo(x-mw/2,y+h*0.82);c.lineTo(x,T);c.lineTo(x+mw/2,y+h*0.82);c.fill();break;}
    case"srb":{const cy=y+SRB_NZ;   // SLS-style solid booster: white steel segments, an aft skirt, and a gimballed nozzle
      bell(c,x,cy-2,y,w*0.12,w*0.36,[60,62,68],[92,88,84]);
      c.fillStyle=cyl(c,L,R,[236,237,240]);c.fillRect(L,cy,w,T-cy);
      c.fillStyle=cyl(c,L-2,R+2,[214,216,222]);c.fillRect(L,cy,w,10);                                // aft skirt
      c.fillStyle="rgba(0,0,0,.25)";c.fillRect(L,cy+10,w,1);
      const seg=T-cy-10;c.fillStyle="rgba(60,64,72,.55)";for(const k of[0.25,0.5,0.75]){const yy=cy+10+seg*k;c.fillRect(L,yy-1.5,w,3);}   // field joints between the segments
      c.fillStyle="rgba(0,0,0,.3)";c.fillRect(L,T-3,w,3);
      break;}
    case"dec":{   // separation ring: dark structure, a bright pyro line where it splits, and its bolts
      c.fillStyle=cyl(c,L,R,[70,73,80]);c.fillRect(L,y,w,h);c.fillStyle="rgba(230,232,236,.8)";c.fillRect(L,y+h/2-0.7,w,1.4);
      c.fillStyle="rgba(0,0,0,.35)";for(let xx=L+5;xx<R-2;xx+=9)c.fillRect(xx,y+2,2,2);break;}
    case"sdec":{   // side attach strut with its separation bolts
      c.fillStyle=cyl(c,L,R,[64,67,74]);c.fillRect(L+2,y+6,w-4,h-12);c.fillStyle=cyl(c,L,R,[150,154,162]);c.fillRect(L,y+4,w,5);c.fillRect(L,T-9,w,5);
      c.fillStyle="rgba(255,255,255,.75)";c.fillRect(L+2,y+h/2-0.6,w-4,1.2);break;}
    case"fin":{const ix=f>0?L:R,ox=f>0?R:L;c.beginPath();c.moveTo(ix,T);c.lineTo(ox,y+h*0.18);c.lineTo(ox,y);c.lineTo(ix,y);c.closePath();
      c.fillStyle=cyl(c,Math.min(ix,ox),Math.max(ix,ox),[58,61,68]);c.fill();c.strokeStyle="rgba(210,214,222,.7)";c.lineWidth=1.5;   // carbon fin, titanium leading edge
      c.beginPath();c.moveTo(ix,T);c.lineTo(ox,y+h*0.18);c.stroke();c.strokeStyle="rgba(0,0,0,.35)";c.lineWidth=1;c.beginPath();c.moveTo(ix,y);c.lineTo(ox,y);c.stroke();break;}
    case"rcs":{const ix=f>0?L:R,ox=f>0?R:L,cx=(L+R)/2;c.fillStyle=cyl(c,L,R,[228,230,234]);c.fillRect(L,y+6,w,h-12);c.fillStyle="rgba(0,0,0,.2)";c.fillRect(ix,y+6,f*2,h-12);   // white thruster pod (Dragon-style)
      c.fillStyle="#1b1e26";for(const[ax,ay,bx,by]of[[cx,y+6,cx,y],[cx,T-6,cx,T],[ox-f*2,y+h/2,ox+f*4,y+h/2]]){const nx=by===ay?0:3,ny=by===ay?3:0;c.beginPath();c.moveTo(ax-nx*0.6,ay-ny*0.6);c.lineTo(bx-nx,by-ny);c.lineTo(bx+nx,by+ny);c.lineTo(ax+nx*0.6,ay+ny*0.6);c.closePath();c.fill();}
      if(o.puff)for(const[px,py,dx,dy]of o.puff){c.fillStyle="rgba(240,244,255,.75)";c.beginPath();c.moveTo(px,py);c.lineTo(px+dx*16-dy*5,py+dy*16-dx*5);c.lineTo(px+dx*16+dy*5,py+dy*16+dx*5);c.closePath();c.fill();}
      break;}
    case"leg":{const ix=f>0?L:R,dep=o.legs,hx=ix,hy=y+5;
      const quad=(ax,ay,bx,by,wa,wb,col)=>{const dx=bx-ax,dy=by-ay,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;c.beginPath();c.moveTo(ax+nx*wa/2,ay+ny*wa/2);c.lineTo(bx+nx*wb/2,by+ny*wb/2);c.lineTo(bx-nx*wb/2,by-ny*wb/2);c.lineTo(ax-nx*wa/2,ay-ny*wa/2);c.closePath();c.fillStyle=col;c.fill();};
      if(!dep){   // folded flat against the tank, foot at the top (like a Falcon 9 leg)
        quad(hx+f*7,y+2,hx+f*6,T-12,13,8,"#2a2c31");c.fillStyle="#4b5263";c.fillRect(hx+f*7-1,y+10,2,h-26);
        c.fillStyle="#1b1e26";c.fillRect(hx+f*6-7,T-12,14,8);c.fillStyle="#9aa3b5";c.fillRect(hx+(f>0?0:-4),y,4,8);}
      else{const fx=ix+f*63,fy=y-80,kx=hx+(fx-hx)*0.55,ky=hy+(fy+6-hy)*0.55;
        c.strokeStyle="#d8dbe0";c.lineWidth=4;c.lineCap="round";c.beginPath();c.moveTo(ix+f*2,y+62);c.lineTo(kx,ky);c.stroke();   // shock strut
        c.strokeStyle="#5a6070";c.lineWidth=6;c.beginPath();c.moveTo(ix+f*2,y+62);c.lineTo(ix+(kx-ix)*0.45,y+62+(ky-y-62)*0.45);c.stroke();c.lineCap="butt";
        quad(hx,hy,fx,fy+6,14,8,"#2a2c31");c.strokeStyle="#4b5263";c.lineWidth=1.5;c.beginPath();c.moveTo(hx+(fx-hx)*0.1,hy+(fy-hy)*0.1);c.lineTo(hx+(fx-hx)*0.85,hy+(fy+6-hy)*0.85);c.stroke();
        c.fillStyle="#1b1e26";c.beginPath();c.moveTo(fx-14,fy);c.lineTo(fx+14,fy);c.lineTo(fx+9,fy+8);c.lineTo(fx-9,fy+8);c.closePath();c.fill();
        c.fillStyle="#9aa3b5";c.beginPath();c.arc(hx,hy,3.5,0,6.2832);c.fill();}
      break;}
  }
  if(o.sel||o.bad||o.ghost){c.save();c.lineWidth=o.lw||3;c.strokeStyle=o.bad?"#ff4d3a":o.sel?"#ffcf7a":"rgba(255,255,255,.5)";c.setLineDash(o.ghost?[6,5]:[]);c.strokeRect(L-2,y-2,w+4,h+4);
    if(o.bad){c.fillStyle="rgba(255,60,40,.22)";c.fillRect(L,y,w,h);}c.restore();}
}
// ---------- centre of mass, lift and thrust (backlog 6) ----------
// mass: every part with its propellant. lift: where the air pushes sideways when the rocket flies at an angle, taken as the middle
// of the side area (fins count double, they're made to catch the air). thrust: where the engines that light first push.
// A rocket is stable in the air when the centre of lift is BELOW the centre of mass (like the feathers on an arrow).
function centres(ps){if(!ps.length)return null;let m=0,mx=0,my=0,A=0,ax=0,ay=0,F=0,fx=0,fy=0;const adj=adjOf(ps),all=new Set(ps.keys());
  ps.forEach((p,i)=>{const pm=partMass(p)+(p.fuel!=null?p.fuel:capOf(p));m+=pm;mx+=pm*p.x;my+=pm*(p.y+p.h/2);
    const a=p.w*p.h*(p.t==="fin"?2:p.t==="nose"||p.t==="les"?0.5:p.t==="engine"||p.t==="srb"&&false?0.6:1)*(p.t==="rcs"?0.3:1);A+=a;ax+=a*p.x;ay+=a*(p.y+p.h*(p.t==="nose"?0.33:0.5));
    if(isEng(p)&&engOn(ps,adj,i,all)){const f=engStat(p).sl.F;F+=f;fx+=f*p.x;fy+=f*p.y;}});
  return{com:[mx/m,my/m],col:A?[ax/A,ay/A]:null,cot:F?[fx/F,fy/F]:null};}
// draw the three markers (in part units; k = how many part units one screen pixel is, so the markers stay the same size on screen)
function drawCentres(c,cn,k,labels){if(!cn)return;const R=9*k;c.save();c.lineWidth=1.5*k;
  if(cn.cot){const[x,y]=cn.cot;c.strokeStyle="#ff3b2f";c.fillStyle="#ff3b2f";c.beginPath();c.moveTo(x,y-R*2.6);c.lineTo(x,y-R*0.6);c.stroke();c.beginPath();c.moveTo(x,y-R*0.2);c.lineTo(x-R*0.55,y-R*1.1);c.lineTo(x+R*0.55,y-R*1.1);c.closePath();c.fill();}   // thrust: an arrow pushing up
  if(cn.col){const[x,y]=cn.col;c.strokeStyle="#6fc3ff";c.fillStyle="rgba(111,195,255,.25)";c.beginPath();c.arc(x,y,R*0.85,0,6.2832);c.fill();c.stroke();c.fillStyle="#6fc3ff";c.beginPath();c.arc(x,y,R*0.3,0,6.2832);c.fill();}
  {const[x,y]=cn.com;c.fillStyle="#111";c.beginPath();c.arc(x,y,R,0,6.2832);c.fill();c.fillStyle="#ffd23f";for(const q of[0,2]){c.beginPath();c.moveTo(x,y);c.arc(x,y,R,q*Math.PI/2,(q+1)*Math.PI/2);c.closePath();c.fill();}
    c.strokeStyle="#fff";c.beginPath();c.arc(x,y,R,0,6.2832);c.stroke();}   // mass: the classic quartered disc
  if(labels){c.scale(1,-1);c.font=`600 ${10*k}px system-ui,sans-serif`;c.textBaseline="middle";const lab=(p,t,col)=>{if(!p)return;c.fillStyle=col;c.fillText(t,p[0]+R*1.4,-p[1]);};
    lab(cn.com,"MASS","#ffd23f");lab(cn.col,"LIFT","#6fc3ff");if(cn.cot)lab([cn.cot[0],cn.cot[1]-R*1.4],"THRUST","#ff3b2f");}
  c.restore();}
// lowest points of a rocket, for touching the ground (centimetres, local)
function contactPts(ps,legs){const pts=[];
  for(const p of ps){if(p.t==="leg"&&legs){pts.push([p.x+p.f*48,p.y-80,1]);continue;}
    if(p.t==="fin"||p.t==="leg")continue;
    pts.push([p.x-p.w/2,p.y,0],[p.x+p.w/2,p.y,0],[p.x-p.w/2,p.y+p.h,0],[p.x+p.w/2,p.y+p.h,0]);}
  return pts;}
// ---------- rockets saved before v1.16 ----------
// Back then parts were small and chunky: engines and tanks 60 units wide, decouplers 15 tall, fins 45 wide. Loaded today those
// numbers make engines ~4× too strong for tanks that hold a fraction of the fuel, so an old rocket flies wrong. oldScale spots
// one by a part only the old catalogue made; upscaleOld rebuilds it with today's parts: same layout, each part swapped for its
// modern size (tanks 2/3 as wide and 2.4× as long, standard-size engines, thin decouplers), stacks re-stacked from the bottom
// up, side parts re-hung on whatever they were hanging on.
const OLD_ENG={stand:[60,60],wren:[60,45],mule:[60,60],bison:[120,90],vac:[60,105],lib:[60,60]};
function oldScale(ps){return Array.isArray(ps)&&ps.some(p=>p.t==="dec"&&p.h===15||p.t==="sdec"&&p.w===15||p.t==="fin"&&p.w===45||
  p.t==="engine"&&!p.k&&OLD_ENG[p.e||"stand"]&&p.w===OLD_ENG[p.e||"stand"][0]&&p.h===OLD_ENG[p.e||"stand"][1]);}
function upscaleOld(ps){
  const r=Math.round,clampW=(t,w)=>PT[t].wr?Math.max(PT[t].wr[0],Math.min(PT[t].wr[1],w)):w;
  const size=p=>{const t=p.t;let w,h;
    if(t==="tank"){w=clampW(t,r(p.w*2/3));h=r(p.h*2.4);}
    else if(t==="srb"){w=clampW(t,r(p.w*0.3));h=r(p.h*1.73);}   // the old 60×150 booster becomes the Sparrow's 18×260
    else if(t==="engine"){const e=p.e||"stand",o=OLD_ENG[e]||[60,60];w=clampW(t,r(ENG[e].w*p.w/o[0]));h=engH({t,e,w,k:1});}
    else if(PT[t].radial){w=PT[t].ws[0];h=PT[t].h(w);}
    else{w=clampW(t,r(p.w*2/3));h=PT[t].h(w);}
    return{w,h};};
  const q=ps.map(p=>({p,o:{x:p.x,y:p.y,w:p.w,h:p.h},n:size(p),nx:null,ny:null}));
  const touchY=(a,b)=>Math.abs(b.o.y-(a.o.y+a.o.h))<0.6&&Math.abs(a.o.x-b.o.x)<(a.o.w+b.o.w)/2-0.5;   // b sits on a
  const stack=q.filter(e=>!PT[e.p.t].radial).sort((a,b)=>a.o.y-b.o.y);
  const centre=()=>stack.filter(e=>Math.abs(e.o.x)<0.5&&e.ny!=null);
  for(const e of stack){
    const below=stack.filter(a=>a!==e&&a.ny!=null&&touchY(a,e));
    if(below.length){e.ny=Math.max(...below.map(a=>a.ny+a.n.h));
      if(e.p.t==="nose"&&below.length===1){e.n.w=Math.min(e.n.w,below[0].n.w);e.n.h=PT.nose.h(e.n.w);}   // a nose no wider than what it caps
      continue;}
    // nothing under it: the bottom of the rocket (y 0), or a side booster hung from a decoupler: same height on the core as before
    const c=centre().find(a=>e.o.y>=a.o.y-0.5&&e.o.y<=a.o.y+a.o.h+0.5);
    e.ny=e.o.y<0.5||!c?0:c.ny+(e.o.y-c.o.y)/c.o.h*c.n.h;
  }
  // side columns (boosters): every part in one keeps one centre line, set so the column's widest point sits flush against the
  // core beside it, with a thin decoupler's width between them if there was a gap for one before
  const cols=new Map();for(const e of stack)if(Math.abs(e.o.x)>=0.5){const k=Math.round(e.o.x*2);if(!cols.has(k))cols.set(k,[]);cols.get(k).push(e);}
  for(const e of stack)if(Math.abs(e.o.x)<0.5)e.nx=0;
  for(const col of cols.values()){const sd=Math.sign(col[0].o.x);let x=0;
    for(const e of col){const old=centre().filter(a=>a.o.y<e.o.y+e.o.h&&a.o.y+a.o.h>e.o.y),cw=old.length?Math.max(...old.map(a=>a.o.w)):0,
        now=centre().filter(a=>a.ny<e.ny+e.n.h-0.5&&a.ny+a.n.h>e.ny+0.5),ncw=now.length?Math.max(...now.map(a=>a.n.w)):0,
        gap=Math.abs(e.o.x)-e.o.w/2-cw/2;
      x=Math.max(x,ncw/2+(gap>1?PT.sdec.ws[0]:0)+e.n.w/2);}
    for(const e of col)e.nx=sd*x;}
  // side parts (fins, legs, side decouplers): find what they hung on, then put them at the same place on its new shape
  for(const e of q){if(!PT[e.p.t].radial)continue;
    // a side decoupler must touch both: hang it on the booster's inner edge, at a height where the core beside it is widest
    if(e.p.t==="sdec"){const bo=stack.find(a=>Math.abs(a.o.x)>Math.abs(e.o.x)&&Math.abs(Math.abs(a.o.x-e.o.x)-(a.o.w/2+e.o.w/2))<1.5&&e.o.y<a.o.y+a.o.h&&e.o.y+e.o.h>a.o.y);
      const near=bo&&centre().filter(a=>a.ny<bo.ny+bo.n.h&&a.ny+a.n.h>bo.ny).sort((a,b)=>b.n.w-a.n.w)[0];
      if(bo&&near){const sd=Math.sign(e.o.x),lo=Math.max(bo.ny,near.ny),hi=Math.min(bo.ny+bo.n.h,near.ny+near.n.h);
        e.ny=Math.max(lo,Math.min(hi-e.n.h,lo+(hi-lo-e.n.h)*0.3));e.nx=bo.nx-sd*(bo.n.w/2+e.n.w/2);continue;}}
    const hosts=stack.filter(a=>Math.abs(Math.abs(e.o.x-a.o.x)-(a.o.w/2+e.o.w/2))<1.5&&e.o.y<a.o.y+a.o.h&&e.o.y+e.o.h>a.o.y);
    const h=hosts.sort((a,b)=>Math.abs(a.o.x)-Math.abs(b.o.x))[0];
    if(!h){e.nx=e.o.x*2/3;e.ny=e.o.y;continue;}
    const sd=Math.sign(e.o.x-h.o.x)||1;e.ny=h.ny+Math.max(0,Math.min(1,(e.o.y-h.o.y)/h.o.h))*h.n.h;
    if(e.ny+e.n.h>h.ny+h.n.h)e.ny=Math.max(h.ny,h.ny+h.n.h-e.n.h);
    // against the widest part of that stack beside it (an engine below a tank is narrower: hung on it, it would float off the tank)
    const side=stack.filter(a=>Math.abs(a.nx-h.nx)<0.5&&a.ny<e.ny+e.n.h-0.5&&a.ny+a.n.h>e.ny+0.5),hw=Math.max(h.n.w,...side.map(a=>a.n.w));
    e.nx=h.nx+sd*(hw/2+e.n.w/2);}
  for(const e of q){const p=e.p;p.w=e.n.w;p.h=e.n.h;p.x=e.nx;p.y=e.ny;if(p.t==="adapter")p.w2=r(p.w*0.5);}
  return ps;}
// ready-made rockets
function tpl(name){const A=[];const add=(t,x,y,w,h,f)=>{const p=mkPart(t,w,h);p.x=x;p.y=y;p.f=f||1;A.push(p);return p;};
  const pair=(t,x,y,w,h)=>{const a=add(t,x,y,w,h,1),b=add(t,-x,y,w,h,-1);a.tw=b.id;b.tw=a.id;};
  // a stack, bottom to top: each entry [type, width, height]; returns the top y. Units are 10 cm.
  const stack=(y,list)=>{for(const[t,w,h]of list){const p=add(t,0,y,w,h);y+=p.h;}return y;};
  const W=40;   // 4 m core, Falcon-like
  if(name==="hopper"){stack(0,[["engine",30],["tank",W,120],["probe",W],["nose",W]]);pair("leg",W/2+15,46);}
  else if(name==="orbiter"){stack(0,[["engine",30],["tank",W,215],["dec",W],["engine:stand",30],["tank",W,110],["probe",W],["nose",W]]);pair("fin",W/2+15,46);}
  else if(name==="heavy"){const top=stack(0,[["engine",30],["tank",W,360],["dec",W],["engine:vac",30],["tank",W,140],["probe",W],["nose",W]]);
    const bw=34,bx=W/2+3+bw/2,mh=mkPart("engine:mule",30).h;pair("sdec",W/2+1.5,90);pair("engine:mule",bx,0,30);pair("tank",bx,mh,bw,300);pair("nose",bx,mh+300,bw);pair("fin",bx+bw/2+15,mh);}
  else if(name==="sparrow"){   // the Orbiter with two solid boosters strapped on, flush to the core: they light with the throttle; Space drops them
    stack(0,[["engine",30],["tank",W,250],["dec",W],["engine:stand",30],["tank",W,110],["probe",W],["nose",W]]);
    const bw=18,bx=W/2+3+bw/2;pair("sdec",W/2+1.5,60);pair("srb:thumper",bx,0,bw,260);pair("nose",bx,260,bw);pair("fin",bx+bw/2+15,0);}
  else if(name==="lander"){const y=stack(0,[["engine:bison",56],["tank",84,160],["adapter",84],["dec",W],["engine:wren",22],["tank",W,90],["probe",W],["nose",W]]);
    pair("leg",W/2+15,A.find(p=>p.t==="engine"&&p.e==="wren").y+32);pair("fin",84/2+15,70);}
  else if(name==="sls"){   // SLS proportions: an 8.4 m orange core with a 4-engine cluster, two slim 3.7 m solid boosters flush to its
    // sides with pointed noses, an upper stage with a vacuum engine, a service module, and an Orion-style capsule with its escape tower
    // core 48 m, boosters 44 m (v1.30; were 60 and 54): the long core alone had a thrust-to-weight of 1.1 after the boosters left,
    // so the climb to orbit took ~14 minutes and it arrived with 490 t of fuel unused. Now it gets there in ~7, like the others.
    const C=84,eng=add("engine:stand:4",0,0,C);let y=eng.h;
    const core=add("tank",0,y,C,480);core.sk="foam";y+=480;
    const ad=add("adapter",0,y,C,50);ad.w2=50;y+=50;
    y=stack(y,[["dec",50],["engine:vac",28],["tank",50,80],["dec",50],["engine:wren",22],["tank",50,36],["capsule",50],["les",14]]);
    const bw=37,bx=C/2+3+bw/2;pair("sdec",C/2+1.5,200);pair("srb:thumper",bx,0,bw,440);pair("nose",bx,440,bw,80);for(const p of A)if(p.t==="nose"&&p.w===bw)p.ns="cone";}
  return A;}
