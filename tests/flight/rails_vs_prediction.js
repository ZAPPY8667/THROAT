const F=require('./harness.js');
F.startFlight(F.tpl('orbiter'),'O');const a=F.AV;F.FT=0;
const mu=F.MU,r=F.PR+60e3,v=Math.sqrt(mu/r),DM=Math.hypot(F.moonAt(0).x,F.moonAt(0).y),dv=Math.sqrt(mu*(2/r-2/(r+DM)))-v;   // Hohmann burn out to the Moon's distancelet pick=null;
for(let k=0;k<720;k++){const th=k/720*2*Math.PI,x=r*Math.sin(th),y=r*Math.cos(th),vx=(v+dv)*Math.cos(th),vy=-(v+dv)*Math.sin(th);
  const P=F.predict(0,x,y,vx,vy,0);const mp=P.marks.find(m=>m.k==='pe'&&m.body===1);if(mp&&mp.alt>20e3&&mp.alt<200e3){pick={x,y,vx,vy,alt:mp.alt,enc:P.marks.find(m=>m.k==='enter').t};break;}}
console.log('predicted moon Pe',(pick.alt/1e3).toFixed(1),'km, encounter at',(pick.enc/3600).toFixed(2),'h');
Object.assign(a,{x:pick.x,y:pick.y,vx:pick.vx,vy:pick.vy,landed:false,thr:0,body:0});
let last=0,minAlt=1e9;for(let f=0;f<200;f++){F.railStep(a,333);F.FT=F.FT+333;
  if(a.body!==last){console.log('t',(F.FT/3600).toFixed(2),'h  body ->',a.body);last=a.body;}
  if(a.body===1)minAlt=Math.min(minAlt,Math.hypot(a.x,a.y)-F.BOD[1].R);}
console.log('closest to the Moon (sampled every 333 s)',(minAlt/1e3).toFixed(1),'km');
// same with fine rails steps of 10 s to see the true closest approach
Object.assign(a,{x:pick.x,y:pick.y,vx:pick.vx,vy:pick.vy,body:0});F.FT=0;minAlt=1e9;for(let f=0;f<6000;f++){F.railStep(a,10);F.FT=F.FT+10;if(a.body===1)minAlt=Math.min(minAlt,Math.hypot(a.x,a.y)-F.BOD[1].R);}
console.log('closest (10 s steps)',(minAlt/1e3).toFixed(1),'km');
