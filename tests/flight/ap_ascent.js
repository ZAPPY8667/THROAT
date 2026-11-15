// ASCENT autopilot: every ready-made rocket that has the Δv for it reaches a stable orbit on its own (gravity turn, Max-Q
// throttling, staging, coast, circularise). The hopper is a single small stage made for hops, so it's only expected to try.
const F=require('./harness.js');const names=process.argv.slice(2).length?process.argv.slice(2):['orbiter','sparrow','heavy','lander','sls','pathfinder','comsat'];let bad=0;
for(const n of names){F.startFlight(F.tpl(n),n);F.apEngage('ascent',{alt:70000});let t=0;const dt=0.01;
  while(t<2400&&F.AP.mode){F.apStep(dt);for(const v of F.VS)F.stepV(v,dt,0);t+=dt;if(F.AV.crashed)break;}
  const a=F.AV,o=F.orbitOf(a),okk=!a.crashed&&!o.esc&&o.pe>40e3;if(!okk)bad++;
  console.log(`${n.padEnd(8)} ${okk?'ORBIT':'FAIL '} ${(t).toFixed(0)} s  Pe ${(o.pe/1e3).toFixed(1)} km  Ap ${o.esc?'esc':(o.ap/1e3).toFixed(1)} km  fuel left ${F.fM?'':''}${(a.ps.reduce((s,p)=>s+(p.fuel||0),0)/1000).toFixed(1)} t  ${F.AP.msg}`);}
if(bad){console.log(bad+' failed');process.exit(1);}console.log('all reached orbit');
