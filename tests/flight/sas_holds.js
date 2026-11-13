// (stays clear of the ground: it starts 3 km up, slow)
// Each SAS hold mode should swing the rocket round to its target and settle within a few degrees,
// using only the torque the rocket already has (reaction wheel in the probe; engines off here).
const F=require('./harness.js');
const wrap=a=>{a=(a+Math.PI)%(2*Math.PI);if(a<0)a+=2*Math.PI;return a-Math.PI;};
let bad=0;
function check(mode,where){
  const v=F.mkVessel(F.tpl('orbiter'),'T');F.AV=v;
  // surface modes are checked above the Moon (no air): on Earth the fins rightly win against the reaction wheel at speed
  if(where==='moon')v.body=1;const r=(where==='moon'?F.BOD[1].R:F.PR)+(where==='orbit'?80000:3000);v.x=0;v.y=r;v.landed=false;
  if(where==='orbit'){v.vx=Math.sqrt(F.MU/r);v.vy=40;}else{v.vx=30;v.vy=-12;}     // a slightly climbing orbit / a slow landing descent
  v.phi=1.2;v.om=0;v.sas=mode;
  let err=0;for(let t=0;t<(where==='orbit'?25:15);t+=0.004){F.stepV(v,0.004,0);if(v.crashed)break;}
  const tg=F.sasTarget(v);err=Math.abs(wrap(v.phi-tg))*180/Math.PI;
  const ok=!v.crashed&&!v.landed&&err<4;if(!ok)bad++;
  console.log(`${mode.padEnd(8)} ${where.padEnd(6)} off by ${err.toFixed(2)}°  ${ok?'ok':'FAIL'}`);}
for(const m of F.SAS_MODES.filter(m=>m!=='stab'))check(m,'orbit');
for(const m of['sfpro','sfretro','hzE','hzW'])check(m,'moon');
if(bad){console.log(bad+' hold(s) did not settle');process.exit(1);}
console.log('all holds settle');
