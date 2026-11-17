// Docking (v1.45): two craft in orbit, ports nose to nose 1.5 m apart, closing at 0.2 m/s, lock together; the host's engine then
// carries both (the pair accelerates less than the host alone would); undocking pushes them apart.
const F=require('./harness.js');let bad=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)bad++;};
const mk=list=>{const ps=[];let y=0;for(const[t,w,h]of list){const p=F.mkPart(t,w,h);p.x=0;p.y=y;y+=p.h;ps.push(p);}return ps;};
const A=F.mkVessel(mk([["engine",30],["tank",40,80],["probe",40],["dock",20]]),'Host',0);
const B=F.mkVessel(mk([["tank",40,40],["probe",40],["dock",20]]),'Guest',0);
F.VS.length=0;F.VS.push(A,B);F.AV=A;
const r=F.PR+150e3,vc=Math.sqrt(F.MU/r);
for(const v of[A,B]){v.y=r;v.vx=vc;v.vy=0;v.landed=false;v.thr=0;v.om=0;}
A.x=0;A.phi=Math.PI/2;B.phi=-Math.PI/2;   // A's port faces +x, B's faces -x
{const pa=F.portWorld(A,F.freePorts(A)[0]),pb0=F.portWorld(B,F.freePorts(B)[0]);B.x+=pa.x+1.5-pb0.x;B.y+=pa.y-pb0.y;B.vx-=0.2;}
const dt=0.01;let t=0;
while(t<10&&!B.dockHost){for(const v of F.VS)F.stepV(v,dt,0);F.dockFollow();F.dockCheck();t+=dt;}
ok(B.dockHost===A,`docked after ${t.toFixed(2)} s`);
const gap=()=>Math.hypot(A.x-B.x,A.y-B.y),g0=gap();
// burn: the pair accelerates as one, slower than the host alone
const v0=Math.hypot(A.vx,A.vy);A.thr=1;for(let i=0;i<200;i++){for(const v of F.VS)F.stepV(v,dt,0);F.dockFollow();}A.thr=0;
const aPair=A.F/A.m,aAlone=A.F/(A.m-(B.dry+B.ps.reduce((s,p)=>s+(p.fuel||0),0)));
ok(Math.abs(gap()-g0)<1e-6,`stayed together under thrust (gap ${g0.toFixed(3)} → ${gap().toFixed(3)} m)`);
ok(aPair<aAlone*0.95,`the passenger's mass counts (${aPair.toFixed(2)} vs ${aAlone.toFixed(2)} m/s² alone)`);
ok(Math.abs(Math.hypot(B.vx,B.vy)-Math.hypot(A.vx,A.vy))<0.05,'the passenger moves with the host');
F.undock(B,0.4);const g1=gap();for(let i=0;i<500;i++){for(const v of F.VS)F.stepV(v,dt,0);F.dockFollow();F.dockCheck();}
ok(!B.dockHost&&gap()>g1+1,`undocked and drifted apart (${(gap()-g1).toFixed(2)} m in 5 s)`);
if(bad)process.exit(1);console.log('docking ok');
