// Practice targets (v1.47): four stations in circular orbits (80, 150, 300 km and 50 km round the Moon), ports facing backwards
// along the orbit as they go round; a chaser that comes up from behind slowly docks with one.
const F=require('./harness.js');let bad=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)bad++;};
F.startFlight(F.tpl('orbiter'),'O');F.spawnTargets();
const T=F.VS.filter(v=>v.target);
ok(T.length===4,`${T.length} targets spawned: ${T.map(t=>t.name).join(', ')}`);
const face=t=>{const sp=Math.hypot(t.vx,t.vy);return(Math.sin(t.phi)*t.vx+Math.cos(t.phi)*t.vy)/sp;};   // +1 = port faces forward, -1 = backward
const dt=0.05;for(let i=0;i<6000;i++)for(const t of T)F.stepV(t,dt,0);   // 5 minutes
for(const t of T){const B=F.BOD[t.body],h=Math.hypot(t.x,t.y)-B.R,want=+t.name.match(/(\d+) km/)[1]*1000;
  ok(Math.abs(h-want)<1500&&face(t)<-0.99,`${t.name}: at ${(h/1000).toFixed(1)} km after 5 min, port facing backwards (${face(t).toFixed(3)})`);}
// a chaser 1.5 m behind the 150 km target's port, nose (and its port) forward, catching up at 0.2 m/s
{const tg=T.find(t=>/150 km/.test(t.name));const mk=list=>{const ps=[];let y=0;for(const[t,w,h]of list){const p=F.mkPart(t,w,h);p.x=0;p.y=y;y+=p.h;ps.push(p);}return ps;};
  const c=F.mkVessel(mk([["tank",30,40],["probe",30],["dock",20]]),'Chaser',0);F.VS.push(c);F.AV=c;
  const sp=Math.hypot(tg.vx,tg.vy),ux=tg.vx/sp,uy=tg.vy/sp;c.phi=Math.atan2(ux,uy);c.om=tg.om;c.landed=false;c.thr=0;
  const pt=F.portWorld(tg,F.freePorts(tg)[0]),pc=F.portWorld(c,F.freePorts(c)[0]);c.x+=pt.x-1.5*ux-pc.x;c.y+=pt.y-1.5*uy-pc.y;c.vx=tg.vx+0.2*ux;c.vy=tg.vy+0.2*uy;
  let t=0;while(t<30&&!tg.dockHost&&!c.dockHost){for(const v of F.VS)F.stepV(v,0.01,0);F.dockFollow();F.dockCheck();t+=0.01;}
  ok(tg.dockHost===c,`the chaser docked with ${tg.name} after ${t.toFixed(1)} s (the target rides along as its passenger)`);}
if(bad)process.exit(1);console.log('practice targets ok');
