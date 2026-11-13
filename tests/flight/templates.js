const F=require('./harness.js');
for(const n of['hopper','orbiter','heavy','lander','sparrow']){const ps=F.tpl(n),a=F.analyze(ps,null);console.log(n,a.mass.toFixed(0),'kg',a.stages.map(s=>`dv ${s.dv.toFixed(0)} twr ${s.twr.toFixed(2)}`).join(' | '),'total',a.total.toFixed(0),a.warn.join(';'));
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(F.collide&&F.collide(ps[i],ps[j]))console.log('COLLIDE');}
