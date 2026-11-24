// ================= VEHICLE EDITOR =================
const VKEY="throat.vab.v1",VLIB="throat.vehicles.v1";
const vab=$("vab"),vcv=$("vcv"),vx=vcv.getContext("2d");
let VW=1280,VH=720,VDS=1,vps=store.get(VKEY,null),vsel=null,vMirror=store.get("throat.vmirror",true),vU=[],vR=[],vv={s:1,ox:0,oy:0};
let vLegsOut=false,vdrag=null,vcarry=null,vptr={X:0,Y:0},vpan=null,vAn=null,vMsgT=0,vName=store.get("throat.vname","Orbiter"),vTouch=new Map(),vPinch=null;
if(!Array.isArray(vps)||!vps.length)vps=tpl("orbiter");
vRootFix();   // older saves: pick the root (the brain) and slide the rocket onto the centre line
// a rocket left in the editor before v1.16 is in the old small parts: rebuild it with today's (see upscaleOld in parts.js)
let vOldNote=oldScale(vps);if(vOldNote)upscaleOld(vps);
partId=Math.max(partId,...vps.map(p=>p.id+1));
const vSave=()=>{store.set(VKEY,vps);store.set("throat.vname",vName);};
function vFitC(){const r=vcv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);VW=Math.max(320,Math.round(r.width*d));VH=Math.max(240,Math.round(r.height*d));if(vcv.width!==VW||vcv.height!==VH){vcv.width=VW;vcv.height=VH;}VDS=d;}
function vBox(ps){let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of ps){a=Math.min(a,p.x-p.w/2);b=Math.max(b,p.x+p.w/2);c=Math.min(c,p.y);d=Math.max(d,p.y+p.h);}return ps.length?{x0:a,x1:b,y0:c,y1:d}:{x0:-60,x1:60,y0:0,y1:300};}
function vFitView(){vFitC();const b=vBox(vps),w=Math.max(200,b.x1-b.x0),h=Math.max(250,b.y1-b.y0),narrow=VW<760*VDS;
  vv.s=Math.min(VH*(narrow?0.5:0.62)/h,VW*(narrow?0.45:0.36)/w,4*VDS);vv.ox=VW*(narrow?0.3:0.47)-vv.s*(b.x0+b.x1)/2;vv.oy=VH*(narrow?0.5:0.55)+vv.s*(b.y0+b.y1)/2;}
const v2w=(X,Y)=>({x:(X-vv.ox)/vv.s,y:(vv.oy-Y)/vv.s});
function vEvXY(e){const r=vcv.getBoundingClientRect();return{X:(e.clientX-r.left)*VW/r.width,Y:(e.clientY-r.top)*VH/r.height};}
// v1.46: the centre line is fixed at x = 0. The rocket is built on a ROOT part: the first part you place sits on the line, and
// every other part hangs off it (stack parts centred on the part they sit on, side parts on its sides). Picking a part up takes
// everything that hangs beyond it; picking the root up moves the whole rocket (up and down only).
const vAxis=()=>0;
function vRoot(){return vps.findIndex(p=>p.root);}
function vRootFix(){if(!vps.length)return;let r=vRoot();
  if(r<0){r=rootIdx(vps);if(r<0)r=vps.findIndex(p=>!isRad(p)&&Math.abs(p.x)<0.5);if(r<0)r=vps.findIndex(p=>!isRad(p));if(r<0)r=0;vps[r].root=true;}
  vps.forEach((p,j)=>{if(j!==r&&p.root)delete p.root;});
  const dx=vps[r].x;if(Math.abs(dx)>0.01)for(const p of vps)p.x-=dx;}   // the root sits on the centre line
const vSnap=()=>JSON.stringify(vps);
function vPush(){vU.push(vSnap());if(vU.length>80)vU.shift();vR=[];}
function vUndo(){if(!vU.length)return;vR.push(vSnap());vps=JSON.parse(vU.pop());vsel=null;vChanged();}
function vRedo(){if(!vR.length)return;vU.push(vSnap());vps=JSON.parse(vR.pop());vsel=null;vChanged();}
function vChanged(){vRootFix();vStageFix();vSave();vAn=null;vInspUI();vStgUI();}
// ---------- staging (v1.47, KSP-style; Wyatt: "drag the icons into each stage") ----------
// Engines, decouplers and fairings each carry p.sg, the stage that sets them off. Stage 1 is the launch: its engines light at
// lift-off. Each Space after that sets off the next stage. The STAGES panel shows one box per stage (launch at the bottom, as in
// KSP) with an icon per part (mirror twins share one icon); drag an icon to another box, or into the gap between two boxes to
// make a new stage there. Fairings may also sit in AUTOMATIC: they open by themselves above the air.
function vStgGroups(){const mid=i=>vps[i].y+vps[i].h/2,G=[];
  for(let i=0;i<vps.length;i++){const p=vps[i];if(!isStg(p))continue;const tw=p.tw?vById(p.tw):-1,D=p.t==="dec"||p.t==="sdec";
    const g=G.find(g=>g.m.includes(tw)||D&&g.dec&&p.sg==null&&g.m.every(j=>vps[j].sg==null)&&Math.abs(mid(g.m[0])-mid(i))<3);
    if(g)g.m.push(i);else G.push({m:[i],dec:D,kind:D?"dec":p.t==="fair"?"fair":"eng"});}
  for(const g of G){const n=g.m.map(i=>vps[i].sg).filter(v=>v!=null);g.sg=n.length?Math.min(...n):null;g.key=g.m.map(i=>vps[i].id).sort((a,b)=>a-b).join("-");}
  return G;}
function vEngDec(G,i){const e=vps[i];let best=null,by=-1e9;   // the closest stack decoupler under it: once that fires, this engine is the bottom
  for(const g of G)if(g.dec)for(const j of g.m){const d=vps[j];if(d.t==="dec"&&d.y+d.h<=e.y+e.h/2&&Math.abs(d.x-e.x)<d.w/2&&d.y>by){by=d.y;best=g;}}return best;}
function vStageFix(){const G=vStgGroups();if(!G.length)return;const mid=g=>vps[g.m[0]].y+vps[g.m[0]].h/2,set=(g,v)=>{g.sg=v;for(const i of g.m)if(v==null)delete vps[i].sg;else vps[i].sg=v;};
  const D=G.filter(g=>g.dec).sort((a,b)=>mid(a)-mid(b));
  if(!G.some(g=>g.sg!=null)){D.forEach((g,k)=>set(g,k+2));}   // a fresh rocket: lowest decouplers first, as before
  else for(const g of D)if(g.sg==null){let s=2;for(const o of D)if(o!==g&&o.sg!=null&&mid(o)<mid(g))s=Math.max(s,o.sg+1);   // a new decoupler: its own stage, by height
    for(const p of vps)if(p.sg!=null&&p.sg>=s)p.sg++;for(const o of G)if(o.sg!=null&&o.sg>=s)o.sg++;set(g,s);}
  for(const g of D)if(g.sg<=1){for(const p of vps)if(p.sg!=null&&p.sg>=2)p.sg++;for(const o of G)if(o.sg!=null&&o.sg>=2)o.sg++;set(g,2);}   // nothing fires at launch (v1.47 ▲▼ saves numbered decouplers from 1)
  for(const g of G)if(!g.dec&&g.sg==null&&g.kind==="eng"){const d=g.m.map(i=>vEngDec(G,i)).find(x=>x);set(g,d?d.sg:1);}   // engines: with the decoupler they sit on, else at launch
  const vals=[...new Set([1,...G.filter(g=>g.sg!=null).map(g=>g.sg)])].sort((a,b)=>a-b),to=new Map(vals.map((v,k)=>[v,k+1]));   // no empty stages
  for(const g of G)if(g.sg!=null)set(g,to.get(g.sg));}
let vStgHi=null,vStgD=null;
function stgIcon(p){const c=document.createElement("canvas");c.width=c.height=48;const g=c.getContext("2d"),q=JSON.parse(JSON.stringify(p));
  if(q.t==="fair")q.fh=Math.min(q.fh||120,q.w*1.4);const hh=q.h+(q.t==="fair"?q.fh:0),ww=q.t==="sdec"?Math.max(q.w,q.h*2):q.w*(q.k||1),sc=Math.min(42/ww,42/Math.max(hh,q.w*0.4));
  g.setTransform(sc,0,0,-sc,24,24+sc*hh/2);q.x=0;q.y=0;q.f=1;drawPart(g,q,{legs:false,shell:true});return c;}
function stgName(p){return p.t==="dec"?"Decoupler":p.t==="sdec"?"Side dec.":p.t==="fair"?"Fairing":partName(p);}
function vStgUI(){const box=$("vStg");if(!box)return;const G=vStgGroups(),mx=Math.max(1,...G.map(g=>g.sg||0));box.innerHTML="";
  const slot=k=>{const d=document.createElement("div");d.className="sgins";d.dataset.ins=k;box.appendChild(d);};
  const icon=(g,host)=>{const p=vps[g.m[0]],d=document.createElement("div");d.className="sgi k-"+g.kind;d.dataset.g=g.key;d.title=stgName(p)+(g.m.length>1?` (${g.m.length}, mirrored)`:"")+": drag it to another stage";
    d.appendChild(stgIcon(p));const n=document.createElement("span");n.textContent=stgName(p).replace("Side decoupler","Side dec.");d.appendChild(n);
    if(g.m.length>1){const b=document.createElement("b");b.textContent="×"+g.m.length;d.appendChild(b);}
    d.addEventListener("pointerenter",()=>{vStgHi=new Set(g.m.map(i=>vps[i].id));});d.addEventListener("pointerleave",()=>{vStgHi=null;});
    d.addEventListener("pointerdown",e=>{e.preventDefault();vStgD={key:g.key,kind:g.kind,ghost:null,x0:e.clientX,y0:e.clientY};});host.appendChild(d);};
  slot(mx+1);
  for(let s=mx;s>=1;s--){const b=document.createElement("div");b.className="sgbox";b.dataset.st=s;
    b.innerHTML=`<div class="sgh"><b>${s}</b>${s===1?"LAUNCH":"SPACE"+(s>2?" ×"+(s-1):"")}</div>`;const ic=document.createElement("div");ic.className="sgic";b.appendChild(ic);
    const L=G.filter(g=>g.sg===s).sort((a,c)=>({dec:0,fair:1,eng:2}[a.kind]-{dec:0,fair:1,eng:2}[c.kind]));L.forEach(g=>icon(g,ic));if(!L.length)ic.innerHTML=`<i>empty</i>`;
    box.appendChild(b);if(s>1)slot(s);}
  const A=G.filter(g=>g.sg==null);if(A.length||G.some(g=>g.kind==="fair")){const b=document.createElement("div");b.className="sgbox auto";b.dataset.st="0";
    b.innerHTML=`<div class="sgh">AUTOMATIC</div>`;const ic=document.createElement("div");ic.className="sgic";b.appendChild(ic);A.forEach(g=>icon(g,ic));if(!A.length)ic.innerHTML=`<i>fairings here open by themselves in space</i>`;box.appendChild(b);}
  if(!G.length)box.innerHTML=`<div class="tip">Engines, decouplers and fairings show up here. Drag them between stages to choose what each Space does.</div>`;}
function vStgTarget(e){const el=document.elementFromPoint(e.clientX,e.clientY);return el&&el.closest?el.closest("#vStg [data-st],#vStg [data-ins]"):null;}
window.addEventListener("pointermove",e=>{if(!vStgD)return;const D=vStgD;
  if(!D.ghost){if(Math.hypot(e.clientX-D.x0,e.clientY-D.y0)<4)return;const src=document.querySelector(`#vStg [data-g="${D.key}"]`);D.ghost=src?src.cloneNode(true):document.createElement("div");
    const cv0=src&&src.querySelector("canvas"),cv1=D.ghost.querySelector("canvas");if(cv0&&cv1)cv1.getContext("2d").drawImage(cv0,0,0);D.ghost.classList.add("sgghost");document.body.appendChild(D.ghost);$("vStg").classList.add("dragging");}
  D.ghost.style.left=e.clientX-26+"px";D.ghost.style.top=e.clientY-26+"px";
  document.querySelectorAll("#vStg .hot").forEach(x=>x.classList.remove("hot"));const t=vStgTarget(e);if(t)t.classList.add("hot");});
window.addEventListener("pointerup",e=>{if(!vStgD)return;const D=vStgD;vStgD=null;if(D.ghost)D.ghost.remove();$("vStg").classList.remove("dragging");
  const t=D.ghost?vStgTarget(e):null;if(!t)return;const G=vStgGroups(),g=G.find(q=>q.key===D.key);if(!g)return;
  if(t.dataset.st!=null){const s=+t.dataset.st;
    if(s===0&&g.kind!=="fair"){vMsg("Only fairings can open by themselves. Engines and decouplers need a stage.");return;}
    if(s===1&&g.kind==="dec"){vMsg("Nothing drops at launch: put decouplers in a later stage (or between two stages).");return;}
    if(s===(g.sg||0))return;vPush();for(const i of g.m)if(s===0)delete vps[i].sg;else vps[i].sg=s;}
  else{const k=+t.dataset.ins;vPush();for(const p of vps)if(p.sg!=null&&p.sg>=k&&!g.m.includes(vps.indexOf(p)))p.sg++;for(const i of g.m)vps[i].sg=k;}
  vChanged();const s2=vps[g.m[0]].sg;vMsg(s2?`${stgName(vps[g.m[0]])} → stage ${s2}${s2===1?" (launch)":""}.`:"It opens by itself in space.");});
function vMsg(t){$("vMsg").textContent=t;$("vMsg").style.display="";vMsgT=performance.now()+3200;}
// ---------- snapping ----------
function alignX(px,pw,dw){const lim=(pw-dw)/2;if(lim<1)return[px];const out=[px,px-lim,px+lim];for(let k=-lim;k<=lim+0.01;k+=15)out.push(px+k);return out;}
function sideYs(P,D,dy){const lo=P.y-D.h+5,hi=P.y+P.h-5,out=[P.y,P.y+P.h-D.h,P.y+(P.h-D.h)/2];const g=Math.round(dy/5)*5;if(g>=lo&&g<=hi)out.push(g);return out.filter(v=>v>=lo-0.01&&v<=hi+0.01);}
// v1.47 (Wyatt: "new fuel tanks should be the same diameter as the one above them"): a NEW stack part snapped under a part takes
// that part's width, and one snapped on top takes the width of the top it sits on. Tanks, decouplers and spacers keep their
// length; nose cones, probes and capsules keep their shape. Engines and boosters keep the size you chose (their thrust goes with it).
const MATCH_T=new Set(["tank","dec","adapter","probe","nose","truss","fair","shield","capsule"]);
function vMatch(D,P,under){if(!MATCH_T.has(D.t)||!PT[D.t].wr)return null;const r=PT[D.t].wr,want=under?P.w:topW(P);if(!(want>0))return null;
  if(D.t==="adapter"){if(under){const w2=Math.max(8,Math.min(D.w-2,want));return w2===topW(D)?null:{w:D.w,h:D.h,w2};}   /* an adapter under a part: its top meets that part */
    const w=Math.max(r[0],Math.min(r[1],want));return w===D.w?null:{w,h:D.h,w2:Math.min(topW(D),w-2)};}
  const w=Math.max(r[0],Math.min(r[1],want));if(w===D.w)return null;
  const keep=D.t==="nose"||D.t==="probe"||D.t==="capsule";return{w,h:keep?Math.max(4,Math.round(D.h*w/D.w)):D.h};}
function snapPart(D,dx,dy,O,rad,match){let best=null,bd=rad;const R=isRad(D);
  const tryC=(x,y,f,m)=>{const d=Math.hypot(x-dx,y-dy);if(d>=bd)return;const t={...D,...(m||{}),x,y};for(const o of O)if(collide(t,o))return;bd=d;best={x,y,f,m:m||null};};
  for(const P of O){const PRd=isRad(P);
    if(!R&&!PRd){
      if(topW(P)>0){const m=match&&vMatch(D,P,false);tryC(P.x,P.y+P.h,D.f,m);}   /* stacks stay centred on the part they sit on */
      if(topW(match?{...D,...(vMatch(D,P,true)||{})}:D)>0){const m=match&&vMatch(D,P,true),h=m?m.h:D.h;tryC(P.x,P.y-h,D.f,m);}
      // v1.47: a stack part can also hang on the side of another (a side tank, a parallel stack): drag it beside the part
      if(P.t!=="engine"&&P.t!=="srb"&&D.t!=="engine")for(const s of[-1,1]){const x=P.x+s*(P.w+D.w)/2;for(const y of sideYs(P,D,dy))tryC(x,y,D.f,null);}}
    if((R&&!PRd)||(P.t==="sdec"&&!R))for(const s of[-1,1]){if(P.t==="sdec"&&s!==P.f)continue;const x=P.x+s*(P.w+D.w)/2;for(const y of sideYs(P,D,dy))tryC(x,y,R?s:D.f);}}
  return best;}
// ---------- parts tree: what moves with what ----------
function vTree(){const adj=adjOf(vps),r=vRoot()>=0?vRoot():rootIdx(vps),par=new Array(vps.length).fill(-2);
  if(r>=0){par[r]=-1;const q=[r];while(q.length){const i=q.shift();for(const j of adj[i])if(par[j]===-2){par[j]=i;q.push(j);}}}
  return{adj,r,par};}
function vSub(i,alt,T){T=T||vTree();if(alt)return new Set([i]);
  if(T.par[i]===-2)return bfs(T.adj,i,j=>T.par[j]===-2);           // loose: drag its whole clump
  const out=new Set([i]);let grew=true;while(grew){grew=false;vps.forEach((p,j)=>{if(!out.has(j)&&T.par[j]>=0&&out.has(T.par[j])){out.add(j);grew=true;}});}return out;}
const vById=id=>vps.findIndex(p=>p.id===id);
// ---------- placing, moving, deleting ----------
function vPlace(p){const ax=vAxis(),first=!vps.length;let snap=first?{x:ax,y:Math.max(0,Math.round(p.y/5)*5),f:p.f}:snapPart(p,p.x,p.y,vps,34/vv.s*VDS,true);if(p.kit)return vPlaceKit(p,snap);
  if(first&&isRad(p)){vMsg("Start with a part that goes on the centre line (a probe, tank, engine…), then add side parts to it.");return false;}
  if(!snap){   // v1.47: dropped in empty space: it's parked there (not part of the rocket, so it stays behind at launch) until you drag it on
    p.x=Math.round(p.x/5)*5;p.y=Math.round(p.y/5)*5;if(vps.some(o=>collide(p,o))){vMsg("It overlaps another part.");return false;}
    vPush();vps.push(p);vsel=p.id;vChanged();vMsg("Parked to the side (faded): it isn't attached, so it won't fly. Drag it onto the rocket when you want it.");return true;}
  if(snap.m)Object.assign(p,snap.m);   // takes the width of the part it joins
  p.x=snap.x;p.y=snap.y;p.f=snap.f;if(first)p.root=true;
  vPush();vps.push(p);
  if(vMirror&&Math.abs(p.x-ax)>0.5){const t={...p,id:partId++,x:2*ax-p.x,f:-p.f};if(!vps.some(o=>collide(t,o))){t.tw=p.id;p.tw=t.id;vps.push(t);}else vMsg("The mirror copy didn't fit, so only one was placed.");}
  vsel=p.id;vChanged();return true;}
function vDelete(i){if(i<0)return;const T=vTree(),p=vps[i],tw=p.tw?vById(p.tw):-1,del=vSub(i,false,T);if(tw>=0)for(const j of vSub(tw,false,T))del.add(j);
  vPush();vps=vps.filter((q,j)=>!del.has(j));vsel=null;vChanged();
  if(del.size>(tw>=0?2:1))vMsg(p.root?"Removed the whole rocket (it was built on that part). Ctrl+Z undoes it.":`Removed ${del.size} parts: it and everything hanging off it. Ctrl+Z undoes it.`);}
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
// fin and wing shape (v1.46): span grows outward (the inner edge stays on the rocket), root grows up, tip and sweep reshape it
function vFinShape(i,cmd){const p=vps[i];if(!p)return;const[k,d]=cmd.split(":"),dv=+d,before=vSnap();
  const one=q=>{const s=finShape(q);
    if(k==="span"){const w=Math.max(8,Math.min(300,q.w+dv));q.x+=q.f*(w-q.w)/2;q.w=w;}
    else if(k==="root")q.h=Math.max(12,Math.min(400,q.h+dv));
    else if(k==="tip"){q.tc=Math.max(0,Math.min(1,Math.round((s.tc+dv)*100)/100));q.sb=Math.min(s.sb,1-q.tc);}
    else if(k==="sweep"){q.tc=s.tc;q.sb=Math.max(0,Math.min(1-s.tc,Math.round((s.sb+dv)*100)/100));}};
  one(p);const tw=p.tw?vById(p.tw):-1;if(tw>=0&&tw!==i&&vps[tw].t===p.t&&vps[tw].v===p.v)one(vps[tw]);
  for(let a=0;a<vps.length;a++)for(let b=a+1;b<vps.length;b++)if(collide(vps[a],vps[b])){vps=JSON.parse(before);vMsg("That doesn't fit: it would bump into another part.");vChanged();return;}
  vU.push(before);vR=[];vChanged();}
// ---------- pointer ----------
function vHit(x,y){for(let i=vps.length-1;i>=0;i--){const p=vps[i];if(x>=p.x-p.w/2-3&&x<=p.x+p.w/2+3&&y>=p.y-3&&y<=p.y+p.h+3)return i;}return -1;}
const overPal=e=>{const el=document.elementFromPoint(e.clientX,e.clientY);return !!(el&&el.closest&&el.closest("#vPal"));};
const overCv=e=>document.elementFromPoint(e.clientX,e.clientY)===vcv;
function vCarryMove(e){const q=vEvXY(e),w=v2w(q.X,q.Y),p=vcarry.p;p.x=w.x;p.y=w.y-p.h/2;vptr=q;
  const s=vps.length?snapPart(p,p.x,p.y,vps,34/vv.s*VDS,true):{x:vAxis(),y:0,f:p.f};vcarry.snap=s;}
// "lib:<id>" = something from the engine library; the part gets its own copy of the numbers
function libPart(e){return mkPart(e.kind==="solid"?"srb:lib":"engine:lib",0,0,null,libNums(e));}
// ---------- kits: a ready-made group of parts dropped in one go ----------
// Upper stage: decoupler + Lumen Vac (the vacuum engine) + tank, for the top of a first stage. Booster pair: Thumper solid
// boosters with cone noses on side decouplers, hung on both sides at once. While carried, a kit is one block that snaps like one
// tall part; dropped, it becomes ordinary parts you can move, resize or delete one by one.
const KITS={
  upper:{name:"Upper stage",desc:"A ready-made second stage: decoupler, Lumen Vac vacuum engine and a fuel tank. Drop it on top of a first stage, then add a probe core (or capsule) and a nose.",
    build(){const L=[];let y=0;for(const[t,w,h]of[["dec",40],["engine:vac"],["tank",40,110]]){const p=mkPart(t,w,h);p.x=0;p.y=y;y+=p.h;L.push(p);}return L;}},
  boost:{name:"Booster pair",desc:"Two Thumper solid boosters with nose cones and side decouplers. Drop them beside a fuel tank: they light with the throttle and Space drops them.",radial:true,
    build(){const s=mkPart("sdec"),b=mkPart("srb:thumper",18,260),n=mkPart("nose",18);n.ns="cone";s.x=0;s.y=60;s.f=1;b.x=s.w/2+b.w/2;b.y=0;n.x=b.x;n.y=b.h;return[s,b,n];}}};
// the block that stands in for a kit while it's carried: the box around its parts (a radial block for the boosters)
function kitBlock(key){const parts=KITS[key].build(),x0=Math.min(...parts.map(p=>p.x-p.w/2)),x1=Math.max(...parts.map(p=>p.x+p.w/2)),y1=Math.max(...parts.map(p=>p.y+p.h));
  return{id:-1,t:KITS[key].radial?"fin":"tank",x:0,y:0,w:x1-x0,h:y1,f:1,tw:0,kit:key,parts,cx:(x0+x1)/2};}
// the kit's parts where the block is now (s: which side a radial kit hangs on; -1 flips it)
function kitParts(B,x,y,s){return B.parts.map(p=>{const q=JSON.parse(JSON.stringify(p));q.x=x+s*(p.x-B.cx);q.y=y+p.y;if(q.t==="sdec")q.f=s;else if(B.t==="fin")q.f=s;return q;});}
// put a side decoupler where it touches both the booster and the core beside it (the snap only lined up the booster)
function hangSdec(L,O){const sd=L.find(p=>p.t==="sdec"),b=L.find(p=>p.t==="srb");if(!sd||!b)return true;const s=sd.f,edge=b.x-s*b.w/2-s*sd.w;
  const core=O.filter(o=>!isRad(o)&&Math.abs(o.x+s*o.w/2-edge)<0.6&&o.y<b.y+b.h&&o.y+o.h>b.y).sort((a,c)=>c.y-a.y);
  for(const o of core.reverse()){const lo=Math.max(b.y,o.y),hi=Math.min(b.y+b.h,o.y+o.h);if(hi-lo>=sd.h){sd.y=lo+(hi-lo-sd.h)*0.3;sd.x=edge+s*sd.w/2;return true;}}
  return false;}
function vPlaceKit(B,snap){if(!snap){vMsg("Attach it to the rocket: bring it close to a part.");return false;}
  const ax=vAxis(),s=B.t==="fin"?snap.f:1,x=snap.x,y=snap.y;
  const L=kitParts(B,x,y,s);if(!hangSdec(L,vps)){vMsg("Drop the boosters right beside a fuel tank or the core.");return false;}
  const hit=(A,O)=>A.some(p=>O.some(o=>collide(p,o)));if(hit(L,vps)){vMsg("It overlaps another part.");return false;}
  vPush();for(const p of L){p.id=partId++;vps.push(p);}
  if(vMirror&&Math.abs(x-ax)>0.5){const M=L.map(p=>({...JSON.parse(JSON.stringify(p)),id:partId++,x:2*ax-p.x,f:-p.f}));
    if(!hit(M,vps)){M.forEach((m,i)=>{m.tw=L[i].id;L[i].tw=m.id;vps.push(m);});}else vMsg("The mirror copy didn't fit, so only one side was placed.");}
  vsel=null;vChanged();vMsg(KITS[B.kit].name+" added.");return true;}
function newPart(t){if(t.startsWith("kit:"))return kitBlock(t.slice(4));if(t.startsWith("lib:")){const e=libGet(t.slice(4));return e?libPart(e):mkPart("engine");}return mkPart(t);}
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
  if(vPinch&&vTouch.size===2){const[a,b]=[...vTouch.values()],d=Math.hypot(a.X-b.X,a.Y-b.Y),k=Math.max(0.2,Math.min(8,d/vPinch.d));vv.s=vPinch.s*k;const mx=(a.X+b.X)/2,my=(a.Y+b.Y)/2;vv.ox=mx-(vPinch.cx-vPinch.ox)*k;vv.oy=my-(vPinch.cy-vPinch.oy)*k;return;}   // follow the fingers: pinch zooms, moving both pans
  if(vpan){vv.ox=vpan.ox+q.X-vpan.X;vv.oy=vpan.oy+q.Y-vpan.Y;return;}
  if(!vdrag)return;const w=v2w(q.X,q.Y);if(!vdrag.moved&&Math.hypot(w.x-vdrag.w0.x,w.y-vdrag.w0.y)*vv.s<5*VDS)return;vdrag.moved=true;
  const{i,set,tset,start}=vdrag,p=vps[i],O=vps.filter((o,j)=>!set.has(j)&&!tset.has(j));
  const dx0=start[i][0]+w.x-vdrag.w0.x,dy0=start[i][1]+w.y-vdrag.w0.y,sn=O.length?snapPart({...p,f:start[i][2]},dx0,dy0,O,34/vv.s*VDS):null;
  const isRoot=!!p.root,nx=isRoot?start[i][0]:sn?sn.x:Math.round(dx0/5)*5,ny=sn&&!isRoot?sn.y:Math.round(dy0/5)*5,ddx=nx-start[i][0],ddy=ny-start[i][1];
  const ax=vAxis();vdrag.dropTwin=tset.size>0&&Math.abs(nx-ax)<0.5;
  set.forEach(j=>{vps[j].x=start[j][0]+ddx;vps[j].y=start[j][1]+ddy;});tset.forEach(j=>{if(vdrag.dropTwin){vps[j].x=start[j][0];vps[j].y=start[j][1];}else{vps[j].x=start[j][0]-ddx;vps[j].y=start[j][1]+ddy;}});
  if(sn&&isRad(p)){p.f=sn.f;const ti=p.tw?vById(p.tw):-1;if(ti>=0&&tset.has(ti))vps[ti].f=-sn.f;}
  const M=vdrag.dropTwin?[...set]:[...set,...tset];vdrag.bad=M.some(a=>O.some(o=>collide(vps[a],o)))||(!vdrag.dropTwin&&[...set].some(a=>[...tset].some(b=>collide(vps[a],vps[b]))));});
function vUp(e){vTouch.delete(e.pointerId);if(vTouch.size<2)vPinch=null;vpan=null;if(!vdrag)return;const d=vdrag;vdrag=null;if(!d.moved)return;
  if(overPal(e)){const del=new Set([...d.set,...d.tset]);vps.forEach((o,j)=>{o.x=d.start[j][0];o.y=d.start[j][1];o.f=d.start[j][2];});vPush();vps=vps.filter((o,j)=>!del.has(j));vsel=null;vChanged();return;}
  if(d.bad){vps.forEach((o,j)=>{o.x=d.start[j][0];o.y=d.start[j][1];o.f=d.start[j][2];});vMsg("It overlaps another part, so it went back.");return;}
  {const moved=new Set(d.dropTwin?d.set:[...d.set,...d.tset]),A=adjOf(vps),rest=vps.length>moved.size;   /* must still touch the rocket (unless it IS the whole rocket) */
    const touches=s=>[...s].some(a=>A[a].some(b=>!s.has(b)));
    if(rest&&!vps[d.i].root&&(!touches(d.set)||(d.tset.size&&!d.dropTwin&&!touches(d.tset))))vMsg("Parked to the side (faded): not attached, so it won't fly. Drag it back onto the rocket when you want it.");}   /* v1.47: parts can wait beside the rocket instead of being deleted */
  if(d.dropTwin){const gone=new Set([...d.tset].map(j=>vps[j].id));vps=vps.filter(o=>!gone.has(o.id));for(const o of vps)if(gone.has(o.tw))o.tw=0;vMsg("Moved onto the centre line, so the mirror copy was removed.");}
  vU.push(d.before);vR=[];vChanged();}
vcv.addEventListener("pointerup",vUp);vcv.addEventListener("pointercancel",vUp);vcv.addEventListener("contextmenu",e=>e.preventDefault());
vcv.addEventListener("wheel",e=>{e.preventDefault();const i=vsel?vById(vsel):-1;
  if(e.shiftKey&&i>=0&&hasProp(vps[i])){const p=vps[i],h=Math.max(20,Math.min(900,p.h+(e.deltaY<0?10:-10)));if(h!==p.h)vResize(i,p.w,h);return;}
  if((e.ctrlKey||e.metaKey)&&i>=0&&canWiden(vps[i])){vWiden(i,e.deltaY<0?2:-2);return;}
  const q=vEvXY(e),k=e.deltaY<0?1.15:1/1.15,s2=Math.max(0.15*VDS,Math.min(12*VDS,vv.s*k)),kk=s2/vv.s;vv.ox=q.X-(q.X-vv.ox)*kk;vv.oy=q.Y-(q.Y-vv.oy)*kk;vv.s=s2;},{passive:false});
// ---------- keys (while the editor is open, the sandbox doesn't hear them) ----------
addEventListener("keydown",e=>{if(!vab.classList.contains("show"))return;
  if(techEl&&techEl.classList.contains("show")){if(e.key==="Escape")techEl.classList.remove("show");e.stopImmediatePropagation();return;}   // the tech tree card is open: keys are for it
  const tg=e.target.tagName;if(tg==="INPUT"||tg==="SELECT"||tg==="TEXTAREA")return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){e.shiftKey?vRedo():vUndo();e.preventDefault();}
  else if((e.ctrlKey||e.metaKey)&&k==="y"){vRedo();e.preventDefault();}
  else if(k==="delete"||k==="backspace"||k==="x"&&!e.ctrlKey&&!e.metaKey){   /* Delete, Backspace or X: the selected part, else the one under the mouse */
    if(vcarry){vcarry=null;}else{const w=v2w(vptr.X,vptr.Y),i=vsel?vById(vsel):vHit(w.x,w.y);if(i>=0)vDelete(i);}e.preventDefault();}
  else if(k==="escape"){if(vcarry)vcarry=null;else if(vsel){vsel=null;vInspUI();}}
  else if(k==="m"){vMirror=!vMirror;store.set("throat.vmirror",vMirror);vBarUI();}
  else if(k==="f"){vFitView();}
  else if(k==="c"&&!e.ctrlKey&&!e.metaKey){vCentres=!vCentres;store.set("throat.vcentres",vCentres);vBarUI();}
  else if(k==="enter"){$("vGo").click();}
  else if(k==="-"||k==="="||k==="+"){const i=vsel?vById(vsel):-1;if(i>=0&&hasProp(vps[i])){const p=vps[i];vResize(i,p.w,Math.max(20,Math.min(900,p.h+(k==="-"?-10:10))));}}
  else if(k==="["||k==="]"){const i=vsel?vById(vsel):-1;if(i>=0&&canWiden(vps[i]))vWiden(i,k==="]"?2:-2);}
  e.stopImmediatePropagation();},true);
// ---------- panels ----------
function kitIcon(k){const c=document.createElement("canvas");c.width=c.height=88;const g=c.getContext("2d"),pid=partId,B=kitBlock(k);partId=pid;
  const L=kitParts(B,0,0,1),x0=Math.min(...L.map(p=>p.x-p.w/2)),x1=Math.max(...L.map(p=>p.x+p.w/2)),sc=Math.min(70/(x1-x0),76/B.h);
  g.setTransform(sc,0,0,-sc,44-sc*(x0+x1)/2,44+sc*B.h/2);for(const p of L)drawPart(g,p,{legs:false});return c;}
function partIcon(t){if(t.startsWith("kit:"))return kitIcon(t.slice(4));const c=document.createElement("canvas");c.width=c.height=88;const g=c.getContext("2d"),p=newPart(t);partId--;
  if(t==="tank")p.h=90;if(t==="fair")p.fh=70;if(t==="dock"){p.w=48;p.h=15;}   /* a 2 m port would be a speck in the palette */const hh=p.h+(p.fh||0),sc=Math.min(70/p.w,70/hh,1.4);g.setTransform(sc,0,0,-sc,44,44+sc*hh/2);p.x=0;p.y=0;drawPart(g,p,{legs:false,shell:true,open:p.t==="antenna",brake:p.t==="brake"?0.6:0});return c;}   /* the palette shows the dish open and the airbrake swung out, so you can see what they do */
// palette filters (v1.46): every part sits in one group; "All" shows everything; the search box matches names and descriptions
const PCATS=[["all","All"],["cmd","Command"],["fuel","Fuel"],["eng","Engines"],["boost","Boosters"],["struct","Structure"],["aero","Aero"],["land","Landing"],["util","Utility"],["kit","Kits"]];
function partCat(t){
  if(t.startsWith("kit:"))return"kit";
  if(t.startsWith("lib:")){const e=libGet(t.slice(4));return e&&e.kind==="solid"?"boost":"eng";}
  if(t.startsWith("engine"))return"eng";if(t.startsWith("srb"))return"boost";
  const b=t.split(":")[0];
  if(b==="probe"||b==="capsule"||t==="nose:cockpit")return"cmd";
  if(b==="tank")return"fuel";
  if(b==="fin"||b==="nose")return"aero";
  if(b==="leg"||b==="chute"||b==="brake")return"land";
  if(b==="rcs"||b==="solar"||b==="antenna"||b==="light"||b==="les")return"util";
  return(PT[b]&&PT[b].cat)||"struct";}
let vCat=(()=>{try{return localStorage.getItem("throat.vcat.v1")||"all";}catch(e){return"all";}})(),vFindTxt="";
// v1.47 (Wyatt: "the part menu still has no filters and tabs"): the groups are proper tabs with a count each, "All" shows the
// parts under group headings, and hovering a part opens a card with its numbers instead of the browser's plain tooltip.
const PCAT_TIP={cmd:"Probes and capsules: the part that steers the rocket",fuel:"Tanks of fuel and oxygen",eng:"Liquid engines and clusters",boost:"Solid boosters: full thrust until empty, no throttle",
  struct:"Decouplers, adapters, trusses and other parts that hold the rocket together",aero:"Nose cones, fins and wings that shape the airflow",land:"Legs, parachutes and airbrakes for coming down",util:"Power, control jets, lights, antennas and the escape tower",kit:"Ready-made groups of parts"};
function vCatsUI(counts){const box=$("vCats");if(!box)return;box.innerHTML=PCATS.map(([k,n])=>`<button data-cat="${k}" class="${k===vCat&&!vFindTxt?"on":""}" title="${k==="all"?"Every part":PCAT_TIP[k]}"${counts&&k!=="all"&&!counts[k]?" disabled":""}><span>${n}</span><i>${counts?k==="all"?counts.all:counts[k]||0:""}</i></button>`).join("");
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{vCat=b.dataset.cat;try{localStorage.setItem("throat.vcat.v1",vCat);}catch(e){}if(vFindTxt){vFindTxt="";$("vFind").value="";}vPalUI();});}
{const f=$("vFind");if(f)f.addEventListener("input",()=>{vFindTxt=f.value.trim().toLowerCase();vPalUI();});}
function vPalList(){const L=[],item=(t,name,desc,cls)=>L.push({t,name,desc,cls,cat:partCat(t)});
  for(const t of PT_ORDER){const ek=t.startsWith("engine:")?t.slice(7).split(":"):null,en=ek?ENG[ek[0]]:t.startsWith("srb:")?BOOST[t.slice(4)]:null,cl=ek&&ek[1];
    const V=VARS[t];item(t,cl?"Engine cluster":en?en.name:V?V.name:PT[t].name,cl?`${ek[1]} engines side by side under one thrust plate (like SLS). Pick the count and type in its settings.`:en?en.desc:V?V.desc:PT[t].desc,en?" veng":"");}
  for(const k in KITS)item("kit:"+k,KITS[k].name,KITS[k].desc," vkit");
  for(const e of libAll())item("lib:"+e.id,e.name,`From your engine library (${e.kind==="solid"?"solid booster":"engine"}).`," vlib");
  return L;}
function vPalUI(){const box=$("vParts");box.innerHTML="";vTipHide();const L=vPalList(),counts={all:L.length};for(const q of L)counts[q.cat]=(counts[q.cat]||0)+1;vCatsUI(counts);
  const show=L.filter(q=>vFindTxt?(q.name+" "+q.desc).toLowerCase().includes(vFindTxt):vCat==="all"||q.cat===vCat);   /* searching looks in every group */
  if(!vFindTxt&&vCat==="all"){const ci=c=>PCATS.findIndex(x=>x[0]===c);show.sort((a,b)=>ci(a.cat)-ci(b.cat));}   /* sort is stable: each group keeps its own order */
  const head=t=>{const h=document.createElement("div");h.className="vgh";h.textContent=t;box.appendChild(h);};
  if(vFindTxt&&show.length)head(`${show.length} found`);let last=null;
  for(const q of show){if(!vFindTxt&&vCat==="all"&&q.cat!==last){last=q.cat;head((PCATS.find(c=>c[0]===q.cat)||[0,q.cat])[1]);}
    const t=q.t,b=document.createElement("button"),ok=techOK(t),tn=ok?null:techNodeOf(t);b.className="vpart"+q.cls+(ok?"":" vlock");b.setAttribute("aria-label",q.name);
    b.appendChild(partIcon(t));const sp=document.createElement("span");sp.textContent=q.name;b.appendChild(sp);if(!ok){const l=document.createElement("i");l.className="vlk";l.innerHTML=ico("lock");b.appendChild(l);}
    b.addEventListener("pointerenter",e=>{if(e.pointerType!=="touch")vTipShow(b,q,ok?null:tn);});b.addEventListener("pointerleave",vTipHide);
    b.addEventListener("pointerdown",e=>{vTipHide();if(!ok){e.preventDefault();techOpen();return;}startCarry(t,e);});box.appendChild(b);}
  if(!show.length)box.innerHTML=`<div class="vnone">${vFindTxt?"No part matches that.":"Nothing in this group yet."}</div>`;}
// the hover card: name and group, the part's own numbers, then what it's for
let vTipT=0;
function vTipFacts(t){if(t.startsWith("kit:"))return[];const p=newPart(t);partId--;const F=[],cap=capOf(p),m=partMass(p)+cap;
  F.push(["Mass",fM(m)]);if(p.w)F.push(["Size",`${+(p.w*UM).toFixed(1)} × ${+((p.h+(p.t==="fair"?p.fh||0:0))*UM).toFixed(1)} m`]);
  if(p.t==="engine"||p.t==="srb"){const E=engStat(p);F.push(["Thrust",`${fF(E.sl.F)} sea level, ${fF(E.vac.F)} vacuum`]);F.push(["Isp",`${Math.round(E.sl.isp)} s sea level, ${Math.round(E.vac.isp)} s vacuum`]);
    if(cap)F.push(["Burns",`about ${Math.round(cap*E.sl.isp*G0/E.sl.F)} s`]);}
  else if(cap)F.push(["Holds",`${fM(cap)} of propellant`]);
  if(PT[p.t]&&PT[p.t].wr)F.push(["Width",`${+(PT[p.t].wr[0]*UM).toFixed(1)} to ${+(PT[p.t].wr[1]*UM).toFixed(1)} m`]);return F;}
function vTipShow(b,q,tn){clearTimeout(vTipT);vTipT=setTimeout(()=>{let el=$("vTip");if(!el){el=document.createElement("div");el.id="vTip";el.className="ptip";document.body.appendChild(el);}
  const c=PCATS.find(x=>x[0]===q.cat),F=vTipFacts(q.t);
  el.innerHTML=`<div class="pth"><b>${q.name}</b><span>${c?c[1]:""}</span></div>${tn?`<div class="ptl">Locked: unlock “${tn.name}” in the Tech tree (${tn.cost} science). Click to open it.</div>`:""}
    ${F.length?`<div class="ptf">${F.map(([k,v])=>`<span>${k}</span><b>${v}</b>`).join("")}</div>`:""}<div class="ptd">${q.desc}</div>`;
  const r=b.getBoundingClientRect(),pr=$("vPal").getBoundingClientRect();el.style.display="block";const h=el.offsetHeight||140;
  el.style.left=Math.round(pr.right+8)+"px";el.style.top=Math.round(Math.max(8,Math.min(innerHeight-h-8,r.top)))+"px";},180);}
function vTipHide(){clearTimeout(vTipT);const el=$("vTip");if(el)el.style.display="none";}
// free width: every part in the stack can be any width in its range. Nose cones, probes and engines keep their shape
// (height grows with width); tanks, boosters, decouplers and adapters keep their length.
const canWiden=p=>!!(PT[p.t].wr);
function vWiden(i,dw){const p=vps[i],r=PT[p.t].wr;
  if(p.t==="engine"&&(p.k||1)>1){const es0=clusterGeo(p).ew,es=Math.max(r[0],Math.min(r[1],Math.round(es0+dw)));if(es===Math.round(es0)&&p.es)return;   // a cluster: grow each engine
    const w=clusterW(p.k,es);vResize(i,w,engH({t:"engine",e:p.e,w,k:p.k,es}),q=>{q.es=es;});return;}
  const w=Math.max(r[0],Math.min(r[1],p.w+dw));if(w===p.w)return;
  const keepShape=p.t==="nose"||p.t==="probe"||p.t==="capsule"||p.t==="les"||p.t==="engine";vResize(i,w,p.t==="engine"?engH({t:"engine",e:p.e,w,k:p.k}):keepShape?Math.max(4,Math.round(p.h*w/p.w)):p.h,q=>{if(q.t==="adapter"&&q.w2>=w)q.w2=w-2;});}
let vSlide=null;   // a slider being dragged: the inspector isn't rebuilt under it, and the whole drag is one undo step
// set one size from the inspector to an exact value (v in metres, or % for fin tip/sweep)
function vSetSize(i,k,v){const p=vps[i];if(!p||!isFinite(v))return;const U=Math.round(v/UM);
  if(k==="w"){const cur=p.t==="engine"&&(p.k||1)>1?clusterGeo(p).ew:p.w;if(U!==Math.round(cur))vWiden(i,U-cur);}
  else if(k==="l"){const h=Math.max(20,Math.min(900,U));if(h!==p.h)vResize(i,p.w,h);}
  else if(k==="w2")vResize(i,p.w,p.h,q=>{q.w2=Math.max(8,Math.min(q.w-2,U));});
  else if(k==="fh")vResize(i,p.w,p.h,q=>{q.fh=Math.max(40,Math.min(400,U));});
  else if(k==="span"&&U!==p.w)vFinShape(i,"span:"+(U-p.w));
  else if(k==="root"&&U!==p.h)vFinShape(i,"root:"+(U-p.h));
  else if(k==="tip"||k==="sweep"){const S=finShape(p),cur=k==="tip"?S.tc:S.sb,d=Math.round(v)/100-cur;if(Math.abs(d)>0.001)vFinShape(i,k+":"+d.toFixed(2));}}
function vInspUI(){if(vSlide)return;const el=$("vInsp"),i=vsel?vById(vsel):-1;if(i<0){el.style.display="none";return;}const p=vps[i],d=PT[p.t];el.style.display="";
  const cap=capOf(p),isE=p.t==="engine",isS=p.t==="srb",E=isE||isS?engStat(p):null,lib=libAll();
  let h=`<div class="ih"><b>${partName(p)}${p.root?` <span class="vroot" title="The root: the rocket is built on this part. Drag it to move the whole rocket.">ROOT</span>`:""}</b><span class="tip">${fM(partMass(p)+cap)}${cap?` (${fM(cap)} ${p.t==="tank"?FUEL_NAME[p.fk||"h2"]+" + oxygen":"propellant"})`:""}</span></div><div class="tip">${isE?ENG[engKey(p)].desc:isS?BOOST[boostKey(p)].desc:varOf(p)?varOf(p).desc:d.desc}</div>`;
  if(isS){const B=E,k=boostKey(p),bt=cap*B.sl.isp*G0/B.sl.F;
    h+=`<div class="tip" style="margin-top:4px">Sea level <b>${fF(B.sl.F)} · ${Math.round(B.sl.isp)} s</b>${B.sl.est?" (est.)":""}<br>Vacuum <b>${fF(B.vac.F)} · ${Math.round(B.vac.isp)} s</b>${B.vac.est?" (est.)":""}<br>Burns about <b>${Math.round(bt)} s</b> ${curveSvg(B.curve)}${k==="stand"?`<br>${B.src==="tested"?"From your last booster burn on the test stand.":"Not burned yet: these are the Thumper's numbers until you fire a booster on the test stand."}`:""}</div>
    <div class="row" style="margin-top:6px;gap:4px;flex-wrap:wrap">${BOOST_ORDER.map(q=>`<button class="b${k===q?" on":""}" data-bo="${q}"${techOK("srb:"+q)?"":` disabled title="Locked: see the Tech tree"`}>${BOOST[q].name}</button>`).join("")}${lib.filter(e=>e.kind==="solid").map(e=>`<button class="b${k==="lib"&&p.n&&p.n.name===e.name?" on":""}" data-bo="${e.id}"></button>`).join("")}</div>`;}
  if(isE)h+=`<div class="tip" style="margin-top:4px">Sea level <b>${fF(E.sl.F)} · ${Math.round(E.sl.isp)} s</b>${E.sl.est?" (est.)":""}<br>Vacuum <b>${fF(E.vac.F)} · ${Math.round(E.vac.isp)} s</b>${E.vac.est?" (est.)":""}${engKey(p)==="stand"?`<br>${E.src==="tested"?"From your test stand runs.":"Not tested yet: fire your engine on the stand to record its real numbers."}`:""}</div>
    <div class="row" style="margin-top:6px;gap:4px;flex-wrap:wrap">${ENG_ORDER.map(k=>`<button class="b${engKey(p)===k?" on":""}" data-e="${k}"${techOK("engine:"+k)?"":` disabled title="Locked: see the Tech tree"`}>${ENG[k].name}</button>`).join("")}${lib.filter(e=>e.kind!=="solid").map(e=>`<button class="b${engKey(p)==="lib"&&p.n&&p.n.name===e.name?" on":""}" data-le="${e.id}"></button>`).join("")}</div>`;
  if(p.t==="engine")h+=`<div class="row" style="margin-top:6px;gap:4px;align-items:center"><span class="tip">Engines</span><button class="b" data-k="-1">−</button><b style="min-width:18px;text-align:center">${p.k||1}</b><button class="b" data-k="1"${(p.k||1)===1&&!techOK("engine:stand:4")?` disabled title="Clusters: unlock Heavy lift in the Tech tree"`:""}>+</button><span class="tip">side by side under one thrust plate (SLS 4, New Glenn 7, Falcon 9 9)</span></div>`;
  if(p.t==="nose")h+=`<div class="row" style="margin-top:6px;gap:4px"><button class="b${p.ns!=="cone"?" on":""}" data-ns="ogive">Rounded</button><button class="b${p.ns==="cone"?" on":""}" data-ns="cone">Pointed</button></div>`;
  if(p.t==="srb"||p.t==="fair")h+=`<div class="row" style="margin-top:6px;gap:4px;flex-wrap:wrap">${(p.t==="srb"?[["","Standard"]]:[]).concat(NOSE_SKINS,p.t==="srb"?[["stripes","Black & white"]]:[]).map(([k,n])=>`<button class="b${(p.sk||"")===k||!p.sk&&k==="white"&&p.t==="fair"?" on":""}" data-sk="${k}">${n}</button>`).join("")}</div>`;
  if(p.t==="nose"&&p.v!=="cockpit")h+=`<div class="row" style="margin-top:6px;gap:4px;flex-wrap:wrap">${NOSE_SKINS.map(([k,n])=>`<button class="b${(p.sk||"white")===k?" on":""}" data-sk="${k}">${n}</button>`).join("")}</div>`;
  if(p.t==="tank")h+=`<div class="row" style="margin-top:6px;gap:4px;flex-wrap:wrap">${TANK_SKINS.map(([k,n])=>`<button class="b${tankSkin(p)===k?" on":""}" data-sk="${k}">${n}</button>`).join("")}</div>`;
  if(p.t==="leg"||p.t==="solar"||p.t==="brake"||p.t==="antenna")h+=`<div class="row" style="margin-top:6px"><button class="b${vLegsOut?" on":""}" data-legs="1">${vLegsOut?"Show folded":"Show deployed"}</button></div>`;
  // v1.47 (Wyatt: "all size modifications should be sliders that you can also put exact numbers into"): every size is a slider
  // with a number box beside it. Drag the slider, or type a number and press Enter. One drag is one undo step.
  {const S=finPanel(p)?finShape(p):null,isC=p.t==="engine"&&(p.k||1)>1,rows=[];
    const add=(k,lab,v,lo,hi,st,u,tip)=>rows.push(`<div class="vsl" title="${tip}"><span>${lab}</span><input type="range" data-sl="${k}" min="${lo}" max="${hi}" step="${st}" value="${v}"><input type="number" data-sn="${k}" min="${lo}" max="${hi}" step="${st}" value="${v}"><i>${u}</i></div>`);
    if(canWiden(p)){const r=PT[p.t].wr;add("w",isC?"Each engine":"Width",+((isC?clusterGeo(p).ew:p.w)*UM).toFixed(1),r[0]*UM,r[1]*UM,0.1,"m",isC?"How wide each engine in the cluster is (the plate fits them)":"How wide it is");}
    if(p.t==="adapter")add("w2","Top",+(topW(p)*UM).toFixed(1),0.8,+((p.w-2)*UM).toFixed(1),0.1,"m","How wide its top is (the part above sits on this)");
    if(hasProp(p))add("l","Length",+(p.h*UM).toFixed(1),2,90,0.5,"m","How long it is: longer holds more propellant");
    if(p.t==="fair")add("fh","Shell",+((p.fh||120)*UM).toFixed(1),4,40,0.5,"m","How tall the fairing shell is");
    if(S){add("span","Span",+(p.w*UM).toFixed(1),0.8,30,0.1,"m","How far it sticks out from the rocket");add("root","Root",+(p.h*UM).toFixed(1),1.2,40,0.1,"m","How long it is where it joins the rocket");
      add("tip","Tip",Math.round(S.tc*100),0,100,1,"%","How long the outer end is, compared with the root (0% = a point)");add("sweep","Sweep",Math.round(S.sb*100),0,100,1,"%","How far the outer end leans back");}
    if(rows.length)h+=`<div class="vsls">${S?`<div class="tip">Shape (a mirrored twin changes too). Bigger fins weigh more and grip the air harder.</div>`:""}${rows.join("")}</div>`;}
  h+=`<div class="row" style="margin-top:6px;gap:5px;flex-wrap:wrap"><button class="b" data-del="1" style="margin-left:auto" title="Backspace, Delete or X">${ico("trash")}Remove <kbd>Backspace</kbd></button></div>`;
  el.innerHTML=h;
  el.querySelectorAll("[data-sl],[data-sn]").forEach(inp=>{const k=inp.dataset.sl||inp.dataset.sn,num=!!inp.dataset.sn;
    inp.addEventListener("input",()=>{if(num)return;if(!vSlide)vSlide={n:vU.length,snap:vSnap()};vSetSize(i,k,+inp.value);const nb=el.querySelector(`[data-sn="${k}"]`);if(nb)nb.value=inp.value;});
    inp.addEventListener("change",()=>{if(num){const lo=+inp.min,hi=+inp.max,v=Math.max(lo,Math.min(hi,+inp.value));if(isFinite(v))vSetSize(i,k,v);vInspUI();return;}
      if(vSlide){const sn=vSlide;vSlide=null;if(vU.length>sn.n){vU.length=sn.n;vU.push(sn.snap);}}vInspUI();});
    if(num)inp.addEventListener("keydown",e=>{if(e.key==="Enter")inp.blur();});});
  el.querySelectorAll("[data-fn]").forEach(b=>b.onclick=()=>vFinShape(i,b.dataset.fn));
  el.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{const w=+b.dataset.w;vResize(i,w,p.t==="nose"?w:p.h);});
  el.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{vResize(i,p.w,Math.max(20,Math.min(900,p.h+ +b.dataset.l)));});
  el.querySelectorAll("[data-dw]").forEach(b=>b.onclick=()=>vWiden(i,+b.dataset.dw));
  el.querySelectorAll("[data-tw]").forEach(b=>b.onclick=()=>vResize(i,p.w,p.h,q=>{q.w2=Math.max(8,Math.min(q.w-2,topW(q)+ +b.dataset.tw));}));
  el.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{const k=b.dataset.e;vResize(i,p.w,engH({t:"engine",e:k,w:p.w,k:p.k,es:p.es}),q=>{q.e=k;delete q.n;});});   // keep the size (and count), change the model
  // saved names go in as text, not HTML
  el.querySelectorAll("[data-le]").forEach(b=>{const e=libGet(b.dataset.le);b.textContent=e?e.name:"?";b.onclick=()=>{if(e)vResize(i,ENG.lib.w,ENG.lib.h,q=>{q.e="lib";q.n=libNums(e);});};});
  el.querySelectorAll("[data-bo]").forEach(b=>{const k=b.dataset.bo,e=BOOST[k]?null:libGet(k);if(e)b.textContent=e.name;
    b.onclick=()=>vResize(i,p.w,p.h,q=>{if(e){q.b="lib";q.n=libNums(e);}else{q.b=k;delete q.n;}});});
  el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=Math.max(1,Math.min(9,(p.k||1)+ +b.dataset.k));if(k===(p.k||1))return;
    const es=Math.round(clusterGeo(p).ew),w=clusterW(k,es);   // every engine keeps its size; the plate fits them
    vResize(i,w,engH({t:"engine",e:p.e,w,k,es:k>1?es:undefined}),q=>{q.k=k;if(k>1)q.es=es;else delete q.es;});});
  el.querySelectorAll("[data-ns]").forEach(b=>b.onclick=()=>vResize(i,p.w,p.h,q=>{q.ns=b.dataset.ns;}));
  el.querySelectorAll("[data-sk]").forEach(b=>b.onclick=()=>vResize(i,p.w,p.h,q=>{if(b.dataset.sk)q.sk=b.dataset.sk;else delete q.sk;}));
  el.querySelectorAll("[data-fh]").forEach(b=>b.onclick=()=>vResize(i,p.w,p.h,q=>{q.fh=Math.max(40,Math.min(400,(q.fh||120)+ +b.dataset.fh));}));   // finish only changes the look
  el.querySelectorAll("[data-legs]").forEach(b=>b.onclick=()=>{vLegsOut=!vLegsOut;vBarUI();vInspUI();});
  el.querySelector("[data-del]").onclick=()=>vDelete(i);}
function vStatsUI(){const a=vAn||(vAn=analyze(vps,engineNums()));const st=a.stages;
  let h=`<div class="read" style="grid-template-columns:auto 1fr auto 1fr"><span>Mass</span><b data-r="m" data-v="${a.mass}" data-u="mass"></b><span>Height</span><b>${a.H.toFixed(1)} m</b></div>`;
  if(st.length){h+=`<div class="vst">`;st.forEach((s,k)=>{h+=`<div class="sr"><b>Stage ${k+1}</b><span>Δv <b data-r="s${k}" data-v="${s.dv}"></b> m/s</span><span>TWR <b class="${s.twr>(k?0.5:1.1)?"ok":"bad"}">${s.twr.toFixed(2)}</b></span><i>${s.eng} engine${s.eng===1?"":"s"} · burns ${Math.round(s.burn)} s</i></div>`;
    if(s.dropKind)h+=`<div class="vsep">Space → drop ${s.dropKind==="boosters"?"the side boosters":"stage "+(k+1)}</div>`;});
    h+=`</div><div class="read" style="grid-template-columns:auto 1fr"><span>Total Δv</span><b data-r="t" data-v="${a.total}" data-u=" m/s"></b></div><div class="tip">Orbit takes about 4,500 m/s (the autopilot uses ~4,900). TWR above 1 to lift off.</div>`;}
  for(const w of a.warn)h+=`<div class="warn">⚠ ${w}</div>`;
  if(st.length&&st[0].twr<=1)h+=`<div class="warn">⚠ Too heavy to lift off: add engines or use less fuel.</div>`;
  {const cn=centres(vps);if(cn&&cn.col&&a.root>=0&&cn.col[1]>cn.com[1]+5)h+=`<div class="warn">⚠ The centre of lift (blue) is above the centre of mass (yellow): in the air it will want to flip. Add fins low down, or put heavy parts higher. C shows the markers.</div>`;}
  const el=$("vStats");if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;
    for(const b of el.querySelectorAll("[data-r]")){const u=b.dataset.u||"";roll("vs"+b.dataset.r,b,+b.dataset.v,u==="mass"?fM:x=>fmt(x)+u);}}   // numbers roll to their new values
  const go=$("vGo"),ok=a.root>=0&&st.length&&st[0].twr>1;go.disabled=!ok;}
function vBarUI(){techBtn();$("vCen").classList.toggle("on",vCentres);icoBtn($("vCen"),"centre","Centres");$("vLegs").classList.toggle("on",vLegsOut);icoBtn($("vLegs"),"legs",vLegsOut?"Legs out":"Legs in");$("vMirror").classList.toggle("on",vMirror);icoBtn($("vMirror"),"mirror",vMirror?"Mirror on":"Mirror off");
  const sel=$("vLoad"),lib=store.get(VLIB,{});let h=`<option value="">Load…</option><optgroup label="Ready-made"><option value="t:sls">Super Heavy (SLS-shaped, 91 m)</option><option value="t:comsat">Comsat (a satellite in a payload fairing)</option><option value="t:pathfinder">Pathfinder (new parts: methane booster, nuclear upper stage)</option><option value="t:hopper">Hopper (lands on legs)</option><option value="t:orbiter">Orbiter (2 stages)</option><option value="t:heavy">Heavy (side boosters)</option><option value="t:sparrow">Sparrow (solid boosters)</option><option value="t:lander">Lander (for later)</option></optgroup>`;
  const names=Object.keys(lib).sort();if(names.length){h+=`<optgroup label="Saved">`;for(const n of names)h+=`<option value="s:${n.replace(/"/g,"&quot;")}">${n.replace(/</g,"&lt;")}</option>`;h+="</optgroup>";}
  sel.innerHTML=h;$("vName").value=vName;}
$("vLoad").onchange=()=>{const v=$("vLoad").value;$("vLoad").value="";if(!v)return;vPush();
  if(v.startsWith("t:")){vps=tpl(v.slice(2));vName=v.slice(2)[0].toUpperCase()+v.slice(3);}else{const lib=store.get(VLIB,{});vps=JSON.parse(JSON.stringify(lib[v.slice(2)]||[]));vName=v.slice(2);
    if(oldScale(vps)){upscaleOld(vps);vOldNote=true;}}
  partId=Math.max(partId,...vps.map(p=>p.id+1),1);vsel=null;vChanged();vBarUI();vFitView();vOldMsg();};
// say so once, the next time the editor is on screen: the rocket looks different and should be checked (and saved again)
function vOldMsg(){if(!vOldNote)return;vOldNote=false;vMsg("This rocket was built with the old small parts. It's been rebuilt with today's full-size parts: check it, then Save.");vMsgT=performance.now()+8000;}
$("vName").oninput=()=>{vName=$("vName").value.slice(0,40);store.set("throat.vname",vName);};
$("vSaveB").onclick=()=>{const n=(vName||"").trim()||"My rocket";const lib=store.get(VLIB,{});lib[n]=vps;store.set(VLIB,lib);vMsg(`Saved "${n}".`);vBarUI();};
$("vDelB").onclick=()=>{const lib=store.get(VLIB,{}),n=(vName||"").trim();if(lib[n]){delete lib[n];store.set(VLIB,lib);vMsg(`Deleted "${n}".`);vBarUI();}else vMsg("Nothing saved under that name.");};
$("vMirror").onclick=()=>{vMirror=!vMirror;store.set("throat.vmirror",vMirror);vBarUI();};
$("vLegs").onclick=()=>{vLegsOut=!vLegsOut;vBarUI();vInspUI();};$("vUndoB").onclick=vUndo;$("vRedoB").onclick=vRedo;$("vFit").onclick=vFitView;
$("vClear").onclick=()=>{if(!vps.length)return;vPush();vps=[];vsel=null;vChanged();vMsg("Cleared. Ctrl+Z brings it back.");};
$("vBack").onclick=()=>closeVab();
$("vGo").onclick=()=>{const miss=techMissing(vps);if(miss.length){techOpen(`This rocket uses parts you haven't unlocked yet: ${miss.join(", ")}. Unlock them below, or tick “Unlock everything”.`);return;}   // tech tree (v1.38)
  const a=analyze(vps,engineNums());if(a.root<0||!a.stages.length||a.stages[0].twr<=1)return;closeVab(true);startFlight(vps,vName);};
function openVab(){vStageFix();vStgUI();FLT.on=false;FLT.vab=true;$("flight").classList.remove("show");vab.classList.add("show");enter(vab);S.paused=true;cfg();vAn=null;vPalUI();vBarUI();vInspUI();vFitC();vFitView();vOldMsg();requestAnimationFrame(vFrame);}
function closeVab(toFlight){FLT.vab=false;vab.classList.remove("show");vcarry=null;if(!toFlight)enter($("stage"));if(!toFlight){S.paused=$("bPause").classList.contains("on");cfg();}}
$("bLaunch").onclick=openVab;$("vCen").onclick=()=>{vCentres=!vCentres;store.set("throat.vcentres",vCentres);vBarUI();};
// ---------- drawing ----------
let vCentres=store.get("throat.vcentres",true);
let vLegK=0,vLegT=0;
function vFrame(){if(!vab.classList.contains("show"))return;vFitC();const c=vx;
  {const now=performance.now(),dt=Math.min(0.1,(now-(vLegT||now))/1000);vLegT=now;vLegK=Math.max(0,Math.min(1,vLegK+(vLegsOut?1:-1)*dt/0.9));}   // the editor's legs swing too (a little faster)

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
  c.strokeStyle=vMirror?"rgba(255,207,122,.32)":"rgba(255,255,255,.1)";c.lineWidth=2/s;c.setLineDash([8/s,8/s]);c.beginPath();c.moveTo(ax,b.y0-40);c.lineTo(ax,b.y1+80);c.stroke();c.setLineDash([]);   // the centre line
  const T=vps.length?vTree():null,loose=T?vps.map((p,j)=>T.r>=0&&T.par[j]===-2):[];
  vps.forEach((p,j)=>{const gone=vdrag&&vdrag.dropTwin&&vdrag.tset.has(j);if(gone)c.globalAlpha=0.25;else if(loose[j])c.globalAlpha=0.45;   /* parked parts: faded */
    if(loose[j]&&!gone){c.save();c.strokeStyle="rgba(255,207,122,.7)";c.lineWidth=1.5/s*VDS;c.setLineDash([5/s,4/s]);c.strokeRect(p.x-p.w/2-3,p.y-3,p.w+6,p.h+6);c.restore();}
    drawPart(c,p,{legs:vLegK,brake:vLegK*0.8,open:vLegsOut,sel:p.id===vsel,bad:gone||(vdrag&&vdrag.bad&&(vdrag.set.has(j)||vdrag.tset.has(j))),lw:3/s*VDS});c.globalAlpha=1;});
  for(const sh of shroudsOf(vps))drawShroud(c,sh,0.8);
  {const r=vRoot();if(r>=0){const p=vps[r],d=6/s*VDS,cx=p.x-p.w/2+d*1.6,cy=p.y+d*1.6;c.fillStyle="#ff3b30";c.strokeStyle="#fff";c.lineWidth=1.2/s;c.beginPath();c.moveTo(cx,cy-d);c.lineTo(cx+d,cy);c.lineTo(cx,cy+d);c.lineTo(cx-d,cy);c.closePath();c.fill();c.stroke();}}   // the root part
  for(const p of vps)if(p.t==="fair")drawFairing(c,p,0.3);   // fairing shells, see-through so you can build the payload inside
  if(vcarry&&vcarry.inside!==false&&vcarry.p.kit){const B=vcarry.p,sn=vcarry.snap,L=kitParts(B,sn?sn.x:B.x,sn?sn.y:B.y,B.t==="fin"&&sn?sn.f:1);if(sn)hangSdec(L,vps);c.globalAlpha=0.75;   // a kit: its parts as ghosts
    for(const p of L)drawPart(c,p,{ghost:!!sn,bad:!sn,legs:vLegsOut,lw:2/s*VDS});
    if(vMirror&&sn&&Math.abs(sn.x-ax)>0.5){c.globalAlpha=0.4;for(const p of L)drawPart(c,{...p,x:2*ax-p.x,f:-p.f},{ghost:true,lw:2/s*VDS});}c.globalAlpha=1;}
  else if(vcarry&&vcarry.inside!==false){const p={...vcarry.p},sn=vcarry.snap;if(sn){if(sn.m)Object.assign(p,sn.m);p.x=sn.x;p.y=sn.y;p.f=sn.f;}c.globalAlpha=sn?0.75:0.45;
    const bad=!sn&&vps.some(o=>collide(p,o));drawPart(c,p,{ghost:!bad,bad,legs:vLegsOut,lw:2/s*VDS});
    if(vMirror&&sn&&Math.abs(p.x-ax)>0.5){const t={...p,x:2*ax-p.x,f:-p.f};c.globalAlpha=0.4;drawPart(c,t,{ghost:true,lw:2/s*VDS});}c.globalAlpha=1;}
  if(vStgHi){c.strokeStyle="#ffcf7a";c.lineWidth=3/s*VDS;for(const p of vps)if(vStgHi.has(p.id))c.strokeRect(p.x-p.w/2-4,p.y-4,p.w+8,p.h+8+(p.t==="fair"?p.fh||120:0));}   // the parts of the stage icon under the mouse
  if(vCentres&&vps.length)drawCentres(c,centres(vps),1/s,true);   // centre of mass, lift, thrust
  c.setTransform(1,0,0,1,0,0);
  {c.font=`600 ${11*VDS}px Rajdhani, sans-serif`;c.textBaseline="middle";   // which Space fires each decoupler (S1 = the first)
    for(const p of vps)if(p.sg&&(p.t==="dec"||p.t==="sdec"||p.t==="fair")){const side=p.t==="sdec"?p.f:1,X=vv.ox+(p.x+side*(p.w/2+6/s*VDS))*s,Y=vv.oy-(p.y+p.h/2)*s,t="S"+p.sg,tw=c.measureText(t).width;
      c.fillStyle="rgba(194,59,46,.92)";c.fillRect(side>0?X:X-tw-8*VDS,Y-7*VDS,tw+8*VDS,14*VDS);c.fillStyle="#fff";c.textAlign="left";c.fillText(t,(side>0?X:X-tw-8*VDS)+4*VDS,Y+0.5);}}
  if(vMsgT&&performance.now()>vMsgT){$("vMsg").style.display="none";vMsgT=0;}
  vStatsUI();requestAnimationFrame(vFrame);}
window.__vab={drawPart,mkPart,get vps(){return vps;},get sel(){return vsel;},w2c:(x,y)=>{const r=vcv.getBoundingClientRect();return{x:r.left+(vv.ox+x*vv.s)*r.width/VW,y:r.top+(vv.oy-y*vv.s)*r.height/VH};}};
// fold-away panels in the editor too (phones keep their own strip layout)
if(!SMALL)foldUI(vab,"vab",[{el:$("vPal"),label:"PARTS",side:"l",open:true,title:"Parts to drag onto the rocket"},{el:document.querySelector(".vstat"),label:"ROCKET",side:"r",open:true,title:"Rocket stats: mass, Δv and thrust per stage"},{el:document.querySelector(".vstg"),label:"STAGES",side:"r",open:true,title:"Stages: drag engines, decouplers and fairings between stages"}]);
// ---------- sharing rockets as a code ----------
// "Share" turns the rocket into a short line of text (THROAT-R1:...) you can paste into an email or a chat; pasting one in
// loads that rocket. Only the shape travels (each part's type, size, place and settings), so a code made today still loads
// after the game changes. Where the browser can, the text is zipped first (deflate), which makes it about a third as long.
const SHARE_KEYS=["id","t","x","y","w","h","f","tw","e","b","k","w2","ns","sk","n","v","fh","tc","sb","es","root","sg"];
const b64=u8=>{let s="";for(const c of u8)s+=String.fromCharCode(c);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
const unb64=t=>{const s=atob(t.replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(s,c=>c.charCodeAt(0));};
async function pipeBytes(u8,how){const st=new Blob([u8]).stream().pipeThrough(how);return new Uint8Array(await new Response(st).arrayBuffer());}
async function rocketCode(ps,name){
  const parts=ps.map(p=>{const q={};for(const k of SHARE_KEYS)if(p[k]!=null&&p[k]!==0||k==="x"||k==="y")q[k]=typeof p[k]==="number"?Math.round(p[k]*10)/10:p[k];return q;});
  const raw=new TextEncoder().encode(JSON.stringify({v:1,name,parts}));
  if(typeof CompressionStream!=="undefined"){try{return"THROAT-R1z:"+b64(await pipeBytes(raw,new CompressionStream("deflate-raw")));}catch(e){}}
  return"THROAT-R1:"+b64(raw);}
async function rocketFromCode(code){
  const m=/THROAT-R1(z?):([A-Za-z0-9_-]+)/.exec(code.replace(/\s+/g,""));if(!m)throw new Error("That doesn't look like a rocket code (it starts with THROAT-R1).");
  if(m[1]&&typeof DecompressionStream==="undefined")throw new Error("This browser can't unzip codes: try Chrome.");
  let d;try{let raw=unb64(m[2]);if(m[1])raw=await pipeBytes(raw,new DecompressionStream("deflate-raw"));d=JSON.parse(new TextDecoder().decode(raw));}
  catch(e){throw new Error("That code is damaged: make sure you copied all of it.");}if(!d||!Array.isArray(d.parts)||!d.parts.length||d.parts.length>300)throw new Error("The code has no rocket in it.");
  // check every part before trusting it: known type, sensible numbers; then give the parts fresh ids (twins keep their pairing)
  const ids=new Map();const ps=d.parts.map(q=>{if(!PT[q.t])throw new Error("Unknown part: "+q.t);const p={};
    for(const k of SHARE_KEYS)if(q[k]!=null)p[k]=q[k];for(const k of["x","y","w","h"])if(!isFinite(p[k]=+p[k]||0)||Math.abs(p[k])>5000)throw new Error("A part is the wrong size.");
    if(!(p.w>0&&p.h>0))throw new Error("A part is the wrong size.");p.f=p.f===-1?-1:1;if(p.e&&!ENG[p.e])p.e="stand";if(p.b&&!BOOST[p.b])p.b="stand";
    const nid=partId++;ids.set(q.id,nid);p.id=nid;return p;});
  for(const p of ps)p.tw=p.tw?ids.get(p.tw)||0:0;
  if(oldScale(ps))upscaleOld(ps);
  return{ps,name:String(d.name||"Shared rocket").slice(0,40)};}
const shr=document.createElement("div");shr.className="help";shr.innerHTML=`<div class="card"><h2>Share a rocket</h2>
  <h3>This rocket</h3><p class="tip">Copy this code and send it (email, chat). Whoever pastes it below gets this exact rocket.</p>
  <textarea id="shOut" class="shcode" readonly rows="3"></textarea><div class="row"><button class="b go" id="shCopy" data-ic="share">Copy code</button><span class="tip" id="shMsg"></span></div>
  <h3 style="margin-top:12px">Load a rocket from a code</h3><textarea id="shIn" class="shcode" rows="3" placeholder="Paste a THROAT-R1 code here"></textarea>
  <div class="row"><button class="b go" id="shLoad">Load it</button><span class="tip" id="shErr"></span></div>
  <p class="tip" style="margin:10px 0 0">A loaded rocket replaces the one in the editor (Undo brings it back). Esc to close.</p></div>`;
vab.appendChild(shr);shr.querySelectorAll("[data-ic]").forEach(b=>{b.innerHTML=ico(b.dataset.ic)+b.innerHTML;});
const shClose=()=>shr.classList.remove("show");shr.onclick=e=>{if(e.target===shr)shClose();};
shr.addEventListener("keydown",e=>{if(e.key==="Escape")shClose();});
$("vShare").onclick=async()=>{$("shOut").value="…";$("shMsg").textContent="";$("shErr").textContent="";$("shIn").value="";shr.classList.add("show");
  $("shOut").value=await rocketCode(vps,vName||"My rocket");$("shOut").select();};
$("shCopy").onclick=async()=>{const t=$("shOut");t.select();let ok=false;try{await navigator.clipboard.writeText(t.value);ok=true;}catch(e){try{ok=document.execCommand("copy");}catch(e2){}}
  $("shMsg").textContent=ok?"Copied.":"Select the code and copy it (Ctrl+C).";};
$("shLoad").onclick=async()=>{try{const r=await rocketFromCode($("shIn").value);vPush();vps=r.ps;vName=r.name;$("vName").value=vName;
    partId=Math.max(partId,...vps.map(p=>p.id+1),1);vsel=null;vChanged();vBarUI();vFitView();shClose();vMsg(`Loaded "${vName}". Save it to keep it.`);}
  catch(e){$("shErr").textContent=e.message||"That code didn't work.";}};
window.__share={rocketCode,rocketFromCode};
