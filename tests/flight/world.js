// The new Earth: the pad is at sea level, there are real mountains and deep sea, the ground has no cliffs, a slow
// splashdown floats and a fast one crashes, a craft lands on top of a mountain (not on sea level), and the clock starts at 9:00.
const F=require('./harness.js');let bad=0;const ok=(c,t)=>{console.log((c?'ok   ':'FAIL ')+t);if(!c)bad++;};
ok(Math.abs(F.terrH(0))<0.01,'launch pad at sea level');
let hi=-1e9,lo=1e9,jump=0,prev=F.terrH(0);const C=2*Math.PI*F.PR;
for(let s=10;s<C;s+=10){const h=F.terrH(s);hi=Math.max(hi,h);lo=Math.min(lo,h);jump=Math.max(jump,Math.abs(h-prev));prev=h;}
ok(hi>4500,`mountains: highest peak ${(hi/1000).toFixed(1)} km`);ok(lo<-2000,`ocean: deepest ${(-lo/1000).toFixed(1)} km`);ok(jump<40,`no cliffs: biggest step ${jump.toFixed(1)} m per 10 m`);
const names=new Set();for(let s=0;s<C;s+=5000)names.add(F.terrH(s)<0?'Ocean':F.biomeAt(s)[2]);ok(names.size>=8,'biomes: '+[...names].join(', '));
function drop(s,h0,v){const v0=F.mkVessel(F.tpl('hopper'),'D');F.AV=v0;const an=s/F.PR,g=Math.max(0,F.terrH(s)),R=F.PR+g+h0;
  v0.x=Math.sin(an)*R;v0.y=Math.cos(an)*R;v0.phi=an;v0.landed=false;v0.legs=true;v0.vx=-Math.sin(an)*v;v0.vy=-Math.cos(an)*v;
  for(let t=0;t<30&&!v0.landed&&!v0.crashed;t+=0.004){const r=Math.hypot(v0.x,v0.y),gg=F.MU/(r*r);   // hold the falling speed steady (a pretend engine)
    v0.vx=-Math.sin(an)*v;v0.vy=-Math.cos(an)*v;F.stepV(v0,0.004,0);}return{v:v0,g};}
const sea=600e3;ok(F.terrH(sea)<-100,'test spot is open sea');
let d=drop(sea,30,6);ok(d.v.landed&&d.v.wet&&!d.v.crashed,'slow splashdown floats');
d=drop(sea,30,25);ok(d.v.crashed,'fast splashdown crashes');
const peak=2560e3;d=drop(peak,40,4);const alt=Math.hypot(d.v.x,d.v.y)-F.PR;
ok(d.v.landed&&!d.v.crashed&&alt>d.g&&alt<d.g+60,`lands on the mountain at ${(d.g/1000).toFixed(2)} km (craft centre ${(alt/1000).toFixed(2)} km)`);
// buildings are solid: the assembly building (VAB, 160 m tall, 3.3 km west) can be landed on, and flying into its wall crashes
const vab=F.BLD.find(b=>b.t==='vab');d=drop(vab.s,vab.h+40,4);const roof=Math.hypot(d.v.x,d.v.y)-F.PR;
ok(d.v.landed&&!d.v.crashed&&roof>vab.h&&roof<vab.h+60,`lands on the assembly building's roof (craft centre ${roof.toFixed(0)} m)`);
{const v0=F.mkVessel(F.tpl('hopper'),'W');F.AV=v0;const s0=vab.s+vab.w/2+40,an=s0/F.PR,R=F.PR+60;v0.x=Math.sin(an)*R;v0.y=Math.cos(an)*R;v0.phi=an;v0.landed=false;
  const sp=12;for(let t=0;t<10&&!v0.crashed;t+=0.004){const e=[Math.cos(an),-Math.sin(an)];v0.vx=-e[0]*sp;v0.vy=-e[1]*sp;F.stepV(v0,0.004,0);}   // drift west at 12 m/s, 60 m up
  ok(v0.crashed,'flying sideways into the assembly building\'s wall crashes');}
ok(!F.bldAt(F.PAD2)&&!F.bldAt(0),'the landing zone and the launch pad are clear of buildings');
ok(Math.abs(F.hourAt(0,0)-9)<0.01,'clock starts at 9:00 at the pad');ok(Math.abs(F.hourAt(0,1200/24*3)-12)<0.01,'3 hours later it is noon');
if(bad)process.exit(1);console.log('world ok');
