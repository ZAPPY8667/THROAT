// Stage recovery parts (v1.46): a Parachute part lands a plain stage gently (no capsule needed); airbrakes open by themselves
// while a stage falls engines-off and slow it down.
const F=require('./harness.js');let bad=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)bad++;};
const mk=list=>{const ps=[];let y=0;for(const[t,w,h]of list){const p=F.mkPart(t,w,h);p.x=0;p.y=y;y+=p.h;ps.push(p);}return ps;};
const dt=0.01;
// 1. a booster stage with a parachute on top, falling from 3 km at 150 m/s
{const ps=mk([["engine",30],["tank",40,80],["chute",16]]);for(const p of ps)if(p.t==="tank")p.fuel=0;
  const v=F.mkVessel(ps,'Booster',0);F.VS.length=0;F.VS.push(v);F.AV=v;const r=F.PR+3000+F.terrH(0)+12;
  v.x=0;v.y=r;v.vx=0;v.vy=-150;v.phi=0;v.landed=false;v.thr=0;
  ok(v.hasChute,'a plain stage with a Parachute part has parachutes');
  let t=0;while(t<600&&!v.landed&&!v.crashed){if(!v.chute&&Math.hypot(v.vx,v.vy)<280)v.chute=1;F.stepV(v,dt,0);t+=dt;}
  ok(v.landed&&!v.crashed,`it came down under its parachute ${v.landed&&!v.crashed?'safely':'(crashed)'} after ${t.toFixed(0)} s`);}
// 2. two empty stages falling from 25 km, engines off: the one with airbrakes is slower by 8 km
{const fall=brakes=>{const list=[["engine",30],["tank",40,150],["probe",40],["nose",40]];const ps=mk(list);for(const p of ps)if(p.t==="tank")p.fuel=0;
    if(brakes){for(const s of[1,-1]){const b=F.mkPart("brake");b.x=s*(20+b.w/2);b.y=120;b.f=s;ps.push(b);}}
    const v=F.mkVessel(ps,'S',0);F.VS.length=0;F.VS.push(v);F.AV=v;v.x=0;v.y=F.PR+25000;v.vx=0;v.vy=-400;v.phi=Math.PI;v.landed=false;v.thr=0;
    let t=0;while(t<300&&Math.hypot(v.x,v.y)-F.PR>8000&&!v.crashed){F.stepV(v,dt,0);t+=dt;}return{sp:Math.hypot(v.vx,v.vy),k:v.brakeK||0};};
  const a=fall(false),b=fall(true);
  ok(b.k>0.99&&b.sp<a.sp*0.8,`airbrakes opened (${(b.k*100).toFixed(0)}%) and slowed the fall: ${b.sp.toFixed(0)} vs ${a.sp.toFixed(0)} m/s at 8 km`);}
if(bad)process.exit(1);console.log('recovery parts ok');
