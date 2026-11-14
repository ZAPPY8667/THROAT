// Side boosters push off with separation motors (v1.34): 2 s after the side decouplers fire on the Super Heavy, each booster is
// moving away from the core at 15+ m/s, is tens of metres out, and its nose has tipped outward. Neither touches the core again.
const F=require('./harness.js');let bad=0;const ok=(c,t)=>{console.log((c?'ok   ':'FAIL ')+t);if(!c)bad++;};
F.startFlight(F.tpl('sls'),'S');F.apEngage('ascent',{alt:70000});let t=0,sepAt=null,closest=1e9;
while(t<160){F.apStep(0.01);for(const v of F.VS.slice())F.stepV(v,0.01,0);t+=0.01;const bs=F.VS.filter(v=>v.sepSide);
  if(bs.length&&sepAt==null)sepAt=t;
  if(sepAt!=null){const core=F.AV,c=Math.cos(core.phi),s=Math.sin(core.phi);
    for(const b of bs)if(t-sepAt>0.3)closest=Math.min(closest,((b.x-core.x)*c-(b.y-core.y)*s)*b.sepSide);
    if(t-sepAt>2){for(const b of bs){const rel=((b.vx-core.vx)*c-(b.vy-core.vy)*s)*b.sepSide,dist=((b.x-core.x)*c-(b.y-core.y)*s)*b.sepSide,tilt=(b.phi-core.phi)*b.sepSide*57.3;
        ok(rel>15&&dist>20&&tilt>10,`booster on side ${b.sepSide}: ${rel.toFixed(0)} m/s away, ${dist.toFixed(0)} m out, nose ${tilt.toFixed(0)}° out`);}
      ok(bs.length===2,'two boosters came off');break;}}}
ok(sepAt!=null,'boosters separated');ok(closest>5,`never drifted back toward the core (closest ${closest.toFixed(1)} m)`);
if(bad)process.exit(1);console.log('separation ok');
