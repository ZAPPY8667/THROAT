// NODE: from a 70 km Earth orbit, plan "to the Moon", fly it, and check the path passes the Moon 20–200 km up.
// LAND: a hopper hops toward the landing zone and the autopilot lands it there; a lander in Moon orbit lands right below.
const F=require('./harness.js');let bad=0;const ok=(c,t)=>{console.log((c?'ok   ':'FAIL ')+t);if(!c)bad++;};
const dt=0.01;
const run=(maxT,stop)=>{let t=0;while(t<maxT&&F.AP.mode){
  // fast-forward long waits on rails, like warp in the game
  if(F.AP.mode==='node'&&F.AP.ph==='warp'&&F.AP.node){const lead=F.AP.node.t-F.FT-60;if(lead>30){F.railStep(F.AV,lead);F.FT=F.FT+lead;t+=lead;continue;}}
  F.apStep(dt);for(const v of F.VS)F.stepV(v,dt,0);F.FT=F.FT+dt;t+=dt;if(F.AV.crashed||(stop&&stop()))break;}return t;};
// --- NODE to the Moon
{const ps=F.tpl('orbiter');F.startFlight(ps,'O');const a=F.AV;F.doStage();const up=F.AV;F.VS.length=0;F.VS.push(up);F.AV=up;F.FT=0;
  const r=F.PR+70e3;up.x=0;up.y=r;up.vx=Math.sqrt(F.MU/r);up.vy=0;up.phi=Math.PI/2;up.landed=false;up.thr=0;
  const n=F.planNode('moon');ok(!!n,'a Moon transfer was found'+(n?` (${n.dv.toFixed(0)} m/s)`:''));
  if(n){F.apEngage('node');run(20000);const P=F.predict(up.body,up.x,up.y,up.vx,up.vy,F.FT),m=P.marks.find(m=>m.k==='pe'&&m.body===1);
    ok(!F.AP.mode&&m&&m.alt>20e3&&m.alt<200e3,`after the burn the path passes the Moon at ${m?(m.alt/1e3).toFixed(0)+' km':'(no encounter)'}`);}}
// --- LAND on the landing zone (2 km west)
{F.startFlight(F.tpl('hopper'),'H');const a=F.AV;a.thr=1;a.legs=false;let t=0;
  while(t<9){a.sas='ap';a.hold=Math.atan2(a.x,a.y)-0.18;for(const v of F.VS)F.stepV(v,dt,0);t+=dt;}a.thr=0;
  F.apEngage('land',{target:'lz'});run(400);const pd=F.padDist(a);
  ok(a.landed&&!a.crashed&&Math.abs(Math.atan2(a.x,a.y)*F.PR-(-2000))<40,`landed ${a.landed&&!a.crashed?'':'NOT '}on the landing zone (${(Math.atan2(a.x,a.y)*F.PR+2000).toFixed(1)} m off)`);}
// --- LAND on the Moon from a 30 km orbit
{const ps=F.tpl('lander');F.startFlight(ps,'L');F.doStage();const a=F.AV;F.VS.length=0;F.VS.push(a);
  const RM=F.BOD[1].R,mu=1.62*RM*RM,r=RM+30e3;a.body=1;a.x=0;a.y=r;a.vx=Math.sqrt(mu/r);a.vy=0;a.phi=Math.PI/2;a.landed=false;a.thr=0;
  F.apEngage('land',{target:'here'});run(2000);ok(a.landed&&!a.crashed&&a.body===1,`landed on the Moon ${a.landed&&!a.crashed?'safely':'(crashed)'} with ${(a.ps.reduce((s,p)=>s+(p.fuel||0),0)/1000).toFixed(1)} t of fuel left`);}
if(bad)process.exit(1);console.log('node + land ok');
