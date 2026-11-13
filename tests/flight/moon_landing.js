// lander placed in a 30 km Moon orbit: de-orbit, land with legs, take off, back to orbit (tests Moon frame physics + rails)
const F=require('./harness.js');const W=x=>Math.atan2(Math.sin(x),Math.cos(x));
const ps=F.tpl('lander');F.startFlight(ps,'L');let a=F.AV;F.doStage();a=F.AV;   // drop the booster on the pad... (keeps upper stage)
F.VS.length=0;F.VS.push(a);
const RM=90e3,mu=1.62*RM*RM,r=RM+30e3,vc=Math.sqrt(mu/r);a.body=1;a.x=0;a.y=r;a.vx=vc;a.vy=0;a.phi=Math.PI/2;a.landed=false;a.thr=0;a.legs=true;
let t=0;const dt=0.004;const phys=(s,u)=>{for(let i=0;i<s/dt;i++){F.stepV(a,dt,u());F.FT=F.FT+dt;t+=dt;}};
const alt=()=>Math.hypot(a.x,a.y)-F.BOD[a.body].R,o=()=>F.orbitOf(a),fuel=()=>a.ps.reduce((s,p)=>s+(p.fuel||0),0);
const st=tg=>()=>Math.max(-1,Math.min(1,W(tg()-a.phi)*3)),retro=()=>Math.atan2(-a.vx,-a.vy),pro=()=>Math.atan2(a.vx,a.vy);
console.log('orbit',(o().pe/1e3).toFixed(1),(o().ap/1e3).toFixed(1),'fuel',fuel().toFixed(1),'body',a.body);
// rails a quarter orbit
const T=2*Math.PI*Math.sqrt(r**3/mu);F.railStep(a,T/4);F.FT=F.FT+T/4;console.log('after rails quarter: alt',(alt()/1e3).toFixed(2),'body',a.body);
phys(5,st(retro));a.thr=1;while(true){const u=Math.hypot(a.x,a.y),vh=(a.vx*a.y-a.vy*a.x)/u;phys(0.05,st(retro));if(Math.abs(vh)<3)break;}a.thr=0;
console.log('killed h-speed at alt',(alt()/1e3).toFixed(1),'fuel',fuel().toFixed(1));
while(!a.landed&&!a.crashed){const h=alt(),u=Math.hypot(a.x,a.y),vv=(a.vx*a.x+a.vy*a.y)/u,an=2470/a.m-1.62,tgt=-Math.max(2,Math.sqrt(2*an*Math.max(0,h-2))*0.6);
  a.thr=vv<tgt?1:Math.max(0,Math.min(1,(tgt-vv)*0.4+a.m*1.62/2470));phys(0.02,st(()=>Math.atan2(a.x,a.y)+Math.max(-0.3,Math.min(0.3,-(a.vx*a.y-a.vy*a.x)/u*0.05))));}
console.log('touchdown: landed',a.landed,'crashed',a.crashed,'body',a.body,'fuel',fuel().toFixed(1));
a.thr=1;phys(3,()=>0);console.log('take off: alt',alt().toFixed(0),'landed',a.landed);
phys(10,st(()=>Math.atan2(a.x,a.y)+1.2));while(o().ap<20e3&&fuel()>0.2)phys(0.05,st(()=>Math.atan2(a.x,a.y)+1.2));a.thr=0;
while(alt()<o().ap-500)phys(0.5,st(pro));a.thr=1;while(o().pe<10e3&&fuel()>0.2)phys(0.05,st(pro));a.thr=0;
console.log('back in orbit',(o().pe/1e3).toFixed(1),'x',(o().ap/1e3).toFixed(1),'fuel',fuel().toFixed(1));
