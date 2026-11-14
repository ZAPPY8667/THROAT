// ================= FLIGHT COMPUTER: the MechJeb-style autopilots (phase 5) =================
// Three autopilots, each a pull-out panel: ASCENT (gravity turn to a target orbit, throttles down around Max-Q, stages by itself,
// coasts to apoapsis and circularises), NODE (plan a burn: circularise, change Ap or Pe, go to the Moon, come home; then warp to
// it and fly it), LAND (kill the sideways speed over the landing zone or right here, then a suicide burn with the legs down).
// They steer only by setting the heading for the normal heading hold (v.sas = "ap"), so they can't turn the rocket harder than
// the player could, and they throttle like the player does. Any steering or throttle input from the player takes over.
// apStep(dt) runs once per physics step for the craft you fly (the headless tests call it the same way).
const AP={mode:null,ph:"",msg:"",stT:0,o:{alt:70000,turnEnd:45000,shape:0.55,qLim:30000},node:null,land:{target:"lz"}};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// mass right now (before a craft's first physics step v.m isn't set yet)
const mOf=v=>v.m||v.ps.reduce((s,p)=>s+partMass(p)+(p.fuel||0),0);
// what the craft can push right now: engines that still have propellant (solid boosters can't be throttled, so they're "base")
function apThrust(v){let liq=0,srb=0;v.eng.forEach((i,n)=>{const P=v.ps[i];let av=0;for(const j of v.feeds[n])av+=v.ps[j].fuel;if(!(av>1e-6))return;
  const E=v.est[n],F=E.vac.F-(E.vac.F-E.sl.F)*(v.a==null?1:v.a);if(P.t==="srb"){if(P.ign)srb+=F*curveAt(E.curve,1-av/capOf(P));}else liq+=F;});return{liq,srb,all:liq+srb};}
function apOff(why){if(!AP.mode)return;const m=AP.mode;AP.mode=null;AP.ph="";if(AV){if(AV.sas==="ap")AV.sas="stab";AV.hold=AV.phi;if(why!=="done")AV.thr=0;}
  AP.msg=why==="done"?"Done.":why||"Off.";if(typeof callout==="function"&&why&&why!=="done")callout("AUTOPILOT OFF",why);if(why==="done"&&typeof callout==="function")callout(m.toUpperCase()+" COMPLETE");}
function apEngage(mode,opts){const v=AV;if(!v||v.crashed){return false;}if(!v.ctrl){AP.msg="This craft has no probe core or capsule to steer it.";return false;}
  if(opts)Object.assign(mode==="land"?AP.land:AP.o,opts);AP.mode=mode;AP.ph="start";AP.stT=0;AP.msg="";v.sas="ap";v.hold=v.phi;
  if(mode==="ascent"&&typeof CD!=="undefined"&&CD.s==="wait")startCount();
  if(mode==="node"&&!AP.node){AP.mode=null;AP.msg="Plan a burn first.";return false;}
  return true;}
const point=(v,ang)=>{v.sas="ap";v.hold=ang;};
const angOf=(x,y)=>Math.atan2(x,y);
// staging: when the stage that's burning runs dry (or its solid boosters burn out), drop it. A short pause between, like a real one.
function apStage(v,dt){AP.stT-=dt;if(AP.stT>0||!(v.thr>0))return;const T=apThrust(v),srbs=v.eng.filter(i=>v.ps[i].t==="srb");
  const srbOut=srbs.length&&srbs.every(i=>v.ps[i].ign&&!(v.ps[i].fuel>1e-6));
  if((T.all<=0||srbOut)&&nextDecs(v.ps,new Set(v.ps.keys())).length){doStage();AP.stT=0.8;}}
// ---------------- ASCENT ----------------
function apAscent(v,dt){const B=BOD[v.body],rr=Math.hypot(v.x,v.y),h=rr-B.R,o=orbitOf(v),up=angOf(v.x,v.y),sp=Math.hypot(v.vx,v.vy),O=AP.o,tt=orbTimes(v,o,B);
  apStage(v,dt);
  if(AP.ph==="start"){if(typeof CD!=="undefined"&&CD.s!=="go"){AP.msg="Counting down…";point(v,up);return;}AP.ph="climb";}
  if(AP.ph==="climb"){
    // gravity turn: tip over smoothly from straight up to flat as the rocket climbs; keep enough time to apoapsis so it doesn't fall back
    const f=clamp(Math.max((h-800)/(O.turnEnd-800),(sp-60)/1500),0,1),pitch=Math.pow(f,O.shape)*Math.PI/2*0.98;let tilt=pitch;
    if(h>12000&&!o.esc&&tt){const want=30+50*(1-f);if(tt.ap<want&&o.ap<O.alt)tilt=Math.max(0,tilt-(want-tt.ap)*0.012);}
    // don't swing far from where the air is pushing while it's thick: limit the angle between nose and path
    const pro=sp>30?angOf(v.vx,v.vy)-up:0;if((v.q||0)>3000)tilt=clamp(tilt,pro-0.12,pro+0.12);
    point(v,up+tilt);
    let thr=1;if((v.q||0)>O.qLim)thr=clamp(1-((v.q-O.qLim)/O.qLim)*3,0.35,1);   // ease off around Max-Q
    if(!o.esc&&o.ap>O.alt*0.93)thr=Math.min(thr,clamp((O.alt-o.ap)/(O.alt*0.07),0.25,1));
    v.thr=thr;AP.msg=`Gravity turn… ${Math.round(f*100)}%`;
    if(!o.esc&&o.ap>=O.alt*0.98||o.esc){v.thr=0;AP.ph="coast";}}
  else if(AP.ph==="coast"){point(v,angOf(v.vx,v.vy));v.thr=0;
    if(!o.esc&&o.ap<O.alt*0.995&&h<B.floor){v.thr=0.3;}   // the air still drags it down: top the apoapsis back up
    const ra=o.ap+B.R,vAp=v.vx===0&&v.vy===0?0:Math.abs(o.hz)/ra,vc=Math.sqrt(B.mu/ra),dv=Math.max(0,vc-vAp),a=Math.max(0.5,apThrust(v).all/mOf(v)),tb=dv/a;
    AP.msg=`Coasting to apoapsis: circularise ${fmt(dv)} m/s in ${tt?Math.round(tt.ap-tb/2):"?"} s`;
    if(tt&&tt.ap<=tb/2+1&&h>B.floor)AP.ph="circ";
    if(tt&&tt.ap<=tb/2+1&&h<=B.floor){AP.ph="circ";}}
  else if(AP.ph==="circ"){const ra=rr,vc=Math.sqrt(B.mu/ra),vh=Math.abs(o.hz)/ra;point(v,angOf(v.vx,v.vy)+(o.ap<O.alt*0.98&&tt&&tt.ap>tt.per/2?-0.15:0));
    const need=vc-vh,a=Math.max(0.3,apThrust(v).all/mOf(v));v.thr=clamp(need/(a*1.5),0.05,1);AP.msg=`Circularising: ${fmt(Math.max(0,need))} m/s to go`;
    if(!o.esc&&o.pe>Math.max(B.floor+5000,O.alt*0.9)||o.esc){v.thr=0;apOff("done");}}}
// ---------------- NODE: plan and fly a burn ----------------
// a node: at game time t, change speed by dv along the path (prograde > 0, retrograde < 0)
function stateAt(v,t){const[x,y,vx,vy]=kepler(v.x,v.y,v.vx,v.vy,BOD[v.body].mu,t-FT);return{x,y,vx,vy};}
function nodePredict(v,n){const s=stateAt(v,n.t),sp=Math.hypot(s.vx,s.vy),k=(sp+n.dv)/sp;return predict(v.body,s.x,s.y,s.vx*k,s.vy*k,n.t);}
function planNode(kind,val){const v=AV;if(!v||v.landed){AP.msg="Get into space first.";return null;}const B=BOD[v.body],o=orbitOf(v),tt=orbTimes(v,o,B);
  const rAt=t=>{const s=stateAt(v,t);return{r:Math.hypot(s.x,s.y),v:Math.hypot(s.vx,s.vy)};};
  let n=null;
  if(kind==="circAp"||kind==="circPe"){if(!tt){AP.msg="Not in a closed orbit.";return null;}const t=FT+(kind==="circAp"?tt.ap:tt.pe),q=rAt(t);n={t,dv:Math.sqrt(B.mu/q.r)-q.v,what:kind==="circAp"?"circularise at Ap":"circularise at Pe"};}
  else if(kind==="setAp"||kind==="setPe"){if(!tt){AP.msg="Not in a closed orbit.";return null;}const t=FT+(kind==="setAp"?tt.pe:tt.ap),q=rAt(t),r2=B.R+val*1000,a=(q.r+r2)/2;
    n={t,dv:Math.sqrt(B.mu*(2/q.r-1/a))-q.v,what:(kind==="setAp"?"apoapsis":"periapsis")+" to "+fmt(val)+" km"};}
  else if(kind==="moon"){if(v.body!==0||!tt){AP.msg="Go to the Moon from an orbit around Earth.";return null;}
    // Hohmann out to the Moon's distance, then try burn times over one lap until the path passes the Moon 20–200 km up
    let best=null;for(let k=0;k<144&&!best;k++){const t=FT+30+k/144*tt.per,q=rAt(t),a=(q.r+DM)/2,dv=Math.sqrt(B.mu*(2/q.r-1/a))-q.v,c={t,dv};
      const P=nodePredict(v,c),m=P.marks.find(m=>m.k==="pe"&&m.body===1);if(m&&m.alt>20e3&&m.alt<200e3)best={t,dv,what:`to the Moon (pass ${fmt(m.alt/1000)} km)`};}
    if(!best){for(let k=0;k<144&&!best;k++){const t=FT+30+k/144*tt.per,q=rAt(t),a=(q.r+DM)/2;for(let ex=-40;ex<=60;ex+=4){const dv=Math.sqrt(B.mu*(2/q.r-1/a))-q.v+ex,P=nodePredict(v,{t,dv}),m=P.marks.find(m=>m.k==="pe"&&m.body===1);
      if(m&&m.alt>20e3&&m.alt<200e3){best={t,dv,what:`to the Moon (pass ${fmt(m.alt/1000)} km)`};break;}}}}
    if(!best){AP.msg="No Moon transfer found in the next lap: try again from a lower, rounder orbit.";return null;}n=best;}
  else if(kind==="home"){if(v.body!==1||!tt){AP.msg="Come home from an orbit around the Moon.";return null;}
    // burn prograde around the Moon until the path leaves it and dips into Earth's air (periapsis 20–40 km: re-entry)
    for(let k=0;k<96&&!n;k++){const t=FT+30+k/96*tt.per;for(let dv=250;dv<1600;dv+=25){const P=nodePredict(v,{t,dv}),m=P.marks.find(m=>m.k==="pe"&&m.body===0);
      if(m&&m.alt>18e3&&m.alt<40e3){n={t,dv,what:`home (Earth periapsis ${fmt(m.alt/1000)} km: re-entry)`};break;}}}
    if(!n){AP.msg="No way home found from here.";return null;}}
  if(n){n.kind=kind;n.pred=nodePredict(v,n);AP.node=n;AP.msg="Planned: "+n.what;}return n;}
function apNode(v,dt){const n=AP.node;if(!n){apOff("no burn planned");return;}const sp=Math.hypot(v.vx,v.vy),dir=angOf(v.vx,v.vy)+(n.dv<0?Math.PI:0);
  const a=Math.max(0.2,apThrust(v).all/mOf(v)),tb=Math.abs(n.dv)/a,toGo=n.t-FT;
  apStage(v,dt);
  if(AP.ph==="start"){AP.left=Math.abs(n.dv);AP.ph="warp";}
  if(AP.ph==="warp"){point(v,dir);v.thr=0;const lead=toGo-tb/2;AP.msg=`Burn ${fmt(Math.abs(n.dv))} m/s (${Math.round(tb)} s) in ${Math.round(lead)} s`;
    if(lead>40&&typeof warpTo!=="undefined"&&warpTo==null&&typeof warpToEventAt==="function")warpToEventAt(n.t-tb/2-20,"the burn");
    if(lead<=0)AP.ph="burn";}
  else if(AP.ph==="burn"){point(v,dir);const off=Math.abs(wrapA(v.phi-dir));v.thr=off>0.15?0:clamp(AP.left/(a*1.2),0.04,1);AP.left-=v.thr>0?apThrust(v).all*v.thr/mOf(v)*dt:0;
    AP.msg=`Burning: ${fmt(Math.max(0,AP.left))} m/s to go`;
    if(AP.left<=0.3||apThrust(v).all<=0){v.thr=0;
      // trim: for the Moon and the trip home, the exact pass height matters, so try small extra burns now and fly the best one
      if((n.kind==="moon"||n.kind==="home")&&apThrust(v).all>0){const want=n.kind==="moon"?100e3:30e3,body=n.kind==="moon"?1:0,sp=Math.hypot(v.vx,v.vy),tx=v.vx/sp,ty=v.vy/sp;
        // try small burns along the path and sideways (radial): sideways moves the pass height much more for the same push
        const tryV=(dp,dr)=>{const P=predict(v.body,v.x,v.y,v.vx+tx*dp-ty*dr,v.vy+ty*dp+tx*dr,FT),m=P.marks.find(m=>m.k==="pe"&&m.body===body);return m?Math.abs(m.alt-want):1e12;};
        let best={dp:0,dr:0,e:tryV(0,0)};for(let dp=-20;dp<=20;dp+=2)for(let dr=-40;dr<=40;dr+=2){const e=tryV(dp,dr)+Math.hypot(dp,dr)*50;if(e<best.e)best={dp,dr,e};}
        for(const st of[1,0.5,0.25])for(const[a1,b1]of[[st,0],[-st,0],[0,st],[0,-st]]){const e=tryV(best.dp+a1,best.dr+b1)+Math.hypot(best.dp+a1,best.dr+b1)*50;if(e<best.e)best={dp:best.dp+a1,dr:best.dr+b1,e};}
        const mag=Math.hypot(best.dp,best.dr);if(mag>0.3){AP.left=mag;AP.trimDir=Math.atan2(tx*best.dp-ty*best.dr,ty*best.dp+tx*best.dr);AP.ph="trim";return;}}
      AP.node=null;apOff("done");}}
  else if(AP.ph==="trim"){const d2=AP.trimDir;point(v,d2);const off=Math.abs(wrapA(v.phi-d2));v.thr=off>0.1?0:clamp(AP.left/(a*4),0.02,0.3);
    AP.left-=v.thr>0?apThrust(v).all*v.thr/mOf(v)*dt:0;AP.msg=`Fine-tuning: ${AP.left.toFixed(1)} m/s`;if(AP.left<=0.05){v.thr=0;AP.node=null;apOff("done");}}}
// ---------------- LAND ----------------
// first stop the sideways motion so the craft falls toward the target (the landing zone, or straight down here), then the suicide
// burn: wait until the engines only just have room to stop, then slow down hard, aiming for under 3 m/s at touchdown.
function apLand(v,dt){const B=BOD[v.body],rr=Math.hypot(v.x,v.y),ux=v.x/rr,uy=v.y/rr,up=angOf(v.x,v.y),G=B.mu/(rr*rr),
  gh=v.body===0?Math.max(0,terrH(up*PR)):0,cpts=v.legs||v.hasLegs?v.cptsL:v.cpts,foot=-Math.min(...cpts.map(q=>(q[1]-v.py)*UM)),hAG=rr-B.R-gh-foot,
  vv=v.vx*ux+v.vy*uy,vh=v.vx*uy-v.vy*ux;
  if(v.landed){v.thr=0;apOff("done");return;}
  if(v.hasLegs&&!v.legs&&hAG<3000)v.legs=true;
  const Fm=apThrust(v).all,amax=Fm/mOf(v);if(amax<=G*1.05){AP.msg="Not enough thrust left to land.";}
  // where to land: the landing zone (Earth) or straight below; target sideways speed brings the impact point onto it
  let dist=0;if(AP.land.target==="lz"&&v.body===0){dist=PAD2-up*PR;}
  const tFall=Math.max(4,(vv<0?-vv:0)/G+Math.sqrt(2*Math.max(0,hAG)/G));
  const vhT=clamp(dist/tFall,-60,60);
  if(AP.ph==="start"){AP.ph=Math.abs(vh-vhT)>8&&hAG>500?"brake":"fall";AP.burning=false;}
  if(AP.ph==="brake"){   // cancel the sideways speed (keeping what's needed to reach the target), pushing sideways while holding height
    const dvh=vhT-vh,ah=Math.sign(dvh)*amax*0.95,ang=up+Math.atan2(ah,G);point(v,ang);
    const off=Math.abs(wrapA(v.phi-ang));v.thr=off>0.2?0:clamp(Math.abs(dvh)/amax*1.5,0.05,1);AP.msg=`Killing sideways speed: ${fmt(Math.abs(dvh))} m/s`;
    if(Math.abs(dvh)<2)AP.ph="fall";return;}
  // the suicide burn: aNeed = deceleration needed to stop exactly at the ground. Start when it takes ~80% of what the engines can
  // give; then fly a gentle 1.5–2 m/s for the last few metres. Steer the sideways speed onto the target the whole way down.
  const hLeft=Math.max(0.5,hAG-1),aNeed=vv<0?vv*vv/(2*hLeft)+G:0;
  if(!AP.burning&&(aNeed>amax*0.8||(hAG<40&&vv<-2)))AP.burning=true;
  const tRem=Math.max(3,hAG/Math.max(3,-vv)),vhT2=hAG<15?0:clamp(dist/tRem,-30,30),ah=clamp((vhT2-vh)*0.6,-amax*0.45,amax*0.45);
  let av;if(hAG>25)av=AP.burning?aNeed+(-Math.max(2,Math.sqrt(2*amax*0.6*hLeft)*0.3)-vv)*0.05:0;else{const vvT=-Math.max(1.5,hAG*0.15);av=G+(vvT-vv)*1.5;}
  if(!AP.burning&&hAG>25){point(v,up+clamp(Math.atan2(-vh,Math.max(1,-vv))*0.8,-0.5,0.5));v.thr=0;
    AP.msg=`Falling: landing burn at about ${fmt(Math.max(0,vv*vv/(2*Math.max(0.1,amax*0.8-G))))} m`;return;}
  const tilt=clamp(Math.atan2(ah,Math.max(0.1,av)),-0.5,0.5);point(v,up+tilt);v.thr=clamp(Math.hypot(ah,av)/amax,0,1);
  AP.msg=`Landing burn: ${fmt(hAG)} m, ${(-vv).toFixed(1)} m/s down`;}
// once per physics step for the craft you fly
function apStep(dt){const v=AV;if(!AP.mode||!v)return;if(v.crashed){apOff("crashed");return;}
  if(v.sas!=="ap"){apOff("you took over");return;}
  if(AP.mode==="ascent")apAscent(v,dt);else if(AP.mode==="node")apNode(v,dt);else if(AP.mode==="land")apLand(v,dt);}
