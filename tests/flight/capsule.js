// Crew capsule: a pad abort pulls the capsule clear and it comes down on parachutes; the escape tower drops off by itself;
// coming back from orbit heat-shield first survives, nose first burns up.
const F=require('./harness.js');let bad=0;const ok=(c,t)=>{console.log((c?'ok   ':'FAIL ')+t);if(!c)bad++;};
// --- pad abort
F.startFlight(F.tpl('sls'),'SLS');const rocket=F.AV;F.abort();const cap=F.AV;
ok(cap!==rocket&&cap.hasCap&&cap.lesT>0,'abort splits the capsule off and fires the tower');
let t=0,top=0,jett=false,chute=false;const dt=0.004;
while(t<200&&!cap.landed&&!cap.crashed){for(const v of F.VS)F.stepV(v,dt,0);t+=dt;const h=Math.hypot(cap.x,cap.y)-F.PR;top=Math.max(top,h);
  if(!jett&&cap.hasLes&&cap.lesDone!=null&&cap.t-cap.lesDone>1.2){F.jettisonLes(cap);jett=true;}
  const vv=(cap.vx*cap.x+cap.vy*cap.y)/Math.hypot(cap.x,cap.y);if(!chute&&jett&&vv<0){F.chutes();chute=true;}}
ok(top>500,`climbed clear: ${top.toFixed(0)} m`);ok(jett&&!cap.hasLes,'tower jettisoned after the burn');ok(chute,'parachutes deployed on the way down');
ok(cap.landed&&!cap.crashed,`landed on its parachutes (t ${t.toFixed(0)} s)`);
// --- re-entry from orbit, heat-shield first vs nose first
function reentry(shieldFirst){const v=F.mkVessel([F.mkPart('capsule')],'C');F.AV=v;const r=F.PR+70e3;v.x=0;v.y=r;const vc=Math.sqrt(F.MU/r);v.vx=vc*0.995;v.vy=-350;v.landed=false;
  let tt=0;while(tt<2000&&!v.crashed){const sp=Math.hypot(v.vx,v.vy),a=Math.atan2(v.vx,v.vy);v.phi=shieldFirst?a+Math.PI:a;v.om=0;F.stepV(v,0.01,0);tt+=0.01;if(sp<250)break;}
  return v;}
let v=reentry(true);ok(!v.crashed,'heat shield first: survives re-entry');
v=reentry(false);ok(v.crashed,'nose first: burns up');
if(bad)process.exit(1);console.log('capsule ok');
