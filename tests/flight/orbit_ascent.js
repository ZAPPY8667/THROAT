const F=require('./harness.js');
const name=process.argv[2]||'orbiter';F.startFlight(F.tpl(name),'X');F.AV.thr=1;
let t=0;const dt=0.004,PR=F.PR,ATM=41e3;
const st=()=>{const a=F.AV,h=Math.hypot(a.x,a.y)-PR,o=F.orbitOf(a);return {h,o,a};};
let staged=0,phase='up',log=0;
while(t<1500){const {h,o,a}=st();const psi=Math.atan2(a.x,a.y);let u=0;
  if(phase==='up'){const pitch=Math.min(1.45,Math.max(0,(h-600)/22000*1.45));const tgt=psi+pitch;u=Math.max(-1,Math.min(1,Math.atan2(Math.sin(tgt-a.phi),Math.cos(tgt-a.phi))*3));
    if(!o.esc&&o.ap>70e3){a.thr=0;phase='coast';}}
  else if(phase==='coast'){const vang=Math.atan2(a.vx,a.vy);u=Math.max(-1,Math.min(1,Math.atan2(Math.sin(vang-a.phi),Math.cos(vang-a.phi))*3));a.thr=(!o.esc&&o.ap<62e3)?1:0;if(h>o.ap-1500&&h>ATM){a.thr=1;phase='circ';}}
  else if(phase==='circ'){const vang=Math.atan2(a.vx,a.vy);u=Math.max(-1,Math.min(1,Math.atan2(Math.sin(vang-a.phi),Math.cos(vang-a.phi))*3));if(o.pe>45e3){a.thr=0;phase='done';}}
  // stage when the current stage is dry
  const lit=a.feeds.map(f=>f.reduce((s,j)=>s+a.ps[j].fuel,0)).some(x=>x>1e-3);
  if(a.thr>0&&!lit){F.doStage();staged++;}
  for(const v of F.VS)F.stepV(v,dt,v===F.AV?u:0);t+=dt;
  if(t>log){log+=30;console.log(`t=${t.toFixed(0)} ${phase} h=${(h/1000).toFixed(1)}km v=${Math.hypot(a.vx,a.vy).toFixed(0)} q=${(a.q||0).toFixed(0)} Ap=${o.esc?'esc':(o.ap/1000).toFixed(1)} Pe=${o.esc?'-':(o.pe/1000).toFixed(1)} vessels=${F.VS.length} crashed=${F.VS.filter(v=>v.crashed).length}`);}
  if(a.crashed){console.log('CRASH',t);break;}
  if(phase==='done'){console.log('ORBIT t',t.toFixed(0),'pe',(o.pe/1000).toFixed(1),'ap',(o.ap/1000).toFixed(1),'staged',staged,'fuel left',a.ps.reduce((s,p)=>s+(p.fuel||0),0).toFixed(1));break;}}
