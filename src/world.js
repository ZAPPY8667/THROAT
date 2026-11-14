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
function terrH(s){s=wrapS(s);const k=s/1000;let i=0;while(i<TK.length-2&&TK[i+1][0]<=k)i++;
  const[a,ha]=TK[i],[b,hb]=TK[i+1],t=Math.max(0,Math.min(1,(k-a)/(b-a))),u=t*t*(3-2*t);let h=ha+(hb-ha)*u;
  const r=roughAt(s);   // hills and peaks on top of the big shape; none at the spaceport, the beaches or the sea floor
  if(r>0)h+=r*((vnoise(s/22000)-0.5)*1.4+(vnoise(s/3100+7)-0.5)*0.55+(vnoise(s/420+3)-0.5)*0.16+(vnoise(s/60+11)-0.5)*0.03)*(h>0?1:0);
  return h;}
// roughness fades in and out over 15 km at the edges of each biome, so the noise never makes a cliff
function roughAt(s){const k=wrapS(s)/1000;let r=0;for(const b of BIOMES){if(!b[5])continue;const d=Math.min(k-b[0],b[1]-k);if(d>-15)r=Math.max(r,b[5]*Math.max(0,Math.min(1,(d+15)/30)));}
  const nearPad=Math.min(k,6283.185-k);if(nearPad<8)r*=Math.max(0,(nearPad-3)/5);return r;}
// what a craft touching the ground at world point (x, y) stands on: height of the surface there, and whether it's water
function groundAt(body,x,y){if(body!==0)return{h:0,water:false};const th=terrH(Math.atan2(x,y)*PR);return{h:Math.max(0,th),water:th<0};}
// --- the spaceport: buildings at s (m, west is negative), width and height (m) ---
const PAD2=-2000;   // the landing zone: on land, 2 km west of the launch pad (the ocean is east)
const BLD=[{t:"mast",s:-95,w:3,h:120},{t:"mast",s:95,w:3,h:120},{t:"water",s:-300,w:22,h:55},{t:"tanks",s:-470,w:80,h:22},
  {t:"lcc",s:-1250,w:90,h:28},{t:"road",s:-3600,w:3500,h:0},{t:"hangar",s:-2160,w:70,h:30},{t:"vab",s:-3300,w:190,h:160},
  {t:"light",s:640,w:8,h:34},{t:"fuel",s:-160,w:30,h:14}];
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
  c.fillStyle="#3b3128";if(full){c.beginPath();c.arc(0,0,PR-3200,0,6.2832);c.fill();}
  c.beginPath();for(let i=0;i<=N;i++){const[x,y]=P(ang[i],PR+H[i]);i?c.lineTo(x,y):c.moveTo(x,y);}
  for(let i=N;i>=0;i-=Math.max(1,N>>6)){const[x,y]=P(ang[i],PR-3400);c.lineTo(x,y);}c.closePath();c.fill();
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
