// Rockets saved before v1.16 (old small parts): old_rockets.json holds the v1.15 ready-made rockets exactly as that version built
// them. Each must be spotted as old, rebuilt with today's parts (nothing overlapping, everything still joined), and today's
// rockets must never be mistaken for old ones. The rebuilt ones are then flown to orbit by the ascent autopilot where they can.
const F=require('./harness.js'),OLD=require('./old_rockets.json');let bad=0;
const ov=(a,b)=>Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2)>0.5&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>0.5;   // boxes overlap
for(const n of['hopper','orbiter','heavy','sparrow','lander','sls'])if(F.oldScale(F.tpl(n))){console.log('new '+n+' taken for old');bad++;}
for(const[n,ps0]of Object.entries(OLD)){
  if(!F.oldScale(ps0)){console.log(n+' not spotted as old');bad++;continue;}
  const ps=F.upscaleOld(JSON.parse(JSON.stringify(ps0)));
  let hit=0;for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(ov(ps[i],ps[j])){hit++;console.log('  overlap',ps[i].t,ps[j].t);}
  const a=F.analyze(ps,null);F.startFlight(ps,n);const v=F.AV,loose=F.VS.length-1;
  let orbit='-';if(n!=='hopper'){F.apEngage('ascent',{alt:70000});let t=0;while(t<2400&&F.AP.mode){F.apStep(0.01);for(const w of F.VS)F.stepV(w,0.01,0);t+=0.01;if(F.AV.crashed)break;}
    const o=F.orbitOf(F.AV);orbit=!F.AV.crashed&&!o.esc&&o.pe>40e3?`ORBIT ${t.toFixed(0)} s`:'no orbit';if(orbit==='no orbit')bad++;}
  console.log(`${n.padEnd(8)} ${a.H.toFixed(1)} m  ${(a.mass/1000).toFixed(0)} t  `+a.stages.map(s=>`Δv ${s.dv.toFixed(0)} TWR ${s.twr.toFixed(2)}`).join(' | ')+`  overlaps ${hit} loose ${loose}  ${orbit}`);
  if(hit||loose)bad++;}
if(bad){console.log(bad+' problems');process.exit(1);}console.log('old rockets ok');
