// ================= VEHICLE EDITOR =================
const VKEY="throat.vab.v1",VLIB="throat.vehicles.v1";
const vab=$("vab"),vcv=$("vcv"),vx=vcv.getContext("2d");
let VW=1280,VH=720,VDS=1,vps=store.get(VKEY,null),vsel=null,vMirror=store.get("throat.vmirror",true),vU=[],vR=[],vv={s:1,ox:0,oy:0};
let vLegsOut=false,vdrag=null,vcarry=null,vptr={X:0,Y:0},vpan=null,vAn=null,vMsgT=0,vName=store.get("throat.vname","Orbiter"),vTouch=new Map(),vPinch=null;
if(!Array.isArray(vps)||!vps.length)vps=tpl("orbiter");partId=Math.max(partId,...vps.map(p=>p.id+1));
const vSave=()=>{store.set(VKEY,vps);store.set("throat.vname",vName);};
function vFitC(){const r=vcv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);VW=Math.max(320,Math.round(r.width*d));VH=Math.max(240,Math.round(r.height*d));if(vcv.width!==VW||vcv.height!==VH){vcv.width=VW;vcv.height=VH;}VDS=d;}
function vBox(ps){let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of ps){a=Math.min(a,p.x-p.w/2);b=Math.max(b,p.x+p.w/2);c=Math.min(c,p.y);d=Math.max(d,p.y+p.h);}return ps.length?{x0:a,x1:b,y0:c,y1:d}:{x0:-60,x1:60,y0:0,y1:300};}
function vFitView(){vFitC();const b=vBox(vps),w=Math.max(200,b.x1-b.x0),h=Math.max(250,b.y1-b.y0),narrow=VW<760*VDS;
  vv.s=Math.min(VH*(narrow?0.5:0.62)/h,VW*(narrow?0.45:0.36)/w,4*VDS);vv.ox=VW*(narrow?0.3:0.47)-vv.s*(b.x0+b.x1)/2;vv.oy=VH*(narrow?0.5:0.55)+vv.s*(b.y0+b.y1)/2;}
const v2w=(X,Y)=>({x:(X-vv.ox)/vv.s,y:(vv.oy-Y)/vv.s});
function vEvXY(e){const r=vcv.getBoundingClientRect();return{X:(e.clientX-r.left)*VW/r.width,Y:(e.clientY-r.top)*VH/r.height};}
const vAxis=()=>{const r=rootIdx(vps);return r<0?0:vps[r].x;};
const vSnap=()=>JSON.stringify(vps);
function vPush(){vU.push(vSnap());if(vU.length>80)vU.shift();vR=[];}
function vUndo(){if(!vU.length)return;vR.push(vSnap());vps=JSON.parse(vU.pop());vsel=null;vChanged();}
function vRedo(){if(!vR.length)return;vU.push(vSnap());vps=JSON.parse(vR.pop());vsel=null;vChanged();}
function vChanged(){vSave();vAn=null;vInspUI();}
function vMsg(t){$("vMsg").textContent=t;$("vMsg").style.display="";vMsgT=performance.now()+3200;}
// ---------- snapping ----------
function alignX(px,pw,dw){const lim=(pw-dw)/2;if(lim<1)return[px];const out=[px,px-lim,px+lim];for(let k=-lim;k<=lim+0.01;k+=15)out.push(px+k);return out;}
function sideYs(P,D,dy){const lo=P.y-D.h+5,hi=P.y+P.h-5,out=[P.y,P.y+P.h-D.h,P.y+(P.h-D.h)/2];const g=Math.round(dy/5)*5;if(g>=lo&&g<=hi)out.push(g);return out.filter(v=>v>=lo-0.01&&v<=hi+0.01);}
function snapPart(D,dx,dy,O,rad){let best=null,bd=rad;const R=isRad(D);
  const tryC=(x,y,f)=>{const d=Math.hypot(x-dx,y-dy);if(d>=bd)return;const t={...D,x,y};for(const o of O)if(collide(t,o))return;bd=d;best={x,y,f};};
  for(const P of O){const PRd=isRad(P);
    if(!R&&!PRd){const ts=topW(P);if(ts>0)for(const x of alignX(P.x,ts,D.w))tryC(x,P.y+P.h,D.f);
      const ds=topW(D);if(ds>0)for(const x of alignX(P.x,P.w,ds))tryC(x,P.y-D.h,D.f);}
    if((R&&!PRd)||(P.t==="sdec"&&!R))for(const s of[-1,1]){if(P.t==="sdec"&&s!==P.f)continue;const x=P.x+s*(P.w+D.w)/2;for(const y of sideYs(P,D,dy))tryC(x,y,R?s:D.f);}}
  return best;}
// ---------- parts tree: what moves with what ----------
function vTree(){const adj=adjOf(vps),r=rootIdx(vps),par=new Array(vps.length).fill(-2);
  if(r>=0){par[r]=-1;const q=[r];while(q.length){const i=q.shift();for(const j of adj[i])if(par[j]===-2){par[j]=i;q.push(j);}}}
  return{adj,r,par};}
function vSub(i,alt,T){T=T||vTree();if(alt)return new Set([i]);
  if(T.par[i]===-2)return bfs(T.adj,i,j=>T.par[j]===-2);           // loose: drag its whole clump
  const out=new Set([i]);let grew=true;while(grew){grew=false;vps.forEach((p,j)=>{if(!out.has(j)&&T.par[j]>=0&&out.has(T.par[j])){out.add(j);grew=true;}});}return out;}
const vById=id=>vps.findIndex(p=>p.id===id);
// ---------- placing, moving, deleting ----------
function vPlace(p){const ax=vAxis();let snap=vps.length?snapPart(p,p.x,p.y,vps,34/vv.s*VDS):{x:ax,y:0,f:p.f};
  if(!snap){p.x=Math.round(p.x/5)*5;p.y=Math.round(p.y/5)*5;if(vps.some(o=>collide(p,o))){vMsg("It overlaps another part.");return false;}}
  else{p.x=snap.x;p.y=snap.y;p.f=snap.f;}
  vPush();vps.push(p);
  if(vMirror&&Math.abs(p.x-ax)>0.5){const t={...p,id:partId++,x:2*ax-p.x,f:-p.f};if(!vps.some(o=>collide(t,o))){t.tw=p.id;p.tw=t.id;vps.push(t);}else vMsg("The mirror copy didn't fit, so only one was placed.");}
  vsel=p.id;vChanged();return true;}
function vDelete(i){if(i<0)return;const p=vps[i],tw=p.tw?vById(p.tw):-1;vPush();vps=vps.filter((q,j)=>j!==i&&j!==tw);vsel=null;vChanged();}
function vResize(i,w,h,mut){const p=vps[i];if(!p)return;const before=vSnap();
  const one=(k,mir)=>{const q=vps[k],T=vTree(),dw=w-q.w,dh=h-q.h,top=q.y+q.h;
    const above=new Set(),L=new Set(),Rr=new Set();
    T.adj[k].forEach(j=>{const o=vps[j];if(near(o.y,top))above.add(j);else if(near(o.x-o.w/2,q.x+q.w/2))Rr.add(j);else if(near(o.x+o.w/2,q.x-q.w/2))L.add(j);});
    const grow=s=>{const out=new Set(s);let g=true;while(g){g=false;for(const a of[...out])for(const b of T.adj[a])if(b!==k&&!out.has(b)){out.add(b);g=true;}}return out;};
    const A=grow(above),RR=grow(Rr),LL=grow(L);
    A.forEach(j=>{vps[j].y+=dh;});RR.forEach(j=>{if(!A.has(j))vps[j].x+=dw/2;});LL.forEach(j=>{if(!A.has(j))vps[j].x-=dw/2;});q.w=w;q.h=h;};
  const oW=p.w,oH=p.h,oE=p.e;if(mut)mut(p);one(i);const tw=p.tw?vById(p.tw):-1;if(tw>=0&&tw!==i&&vps[tw].w===oW&&vps[tw].h===oH&&vps[tw].t===p.t&&vps[tw].e===oE){if(mut)mut(vps[tw]);one(tw);}
  for(let a=0;a<vps.length;a++)for(let b=a+1;b<vps.length;b++)if(collide(vps[a],vps[b])){vps=JSON.parse(before);vMsg("That doesn't fit: it would bump into another part.");vChanged();return;}
  vU.push(before);vR=[];vChanged();}
// ---------- pointer ----------
function vHit(x,y){for(let i=vps.length-1;i>=0;i--){const p=vps[i];if(x>=p.x-p.w/2-3&&x<=p.x+p.w/2+3&&y>=p.y-3&&y<=p.y+p.h+3)return i;}return -1;}
const overPal=e=>{const el=document.elementFromPoint(e.clientX,e.clientY);return !!(el&&el.closest&&el.closest("#vPal"));};
const overCv=e=>document.elementFromPoint(e.clientX,e.clientY)===vcv;
function vCarryMove(e){const q=vEvXY(e),w=v2w(q.X,q.Y),p=vcarry.p;p.x=w.x;p.y=w.y-p.h/2;vptr=q;
  const s=vps.length?snapPart(p,p.x,p.y,vps,34/vv.s*VDS):{x:vAxis(),y:0,f:p.f};vcarry.snap=s;}
// "lib:<id>" = something from the engine library; the part gets its own copy of the numbers
function libPart(e){return mkPart(e.kind==="solid"?"srb:lib":"engine:lib",0,0,null,libNums(e));}
function newPart(t){if(t.startsWith("lib:")){const e=libGet(t.slice(4));return e?libPart(e):mkPart("engine");}return mkPart(t);}
function startCarry(t,e){if(e)e.preventDefault();vcarry={p:newPart(t),snap:null,fresh:true};vsel=null;vInspUI();if(e&&e.clientX!=null)vCarryMove(e);}
window.addEventListener("pointermove",e=>{if(!vab.classList.contains("show"))return;if(vcarry){vCarryMove(e);vcarry.inside=overCv(e);}});
window.addEventListener("pointerup",e=>{if(!vab.classList.contains("show")||!vcarry||!vcarry.fresh)return;vcarry.fresh=false;
  if(overCv(e)){vCarryMove(e);if(vPlace(vcarry.p))vcarry=null;}else if(!overPal(e))vcarry=null;});
vcv.addEventListener("pointerdown",e=>{e.preventDefault();vcv.setPointerCapture(e.pointerId);const q=vEvXY(e),w=v2w(q.X,q.Y);vTouch.set(e.pointerId,q);
  if(vTouch.size===2){vdrag=null;const[a,b]=[...vTouch.values()];vPinch={d:Math.hypot(a.X-b.X,a.Y-b.Y),s:vv.s,ox:vv.ox,oy:vv.oy,cx:(a.X+b.X)/2,cy:(a.Y+b.Y)/2};return;}
  if(e.button===2){if(vcarry){vcarry=null;return;}}
  if(vcarry&&!vcarry.fresh){vCarryMove(e);if(vPlace(vcarry.p))vcarry=null;return;}
  if(e.button===1||e.altKey&&e.shiftKey){vpan={X:q.X,Y:q.Y,ox:vv.ox,oy:vv.oy};return;}
  const i=vHit(w.x,w.y);
  if(i<0){vsel=null;vInspUI();vpan={X:q.X,Y:q.Y,ox:vv.ox,oy:vv.oy};return;}
  vsel=vps[i].id;vInspUI();const T=vTree(),set=vSub(i,e.altKey,T),p=vps[i],ti=p.tw?vById(p.tw):-1;
  const tset=ti>=0&&!set.has(ti)?vSub(ti,e.altKey,T):new Set();
  vdrag={i,set,tset,w0:w,start:vps.map(o=>[o.x,o.y,o.f]),moved:false,before:vSnap(),bad:false};});
vcv.addEventListener("pointermove",e=>{const q=vEvXY(e);vptr=q;if(vTouch.has(e.pointerId))vTouch.set(e.pointerId,q);
  if(vPinch&&vTouch.size===2){const[a,b]=[...vTouch.values()],d=Math.hypot(a.X-b.X,a.Y-b.Y),k=Math.max(0.2,Math.min(8,d/vPinch.d));vv.s=vPinch.s*k;vv.ox=vPinch.cx-(vPinch.cx-vPinch.ox)*k;vv.oy=vPinch.cy-(vPinch.cy-vPinch.oy)*k;return;}
  if(vpan){vv.ox=vpan.ox+q.X-vpan.X;vv.oy=vpan.oy+q.Y-vpan.Y;return;}
  if(!vdrag)return;const w=v2w(q.X,q.Y);if(!vdrag.moved&&Math.hypot(w.x-vdrag.w0.x,w.y-vdrag.w0.y)*vv.s<5*VDS)return;vdrag.moved=true;
  const{i,set,tset,start}=vdrag,p=vps[i],O=vps.filter((o,j)=>!set.has(j)&&!tset.has(j));
  const dx0=start[i][0]+w.x-vdrag.w0.x,dy0=start[i][1]+w.y-vdrag.w0.y,sn=O.length?snapPart({...p,f:start[i][2]},dx0,dy0,O,34/vv.s*VDS):null;
  const nx=sn?sn.x:Math.round(dx0/5)*5,ny=sn?sn.y:Math.round(dy0/5)*5,ddx=nx-start[i][0],ddy=ny-start[i][1];
  const ax=vAxis();vdrag.dropTwin=tset.size>0&&Math.abs(nx-ax)<0.5;
  set.forEach(j=>{vps[j].x=start[j][0]+ddx;vps[j].y=start[j][1]+ddy;});tset.forEach(j=>{if(vdrag.dropTwin){vps[j].x=start[j][0];vps[j].y=start[j][1];}else{vps[j].x=start[j][0]-ddx;vps[j].y=start[j][1]+ddy;}});
  if(sn&&isRad(p)){p.f=sn.f;const ti=p.tw?vById(p.tw):-1;if(ti>=0&&tset.has(ti))vps[ti].f=-sn.f;}
  const M=vdrag.dropTwin?[...set]:[...set,...tset];vdrag.bad=M.some(a=>O.some(o=>collide(vps[a],o)))||(!vdrag.dropTwin&&[...set].some(a=>[...tset].some(b=>collide(vps[a],vps[b]))));});
function vUp(e){vTouch.delete(e.pointerId);if(vTouch.size<2)vPinch=null;vpan=null;if(!vdrag)return;const d=vdrag;vdrag=null;if(!d.moved)return;
  if(overPal(e)){const del=new Set([...d.set,...d.tset]);vps.forEach((o,j)=>{o.x=d.start[j][0];o.y=d.start[j][1];o.f=d.start[j][2];});vPush();vps=vps.filter((o,j)=>!del.has(j));vsel=null;vChanged();return;}
  if(d.bad){vps.forEach((o,j)=>{o.x=d.start[j][0];o.y=d.start[j][1];o.f=d.start[j][2];});vMsg("It overlaps another part, so it went back.");return;}
  if(d.dropTwin){const gone=new Set([...d.tset].map(j=>vps[j].id));vps=vps.filter(o=>!gone.has(o.id));for(const o of vps)if(gone.has(o.tw))o.tw=0;vMsg("Moved onto the centre line, so the mirror copy was removed.");}
  vU.push(d.before);vR=[];vChanged();}
vcv.addEventListener("pointerup",vUp);vcv.addEventListener("pointercancel",vUp);vcv.addEventListener("contextmenu",e=>e.preventDefault());
vcv.addEventListener("wheel",e=>{e.preventDefault();const i=vsel?vById(vsel):-1;
  if(e.shiftKey&&i>=0&&hasProp(vps[i])){const p=vps[i],h=Math.max(20,Math.min(900,p.h+(e.deltaY<0?10:-10)));if(h!==p.h)vResize(i,p.w,h);return;}
  if((e.ctrlKey||e.metaKey)&&i>=0&&canWiden(vps[i])){vWiden(i,e.deltaY<0?2:-2);return;}
  const q=vEvXY(e),k=e.deltaY<0?1.15:1/1.15,s2=Math.max(0.15*VDS,Math.min(12*VDS,vv.s*k)),kk=s2/vv.s;vv.ox=q.X-(q.X-vv.ox)*kk;vv.oy=q.Y-(q.Y-vv.oy)*kk;vv.s=s2;},{passive:false});
// ---------- keys (while the editor is open, the sandbox doesn't hear them) ----------
addEventListener("keydown",e=>{if(!vab.classList.contains("show"))return;const tg=e.target.tagName;if(tg==="INPUT"||tg==="SELECT")return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){e.shiftKey?vRedo():vUndo();e.preventDefault();}
  else if((e.ctrlKey||e.metaKey)&&k==="y"){vRedo();e.preventDefault();}
  else if(k==="delete"||k==="backspace"){if(vsel)vDelete(vById(vsel));e.preventDefault();}
  else if(k==="escape"){if(vcarry)vcarry=null;else if(vsel){vsel=null;vInspUI();}}
  else if(k==="m"){vMirror=!vMirror;store.set("throat.vmirror",vMirror);vBarUI();}
  else if(k==="f"){vFitView();}
  else if(k==="c"&&!e.ctrlKey&&!e.metaKey){vCentres=!vCentres;store.set("throat.vcentres",vCentres);vBarUI();}
  else if(k==="enter"){$("vGo").click();}
  else if(k==="-"||k==="="||k==="+"){const i=vsel?vById(vsel):-1;if(i>=0&&hasProp(vps[i])){const p=vps[i];vResize(i,p.w,Math.max(20,Math.min(900,p.h+(k==="-"?-10:10))));}}
  else if(k==="["||k==="]"){const i=vsel?vById(vsel):-1;if(i>=0&&canWiden(vps[i]))vWiden(i,k==="]"?2:-2);}
  e.stopImmediatePropagation();},true);
// ---------- panels ----------
function partIcon(t){const c=document.createElement("canvas");c.width=c.height=88;const g=c.getContext("2d"),p=newPart(t);partId--;
  if(t==="tank")p.h=90;const sc=Math.min(70/p.w,70/p.h,1.4);g.setTransform(sc,0,0,-sc,44,44+sc*p.h/2);p.x=0;p.y=0;drawPart(g,p,{legs:false});return c;}
function vPalUI(){const box=$("vParts");box.innerHTML="";
  const item=(t,name,desc,cls)=>{const b=document.createElement("button");b.className="vpart"+cls;b.title=desc;
    b.appendChild(partIcon(t));const s=document.createElement("span");s.textContent=name;b.appendChild(s);
    b.addEventListener("pointerdown",e=>{startCarry(t,e);});box.appendChild(b);};
  for(const t of PT_ORDER){const ek=t.startsWith("engine:")?t.slice(7).split(":"):null,en=ek?ENG[ek[0]]:t.startsWith("srb:")?BOOST[t.slice(4)]:null,cl=ek&&ek[1];
    item(t,cl?"Engine cluster":en?en.name:PT[t].name,cl?`${ek[1]} engines side by side under one thrust plate (like SLS). Pick the count and type in its settings.`:en?en.desc:PT[t].desc,en?" veng":"");}
  for(const e of libAll())item("lib:"+e.id,e.name,`From your engine library (${e.kind==="solid"?"solid booster":"engine"}). Sea level ${(e.sl.F/1000).toFixed(2)} kN, ${Math.round(e.sl.isp)} s.`," vlib");}
// free width: every part in the stack can be any width in its range. Nose cones, probes and engines keep their shape
// (height grows with width); tanks, boosters, decouplers and adapters keep their length.
const canWiden=p=>!!(PT[p.t].wr);
function vWiden(i,dw){const p=vps[i],r=PT[p.t].wr,w=Math.max(r[0],Math.min(r[1],p.w+dw));if(w===p.w)return;
  const keepShape=p.t==="nose"||p.t==="probe"||p.t==="capsule"||p.t==="les"||p.t==="engine";vResize(i,w,p.t==="engine"?engH({t:"engine",e:p.e,w,k:p.k}):keepShape?Math.max(4,Math.round(p.h*w/p.w)):p.h,q=>{if(q.t==="adapter"&&q.w2>=w)q.w2=w-2;});}
function vInspUI(){const el=$("vInsp"),i=vsel?vById(vsel):-1;if(i<0){el.style.display="none";return;}const p=vps[i],d=PT[p.t];el.style.display="";
  const cap=capOf(p),isE=p.t==="engine",isS=p.t==="srb",E=isE||isS?engStat(p):null,lib=libAll();
  let h=`<div class="ih"><b>${partName(p)}</b><span class="tip">${fM(partMass(p)+cap)}${cap?` (${fM(cap)} propellant)`:""}</span></div><div class="tip">${isE?ENG[engKey(p)].desc:isS?BOOST[boostKey(p)].desc:d.desc}</div>`;
  if(isS){const B=E,k=boostKey(p),bt=cap*B.sl.isp*G0/B.sl.F;
    h+=`<div class="tip" style="margin-top:4px">Sea level <b>${fF(B.sl.F)} · ${Math.round(B.sl.isp)} s</b>${B.sl.est?" (est.)":""}<br>Vacuum <b>${fF(B.vac.F)} · ${Math.round(B.vac.isp)} s</b>${B.vac.est?" (est.)":""}<br>Burns about <b>${Math.round(bt)} s</b> ${curveSvg(B.curve)}${k==="stand"?`<br>${B.src==="tested"?"From your last booster burn on the test stand.":"Not burned yet: these are the Thumper's numbers until you fire a booster on the test stand."}`:""}</div>
    <div class="row" style="margin-top:6px;gap:4px;flex-wrap:wrap"><button class="b${k==="stand"?" on":""}" data-bo="stand">Your booster</button><button class="b${k==="thumper"?" on":""}" data-bo="thumper">Thumper</button>${lib.filter(e=>e.kind==="solid").map(e=>`<button class="b${k==="lib"&&p.n&&p.n.name===e.name?" on":""}" data-bo="${e.id}"></button>`).join("")}</div>`;}
  if(isE)h+=`<div class="tip" style="margin-top:4px">Sea level <b>${fF(E.sl.F)} · ${Math.round(E.sl.isp)} s</b>${E.sl.est?" (est.)":""}<br>Vacuum <b>${fF(E.vac.F)} · ${Math.round(E.vac.isp)} s</b>${E.vac.est?" (est.)":""}${engKey(p)==="stand"?`<br>${E.src==="tested"?"From your test stand runs.":"Not tested yet: fire your engine on the stand to record its real numbers."}`:""}</div>
    <div class="row" style="margin-top:6px;gap:4px;flex-wrap:wrap">${ENG_ORDER.map(k=>`<button class="b${engKey(p)===k?" on":""}" data-e="${k}">${ENG[k].name}</button>`).join("")}${lib.filter(e=>e.kind!=="solid").map(e=>`<button class="b${engKey(p)==="lib"&&p.n&&p.n.name===e.name?" on":""}" data-le="${e.id}"></button>`).join("")}</div>`;
  if(p.t==="engine")h+=`<div class="row" style="margin-top:6px;gap:4px;align-items:center"><span class="tip">Engines</span><button class="b" data-k="-1">−</button><b style="min-width:18px;text-align:center">${p.k||1}</b><button class="b" data-k="1">+</button><span class="tip">side by side under one thrust plate (SLS 4, New Glenn 7, Falcon 9 9)</span></div>`;
  if(p.t==="nose")h+=`<div class="row" style="margin-top:6px;gap:4px"><button class="b${p.ns!=="cone"?" on":""}" data-ns="ogive">Rounded</button><button class="b${p.ns==="cone"?" on":""}" data-ns="cone">Pointed</button></div>`;
  if(p.t==="tank")h+=`<div class="row" style="margin-top:6px;gap:4px;flex-wrap:wrap">${TANK_SKINS.map(([k,n])=>`<button class="b${tankSkin(p)===k?" on":""}" data-sk="${k}">${n}</button>`).join("")}</div>`;
  if(p.t==="leg")h+=`<div class="row" style="margin-top:6px"><button class="b${vLegsOut?" on":""}" data-legs="1">${vLegsOut?"Show folded":"Show deployed"}</button></div>`;
  h+=`<div class="row" style="margin-top:6px;gap:5px;flex-wrap:wrap">`;
  if(canWiden(p))h+=`<button class="b" data-dw="-4">− Narrower</button><button class="b" data-dw="4">+ Wider</button><span class="tip">${(p.w*UM).toFixed(1)} m wide</span>`;
  if(p.t==="adapter")h+=`<button class="b" data-tw="-4">− Top</button><button class="b" data-tw="4">+ Top</button><span class="tip">top ${(topW(p)*UM).toFixed(1)} m</span>`;
  if(hasProp(p))h+=`<button class="b" data-l="-20">− Shorter</button><button class="b" data-l="20">+ Longer</button><span class="tip">${(p.h*UM).toFixed(0)} m long</span>`;
  h+=`<button class="b" data-del="1" style="margin-left:auto">${ico("trash")}Remove</button></div>`;el.innerHTML=h;
  el.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{const w=+b.dataset.w;vResize(i,w,p.t==="nose"?w:p.h);});
  el.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{vResize(i,p.w,Math.max(20,Math.min(900,p.h+ +b.dataset.l)));});
  el.querySelectorAll("[data-dw]").forEach(b=>b.onclick=()=>vWiden(i,+b.dataset.dw));
  el.querySelectorAll("[data-tw]").forEach(b=>b.onclick=()=>vResize(i,p.w,p.h,q=>{q.w2=Math.max(8,Math.min(q.w-2,topW(q)+ +b.dataset.tw));}));
  el.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{const k=b.dataset.e;vResize(i,p.w,engH({t:"engine",e:k,w:p.w,k:p.k}),q=>{q.e=k;delete q.n;});});   // keep the size (and count), change the model
  // saved names go in as text, not HTML
  el.querySelectorAll("[data-le]").forEach(b=>{const e=libGet(b.dataset.le);b.textContent=e?e.name:"?";b.onclick=()=>{if(e)vResize(i,ENG.lib.w,ENG.lib.h,q=>{q.e="lib";q.n=libNums(e);});};});
  el.querySelectorAll("[data-bo]").forEach(b=>{const k=b.dataset.bo,e=BOOST[k]?null:libGet(k);if(e)b.textContent=e.name;
    b.onclick=()=>vResize(i,p.w,p.h,q=>{if(e){q.b="lib";q.n=libNums(e);}else{q.b=k;delete q.n;}});});
  el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=Math.max(1,Math.min(9,(p.k||1)+ +b.dataset.k));if(k===(p.k||1))return;const E=ENG[engKey(p)],w=k===1?E.w:Math.max(p.w,Math.round(E.w*(k<=3?k:Math.ceil(k/2))*1.05));
    vResize(i,w,engH({t:"engine",e:p.e,w,k}),q=>{q.k=k;});});   // more engines: the plate gets wider so they fit
  el.querySelectorAll("[data-ns]").forEach(b=>b.onclick=()=>vResize(i,p.w,p.h,q=>{q.ns=b.dataset.ns;}));
  el.querySelectorAll("[data-sk]").forEach(b=>b.onclick=()=>vResize(i,p.w,p.h,q=>{q.sk=b.dataset.sk;}));   // finish only changes the look
  el.querySelectorAll("[data-legs]").forEach(b=>b.onclick=()=>{vLegsOut=!vLegsOut;vBarUI();vInspUI();});
  el.querySelector("[data-del]").onclick=()=>vDelete(i);}
function vStatsUI(){const a=vAn||(vAn=analyze(vps,engineNums()));const st=a.stages;
  let h=`<div class="read" style="grid-template-columns:auto 1fr auto 1fr"><span>Mass</span><b data-r="m" data-v="${a.mass}" data-u="mass"></b><span>Height</span><b>${a.H.toFixed(1)} m</b></div>`;
  if(st.length){h+=`<div class="vst">`;st.forEach((s,k)=>{h+=`<div class="sr"><b>Stage ${k+1}</b><span>Δv <b data-r="s${k}" data-v="${s.dv}"></b> m/s</span><span>TWR <b class="${s.twr>(k?0.5:1.1)?"ok":"bad"}">${s.twr.toFixed(2)}</b></span><i>${s.eng} engine${s.eng===1?"":"s"} · burns ${Math.round(s.burn)} s</i></div>`;
    if(s.dropKind)h+=`<div class="vsep">Space → drop ${s.dropKind==="boosters"?"the side boosters":"stage "+(k+1)}</div>`;});
    h+=`</div><div class="read" style="grid-template-columns:auto 1fr"><span>Total Δv</span><b data-r="t" data-v="${a.total}" data-u=" m/s"></b></div><div class="tip">Orbit takes about 2,300 m/s. TWR above 1 to lift off.</div>`;}
  for(const w of a.warn)h+=`<div class="warn">⚠ ${w}</div>`;
  if(st.length&&st[0].twr<=1)h+=`<div class="warn">⚠ Too heavy to lift off: add engines or use less fuel.</div>`;
  {const cn=centres(vps);if(cn&&cn.col&&a.root>=0&&cn.col[1]>cn.com[1]+5)h+=`<div class="warn">⚠ The centre of lift (blue) is above the centre of mass (yellow): in the air it will want to flip. Add fins low down, or put heavy parts higher. C shows the markers.</div>`;}
  const el=$("vStats");if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;
    for(const b of el.querySelectorAll("[data-r]")){const u=b.dataset.u||"";roll("vs"+b.dataset.r,b,+b.dataset.v,u==="mass"?fM:x=>fmt(x)+u);}}   // numbers roll to their new values
  const go=$("vGo"),ok=a.root>=0&&st.length&&st[0].twr>1;go.disabled=!ok;}
function vBarUI(){$("vCen").classList.toggle("on",vCentres);icoBtn($("vCen"),"centre","Centres");$("vLegs").classList.toggle("on",vLegsOut);icoBtn($("vLegs"),"legs",vLegsOut?"Legs out":"Legs in");$("vMirror").classList.toggle("on",vMirror);icoBtn($("vMirror"),"mirror",vMirror?"Mirror on":"Mirror off");
  const sel=$("vLoad"),lib=store.get(VLIB,{});let h=`<option value="">Load…</option><optgroup label="Ready-made"><option value="t:sls">Super Heavy (SLS-shaped, 98 m)</option><option value="t:hopper">Hopper (lands on legs)</option><option value="t:orbiter">Orbiter (2 stages)</option><option value="t:heavy">Heavy (side boosters)</option><option value="t:sparrow">Sparrow (solid boosters)</option><option value="t:lander">Lander (for later)</option></optgroup>`;
  const names=Object.keys(lib).sort();if(names.length){h+=`<optgroup label="Saved">`;for(const n of names)h+=`<option value="s:${n.replace(/"/g,"&quot;")}">${n.replace(/</g,"&lt;")}</option>`;h+="</optgroup>";}
  sel.innerHTML=h;$("vName").value=vName;}
$("vLoad").onchange=()=>{const v=$("vLoad").value;$("vLoad").value="";if(!v)return;vPush();
  if(v.startsWith("t:")){vps=tpl(v.slice(2));vName=v.slice(2)[0].toUpperCase()+v.slice(3);}else{const lib=store.get(VLIB,{});vps=JSON.parse(JSON.stringify(lib[v.slice(2)]||[]));vName=v.slice(2);}
  partId=Math.max(partId,...vps.map(p=>p.id+1),1);vsel=null;vChanged();vBarUI();vFitView();};
$("vName").oninput=()=>{vName=$("vName").value.slice(0,40);store.set("throat.vname",vName);};
$("vSaveB").onclick=()=>{const n=(vName||"").trim()||"My rocket";const lib=store.get(VLIB,{});lib[n]=vps;store.set(VLIB,lib);vMsg(`Saved "${n}".`);vBarUI();};
$("vDelB").onclick=()=>{const lib=store.get(VLIB,{}),n=(vName||"").trim();if(lib[n]){delete lib[n];store.set(VLIB,lib);vMsg(`Deleted "${n}".`);vBarUI();}else vMsg("Nothing saved under that name.");};
$("vMirror").onclick=()=>{vMirror=!vMirror;store.set("throat.vmirror",vMirror);vBarUI();};
$("vLegs").onclick=()=>{vLegsOut=!vLegsOut;vBarUI();vInspUI();};$("vUndoB").onclick=vUndo;$("vRedoB").onclick=vRedo;$("vFit").onclick=vFitView;
$("vClear").onclick=()=>{if(!vps.length)return;vPush();vps=[];vsel=null;vChanged();vMsg("Cleared. Ctrl+Z brings it back.");};
$("vBack").onclick=()=>closeVab();
$("vGo").onclick=()=>{const a=analyze(vps,engineNums());if(a.root<0||!a.stages.length||a.stages[0].twr<=1)return;closeVab(true);startFlight(vps,vName);};
function openVab(){FLT.on=false;FLT.vab=true;$("flight").classList.remove("show");vab.classList.add("show");enter(vab);S.paused=true;cfg();vAn=null;vPalUI();vBarUI();vInspUI();vFitC();vFitView();requestAnimationFrame(vFrame);}
function closeVab(toFlight){FLT.vab=false;vab.classList.remove("show");vcarry=null;if(!toFlight)enter($("stage"));if(!toFlight){S.paused=$("bPause").classList.contains("on");cfg();}}
$("bLaunch").onclick=openVab;$("vCen").onclick=()=>{vCentres=!vCentres;store.set("throat.vcentres",vCentres);vBarUI();};
// ---------- drawing ----------
let vCentres=store.get("throat.vcentres",true);
function vFrame(){if(!vab.classList.contains("show"))return;vFitC();const c=vx;
  c.setTransform(1,0,0,1,0,0);c.fillStyle="#0a0f1d";c.fillRect(0,0,VW,VH);
  // blueprint grid: fine every 1.5 m, bold every 6 m
  const s=vv.s;for(const[st,a]of[[15,0.05],[60,0.11]]){if(st*s<6)continue;c.strokeStyle=`rgba(120,150,230,${a})`;c.lineWidth=1;c.beginPath();
    const x0=Math.floor(-vv.ox/s/st)*st,y0=Math.floor((vv.oy-VH)/s/st)*st;
    for(let x=x0;x*s+vv.ox<VW;x+=st){const X=Math.round(vv.ox+x*s)+0.5;c.moveTo(X,0);c.lineTo(X,VH);}
    for(let y=y0;vv.oy-y*s>0;y+=st){const Y=Math.round(vv.oy-y*s)+0.5;c.moveTo(0,Y);c.lineTo(VW,Y);}c.stroke();}
  const b=vBox(vps),ax=vAxis();
  c.setTransform(s,0,0,-s,vv.ox,vv.oy);
  // launch pad under the rocket, and the mirror line
  c.fillStyle="#2a3150";c.fillRect(b.x0-120,b.y0-14,b.x1-b.x0+240,14);c.fillStyle="#3b4570";c.fillRect(b.x0-120,b.y0-4,b.x1-b.x0+240,4);
  if(vMirror){c.strokeStyle="rgba(255,207,122,.18)";c.lineWidth=2/s;c.setLineDash([8/s,8/s]);c.beginPath();c.moveTo(ax,b.y0-40);c.lineTo(ax,b.y1+80);c.stroke();c.setLineDash([]);}
  const T=vps.length?vTree():null,loose=T?vps.map((p,j)=>T.r>=0&&T.par[j]===-2):[];
  vps.forEach((p,j)=>{const gone=vdrag&&vdrag.dropTwin&&vdrag.tset.has(j);if(gone)c.globalAlpha=0.25;
    drawPart(c,p,{legs:vLegsOut,sel:p.id===vsel,bad:loose[j]||gone||(vdrag&&vdrag.bad&&(vdrag.set.has(j)||vdrag.tset.has(j))),lw:3/s*VDS});c.globalAlpha=1;});
  for(const sh of shroudsOf(vps))drawShroud(c,sh,0.8);
  if(vcarry&&vcarry.inside!==false){const p={...vcarry.p},sn=vcarry.snap;if(sn){p.x=sn.x;p.y=sn.y;p.f=sn.f;}c.globalAlpha=0.75;
    const bad=!sn&&vps.some(o=>collide(p,o));drawPart(c,p,{ghost:!bad,bad,legs:vLegsOut,lw:2/s*VDS});
    if(vMirror&&sn&&Math.abs(p.x-ax)>0.5){const t={...p,x:2*ax-p.x,f:-p.f};c.globalAlpha=0.4;drawPart(c,t,{ghost:true,lw:2/s*VDS});}c.globalAlpha=1;}
  if(vCentres&&vps.length)drawCentres(c,centres(vps),1/s,true);   // centre of mass, lift, thrust
  c.setTransform(1,0,0,1,0,0);
  if(vMsgT&&performance.now()>vMsgT){$("vMsg").style.display="none";vMsgT=0;}
  vStatsUI();requestAnimationFrame(vFrame);}
window.__vab={get vps(){return vps;},get sel(){return vsel;},w2c:(x,y)=>{const r=vcv.getBoundingClientRect();return{x:r.left+(vv.ox+x*vv.s)*r.width/VW,y:r.top+(vv.oy-y*vv.s)*r.height/VH};}};
// fold-away panels in the editor too (phones keep their own strip layout)
if(!SMALL)foldUI(vab,"vab",[{el:$("vPal"),label:"PARTS",side:"l",open:true,title:"Parts to drag onto the rocket"},{el:document.querySelector(".vstat"),label:"ROCKET",side:"r",open:true,title:"Rocket stats: mass, Δv and thrust per stage"}]);
