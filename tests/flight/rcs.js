// RCS: with the jets on, a rocket turns faster than on its reaction wheel alone, I/K pushes it along its nose,
// the monopropellant runs down, and once it's empty the jets stop helping.
const F=require('./harness.js');let bad=0;const ok=(c,t)=>{console.log((c?'ok   ':'FAIL ')+t);if(!c)bad++;};
function craft(){const ps=F.tpl('orbiter');let n=1;for(const f of[-1,1]){const t=ps.find(p=>p.t==='tank');ps.push({id:9000+n++,t:'rcs',x:t.x+f*(t.w/2+7.5),y:t.y+t.h-30,w:15,h:30,f,tw:0});}
  const v=F.mkVessel(ps,'R');const r=F.PR+80000;v.y=r;v.vx=Math.sqrt(F.MU/r);v.landed=false;return v;}
// time to spin up to 0.5 rad/s (the most A/D asks for is 0.55): RCS adds turning push, so it gets there sooner
function turn(on){const v=craft();v.rcsOn=on;let t=0;while(t<20){F.stepV(v,0.004,1);t+=0.004;if(v.om>0.5)break;}return{t,v};}
const a=turn(false),b=turn(true);
ok(b.t<a.t*0.8,`spins up faster with RCS: ${b.t.toFixed(2)} s vs ${a.t.toFixed(2)} s`);
const used=b.v.rcs.reduce((s,p)=>s+F.RCS_MONO-p.mono,0);ok(used>0,`turning used ${used.toFixed(3)} kg of RCS fuel`);
const v=craft();v.rcsOn=true;v.phi=0;const v0=v.vx*Math.sin(0)+v.vy;v.tin=[0,1];for(let t=0;t<2;t+=0.004)F.stepV(v,0.004,0);
const dv=v.vy+F.MU/(F.PR+80000)**2*2-v0;ok(dv>0.5*2*45*1/v.m*0.8,`I pushes forward: +${dv.toFixed(2)} m/s in 2 s`);
for(const p of v.rcs)p.mono=0;const vy=v.vy;for(let t=0;t<1;t+=0.004)F.stepV(v,0.004,0);const g=F.MU/(F.PR+80000)**2;
ok(Math.abs(v.vy-vy+g)<0.05,'empty jets push nothing');
if(bad){process.exit(1);}console.log('RCS works');
