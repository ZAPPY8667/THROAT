const F=require('./harness.js');
function hop(legs,vland,tilt){F.startFlight(F.tpl('hopper'),'H');const a=F.AV;a.thr=1;a.legs=legs;let t=0;const dt=0.004,PR=F.PR,FE=a.est.reduce((q,E)=>q+E.sl.F,0),G0=-Math.min(...(legs?a.cptsL:a.cpts).map(q=>q[1]-a.py))*0.1;   // centre of mass height when standing
  // go up to ~300 m, then cut, fall, then burn to land at vland
  let ph='up';while(t<200){const h=Math.hypot(a.x,a.y)-PR,vv=(a.vx*a.x+a.vy*a.y)/Math.hypot(a.x,a.y);
    if(ph==='up'&&h>300+G0){a.thr=0;ph='fall';}
    if(ph==='fall'&&vv<0){const Fm=FE/a.m;const stop=vv*vv/(2*(Fm-9.81));if(h-G0-0.2<stop*1.6){ph='burn';}}
    if(ph==='burn'){const hb=Math.max(0,h-G0),an=FE/a.m-9.81;const target=-Math.max(vland,Math.sqrt(2*an*hb)*0.7);a.thr=Math.max(0,Math.min(1,(target-vv)*0.5+a.m*9.81/FE));}
    if(tilt&&ph!=='up')a.phi=tilt;
    for(const v of F.VS)F.stepV(v,dt,0);t+=dt;
    if(a.crashed)return 'CRASH';if(a.landed&&ph==='burn'){a.thr=0;return 'LANDED t='+t.toFixed(1)+' pad='+F.padDist(a).d.toFixed(1);}}
  return 'timeout';}
console.log('legs, 6 m/s:',hop(true,6,0));
console.log('legs, 12 m/s:',hop(true,12,0));
console.log('no legs, 2 m/s:',hop(false,2,0));
console.log('no legs, 6 m/s:',hop(false,6,0));
console.log('legs, 6 m/s, tilted 0.6:',hop(true,6,0.6));
