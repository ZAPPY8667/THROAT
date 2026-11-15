// ================= THE WORLD: Earth's surface, the spaceport, weather, day and night =================
// Earth is a hand-made place, the same every game: going east from the pad you cross the beach and an ocean, then jungle,
// forest, a mountain range, desert, an ice plateau, a second ocean, grassland and hills, and come back to the spaceport.
// Distances along the surface are "s", in metres east of the pad (it wraps around the planet).
// The ground is real: rockets stand, land and crash on it everywhere, and come down in the sea where it's water.
// Weather (clouds, rain, wind) is scenery only: it never pushes the rocket.
const CIRC=2*Math.PI*PR;
const wrapS=s=>{s%=CIRC;if(s<0)s+=CIRC;return s;};
// --- the shape of the land: height (m) at key points (km east of the pad), smoothed between them ---
// Negative = sea floor. The spaceport sits flat at sea level (0 m) so the pad is at 0.
const TK=[[0,0],[0.62,0],[0.8,-3],[2,-25],[30,-900],[80,-2600],[1420,-2600],[1490,-40],[1500,1],[1530,20],[1700,250],[2300,900],[2420,2400],
  [2560,5600],[2700,2400],[2780,900],[2850,500],[3650,450],[3760,1800],[4200,2100],[4290,300],[4305,1],[4315,-40],[4400,-3000],[5480,-3000],
  [5560,-40],[5570,1],[5600,40],[5900,150],[6000,700],[6100,250],[6230,30],[6283.185,0]];
// biomes by stretch of the surface (km): name, ground colour, grass/top colour, roughness of the noise added on top (m)
const BIOMES=[[0,0.62,"Spaceport","#6e7176","#8a8d92",0],[0.62,1500,"Ocean","#3f3a32","#d9c79a",0],[1500,1530,"Beach","#c9b27f","#e6d7a8",2],
  [1530,1750,"Jungle","#3b3a26","#2e6a2b",40],[1750,2380,"Forest","#4a4430","#3f6d36",120],[2380,2780,"Mountains","#6c665e","#7d7468",900],
  [2780,3720,"Desert","#b8945e","#d8b878",35],[3720,4300,"Ice plateau","#9aa6b2","#e9eef3",120],[4300,5565,"Ocean","#3f3a32","#d9c79a",0],
  [5565,5600,"Beach","#c9b27f","#e6d7a8",2],[5600,5940,"Grassland","#5a4c34","#5f8a45",40],[5940,6120,"Hills","#4f4632","#4a7a3c",260],
  [6120,6280,"Coastal plain","#5a5040","#6a9150",8],[6280,6283.19,"Spaceport","#6e7176","#8a8d92",0]];
function biomeAt(s){const k=wrapS(s)/1000;for(const b of BIOMES)if(k>=b[0]&&k<b[1])return b;return BIOMES[0];}
// smooth value noise from a fixed hash: the same hills every game
const hash1=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function vnoise(x){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return hash1(i)*(1-u)+hash1(i+1)*u;}
// height of the ground (m above sea level; negative = sea floor) at s
// The launch pad stands on a raised mound (v1.36), like real pads: a flat top PADT either side of the rocket, then smooth slopes
// (never steeper than about 35°) down to the ground PADS further out. The flame trench's ducts come out on those slopes.
const PADH=12,PADT=44,PADS=30;
function padMound(d){d=Math.abs(d);if(d>=PADT+PADS)return 0;if(d<=PADT)return PADH;const t=(d-PADT)/PADS;return PADH*(1-t*t*(3-2*t));}
function terrH(s){s=wrapS(s);const dp=Math.min(s,CIRC-s);if(dp<PADT+PADS)return padMound(dp);const k=s/1000;let i=0;while(i<TK.length-2&&TK[i+1][0]<=k)i++;
  const[a,ha]=TK[i],[b,hb]=TK[i+1],t=Math.max(0,Math.min(1,(k-a)/(b-a))),u=t*t*(3-2*t);let h=ha+(hb-ha)*u;
  const r=roughAt(s);   // hills and peaks on top of the big shape; none at the spaceport, the beaches or the sea floor
  if(r>0)h+=r*((vnoise(s/22000)-0.5)*1.4+(vnoise(s/3100+7)-0.5)*0.55+(vnoise(s/420+3)-0.5)*0.16+(vnoise(s/60+11)-0.5)*0.03)*(h>0?1:0);
  return h;}
// roughness fades in and out over 15 km at the edges of each biome, so the noise never makes a cliff
function roughAt(s){const k=wrapS(s)/1000;let r=0;for(const b of BIOMES){if(!b[5])continue;const d=Math.min(k-b[0],b[1]-k);if(d>-15)r=Math.max(r,b[5]*Math.max(0,Math.min(1,(d+15)/30)));}
  const nearPad=Math.min(k,6283.185-k);if(nearPad<8)r*=Math.max(0,(nearPad-3)/5);return r;}
// what a craft touching the ground at world point (x, y) stands on: height of the surface there, and whether it's water
// what a craft touches at a point: the terrain, the sea (water: true), or a building's roof (bld: that building)
function groundAt(body,x,y){if(body!==0)return{h:0,water:false};const sp=Math.atan2(x,y)*PR,th=terrH(sp),b=bldAt(sp);
  if(b)return{h:Math.max(0,th,b.h),water:false,bld:b};return{h:Math.max(0,th),water:th<0};}
// --- the spaceport: buildings at s (m, west is negative), width and height (m) ---
const PAD2=-2000;   // the landing zone: on land, 2 km west of the launch pad (the ocean is east)
const BLD=[{t:"mast",s:-95,w:3,h:120},{t:"mast",s:95,w:3,h:120},{t:"water",s:-300,w:22,h:55},{t:"tanks",s:-470,w:80,h:22},
  {t:"lcc",s:-1250,w:90,h:28},{t:"road",s:-3600,w:3500,h:0},{t:"hangar",s:-2160,w:70,h:30},{t:"vab",s:-3300,w:190,h:160},
  {t:"light",s:640,w:8,h:34},{t:"fuel",s:-160,w:30,h:14}];
// buildings are solid (v1.32): you can land on a roof, and flying into a wall is a crash. The road is flat; the launch tower and
// pad are part of the launch itself and stay out of it. Buildings stand on the flat spaceport (drawn at height 0).
const SOLID=BLD.filter(b=>b.h>0&&b.t!=="road");
const BNAME={mast:"lightning mast",water:"water tower",tanks:"fuel farm",lcc:"launch control centre",hangar:"hangar",vab:"assembly building",light:"lighthouse",fuel:"fuel tanks"};
function bldAt(sp){for(const b of SOLID)if(Math.abs(sp-b.s)<b.w/2)return b;return null;}
// --- time of day: one day lasts 20 minutes of game time, and the clock starts at 9:00 in the morning ---
const DAY=1200,CLK0=9;
// the sun's direction (angle like the craft's position angle: 0 = straight up from the pad) at game time t
const sunAng=t=>Math.PI/12*(12-CLK0)-2*Math.PI*t/DAY;
// local hour (0–24) at surface angle ang
const hourAt=(ang,t)=>{let x=12+wrapA(ang-sunAng(t))/(2*Math.PI)*24;return(x+24)%24;};
// how high the sun is for someone at angle ang, height h: 1 = overhead, 0 = on the horizon (a little lower still lights you when high up)
const sunEl=(ang,t)=>Math.cos(wrapA(ang-sunAng(t)));
const sunDip=h=>Math.sqrt(2*Math.max(0,h)/PR);
// --- weather: picked per launch, stays the same if you retry. Scenery only ---
const WX=[{k:"clear",n:"Clear",cl:0.35,rain:0,wind:4},{k:"cloudy",n:"Cloudy",cl:1,rain:0,wind:8},{k:"rain",n:"Rain",cl:1.4,rain:0.6,wind:11},{k:"storm",n:"Storm",cl:1.8,rain:1,wind:19}];
let wx=WX[0],wxSeed=1,windDir=1;
function pickWeather(seed){wxSeed=seed;const r=hash1(seed*3.7);wx=r<0.45?WX[0]:r<0.75?WX[1]:r<0.93?WX[2]:WX[3];windDir=hash1(seed*9.1)<0.6?1:-1;}
// ================= drawing the world =================
const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mixC=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// sky colours for a viewer at angle ang, height h: day blue, sunrise/sunset orange near the sun, night navy; black in space.
// light = how much sunlight the scene gets (1 noon, ~0.15 at night); gloom darkens it in rain
function skyFor(ang,h,t,atm){const el=sunEl(ang,t)+sunDip(h),day=Math.max(0,Math.min(1,(el+0.08)/0.3)),dusk=Math.max(0,1-Math.abs(el)/0.28);
  const sk=atm?Math.min(1,Math.max(0,h/26000)):1,gl=atm?Math.max(0,1-h/6000)*(wx.cl>1?Math.min(0.55,(wx.cl-1)*0.6):0):0;
  let top=mixC([4,8,22],[70,140,225],day),bot=mixC([10,16,34],[150,200,250],day);
  top=mixC(top,[70,60,110],dusk*0.5);bot=mixC(bot,[250,140,70],dusk*0.75);
  top=mixC(top,[95,104,116],gl*day);bot=mixC(bot,[140,148,158],gl*day);
  top=mixC(top,[2,4,12],sk);bot=mixC(bot,[4,6,16],sk);
  return{top,bot,sk,day,dusk,light:atm?Math.max(0.16,Math.min(1,0.16+0.84*day))*(1-0.35*gl):(el>-0.05?1:0.18),stars:Math.max(sk,1-day)};}
// the ground, sea, trees, rocks and buildings, drawn in world coordinates (metres, y up). sc = camera surface position (m),
// px = screen pixels per metre, t = game time, now = real time (for waves and swaying trees, which shouldn't speed up with warp)
function drawEarth(c,sc,px,t,now){
  const span=Math.min(Math.PI,Math.hypot(FW,FH)/px*0.75/PR+0.002),full=span>=Math.PI-1e-6,a0=sc/PR-span,
    N=Math.max(200,Math.min(2600,Math.round(span*2*PR*px/3))),da=span*2/N,deep=Math.max(4,9/px);
  const ang=[],H=[];for(let i=0;i<=N;i++){const a=a0+i*da;ang.push(a);H.push(terrH(a*PR));}
  const P=(a,r)=>[Math.sin(a)*r,Math.cos(a)*r];
  // rock underneath everything
  const far=px*PR<5000;   // far enough to see the planet as a ball: paint the globe under the real rim
  if(far)drawGlobe(c,PR-1500,true);
  c.fillStyle="#3b3128";if(full&&!far){c.beginPath();c.arc(0,0,PR-3200,0,6.2832);c.fill();}
  c.beginPath();for(let i=0;i<=N;i++){const[x,y]=P(ang[i],PR+H[i]);i?c.lineTo(x,y):c.moveTo(x,y);}
  for(let i=N;i>=0;i-=Math.max(1,N>>6)){const[x,y]=P(ang[i],PR-(far?Math.max(3400,12/px):3400));c.lineTo(x,y);}c.closePath();if(!far)c.fill();
  // soil / sand / snow band along the top, coloured by biome; snow on high ground
  let i=0;while(i<N){const b=biomeAt(ang[i]*PR);let j=i;const snow=H[i]>3600;while(j<N&&biomeAt(ang[j+1]*PR)===b&&(H[j+1]>3600)===snow)j++;j=Math.min(N,j+1);
    c.beginPath();for(let k=i;k<=j;k++){const[x,y]=P(ang[k],PR+H[k]);k>i?c.lineTo(x,y):c.moveTo(x,y);}
    for(let k=j;k>=i;k--){const[x,y]=P(ang[k],PR+H[k]-deep*(H[k]<0?0.4:1));c.lineTo(x,y);}c.closePath();c.fillStyle=snow?"#cfd6de":b[3];c.fill();
    c.beginPath();for(let k=i;k<=j;k++){const[x,y]=P(ang[k],PR+H[k]);k>i?c.lineTo(x,y):c.moveTo(x,y);}
    c.strokeStyle=snow?"#f4f7fa":H[i]<0?"#b9a983":b[4];c.lineWidth=Math.max(2.5/px,0.8);c.stroke();i=j;}
  // the sea: from the waves down to the sea floor; deeper = darker. Waves get bigger with the wind.
  const wa=(0.25+wx.wind*0.06),wv=s=>px>0.6?wa*(Math.sin(s*0.21+now*1.7)*0.6+Math.sin(s*0.057-now*0.9)*0.4):0;
  i=0;while(i<N){if(H[i]>=0){i++;continue;}let j=i;while(j<N&&H[j+1]<0)j++;const i0=Math.max(0,i-1),j1=Math.min(N,j+1);
    const g=c.createRadialGradient(0,0,PR-2600,0,0,PR);g.addColorStop(0,"#06243f");g.addColorStop(0.97,"#0e4f80");g.addColorStop(1,"#2a86b8");
    c.beginPath();for(let k=i0;k<=j1;k++){const[x,y]=P(ang[k],PR+wv(ang[k]*PR));k>i0?c.lineTo(x,y):c.moveTo(x,y);}
    for(let k=j1;k>=i0;k--){const[x,y]=P(ang[k],PR+Math.min(0,H[k]));c.lineTo(x,y);}c.closePath();c.fillStyle=g;c.fill();
    c.beginPath();for(let k=i0;k<=j1;k++){const[x,y]=P(ang[k],PR+wv(ang[k]*PR));k>i0?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle="rgba(190,225,245,.55)";c.lineWidth=Math.max(1.5/px,0.3);c.stroke();
    // surf: white foam where the sea meets the beach
    for(const k of[i0,j1])if(H[k]>-1e9&&px>0.15){const[x,y]=P(ang[k],PR+0.3);c.fillStyle="rgba(255,255,255,.7)";c.beginPath();c.ellipse(x,y,Math.max(6,3/px)*(1+0.3*Math.sin(now*2+k)),Math.max(0.8,1/px),-ang[k],0,6.2832);c.fill();}
    i=j+1;}
  if(px>0.02)drawBuildings(c,sc,px,now);
  if(px>0.22)drawFlora(c,sc,px,now);}
// trees and rocks: placed by a fixed hash, so they're always in the same spots. Only the ones on screen are drawn.
const FLORA={Jungle:[7,"jungle"],Forest:[11,"pine"],Hills:[14,"oak"],Grassland:[30,"oak"],"Coastal plain":[20,"oak"],Beach:[26,"palm"],Desert:[60,"cactus"],Mountains:[22,"pine"],"Ice plateau":[0,""]};
function drawFlora(c,sc,px,now){const W=Math.hypot(FW,FH)/px*0.6,sway=Math.sin(now*1.3)*0.012*wx.wind/8;
  for(let s=Math.floor((sc-W)/6)*6;s<sc+W;s+=6){const id=Math.round(s/6),b=biomeAt(s),f=FLORA[b[2]],r=hash1(id*1.37);
    if(s>-4200&&s<620&&!(s>520&&r<0.3))continue;   // keep the spaceport clear (a few palms by the beach)
    const h=terrH(s);if(h<0.5)continue;
    if(f&&f[0]&&r<6/f[0]){let kind=f[1];if(kind==="pine"&&h>3300)continue;if(h>2600&&kind!=="pine")kind="pine";treeAt(c,s,h,kind,hash1(id*7.7),sway);}
    else if((b[2]==="Mountains"||b[2]==="Desert"||b[2]==="Ice plateau"||b[2]==="Hills")&&r>0.93)rockAt(c,s,h,hash1(id*3.3));}}
function upAt(c,s,h){const a=s/PR;c.translate(Math.sin(a)*(PR+h),Math.cos(a)*(PR+h));c.rotate(-a);}
function treeAt(c,s,h,kind,q,sway){c.save();upAt(c,s,h-0.3);const k=0.7+q*0.7;c.scale(k,k);c.rotate(sway*(1+q));
  if(kind==="pine"){c.fillStyle="#3a2a1c";c.fillRect(-0.5,0,1,4);c.fillStyle=q<0.5?"#21462b":"#2a5233";c.beginPath();c.moveTo(-4,3);c.lineTo(0,18);c.lineTo(4,3);c.fill();
    if(h>2000){c.fillStyle="rgba(240,245,250,.8)";c.beginPath();c.moveTo(-1.6,13);c.lineTo(0,18);c.lineTo(1.6,13);c.fill();}}
  else if(kind==="oak"){c.fillStyle="#3d2b1b";c.fillRect(-0.7,0,1.4,6);c.fillStyle=q<0.5?"#3f6e30":"#4c7b36";for(const[x,y,r]of[[0,10,5],[-3,8,3.6],[3,8.5,3.8]]){c.beginPath();c.arc(x,y,r,0,6.2832);c.fill();}}
  else if(kind==="jungle"){c.fillStyle="#3a2c1c";c.fillRect(-0.6,0,1.2,16);c.fillStyle=q<0.5?"#1f5a24":"#2a6a2a";for(const[x,y,r]of[[0,18,6],[-4,15,4],[4,16,4.5]]){c.beginPath();c.arc(x,y,r,0,6.2832);c.fill();}}
  else if(kind==="palm"){c.strokeStyle="#7a5a3a";c.lineWidth=0.9;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(1.5,7,0.8,13);c.stroke();c.strokeStyle="#3d7a34";c.lineWidth=0.8;
    for(const d of[-1,1,-0.4,0.4]){c.beginPath();c.moveTo(0.8,13);c.quadraticCurveTo(0.8+d*4,15,0.8+d*6,11);c.stroke();}}
  else if(kind==="cactus"){c.fillStyle="#4f7a3a";c.fillRect(-0.5,0,1,6);c.fillRect(-2.2,2.5,1,2.5);c.fillRect(1.2,3,1,2.4);c.fillRect(-2.2,2.5,2,0.8);c.fillRect(0,3,2.2,0.8);}
  c.restore();}
function rockAt(c,s,h,q){c.save();upAt(c,s,h-0.5);const k=2+q*6;c.fillStyle=q<0.5?"#6a645c":"#7d776e";c.beginPath();c.moveTo(-k,0);c.lineTo(-k*0.6,k*0.7);c.lineTo(k*0.2,k*0.9);c.lineTo(k,k*0.3);c.lineTo(k*0.9,0);c.closePath();c.fill();
  c.fillStyle="rgba(255,255,255,.12)";c.beginPath();c.moveTo(-k*0.6,k*0.7);c.lineTo(k*0.2,k*0.9);c.lineTo(0,k*0.5);c.closePath();c.fill();c.restore();}
// the spaceport: vehicle assembly building, launch control, hangar at the landing zone, tank farm, water tower, lightning masts,
// a lighthouse on the beach and the road. Plain, no logos.
function drawBuildings(c,sc,px,now){for(const B of BLD){if(Math.abs(B.s-sc)>Math.hypot(FW,FH)/px+B.w)continue;c.save();upAt(c,B.s,0);
  const w=B.w,h=B.h,L=-w/2;
  switch(B.t){
    case"vab":c.fillStyle=cyl(c,L,-L,[214,216,220]);c.fillRect(L,0,w,h);c.fillStyle="#9ea3aa";c.fillRect(L,h-4,w,4);
      c.fillStyle="#7a8088";for(let x=L+20;x<-L-20;x+=38)c.fillRect(x,0,22,h*0.86);c.fillStyle="rgba(0,0,0,.12)";for(let y=10;y<h*0.86;y+=10)c.fillRect(L,y,w,0.6);break;
    case"lcc":c.fillStyle=cyl(c,L,-L,[200,203,208]);c.fillRect(L,0,w,h);c.fillStyle="#2a3440";for(let y=6;y<h-3;y+=7)c.fillRect(L+3,y,w-6,3);break;
    case"hangar":c.fillStyle=cyl(c,L,-L,[170,174,180]);c.beginPath();c.moveTo(L,0);c.lineTo(L,h*0.7);c.quadraticCurveTo(0,h*1.15,-L,h*0.7);c.lineTo(-L,0);c.closePath();c.fill();c.fillStyle="#555b63";c.fillRect(L+8,0,w-16,h*0.55);break;
    case"tanks":for(const x of[-28,0,28]){c.fillStyle=cyl(c,x-11,x+11,[226,228,232]);c.beginPath();c.arc(x,12,11,0,6.2832);c.fill();c.fillStyle="#8a8f96";c.fillRect(x-8,0,2,4);c.fillRect(x+6,0,2,4);}break;
    case"water":c.strokeStyle="#9aa0a8";c.lineWidth=1.2;for(const x of[-7,7]){c.beginPath();c.moveTo(x,0);c.lineTo(x*0.6,h-14);c.stroke();}c.fillStyle=cyl(c,-11,11,[220,222,226]);c.beginPath();c.ellipse(0,h-8,11,9,0,0,6.2832);c.fill();c.fillRect(-1.5,h-18,3,10);break;
    case"mast":c.fillStyle="#b5bac2";c.fillRect(-1,0,2,h);c.strokeStyle="rgba(200,205,212,.5)";c.lineWidth=0.3;c.beginPath();c.moveTo(0,h);c.lineTo(B.s<0?60:-60,0);c.stroke();break;
    case"light":c.fillStyle="#e9ebee";c.beginPath();c.moveTo(-4,0);c.lineTo(-2.4,h);c.lineTo(2.4,h);c.lineTo(4,0);c.closePath();c.fill();c.fillStyle="#c23b2e";c.fillRect(-3.4,h*0.35,6.8,4);c.fillRect(-2.9,h*0.7,5.8,4);c.fillStyle="#30363e";c.fillRect(-2.6,h,5.2,4);break;
    case"fuel":c.fillStyle=cyl(c,L,-L,[200,202,206]);c.fillRect(L,0,w,h*0.7);c.fillStyle="#9aa0a8";c.fillRect(L+4,h*0.7,4,h*0.3);break;
    case"road":c.fillStyle="#3b3e43";c.fillRect(L,-0.3,w,0.6);break;}
  c.restore();}}
// lights that matter at night: windows, red aviation lights on tall things (blinking), the lighthouse beam, pad floodlights
function drawNightLights(c,sc,px,now,dark){if(dark<0.05||px<0.01)return;c.save();c.globalCompositeOperation="lighter";const blink=Math.sin(now*3)>0.2;
  const glow=(x,y,r,col,a)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);};
  for(const B of BLD){if(Math.abs(B.s-sc)>Math.hypot(FW,FH)/px+B.w)continue;c.save();upAt(c,B.s,0);const w=B.w,h=B.h,L=-w/2;
    if(B.t==="lcc"){c.fillStyle=`rgba(255,214,140,${0.85*dark})`;for(let y=6;y<h-3;y+=7)for(let x=L+4;x<-L-4;x+=5)if(hash1(x*3+y)>0.35)c.fillRect(x,y+0.5,3.2,2);}
    if(B.t==="vab"){c.fillStyle=`rgba(255,220,160,${0.7*dark})`;for(let y=12;y<h*0.85;y+=14)for(let x=L+6;x<-L-6;x+=9)if(hash1(x+y*7)>0.75)c.fillRect(x,y,3,2);}
    if(h>25&&B.t!=="road"&&blink)glow(0,h+1,Math.max(6,3/px),"255,60,40",0.9*dark);
    if(B.t==="light"){glow(0,h+2,Math.max(10,5/px),"255,240,200",dark);const sw=now*0.8;c.fillStyle=`rgba(255,240,200,${0.18*dark})`;c.beginPath();c.moveTo(0,h+2);c.lineTo(Math.cos(sw)*400,h+2+Math.sin(sw)*30+12);c.lineTo(Math.cos(sw)*400,h+2+Math.sin(sw)*30-12);c.fill();}
    c.restore();}
  // floodlights on the pad and the landing zone
  for(const s0 of[0,PAD2]){if(Math.abs(s0-sc)>Math.hypot(FW,FH)/px+200)continue;c.save();upAt(c,s0,0);for(const x of[-45,45])glow(x,30,Math.max(40,6/px),"255,236,200",0.28*dark);c.restore();}
  c.restore();}
// rain streaks and lightning, drawn on the screen (not in the world), only below the clouds
function drawRain(c,h,now,dt){if(!(wx.rain>0)||h>3500)return;const k=wx.rain*Math.max(0,1-h/3500);c.save();c.strokeStyle=`rgba(200,215,235,${0.35*k})`;c.lineWidth=FDS;
  const n=Math.round(260*k),sl=windDir*wx.wind*0.9;c.beginPath();for(let i=0;i<n;i++){const x=(hash1(i*1.3)*FW*1.2+now*sl*40*FDS+hash1(i*2.7)*99)%(FW*1.2)-FW*0.1,y=(hash1(i*5.1)*FH+now*900*FDS*(0.8+hash1(i)*0.4))%FH;
    c.moveTo(x,y);c.lineTo(x+sl*1.4*FDS,y+22*FDS);}c.stroke();c.restore();
  if(wx.k==="storm"){lightT-=dt;if(lightT<0){lightT=4+hash1(now)*9;lightF=1;}if(lightF>0){c.fillStyle=`rgba(230,235,255,${0.5*lightF})`;c.fillRect(0,0,FW,FH);lightF=Math.max(0,lightF-dt*4);}}}
let lightT=5,lightF=0;
// seen from high up, the half of the planet facing away from the sun is in night (a soft edge where the sun sets)
function drawEarthShadow(c,psi,h,px){if(h<15000)return;const sg=sunAng(FT),k=Math.min(1,(h-15000)/40000);c.save();
  for(const[off,al]of[[0,0.55],[0.05,0.15],[-0.05,0.15]]){c.beginPath();c.moveTo(0,0);c.arc(0,0,PR+3000,-sg-Math.PI+off,-sg-off*0);c.closePath();c.fillStyle=`rgba(2,6,18,${al*k})`;c.fill();}
  c.restore();}
// ================= the launch tower (umbilical tower) =================
// A thick steel lattice tower west of the rocket, a bit taller than it: two heavy corner columns with X-bracing in every bay,
// a platform every 8 m, an elevator shaft and stairs inside, a lightning mast on top, and swing arms out to the rocket:
// umbilical arms with sagging hoses (fuel, power, data) and a crew access arm near the top. The arms swing up and away when the
// rocket lifts off (retract 0 → 1). Sizes in metres; x = 0 is the rocket's centre line, y = 0 the pad deck.
function drawTower(c,rw,rh,up,lo){   // up: how far the upper arms have swung away (T−5 → T−2); lo: the base umbilicals (drop at T−0)
  const H=Math.max(30,rh*1.12+8),W=Math.max(13,Math.min(24,rh*0.17)),gap=Math.max(7,rw*0.3),xR=-(rw/2+gap),xL=xR-W;
  const steel="#5d636c",dark="#3a3f46",lite="#8a919b";
  // the pad deck: a concrete slab with the flame trench opening under the rocket and hold-down posts
  const dk=Math.min(PADT,rw/2+gap+W+12);c.fillStyle="#8b8f95";c.fillRect(-dk,-4,dk*2,4);c.fillStyle="#6e7278";c.fillRect(-dk,-0.6,dk*2,0.6);
  c.fillStyle="#1d1f23";c.fillRect(-rw*0.45,-4,rw*0.9,3.2);
  c.fillStyle=dark;for(const x of[-rw/2-1.2,rw/2+0.2])c.fillRect(x,0,1,2.2);
  c.save();c.globalAlpha=0.5;   // v1.36: the tower stands further back, hazy, so the rocket in front is what you look at
  // corner columns (thick), with a light edge so they read as steel
  for(const x of[xL,xR-2.2]){c.fillStyle=steel;c.fillRect(x,0,2.2,H);c.fillStyle=lite;c.fillRect(x,0,0.5,H);c.fillStyle=dark;c.fillRect(x+1.7,0,0.5,H);}
  // bays: horizontal beams and X-bracing
  const bay=Math.max(4,W*0.5),mid=(xL+xR)/2;c.strokeStyle=steel;c.lineWidth=0.7;c.beginPath();   // two columns of X-bracing with a middle post
  for(let y=0;y<H-0.5;y+=bay){const y1=Math.min(H,y+bay);for(const[a,b]of[[xL+2.2,mid],[mid,xR-2.2]]){c.moveTo(a,y);c.lineTo(b,y1);c.moveTo(b,y);c.lineTo(a,y1);}c.moveTo(xL+2.2,y);c.lineTo(xR-2.2,y);}c.stroke();
  c.fillStyle=steel;c.fillRect(mid-0.5,0,1,H);
  // service platforms every 8 m: a deck with a handrail sticking out toward the rocket
  for(let y=8;y<H-2;y+=8){c.fillStyle=dark;c.fillRect(xL-0.6,y-0.5,W+1.6,0.9);c.strokeStyle=lite;c.lineWidth=0.18;c.beginPath();c.moveTo(xL-0.6,y+1.1);c.lineTo(xR+0.8,y+1.1);c.stroke();}
  // elevator shaft and the stairs zig-zagging beside it
  c.fillStyle="rgba(30,33,38,.75)";c.fillRect(xL+W*0.18,0,W*0.28,H-3);c.fillStyle="#c9ccd1";const cab=((performance.now()/1000)%40)/40;c.fillRect(xL+W*0.2,(cab<0.5?cab*2:2-cab*2)*(H-8)+1,W*0.24,2.6);
  c.strokeStyle="rgba(150,156,165,.7)";c.lineWidth=0.2;c.beginPath();for(let y=0;y<H-2;y+=4){const a=xL+W*0.55,b=xR-1.8;c.moveTo(a,y);c.lineTo(b,y+2);c.lineTo(a,y+4);}c.stroke();
  // top: a cap, the lightning mast and a hammerhead crane
  c.fillStyle=dark;c.fillRect(xL-1,H,W+2,1.6);c.fillStyle=lite;c.fillRect(xL+W/2-0.25,H+1.6,0.5,H*0.18);
  c.fillStyle=steel;c.fillRect(xL-W*0.6,H+1.6,W*2.1,1.1);c.fillRect(xL+W*0.4,H+1.6,1,3);c.strokeStyle=lite;c.lineWidth=0.12;c.beginPath();c.moveTo(xL+W*1.3,H+1.6);c.lineTo(xL+W*1.3,H-6);c.stroke();
  // swing arms: three umbilical arms with hoses, and the crew access arm with its white room near the top
  const arms=[[0.28,0],[0.55,0],[0.8,0],[0.93,1]];
  for(const[f,crew]of arms){const retract=f>=0.8?up:lo,y=Math.min(H-3,rh*f),L=gap+0.2,a=retract*(crew?1.3:1.1);   // swing up and back toward the tower
    c.save();c.translate(xR,y);c.rotate(a);
    c.fillStyle=crew?"#c9ccd1":steel;c.fillRect(0,-0.9,L,crew?3:1.8);c.fillStyle=dark;c.fillRect(0,-0.9,L,0.4);c.strokeStyle=lite;c.lineWidth=0.15;c.beginPath();
    for(let x=0;x<L;x+=1.2){c.moveTo(x,-0.5);c.lineTo(x+0.6,crew?1.9:0.6);}c.stroke();
    if(crew){c.fillStyle="#e9ebee";c.fillRect(L-2.2,-0.5,2.2,2.6);c.fillStyle="#1f2329";c.fillRect(L-1.6,0.2,1,1.2);}
    else if(retract<0.05){c.strokeStyle="#1c1e22";c.lineWidth=0.55;for(const k of[0.15,0.4,0.65]){c.beginPath();c.moveTo(L*k,-0.9);c.quadraticCurveTo((L*k+L)/2,-4.5-k*2,L,-1.4);c.stroke();}
      c.fillStyle="#2a2d33";c.fillRect(L-0.6,-1.6,0.6,1.2);}
    c.restore();}
  c.restore();}
// ================= the globe: what the planet looks like from far away =================
// The game is a slice through the planet, so only the rim is "real ground". From orbit and on the map you look at the whole
// disc, so it gets a painted globe: continents with natural coastlines (fractal noise, warped so they don't look like blobs),
// climate zones (ice, tundra, forest, grassland, desert, jungle), mountain ranges with snow, shallow seas near the coasts, and
// a layer of cloud. Near the rim it fades into the real biomes and coastline, so the two always agree. Made once, then cached.
const h3=(x,y,z)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n);};
function vn3(x,y,z){const X=Math.floor(x),Y=Math.floor(y),Z=Math.floor(z),fx=x-X,fy=y-Y,fz=z-Z,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
  const L=(a,b,t)=>a+(b-a)*t,c=(i,j,k)=>h3(X+i,Y+j,Z+k);
  return L(L(L(c(0,0,0),c(1,0,0),u),L(c(0,1,0),c(1,1,0),u),v),L(L(c(0,0,1),c(1,0,1),u),L(c(0,1,1),c(1,1,1),u),v),w);}
function fbm3(x,y,z,o){let a=0.5,s=0,f=1;for(let i=0;i<o;i++){s+=a*vn3(x*f,y*f,z*f);f*=2.03;a*=0.5;}return s;}
let globeTex=null,cloudTex=null;
function makeGlobe(){const N=640,cv=document.createElement("canvas"),cc=document.createElement("canvas");cv.width=cv.height=cc.width=cc.height=N;
  const g=cv.getContext("2d"),gc=cc.getContext("2d"),im=g.createImageData(N,N),ic=gc.createImageData(N,N),d=im.data,dc=ic.data;
  const C=(hex)=>hexRGB(hex),ICE=C("#e8eef3"),TUN=C("#7d8467"),FOR=C("#355f2e"),GRA=C("#6b8f45"),DES=C("#d2b274"),JUN=C("#2a5a24"),ROCK=C("#6f665a"),SNOW=C("#f2f5f8");
  const DEEP=[10,38,72],MIDS=[20,70,120],SHAL=[44,130,160];
  for(let py=0;py<N;py++)for(let px=0;px<N;px++){const x=(px+0.5)/N*2-1,y=1-(py+0.5)/N*2,r=Math.hypot(x,y),o=(py*N+px)*4;if(r>1){d[o+3]=dc[o+3]=0;continue;}
    const z=Math.sqrt(Math.max(0,1-r*r)),X=x*1.7,Y=y*1.7,Z=z*1.7;
    const wx=fbm3(X+3.1,Y,Z,3)-0.5,wy=fbm3(X,Y+5.7,Z,3)-0.5;   // domain warp: twisty, believable coastlines
    let n=fbm3(X+wx*1.6,Y+wy*1.6,Z,6),land=n-0.52;
    const ang=Math.atan2(x,y),sx=ang*PR,th=terrH(sx),b=biomeAt(sx),wr=Math.max(0,Math.min(1,(r-0.9)/0.08))**2;   // near the rim: the real coast and biome
    land=land*(1-wr)+(th>=0?0.06:-0.06)*wr;
    let col;
    if(land<0){const dp=Math.min(1,-land*7);col=dp<0.25?mixC(SHAL,MIDS,dp/0.25):mixC(MIDS,DEEP,(dp-0.25)/0.75);}
    else{const temp=fbm3(X*0.7+9,Y*0.7,Z*0.7,3)+(0.35-Math.abs(y)*0.45)*0.6,wet=fbm3(X*1.3,Y*1.3+11,Z*1.3,4),ridge=1-Math.abs(fbm3(X*2.2+2,Y*2.2,Z*2.2,5)*2-1),mtn=Math.max(0,ridge-0.72)*3.6*Math.min(1,land*14);
      col=temp<0.42?ICE:temp<0.5?TUN:temp>0.66&&wet<0.48?DES:temp>0.64&&wet>0.55?JUN:wet>0.5?FOR:GRA;
      if(mtn>0)col=mixC(col,mtn>0.75?SNOW:ROCK,Math.min(1,mtn));
      if(wr>0)col=mixC(col,th>3600?SNOW:hexRGB(b[4]),wr);
      col=mixC(col,[col[0]*0.85,col[1]*0.9,col[2]*0.8],Math.min(1,land*5)*0.3);}   // inland a touch darker
    const sh=0.5+0.5*z;   // a round planet: darker toward the edge
    d[o]=col[0]*sh;d[o+1]=col[1]*sh;d[o+2]=col[2]*sh;d[o+3]=255;
    const cl=fbm3(X*1.4+wx*2.5+20,Y*2.8+wy*2,Z*1.4,5);const ca=Math.max(0,Math.min(1,(cl-0.55)*4))*0.85;dc[o]=dc[o+1]=dc[o+2]=255;dc[o+3]=ca*255*(0.6+0.4*z);}
  g.putImageData(im,0,0);gc.putImageData(ic,0,0);globeTex=cv;cloudTex=cc;}
// draw the globe at radius R (world coordinates, y up), with its clouds and a thin glow of air around it
function drawGlobe(c,R,clouds){if(!globeTex){if(typeof document==="undefined")return;makeGlobe();}
  const g=c.createRadialGradient(0,0,R,0,0,R*1.035);g.addColorStop(0,"rgba(110,170,255,.55)");g.addColorStop(1,"rgba(110,170,255,0)");c.fillStyle=g;c.beginPath();c.arc(0,0,R*1.035,0,6.2832);c.fill();
  c.save();c.scale(1,-1);c.drawImage(globeTex,-R,-R,2*R,2*R);if(clouds)c.drawImage(cloudTex,-R,-R,2*R,2*R);c.restore();}

// hold-down clamps: four heavy jaws on the pad that grip the bottom of the rocket while the engines spool up. open: 0 shut → 1 open
function drawClamps(c,rw,open){for(const sd of[-1,1]){const x=sd*(rw/2+1.2);c.save();c.translate(x,0);c.fillStyle="#4a4f57";c.fillRect(-1.4,0,2.8,2.6);
    c.rotate(sd*open*0.9);c.fillStyle="#6b7179";c.beginPath();c.moveTo(-0.6*sd,2.2);c.lineTo(-2.6*sd,3.4);c.lineTo(-2.6*sd,2.6);c.lineTo(-0.6*sd,1.6);c.closePath();c.fill();
    c.fillStyle="#c23b2e";c.fillRect(-0.5,2.4,1,0.5);c.restore();}}
// water deluge: nozzles around the pad deck spray arcs of water onto it (soaks up the sound and heat at ignition). k: 0..1
function drawDeluge(c,rw,k,now){if(k<=0.01)return;c.save();c.strokeStyle=`rgba(225,238,250,${0.55*k})`;c.lineWidth=0.35;c.beginPath();
  for(const sd of[-1,1])for(let i=0;i<46;i++){const ph=(now*1.6+i/46)%1,x0=sd*(rw/2+6+(i%5)*1.5),vx=-sd*(6+(i%7)*1.3),vy=9+(i%4)*2,t=ph*1.6,x=x0+vx*t,y=vy*t-4.9*t*t;if(y<0)continue;
    const t2=t+0.05;c.moveTo(x,y);c.lineTo(x0+vx*t2,vy*t2-4.9*t2*t2);}c.stroke();
  c.fillStyle=`rgba(230,240,250,${0.25*k})`;for(const sd of[-1,1])c.fillRect(sd>0?rw/2+2:-rw/2-14,0,12,0.6+Math.sin(now*9)*0.2);c.restore();}
// the flame lights up the ground, the tower and the steam orange; it fades as the rocket climbs. Drawn additively, in world coords
function drawFlameGlow(c,x,y,k){if(k<=0.01)return;const R=60+140*k;c.save();c.globalCompositeOperation="lighter";const g=c.createRadialGradient(x,y,0,x,y,R);
  g.addColorStop(0,`rgba(255,190,110,${0.55*k})`);g.addColorStop(0.4,`rgba(255,130,50,${0.22*k})`);g.addColorStop(1,"rgba(255,110,40,0)");c.fillStyle=g;c.fillRect(x-R,y-R,2*R,2*R);c.restore();}
// heat shimmer over the flame trench: faint wavy bands of warm air
function drawShimmer(c,rw,k,now){if(k<=0.01)return;c.save();c.strokeStyle=`rgba(255,240,220,${0.07*k})`;c.lineWidth=0.6;for(let j=0;j<6;j++){c.beginPath();const y0=2+j*3;
  for(let x=-rw*1.2;x<=rw*1.2;x+=1){const y=y0+Math.sin(x*0.6+now*7+j)*0.6;x===-rw*1.2?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}c.restore();}
// ================= the flame trench (v1.36) =================
// Real pads don't let the exhaust hit flat concrete. Under the rocket a slot goes down through the pad's mound to a steel wedge
// (the flame deflector): its two 45° faces turn the flame sideways, and two flat tunnels at ground level carry it out through
// the foot of the mound on both sides, clear of the deck and the tower. The ground is drawn cut open so you can see it.
// Pad frame, metres: x = 0 the rocket's centre line, y = 0 the deck (the mound's top), y up; the ground around is at -PADH.
const padSurf=x=>padMound(x)-PADH;   // the ground's height in the pad frame
function trenchGeo(rw,rh){const tw=Math.max(3,rw*0.9),th=Math.min(PADH-3,Math.max(5,rw*0.45)),yF=-PADH,yC=yF+th,ye=(yF+yC)/2;   // floor at ground level
  let xe=tw/2;while(padSurf(xe)>ye&&xe<400)xe+=0.25;   // where the tunnel's middle comes out on the mound's slope
  return{tw,th,yF,yC,xe,ye};}
// the inside of the trench as one outline. L: how far the tunnels run (callers clip to the ground). open: leave out the slot's top edge
function trenchPath(c,g,L,open){const{tw,yF,yC}=g,w=Math.min(tw/2,yC-yF+tw/2);
  c.moveTo(-tw/2,0);open?c.moveTo(tw/2,0):c.lineTo(tw/2,0);c.lineTo(tw/2,yC);c.lineTo(tw/2+L,yC);c.lineTo(tw/2+L,yF);c.lineTo(tw/2,yF);
  c.lineTo(0,yF+w);c.lineTo(-tw/2,yF);c.lineTo(-tw/2-L,yF);c.lineTo(-tw/2-L,yC);c.lineTo(-tw/2,yC);c.lineTo(-tw/2,0);}
function groundPath(c){c.moveTo(-200,-600);for(let x=-200;x<=200;x+=2)c.lineTo(x,padSurf(x));c.lineTo(200,-600);c.closePath();}
// k: how hard the exhaust is roaring through it (0..1). fireOnly: just the glowing gas (the night pass puts the glow back on top)
function drawTrench(c,rw,rh,k,now,fireOnly){const g=trenchGeo(rw,rh),{tw,th,yF,yC,xe,ye}=g,L=xe-tw/2+th*3;c.save();
  c.beginPath();groundPath(c);c.clip();   // nothing of it above the ground
  if(!fireOnly){c.beginPath();trenchPath(c,g,L);const gi=c.createLinearGradient(0,0,0,yF);gi.addColorStop(0,"#26282c");gi.addColorStop(1,"#0b0c0e");c.fillStyle=gi;c.fill();
    c.beginPath();trenchPath(c,g,L,true);c.strokeStyle="#5a5e64";c.lineWidth=3.2;c.stroke();c.strokeStyle="#b4b8be";c.lineWidth=1.4;c.stroke();   // thick concrete lining
    c.strokeStyle="rgba(255,190,60,.55)";c.lineWidth=0.5;c.setLineDash([2,2]);c.beginPath();for(const sd of[-1,1]){c.moveTo(sd*tw/2,-1);c.lineTo(sd*tw/2,yC);}c.stroke();c.setLineDash([]);   // hazard stripes down the slot
    const w=Math.min(tw/2,yC-yF+tw/2);c.fillStyle="#8a9098";c.strokeStyle="#c9ccd1";c.lineWidth=0.8;c.beginPath();c.moveTo(-tw/2,yF);c.lineTo(0,yF+w);c.lineTo(tw/2,yF);c.closePath();c.fill();c.stroke();}   // the steel deflector wedge
  if(k>0.01){c.save();c.beginPath();trenchPath(c,g,L);c.clip();
    let gr=c.createLinearGradient(0,0,0,yF);gr.addColorStop(0,`rgba(255,244,210,${0.95*k})`);gr.addColorStop(1,`rgba(255,170,70,${0.85*k})`);c.fillStyle=gr;c.fillRect(-tw/2,yF,tw,-yF);   // white-hot down the slot
    for(const sd of[-1,1]){gr=c.createLinearGradient(sd*tw/2,0,sd*xe,0);gr.addColorStop(0,`rgba(255,190,90,${0.85*k})`);gr.addColorStop(1,`rgba(255,110,35,${0.55*k})`);
      c.fillStyle=gr;c.fillRect(sd>0?tw/2:-tw/2-L,yF,L,th);
      for(let i=0;i<14;i++){const u=(now*1.4+i/14+(sd>0?0:0.03))%1,x=sd*(tw/2+u*(xe-tw/2)),y=ye;   // hot lumps rushing along the tunnel
        const rr=th*(0.55+0.25*Math.sin(i*2.7+now*9)),g2=c.createRadialGradient(x,y,0,x,y,rr);g2.addColorStop(0,`rgba(255,235,170,${0.6*k*(1-u*0.5)})`);g2.addColorStop(1,"rgba(255,140,40,0)");
        c.fillStyle=g2;c.fillRect(x-rr,y-rr,2*rr,2*rr);}}
    c.restore();}
  c.restore();
  // out of the tunnel mouths: fire and hot gas blasting out along the ground, curling up
  if(k>0.01)for(const sd of[-1,1]){const x0=sd*xe,w=th*0.5;for(let j=0;j<3;j++){const fl=0.85+0.3*Math.sin(now*(17+j*5)+j*2+sd),Lt=th*(2+j*1.1)*k*fl,ax=sd*1,ay=0.12+j*0.18,n=Math.hypot(ax,ay),dx=ax/n,dy=ay/n;
    const gr2=c.createLinearGradient(x0,ye,x0+dx*Lt,ye+dy*Lt);gr2.addColorStop(0,`rgba(255,225,150,${0.75*k})`);gr2.addColorStop(0.5,`rgba(255,140,50,${0.45*k})`);gr2.addColorStop(1,"rgba(255,90,30,0)");
    c.fillStyle=gr2;c.beginPath();c.moveTo(x0-w*dy,ye+w*dx);c.lineTo(x0+dx*Lt,ye+dy*Lt);c.lineTo(x0+w*dy,ye-w*dx);c.closePath();c.fill();}}}
// ================= clouds by altitude (phase 4) =================
// Three layers, like real weather: puffy cumulus at 1–3 km, flat stratus sheets at 4–8 km, thin wispy cirrus at 9–14 km; none
// higher. Each cloud has a depth d: 0 = level with the rocket (you can fly through it), > 0 = further away (drawn smaller and
// moving slower: parallax), < 0 = in front (bigger, faster, drawn over the rocket). Seeded per launch, so a retry looks the same.
function makeClouds(seed){const out=[],q=(i,k)=>hash1(seed*0.013+i*12.97+k*3.1),cl=wx.cl;
  const add=(n,kind,h0,h1,w0,w1,span)=>{for(let i=0;i<n;i++){const j=out.length+i*7.3;out.push({kind,a:(q(j,1)-0.5)*span,h:h0+q(j,2)*(h1-h0),w:w0+q(j,3)*(w1-w0),
    d:q(j,4)<0.18?-0.25:q(j,5)<0.45?0:0.4+q(j,6)*1.8,o:0.55+q(j,7)*0.4,s:q(j,8)});}};
  add(Math.round(70*cl),"cu",1000,3000,250,900,0.06);add(Math.round(18*Math.max(0.3,cl-0.3)),"st",4000,8000,2500,7000,0.08);add(Math.round(22*(0.5+cl*0.5)),"ci",9000,14000,1500,5000,0.1);
  return out;}
// draw one cloud (world coords, y up, already rotated to its spot). lc = light colour, dk = shadow colour, al = opacity
function drawCloud(c,cl,w,lc,dk,al){
  if(cl.kind==="cu"){for(let k=0;k<9;k++){const m=(k-4)/4,ox=m*w*0.42+(cl.s-0.5)*w*0.05*(k%3),hump=1-m*m,oy=w*(0.04+0.22*hump*(0.7+0.3*((k*7+cl.s*10)%3)/2)),rad=w*(0.12+0.12*hump);
      const g=c.createRadialGradient(ox,oy+rad*0.3,0,ox,oy,rad);g.addColorStop(0,`rgba(${lc},${al})`);g.addColorStop(0.7,`rgba(${lc},${al*0.75})`);g.addColorStop(1,`rgba(${lc},0)`);c.fillStyle=g;c.beginPath();c.arc(ox,oy,rad,0,6.2832);c.fill();}
    const g=c.createLinearGradient(0,0,0,w*0.15);g.addColorStop(0,`rgba(${dk},${al*0.3})`);g.addColorStop(1,`rgba(${dk},0)`);c.fillStyle=g;c.beginPath();c.ellipse(0,w*0.05,w*0.5,w*0.06,0,0,6.2832);c.fill();}   // soft grey flat base
  else if(cl.kind==="st"){const g=c.createLinearGradient(0,-w*0.04,0,w*0.05);g.addColorStop(0,`rgba(${dk},0)`);g.addColorStop(0.4,`rgba(${lc},${al*0.7})`);g.addColorStop(1,`rgba(${lc},0)`);
    c.fillStyle=g;c.beginPath();c.ellipse(0,0,w*0.5,w*0.05,0,0,6.2832);c.fill();}
  else{c.strokeStyle=`rgba(${lc},${al*0.45})`;c.lineWidth=w*0.012;c.lineCap="round";for(let k=0;k<5;k++){const y=(k-2)*w*0.025,x0=-w*0.5+k*w*0.05;c.beginPath();c.moveTo(x0,y);c.quadraticCurveTo(0,y+w*0.03*(k%2?1:-1),w*0.45-k*w*0.04,y-w*0.01);c.stroke();}c.lineCap="butt";}}
// how foggy it is right at the rocket: inside a cloud level with it (d = 0), thicker clouds fog more
function cloudFog(cls,x,y){let f=0;for(const cl of cls){if(cl.d!==0)continue;const cr=PR+cl.h,cx=Math.sin(cl.a)*cr,cy=Math.cos(cl.a)*cr,dx=x-cx,dy=y-cy,ux=cx/cr,uy=cy/cr,
    up=dx*ux+dy*uy,side=dx*uy-dy*ux,th=cl.kind==="cu"?cl.w*0.25:cl.kind==="st"?cl.w*0.05:cl.w*0.02,e=(side/(cl.w*0.5))**2+(up/th)**2;
    if(e<1)f=Math.max(f,(1-e)*(cl.kind==="cu"?0.9:cl.kind==="st"?0.75:0.25)*cl.o);}return f;}
