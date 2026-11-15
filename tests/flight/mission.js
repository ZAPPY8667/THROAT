// The demo's mission, headless: the Super Heavy to a 70 km orbit, a burn to the Moon, land there, take off to a 20 km Moon
// orbit, burn home, drop everything under the capsule, heat shield first through re-entry, parachutes, down safely.
// Long waits are skipped on rails (like warp in the game). Proves the ready-made Moon rocket still has the Δv for it all.
const F=require('./harness.js');let bad=0;const ok=(c,t)=>{console.log((c?'ok   ':'FAIL ')+t);if(!c)bad++;};const dt=0.01;
const fuel=()=>(F.AV.ps.reduce((s,p)=>s+(p.fuel||0),0)/1000).toFixed(1)+' t';
const fly=(maxT,stop)=>{let t=0;while(t<maxT){
  if(F.AP.mode==='node'&&F.AP.ph==='warp'&&F.AP.node){const lead=F.AP.node.t-F.FT-60;if(lead>30){F.railStep(F.AV,lead);F.FT=F.FT+lead;t+=lead;continue;}}
  if(F.AP.mode)F.apStep(dt);for(const v of F.VS)F.stepV(v,dt,0);F.lesCheck&&F.lesCheck();F.FT=F.FT+dt;t+=dt;if(F.AV.crashed||(stop&&stop())||(!stop&&!F.AP.mode))break;}return t;};
const coast=(until)=>{const a=F.AV;for(let i=0;i<4000&&!until();i++){const st=F.railStep(a,20);F.FT=F.FT+20;if(st===false)break;}};   // on rails, 20 s at a time
F.startFlight(F.tpl('sls'),'SLS');F.apEngage('ascent',{alt:70000});fly(2400);
let o=F.orbitOf(F.AV);ok(!F.AV.crashed&&o.pe>40e3,`orbit (fuel ${fuel()})`);
if(!bad){const n=F.planNode('moon');ok(!!n,'Moon transfer planned'+(n?` (${n.dv.toFixed(0)} m/s)`:''));if(n){F.AP.node=n;F.apEngage('node');fly(30000);}}
if(!bad){coast(()=>F.AV.body===1);ok(F.AV.body===1,`reached the Moon (fuel ${fuel()})`);
  if(F.AV.ps.some(p=>p.t==='engine'&&p.k>1))F.doStage();   // the demo drops the empty core here
  const P=F.predict(1,F.AV.x,F.AV.y,F.AV.vx,F.AV.vy,F.FT),mk=P.marks.find(m=>m.k==='pe'&&m.body===1);if(mk&&mk.t>150)coast(()=>{const q=F.predict(1,F.AV.x,F.AV.y,F.AV.vx,F.AV.vy,F.FT).marks.find(m=>m.k==='pe'&&m.body===1);return!q||q.t<100;});
  F.apEngage('land',{target:'here'});fly(4000);ok(F.AV.landed&&!F.AV.crashed&&F.AV.body===1,`landed on the Moon (fuel ${fuel()})`);}
if(!bad){F.apEngage('ascent',{alt:20000,turnEnd:8000});fly(2000);o=F.orbitOf(F.AV);ok(F.AV.body===1&&!F.AV.crashed&&o.pe>5e3,`Moon orbit (fuel ${fuel()})`);}
if(!bad){const n=F.planNode('home');ok(!!n,'burn home planned'+(n?` (${n.dv.toFixed(0)} m/s)`:''));if(n){F.AP.node=n;F.apEngage('node');fly(30000);}}
if(!bad){coast(()=>F.AV.body===0&&Math.hypot(F.AV.x,F.AV.y)-F.PR<250e3);ok(F.AV.body===0,'falling home to Earth');
  while(F.AV.ps.some(p=>p.t==='dec'))F.doStage();const c=F.AV;c.sas='retro';let chute=false;
  fly(3000,()=>{const sp=Math.hypot(c.vx,c.vy),h=Math.hypot(c.x,c.y)-F.PR;if(!chute&&sp<240&&h<9000){F.chutes();chute=true;}return c.landed||c.crashed;});
  ok(c.landed&&!c.crashed,`capsule ${c.landed&&!c.crashed?'home safely':'lost'}${c.wet?' (splashdown)':''}`);}
console.log(bad?'mission FAILED':'mission ok');process.exit(bad?1:0);
