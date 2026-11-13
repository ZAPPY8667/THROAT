// ================= PARTS & VEHICLES =================
// Parts are rectangles in centimetres: x = centre, y = bottom. They join wherever two of them touch, so the editor
// and the flight both read the rocket straight from its shape: no hidden attachment tree to get out of sync.
// RCS: each block of jets pushes 45 N in any direction it's asked and carries its own 2.5 kg of monopropellant (Isp 180 s).
// The fuel's weight stays in the part's mass the whole flight: 2.5 kg makes no difference worth the bookkeeping.
const RCS_F=45,RCS_ISP=180,RCS_MONO=2.5;
const G0=9.80665,RHO_P=360;   // bulk density of liquid hydrogen + liquid oxygen, kg/m³
const tankCap=(w,h)=>RHO_P*Math.PI*(w/200)**2*(h/100);
// solid boosters carry their own propellant, packed denser than the liquids (a game number: heavy, but not a brick);
// the bottom 20 cm is the nozzle, so it holds no propellant
const RHO_S=220,SRB_NZ=20;
const srbCap=(w,h)=>RHO_S*Math.PI*(w/200)**2*(Math.max(0,h-SRB_NZ)/100);
const capOf=p=>p.t==="tank"?tankCap(p.w,p.h):p.t==="srb"?srbCap(p.w,p.h):0;
const hasProp=p=>p.t==="tank"||p.t==="srb";
const isEng=p=>p.t==="engine"||p.t==="srb";
const PT={
  probe:  {name:"Probe core",     ws:[60],     h:()=>30, m:()=>4,   desc:"The brain. You need one to steer, and its reaction wheels turn the rocket even with the engine off."},
  nose:   {name:"Nose cone",      ws:[60,120], h:w=>w,   m:w=>w>60?4:1.5, desc:"Cuts air drag a lot. Put one on top of every stack that leads the way."},
  tank:   {name:"Fuel tank",      ws:[60,120], h:()=>90, m:(w,h)=>1+0.08*tankCap(w,h), desc:"Liquid hydrogen + oxygen. Shift+wheel or − / + to change its length."},
  adapter:{name:"Adapter",        ws:[120],    h:()=>60, m:()=>3,   desc:"Joins a wide stack (below) to a narrow one (above)."},
  engine: {name:"Engine",         ws:[60],     h:()=>60, m:()=>9,   desc:"An engine."},
  srb:    {name:"Solid booster",  ws:[60],     h:()=>150,m:(w,h)=>2+0.12*srbCap(w,h), desc:"Fuel and engine in one. Lights when you throttle up and can't be stopped or throttled until it burns out. Stretch it for a longer burn."},
  dec:    {name:"Decoupler",      ws:[60,120], h:()=>15, m:w=>w>60?5:2, desc:"Space drops everything below it. Engines sitting on one stay off until it fires."},
  sdec:   {name:"Side decoupler", ws:[15],     h:()=>60, m:()=>1.5, radial:1, desc:"Hang boosters on the side. Space drops them (it goes with the booster)."},
  fin:    {name:"Fin",            ws:[45],     h:()=>75, m:()=>1.2, radial:1, desc:"Keeps the rocket pointing where it's going while in the air."},
  rcs:    {name:"RCS thrusters", ws:[15],     h:()=>30, m:()=>0.8+RCS_MONO, radial:1, desc:"Little gas jets. T turns RCS on: they help the rocket turn (in space too), and I J K L nudge it forward, back and sideways. Own fuel."},
  leg:    {name:"Landing leg",    ws:[30],     h:()=>90, m:()=>2.5, radial:1, desc:"G deploys. Lets you land at up to 9 m/s instead of about 3."},
};
// engines: your own (numbers from the test stand) and four ready-made ones
const ENG={
  stand:{name:"Your engine",w:60,h:60,m:9,desc:"Your engine, with the thrust and Isp it made on the test stand."},
  wren: {name:"Wren",w:60,h:45,m:5,sl:{F:1100,isp:285},vac:{F:1250,isp:322},desc:"Small and light, for sea level. Good for hoppers and landers."},
  mule: {name:"Mule",w:60,h:60,m:12,sl:{F:3300,isp:305},vac:{F:3650,isp:338},desc:"The workhorse: lots of push at sea level for its size."},
  bison:{name:"Bison",w:120,h:90,m:28,sl:{F:7500,isp:300},vac:{F:8300,isp:330},desc:"Big, powerful sea-level engine for heavy first stages. Needs a wide tank."},
  vac:  {name:"Lumen Vac",w:60,h:105,m:7,sl:{F:800,isp:140},vac:{F:2600,isp:445},desc:"Huge bell for space: best Isp of all, but weak at sea level (the exhaust is over-expanded)."},
  lib:  {name:"Saved engine",w:60,h:60,m:9,desc:"An engine you tested and saved in the engine library."}};
// solid boosters: what's inside the casing. "Your booster" = your last burn on the test stand; saved ones keep a copy of their numbers
// on the part (p.n), so a rocket still flies the same after the library entry is deleted. The curve is thrust (relative to the
// average) against how much of the propellant has burned, sampled evenly from first to last.
const BOOST={
  stand:  {name:"Your booster",desc:"Your booster, with the thrust, Isp and thrust curve of your last full burn on the test stand."},
  thumper:{name:"Thumper",sl:{F:3400,isp:215},vac:{F:3750,isp:237},curve:[1.2,1.15,1.1,1.05,1,1,1,0.98,0.95,0.92,0.9,0.85],desc:"A ready-made booster: hard kick at lift-off that tapers off."},
  lib:    {name:"Saved booster",desc:"A booster you burned on the test stand and saved in the engine library."}};
const boostKey=p=>p.b&&BOOST[p.b]?p.b:"stand";
function boostStat(p){const k=boostKey(p);if(k==="lib"&&p.n)return p.n;if(k==="stand")return boosterNums();return BOOST[k];}
// thrust multiplier when a fraction u of the propellant is gone (straight lines between the curve's samples)
function curveAt(c,u){if(!c||c.length<2)return 1;const x=Math.max(0,Math.min(1,u))*(c.length-1),i=Math.min(c.length-2,Math.floor(x));return c[i]+(c[i+1]-c[i])*(x-i);}
const ENG_ORDER=["stand","wren","mule","bison","vac"];
const engKey=p=>p.e&&ENG[p.e]?p.e:"stand";
function engStat(p){if(p.t==="srb")return boostStat(p);const k=engKey(p);return k==="lib"&&p.n?p.n:k==="stand"?engineNums():ENG[k];}
const PT_ORDER=["probe","nose","tank","adapter","engine:stand","engine:wren","engine:mule","engine:bison","engine:vac","srb:stand","srb:thumper","dec","sdec","fin","rcs","leg"];
let partId=1;
// t can carry a model: "engine:mule", "srb:thumper"; n = a saved library entry's numbers to copy onto the part
function mkPart(t,w,h,e,n){let b;if(t.startsWith("engine:")){e=t.slice(7);t="engine";}else if(t.startsWith("srb:")){b=t.slice(4);t="srb";}const d=PT[t];
  if(t==="engine"){e=e||"stand";w=ENG[e].w;h=ENG[e].h;}w=w||d.ws[0];const p={id:partId++,t,x:0,y:0,w,h:h||d.h(w),f:1,tw:0};if(e)p.e=e;if(t==="srb")p.b=b||"stand";
  if(n)p.n=JSON.parse(JSON.stringify(n));return p;}
const partMass=p=>p.t==="engine"?ENG[engKey(p)].m:PT[p.t].m(p.w,p.h);
const partName=p=>p.t==="engine"?(engKey(p)==="lib"&&p.n?p.n.name:ENG[engKey(p)].name):p.t==="srb"?(boostKey(p)==="lib"&&p.n?p.n.name:BOOST[boostKey(p)].name):PT[p.t].name;
// a decoupler under an engine gets a shroud (interstage) that covers the engine until it separates
function shroudsOf(ps){const out=[];ps.forEach((d,i)=>{if(d.t!=="dec"||d.shed)return;let top=-1e9;
  for(const e of ps)if(e.t==="engine"&&near(e.y,d.y+d.h)&&ovl(e.x-e.w/2,e.x+e.w/2,d.x-d.w/2,d.x+d.w/2)>0.5)top=Math.max(top,e.y+e.h);
  if(top>-1e9)out.push({i,x:d.x,w:d.w,y0:d.y+d.h,y1:top});});return out;}
function drawShroud(c,s,al){c.save();c.globalAlpha=al==null?1:al;const L=s.x-s.w/2,R=s.x+s.w/2;
  c.fillStyle=metal(c,L,R,"#a9b1c2","#959eb1","#eef1f6","#ccd2dd");c.fillRect(L,s.y0,s.w,s.y1-s.y0);
  c.fillStyle="#34405e";c.fillRect(L,s.y1-4,s.w,4);c.strokeStyle="rgba(60,70,95,.6)";c.lineWidth=1.5;c.beginPath();c.moveTo(s.x,s.y0);c.lineTo(s.x,s.y1-4);c.stroke();
  c.fillStyle="rgba(40,50,75,.35)";for(let yy=s.y0+10;yy<s.y1-8;yy+=12){c.fillRect(L+4,yy,3,3);c.fillRect(R-7,yy,3,3);}c.restore();}
const isRad=p=>!!PT[p.t].radial;
const topW=p=>p.t==="nose"?0:p.t==="adapter"?60:p.w;
const ovl=(a0,a1,b0,b1)=>Math.min(a1,b1)-Math.max(a0,b0);
const near=(a,b)=>Math.abs(a-b)<0.01;
function touching(a,b){
  if(near(a.y+a.h,b.y)&&ovl(a.x-topW(a)/2,a.x+topW(a)/2,b.x-b.w/2,b.x+b.w/2)>0.5)return true;
  if(near(b.y+b.h,a.y)&&ovl(b.x-topW(b)/2,b.x+topW(b)/2,a.x-a.w/2,a.x+a.w/2)>0.5)return true;
  if((near(a.x+a.w/2,b.x-b.w/2)||near(b.x+b.w/2,a.x-a.w/2))&&ovl(a.y,a.y+a.h,b.y,b.y+b.h)>0.5)return true;
  return false;}
const collide=(a,b)=>ovl(a.x-a.w/2,a.x+a.w/2,b.x-b.w/2,b.x+b.w/2)>0.5&&ovl(a.y,a.y+a.h,b.y,b.y+b.h)>0.5;
function adjOf(ps){const adj=ps.map(()=>[]);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(touching(ps[i],ps[j])){adj[i].push(j);adj[j].push(i);}return adj;}
function rootIdx(ps){let r=-1;ps.forEach((p,i)=>{if(p.t==="probe"&&(r<0||p.y>ps[r].y))r=i;});return r;}
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
  let S=all,first=true,lo=1e9,hi=-1e9;for(const i of all){lo=Math.min(lo,ps[i].y);hi=Math.max(hi,ps[i].y+ps[i].h);}out.H=(hi-lo)/100;
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
function drawPart(c,p,o={}){
  const{x,y,w,h,f}=p,L=x-w/2,R=x+w/2,T=y+h;
  c.lineJoin="round";
  switch(p.t){
    case"tank":{c.fillStyle=metal(c,L,R,"#8e98ad","#7d869b","#f5f7fb","#c9cfdb");c.fillRect(L,y,w,h);
      c.fillStyle="#34405e";c.fillRect(L,y,w,4);c.fillRect(L,T-4,w,4);
      c.strokeStyle="rgba(120,130,150,.45)";c.lineWidth=1;for(let yy=y+30;yy<T-10;yy+=30){c.beginPath();c.moveTo(L,yy);c.lineTo(R,yy);c.stroke();}
      if(h>=45){const fx=R-11,fr=o.fuel!=null?o.fuel:1;c.fillStyle="rgba(10,14,26,.35)";c.fillRect(fx,y+8,5,h-16);c.fillStyle=fr>0.2?"#ffb347":"#ff6a4d";c.fillRect(fx,y+8,5,(h-16)*Math.max(0,Math.min(1,fr)));}
      if(w>=120&&h>=90){c.fillStyle="rgba(196,64,47,.85)";c.fillRect(L+14,y+h*0.5-6,26,12);}
      break;}
    case"probe":{c.fillStyle=metal(c,L,R,"#3c4356","#363c4d","#8790a6","#5b6378");c.fillRect(L,y,w,h);
      c.fillStyle="#c8a24a";c.fillRect(L,y+h*0.38,w,h*0.22);c.fillStyle="#2a3046";c.fillRect(L,T-4,w,4);
      c.fillStyle="#5ae1f5";c.fillRect(x-14,y+5,6,4);c.fillStyle="#6fe28f";c.fillRect(x-4,y+5,6,4);break;}
    case"nose":{c.beginPath();c.moveTo(L,y);c.quadraticCurveTo(L,y+h*0.72,x,T);c.quadraticCurveTo(R,y+h*0.72,R,y);c.closePath();
      c.fillStyle=metal(c,L,R,"#b9c0cf","#a4acbd","#fbfcfe","#dfe3eb");c.fill();c.save();c.clip();c.fillStyle="#c4402f";c.fillRect(L,y+h*0.78,w,h);c.fillStyle="#34405e";c.fillRect(L,y,w,4);c.restore();break;}
    case"adapter":{c.beginPath();c.moveTo(L,y);c.lineTo(x-30,T);c.lineTo(x+30,T);c.lineTo(R,y);c.closePath();c.fillStyle=metal(c,L,R,"#8e98ad","#7d869b","#eef1f6","#c9cfdb");c.fill();
      c.fillStyle="#34405e";c.fillRect(L,y,w,4);c.fillRect(x-30,T-4,60,4);break;}
    case"engine":{const k=engKey(p);
      if(k==="vac"){const my=y+h*0.78;c.fillStyle="#2b303b";c.fillRect(x-w*0.2,my,w*0.4,T-my);c.fillStyle="#b08a3e";c.fillRect(x-w*0.13,my+3,4,T-my-6);
        c.beginPath();c.moveTo(x-w*0.12,my);c.quadraticCurveTo(x-w*0.16,y+h*0.3,x-w*0.5,y);c.lineTo(x+w*0.5,y);c.quadraticCurveTo(x+w*0.16,y+h*0.3,x+w*0.12,my);c.closePath();
        c.fillStyle=metal(c,x-w*0.5,x+w*0.5,"#3a3330","#352f2c","#a99a8a","#5c524a");c.fill();c.strokeStyle="rgba(255,200,150,.18)";c.lineWidth=1;for(let q=1;q<5;q++){const yy=y+(my-y)*q/5,hw=w*(0.5-0.38*q/5);c.beginPath();c.moveTo(x-hw,yy);c.lineTo(x+hw,yy);c.stroke();}
        c.fillStyle="#7a5a2a";c.fillRect(x-w*0.5,y,w,3);break;}
      const my=y+h*(k==="bison"?0.55:0.6),bw=k==="wren"?0.38:0.48;
      c.fillStyle="#2b303b";c.fillRect(x-w*0.26,my,w*0.52,T-my);c.fillStyle="#b08a3e";c.fillRect(x-w*0.18,my+4,4,T-my-8);c.fillRect(x+w*0.18-4,my+4,4,T-my-8);
      if(k==="bison"){c.fillStyle="#3b4250";c.fillRect(x-w*0.4,my+6,w*0.14,T-my-12);c.fillRect(x+w*0.26,my+6,w*0.14,T-my-12);c.fillStyle="#c4402f";c.fillRect(x-w*0.4,T-10,w*0.8,4);}
      if(k==="mule"){c.fillStyle="#3b4250";c.fillRect(x+w*0.22,my+4,w*0.12,(T-my)*0.7);}
      c.beginPath();c.moveTo(x-w*0.17,my);c.quadraticCurveTo(x-w*0.22,y+h*0.25,x-w*bw,y);c.lineTo(x+w*bw,y);c.quadraticCurveTo(x+w*0.22,y+h*0.25,x+w*0.17,my);c.closePath();
      c.fillStyle=metal(c,x-w*bw,x+w*bw,"#262a33","#22262e","#767e8f","#3b414e");c.fill();c.fillStyle="#7a5a2a";c.fillRect(x-w*bw,y,w*bw*2,3);break;}
    case"srb":{const cy=y+SRB_NZ;   // white casing with black bands (so you can see it roll), short dark nozzle under it
      c.beginPath();c.moveTo(x-w*0.2,cy);c.lineTo(x-w*0.36,y);c.lineTo(x+w*0.36,y);c.lineTo(x+w*0.2,cy);c.closePath();c.fillStyle=metal(c,x-w*0.36,x+w*0.36,"#262a33","#22262e","#6d7484","#3b414e");c.fill();
      c.fillStyle="#7a5a2a";c.fillRect(x-w*0.36,y,w*0.72,3);
      c.fillStyle=metal(c,L,R,"#b3b9c6","#a2a9b8","#ffffff","#e3e7ee");c.fillRect(L,cy,w,T-cy);
      c.fillStyle="#1f232c";for(const k of[0.18,0.5,0.82]){const yy=cy+(T-cy)*k;c.fillRect(L,yy-3,w,6);}
      c.fillStyle="#c4402f";c.fillRect(L,T-6,w,6);c.fillStyle="#34405e";c.fillRect(L,cy,w,4);
      if(T-cy>=45){const fx=x-w*0.5+6,fr=o.fuel!=null?o.fuel:1;c.fillStyle="rgba(10,14,26,.35)";c.fillRect(fx,cy+8,5,T-cy-16);c.fillStyle=fr>0.2?"#ffb347":"#ff6a4d";c.fillRect(fx,cy+8,5,(T-cy-16)*Math.max(0,Math.min(1,fr)));}
      break;}
    case"dec":hazard(c,L,y,w,h,false);break;
    case"sdec":hazard(c,L,y,w,h,true);break;
    case"fin":{const ix=f>0?L:R,ox=f>0?R:L;c.beginPath();c.moveTo(ix,T);c.lineTo(ox,y+h*0.18);c.lineTo(ox,y);c.lineTo(ix,y);c.closePath();
      c.fillStyle="#c4402f";c.fill();c.strokeStyle="#7e2219";c.lineWidth=2;c.stroke();break;}
    case"rcs":{const ix=f>0?L:R,ox=f>0?R:L,cx=(L+R)/2;c.fillStyle="#2b303c";c.fillRect(L,y+6,w,h-12);c.fillStyle="#d6dbe6";c.fillRect(ix,y+9,f*4,h-18);
      c.fillStyle="#1b1e26";for(const[ax,ay,bx,by]of[[cx,y+6,cx,y],[cx,T-6,cx,T],[ox-f*2,y+h/2,ox+f*4,y+h/2]]){const nx=by===ay?0:3,ny=by===ay?3:0;c.beginPath();c.moveTo(ax-nx*0.6,ay-ny*0.6);c.lineTo(bx-nx,by-ny);c.lineTo(bx+nx,by+ny);c.lineTo(ax+nx*0.6,ay+ny*0.6);c.closePath();c.fill();}
      if(o.puff)for(const[px,py,dx,dy]of o.puff){c.fillStyle="rgba(240,244,255,.75)";c.beginPath();c.moveTo(px,py);c.lineTo(px+dx*16-dy*5,py+dy*16-dx*5);c.lineTo(px+dx*16+dy*5,py+dy*16+dx*5);c.closePath();c.fill();}
      break;}
    case"leg":{const ix=f>0?L:R,dep=o.legs,hx=ix,hy=y+5;
      const quad=(ax,ay,bx,by,wa,wb,col)=>{const dx=bx-ax,dy=by-ay,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;c.beginPath();c.moveTo(ax+nx*wa/2,ay+ny*wa/2);c.lineTo(bx+nx*wb/2,by+ny*wb/2);c.lineTo(bx-nx*wb/2,by-ny*wb/2);c.lineTo(ax-nx*wa/2,ay-ny*wa/2);c.closePath();c.fillStyle=col;c.fill();};
      if(!dep){   // folded flat against the tank, foot at the top (like a Falcon 9 leg)
        quad(hx+f*7,y+2,hx+f*6,T-12,13,8,"#262b36");c.fillStyle="#4b5263";c.fillRect(hx+f*7-1,y+10,2,h-26);
        c.fillStyle="#1b1e26";c.fillRect(hx+f*6-7,T-12,14,8);c.fillStyle="#9aa3b5";c.fillRect(hx+(f>0?0:-4),y,4,8);}
      else{const fx=ix+f*63,fy=y-80,kx=hx+(fx-hx)*0.55,ky=hy+(fy+6-hy)*0.55;
        c.strokeStyle="#c9ced8";c.lineWidth=4;c.lineCap="round";c.beginPath();c.moveTo(ix+f*2,y+62);c.lineTo(kx,ky);c.stroke();   // shock strut
        c.strokeStyle="#5a6070";c.lineWidth=6;c.beginPath();c.moveTo(ix+f*2,y+62);c.lineTo(ix+(kx-ix)*0.45,y+62+(ky-y-62)*0.45);c.stroke();c.lineCap="butt";
        quad(hx,hy,fx,fy+6,14,8,"#262b36");c.strokeStyle="#4b5263";c.lineWidth=1.5;c.beginPath();c.moveTo(hx+(fx-hx)*0.1,hy+(fy-hy)*0.1);c.lineTo(hx+(fx-hx)*0.85,hy+(fy+6-hy)*0.85);c.stroke();
        c.fillStyle="#1b1e26";c.beginPath();c.moveTo(fx-14,fy);c.lineTo(fx+14,fy);c.lineTo(fx+9,fy+8);c.lineTo(fx-9,fy+8);c.closePath();c.fill();
        c.fillStyle="#9aa3b5";c.beginPath();c.arc(hx,hy,3.5,0,6.2832);c.fill();}
      break;}
  }
  if(o.sel||o.bad||o.ghost){c.save();c.lineWidth=o.lw||3;c.strokeStyle=o.bad?"#ff4d3a":o.sel?"#ffcf7a":"rgba(255,255,255,.5)";c.setLineDash(o.ghost?[6,5]:[]);c.strokeRect(L-2,y-2,w+4,h+4);
    if(o.bad){c.fillStyle="rgba(255,60,40,.22)";c.fillRect(L,y,w,h);}c.restore();}
}
// lowest points of a rocket, for touching the ground (centimetres, local)
function contactPts(ps,legs){const pts=[];
  for(const p of ps){if(p.t==="leg"&&legs){pts.push([p.x+p.f*48,p.y-80,1]);continue;}
    if(p.t==="fin"||p.t==="leg")continue;
    pts.push([p.x-p.w/2,p.y,0],[p.x+p.w/2,p.y,0],[p.x-p.w/2,p.y+p.h,0],[p.x+p.w/2,p.y+p.h,0]);}
  return pts;}
// ready-made rockets
function tpl(name){const A=[];const add=(t,x,y,w,h,f)=>{const p=mkPart(t,w,h);p.x=x;p.y=y;p.f=f||1;A.push(p);return p;};
  const pair=(t,x,y,w,h)=>{const a=add(t,x,y,w,h,1),b=add(t,-x,y,w,h,-1);a.tw=b.id;b.tw=a.id;};
  if(name==="hopper"){add("engine",0,0);add("tank",0,60,60,90);add("probe",0,150);add("nose",0,180,60);pair("leg",45,60);}
  else if(name==="orbiter"){add("engine",0,0);add("tank",0,60,60,90);add("dec",0,150,60);add("engine",0,165);add("tank",0,225,60,45);add("probe",0,270);add("nose",0,300,60);pair("fin",52.5,60);}
  else if(name==="heavy"){add("engine",0,0);add("tank",0,60,60,150);add("dec",0,210,60);add("engine:vac",0,225);add("tank",0,330,60,60);add("probe",0,390);add("nose",0,420,60);
    pair("sdec",37.5,90);pair("engine:mule",75,30);pair("tank",75,90,60,120);pair("nose",75,210,60);pair("fin",127.5,90);}
  else if(name==="sparrow"){   // the Orbiter with two Thumper solid boosters strapped on: they light with the throttle; Space drops them
    add("engine",0,0);add("tank",0,60,60,90);add("dec",0,150,60);add("engine",0,165);add("tank",0,225,60,45);add("probe",0,270);add("nose",0,300,60);
    pair("sdec",37.5,45);pair("srb:thumper",75,0);pair("nose",75,150,60);pair("fin",127.5,0);}
  else if(name==="lander"){add("engine:bison",0,0);add("tank",0,90,120,60);add("adapter",0,150);add("dec",0,210,60);add("engine:wren",0,225);add("tank",0,270,60,60);
    add("probe",0,330);add("nose",0,360,60);pair("leg",45,270);pair("fin",82.5,90);}
  return A;}
