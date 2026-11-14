// ================= FLIGHT MODE: real time =================
// The test stand runs real gas physics (far too slow for real time). Flight takes the thrust and Isp your engine
// actually made on the stand and flies the rocket you built in the editor: gravity, air drag that depends on the shape
// and the angle you fly at, fins that keep it pointing into the wind, staging, landing legs.
// sound + goals live in juice.js; the headless tests run flight without a page, so they may be missing
const JX=typeof JUICE!=="undefined"?JUICE:null;
// ---------- test-stand records ----------
const CARD_KEY="throat.card.v1";
let card=store.get(CARD_KEY,{sl:null,vac:null}),hist=[];
_rt=function(F,isp){
  if(!(F>100&&isp>0&&isFinite(isp))){hist=[];return;}
  hist.push([simTime,F,isp]);while(hist.length&&simTime-hist[0][0]>1.2e-3)hist.shift();
  if(hist.length<6||simTime-hist[0][0]<0.8e-3)return;
  let lo=1e18,hi=0,sf=0,si=0;for(const[,f,i]of hist){lo=Math.min(lo,f);hi=Math.max(hi,f);sf+=f;si+=i;}
  const mF=sf/hist.length,mI=si/hist.length;if((hi-lo)/mF>0.06)return;            // steady to within 6%
  const k=atmo?"sl":"vac",old=card[k];
  if(!old||Math.abs(old.F-mF)/old.F>0.01||Math.abs(old.isp-mI)>2){card[k]={F:mF,isp:mI,t:Date.now()};store.set(CARD_KEY,card);vAn=null;}};
// solid boosters: the test stand reports each finished burn (average thrust, Isp, thrust curve); kept per outside air like the engine
_rb=function(b){if(!(b&&b.F>100&&b.isp>0&&isFinite(b.isp)))return;const k=b.atmo?"sl":"vac";card.srb=card.srb||{};
  card.srb[k]={F:b.F,isp:b.isp,curve:b.curve,t:Date.now()};store.set(CARD_KEY,card);vAn=null;};
function boosterNums(){
  const c=card.srb||{};let sl=c.sl,vac=c.vac,src="tested";
  if(!sl&&!vac){const T=BOOST.thumper;return{sl:T.sl,vac:T.vac,curve:T.curve,src:"default"};}
  if(sl&&!vac)vac={F:sl.F*1.1,isp:sl.isp*1.1,est:true};         // same rule as the engine: about 10% more in vacuum
  if(vac&&!sl)sl={F:vac.F*0.9,isp:vac.isp*0.9,est:true};
  return{sl,vac,curve:(c.sl||c.vac).curve,src};}
function engineNums(){
  let sl=card.sl,vac=card.vac,src="tested";
  if(!sl&&!vac){sl={F:2250,isp:355};src="default";}
  if(sl&&!vac)vac={F:sl.F*1.1,isp:sl.isp*1.1,est:true};          // no vacuum test: a sea-level nozzle gains about 10% in vacuum
  if(vac&&!sl)sl={F:vac.F*0.9,isp:vac.isp*0.9,est:true};
  return{sl,vac,src};}
// ---------- vessels ----------
const fcv=$("fcv"),fx=fcv.getContext("2d");let FW=1280,FH=720,FDS=1;
function fitF(){const r=fcv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);FW=Math.max(320,Math.round(r.width*d));FH=Math.max(200,Math.round(r.height*d));if(fcv.width!==FW||fcv.height!==FH){fcv.width=FW;fcv.height=FH;}FDS=FH/720;}
let launchH=3,flyers=[],mapCam=null,predC=null,VS=[],AV=null,EN=null,launchPs=null,launchName="",smoke=[],warp=1,mapView=false,zoomF=1,keys=new Set(),msg="",msgT=0,lastFT=0,rotBtn=0,clouds=[],said={},vesId=0,hudN=0,anAV=null,launchW=0.6;
const WARPS=[1,2,4,10,50,100,500,1000,5000,20000];let FT=0,warpWhy="";
// webcast extras: the mission timeline (events tick off as they happen), the lift-off clock, Max-Q tracking, and the camera's
// ignition jolt / flash (kickF, flashF), which fade out over a second or so
// countdown (v1.19): "wait" on the pad → "count" from T−10 → "go". tRel = game time the clamps let go. Headless tests skip it.
let CD={s:"go",t:0},tRel=0,steam=[];
let warpTo=null,warpWhat="",EV=[],T0=null,qMax=0,qT=0,kickF=0,flashF=0,camT=0,wasLit=false,nSt0=1,evSig="";
function derive(v,keepWorld){   // recompute everything that follows from the parts list; keep the rocket where it is in the world
  const ps=v.ps,adj=adjOf(ps);v.adj=adj;v.root=rootIdx(ps);v.ctrl=v.root>=0;
  let m=0,mx=0,my=0;for(const p of ps){const pm=partMass(p)+(p.fuel||0);m+=pm;mx+=pm*p.x;my+=pm*(p.y+p.h/2);}
  const npx=mx/m,npy=my/m;
  if(keepWorld&&v.px!=null){const dx=(npx-v.px)*UM,dy=(npy-v.py)*UM,c=Math.cos(v.phi),s=Math.sin(v.phi);v.x+=dx*c+dy*s;v.y+=-dx*s+dy*c;}
  v.px=npx;v.py=npy;
  const all=new Set(ps.keys());v.eng=[...all].filter(i=>isEng(ps[i])&&engOn(ps,adj,i,all));v.feeds=v.eng.map(i=>feedOf(ps,adj,i,all));v.est=v.eng.map(i=>engStat(ps[i]));v.shr=shroudsOf(ps);v.lit=v.eng.map(()=>false);
  v.dry=ps.reduce((s,p)=>s+partMass(p),0);
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,W=0,top=null,I=0;
  for(const p of ps){x0=Math.min(x0,p.x-p.w/2);x1=Math.max(x1,p.x+p.w/2);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y+p.h);if(!isRad(p))W=Math.max(W,p.w);
    if(!isRad(p)&&(!top||p.y+p.h>top.y+top.h))top=p;const pm=partMass(p)+(p.fuel||0),dx=(p.x-npx)*UM,dy=(p.y+p.h/2-npy)*UM;I+=pm*(dx*dx+dy*dy+(p.w*p.w+p.h*p.h)*UM*UM/12);}
  v.H=(y1-y0)*UM;v.W=Math.max(0.15,W*UM);v.Wall=(x1-x0)*UM;v.I=Math.max(I,1);v.nose=!!top&&top.t==="nose";
  v.fins=ps.filter(p=>p.t==="fin").length;v.finA=v.fins*ps.filter(p=>p.t==="fin").reduce((a,p)=>a+p.w*p.h*UM*UM*0.5,0)/Math.max(1,v.fins);v.Af=Math.PI*(v.W/2)**2;v.As=v.H*v.W;v.Lr=Math.max(0.3,v.H*0.45);
  v.wheel=ps.filter(isBrain).reduce((a,p)=>a+1.2e7*A2(p.w,40),0);   // reaction wheels: 12 MN·m for a 4 m probe, more for wider ones (big rockets still turn slower)
  // capsule: heat shield works only if nothing hangs below it; escape tower; parachutes
  {const ci=ps.findIndex(p=>p.t==="capsule"),lo=Math.min(...ps.filter(p=>!isRad(p)).map(p=>p.y));v.hasCap=ci>=0;v.capBottom=ci>=0&&Math.abs(ps[ci].y-lo)<0.5;v.hasLes=ps.some(p=>p.t==="les");
    v.capW=ci>=0?ps[ci].w*UM:0;}
  v.rcs=ps.filter(p=>p.t==="rcs");for(const p of v.rcs)if(p.mono==null)p.mono=RCS_MONO;
  v.rcsArm=v.rcs.reduce((a,p)=>a+Math.max(0.2,Math.abs(p.y+p.h/2-npy)*UM),0);   // turning: side jets far from the centre of mass turn hardest
  v.hasLegs=ps.some(p=>p.t==="leg");
  v.cpts=contactPts(ps,false);v.cptsL=contactPts(ps,true);
  v.reach=Math.max(...v.cptsL.map(q=>Math.hypot((q[0]-npx)*UM,(q[1]-npy)*UM)),v.H);
  v.boomS=Math.max(1.5,v.H*0.6);}
function mkVessel(ps,name,body){const v={rcsOn:false,tin:null,id:++vesId,name,ps,body:body||0,x:0,y:PR,vx:0,vy:0,phi:0,om:0,thr:0,landed:false,crashed:false,legs:false,t:0,maxAlt:0,F:0,a:1,boomT:0,debris:null};
  for(const p of ps)if(hasProp(p)&&p.fuel==null)p.fuel=capOf(p);derive(v,false);return v;}
const loc=(v,lx,ly)=>{const c=Math.cos(v.phi),s=Math.sin(v.phi);return[v.x+lx*c+ly*s,v.y-lx*s+ly*c];};
let launchSeed=Date.now()%2147483647||7;
function startFlight(ps,name,keepWx){
  launchPs=JSON.parse(JSON.stringify(ps));launchName=name||"Rocket";
  const a=analyze(launchPs,engineNums()),keep=a.root>=0?bfs(adjOf(launchPs),a.root,()=>true):new Set();
  const mine=launchPs.filter((p,i)=>keep.has(i));for(const p of mine){delete p.shed;delete p.fuel;delete p.ign;}EN=engineNums();   // full tanks again on a retry
  const v=mkVessel(mine,launchName);let lo=1e9;for(const q of v.cpts)lo=Math.min(lo,(q[1]-v.py)*UM);v.x=0;v.y=PR+terrH(0)-lo+0.005;v.landed=true;launchW=v.Wall;launchH=v.H;
  v.frost=1;if(JX){CD={s:"wait",t:10};v.clamped=true;}else CD={s:"go",t:0};tRel=0;steam=[];
  VS=[v];AV=v;FT=0;smoke=[];T0=null;qMax=0;kickF=0;flashF=0;wasLit=false;evSig="";buildEvents(analyze(v.ps,EN));flyers=[];warp=1;mapCam=null;predC=null;mapView=false;zoomF=1;said={};anAV=null;hudN=0;
  msg=JX?"On the pad. Press Space (or Start countdown) to count down from 10.":"";msgT=JX?8:0;
  // weather for this launch: a new one each time you launch from the editor, the same one when you retry (R)
  if(!keepWx){launchSeed=(launchSeed*16807+12345)%2147483647||7;}pickWeather(launchSeed%9973);
  clouds=makeClouds(launchSeed);   // three layers by altitude (world.js)
  FLT.on=true;FLT.vab=false;$("flight").classList.add("show");S.paused=true;cfg();fitF();$("fThr").value=0;lastFT=performance.now();
  requestAnimationFrame(flightFrame);}
function endFlight(){FLT.on=false;$("flight").classList.remove("show");if(typeof enter==="function")enter($("stage"));S.paused=$("bPause").classList.contains("on");cfg();}
// ---------- countdown ----------
// Space (or the button) starts a 10 s count. T−5 the water deluge starts and the upper tower arms swing away; T−3 the liquid
// engines light and spool up while the hold-down clamps keep the rocket on the pad; T−0 the clamps open, the base umbilicals
// drop, solid boosters light, throttle goes to full and the rocket is yours. Space during the count skips to T−0.
function startCount(){if(CD.s!=="wait")return;CD={s:"count",t:10};warp=1;warpTo=null;msgT=0;tick(10);}
function tick(n){if(!JX)return;
  if(n===10){callout("T−10","countdown started");JX.snd.say("T minus ten");}
  else if(n===3){callout("IGNITION SEQUENCE START");JX.snd.say("ignition sequence start");}
  else if(n>0){callout(String(n));if(n!==2)JX.snd.say(String(n));}
  JX.snd.beep(n<=3);}
function release(skip){if(CD.s==="go")return;CD={s:"go",t:0};tRel=FT;for(const v of VS)v.clamped=false;if(AV){AV.thr=1;$("fThr").value=100;}kickF=1;flashF=Math.max(flashF,0.8);
  if(JX){JX.snd.say("liftoff");JX.snd.beep(true);}if(skip){msg="Countdown skipped.";msgT=1.5;}}
function countFrame(dtR){if(!AV||CD.s==="go")return;
  if(CD.s==="wait"){AV.thr=0;return;}
  warp=1;warpTo=null;const prev=CD.t;CD.t-=dtR;
  for(let n=Math.ceil(prev)-1;n>=Math.max(0,Math.ceil(CD.t));n--)if(n>0)tick(n);
  AV.thr=CD.t<3?Math.min(1,(3-CD.t)/2.4):0;   // spool up from T−3
  if(CD.t<=0)release(false);}
// pad effects: how far along each thing is (0..1), from the countdown clock and the time since release
function padFx(){const since=CD.s==="go"?(tRel?FT-tRel:99):-1,T=CD.s==="count"?CD.t:CD.s==="wait"?10:-since;
  return{up:CD.s==="wait"?0:Math.max(0,Math.min(1,(5-T)/3)),lo:since<0?0:Math.min(1,since/0.6),clamp:since<0?0:Math.min(1,since/0.4),
    deluge:CD.s==="wait"?0:T>5?0:since<0?Math.min(1,(5-T)/1):Math.max(0,1-(since-20)/8),
    vent:CD.s==="wait"?Math.min(1,0.4+FT/25):CD.s==="count"?Math.max(0,(T-8)/2):0};}
// ---------- mission timeline + event callouts ----------
// The list comes from the rocket itself: lift-off, Max-Q, one separation per stage (boosters or a stage), space, orbit,
// and the Moon when the rocket has the Δv to get there (or as soon as it actually arrives).
function buildEvents(a){EV=[{k:"liftoff",l:"LIFTOFF"},{k:"maxq",l:"MAX-Q"}];nSt0=Math.max(1,a.stages.length);
  a.stages.forEach((st,i)=>{if(st.dropKind)EV.push({k:"sep",l:st.dropKind==="boosters"?"BOOSTER SEP":"STAGE SEP"});});
  EV.push({k:"space",l:"SPACE"},{k:"orbit",l:"ORBIT"});if(a.total>4200)EV.push({k:"moon",l:"MOON"});}
function mark(k,t){const e=EV.find(q=>q.k===k&&q.t==null);if(e)e.t=t==null?FT:t;else if(k==="moon")EV.push({k,l:"MOON",t:FT});}
// big thin centred text that fades in and out (LIFTOFF, MAX-Q, STAGE SEPARATION...). Hints still use the small message box.
function callout(t,sub){if(!JX)return;const el=$("fCall");el.querySelector("b").textContent=t;el.querySelector("small").textContent=sub||"";
  el.classList.remove("go");void el.offsetWidth;el.classList.add("go");}
// ---------- staging ----------
function doStage(){const v=AV;if(!v||v.crashed)return;const all=new Set(v.ps.keys()),decs=nextDecs(v.ps,all);
  if(!decs.length){msg="Nothing left to stage.";msgT=2.5;return;}
  const sp=split(v.ps,v.adj,all,decs,v.root),om=v.om,c=Math.cos(v.phi),s=Math.sin(v.phi);
  for(const sh of v.shr)if(decs.includes(sh.i)&&!v.ps[sh.i].shed){v.ps[sh.i].shed=true;const hw=sh.w/2;
    for(const side of[-1,1]){const lx=(sh.x+side*hw/2-v.px)*UM,ly=((sh.y0+sh.y1)/2-v.py)*UM,[wx,wy]=loc(v,lx,ly),out=side*2.5;
      flyers.push({body:v.body,x:wx,y:wy,vx:v.vx+out*c+0.6*s,vy:v.vy-out*s+0.6*c,ang:v.phi,om:side*1.6,w:hw*UM,h:(sh.y1-sh.y0)*UM,side,t:0});}}
  const keepPs=[...sp.keep].map(i=>v.ps[i]),pieces=sp.pieces.map(set=>[...set].map(i=>v.ps[i]));
  const oldPx=v.px,oldPy=v.py,X0=v.x,Y0=v.y,V0x=v.vx,V0y=v.vy;
  v.ps=keepPs;derive(v,true);{const rx=v.x-X0,ry=v.y-Y0;v.vx=V0x+om*ry;v.vy=V0y-om*rx;}
  for(const P of pieces){const n=mkVessel(P,P.some(p=>p.t==="probe")?v.name+" booster":"Debris",v.body);
    const dx=(n.px-oldPx)*UM,dy=(n.py-oldPy)*UM,rx=dx*c+dy*s,ry=-dx*s+dy*c;
    n.phi=v.phi;n.om=om;n.x=X0+rx;n.y=Y0+ry;
    let ux=n.x-v.x,uy=n.y-v.y;const ul=Math.hypot(ux,uy)||1;ux/=ul;uy/=ul;
    n.vx=V0x+om*ry+ux*1.4;n.vy=V0y-om*rx+uy*1.4;n.thr=0;n.landed=false;n.frost=v.frost||0;VS.push(n);}
  const bo=pieces.some(P=>P.some(p=>p.t==="sdec"));mark("sep");callout(bo?"BOOSTER SEPARATION":"STAGE SEPARATION");kickF=Math.max(kickF,0.35);anAV=null;
  if(JX){JX.snd.clunk();JX.goal("stage");}}
// ---------- splitting off part of a craft (abort, tower jettison): the piece keeps its place and speed, like a stage ----------
function splitOff(v,idx,name,kick){const c=Math.cos(v.phi),s=Math.sin(v.phi),om=v.om,oldPx=v.px,oldPy=v.py,X0=v.x,Y0=v.y,V0x=v.vx,V0y=v.vy;
  const P=v.ps.filter((p,i)=>idx.has(i)),R=v.ps.filter((p,i)=>!idx.has(i));v.ps=R;derive(v,true);{const rx=v.x-X0,ry=v.y-Y0;v.vx=V0x+om*ry;v.vy=V0y-om*rx;}
  const n=mkVessel(P,name,v.body),dx=(n.px-oldPx)*UM,dy=(n.py-oldPy)*UM,rx=dx*c+dy*s,ry=-dx*s+dy*c;n.phi=v.phi;n.om=om;n.x=X0+rx;n.y=Y0+ry;
  n.vx=V0x+om*ry+s*(kick||0);n.vy=V0y-om*rx+c*(kick||0);n.thr=0;n.landed=false;n.frost=0;VS.push(n);anAV=null;return n;}
// ABORT: the escape tower fires and pulls the capsule (and anything above it) off the rocket, at any moment, even on the pad
function abort(){const v=AV;if(!v||v.crashed)return;const ci=v.ps.findIndex(p=>p.t==="capsule");
  if(ci<0){msg="No crew capsule on this craft: nothing to abort.";msgT=2.5;return;}if(!v.hasLes){msg="The escape tower is gone: abort isn't possible any more.";msgT=2.5;return;}
  const cp=v.ps[ci],idx=new Set();v.ps.forEach((p,i)=>{if(p.y>=cp.y-0.01&&Math.abs(p.x-cp.x)<cp.w/2+1)idx.add(i);});
  if(idx.size===v.ps.length){v.lesT=3;}else{const n=splitOff(v,idx,v.name+" capsule");v.thr=0;v.name=v.name+" (aborted)";n.lesT=3;AV=n;}
  if(CD.s!=="go"){CD={s:"go",t:0};tRel=FT;}msgT=0;AV.clamped=false;AV.landed=false;callout("ABORT","escape tower firing");kickF=1;if(JX){JX.snd.bang(1);JX.snd.say("abort, abort");}}
function jettisonLes(v,why){const li=v.ps.findIndex(p=>p.t==="les");if(li<0)return;splitOff(v,new Set([li]),"Escape tower",25);if(v===AV)callout("TOWER JETTISON",why||"");}
function chutes(){const v=AV;if(!v||v.crashed)return;if(!v.hasCap){msg="Parachutes come with the crew capsule.";msgT=2.5;return;}
  if(v.chute){msg="Parachutes are already out.";msgT=1.5;return;}if(v.body!==0){msg="No air here: parachutes won't work.";msgT=2.5;return;}
  const sp=Math.hypot(v.vx,v.vy);if(sp>280){msg=`Too fast for parachutes (${fmt(sp)} m/s): they'd tear. Wait until below 280 m/s.`;msgT=3;return;}
  v.chute=1;v.chuteK=0;callout("PARACHUTES","deployed");}
function switchV(d){const c=VS.filter(v=>v.ctrl&&!v.crashed);if(c.length<2){msg="Nothing else to fly. Boosters need their own probe core.";msgT=3;return;}
  let i=c.indexOf(AV);i=(i+d+c.length)%c.length;AV=c[i];anAV=null;msg="Now flying: "+AV.name;msgT=2.5;$("fThr").value=Math.round(AV.thr*100);}
// ---------- physics ----------
function crash(v,sp,water){v.splash=!!water;
  if(JX&&AV&&v.body===AV.body){const d=v===AV?0:Math.hypot(v.x-AV.x,v.y-AV.y);if(d<3000)JX.snd.crash(1-d/3000);}   // you hear crashes near you
  v.crashed=true;v.boomT=0;v.thr=0;v.debris=[];const bits=Math.min(40,8+v.ps.length*2);
  for(let i=0;i<bits;i++){const an=Math.random()*Math.PI,s=(6+Math.random()*16)*Math.min(2,0.4+sp/40);
    v.debris.push({x:(Math.random()-0.5)*v.Wall,y:Math.random()*v.H,vx:Math.cos(an)*s,vy:Math.sin(an)*s,rot:Math.random()*6,vr:(Math.random()-0.5)*12,l:0.15+Math.random()*v.W*0.7,c:Math.random()<0.3?"#c4402f":(Math.random()<0.5?"#d6dbe6":"#3a3f4c")});}
  if(v===AV){msg=`💥 Crashed at ${Math.round(sp)} m/s. Highest point ${v.maxAlt>=1000?(v.maxAlt/1000).toFixed(1)+" km":Math.round(v.maxAlt)+" m"}. R to try again`+(VS.some(o=>o!==v&&o.ctrl&&!o.crashed)?", [ ] to fly another craft":"")+".";msgT=1e9;}}
function padDist(v){if(v.body!==0)return{d:Infinity,name:"",at:0};const ang=Math.atan2(v.x,v.y)*PR;const a=ang,b=ang-PAD2;return Math.abs(a)<Math.abs(b)?{d:a,name:"launch pad",at:0}:{d:b,name:"landing zone",at:PAD2};}
function stepV(v,dt,u){
  if(v.crashed)return;
  const B=BOD[v.body],rr=Math.hypot(v.x,v.y),ux=v.x/rr,uy=v.y/rr,h=rr-B.R,a=B.atm?atmP(Math.max(0,h))/P0:0,rho=B.atm?atmRho(Math.max(0,h)):0,c=Math.cos(v.phi),s=Math.sin(v.phi);
  // engines: each drinks from the tanks it's joined to
  let F=0,fuel=0,nS=0;const thr=v.thr;
  for(let n=0;n<v.eng.length;n++){const tk=v.feeds[n];let av=0;for(const j of tk)av+=v.ps[j].fuel;
    const P=v.ps[v.eng[n]];
    if(P.t==="srb"){   // a solid booster lights the first time you throttle up, then burns flat out until it's empty: no throttle, no off switch
      if(thr>0&&av>1e-6&&!v.clamped)P.ign=true;v.lit[n]=!!P.ign&&av>1e-6;if(!v.lit[n])continue;
      const E=v.est[n],k=curveAt(E.curve,1-av/capOf(P));F+=(E.vac.F-(E.vac.F-E.sl.F)*a)*k;nS++;P.fuel=Math.max(0,av-E.vac.F*k/(E.vac.isp*G0)*dt);continue;}
    v.lit[n]=thr>0&&av>1e-6;
    if(!v.lit[n])continue;const E=v.est[n];F+=(E.vac.F-(E.vac.F-E.sl.F)*a)*thr;const use=Math.min(av,E.vac.F/(E.vac.isp*G0)*thr*dt);for(const j of tk)v.ps[j].fuel-=use*v.ps[j].fuel/av;}
  for(const p of v.ps)if(p.fuel)fuel+=p.fuel;
  const m=v.dry+fuel;v.F=F;v.a=a;v.m=m;v.nS=nS;
  let ax=F/m*s,ay=F/m*c;const gk=-B.mu/(rr*rr);ax+=gk*ux;ay+=gk*uy;
  // air: drag depends on the shape and on how sideways you fly; fins turn you into the wind
  let tq=0;const sp=Math.hypot(v.vx,v.vy);
  if(rho>0&&sp>0.3){const q=0.5*rho*sp*sp,ca=(v.vx*s+v.vy*c)/sp,sa=(s*v.vy-c*v.vx)/sp;
    const CdA=v.Af*(ca>=0?(v.nose?0.3:0.8):0.95)*ca*ca+v.As*0.9*sa*sa+v.finA*0.07;
    const D=q*CdA;ax-=D/m*v.vx/sp;ay-=D/m*v.vy/sp;v.q=q;v.D=D;v.rho=rho;
    tq+=q*sa*v.Lr*(v.As*0.012-v.finA*1.1);                                   // fins win: they swing the nose into the airflow
    tq-=q*(v.finA*1.1+v.As*0.04)*v.Lr*v.Lr*v.om/Math.max(sp,5)*2;}           // and damp the wobble
  else{v.q=0;v.D=0;v.rho=rho;}
  // launch escape motor: a few seconds of very hard push along the nose, pulling the capsule clear of the rocket
  if(v.lesT>0){const Fl=m*9.81*9;ax+=Fl/m*s;ay+=Fl/m*c;v.lesT-=dt;if(v.lesT<=0)v.lesDone=v.t;}
  // parachutes: open over 3 s; sized so the capsule comes down at about 7 m/s at sea level (faster in thin air). They swing the
  // capsule round to hang heat-shield-down.
  if(v.chute===1&&rho>0&&sp>0.3){v.chuteK=Math.min(1,(v.chuteK||0)+dt/3);const A=m*9.81*2/(RHO0*49)*v.chuteK*v.chuteK,Dc=0.5*rho*sp*sp*A;ax-=Dc/m*v.vx/sp;ay-=Dc/m*v.vy/sp;
    const want=Math.atan2(-v.vx,-v.vy);v.phi+=wrapA(want-v.phi)*Math.min(1,dt*1.2*v.chuteK);v.om*=Math.pow(0.2,dt);}
  // re-entry heating ~ air density × speed³. A capsule coming in heat-shield-first (nose pointing back along its path, nothing below
  // the shield) takes ten times more. Too much for too long and the craft burns up.
  if(rho>0&&sp>200){const fl=rho*sp*sp*sp,sh=v.capBottom&&(v.vx*s+v.vy*c)/sp<-0.6,lim=sh?1.2e9:8e7;v.hf=fl;v.shielded=sh;
    if(fl>lim){v.heat=(v.heat||0)+(fl/lim-1)*dt;if(v.heat>3){crash(v,sp);if(v===AV){msg=`🔥 Burned up at ${fmt(sp)} m/s. Come back heat-shield first (capsule, nose pointing back), and not too steep.`;msgT=1e9;}return;}}
    else if(v.heat)v.heat=Math.max(0,v.heat-dt*0.4);}else v.hf=0;
  // steering: reaction wheels plus engine gimbal; with no input it holds its attitude (SAS)
  // steering is fly-by-wire: A/D ask for a turn rate; let go and SAS holds the heading (it also cancels air torque, up to what it can push)
  // RCS: when on and there's monopropellant left, the jets add turning power, and I J K L push the rocket along its own axes
  const mono=v.rcs.reduce((a,p)=>a+p.mono,0),rcsOk=v.rcsOn&&v.ctrl&&mono>1e-6,rT=rcsOk?RCS_F*v.rcsArm:0;let rcsUse=0;v.puff=null;
  if(rcsOk&&v.tin&&(v.tin[0]||v.tin[1])){const Fr=RCS_F*v.rcs.length*0.5,fx=v.tin[0]*Fr,fy=v.tin[1]*Fr;   // half the jets face each way
    ax+=(fx*c+fy*s)/m;ay+=(-fx*s+fy*c)/m;rcsUse+=Math.hypot(fx,fy);v.puff=v.tin;}
  if(v.ctrl){const mx=v.wheel+F*0.105*v.Lr+rT;let want;
    if(u){want=(u*0.55-v.om)*v.I*12;v.hold=null;if(v.sas&&v.sas!=="stab")v.sas="stab";}   // any steering drops a hold back to plain Stability
    else{if(v.sas&&v.sas!=="stab"){const tg=sasTarget(v);if(tg!=null)v.hold=tg;}
      if(v.hold==null&&Math.abs(v.om)<0.05)v.hold=v.phi;want=v.hold==null?-v.om*v.I*12:v.I*(-8*wrapA(v.phi-v.hold)-6*v.om);want-=tq;}
    const ap=Math.max(-mx,Math.min(mx,want));tq+=ap;
    if(rT>0){const base=mx-rT,extra=Math.max(0,Math.abs(ap)-base);if(extra>1e-3){rcsUse+=extra/v.rcsArm;v.puffR=Math.sign(ap);}else v.puffR=0;}else v.puffR=0;}
  if(rcsUse>0){let need=rcsUse/(RCS_ISP*G0)*dt;for(const p of v.rcs){const d=Math.min(p.mono,need*p.mono/mono);p.mono-=d;}}
  if(v.landed){if(v.clamped||ax*ux+ay*uy<=0){v.vx=v.vy=0;v.om=0;const tilt=wrapA(v.phi-Math.atan2(v.x,v.y));if(Math.abs(tilt)<0.6)v.phi-=tilt*Math.min(1,dt*2);ground(v,true);v.t+=dt;return;}v.landed=false;}
  v.om=Math.max(-2,Math.min(2,v.om+tq/v.I*dt));v.phi+=v.om*dt;
  v.vx+=ax*dt;v.vy+=ay*dt;v.x+=v.vx*dt;v.y+=v.vy*dt;
  if(h-groundAt(v.body,v.x,v.y).h<v.reach+60)ground(v,false);
  soiCheck(v);
  v.t+=dt;if(v.body===0)v.maxAlt=Math.max(v.maxAlt,h);}
// SAS hold modes. Each one just picks the heading for the normal heading hold above, so a hold can never turn the rocket
// harder than A/D could. Angles are measured like v.phi: 0 = straight "up" the screen's world y, positive = clockwise.
// Normal / anti-normal are left out on purpose: in a 2D game they point out of the screen.
// The planets here don't spin, so "surface" prograde is the same arrow as orbital prograde, except that when you're
// almost stopped (landing) it points straight up instead of wandering, which is what you want for a touchdown.
const SAS_MODES=["stab","pro","retro","radout","radin","sfpro","sfretro","hzE","hzW"];
function sasTarget(v){const rr=Math.hypot(v.x,v.y),ux=v.x/rr,uy=v.y/rr,sp=Math.hypot(v.vx,v.vy),dir=(x,y)=>Math.atan2(x,y),up=dir(ux,uy);
  switch(v.sas){
    case "pro":return sp>0.5?dir(v.vx,v.vy):null;
    case "retro":return sp>0.5?dir(-v.vx,-v.vy):null;
    case "sfpro":return sp>1?dir(v.vx,v.vy):up;
    case "sfretro":return sp>1?dir(-v.vx,-v.vy):up;
    case "radout":case "radin":{let px=ux,py=uy;if(sp>0.5){const tx=v.vx/sp,ty=v.vy/sp,d=ux*tx+uy*ty;px=ux-d*tx;py=uy-d*ty;}   // "up", with the part along the path taken out
      const l=Math.hypot(px,py);if(l<1e-6){px=-v.vy;py=v.vx;}const k=v.sas==="radout"?1:-1;return dir(k*px,k*py);}
    case "hzE":return dir(uy,-ux);
    case "hzW":return dir(-uy,ux);}
  return null;}
function soiCheck(v){   // hand a craft over between Earth and the Moon
  if(v.body===0){const M=moonAt(FT),dx=v.x-M.x,dy=v.y-M.y;if(dx*dx+dy*dy<SOI*SOI){v.body=1;v.x=dx;v.y=dy;v.vx-=M.vx;v.vy-=M.vy;v.hold=null;if(v===AV){if(JX)JX.goal("moonsoi");mark("moon");callout("MOON","entering the Moon's gravity");predC=null;if(warp>50)warp=50;}}}
  else if(v.x*v.x+v.y*v.y>SOI*SOI){const M=moonAt(FT);v.body=0;v.x+=M.x;v.y+=M.y;v.vx+=M.vx;v.vy+=M.vy;v.hold=null;if(v===AV){callout("LEAVING THE MOON");predC=null;if(warp>50)warp=50;}}}
// on rails: ride the orbit exactly, in pieces small enough to notice the Moon, the air and the ground coming
function railStep(v,T){let left=T,guard=0;
  while(left>1e-6&&guard++<3000){const B=BOD[v.body],r=Math.hypot(v.x,v.y),sp=Math.hypot(v.vx,v.vy)+1,alt=r-B.R;
    if(alt<B.floor)return false;
    let h=Math.min(left,Math.max(0.5,(alt-B.floor)/sp*0.5));
    if(v.body===0){const M=moonAt(FT+T-left);h=Math.min(h,Math.max(0.5,(Math.hypot(v.x-M.x,v.y-M.y)-SOI)/(sp+DM*NM)*0.5));}
    else h=Math.min(h,Math.max(0.5,(SOI-r)/sp*0.5));
    [v.x,v.y,v.vx,v.vy]=kepler(v.x,v.y,v.vx,v.vy,B.mu,h);left-=h;v.t+=h;
    const ft=FT;FT=ft+T-left;soiCheck(v);FT=ft;}
  return true;}
function ground(v,held){
  const pts=v.legs?v.cptsL:v.cpts,c=Math.cos(v.phi),s=Math.sin(v.phi);let mn=1e18,leg=false;
  // the lowest point of the craft below the ground (or the sea) right under it decides: real hills, mountains and water count
  let pen=-1e18,water=false;
  for(const q of pts){const lx=(q[0]-v.px)*UM,ly=(q[1]-v.py)*UM,wx=v.x+lx*c+ly*s,wy=v.y-lx*s+ly*c,r=Math.hypot(wx,wy),G=groundAt(v.body,wx,wy),d=BOD[v.body].R+G.h-r;
    if(d>pen){pen=d;leg=q[2]===1;water=G.water;}}
  if(pen<=0){if(held&&pen<-0.05)v.landed=false;return;}const rr=Math.hypot(v.x,v.y),push=pen;
  if(!held){const sp=Math.hypot(v.vx,v.vy),tilt=Math.abs(wrapA(v.phi-Math.atan2(v.x,v.y))),ok=water?sp<=12:v.chute===1&&v.hasCap?(sp<=10&&tilt<0.9):leg?(sp<=9&&tilt<0.45):(sp<=3.5&&tilt<0.25);
    if(!ok){crash(v,sp,water);return;}
    v.landed=true;v.vx=v.vy=0;v.om=0;v.wet=water;if(v.chute===1)v.chute=2;   // chutes cut on touchdown
    if(water&&v===AV){msg=`🌊 Splashdown at ${sp.toFixed(1)} m/s. Floating in the sea.`;msgT=6;v.x+=v.x/rr*push;v.y+=v.y/rr*push;return;}
    if(v===AV&&v.t>3){const pd=padDist(v);if(JX){if(v.body===1)JX.goal("moonland");else if(Math.abs(pd.d)<40&&pd.at)JX.goal("pad");}msg=v.body===1?`🌙 Landed on the Moon at ${sp.toFixed(1)} m/s!`:Math.abs(pd.d)<40?`🎯 Landed on the ${pd.name} at ${sp.toFixed(1)} m/s!`:`✅ Landed at ${sp.toFixed(1)} m/s, ${fmt(Math.abs(pd.d))} m from the ${pd.name}.`;msgT=6;}}
  v.x+=v.x/rr*push;v.y+=v.y/rr*push;}
function orbitOf(r){const B=BOD[r.body],mu=B.mu,rr=Math.hypot(r.x,r.y),v2=r.vx*r.vx+r.vy*r.vy,E=v2/2-mu/rr,hz=r.x*r.vy-r.y*r.vx;
  const ex=r.vy*hz/mu-r.x/rr,ey=-r.vx*hz/mu-r.y/rr,e=Math.hypot(ex,ey);
  if(E>=0)return{esc:true,e,ex,ey,hz,pe:hz*hz/mu/(1+e)-B.R};const a=-mu/(2*E);return{a,e,ex,ey,hz,ap:a*(1+e)-B.R,pe:a*(1-e)-B.R};}
// ---------- input ----------
addEventListener("keydown",e=>{if(!FLT.on)return;const tg=e.target&&e.target.tagName;if(tg==="INPUT"||tg==="SELECT"){if(e.key==="Escape")e.target.blur();return;}const k=e.key.toLowerCase();keys.add(k);
  if(k==="escape"){endFlight();}
  else if((k==="z"||k==="w"||k==="shift")&&CD.s==="wait"){msg="The rocket is held down on the pad. Press Space to start the countdown.";msgT=3;}
  else if(k==="z")AV.thr=1;else if(k==="x")AV.thr=0;
  else if(k===" "){if(!e.repeat){if(CD.s==="wait")startCount();else if(CD.s==="count")release(true);else doStage();}}
  else if(k==="g"){if(AV.hasLegs){AV.legs=!AV.legs;msg=AV.legs?"Legs down":"Legs up";msgT=1.5;}else{msg="No landing legs on this craft.";msgT=2;}}
  else if(k==="["||k==="]")switchV(k==="]"?1:-1);
  else if(k>="1"&&k<="9"&&!e.repeat)setSas(SAS_MODES[+k-1]);
  else if(k==="t"&&!e.repeat)toggleRcs();
  else if(k==="backspace"&&!e.repeat){abort();e.preventDefault();}
  else if(k==="p"&&!e.repeat)chutes();
  else if(k==="m"){mapView=!mapView;if(mapView)mapOpen();}
  else if(k==="f"&&mapView)mapFocus();
  else if(k==="r"){startFlight(launchPs,launchName,true);}
  else if(k==="b"){endFlight();openVab();}
  else if(k==="."||k===">"||k===","||k==="<")warpTo=null;
  if(k==="."||k===">"){warp=WARPS[Math.min(WARPS.length-1,WARPS.indexOf(warp)+1)];}
  else if(k===","||k==="<"){warp=WARPS[Math.max(0,WARPS.indexOf(warp)-1)];}
  if(["arrowleft","arrowright","arrowup","arrowdown"," "].includes(k))e.preventDefault();
  e.stopImmediatePropagation();},true);
addEventListener("keyup",e=>{if(FLT.on)keys.delete(e.key.toLowerCase());},true);
fcv.addEventListener("wheel",e=>{e.preventDefault();if(mapView){mapWheel(e);return;}zoomF=Math.max(0.05,Math.min(20000,zoomF*(e.deltaY<0?1.15:1/1.15)));},{passive:false});
$("fThr").oninput=()=>{if(AV&&CD.s==="go")AV.thr=+$("fThr").value/100;};
for(const[id,d]of[["fL",-1],["fR",1]]){const b=$(id);b.onpointerdown=()=>{rotBtn=d;};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>{rotBtn=0;};}
$("fMap").onclick=()=>{mapView=!mapView;if(mapView)mapOpen();};$("fWarp2").onclick=()=>{warp=WARPS[(WARPS.indexOf(warp)+1)%WARPS.length];};
$("fAbort").onclick=abort;$("fChute").onclick=chutes;$("fStage").onclick=()=>{if(CD.s==="wait")startCount();else if(CD.s==="count")release(true);else doStage();};$("fCount").onclick=startCount;$("fRcs").onclick=toggleRcs;$("fLegs").onclick=()=>{if(AV&&AV.hasLegs)AV.legs=!AV.legs;};
$("fBack").onclick=endFlight;$("fRetry").onclick=()=>startFlight(launchPs,launchName,true);$("fBuild").onclick=()=>{endFlight();openVab();};
// ---------- pad emitters: cold vapour from the tank vents, frost flaking off, steam clouds from the flame trench ----------
function padEmit(dt){const v=AV;if(!v||v.body!==0||dt<=0)return;const fx=padFx(),rr=Math.hypot(v.x,v.y),hAG=rr-PR-Math.max(0,terrH(Math.atan2(v.x,v.y)*PR));
  // boil-off: each fuelled tank breathes white vapour out of two vents near its top; it drifts down and away with the wind
  if(fx.vent>0&&v.landed)for(const p of v.ps){if(p.t!=="tank"||!(p.fuel>0))continue;for(const sd of[-1,1]){if(Math.random()>fx.vent*dt*7)continue;
    const[qx,qy]=loc(v,(p.x+sd*p.w/2-v.px)*UM,(p.y+p.h-6-v.py)*UM);
    smoke.push({vap:1,body:0,x:qx,y:qy,vx:sd*(2+Math.random()*2.5)+windDir*wx.wind*0.3,vy:-0.6-Math.random()*0.8,t:0,life:3.5+Math.random()*3,r0:0.6,r1:4+Math.random()*5,o:0.9});}}
  // frost flakes off as the rocket climbs: gone by about 10 km
  const fr=Math.max(0,Math.min(v.frost||0,1-hAG/10000));if(fr<(v.frost||0)&&!v.landed){const n=Math.min(30,((v.frost-fr)*4000)|0);for(let i=0;i<n&&smoke.length<900;i++){const p=v.ps[(Math.random()*v.ps.length)|0];if(p.t!=="tank")continue;
    const[qx,qy]=loc(v,(p.x+(Math.random()-0.5)*p.w-v.px)*UM,(p.y+Math.random()*p.h-v.py)*UM);smoke.push({flake:1,body:0,x:qx,y:qy,vx:v.vx*0.92,vy:v.vy*0.92,t:0,life:1.5+Math.random(),r0:0.25,r1:0,o:1});}}
  v.frost=fr;for(const o of VS)if(o!==v&&o.frost)o.frost=Math.max(0,o.frost-dt*0.02);
  // exhaust steam: while engines fire near the pad, huge clouds roll sideways out of both ends of the flame trench
  const near=Math.abs(Math.atan2(v.x,v.y)*PR)<400&&hAG<300;
  if(near&&v.F>0){const k=Math.min(1,v.F/((v.m||1)*9.81))*(1-hAG/300),n=Math.min(10,Math.random()<k*dt*70?1+((k*dt*70)|0):0);
    for(let i=0;i<n&&steam.length<340;i++){const sd=Math.random()<0.5?-1:1,x0=sd*(launchW*0.5+4);
      steam.push({x:x0,y:PR+1.5+Math.random()*3,vx:sd*(18+Math.random()*30),vy:2+Math.random()*5,t:0,life:22+Math.random()*25,r0:4+Math.random()*4,r1:(25+Math.random()*55)*Math.max(0.6,launchH/60),g:0.85+Math.random()*0.15});}}
  for(const q of steam){q.t+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.pow(0.55,dt);q.vy=q.vy*Math.pow(0.7,dt)+0.4*dt;q.x+=windDir*wx.wind*dt*0.3;}
  steam=steam.filter(q=>q.t<q.life);}
// ---------- the loop ----------
function flightFrame(now){
  if(!FLT.on)return;
  fitF();const dtR=Math.min(0.05,(now-lastFT)/1000);lastFT=now;
  if(AV){
    countFrame(dtR);padEmit(dtR);
    for(const v of VS)if(v.hasLes&&!v.crashed&&!(v.lesT>0)&&((v.lesDone!=null&&v.t-v.lesDone>1.2)||(v.body===0&&Math.hypot(v.x,v.y)-PR>ATM_TOP*0.85)))jettisonLes(v,v.lesDone!=null?"":"not needed above the air");
    if(AP.mode&&(keys.has("shift")||keys.has("w")||keys.has("control")||keys.has("s")||keys.has("z")||keys.has("x")))apOff("you took over");
    if(!AV.crashed&&CD.s==="go"&&!AP.mode){if(keys.has("shift")||keys.has("w"))AV.thr=Math.min(1,AV.thr+0.9*dtR);
      if(keys.has("control")||keys.has("s"))AV.thr=Math.max(0,AV.thr-0.9*dtR);}
    AV.tin=[(keys.has("l")?1:0)-(keys.has("j")?1:0),(keys.has("i")?1:0)-(keys.has("k")?1:0)];
    const u=Math.max(-1,Math.min(1,(keys.has("a")||keys.has("arrowleft")?-1:0)+(keys.has("d")||keys.has("arrowright")?1:0)+rotBtn));
    if(CD.s!=="go")$("fThr").value=Math.round(AV.thr*100);else if(document.activeElement!==$("fThr"))$("fThr").value=Math.round(AV.thr*100);
    const B=BOD[AV.body],hA=Math.hypot(AV.x,AV.y)-B.R,burning=VS.some(v=>v.F>0||v.thr>0&&!v.landed);
    if(warpTo!=null){const left=warpTo-FT;if(left<=dtR*1.05){warp=1;warpTo=null;msg="Warp stopped: "+warpWhat;msgT=2.5;}
      else{let w=1;for(const q of WARPS)if(q*dtR<=left*0.6)w=q;warp=w;}}
    let wv=warp;warpWhy="";
    if(burning&&wv>4){wv=4;warpWhy="engine on";}
    if(!AV.landed&&hA<B.floor&&wv>10){wv=10;warpWhy=B.atm?"in the air":"near the ground";}
    if(wv>=50){   // on rails
      for(const v of VS)if(v!==AV&&!v.landed&&!v.crashed&&Math.hypot(v.x,v.y)-BOD[v.body].R<BOD[v.body].floor){v.gone=true;msg=`${v.name} was lost (left behind in ${BOD[v.body].atm?"the air":"a low orbit"} while you warped)`;msgT=4;}
      VS=VS.filter(v=>!v.gone||v===AV);
      const T=dtR*wv;let stop=false;
      for(const v of VS){if(v.landed||v.crashed){v.t+=T;continue;}if(!railStep(v,T)&&v===AV)stop=true;}
      FT+=T;if(stop){warp=10;msg="Warp slowed: "+(B.atm?"entering the air":"close to the ground");msgT=3;}
    }else{
      const fine=VS.some(v=>!v.crashed&&!v.landed&&(BOD[v.body].atm&&Math.hypot(v.x,v.y)-BOD[v.body].R<ATM_TOP||v.F>0||v.thr>0||Math.hypot(v.x,v.y)-BOD[v.body].R<3000));
      const total=dtR*wv,hs=fine?0.004:0.04,n=Math.min(3000,Math.ceil(total/hs)),h=total/n;
      for(let i=0;i<n;i++){if(typeof apStep==='function')apStep(h);for(const v of VS)stepV(v,h,v===AV&&!AV.crashed?u:0);FT+=h;}}
    AV.wv=wv;
    {const lit=AV.F>0;if(lit&&!wasLit&&!AV.crashed){kickF=1;flashF=AV.landed||Math.hypot(AV.x,AV.y)-B.R<500?1:0.5;}wasLit=lit;}   // ignition: jolt + flash
    // sound: your own engines, plus anything else burning close by (boosters you just dropped)
    if(JX){const own=v=>v.F>0?Math.max(v.thr*(v.lit.some((l,n)=>l&&v.ps[v.eng[n]].t!=="srb")?1:0),v.nS?0.85:0):0;
      let L=own(AV),C=AV.nS?0.7:0;for(const v of VS)if(v!==AV&&v.F>0&&v.body===AV.body){const d=Math.hypot(v.x-AV.x,v.y-AV.y);if(d<2500){L+=0.5*own(v)*(1-d/2500);if(v.nS)C+=0.5*(1-d/2500);}}
      JX.fly.lvl=Math.min(1,L);JX.fly.air=AV.a;JX.fly.srb=Math.min(1,C);}
    for(const v of VS)if(v.crashed)v.boomT+=dtR;
    VS=VS.filter(v=>!(v.crashed&&v!==AV&&v.boomT>8));
  }
  renderFlight(dtR);hudFlight(dtR);
  requestAnimationFrame(flightFrame);}
// ---------- drawing ----------
const lerp=(a,b,t)=>a+(b-a)*t,col=(c,a)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
function plume(ctx,x0,y0,w,thr,a,bright,vacEng){   // in the rocket's frame (y up); exhaust goes down; all sizes scale with the bell width w
  if(thr<=0.01)return;const fl=vacEng&&a>0.3?0.6+Math.random()*0.5:0.93+Math.random()*0.14,vac=1-a,L=w*(5+12*thr)*(1+0.5*vac)*fl*(vacEng?1-0.55*a:1),ang=lerp(0.03,0.32,Math.pow(vac,0.6)),spread=Math.tan(ang)*L;
  ctx.save();ctx.globalCompositeOperation=bright>0.5?"source-over":"lighter";     // against a bright sky, glow can't add up to white
  if(a>0.25){ctx.beginPath();ctx.moveTo(x0-w*0.6,y0);ctx.lineTo(x0-w*0.9-spread-w*0.5,y0-L*1.15);ctx.lineTo(x0+w*0.9+spread+w*0.5,y0-L*1.15);ctx.lineTo(x0+w*0.6,y0);ctx.closePath();
    const g=ctx.createLinearGradient(0,y0,0,y0-L*1.15);g.addColorStop(0,col([255,135,50],0.5*a*thr));g.addColorStop(1,col([255,90,30],0));ctx.fillStyle=g;ctx.fill();}   // warm fringe in air
  if(vac>0.3){const k=(vac-0.3)/0.7;   // vacuum: the exhaust balloons out into a soft, wide fan
    for(let q=0;q<7;q++){const an=1.1-q*0.13,ln=1.4+q*0.12,al=0.1;const LL=L*ln,g=ctx.createRadialGradient(x0,y0,w*0.3,x0,y0,LL);
      g.addColorStop(0,col([235,120,255],al*k*thr));g.addColorStop(0.45,col([170,90,255],al*0.45*k*thr));g.addColorStop(1,col([110,70,255],0));
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x0,y0);ctx.arc(x0,y0,LL,-Math.PI/2-an,-Math.PI/2+an);ctx.closePath();ctx.fill();}}
  ctx.beginPath();ctx.moveTo(x0-w*0.48,y0);
  const N=18;for(let i=1;i<=N;i++){const t=i/N,yy=y0-L*t,pinch=a>0.2?1-0.22*a*Math.abs(Math.sin(t*Math.PI*5)):1;ctx.lineTo(x0-(w*0.48+spread*t)*pinch,yy);}
  for(let i=N;i>=1;i--){const t=i/N,yy=y0-L*t,pinch=a>0.2?1-0.22*a*Math.abs(Math.sin(t*Math.PI*5)):1;ctx.lineTo(x0+(w*0.48+spread*t)*pinch,yy);}
  ctx.lineTo(x0+w*0.48,y0);ctx.closePath();
  const g=ctx.createLinearGradient(0,y0,0,y0-L);const al=(0.55+0.45*a)*thr;
  g.addColorStop(0,col([255,120,215],0.95*al));g.addColorStop(0.35,col([225,75,215],0.75*al));g.addColorStop(1,col([150,70,255],0));ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.moveTo(x0-w*0.45,y0);ctx.lineTo(x0,y0-w*1.3*(1+vac));ctx.lineTo(x0+w*0.45,y0);ctx.closePath();ctx.fillStyle=col([95,120,255],0.85*thr);ctx.fill();   // blue core
  if(a>0.12)for(let k=0;k<5;k++){const yy=y0-w*(1.25+1.3*k)*(1+0.4*vac),rr=w*(0.42-0.05*k),gg=ctx.createRadialGradient(x0,yy,0,x0,yy,rr);   // Mach diamonds
    gg.addColorStop(0,col([255,250,255],Math.min(1,1.1*a*thr*(1-0.17*k))));gg.addColorStop(1,col([255,150,230],0));ctx.fillStyle=gg;ctx.beginPath();ctx.arc(x0,yy,rr,0,6.2832);ctx.fill();}
  ctx.restore();}
function srbPlume(ctx,x0,y0,w,a,bright){   // solid exhaust, like SLS boosters at lift-off: a long white-hot column, yellow then orange at the tail, wider in vacuum
  const vac=1-a,fl=0.9+Math.random()*0.2,L=w*(16+6*vac)*fl,spread=Math.tan(lerp(0.04,0.42,Math.pow(vac,0.6)))*L;
  ctx.save();ctx.globalCompositeOperation=bright>0.5?"source-over":"lighter";
  // soft glow around the flame
  {const gg=ctx.createRadialGradient(x0,y0-w*1.5,0,x0,y0-w*1.5,w*5);gg.addColorStop(0,col([255,236,190],0.35*fl));gg.addColorStop(1,col([255,180,90],0));ctx.fillStyle=gg;ctx.fillRect(x0-w*5,y0-w*6.5,w*10,w*10);}
  ctx.beginPath();ctx.moveTo(x0-w*0.5,y0);ctx.lineTo(x0-w*0.55-spread,y0-L);ctx.lineTo(x0+w*0.55+spread,y0-L);ctx.lineTo(x0+w*0.5,y0);ctx.closePath();
  const g=ctx.createLinearGradient(0,y0,0,y0-L);g.addColorStop(0,col([255,253,240],1));g.addColorStop(0.3,col([255,240,190],0.95));g.addColorStop(0.55,col([255,190,90],0.75));g.addColorStop(0.8,col([240,120,40],0.35));g.addColorStop(1,col([190,70,20],0));
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.moveTo(x0-w*0.46,y0);ctx.quadraticCurveTo(x0-w*0.5,y0-w*4,x0,y0-w*(6+2*vac)*fl);ctx.quadraticCurveTo(x0+w*0.5,y0-w*4,x0+w*0.46,y0);ctx.closePath();ctx.fillStyle=col([255,255,250],1);ctx.fill();
  ctx.restore();}
function drawVessel(c,v,bright,plumesOnly){
  c.save();c.translate(v.x,v.y);c.rotate(-v.phi);
  if(v.crashed){c.rotate(v.phi-Math.atan2(v.x,v.y));c.translate(0,-(v.py-Math.min(...v.cpts.map(q=>q[1])))*UM);boom(c,v);c.restore();return;}
  c.scale(UM,UM);c.translate(-v.px,-v.py);
  v.eng.forEach((i,n)=>{if(v.lit[n]){const p=v.ps[i],k=engKey(p);if(p.t==="srb"){srbPlume(c,p.x,p.y,p.w*0.72,v.a,bright);return;}const g=clusterGeo(p),pf=(k==="vac"?0.9:k==="wren"?0.6:k==="bison"?0.88:0.8);if(g.k>1){for(const[ex,row]of g.xs)if(!row)plume(c,p.x+ex,p.y,g.ew*pf,v.thr,v.a,bright,k==="vac");return;}plume(c,p.x,p.y,p.w*pf,v.thr,v.a,bright,k==="vac");}});
  const rp=v.rcsOn&&(v.puff||v.puffR)?v:null;
  for(const p of v.ps)if(p.t==="les"&&v.lesT>0)for(const sd of[-1,1]){c.save();c.translate(p.x+sd*p.w*0.42,p.y+p.h*0.5);c.rotate(sd*2.4);srbPlume(c,0,0,p.w*0.35,v.a,bright);c.restore();}
  if(plumesOnly){c.restore();return;}
  if(v.chute===1&&v.chuteK>0){const cp=v.ps.find(p=>p.t==="capsule");if(cp){const top=cp.y+cp.h,k=v.chuteK,L=cp.w*3.2*k,R2=cp.w*1.5*k;   // three main canopies on long lines
    for(const[ox,oy]of[[-R2*1.25,L*0.92],[0,L],[R2*1.25,L*0.92]]){c.strokeStyle="rgba(220,220,220,.7)";c.lineWidth=0.5;c.beginPath();c.moveTo(cp.x,top);c.lineTo(cp.x+ox-R2,top+oy);c.moveTo(cp.x,top);c.lineTo(cp.x+ox+R2,top+oy);c.stroke();
      c.beginPath();c.ellipse(cp.x+ox,top+oy,R2,R2*0.6,0,0,Math.PI);c.closePath();const gg=c.createLinearGradient(cp.x+ox-R2,0,cp.x+ox+R2,0);gg.addColorStop(0,"#d9472f");gg.addColorStop(0.33,"#d9472f");gg.addColorStop(0.34,"#f2f2f2");gg.addColorStop(0.66,"#f2f2f2");gg.addColorStop(0.67,"#d9472f");c.fillStyle=gg;c.fill();}}}
  for(const p of v.ps)drawPart(c,p,{fuel:hasProp(p)?p.fuel/capOf(p):null,legs:v.legs,frost:p.t==="tank"&&p.fuel>0&&tankSkin(p)!=="foam"?(v.frost||0):0,puff:rp&&p.t==="rcs"&&p.mono>0?rcsPuffs(v,p):null});
  for(const sh of v.shr)if(!v.ps[sh.i].shed)drawShroud(c,sh,1);
  c.restore();}
// which jets on this block are firing: opposite to the push asked for, and sideways ones for turning (in part cm, y up)
function rcsPuffs(v,p){const out=[],cx=p.x,f=p.f>0?1:-1,ox=p.x+f*p.w/2,above=p.y+p.h/2>v.py,t=v.puff||[0,0];
  if(t[1]>0)out.push([cx,p.y,0,-1]);if(t[1]<0)out.push([cx,p.y+p.h,0,1]);
  if(t[0]*f<0)out.push([ox,p.y+p.h/2,f,0]);
  if(v.puffR&&((v.puffR>0)===(above===(f<0))))out.push([ox,p.y+p.h/2,f,0]);   // turning clockwise: jets above push left, below push right
  return out;}
function boom(c,v){   // fireball, flying debris and a smoke column, in local up-is-up metres
  const t=v.boomT,S=v.boomS;
  for(const d of v.debris){d.t=d.t||0;const dt=t-d.t;d.t=t;if(d.y>0||d.vy>0){d.vy-=9.81*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.rot+=d.vr*dt;if(d.y<0){d.y=0;d.vy=0;d.vx*=0.3;d.vr=0;}}
    c.save();c.translate(d.x,d.y+0.05);c.rotate(d.rot);c.fillStyle=d.c;c.fillRect(-d.l/2,-0.07,d.l,0.14);c.restore();}
  if(t<2.5){const k=t/2.5,rad=S*(0.4+1.4*Math.sqrt(Math.min(1,t/0.5))),g=c.createRadialGradient(0,S*0.3,0,0,S*0.3,rad);
    g.addColorStop(0,`rgba(255,250,220,${0.95*(1-k)})`);g.addColorStop(0.35,`rgba(255,170,50,${0.85*(1-k)})`);g.addColorStop(0.7,`rgba(200,60,20,${0.5*(1-k)})`);g.addColorStop(1,"rgba(80,20,10,0)");
    c.fillStyle=g;c.beginPath();c.arc(0,S*0.3,rad,0,6.2832);c.fill();}
  for(let i=0;i<14;i++){const tt=t-i*0.18;if(tt<=0)continue;const k=Math.min(1,tt/10),x=Math.sin(i*2.1)*S*0.35+tt*(0.5+0.4*Math.sin(i*1.3)),y=S*0.4+tt*(2.2+0.25*(i%4)),rad=S*0.3+tt*1.1,al=0.28*(1-k)*Math.min(1,tt*2);
    const g=c.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,`rgba(52,48,50,${al})`);g.addColorStop(1,"rgba(52,48,50,0)");c.fillStyle=g;c.beginPath();c.arc(x,y,rad,0,6.2832);c.fill();}
  if(t<0.5){const g=c.createRadialGradient(0,S*0.3,0,0,S*0.3,S*3);g.addColorStop(0,`rgba(255,255,235,${(0.5-t)*1.2})`);g.addColorStop(1,"rgba(255,255,235,0)");c.fillStyle=g;c.beginPath();c.arc(0,S*0.3,S*3,0,6.2832);c.fill();}}
function padAt(c,ang,draw){c.save();c.translate(PR*Math.sin(ang),PR*Math.cos(ang));c.rotate(-ang);draw();c.restore();}
function renderFlight(dt){
  const c=fx,r=AV,B=BOD[r.body],h=Math.hypot(r.x,r.y)-B.R,psi=Math.atan2(r.x,r.y);
  c.setTransform(1,0,0,1,0,0);
  if(mapView){renderMap(c);return;}
  // sky: blue by day, orange at sunrise and sunset, navy at night, grey under rain clouds, black in space (always on the Moon)
  const now=performance.now()/1000,sun=r.body===0?(()=>{const sy=skyFor(psi,h,FT,true);return sy;})():skyFor(psi,h,FT,false),sk=sun.sk,bright=(1-sk)*sun.day,top=sun.top,bot=sun.bot;
  const g=c.createLinearGradient(0,0,0,FH);g.addColorStop(0,col(top,1));g.addColorStop(1,col(bot,1));c.fillStyle=g;c.fillRect(0,0,FW,FH);
  if(sun.stars>0.25){c.fillStyle=`rgba(255,255,255,${(sun.stars-0.25)*0.9*(1-0.8*Math.min(1,wx.cl-0.5)*(1-sk))})`;for(let i=0;i<160;i++){const sx=(i*9301+49297)%233280/233280*FW,sy=(i*4673+12345)%93179/93179*FH;c.fillRect(sx,sy,i%7?1.2:2,i%7?1.2:2);}}
  // camera: the craft in the middle, local "up" pointing up the screen
  // camera like a tracking shot: close on the rocket at first, then pulling back as it climbs so the ground stays in the bottom of
  // the frame (and the whole planet shows from orbit). The mouse wheel zooms on top of that.
  const hAGc=h-(r.body===0?Math.max(0,terrH(psi*PR)):0),hAG=Math.max(1,hAGc),sBase=FH/(Math.max(2.4,r.H)*3.4),sFol=FH*0.42/hAG;
  const s=Math.max(1e-7,Math.min(sBase,sFol)*zoomF);
  // live camera: a slow drift like a handheld long lens, plus shake from thrust, from the air pushing on the rocket,
  // and a jolt when an engine lights or a stage goes. All of it is off for players who asked their system for less motion.
  camT+=dt;kickF=Math.max(0,kickF-dt*1.5);flashF=Math.max(0,flashF-dt*2);
  const still=typeof REDUCED!=="undefined"&&REDUCED,thrK=r.F>0&&r.m?Math.min(1,r.F/(r.m*9.81*2.5)):0;
  const amp=still?0:FDS*(kickF*12+thrK*(0.4+r.a)*1.6+Math.min(1,(r.q||0)/25000)*4),dr=still?0:FDS;
  const ox=(Math.sin(camT*0.31)*6+Math.sin(camT*0.17+1)*4)*dr+(Math.random()-0.5)*amp,oy=(Math.sin(camT*0.23+2)*4+Math.sin(camT*0.13)*3)*dr+(Math.random()-0.5)*amp;
  c.setTransform(1,0,0,1,FW/2+ox,FH*0.55+oy);c.scale(s,-s);c.rotate(psi);c.translate(-r.x,-r.y);
  // clouds: far ones (d > 0) first, smaller and closer to the rocket's spot, so they slide by slower (parallax); near ones (d < 0)
  // are drawn later, over the rocket. Grey in rain, tinted at sunrise and sunset, dimmer at night.
  const cLC=mixC(wx.rain?[170,176,186]:[255,255,255],[255,180,130],sun.dusk*0.6).map(v=>v*Math.max(0.25,sun.light)|0).join(),cDK=mixC([120,128,140],[90,70,80],sun.dusk*0.5).map(v=>v*Math.max(0.25,sun.light)|0).join();
  const cloudPass=front=>{if(r.body!==0)return;const vw=Math.hypot(FW,FH)/s;for(const cl of clouds){if((cl.d<0)!==front)continue;if(!front)cl.a+=windDir*wx.wind*dt/(PR+cl.h);
    const cr=PR+cl.h,cx=Math.sin(cl.a)*cr,cy=Math.cos(cl.a)*cr,f=1/(1+cl.d),px2=r.x+(cx-r.x)*f,py2=r.y+(cy-r.y)*f,w=cl.w*f;
    if(Math.hypot(px2-r.x,py2-r.y)>vw+w)continue;c.save();c.translate(px2,py2);c.rotate(-cl.a);drawCloud(c,cl,w,cLC,cDK,cl.o*(1-sk)*(front?0.8:1));c.restore();}};
  cloudPass(false);
  // exhaust smoke (only where there's air to make it)
  for(const p of smoke){p.t+=dt;if(p.body===0&&B.atm){const rr=Math.hypot(p.x,p.y);p.x+=windDir*wx.wind*dt*p.y/rr;p.y-=windDir*wx.wind*dt*p.x/rr;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.985;p.vy*=0.985;}
  smoke=smoke.filter(p=>p.t<p.life&&p.body===r.body);
  for(const p of smoke){const k=p.t/p.life,rad=p.r0+p.r1*k;
    if(p.flake){c.fillStyle=`rgba(240,246,255,${(1-k)})`;c.fillRect(p.x,p.y,0.3,0.3);continue;}
    c.fillStyle=p.vap?`rgba(246,249,253,${0.42*(1-k)*Math.min(1,k*6)})`:`rgba(225,225,232,${0.32*(1-k)*p.o})`;c.beginPath();c.arc(p.x,p.y,rad,0,6.2832);c.fill();}
  if(r.body===0){
    // from high up the air shows as a thin glowing line along the planet's curve (blue by day, orange at the terminator)
    if(h>8000){const k=Math.min(1,(h-8000)/20000),gl=c.createRadialGradient(0,0,PR,0,0,PR+60000),cc=mixC([120,180,255],[255,150,90],sun.dusk*0.7).map(v=>v|0).join();
      gl.addColorStop(0,`rgba(${cc},${0.75*k*Math.max(0.15,sun.day)})`);gl.addColorStop(0.25,`rgba(${cc},${0.3*k*Math.max(0.1,sun.day)})`);gl.addColorStop(1,`rgba(${cc},0)`);c.fillStyle=gl;c.beginPath();c.arc(0,0,PR+60000,0,6.2832);c.fill();}
    // Earth: real ground (biomes, sea, trees, rocks, buildings: world.js), then the pads on top
    drawEarth(c,psi*PR,s,FT,now);
    // pads are drawn at a scale that fits the rocket (k), with the pad's top at ground level so the rocket stands on it
    {const fx=padFx(),lit=AV.F>0&&hAGc<200;   // the pad: water deluge, launch tower with its swing arms, hold-down clamps, heat shimmer
      padAt(c,0,()=>{drawDeluge(c,launchW,fx.deluge,now);drawTower(c,launchW,launchH,fx.up,fx.lo);drawClamps(c,launchW,fx.clamp);if(lit)drawShimmer(c,launchW,Math.min(1,AV.F/(AV.m*9.81)),now);});}
    padAt(c,PAD2/PR,()=>{c.scale(5,5);c.translate(0,-0.4);c.fillStyle="#6d7586";c.fillRect(-9,-0.5,18,0.9);c.fillStyle="#e8e9ee";c.fillRect(-6,0.38,12,0.04);c.fillStyle="#e8b923";for(const x of[-7.5,7.5])c.fillRect(x-0.4,0.36,0.8,0.06);
      c.fillStyle="#d24b3a";c.fillRect(-0.15,0.4,0.3,3);c.beginPath();c.moveTo(0.15,3.4);c.lineTo(1.8,3.05);c.lineTo(0.15,2.7);c.fill();});}
  else{
    // the Moon: grey dust, darker patches and craters rimmed with light
    c.fillStyle="#8b8d94";c.beginPath();c.arc(0,0,RM,0,6.2832);c.fill();c.fillStyle="#9fa1a8";c.beginPath();c.arc(0,0,RM-0.6,0,6.2832);c.fill();
    if(h<20000)for(let i=0;i<120;i++){const an=i*0.0523+Math.sin(i*7.1)*0.02,cr=(4+((i*37)%23))*(i%9===0?8:1);if(Math.abs(wrapA(an-psi))>0.05+h/RM)continue;
      c.save();c.translate(RM*Math.sin(an),RM*Math.cos(an));c.rotate(-an);c.fillStyle="#7b7d84";c.beginPath();c.ellipse(0,0,cr,cr*0.18,0,Math.PI,0);c.fill();c.fillStyle="#b4b6bc";c.fillRect(-cr*1.05,-0.15,cr*0.25,0.3);c.fillRect(cr*0.8,-0.15,cr*0.25,0.3);c.restore();}}
  // shroud halves tumbling away
  const dq=dt*(r.wv||1);for(const q of flyers){if(q.body!==r.body)continue;const Bq=BOD[q.body],rq=Math.hypot(q.x,q.y),g=-Bq.mu/(rq*rq)*dq;q.t+=dq;
    if(rq>Bq.R){q.vx+=g*q.x/rq;q.vy+=g*q.y/rq;const sp=Math.hypot(q.vx,q.vy),rho=Bq.atm?atmRho(rq-Bq.R):0,drag=Math.min(0.9,rho*sp*0.02*dq);q.vx*=1-drag;q.vy*=1-drag;q.x+=q.vx*dq;q.y+=q.vy*dq;q.ang+=q.om*dq;}
    c.save();c.translate(q.x,q.y);c.rotate(-q.ang);const L=-q.w/2,R=q.w/2;const gg=c.createLinearGradient(L,0,R,0);gg.addColorStop(0,q.side<0?"#1c1d21":"#4a4d55");gg.addColorStop(1,q.side<0?"#4a4d55":"#2a2c31");
    c.fillStyle=gg;c.fillRect(L,-q.h/2,q.w,q.h);c.fillStyle="#6a6d75";c.fillRect(L,q.h/2-0.03,q.w,0.03);c.restore();}
  flyers=flyers.filter(q=>q.t<25&&Math.hypot(q.x,q.y)>BOD[q.body].R);
  // every craft near this one: the one you fly, dropped stages, boosters
  for(const v of VS){if(v.body!==r.body||Math.hypot(v.x-r.x,v.y-r.y)>Math.max(4000,FH/s*2))continue;
    if(v.F>0&&v.a>0.03&&smoke.length<600){const cc=Math.cos(v.phi),ss=Math.sin(v.phi);v.eng.forEach((i,n)=>{const p=v.ps[i],sol=p.t==="srb";if(!v.lit[n]||Math.random()>(sol?1.6:0.8*v.thr)*v.a)return;
      const[wx,wy]=loc(v,(p.x-v.px)*UM,(p.y-v.py)*UM),sp=25+Math.random()*25;
      smoke.push({body:v.body,x:wx,y:wy,vx:v.vx*0.3-ss*sp+(Math.random()-0.5)*8,vy:v.vy*0.3-cc*sp+(Math.random()-0.5)*8,t:0,life:(sol?6:3)+Math.random()*3,r0:p.w*UM*0.8,r1:((sol?10:6)+Math.random()*10)*Math.max(1,p.w*UM/2),o:v.a*(sol?1.6:1)});});}
    drawVessel(c,v,bright);}
  cloudPass(true);
  // re-entry glow: the air in front of the craft heats to plasma: an orange-pink glow on the leading side, streaming behind
  for(const v of VS){if(v.body!==r.body||!(v.hf>2e7)||v.crashed)continue;const sp=Math.hypot(v.vx,v.vy),ux=v.vx/sp,uy=v.vy/sp,k=Math.min(1,(v.hf-2e7)/2e8),L=Math.max(v.H,v.W)*0.5;
    c.save();c.globalCompositeOperation="lighter";const fxp=v.x+ux*L,fyp=v.y+uy*L,R=v.W*1.2+k*L*1.5,gg=c.createRadialGradient(fxp,fyp,0,fxp,fyp,R);gg.addColorStop(0,`rgba(255,235,210,${0.8*k})`);gg.addColorStop(0.4,`rgba(255,120,60,${0.5*k})`);gg.addColorStop(1,"rgba(255,60,120,0)");
    c.fillStyle=gg;c.beginPath();c.arc(fxp,fyp,R,0,6.2832);c.fill();const tl=L*(3+6*k);c.beginPath();c.moveTo(fxp-uy*R*0.7,fyp+ux*R*0.7);c.lineTo(v.x-ux*tl,v.y-uy*tl);c.lineTo(fxp+uy*R*0.7,fyp-ux*R*0.7);c.closePath();
    const g2=c.createLinearGradient(fxp,fyp,v.x-ux*tl,v.y-uy*tl);g2.addColorStop(0,`rgba(255,140,90,${0.45*k})`);g2.addColorStop(1,"rgba(255,80,160,0)");c.fillStyle=g2;c.fill();c.restore();}
  // exhaust steam clouds: big soft billows, lit orange from below while the flame is close
  if(steam.length&&r.body===0){const lx=AV.F>0&&hAGc<400?Math.max(0,1-hAGc/400):0,[nx,ny]=loc(r,0,-(r.py-Math.min(...r.cpts.map(q=>q[1])))*UM);
    for(const q of steam){const k=q.t/q.life,rad=q.r0+q.r1*Math.sqrt(k),al=0.55*(1-k)*Math.min(1,q.t*3),d=Math.hypot(q.x-nx,q.y-ny),lit=lx*Math.max(0,1-d/150);
      const cR=Math.round(235*q.g+15*lit),cG=Math.round(235*q.g-25*lit),cB=Math.round(238*q.g-60*lit),gg=c.createRadialGradient(q.x,q.y,0,q.x,q.y,rad);
      gg.addColorStop(0,`rgba(${cR},${cG},${cB},${al})`);gg.addColorStop(0.65,`rgba(${cR},${cG},${cB},${al*0.6})`);gg.addColorStop(1,`rgba(${cR},${cG},${cB},0)`);c.fillStyle=gg;c.beginPath();c.arc(q.x,q.y,rad,0,6.2832);c.fill();}}
  if(r.body===0&&r.F>0&&hAGc<500){const[nx,ny]=loc(r,0,-(r.py-Math.min(...r.cpts.map(q=>q[1])))*UM);drawFlameGlow(c,nx,ny,Math.min(1,r.F/(r.m*9.81)*0.5)*(1-hAGc/500));}
  // night (and the planet's shadow in orbit): darken everything, then put back what glows: lights and engine flames
  const dark=1-sun.light;
  if(dark>0.02){c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=`rgba(4,8,22,${dark*0.85})`;c.fillRect(0,0,FW,FH);c.restore();
    if(r.body===0)drawNightLights(c,psi*PR,s,now,dark);
    c.save();c.globalCompositeOperation="lighter";c.globalAlpha=Math.min(1,dark*1.2);for(const v of VS)if(v.body===r.body&&v.F>0&&!v.crashed)drawVessel(c,v,0,true);c.restore();}
  if(r.body===0&&sk<1)drawEarthShadow(c,psi,h,s);
  c.setTransform(1,0,0,1,0,0);
  if(r.body===0)drawRain(c,h,now,dt);
  if(r.body===0){const fog=cloudFog(clouds,r.x,r.y);if(fog>0.01){c.fillStyle=`rgba(${cLC},${Math.min(0.92,fog)})`;c.fillRect(0,0,FW,FH);}}   // flying through a cloud
  if(r.H*s<10&&!r.crashed){const X=FW/2+ox,Y=FH*0.55+oy;c.strokeStyle="#fff";c.lineWidth=1.5*FDS;c.beginPath();c.moveTo(X-7*FDS,Y+8*FDS);c.lineTo(X,Y-6*FDS);c.lineTo(X+7*FDS,Y+8*FDS);c.stroke();   // too small to see: a marker
    c.font=`600 ${10*FDS}px ${getComputedStyle(document.body).fontFamily}`;c.fillStyle="rgba(255,255,255,.8)";c.textAlign="center";c.fillText(r.name.toUpperCase(),X,Y+22*FDS);c.textAlign="left";}
  if(flashF>0.01){const g2=c.createRadialGradient(FW/2+ox,FH*0.62+oy,0,FW/2+ox,FH*0.62+oy,FH*0.9);   // ignition flash and bloom
    g2.addColorStop(0,`rgba(255,246,230,${0.75*flashF})`);g2.addColorStop(0.35,`rgba(255,200,150,${0.3*flashF})`);g2.addColorStop(1,"rgba(255,160,100,0)");
    c.save();c.globalCompositeOperation="lighter";c.fillStyle=g2;c.fillRect(0,0,FW,FH);c.restore();}}
// ---------- readouts ----------
const km=x=>Math.abs(x)>=1000?(x/1000).toFixed(1)+" km":Math.round(x)+" m";
const tfm=t=>{if(!isFinite(t))return"–";t=Math.max(0,t);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${h} h ${String(m).padStart(2,"0")} m`:m?`${m} m ${String(s).padStart(2,"0")} s`:t.toFixed(1)+" s";};
const clk=t=>{t=Math.max(0,t);return[Math.floor(t/3600),Math.floor(t%3600/60),Math.floor(t%60)].map(x=>String(x).padStart(2,"0")).join(":");};
// every number goes through the rolling-number helper (ui.js); the headless tests have no page, so fall back to plain text
const RL=typeof roll!=="undefined"?roll:(k,el,v,f)=>{if(el)el.textContent=v==null?"–":f(v);};
const rv=(id,v,f)=>RL(id,$(id),v,f),kmF=x=>km(x),ms=x=>fmt(x)+" m/s",sms=x=>(x>=0?"+":"")+fmt(x)+" m/s";
// SAS: [mode, button text, name, what it does]
const SAS_INFO=[["stab","STB","Stability","hold the heading you're on"],["pro","PRO","Prograde","nose along your path (speed up)"],["retro","RET","Retrograde","nose against your path (slow down)"],
  ["radout","R+","Radial out","square to your path, away from the planet"],["radin","R−","Radial in","square to your path, toward the planet"],
  ["sfpro","S+","Surface prograde","along your path over the ground"],["sfretro","S−","Surface retro","against your path over the ground: for landings"],
  ["hzE","E","Horizon east","flat along the ground, heading east"],["hzW","W","Horizon west","flat along the ground, heading west"]];
function toggleRcs(){if(!AV||AV.crashed)return;if(!AV.rcs.length){msg="No RCS thrusters on this craft. Add them in the editor.";msgT=2.5;return;}
  AV.rcsOn=!AV.rcsOn;msg=AV.rcsOn?"RCS on: helps turning. I / K forward / back, J / L sideways.":"RCS off";msgT=2.5;}
const clockStr=h=>String(Math.floor(h)).padStart(2,"0")+":"+String(Math.floor(h%1*60)).padStart(2,"0");
let tN=0,moonT=null;
function warpToEventAt(t,what){warpTo=t;warpWhat=what;}
// warp to an event: sunrise/sunset where the craft is, the next apoapsis or periapsis, or arriving at the Moon
function warpToEvent(k){const r=AV;if(!r)return;if(k==="stop"){warpTo=null;warp=1;return;}
  const psi=Math.atan2(r.x,r.y),hr=hourAt(psi,FT),until=x=>{const d=((x-hr+24)%24)*DAY/24;return d<2?d+DAY:d;},o=orbitOf(r),tt=orbTimes(r,o,BOD[r.body]);
  let dt=null,what="";
  if(k==="sunrise"){dt=until(6)-1;what="sunrise";}else if(k==="sunset"){dt=until(18)-1;what="sunset";}
  else if(k==="ap"&&tt){dt=tt.ap-15;what="apoapsis";}else if(k==="pe"&&tt){dt=tt.pe-15;what="periapsis";}
  else if(k==="moon"&&moonT!=null){dt=moonT-FT-60;what="the Moon";}
  if(dt==null||dt<1){msg="Nothing to warp to.";msgT=2;return;}
  if(!r.landed&&r.F>0){msg="Cut the engines first (X), then warp.";msgT=2.5;return;}
  warpTo=FT+dt;warpWhat=what;msg="Warping to "+what+"…";msgT=2;}
function setSas(m){if(!AV||AV.crashed||!m)return;AV.sas=m;AV.hold=m==="stab"?AV.phi:null;const i=SAS_INFO.find(q=>q[0]===m);msg="SAS: "+i[2]+" ("+i[3]+")";msgT=2.2;}
let rowsBuilt=false,stgSig="",sasSig="";
function buildRows(){
  const mk=(box,list)=>{$(box).innerHTML=list.map(([id,l,t])=>id==="-"?`<div class="grp">${l}</div>`:`<span${t?` title="${t}"`:""}>${l}</span><b id="${id}">–</b>`).join("");};
  mk("fOrbit",[["oAp","Apoapsis","Highest point of the orbit, above the ground"],["oPe","Periapsis","Lowest point of the orbit, above the ground"],["oTAp","Time to Ap"],["oTPe","Time to Pe"],
    ["-","Shape"],["oPer","Period","Time for one lap"],["oE","Eccentricity","0 = a perfect circle, 1 or more = escaping"],["oA","Semi-major axis","Half the long width of the orbit, from the planet's centre"],["oV","Orbital speed"],["oSoi","Gravity of","Which body's gravity you're in (sphere of influence)"]]);
  mk("fSurf",[["sAlt","Altitude","Height above the ground (or the sea) right below"],["sBio","Below","What's under you"],["sGnd","Ground height","Height of the ground below above sea level"],["sVs","Vertical speed"],["sHs","Horizontal speed"],["sSp","Surface speed","Speed over the ground (the planets here don't spin, so it equals orbital speed)"],
    ["-","Air"],["sQ","Dynamic pressure","q: how hard the air pushes on the rocket. Rockets throttle down around the peak, Max-Q"],["sMq","Max-Q"],["sDrag","Drag"],["sRho","Air density"],["sHeat","Heating","How hot the air gets in front of you: air density × speed³. Over ~8×10⁷ for long burns a craft up; a capsule heat-shield-first takes 15× more"],
    ["-","Ground"],["sPad","To launch pad"],["sLz","To landing zone"]]);
  mk("fVesP",[["vM","Mass (wet)","With the fuel that's left"],["vDry","Mass (dry)","Empty tanks"],["vTwr","TWR now","Thrust ÷ weight right now. Above 1 = climbing"],["vTwrM","TWR max","At full throttle"],
    ["vLit","Engines lit"],["vRcs","RCS fuel","Monopropellant for the RCS jets (T turns them on)"],["vSrb","Booster burn left"],["vDvT","Total Δv","Speed change left in all stages"]]);
  mk("fTime",[["tClock","Local time","Time of day where the craft is (a day lasts 20 minutes)"],["tDay","Day"],["tSun","Sun"],["tRise","Next sunrise"],["tSet","Next sunset"],
    ["-","Weather"],["tWx","Sky"],["tWind","Wind","Scenery only: it moves clouds, smoke, trees and waves, not the rocket"],["-","Warp"],["tWarp","Time warp"]]);
  for(const b of $("fWarpTo").querySelectorAll("[data-wt]"))b.onclick=()=>warpToEvent(b.dataset.wt);
  mk("fData",[["dAp","Ap"],["dPe","Pe"],["dTwr","TWR"],["dDv","Δv"],["dFuel","Fuel"],["dNext","Next"]]);
  $("fSasB").innerHTML=SAS_INFO.map(([m,t,n],i)=>`<button type="button" data-sas="${m}" title="${n} (${i+1})">${t}</button>`).join("");
  $("fSasL").innerHTML=SAS_INFO.map(([m,t,n,d],i)=>`<button type="button" data-sas="${m}"><kbd>${i+1}</kbd>${n}<small>${d}</small></button>`).join("");
  for(const b of document.querySelectorAll("[data-sas]"))b.onclick=()=>setSas(b.dataset.sas);
  rowsBuilt=true;}
// time to the next apoapsis / periapsis, from where we are on the ellipse (Kepler's equation)
function orbTimes(r,o,B){if(o.esc||!(o.a>0))return null;const rr=Math.hypot(r.x,r.y),sg=o.hz>=0?1:-1,e=o.e,n=Math.sqrt(B.mu/(o.a*o.a*o.a));
  const nu=Math.atan2(sg*(o.ex*r.y-o.ey*r.x),o.ex*r.x+o.ey*r.y),E=2*Math.atan(Math.sqrt((1-e)/(1+e))*Math.tan(nu/2)),M=E-e*Math.sin(E),P=2*Math.PI;
  return{per:P/n,pe:(((P-M)%P)+P)%P/n,ap:(((Math.PI-M)%P)+P)%P/n};}
function hudFlight(dt){
  if(!rowsBuilt)buildRows();
  const r=AV,B=BOD[r.body],rr=Math.hypot(r.x,r.y),h=rr-B.R,ux=r.x/rr,uy=r.y/rr,vv=r.vx*ux+r.vy*uy,vh=r.vx*uy-r.vy*ux,o=orbitOf(r),sp=Math.hypot(r.vx,r.vy),psi=Math.atan2(r.x,r.y);
  const set=(id,v)=>{const el=$(id);if(el.textContent!==v)el.textContent=v;};
  // --- always on screen: the two dials, the clock and the timeline
  rv("fSpd",sp,fmt);$("dSpd").querySelector(".arc").style.strokeDasharray=`${245*Math.min(1,Math.log10(1+sp)/Math.log10(11001))} 999`;
  const big=h>=10000;rv("fAlt",big?h/1000:h,big?(x=>x.toFixed(1)):fmt);set("fAltU",big?"KM":"M");
  $("dAlt").querySelector(".arc").style.strokeDasharray=`${245*Math.min(1,Math.log10(1+Math.max(0,h))/Math.log10(2.6e6))} 999`;
  set("fClock",CD.s==="count"?"T−"+clk(Math.ceil(CD.t)):CD.s==="wait"?"T−00:00:10":T0==null?"T−00:00:00":"T+"+clk(FT-T0));
  $("fCount").style.display=CD.s==="wait"&&!r.crashed?"":"none";
  if(!anAV||++hudN%15===0)anAV=analyze(r.ps,EN,r.ps.map(p=>p.fuel||0));
  if(CD.s!=="go")set("fStageN",CD.s==="wait"?"HOLD · ON THE PAD":"COUNTDOWN");else set("fStageN",r.ctrl?`STAGE ${Math.min(nSt0,Math.max(1,nSt0-anAV.stages.length+1))} / ${nSt0}`:"");
  set("fVes",r.name+(r.body?" · MOON":" · "+clockStr(hourAt(psi,FT))+" · DAY "+(1+Math.floor((FT+CLK0/24*DAY)/DAY))));set("fWarp",r.wv>1||warp>1?`WARP ${r.wv<warp?r.wv+"× ("+warpWhy+")":warp+"×"}`:"");
  // events: what just happened gets a callout and a tick on the timeline
  if(!said.lift&&!r.landed&&r.t>0.2&&h>1.5){said.lift=1;T0=FT;mark("liftoff");callout("LIFTOFF");kickF=Math.max(kickF,0.7);}
  if(r.body===0&&r.q>qMax){qMax=r.q;qT=FT;}
  if(!said.maxq&&qMax>1500&&r.q<qMax*0.85&&h>500){said.maxq=1;mark("maxq",qT);callout("MAX-Q",(qMax/1000).toFixed(1)+" kPa · the air's hardest push");}
  if(JX){if(r.maxAlt>20)JX.goal("launch");if(r.body===0&&h>10000)JX.goal("km10");}
  if(r.body===0){if(!said.orbit&&!o.esc&&o.pe>ATM_TOP){said.orbit=1;if(JX)JX.goal("orbit");mark("orbit");callout("ORBIT",`${km(o.pe)} × ${km(o.ap)}`);}
    if(o.esc&&!said.esc){said.esc=1;callout("ESCAPE VELOCITY","leaving Earth for good");}
    if(!said.space&&h>ATM_TOP){said.space=1;if(JX)JX.goal("space");mark("space");callout("SPACE","above 40 km");}}
  else if(!said.morb&&!o.esc&&o.pe>2000){said.morb=1;callout("LUNAR ORBIT",`${km(o.pe)} × ${km(o.ap)}`);}
  const sg=EV.map(e=>e.l+(e.t!=null)).join();
  if(sg!==evSig){evSig=sg;const n=EV.length,box=$("fTl");let last=-1;EV.forEach((e,i)=>{if(e.t!=null)last=i;});
    box.querySelectorAll(".ev").forEach(x=>x.remove());
    EV.forEach((e,i)=>{const d=document.createElement("i");d.className="ev"+(e.t!=null?" done":i===last+1?" next":"");d.style.left=(n>1?i/(n-1)*100:0)+"%";
      d.innerHTML=`<em>${e.l}</em>`;if(e.t!=null&&T0!=null)d.title="T+"+clk(e.t-T0);box.appendChild(d);});
    $("fTlFill").style.width=(last<0?0:n>1?last/(n-1)*100:100)+"%";}
  // --- heading ring: your nose, where you're going, and the SAS hold (red)
  const deg=a=>wrapA(a)*180/Math.PI,rot=(id,a,on)=>{const g=$(id);g.style.transform=`rotate(${deg(a)}deg)`;g.style.opacity=on?1:0;};
  rot("hgNose",r.phi-psi,true);rot("hgPro",Math.atan2(r.vx,r.vy)-psi,sp>1);rot("hgRet",Math.atan2(-r.vx,-r.vy)-psi,sp>1);
  rot("hgHold",(r.hold==null?r.phi:r.hold)-psi,r.sas&&r.sas!=="stab"&&r.hold!=null);
  const sm=r.sas||"stab";if(sm!==sasSig){sasSig=sm;for(const b of document.querySelectorAll("[data-sas]"))b.classList.toggle("on",b.dataset.sas===sm);}
  // --- pull-out panels: only worked out while they're open
  const open=id=>!$(id).classList.contains("folded");
  const st=anAV.stages[0]||{dv:0};let sf=0,sc=0;const seen=new Set();r.feeds.forEach(f=>f.forEach(j=>{if(!seen.has(j)){seen.add(j);sf+=r.ps[j].fuel;sc+=capOf(r.ps[j]);}}));
  const g=B.mu/(rr*rr),Fn=r.est.reduce((q,E)=>q+E.vac.F-(E.vac.F-E.sl.F)*r.a,0),twrMax=Fn/((r.m||1)*g),twr=(r.F||0)/((r.m||1)*g);
  set("fThrO",Math.round(r.thr*100)+"%");
  if(open("fpData")){rv("dAp",o.esc?null:o.ap,kmF);rv("dPe",o.pe,kmF);rv("dTwr",twrMax,x=>x.toFixed(2));rv("dDv",st.dv,ms);rv("dFuel",sf,fM);
    $("fFuelBar").style.width=(sc?100*sf/sc:0)+"%";const nd=st.dropKind;set("dNext",nd?(nd==="boosters"?"drop boosters":"drop stage"):"–");if(o.esc)set("dAp",r.body?"leaving":"escaping");}
  if(open("fpOrbit")){const tt=orbTimes(r,o,B);rv("oAp",o.esc?null:o.ap,kmF);if(o.esc)set("oAp",r.body?"leaving":"escaping");rv("oPe",o.pe,kmF);
    set("oTAp",tt?tfm(tt.ap):"–");set("oTPe",tt?tfm(tt.pe):"–");set("oPer",tt?tfm(tt.per):"–");rv("oE",o.e,x=>x.toFixed(3));rv("oA",o.esc?null:o.a,kmF);rv("oV",sp,ms);set("oSoi",B.name);}
  if(open("fpSurf")){const gh=r.body===0?terrH(psi*PR):0;rv("sAlt",h-Math.max(0,gh),kmF);set("sBio",r.body?"Moon":gh<0?"Ocean":biomeAt(psi*PR)[2]);set("sGnd",r.body?"–":gh<0?"sea, "+km(-gh)+" deep":km(gh));rv("sVs",vv,sms);rv("sHs",Math.abs(vh),ms);rv("sSp",sp,ms);rv("sQ",r.q||0,x=>x>=1000?(x/1000).toFixed(2)+" kPa":Math.round(x)+" Pa");
    set("sMq",qMax>0?(qMax/1000).toFixed(2)+" kPa":"–");rv("sDrag",r.D||0,x=>x>=1000?(x/1000).toFixed(2)+" kN":Math.round(x)+" N");rv("sRho",r.rho||0,x=>x.toFixed(x>0.01?3:5)+" kg/m³");set("sHeat",r.hf>1e6?(r.hf/(r.shielded?1.2e9:8e7)*100).toFixed(0)+"% of the limit"+(r.shielded?" (shield)":""):"–");
    const ang=r.body===0?Math.atan2(r.x,r.y)*PR:null,arw=d=>d>0.5?" ←":d<-0.5?" →":" ✓";
    set("sPad",ang==null?"–":km(Math.abs(ang))+arw(ang));set("sLz",ang==null?"–":km(Math.abs(ang-PAD2))+arw(ang-PAD2));}
  if(open("fpTime")){const hr=hourAt(psi,FT),until=x=>((x-hr+24)%24)*DAY/24,tt=orbTimes(r,o,B);
    set("tClock",clockStr(hr)+(r.body?" (Earth time)":""));set("tDay",String(1+Math.floor((FT+CLK0/24*DAY)/DAY)));set("tSun",sunEl(psi,FT)+sunDip(h)>0?"day":"night");
    set("tRise",tfm(until(6)));set("tSet",tfm(until(18)));set("tWx",r.body?"no air":wx.n);set("tWind",r.body?"–":Math.round(wx.wind*3.6)+" km/h "+(windDir>0?"from the west":"from the east"));
    set("tWarp",warpTo!=null?"to "+warpWhat+" in "+tfm(warpTo-FT):r.wv>1?r.wv+"×":"off");
    if(++tN%20===0){const P=r.body===0&&!o.esc?predict(r.body,r.x,r.y,r.vx,r.vy,FT):null;const mk2=P&&P.marks.find(m=>m.k==="enter");moonT=mk2?FT+mk2.t:null;}
    $("fWarpTo").querySelector('[data-wt="ap"]').disabled=!tt;$("fWarpTo").querySelector('[data-wt="pe"]').disabled=!tt;$("fWarpTo").querySelector('[data-wt="moon"]').disabled=moonT==null;}
  if(open("fpVes")){rv("vM",r.m||0,fM);rv("vDry",r.dry,fM);rv("vTwr",twr,x=>x.toFixed(2));rv("vTwrM",twrMax,x=>x.toFixed(2));
    set("vLit",`${r.lit.filter(Boolean).length} of ${r.eng.length}`);
    set("vRcs",r.rcs.length?`${fM(r.rcs.reduce((a,p)=>a+p.mono,0))}${r.rcsOn?" · on":""}`:"none");
    let bl=0;r.eng.forEach((i,n)=>{const P=r.ps[i];if(P.t!=="srb"||!r.lit[n])return;let av=0;for(const j of r.feeds[n])av+=r.ps[j].fuel;const E=r.est[n];bl=Math.max(bl,av*E.vac.isp*G0/E.vac.F);});
    set("vSrb",bl>0?tfm(bl):"–");rv("vDvT",anAV.total,ms);
    const hs=anAV.stages.map((q,k)=>`<div class="sr"><b>Stage ${k+1}</b><span>Δv <b>${fmt(q.dv)}</b></span><span>${Math.round(q.burn)} s</span><i>TWR ${q.twr.toFixed(2)} · ${q.eng} engine${q.eng===1?"":"s"}</i></div>`).join("");
    if(hs!==stgSig){stgSig=hs;$("fStg").innerHTML=hs;}}
  $("fStage").disabled=CD.s==="go"&&!st.dropKind;$("fLegs").style.display=r.hasLegs?"":"none";$("fLegs").classList.toggle("on",r.legs);$("fAbort").style.display=r.hasLes&&!r.crashed?"":"none";$("fChute").style.display=r.hasCap&&!r.chute&&!r.crashed&&r.body===0?"":"none";$("fRcs").style.display=r.rcs.length?"":"none";$("fRcs").classList.toggle("on",!!r.rcsOn);
  msgT-=dt;const mb=$("fMsg");mb.style.display=msgT>0?"":"none";if(msgT>0)set("fMsg",msg);
  if(JX)apHud();
  $("fRetry").style.display=r.crashed?"":"none";$("fMapBar").style.display=mapView?"":"none";}
// autopilot panels
if(JX){const num=(id,d)=>{const x=+$(id).value;return isFinite(x)&&x>0?x:d;};
  $("aShape").oninput=()=>{$("aShapeO").textContent=(+$("aShape").value/100).toFixed(2);};
  $("aGo").onclick=()=>{apEngage("ascent",{alt:num("aAlt",70)*1000,turnEnd:num("aTurn",45)*1000,shape:+$("aShape").value/100,qLim:num("aQ",30)*1000});};
  $("aOff").onclick=()=>apOff("you switched it off");$("nOff").onclick=()=>apOff("you switched it off");$("lOff").onclick=()=>apOff("you switched it off");
  for(const b of document.querySelectorAll("[data-nd]"))b.onclick=()=>planNode(b.dataset.nd,num("nAlt",150));
  $("nGo").onclick=()=>apEngage("node");$("nDel").onclick=()=>{AP.node=null;AP.msg="Burn deleted.";if(AP.mode==="node")apOff("burn deleted");};
  $("lLz").onclick=()=>{AP.land.target="lz";$("lLz").classList.add("on");$("lHere").classList.remove("on");};
  $("lHere").onclick=()=>{AP.land.target="here";$("lHere").classList.add("on");$("lLz").classList.remove("on");};
  $("lGo").onclick=()=>apEngage("land",{target:AP.land.target});}
function apHud(){const st=(id,m)=>{const el=$(id);const t=(AP.mode===m?"● ":"")+(AP.mode===m||AP.lastFor===m?AP.msg:el.dataset.idle||el.textContent);if(!el.dataset.idle)el.dataset.idle=el.textContent;if(el.textContent!==t)el.textContent=t;el.classList.toggle("on",AP.mode===m);};
  if(AP.mode)AP.lastFor=AP.mode;st("aSt","ascent");st("nSt","node");st("lSt","land");
  const n=AP.node,box=$("fNode");const h=n?`<span>Burn</span><b>${n.what}</b><span>Δv</span><b>${fmt(Math.abs(n.dv))} m/s ${n.dv<0?"(retrograde)":"(prograde)"}</b><span>In</span><b>${tfm(n.t-FT)}</b>`:`<span>Burn</span><b>none planned</b>`;
  if(box.dataset.h!==h&&(++apHN%10===0||!box.dataset.h||!n!==!box.dataset.n)){box.innerHTML=h;box.dataset.h=h;box.dataset.n=n?"1":"";}
  $("aGo").disabled=AP.mode==="ascent";$("nGo").disabled=!n||AP.mode==="node";$("lGo").disabled=AP.mode==="land";
  for(const id of["aOff","nOff","lOff"])$(id).style.display=AP.mode?"":"none";}
let apHN=0;
// fold-away panels in flight: INFO panels on the left, the small numbers and SAS on the right
if(JX&&typeof foldUI==="function")foldUI($("flight"),"flight",[{el:$("fpOrbit"),label:"ORBIT",side:"l"},{el:$("fpSurf"),label:"SURFACE",side:"l"},{el:$("fpVes"),label:"VESSEL",side:"l"},
  {el:$("fpAsc"),label:"ASCENT",side:"l",title:"Ascent autopilot: flies you to orbit"},{el:$("fpNode"),label:"NODE",side:"l",title:"Maneuver planner: plan and fly burns (circularise, change orbit, go to the Moon, come home)"},
  {el:$("fpLand"),label:"LAND",side:"l",title:"Landing autopilot"},
  {el:$("fpData"),label:"DATA",side:"r",open:true,title:"Ap, Pe, TWR, Δv and fuel"},{el:$("fpTime"),label:"TIME",side:"r",title:"Clock, weather and warp to sunrise, Ap, Pe or the Moon"},{el:$("fpSas"),label:"SAS",side:"r",title:"SAS hold modes"}]);
window.__flt={predict,moonAt,get FT(){return FT;},setFT:t=>{FT=t;},get flyers(){return flyers;},get VS(){return VS;},get AV(){return AV;},doStage,switchV,orbitOf,setWarp:w=>{warp=w;},get said(){return said;}};
