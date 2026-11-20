// ================= MAP =================
// Earth's frame, seen from above. Drag to pan, wheel or pinch to zoom, focus on the ship, Earth or the Moon.
// Your path ahead is drawn leg by leg (gold around Earth, cyan around the Moon) with labelled points.
let predN=0,mapPtr=new Map(),mapPinch=null,mapDown=null;
const pfPos=v=>{if(v.body===0)return{x:v.x,y:v.y};const M=moonAt(FT);return{x:v.x+M.x,y:v.y+M.y};};
function focusPos(){const f=mapCam.focus;if(f==="earth")return{x:0,y:0};if(f==="moon")return moonAt(FT);return pfPos(AV);}
function mapFit(){const f=mapCam.focus;let ext;
  if(f==="moon")ext=AV.body===1?Math.max(RM*1.6,Math.min(SOI,(predC&&predC.legs[0]?predC.legs[0].el.ra:SOI)*1.15)):RM*5;
  else if(f==="earth"){const el=predC&&predC.legs[0]&&predC.legs[0].body===0?predC.legs[0].el:null;ext=el?Math.max(PR*1.3,Math.min(DM*1.15,(el.e<1?el.ra:DM)*1.12)):PR*1.3;
    if(predC&&predC.legs.length>1)ext=DM*1.2;}
  else ext=Math.max(2000,Math.hypot(AV.vx,AV.vy)*120);
  mapCam.s=Math.min(FW,FH)*0.45/ext;mapCam.dx=mapCam.dy=0;}
function mapOpen(){predC=null;if(!mapCam||mapCam.vid!==AV.id){mapCam={focus:AV.body===1?"moon":"earth",s:1,dx:0,dy:0,vid:AV.id};refreshPred();mapFit();}mapBarUI();}
function mapFocus(f){const order=["ship","earth","moon"];mapCam.focus=f||order[(order.indexOf(mapCam.focus)+1)%3];refreshPred();mapFit();mapBarUI();}
function mapBarUI(){document.querySelectorAll("#fMapBar [data-f]").forEach(b=>b.classList.toggle("on",mapCam&&b.dataset.f===mapCam.focus));}
document.querySelectorAll("#fMapBar [data-f]").forEach(b=>b.onclick=()=>mapFocus(b.dataset.f));
function refreshPred(){predC=AV&&!AV.crashed&&!AV.landed?predict(AV.body,AV.x,AV.y,AV.vx,AV.vy,FT):{legs:[],marks:[]};predC.T=FT;}
function mapWheel(e){const r=fcv.getBoundingClientRect(),X=(e.clientX-r.left)*FW/r.width,Y=(e.clientY-r.top)*FH/r.height;zoomAt(X,Y,e.deltaY<0?1.2:1/1.2);}
function zoomAt(X,Y,k){const F=focusPos(),s=mapCam.s,wx=F.x+mapCam.dx+(X-FW/2)/s,wy=F.y+mapCam.dy-(Y-FH/2)/s;
  const s2=Math.max(Math.min(FW,FH)/(DM*8),Math.min(Math.min(FW,FH)/20,s*k));mapCam.s=s2;mapCam.dx=wx-F.x-(X-FW/2)/s2;mapCam.dy=wy-F.y+(Y-FH/2)/s2;}
const evXY=e=>{const r=fcv.getBoundingClientRect();return{X:(e.clientX-r.left)*FW/r.width,Y:(e.clientY-r.top)*FH/r.height};};
fcv.addEventListener("pointerdown",e=>{if(!mapView)return;fcv.setPointerCapture(e.pointerId);const q=evXY(e);mapPtr.set(e.pointerId,q);
  if(mapPtr.size===2){const[a,b]=[...mapPtr.values()];mapPinch={d:Math.hypot(a.X-b.X,a.Y-b.Y),s:mapCam.s,X:(a.X+b.X)/2,Y:(a.Y+b.Y)/2};mapDown=null;return;}
  mapDown={X:q.X,Y:q.Y,dx:mapCam.dx,dy:mapCam.dy,moved:false};});
fcv.addEventListener("pointermove",e=>{if(!mapView||!mapPtr.has(e.pointerId))return;const q=evXY(e);mapPtr.set(e.pointerId,q);
  if(mapPinch&&mapPtr.size===2){const[a,b]=[...mapPtr.values()],d=Math.hypot(a.X-b.X,a.Y-b.Y),X=(a.X+b.X)/2,Y=(a.Y+b.Y)/2;
    mapCam.dx-=(X-mapPinch.X)/mapCam.s;mapCam.dy+=(Y-mapPinch.Y)/mapCam.s;mapPinch.X=X;mapPinch.Y=Y;   // two fingers moving together pan
    zoomAt(X,Y,mapPinch.s*(d/mapPinch.d)/mapCam.s);return;}
  if(!mapDown)return;if(Math.hypot(q.X-mapDown.X,q.Y-mapDown.Y)>4*FDS)mapDown.moved=true;
  if(mapDown.moved){mapCam.dx=mapDown.dx-(q.X-mapDown.X)/mapCam.s;mapCam.dy=mapDown.dy+(q.Y-mapDown.Y)/mapCam.s;}});
function mapUp(e){if(!mapView)return;mapPtr.delete(e.pointerId);if(mapPtr.size<2)mapPinch=null;const d=mapDown;mapDown=null;
  if(d&&!d.moved){const q=evXY(e),F=focusPos(),s=mapCam.s;   // click a craft to fly it
    let best=null,bd=16*FDS;for(const v of VS){if(!v.ctrl||v.crashed)continue;const p=pfPos(v),X=FW/2+(p.x-F.x-mapCam.dx)*s,Y=FH/2-(p.y-F.y-mapCam.dy)*s,dd=Math.hypot(X-q.X,Y-q.Y);if(dd<bd){bd=dd;best=v;}}
    if(best&&best!==AV){AV=best;anAV=null;mapCam.vid=AV.id;msg="Now flying: "+AV.name;msgT=2.5;refreshPred();}}}
// flight view: two fingers pinch the camera zoom (one finger does nothing here, so steering buttons stay the only controls)
const flyPtr=new Map();let flyPinch=null;
fcv.addEventListener("pointerdown",e=>{if(mapView)return;fcv.setPointerCapture(e.pointerId);flyPtr.set(e.pointerId,evXY(e));
  if(flyPtr.size===2){const[a,b]=[...flyPtr.values()];flyPinch={d:Math.hypot(a.X-b.X,a.Y-b.Y)||1,z:zoomF};}});
fcv.addEventListener("pointermove",e=>{if(mapView||!flyPtr.has(e.pointerId))return;flyPtr.set(e.pointerId,evXY(e));
  if(flyPinch&&flyPtr.size===2){const[a,b]=[...flyPtr.values()];zoomF=Math.max(0.05,Math.min(20000,flyPinch.z*Math.hypot(a.X-b.X,a.Y-b.Y)/flyPinch.d));}});
const flyUp=e=>{flyPtr.delete(e.pointerId);if(flyPtr.size<2)flyPinch=null;};
fcv.addEventListener("pointerup",flyUp);fcv.addEventListener("pointercancel",flyUp);
fcv.addEventListener("pointerup",mapUp);fcv.addEventListener("pointercancel",mapUp);
const tfmt=t=>{t=Math.max(0,t);if(t<60)return Math.round(t)+" s";const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);
  if(h>=24)return Math.floor(h/24)+"d "+(h%24)+"h";return h?`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`;};
const kmf=x=>Math.abs(x)>=1000?(x/1000).toFixed(Math.abs(x)>=1e5?0:1)+" km":Math.round(x)+" m";
function renderMap(c){
  if(!mapCam)mapOpen();
  if(!predC||++predN%(AV.F>0?3:12)===0||predC.body0!==AV.body){refreshPred();predC.body0=AV.body;}
  const dtP=FT-predC.T;   // the prediction's times count from when it was made
  const M=moonAt(FT),F=focusPos(),s=mapCam.s,ox=FW/2-(F.x+mapCam.dx)*s,oy=FH/2+(F.y+mapCam.dy)*s;
  c.setTransform(1,0,0,1,0,0);c.fillStyle="#03050b";c.fillRect(0,0,FW,FH);
  c.fillStyle="rgba(255,255,255,.5)";for(let i=0;i<220;i++){const sx=(i*9301+49297)%233280/233280*FW,sy=(i*4673+12345)%93179/93179*FH;c.fillRect(sx,sy,i%9?1:1.8,i%9?1:1.8);}
  c.setTransform(s,0,0,-s,ox,oy);const px=1/s;
  // the Moon's path and its sphere of influence
  c.strokeStyle="rgba(150,160,200,.22)";c.lineWidth=1.2*px*FDS;c.beginPath();c.arc(0,0,DM,0,6.2832);c.stroke();
  c.setLineDash([6*px*FDS,6*px*FDS]);c.strokeStyle="rgba(90,225,245,.25)";c.beginPath();c.arc(M.x,M.y,SOI,0,6.2832);c.stroke();c.setLineDash([]);
  // Earth with its air, the Moon
  const er=Math.max(PR,3*px*FDS),mr=Math.max(RM,3*px*FDS);
  let g=c.createRadialGradient(0,0,er,0,0,er+ATM_TOP*1.6);g.addColorStop(0,"rgba(90,160,255,.35)");g.addColorStop(1,"rgba(90,160,255,0)");c.fillStyle=g;c.beginPath();c.arc(0,0,er+ATM_TOP*1.6,0,6.2832);c.fill();
  // Earth as the game sees it: the sea is blue, and the land around the edge has the colour of its biome (the same planet as in flight);
  // the side away from the sun is in night
  // Earth: the painted globe (world.js), the same continents you see from orbit; the side away from the sun is in night
  drawGlobe(c,er,true);
  {const sg=sunAng(FT);c.fillStyle="rgba(2,6,18,.5)";c.beginPath();c.arc(0,0,er,-sg-Math.PI,-sg);c.closePath();c.fill();}
  const moonDisc=(x,y,al)=>{c.globalAlpha=al;const gg=c.createRadialGradient(x-mr*0.3,y+mr*0.3,mr*0.1,x,y,mr);gg.addColorStop(0,"#c9cbd1");gg.addColorStop(1,"#77797f");c.fillStyle=gg;c.beginPath();c.arc(x,y,mr,0,6.2832);c.fill();
    c.fillStyle="rgba(90,92,100,.5)";for(const[a,d,w]of[[0.5,0.4,0.18],[2.4,0.5,0.12],[4,0.3,0.22],[5.5,0.6,0.1]]){c.beginPath();c.arc(x+Math.cos(a)*mr*d,y+Math.sin(a)*mr*d,mr*w,0,6.2832);c.fill();}c.globalAlpha=1;};
  moonDisc(M.x,M.y,1);
  // launch pad on Earth
  c.fillStyle="#ffcf7a";c.beginPath();c.arc(0,PR,Math.max(400,2.5*px*FDS),0,6.2832);c.fill();
  // the path ahead
  const cols=["#ffcf7a","#5ae1f5","#c9a7ff"];
  predC.legs.forEach((L,i)=>{if(!L.pts.length)return;
    if(L.anchor&&L.anchor.ghost){moonDisc(L.anchor.x,L.anchor.y,0.35);}
    // a leg around the Moon that starts now moves with the Moon
    const sh=L.anchor&&!L.anchor.ghost?{x:M.x-L.anchor.x,y:M.y-L.anchor.y}:{x:0,y:0};
    c.strokeStyle=cols[Math.min(i,2)];c.lineWidth=2*px*FDS;c.globalAlpha=i?0.85:1;c.beginPath();
    const p0=L.pts[0];c.moveTo(p0[0]+sh.x,p0[1]+sh.y);for(let k=1;k<L.pts.length;k++)c.lineTo(L.pts[k][0]+sh.x,L.pts[k][1]+sh.y);c.stroke();c.globalAlpha=1;
    L.sh=sh;});
  // a planned burn (NODE): where it happens, and the path after it, dashed in red
  if(AP.node&&AP.node.pred){const N=AP.node;c.setLineDash([8*px*FDS,6*px*FDS]);c.strokeStyle="rgba(255,59,47,.9)";c.lineWidth=1.8*px*FDS;
    for(const L of N.pred.legs){if(!L.pts.length)continue;c.beginPath();c.moveTo(L.pts[0][0],L.pts[0][1]);for(let k=1;k<L.pts.length;k++)c.lineTo(L.pts[k][0],L.pts[k][1]);c.stroke();}c.setLineDash([]);
    const q=stateAt(AV,N.t),an=AV.body===1?moonAt(FT):{x:0,y:0};c.fillStyle="#ff3b2f";c.beginPath();c.arc(q.x+an.x,q.y+an.y,5*px*FDS,0,6.2832);c.fill();}
  // other craft, then yours
  for(const v of VS){if(v===AV||v.crashed||v.dockHost)continue;const p=pfPos(v);
    if(v.target){const d=5*px*FDS;c.fillStyle="#e8ecf4";c.strokeStyle="#000";c.lineWidth=1.2*px*FDS;c.beginPath();c.moveTo(p.x,p.y+d);c.lineTo(p.x+d,p.y);c.lineTo(p.x,p.y-d);c.lineTo(p.x-d,p.y);c.closePath();c.fill();c.stroke();continue;}   // practice target: a white diamond
    c.fillStyle=v.ctrl?"#5ae1f5":"#6d7590";c.beginPath();c.arc(p.x,p.y,(v.ctrl?3.5:2.5)*px*FDS,0,6.2832);c.fill();}
  const ap=pfPos(AV);c.save();c.translate(ap.x,ap.y);c.rotate(-AV.phi);c.fillStyle="#fff";c.strokeStyle="#000";c.lineWidth=1.5*px*FDS;c.beginPath();
  c.moveTo(0,11*px*FDS);c.lineTo(-6.5*px*FDS,-7*px*FDS);c.lineTo(6.5*px*FDS,-7*px*FDS);c.closePath();c.fill();c.stroke();c.restore();
  // labels, in screen space
  c.setTransform(1,0,0,1,0,0);const SX=x=>ox+x*s,SY=y=>oy-y*s,fs=12*FDS;c.font=`700 ${fs}px ${MONO}`;c.textBaseline="middle";
  const placed=[];
  for(const v of VS)if(v.target&&!v.crashed&&!v.dockHost){const p=pfPos(v),X=SX(p.x),Y=SY(p.y);if(X<-50||Y<-20||X>FW+50||Y>FH+20)continue;   // practice targets: their names
    c.fillStyle="#c5cbe0";c.textAlign="left";c.font=`600 ${fs*0.85}px ${MONO}`;c.fillText(v.name.replace(/^Target (.*)$/,"$1 target"),X+9*FDS,Y);c.font=`700 ${fs}px ${MONO}`;}
  const tag=(x,y,col,l1,l2)=>{const X=SX(x),Y=SY(y);if(X<-50||X>FW+50||Y<-50||Y>FH+50)return;c.fillStyle=col;c.beginPath();c.arc(X,Y,4.5*FDS,0,6.2832);c.fill();
    const w=Math.max(c.measureText(l1).width,l2?c.measureText(l2).width:0)+12*FDS,h=(l2?2.2:1.3)*fs+4*FDS;let bx=X+9*FDS,by=Y-h-4*FDS;
    for(let k=0;k<6&&placed.some(q=>bx<q[0]+q[2]&&bx+w>q[0]&&by<q[1]+q[3]&&by+h>q[1]);k++)by+=h+3*FDS;   // don't stack labels on top of each other
    placed.push([bx,by,w,h]);if(Math.abs(by-(Y-h-4*FDS))>1){c.strokeStyle=col;c.globalAlpha=0.5;c.beginPath();c.moveTo(X,Y);c.lineTo(bx,by+h/2);c.stroke();c.globalAlpha=1;}
    c.fillStyle="rgba(6,9,20,.82)";c.fillRect(bx,by,w,h);c.strokeStyle=col;c.lineWidth=1;c.strokeRect(bx+0.5,by+0.5,w-1,h-1);
    c.fillStyle=col;c.fillText(l1,bx+6*FDS,by+fs*0.75+2*FDS);if(l2){c.fillStyle="#c5cbe0";c.fillText(l2,bx+6*FDS,by+fs*1.85+2*FDS);}};
  for(const m of predC.marks){const L=predC.legs.find(l=>l.body===(m.body!=null?m.body:-1)&&l.anchor&&!l.anchor.ghost),sh=m.body===1&&L?L.sh:{x:0,y:0},t=m.t-dtP;
    if(t<-1)continue;const T="T−"+tfmt(t);
    if(m.k==="ap")tag(m.x+sh.x,m.y+sh.y,m.body?"#5ae1f5":"#ffcf7a",(m.body?"Moon Ap ":"Ap ")+kmf(m.alt),T);
    else if(m.k==="pe")tag(m.x+sh.x,m.y+sh.y,m.body?"#5ae1f5":"#ffcf7a",(m.body?"Moon Pe ":"Pe ")+kmf(m.alt),T);
    else if(m.k==="enter")tag(m.x,m.y,"#5ae1f5","Moon encounter",T);
    else if(m.k==="leave")tag(m.x+sh.x,m.y+sh.y,"#c9a7ff","Leaving the Moon",T);
    else if(m.k==="impact")tag(m.x+(m.body===1?sh.x:0),m.y+(m.body===1?sh.y:0),"#ff6a4d",m.body===1?"Moon impact":"Impact",T);}
  c.fillStyle="#9aa3c0";c.font=`600 ${11*FDS}px ${MONO}`;
  for(const[x,y,n,r]of[[0,0,"EARTH",er],[M.x,M.y,"MOON",mr]]){const X=SX(x),Y=SY(y)+r*s+12*FDS;c.textAlign="center";c.fillText(n,X,Math.min(FH-8,Y));}
  c.textAlign="left";c.textBaseline="alphabetic";
  c.fillStyle="#8a94b4";c.textAlign="center";c.fillText("drag to pan · wheel / pinch to zoom · F changes focus · click a craft to fly it · M to go back",FW/2,FH-(FW<760*FDS?150:66)*FDS);c.textAlign="left";}
