// Hold-down clamps: while clamped, a rocket at full throttle stays on the pad and its solid boosters don't light;
// once released it climbs and the boosters fire.
const F=require('./harness.js');let bad=0;const ok=(c,t)=>{console.log((c?'ok   ':'FAIL ')+t);if(!c)bad++;};
F.startFlight(F.tpl('sparrow'),'S');const a=F.AV;a.clamped=true;a.thr=1;
for(let t=0;t<3;t+=0.004)F.stepV(a,0.004,0);
const h0=Math.hypot(a.x,a.y)-F.PR-F.terrH(0),srb=a.eng.filter(i=>a.ps[i].t==='srb');
ok(a.landed&&h0<30,`held on the pad at full throttle (centre ${h0.toFixed(1)} m)`);ok(srb.every(i=>!a.ps[i].ign),'boosters wait for release');ok(a.F>0,'liquid engines already burning');
a.clamped=false;for(let t=0;t<4;t+=0.004)F.stepV(a,0.004,0);
ok(!a.landed&&Math.hypot(a.x,a.y)-F.PR>h0+5,'climbs once released');ok(srb.every(i=>a.ps[i].ign),'boosters lit at release');
if(bad)process.exit(1);console.log('clamps ok');
