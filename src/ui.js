// ================= UI / RENDER (browser only) =================
if(typeof document!=="undefined")(()=>{
// ---------- icons: one small line-icon set for every button (emoji look different on every computer and read as cheap) ----------
// each icon is a list of strokes on a 24×24 grid: "M…" path data, or "o cx cy r" for a circle
const ICP={
  trophy:["M8 21h8","M12 17v4","M7 4h10v5a5 5 0 0 1-10 0z","M17 5h3v2a3 3 0 0 1-3 3","M7 5H4v2a3 3 0 0 0 3 3"],
  sound:["M11 5 6 9H3v6h3l5 4z","M15.5 8.5a5 5 0 0 1 0 7","M18.5 5.5a9 9 0 0 1 0 13"],mute:["M11 5 6 9H3v6h3l5 4z","M22 9l-6 6","M16 9l6 6"],
  help:["o 12 12 9","M9.6 9.2a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .8-1 1.6","M12 16.8v.2"],reload:["M20 12a8 8 0 1 1-2.4-5.7","M20 4v5h-5"],
  pause:["M9 5v14","M15 5v14"],lock:["M6 11h12v10H6z","M8 11V7a4 4 0 0 1 8 0v4"],flask:["M9 3h6","M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3","M7.5 15h9"],eye:["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z","o 12 12 3"],eyeoff:["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z","M4 20 20 4"],
play:["M8 5l11 7-11 7z"],globe:["o 12 12 9","M3 12h18","M12 3c-3 3.5-3 14.5 0 18","M12 3c3 3.5 3 14.5 0 18"],
  vacuum:["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],clear:["M3 8h10a3 3 0 1 0-3-3","M3 16h13a3 3 0 1 1-3 3","M3 12h17"],
  undo:["M9 14 4 9l5-5","M4 9h10a6 6 0 0 1 0 12h-3"],redo:["M15 14l5-5-5-5","M20 9H10a6 6 0 0 0 0 12h3"],
  folder:["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],book:["M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z","M5 18a2 2 0 0 1 2-2h12","M9 8h6"],
  rocket:["M12 2c3 2.2 5 6 5 10l-2 4H9l-2-4c0-4 2-7.8 5-10z","M12 9.5v.1","M9 16l-3 3.5","M15 16l3 3.5","M10.5 20h3"],
  save:["M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z","M8 3v5h7V3","M8 21v-7h8v7"],trash:["M4 7h16","M10 11v6","M14 11v6","M6 7l1 13h10l1-13","M9 7V4h6v3"],
  mirror:["M12 3v18","M8 7 3 12l5 5z","M16 7l5 5-5 5z"],legs:["M12 4v8","M12 12l-6 8","M12 12l6 8","M3.5 20h5","M15.5 20h5"],fit:["M4 9V4h5","M20 9V4h-5","M4 15v5h5","M20 15v5h-5"],
  stage:["M12 4l7 8H5z","M5 17h14"],centre:["o 12 12 7","M12 5v14","M5 12h14"],chute:["M4 11a8 8 0 0 1 16 0z","M4 11l8 9 8-9","M12 11v9"],abort:["M12 3l10 18H2z","M12 10v5","M12 18v.1"],rcs:["o 12 12 3","M12 2v5","M12 17v5","M2 12h5","M17 12h5"],warp:["M3 6l8 6-8 6z","M12 6l8 6-8 6z"],map:["M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z","M9 4v14","M15 6v14"],
  build:["M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"],back:["M19 12H5","M11 6l-6 6 6 6"],
  warpdn:["M21 6l-8 6 8 6z","M12 6l-8 6 8 6z"],share:["M12 3v12","M7 8l5-5 5 5","M5 13v7h14v-7"],flame:["M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.8 2.2-5 .1 2 1 3.2 2.3 3.5-.9-3 .2-6 .5-8.5z"],rotl:["M4 13a8 8 0 1 0 2.3-6.3","M4 3v4.5h4.5"],rotr:["M20 13a8 8 0 1 1-2.3-6.3","M20 3v4.5h-4.5"],plus:["M12 5v14","M5 12h14"],minus:["M5 12h14"]};
function ico(n){return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${(ICP[n]||[]).map(d=>d[0]==="o"?(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`)(d.slice(2).split(" ")):`<path d="${d}"/>`).join("")}</svg>`;}
const SANS='"Inter","Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif';
const MONO='ui-monospace,"Cascadia Mono","SF Mono","JetBrains Mono",Menlo,Consolas,monospace';   // numbers drawn on canvases
function icoBtn(el,n,label){el.innerHTML=ico(n)+(label?`<span>${label}</span>`:"");}
document.querySelectorAll("[data-ic]").forEach(el=>el.insertAdjacentHTML("afterbegin",ico(el.dataset.ic)));
const CP=4,W=NX*CP,H=NY*CP;                              // world "pixels", 4 per cell (640×360 in the normal-size world)
const SMALL=matchMedia("(max-width:900px),(max-height:520px)").matches;
const TXT=W/640*(SMALL?1.8:1);                                        // (phones: bigger, the screen is small) labels drawn in the world grow with it so they stay the same size on screen
const cv=document.getElementById("cv"),ctx=cv.getContext("2d");
// The canvas always has exactly as many pixels as the screen shows (times the display's pixel density),
// so labels and numbers drawn on it stay sharp at any window size and on high-res screens.
let CW=1280,CH=720,DS=2,SS=1;   // SS: screen scale for text drawn on top
function fitCanvas(){const r=cv.getBoundingClientRect(),dpr=Math.min(3,window.devicePixelRatio||1),w=Math.max(480,Math.round((r.width||1280)*dpr)),h=Math.round(w*9/16);
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}CW=cv.width;CH=cv.height;DS=CW/W;SS=CW/1280;}
fitCanvas();addEventListener("resize",fitCanvas);if(window.ResizeObserver)new ResizeObserver(fitCanvas).observe(cv);
// gas: one pixel per cell, stretched smoothly by the GPU
const cimg=document.createElement("canvas");cimg.width=NX;cimg.height=NY;const cctx=cimg.getContext("2d");
const cdat=cctx.createImageData(NX,NY),cbuf=new Uint32Array(cdat.data.buffer);
const pimg=document.createElement("canvas");pimg.width=NX;pimg.height=NY;const pctx=pimg.getContext("2d"),pdat=pctx.createImageData(NX,NY),pbuf=new Uint32Array(pdat.data.buffer);
// walls: hand-made pixel art, 8 pixels per cell, rebuilt only when walls change
const WS=2,WW=W*WS,WH=H*WS,WCP=CP*WS;
const off=document.createElement("canvas");off.width=WW;off.height=WH;const octx=off.getContext("2d");
const img=octx.createImageData(WW,WH),buf=new Uint32Array(img.data.buffer);
const rgb=(r,g,b)=>(0xff000000|((b>255?255:b<0?0:b)<<16)|((g>255?255:g<0?0:g)<<8)|(r>255?255:r<0?0:r))>>>0;
const $=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString();
const ramp=stops=>{const C=[];for(let i=0;i<256;i++){const v=i/255;let j=0;while(j<stops.length-2&&v>stops[j+1][0])j++;const[a,ca]=stops[j],[b,cb]=stops[j+1],u=(v-a)/(b-a);C.push(ca.map((x,k)=>x+(cb[k]-x)*u));}return C;};
const EXH=ramp([[0,[10,10,26]],[.25,[58,34,128]],[.5,[118,86,214]],[.75,[214,150,236]],[.9,[255,214,230]],[1,[255,250,252]]]);
const FIRE=ramp([[0,[50,10,4]],[.3,[180,45,12]],[.6,[255,140,30]],[.85,[255,225,140]],[1,[255,250,230]]]);
const MAP=ramp([[0,[16,20,48]],[.22,[60,36,130]],[.45,[30,130,200]],[.65,[90,210,140]],[.82,[250,205,70]],[1,[255,80,45]]]);
const MACH=ramp([[0,[16,20,48]],[.33,[40,90,190]],[.34,[240,240,240]],[.36,[250,190,60]],[.7,[240,80,60]],[1,[255,230,230]]]);
// "Real" view, like a photo of a hydrogen engine: pink-magenta jet, white where shocks squeeze it (Mach diamonds),
// blue where it's stretched cold and fast just past the nozzle, orange→red where it cools at the edges. Cold gas is invisible.
const REAL=ramp([[0,[0,0,0]],[.115,[45,9,2]],[.231,[170,60,20]],[.346,[230,90,90]],[.442,[240,95,165]],[.519,[235,100,210]],[.615,[215,110,240]],[.769,[235,175,250]],[1,[255,235,255]]]);
const SPC=[[90,225,245],[95,135,255],[150,156,175],[225,232,240],[140,205,150],[245,240,225],[250,205,90],[205,125,60]];
const SPN=["H₂","O₂","N₂","H₂O","CO₂","Al₂O₃ smoke","CH₄","Kerosene"];
const GASES=[{name:"H₂",Y:[1,0,0,0],sw:"#5ae1f5"},{name:"O₂",Y:[0,1,0,0],sw:"#6f93ff"},{name:"N₂",Y:[0,0,1,0],sw:"#969caf"},
  {name:"H₂O",Y:[0,0,0,1],sw:"#e1e8f0"},{name:"CO₂",Y:[0,0,0,0,1,0],sw:"#8ccd96"},{name:"CH₄",Y:[0,0,0,0,0,0,1,0],sw:"#facd5a"},{name:"Kerosene",Y:[0,0,0,0,0,0,0,1],sw:"#cd7d3c"},{name:"H₂+O₂ 2:1",Y:MIXY,sw:"linear-gradient(90deg,#5ae1f5 50%,#6f93ff 50%)"},{name:"Air",Y:AIRY,sw:"#7d8aa8"}];
const gasCol=name=>({"H₂":"#5ae1f5","O₂":"#6f93ff","N₂":"#a3a9bd","H₂O":"#e1e8f0","Air":"#8b98b8","CH₄":"#facd5a","Kerosene":"#cd7d3c"}[name]||"#9fb8ff");
const S={tool:"select",gas:4,brush:6,P:30*PSI_PA,T:300,view:6,paused:false,spd:10,inf:true,vlen:6,vdir:0,pw:2,ilen:9,idir:0,itype:"straight",scen:"engine"};
const cam={z:1,x:0,y:0};
let wallsDirty=true,mouse={x:-1,y:-1,in:false,down:false,btn:0,lx:-1,ly:-1,touch:false},drag=null,pan=null,grab=null,sel=null;
const byId=(arr,id)=>arr.find(o=>o.id===id);
const selObj=()=>!sel?null:sel.kind==="valve"?byId(valves,sel.id):sel.kind==="plug"?byId(plugs,sel.id):sel.kind==="inj"?byId(injs,sel.id):sel.kind==="check"?byId(checks,sel.id):byId(tanks,sel.id);
const lineKind=k=>k==="valve"||k==="inj"||k==="check";

// ---------- colours per cell ----------
const CR=new Float32Array(NC),CG=new Float32Array(NC),CB=new Float32Array(NC);
const r0=rs[0],r1=rs[1],r2=rs[2],r3=rs[3],r4=rs[4],r5=rs[5],r6=rs[6],r7=rs[7];
function cellColors(){
  const view=S.view;
  for(let k=0;k<NC;k++){
    if(wall[k])continue;
    const r=rho[k],u=mx[k]/r,v=my[k]/r,q2=u*u+v*v;let p=(GAM-1)*(En[k]-0.5*r*q2);if(p<1)p=1;
    let x0=r0[k]/MW[0],x1=r1[k]/MW[1],x2=r2[k]/MW[2],x3=r3[k]/MW[3],x4=r4[k]/MW[4],x5=r5[k]/MW[5],x6=r6[k]/MW[6],x7=r7[k]/MW[7];const ns=x0+x1+x2+x3+x4+x5+x6+x7;x0/=ns;x1/=ns;x2/=ns;x3/=ns;x4/=ns;x5/=ns;x6/=ns;x7/=ns;   // mole fractions
    const sm=r5[k];
    const T=p/(RU*ns);let c0=10,c1=13,c2=24;
    if(view===6){
      const T0=T+q2*r*(GAM-1)/(2*GAM*RU*ns),Te=0.2*T+0.8*T0;
      if(Te>600){const tr=T<T0?T/T0:1,c=REAL[Math.min(255,(Te-600)*0.0981)|0],hot=(0.4+0.6*x3)*Math.min(1.15,Math.max(0.6,Math.pow(p/101325,0.12)));
        const M=Math.sqrt(q2*r/(GAM*p)),sq=Math.min(1,Math.max(0,(tr-0.5)*5)),L=0.8+2.0*sq*sq*(M<1?M:1);      // shocked fast gas (Mach diamonds) flares
        const bl=Te>1500?0.75*Math.min(1,Math.max(0,(0.6-tr)/0.18))*Math.min(1,(Te-1500)/600):0;               // stretched fast gas turns blue
        const w=hot*L;c0+=(c[0]*(1-bl)+90*bl)*w;c1+=(c[1]*(1-bl)+120*bl)*w;c2+=(c[2]*(1-bl)+255*bl)*w;}
      const f=rr[k];if(f>1e4){const fr=Math.min(1,(Math.log10(f)-4)/3);c0+=230*fr;c1+=130*fr;c2+=40*fr;}   // actively burning: warm flicker
      // carbon fuels. Share of CO₂ in the exhaust: 0 for hydrogen, 1/3 for methane, 1/2 for kerosene.
      // Methane burns clean: its hot exhaust glows blue-violet. Kerosene runs rich and makes soot: unburnt fuel in hot gas
      // glows bright orange-yellow (like a candle flame), and turns to dark grey smoke once it cools.
      const xc=x4/(x3+x4+1e-9),yk=r7[k]/r;
      if(sm<=2e-5&&xc>0.15&&yk<0.004){const t=Math.min(1,(xc-0.15)/0.15)*(xc>0.42?0:1),L=Math.max(c0,c1,c2);
        if(t>0){c0=c0*(1-0.8*t)+L*0.55*0.8*t;c1=c1*(1-0.8*t)+L*0.42*0.8*t;c2=c2*(1-0.8*t)+L*1.05*0.8*t;}
        else if(xc>0.42){c0=c0*0.35+L*0.65;c1=c1*0.35+L*0.45;c2=c2*0.35+L*0.18;}}   // burnt-out kerosene exhaust: warm orange
      if(yk>3e-4){const T0=T+q2*r*(GAM-1)/(2*GAM*RU*ns),Te=0.2*T+0.8*T0,soot=Math.min(1,yk*18);
        if(Te>1000){const g=soot*Math.min(1,(Te-1000)/900)*1.25;c0+=255*g;c1+=150*g;c2+=45*g;}
        else{const so=Math.min(0.7,soot*0.9)*Math.min(1,(1000-Te)/300);c0=c0*(1-so)+48*so;c1=c1*(1-so)+44*so;c2=c2*(1-so)+42*so;}}
    }
    if((view===6||view===0)&&sm>2e-5){   // solid-motor exhaust: hot aluminium-oxide particles glow orange → yellow → white, then hang as grey-white smoke
      const ys=sm/r,ws=Math.min(1,ys*3.4),T0=T+q2*r*(GAM-1)/(2*GAM*RU*ns),Tp=0.25*T+0.75*T0,den=1-Math.exp(-sm*14);
      {const t=Math.min(0.85,ys*12),L=Math.max(c0,c1,c2);c0=c0*(1-t)+L*t;c1=c1*(1-t)+L*0.6*t;c2=c2*(1-t)+L*0.25*t;}   // flame burning in booster exhaust is orange, not hydrogen-pink
      const h=Math.min(1,Math.max(0,(Tp-1150)/1450)),gl=h>0?Math.min(1,0.35+den*3)*Math.min(1,h*1.8):0,so=Math.min(0.72,den*1.1)*(1-gl);
      const pg=110+140*h,pb=25+200*h*h,sv=135+45*(1-h),keep=(1-ws*0.85)*(1-so);
      c0=c0*keep+sv*so+255*gl*ws;c1=c1*keep+sv*0.98*so+pg*gl*ws;c2=c2*keep+sv*0.96*so+pb*gl*ws;}
    if(view===6||view===0){}
    else if(view<=1){
      const den=Math.min(1,Math.max(0,0.12+0.32*(Math.log10(p*300/T)-5.0058)));
      const tr=SPC[0][0]*x0+SPC[1][0]*x1+SPC[2][0]*x2+SPC[3][0]*x3+SPC[4][0]*x4+SPC[5][0]*x5+SPC[6][0]*x6+SPC[7][0]*x7,tg=SPC[0][1]*x0+SPC[1][1]*x1+SPC[2][1]*x2+SPC[3][1]*x3+SPC[4][1]*x4+SPC[5][1]*x5+SPC[6][1]*x6+SPC[7][1]*x7,tb=SPC[0][2]*x0+SPC[1][2]*x1+SPC[2][2]*x2+SPC[3][2]*x3+SPC[4][2]*x4+SPC[5][2]*x5+SPC[6][2]*x6+SPC[7][2]*x7;
      const f=view===1?Math.max(0.25,den):(x2>0.6?den*0.45:den);c0=10+tr*f;c1=13+tg*f;c2=24+tb*f;
      if(view===0){
        const T0=T+q2*r*(GAM-1)/(2*GAM*RU*ns),tq=Math.min(1.3,T/2300),t0=Math.min(1.2,T0/2300),em=(0.3+0.7*x3)*(0.2*t0*t0*t0*t0+1.2*tq*tq*tq);
        const g=rr[k];if(g>1e4){const fr=Math.min(1,(Math.log10(g)-4)/3),c=FIRE[Math.min(255,(0.4+0.6*Math.min(1,(T-700)/2600))*255)|0];c0=Math.max(c0,c[0]*fr);c1=Math.max(c1,c[1]*fr);c2=Math.max(c2,c[2]*fr);}
        if(em>0.05){const c=EXH[Math.min(238,(Math.log10(em)+1.3)*185)|0];c0=Math.max(c0,c[0]);c1=Math.max(c1,c[1]);c2=Math.max(c2,c[2]);}
      }
    }else{let c;
      if(view===2)c=MAP[Math.max(0,Math.min(255,(Math.log10(p/PSI_PA)+0.3)/2.9*255))|0];
      else if(view===3)c=MAP[Math.max(0,Math.min(255,(Math.log10(T)-2.3)/1.35*255))|0];
      else if(view===4)c=MACH[Math.min(255,Math.sqrt(q2*r/(GAM*p))/3*255)|0];
      else{const x=k%NX,y=(k/NX)|0,xl=x>0&&!wall[k-1]?rho[k-1]:r,xr=x<NX-1&&!wall[k+1]?rho[k+1]:r,yu=y>0&&!wall[k-NX]?rho[k-NX]:r,yd=y<NY-1&&!wall[k+NX]?rho[k+NX]:r;
        const sch=resv[k]?0:Math.min(1,Math.hypot(xr-xl,yd-yu)/(r+0.05)*3.2),b=10+225*Math.pow(sch,0.7);c=[b*0.95,b,b*1.08];}
      c0=c[0];c1=c[1];c2=c[2];}
    CR[k]=c0;CG[k]=c1;CB[k]=c2;
  }
  // solid cells borrow a neighbour's colour so the smooth stretch doesn't bleed dark into the gas
  for(let k=0;k<NC;k++){if(!wall[k])continue;const x=k%NX;let n=-1;
    if(x>0&&!wall[k-1])n=k-1;else if(x<NX-1&&!wall[k+1])n=k+1;else if(k>=NX&&!wall[k-NX])n=k-NX;else if(k+NX<NC&&!wall[k+NX])n=k+NX;
    if(n>=0){CR[k]=CR[n];CG[k]=CG[n];CB[k]=CB[n];}else{CR[k]=10;CG[k]=13;CB[k]=24;}}
}

// ---------- walls as an engineering cutaway (phase 2) ----------
// Solid metal is drawn the way a technical drawing shows a cut: dark fill with thin 45° section lines, and a crisp white line
// along every edge that touches gas or the outside, so the engine reads as a clean outline.
const hash=(x,y)=>{let h=(x*374761393+y*668265263)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))&255)/255;};
function buildWalls(){
  buf.fill(0);
  const solid=j=>j>=0&&j<NC&&wall[j]!==0;
  for(let cy=0;cy<NY;cy++)for(let cx=0;cx<NX;cx++){const k=cy*NX+cx;if(wall[k]!==1)continue;
    const up=cy>0&&solid(k-NX),dn=cy<NY-1&&solid(k+NX),lf=cx>0&&solid(k-1),rt=cx<NX-1&&solid(k+1);
    for(let j=0;j<WCP;j++)for(let i=0;i<WCP;i++){
      const px=cx*WCP+i,py=cy*WCP+j;
      if((!up&&!lf&&i+j<2)||(!up&&!rt&&(WCP-1-i)+j<2)||(!dn&&!lf&&i+(WCP-1-j)<2)||(!dn&&!rt&&(WCP-1-i)+(WCP-1-j)<2))continue;  // rounded outer corners
      let r=14,g=22,b=36;
      if(((px+py)%6)===0){r=34;g=48;b=70;}                                   // section hatching
      const edge=(!up&&j<2)||(!dn&&j>WCP-3)||(!lf&&i<2)||(!rt&&i>WCP-3);
      if(edge){r=232;g=238;b=246;}                                           // the outline
      buf[py*WW+px]=rgb(r,g,b);}}
  octx.putImageData(img,0,0);wallsDirty=false;engGeo=findEngine();
}

// ---------- measuring the engine: dimension lines on the drawing ----------
// Start at the first injector plate and walk along the flow, measuring the gap between the walls at each step. The narrowest
// point after the chamber is the throat; where the walls stop is the exit. Works for engines facing any of the four ways.
let engGeo=null;
function findEngine(){const o=injs[0];if(!o)return null;
  const along=o.dir?[0,1]:[1,0],acrossV=o.dir?[1,0]:[0,1],c0=o.dir?o.x+(o.len-1)/2:o.x,r0=o.dir?o.y:o.y+(o.len-1)/2;
  const cell=(a,b)=>{const x=Math.round(o.dir?r0*0+c0+b:c0+a),y=Math.round(o.dir?r0+a:r0+b);return x>=0&&y>=0&&x<NX&&y<NY?y*NX+x:-1;};
  const isW=k=>k<0||wall[k]!==0;
  let best=null;
  for(const sg of[1,-1]){const cols=[];let open=false;
    let m=0;   // follow the middle of the gap as it goes (the injector needn't sit on the centre line)
    for(let i=1;i<NX+NY;i++){const a=sg*i;if(isW(cell(a,m))){break;}
      let t=0,b=0;while(t<80&&!isW(cell(a,m-(t+1))))t++;while(b<80&&!isW(cell(a,m+b+1)))b++;
      if(t>=80||b>=80||cell(a,m-(t+1))<0||cell(a,m+b+1)<0){open=true;break;}cols.push({a,t:t-m,b:b+m,g:t+b+1});m=Math.round(m+(b-t)/2);}
    if(open&&cols.length>4&&(!best||cols.length>best.cols.length))best={sg,cols};}
  if(!best)return null;const C=best.cols;let im=0;for(let i=0;i<C.length;i++)if(C[i].g>C[im].g*1.02&&i<C.length*0.7)im=i;
  let it=im;for(let i=im;i<C.length;i++)if(C[i].g<C[it].g)it=i;if(it===im||C[it].g>=C[im].g)return null;
  let ic=im;while(ic<it&&C[ic+1].g>=C[im].g*0.9)ic++;   // where the walls start closing in: end of the chamber
  // world point (cell units) for "along a, across b"
  const P=(a,b)=>o.dir?[c0+b,r0+a]:[c0+a,r0+b];
  return{o,P,sg:best.sg,C,im,it,ic,ie:C.length-1,vert:!!o.dir};}
function drawDims(){const G=engGeo;if(!G||S.view===undefined)return;const zz=cam.z/TXT,fs=6.4/zz,lw=0.55/cam.z,ah=2.2/zz,C=G.C,P=(a,b)=>{const[x,y]=G.P(a,b);return[x*CP+2,y*CP+2];};
  ctx.save();ctx.strokeStyle="rgba(232,238,246,.75)";ctx.fillStyle="rgba(232,238,246,.92)";ctx.lineWidth=lw;ctx.font=`600 ${fs}px ${MONO}`;ctx.textBaseline="middle";
  const arrow=(x0,y0,x1,y1)=>{const d=Math.hypot(x1-x0,y1-y0)||1,ux=(x1-x0)/d,uy=(y1-y0)/d;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
    for(const[px,py,s]of[[x0,y0,1],[x1,y1,-1]]){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+s*ux*ah-uy*ah*0.45,py+s*uy*ah+ux*ah*0.45);ctx.lineTo(px+s*ux*ah+uy*ah*0.45,py+s*uy*ah-ux*ah*0.45);ctx.closePath();ctx.fill();}};
  const label=(x,y,t)=>{const w=ctx.measureText(t).width+3/zz;ctx.fillStyle="rgba(6,10,18,.88)";ctx.fillRect(x-w/2,y-fs*0.7,w,fs*1.4);ctx.fillStyle="rgba(232,238,246,.95)";ctx.textAlign="center";ctx.fillText(t,x,y);ctx.textAlign="left";};
  const across=(i,name)=>{const c=C[i],[x0,y0]=P(c.a,-c.t-0.5),[x1,y1]=P(c.a,c.b+0.5);arrow(x0,y0,x1,y1);const[lx,ly]=P(c.a,-c.t-6);label(lx,ly,`${name} ${c.g.toFixed(0)} cm`);};
  across(G.it,"THROAT");across(G.ie,"EXIT");
  // chamber length: injector face to where the walls start closing in, drawn outside the engine with extension lines
  {const c=C[G.ic],far=Math.max(...C.slice(0,G.ie+1).map(q=>q.b))+8,[x0,y0]=P(C[0].a-G.sg*1,far),[x1,y1]=P(c.a,far),[e0,e1]=P(C[0].a-G.sg*1,C[0].b+1),[f0,f1]=P(c.a,c.b+1);
    ctx.setLineDash([1.5/zz,1.2/zz]);ctx.beginPath();ctx.moveTo(e0,e1);ctx.lineTo(x0,y0);ctx.moveTo(f0,f1);ctx.lineTo(x1,y1);ctx.stroke();ctx.setLineDash([]);
    arrow(x0,y0,x1,y1);label((x0+x1)/2,(y0+y1)/2,`CHAMBER ${Math.abs(c.a-C[0].a)+1} cm`);}
  // live numbers on the drawing: chamber pressure and temperature, exit Mach and pressure (and the expansion ratio)
  const at=(a)=>{const c=C.find(q=>q.a===a),[x,y]=G.P(a,c?(c.b-c.t)/2:0),k=Math.round(y)*NX+Math.round(x);if(k<0||k>=NC||wall[k])return null;const w=cellPrim(k);return{p:w.p,T:w.T,M:Math.hypot(w.u,w.v)/Math.sqrt(GAM*w.p/w.r)};};
  const ch=at(C[Math.floor((G.ic)/2)].a),ex=at(C[G.ie].a);
  if(ch){const c=C[Math.floor(G.ic/2)],[x,y]=P(c.a,-c.t-6);ctx.fillStyle="#ff3b2f";label(x,y,`P ${(ch.p/PSI_PA).toFixed(0)} psi · ${Math.round(ch.T).toLocaleString()} K`);}
  if(ex){const c=C[G.ie],[x,y]=P(c.a+G.sg*7,0);label(x,y-fs*0.8,`MACH ${ex.M.toFixed(2)}`);label(x,y+fs*0.8,`${(ex.p/PSI_PA).toFixed(1)} psi · ε ${(c.g/C[G.it].g).toFixed(1)}`);}
  ctx.restore();}
// ---------- flow streaks ----------
const TM=700,tx=new Float32Array(TM),ty=new Float32Array(TM);let TN=0;
function uvAt(xp,yp){const gx=xp/CP-0.5,gy=yp/CP-0.5,x0=Math.max(0,Math.min(NX-2,gx|0)),y0=Math.max(0,Math.min(NY-2,gy|0)),fx=Math.min(1,Math.max(0,gx-x0)),fy=Math.min(1,Math.max(0,gy-y0));
  let u=0,v=0,w=0;for(let q=0;q<4;q++){const a=q&1,b=q>>1,ww=(a?fx:1-fx)*(b?fy:1-fy),k=(y0+b)*NX+x0+a;if(wall[k]||ww===0)continue;u+=mx[k]/rho[k]*ww;v+=my[k]/rho[k]*ww;w+=ww;}
  return w>0?[u/w,v/w]:[0,0];}
function tracers(dtSum){
  for(let n=0;n<90&&TN<TM;n++){const k=(Math.random()*NC)|0;if(wall[k]||resv[k])continue;const sp=Math.hypot(mx[k],my[k])/rho[k];if(sp<700)continue;
    tx[TN]=((k%NX)+Math.random())*CP;ty[TN]=(((k/NX)|0)+Math.random())*CP;TN++;}
  const s=dtSum/DX*CP;let w=0;
  for(let i=0;i<TN;i++){const[u,v]=uvAt(tx[i],ty[i]);const nx=tx[i]+u*s,ny=ty[i]+v*s;if(nx<0||ny<0||nx>=W||ny>=H)continue;
    const k=((ny/CP)|0)*NX+((nx/CP)|0);if(wall[k]||Math.hypot(u,v)<250)continue;tx[w]=nx;ty[w]=ny;w++;}
  TN=w;
}

// ---------- objects on the canvas (world units, 4 per cell) ----------
function rr4(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function badge(x,y,text,fg,bg){const zz=cam.z/TXT;ctx.font=`700 ${7.5/zz}px ${MONO}`;const w=ctx.measureText(text).width+5/zz,h=9.5/zz;
  rr4(x-w/2,y-h/2,w,h,2/zz);ctx.fillStyle=bg;ctx.fill();ctx.lineWidth=0.6/zz;ctx.strokeStyle=fg;ctx.stroke();ctx.fillStyle=fg;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,x,y+0.3/zz);ctx.textAlign="left";}
function drawTank(t){   // a pressure vessel: white outline, faint fill in its gas colour, pressure written in the corner
  const col=gasCol(t.name),x=t.x0*CP,y=t.y0*CP,w=(t.x1-t.x0+1)*CP,h=(t.y1-t.y0+1)*CP,zz=cam.z;
  ctx.fillStyle=col+"10";ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="rgba(232,238,246,.85)";ctx.lineWidth=0.8/zz;ctx.strokeRect(x+0.6/zz,y+0.6/zz,w-1.2/zz,h-1.2/zz);
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.strokeStyle="rgba(232,238,246,.10)";ctx.lineWidth=0.5/zz;ctx.beginPath();for(let d=-h;d<w;d+=6){ctx.moveTo(x+d,y+h);ctx.lineTo(x+d+h,y);}ctx.stroke();ctx.restore();
  const l1=t.name,l2=`${Math.round(t.P/PSI_PA)} psi${t.inf?" ∞":""}`,fs=Math.min(6.2*TXT/zz,5.6);ctx.font=`600 ${fs}px ${MONO}`;
  const lw=Math.min(w-2,Math.max(ctx.measureText(l1).width,ctx.measureText(l2).width)+3*fs/6);ctx.fillStyle="rgba(6,10,18,.85)";ctx.fillRect(x+1,y+1,lw,fs*2.3);
  ctx.save();ctx.beginPath();ctx.rect(x+1,y+1,w-2,fs*2.4);ctx.clip();ctx.textBaseline="top";ctx.fillStyle=col;ctx.fillText(l1,x+1+fs*0.3,y+1+fs*0.15);ctx.fillStyle="#e8eef6";ctx.fillText(l2,x+1+fs*0.3,y+1+fs*1.15);ctx.restore();
}
function drawValve(v,ghost){   // drawn like a valve on a piping diagram: a bowtie. White when shut, red when open, blinking while it waits
  const zz=cam.z,x=v.x0*CP,y=v.y0*CP,w=(v.x1-v.x0+1)*CP,h=(v.y1-v.y0+1)*CP,dir=v.dir,pend=v.openAt>0,blink=pend&&(performance.now()/180|0)%2;
  ctx.save();if(ghost)ctx.globalAlpha=0.55;
  const on=v.open&&!ghost,col=on||(pend&&blink)?"#ff3b2f":"#e8eef6";
  ctx.lineWidth=0.8/zz;ctx.strokeStyle=col;ctx.fillStyle=on?"rgba(255,59,47,.18)":"rgba(6,10,18,.75)";
  ctx.beginPath();if(dir){ctx.moveTo(x,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w,y);ctx.lineTo(x,y+h);}else{ctx.moveTo(x,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x+w,y);}ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.beginPath();if(dir){ctx.moveTo(x,y);ctx.lineTo(x,y+h);ctx.moveTo(x+w,y);ctx.lineTo(x+w,y+h);}else{ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.moveTo(x,y+h);ctx.lineTo(x+w,y+h);}ctx.stroke();   // flanges
  if(!ghost)badge(x+w/2,y-5/zz,v.key?String(v.key):"–",on||pend?"#ff3b2f":"#e8eef6","rgba(6,10,18,.92)");
  ctx.restore();
}
function drawPlug(p,ghost){
  const zz=cam.z,cx=p.x*CP+2,cy=p.y*CP+2,lit=!ghost&&torchLit(p);
  ctx.save();if(ghost)ctx.globalAlpha=0.55;
  if(lit){const f=p.flash||0.6,r=3.5+3.5*f,g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,"rgba(255,240,190,.95)");g.addColorStop(0.3,"rgba(255,165,60,.6)");g.addColorStop(1,"rgba(255,90,30,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,6.2832);ctx.fill();}
  ctx.beginPath();ctx.arc(cx,cy,2,0,6.2832);ctx.fillStyle="rgba(6,10,18,.85)";ctx.fill();ctx.lineWidth=0.7/zz;ctx.strokeStyle=lit?"#ff3b2f":"#e8eef6";ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-0.4,cy-1.4);ctx.lineTo(cx+0.6,cy-0.1);ctx.lineTo(cx-0.5,cy+0.2);ctx.lineTo(cx+0.4,cy+1.4);ctx.stroke();   // a spark, like the symbol
  if(!ghost)badge(cx+8/zz,cy,p.key?String(p.key):(p.on?"on":"off"),lit?"#ff3b2f":"#e8eef6","rgba(6,10,18,.92)");
  ctx.restore();
}
const INJ_SHORT={straight:"STRAIGHT",impinging:"IMPINGE",angled:"ANGLED",swirl:"SWIRL",pintle:"PINTLE"};
function drawInj(o,ghost){
  const zz=cam.z,x=o.x0*CP,y=o.y0*CP,w=(o.x1-o.x0+1)*CP,h=(o.y1-o.y0+1)*CP,dir=o.dir;
  ctx.save();if(ghost)ctx.globalAlpha=0.6;
  ctx.fillStyle="rgba(14,22,36,.95)";ctx.fillRect(x,y,w,h);ctx.lineWidth=0.7/zz;ctx.strokeStyle="#e8eef6";ctx.strokeRect(x+0.35/zz,y+0.35/zz,w-0.7/zz,h-0.7/zz);
  const nx=dir?0:1,ny=dir?1:0,holes=injHoles(o),mid=(o.len-1)/2;
  holes.forEach((i,hi)=>{const hx=dir?o.x+i:o.x,hy=dir?o.y:o.y+i,cx=hx*CP+2,cy=hy*CP+2;
    ctx.fillStyle="#020407";ctx.fillRect(cx-1.1,cy-1.1,2.2,2.2);
    if(!ghost&&o.type!=="straight"){       // little arrow showing where the jet is steered
      let a=0;if(o.type==="impinging")a=(hi%2?-1:1)*0.7;else if(o.type==="angled")a=(o.flip?-1:1)*0.6;else if(o.type==="swirl")a=(o.flip?-1:1)*0.5;else a=(i<=mid?-1:1)*1.3;
      const ka=(hy-ny)*NX+(hx-nx),kb=(hy+ny)*NX+(hx+nx);let out=1;if(ka>=0&&kb<NC&&!wall[ka]&&!wall[kb])out=pres(ka)<pres(kb)?-1:1;
      const tx=nx*out*Math.cos(a)+(dir?1:0)*Math.sin(a),ty=ny*out*Math.cos(a)+(dir?0:1)*Math.sin(a);
      ctx.strokeStyle="#e8eef6";ctx.lineWidth=0.7/zz;ctx.beginPath();ctx.moveTo(cx+nx*out*2.5,cy+ny*out*2.5);ctx.lineTo(cx+nx*out*2.5+tx*4,cy+ny*out*2.5+ty*4);ctx.stroke();}});
  // name tag only when you point at it or it's selected, so plates packed into an injector face don't clutter
  const mxc=mouse.x/CP,myc=mouse.y/CP,near=mouse.in&&mxc>=o.x0-1&&mxc<=o.x1+2&&myc>=o.y0-1&&myc<=o.y1+2;
  if(!ghost&&(near||(sel&&sel.kind==="inj"&&sel.id===o.id)))badge(dir?x+w/2:x+w+14/zz,dir?y-5/zz:y+h/2,INJ_SHORT[o.type],"#e8eef6","rgba(6,10,18,.92)");
  ctx.restore();
}
function drawCheck(c,ghost){
  const zz=cam.z,x=c.x0*CP,y=c.y0*CP,w=(c.x1-c.x0+1)*CP,h=(c.y1-c.y0+1)*CP,dir=c.dir,f=c.flow||1;
  ctx.save();if(ghost)ctx.globalAlpha=0.6;
  const op=c.open&&!ghost;if(!op){ctx.fillStyle="rgba(6,10,18,.7)";ctx.fillRect(x+0.4/zz,y+0.4/zz,w-0.8/zz,h-0.8/zz);}
  ctx.lineWidth=0.7/zz;ctx.strokeStyle=op?"#ff3b2f":"#e8eef6";ctx.setLineDash(op?[2/zz,1.6/zz]:[]);ctx.strokeRect(x+0.4/zz,y+0.4/zz,w-0.8/zz,h-0.8/zz);ctx.setLineDash([]);
  // the arrow: the only way gas may go
  const nx=dir?0:1,ny=dir?1:0,cx=x+w/2,cy=y+h/2,L=3.6;
  ctx.strokeStyle=c.open&&!ghost?"#ff3b2f":"#e8eef6";ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=0.9/zz;
  ctx.beginPath();ctx.moveTo(cx-nx*f*L,cy-ny*f*L);ctx.lineTo(cx+nx*f*L,cy+ny*f*L);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx+nx*f*(L+1.6),cy+ny*f*(L+1.6));ctx.lineTo(cx+nx*f*L-ny*1.6,cy+ny*f*L-nx*1.6);ctx.lineTo(cx+nx*f*L+ny*1.6,cy+ny*f*L+nx*1.6);ctx.closePath();ctx.fill();
  const mxc=mouse.x/CP,myc=mouse.y/CP,near=mouse.in&&mxc>=c.x0-1&&mxc<=c.x1+2&&myc>=c.y0-1&&myc<=c.y1+2;
  if(!ghost&&(near||(sel&&sel.kind==="check"&&sel.id===c.id)))badge(dir?cx:x+w+12/zz,dir?y-5/zz:cy,"ONE-WAY","#e8eef6","rgba(6,10,18,.92)");
  ctx.restore();
}
function objRect(kind,o){if(kind==="tank")return{x0:o.x0-1,y0:o.y0-1,x1:o.x1+1,y1:o.y1+1};if(kind==="plug")return{x0:o.x,y0:o.y,x1:o.x,y1:o.y};return{x0:o.x0,y0:o.y0,x1:o.x1,y1:o.y1};}
// clicked inside a pipe or a narrow gap? the valve sizes itself to fit straight across it
function gapAt(cx,cy,dir){const k=cy*NX+cx;if(wall[k])return null;let a=0,b=0;
  for(;;){const x=dir?cx-a-1:cx,y=dir?cy:cy-a-1;if(x<0||y<0)return null;if(wall[y*NX+x])break;if(++a>10)return null;}
  for(;;){const x=dir?cx+b+1:cx,y=dir?cy:cy+b+1;if(x>=NX||y>=NY)return null;if(wall[y*NX+x])break;if(++b>10)return null;}
  return{x:dir?cx-a:cx,y:dir?cy:cy-a,len:a+b+1,dir};}
function fitValve(cx,cy){const v=gapAt(cx,cy,0),h=gapAt(cx,cy,1);let f=null;
  if(v&&(!h||v.len<=h.len))f=v;else if(h)f=h;
  return f&&f.len<=12?f:null;}
function ghostValve(){const cx=mouse.x/CP|0,cy=mouse.y/CP|0,f=fitValve(cx,cy);
  if(f)return{...f,x0:f.x,y0:f.y,x1:f.dir?f.x+f.len-1:f.x,y1:f.dir?f.y:f.y+f.len-1,open:false,openAt:0,key:0,fit:true};
  const len=S.vlen,dir=S.vdir,h=Math.floor((len-1)/2);
  const x=Math.max(0,Math.min(NX-(dir?len:1),dir?cx-h:cx)),y=Math.max(0,Math.min(NY-(dir?1:len),dir?cy:cy-h));
  return{x,y,len,dir,x0:x,y0:y,x1:dir?x+len-1:x,y1:dir?y:y+len-1,open:false,openAt:0,key:0};}

// ---------- render ----------
function ghostInj(){const cx=mouse.x/CP|0,cy=mouse.y/CP|0,len=S.ilen,dir=S.idir,h=Math.floor((len-1)/2);
  const x=Math.max(0,Math.min(NX-(dir?len:1),dir?cx-h:cx)),y=Math.max(0,Math.min(NY-(dir?1:len),dir?cy:cy-h));
  return{x,y,len,dir,type:S.itype,gap:3,flip:0,x0:x,y0:y,x1:dir?x+len-1:x,y1:dir?y:y+len-1};}
function render(){
  if(wallsDirty)buildWalls();
  cellColors();
  for(let k=0;k<NC;k++)cbuf[k]=rgb(CR[k]|0,CG[k]|0,CB[k]|0);
  cctx.putImageData(cdat,0,0);
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="low";
  ctx.drawImage(cimg,cam.x/CP,cam.y/CP,NX/cam.z,NY/cam.z,0,0,CW,CH);
  let np=0;for(let k=0;k<NC;k++){if(wall[k]!==4){pbuf[k]=0;continue;}np++;const x=k%NX,y=(k/NX)|0,n=hash(x,y)-0.5;
    let R=148+n*22,G=138+n*20,B=126+n*18;
    if(lit[k]){const e=Math.min(1,0.6+(1-prop[k])*0.8),fl=0.85+0.15*Math.random();R=R*(1-e)+255*e*fl;G=G*(1-e)+(150+60*(1-prop[k]))*e*fl;B=B*(1-e)+60*e*fl;}
    pbuf[k]=(255<<24)|((B|0)<<16)|((G|0)<<8)|(R|0);}
  if(np){pctx.putImageData(pdat,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(pimg,cam.x/CP,cam.y/CP,NX/cam.z,NY/cam.z,0,0,CW,CH);ctx.imageSmoothingEnabled=true;}
  const zz=cam.z;ctx.setTransform(DS*zz,0,0,DS*zz,-cam.x*DS*zz,-cam.y*DS*zz);
  if(TN&&S.view!==6){ctx.globalCompositeOperation="lighter";ctx.strokeStyle="rgba(255,236,250,0.2)";ctx.lineWidth=0.7;ctx.beginPath();
    for(let i=0;i<TN;i++){const[u,v]=uvAt(tx[i],ty[i]),sp=Math.hypot(u,v)||1,L=Math.min(8,sp/320);ctx.moveTo(tx[i],ty[i]);ctx.lineTo(tx[i]-u/sp*L,ty[i]-v/sp*L);}
    ctx.stroke();ctx.globalCompositeOperation="source-over";}
  // blueprint grid: fine every cell (1 cm) once you're zoomed in enough to see it, bolder every 10 cm
  if(CP*DS*zz>=6){ctx.strokeStyle="rgba(120,170,255,0.045)";ctx.lineWidth=0.5/zz;ctx.beginPath();for(let x=CP;x<W;x+=CP){ctx.moveTo(x,0);ctx.lineTo(x,H);}for(let y=CP;y<H;y+=CP){ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke();}
  ctx.strokeStyle="rgba(120,170,255,0.11)";ctx.lineWidth=0.7/zz;ctx.beginPath();
  for(let x=40;x<W;x+=40){ctx.moveTo(x,0);ctx.lineTo(x,H);}for(let y=40;y<H;y+=40){ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke();
  for(const t of tanks)drawTank(t);
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(off,cam.x*WS,cam.y*WS,WW/cam.z,WH/cam.z,0,0,CW,CH);
  ctx.setTransform(DS*zz,0,0,DS*zz,-cam.x*DS*zz,-cam.y*DS*zz);
  drawDims();
  for(const v of valves)drawValve(v,false);
  for(const o of injs)drawInj(o,false);
  for(const c of checks)drawCheck(c,false);
  for(const p of plugs)drawPlug(p,false);
  // selection
  const so=selObj();
  if(so){const R=objRect(sel.kind,so),t=performance.now()/120;ctx.lineWidth=1/zz;ctx.strokeStyle="#ffaa28";ctx.setLineDash([3/zz,2/zz]);ctx.lineDashOffset=-t/zz;
    ctx.strokeRect(R.x0*CP-1.5/zz,R.y0*CP-1.5/zz,(R.x1-R.x0+1)*CP+3/zz,(R.y1-R.y0+1)*CP+3/zz);ctx.setLineDash([]);
    if(lineKind(sel.kind)){ctx.fillStyle="#ffaa28";for(const[ex,ey]of[[R.x0,R.y0],[R.x1,R.y1]]){ctx.fillRect(ex*CP+2-1.3/zz,ey*CP+2-1.3/zz,2.6/zz,2.6/zz);}}}
  // tool previews
  if(mouse.in&&!mouse.touch&&!pan&&!grab){
    if(S.tool==="valve"&&!drag)drawValve(ghostValve(),true);
    else if(S.tool==="check")drawCheck({...ghostValve(),flow:1},true);
    else if(S.tool==="inj")drawInj(ghostInj(),true);
    else if(S.tool==="pipe"){const w=S.pw,h=Math.floor((w-1)/2),bx=(mouse.x/CP|0)-h,by=(mouse.y/CP|0)-h;ctx.lineWidth=1/zz;ctx.strokeStyle="#c8d2eb";ctx.strokeRect((bx-1)*CP,(by-1)*CP,(w+2)*CP,(w+2)*CP);ctx.strokeStyle="#ffaa28";ctx.strokeRect(bx*CP,by*CP,w*CP,w*CP);}
    else if(S.tool==="plug")drawPlug({x:mouse.x/CP|0,y:mouse.y/CP|0},true);
    else if(["gas","wall","erase","spark","prop"].includes(S.tool)||(mouse.btn===2&&S.tool!=="select")){const s=S.brush,h=Math.floor(s/2),bx=(mouse.x/CP|0)-h,by=(mouse.y/CP|0)-h;
      ctx.lineWidth=1/zz;ctx.strokeStyle=mouse.btn===2?"#ff6a4d":{erase:"#ff6a4d",wall:"#c8d2eb",spark:"#ff8a3c",prop:"#d8c9b4"}[S.tool]||(GASES[S.gas].sw.length===7?GASES[S.gas].sw:"#9fd8ff");
      ctx.strokeRect(bx*CP,by*CP,s*CP,s*CP);}}
  if(drag){const x0=Math.min(drag.x0,drag.x1),y0=Math.min(drag.y0,drag.y1),x1=Math.max(drag.x0,drag.x1),y1=Math.max(drag.y0,drag.y1);
    ctx.lineWidth=1/zz;ctx.strokeStyle="#ffaa28";ctx.strokeRect(x0*CP,y0*CP,(x1-x0+1)*CP,(y1-y0+1)*CP);ctx.fillStyle="rgba(255,170,40,.08)";ctx.fillRect(x0*CP,y0*CP,(x1-x0+1)*CP,(y1-y0+1)*CP);
    badge((x0+x1+1)*CP/2,y0*CP-5/zz,`${x1-x0-1}×${y1-y0-1}`,"#ffcf7a","rgba(8,11,22,.9)");}
  // screen-space banners
  ctx.setTransform(1,0,0,1,0,0);ctx.font=`600 ${13*SS}px ${SANS}`;ctx.textBaseline="top";
  // a banner card like the panels: dark, hairline edge, amber bar on the left
  const card=(x,y,w,h)=>{ctx.fillStyle="rgba(10,13,19,.92)";rr4(x,y,w,h,5*SS);ctx.fill();ctx.strokeStyle="#2c3746";ctx.lineWidth=1;rr4(x+0.5,y+0.5,w-1,h-1,5*SS);ctx.stroke();ctx.fillStyle="#ff3b2f";ctx.fillRect(x,y+3*SS,3*SS,h-6*SS);};
  const seq=valves.find(v=>v.openAt>0);
  if(seq){const f=Math.max(0,Math.min(1,1-(seq.openAt-simTime)/seq.delay)),bw=280*SS,bh=10*SS,bx=CW/2-bw/2,by=SMALL?CH-40*SS:CH*0.76;
    const lbl="IGNITER LIT · MAIN VALVES OPENING",w=ctx.measureText(lbl).width;
    card(Math.min(bx,CW/2-w/2)-16*SS,by-30*SS,Math.max(bw,w)+32*SS,50*SS);
    ctx.fillStyle="#ffffff";ctx.fillText(lbl,CW/2-w/2,by-22*SS);ctx.fillStyle="#0a0e14";ctx.fillRect(bx,by,bw,bh);ctx.strokeStyle="#2c3746";ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,bh);ctx.fillStyle="#ff3b2f";ctx.fillRect(bx,by,bw*f,bh);}
  else if(hint){const w=ctx.measureText(hint).width,hy=SMALL?CH-34*SS:CH*0.76;card(CW/2-w/2-18*SS,hy-8*SS,w+34*SS,30*SS);ctx.fillStyle="#e7ecf3";ctx.fillText(hint,CW/2-w/2+2*SS,hy);}
  if(cam.z>1){const l=`${cam.z}× zoom · 0 to reset`,w=ctx.measureText(l).width,zy=SMALL?8:66*SS;card(CW/2-w/2-16*SS,zy,w+30*SS,26*SS);ctx.fillStyle="#ffffff";ctx.fillText(l,CW/2-w/2+2*SS,zy+6*SS);}
}

// ---------- physics thread ----------
// Physics runs on a background thread (Web Worker) so it never waits for drawing. The screen keeps a copy of the world:
// edits apply to the copy instantly and go to the physics thread; each snapshot replaces the copy, with any edits the
// physics thread hasn't seen yet re-applied on top.
let worker=null,actSeq=0,pending=[],snap=null;
function doAct(name,...args){const r=act(name,...args);if(worker){pending.push({seq:++actSeq,name,args});worker.postMessage({t:"act",name,args,seq:actSeq});}return r;}
function cfg(){if(worker)worker.postMessage({t:"cfg",paused:S.paused||document.hidden,spd:S.spd});}
function stopWorker(){if(worker){worker.terminate();worker=null;pending=[];snap=null;}}
function startWorker(){
  if(typeof Worker==="undefined"||new URLSearchParams(location.search).has("noworker"))return;
  try{
    const src="var THROAT_SIZE="+JSON.stringify([NX,NY])+";\n"+document.getElementById("coreScript").textContent+"\n"+document.getElementById("workerGlue").textContent;
    const w=new Worker(URL.createObjectURL(new Blob([src],{type:"text/javascript"})));let alive=false;
    w.onmessage=e=>{alive=true;snap=e.data;};
    w.onerror=()=>{if(!alive)stopWorker();};
    worker=w;w.postMessage({t:"init",state:exportState(),paused:S.paused,spd:S.spd});
    setTimeout(()=>{if(!alive)stopWorker();},3000);   // no answer → run physics on this thread instead
  }catch(err){worker=null;}
}
function takeSnapshot(){
  const o=snap;snap=null;let wch=false;
  for(let k=0;k<NC;k++){const a=wall[k],b=o.wall[k];if(a!==b&&!((a===4||a===0)&&(b===4||b===0))){wch=true;break;}}
  importState(o);pending=pending.filter(p=>p.seq>o.seq);for(const p of pending)act(p.name,...p.args);
  if(wch)wallsDirty=true;
  PERF.sps=o.sps;tracers(o.dts);keysUI();atmoUI();wantOut=false;
}
// snapshots cost the physics thread a full copy of the world, so bigger worlds ask for fewer of them
let wantOut=true,lastWant=0;const SNAP_MS=NC>40000?40:NC>20000?30:0;
function askSnapshot(now){if(!worker||wantOut||now-lastWant<SNAP_MS)return;wantOut=true;lastWant=now;worker.postMessage({t:"want"});}
document.addEventListener("visibilitychange",cfg);
window.__dbg={get worker(){return worker;},get sel(){return sel;}};

// ---------- undo / redo (what you built, not the gas) ----------
let undoS=[],redoS=[];
function pushUndo(){undoS.push(getLayout());if(undoS.length>40)undoS.shift();redoS=[];}
function afterLayout(){wallsDirty=true;if(sel&&!selObj())select(null);else if(sel)inspUI(true);keySig="";keysUI();}
function undo(){if(!undoS.length)return;redoS.push(getLayout());doAct("layout",undoS.pop());afterLayout();}
function redo(){if(!redoS.length)return;undoS.push(getLayout());doAct("layout",redoS.pop());afterLayout();}
// ---------- tools ----------
const ICON={
  select:'<path d="M5 3l11 6.5-4.6 1.4 3.1 5.4-2.1 1.2-3.1-5.4L6 15.5z"/>',
  gas:'<path d="M5.5 15a3.6 3.6 0 0 1 .4-7.2 4.6 4.6 0 0 1 8.9 1.3 3 3 0 0 1-.2 5.9z"/>',
  wall:'<path d="M3 5h14v10H3zM3 10h14M8 5v5M12 10v5"/>',
  erase:'<path d="M11.5 4.5l4 4-7 7H4.5l-1-1 8-10zM7 8l5 5M9 15.5h7"/>',
  tank:'<path d="M6 4.5h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM4 9h12"/>',
  valve:'<path d="M3 6l7 4-7 4zM17 6l-7 4 7 4zM10 10V4M7.5 4h5"/>',
  plug:'<path d="M10 2.5c1 3 4 4.2 4 8a4 4 0 0 1-8 0c0-2 1-3.2 2-4 .1 1.8.8 2.8 2 3 0-2.6-1-4.6 0-7z"/>',
  spark:'<path d="M11 2.5L4.5 11h4.6l-1.6 6.5L15 8.5h-4.6z"/>',
  pipe:'<path d="M2.5 6.5h8a4 4 0 0 1 4 4v7M2.5 11h8a.5.5 0 0 1 .5.5v6"/>',
  check:'<path d="M3 10h10M9.5 6.5L13 10l-3.5 3.5M16 4v12"/>',
  inj:'<path d="M5 3v14M5 5.5h3M5 10h3M5 14.5h3M10 5l5.5-1.5M10 10h6M10 15l5.5 1.5"/>',
  prop:'<path d="M3 5h14v10H3zM3 8.5h6.5l1.5 1.5-1.5 1.5H3M11 10h6"/>'};
const TOOLS=[["select","Select","S"],["gas","Gas","G"],["wall","Wall","W"],["erase","Erase","X"],["pipe","Pipe","P"],["tank","Tank","T"],["valve","Valve","V"],["check","Check","K"],["inj","Injector","J"],["plug","Igniter","I"],["spark","Spark","F"],["prop","Propellant","B"]];
const TIPS={
  select:"<b>Click</b> a valve, igniter or tank to change its settings. <b>Drag</b> a valve or igniter to move it. <b>Shift+drag</b> or <b>Shift+wheel</b> stretches a valve, <b>Q/E</b> turns it, <b>Del</b> removes it.",
  gas:"<b>Paint</b> gas at the fill pressure and temperature (<b>Shift</b> = straight line). <b>Right-click</b> erases. <b>Shift+wheel</b> or <b>[ ]</b> brush size.",
  wall:"<b>Paint</b> solid walls. Hold <b>Shift</b> for a straight line. <b>Right-click</b> erases. <b>Shift+wheel</b> brush size.",
  erase:"<b>Paint</b> to remove walls, gas, valves and igniters. <b>Shift</b> = straight line.",
  tank:"<b>Drag a box</b>: it becomes a walled tank of this gas. Infinite tanks refill themselves. Click it with Select to change it later.",
  valve:"<b>Click</b> to place one valve (closed, no key yet). <b>Shift+wheel</b> length, <b>Q/E</b> turn. Then click it with Select to give it a key.",
  plug:"<b>Click</b> to place a torch igniter (off, no key yet). It blows a small fuel-rich flame. Click it with Select to turn it on or give it a key.",
  spark:"<b>Hold</b> to heat gas to 2,500 K. Lights a hydrogen + oxygen mix.",
  prop:"<b>Paint</b> solid propellant (<b>Shift</b> = straight line). Leave a hole down the middle (the bore) and light it with an igniter or spark: the surface burns back, faster at higher pressure. More burning surface = more pressure and thrust.",
  pipe:"<b>Drag</b> to lay a pipe (hold <b>Shift</b> for a straight line): a hollow channel with a wall each side. Where it crosses a wall it opens into it, so pipes join tanks and chambers. <b>Shift+wheel</b> width. Put a valve in it with the Valve tool.",
  check:"<b>Click</b> to place a one-way valve: gas only passes the way its arrow points, and it slams shut on backflow. It fits across pipes and gaps like a valve. Flip the arrow with Select.",
  inj:"<b>Click</b> a wall to set an injector plate (holes every 3 cells). <b>Q/E</b> turn, <b>Shift+wheel</b> length. Choose how it sprays: straight, impinging, angled, swirl or pintle."};
function setTool(t){S.tool=t;drag=null;document.querySelectorAll("#tools .tool").forEach(b=>b.classList.toggle("on",b.dataset.tool===t));cv.classList.toggle("sel",t==="select");ctxUI();}
function brushRect(cx,cy){const s=S.brush,h=Math.floor(s/2);return[cx-h,cy-h,cx-h+s-1,cy-h+s-1];}
function applyBrush(cx,cy,erase){
  const[x0,y0,x1,y1]=brushRect(cx,cy);
  if(erase){doAct("brush",x0,y0,x1,y1,2,null,0,0);wallsDirty=true;if(sel&&!selObj())select(null);keysUI();}
  else if(S.tool==="wall"){doAct("brush",x0,y0,x1,y1,1,null,0,0);wallsDirty=true;}
  else if(S.tool==="gas")doAct("brush",x0,y0,x1,y1,0,GASES[S.gas].Y,S.P,S.T);
  else if(S.tool==="prop"){doAct("brush",x0,y0,x1,y1,3,null,0,0);}
}
function stroke(){const erase=mouse.btn===2||S.tool==="erase",cx=mouse.x/CP|0,cy=mouse.y/CP|0,lx=mouse.lx<0?cx:mouse.lx,ly=mouse.ly<0?cy:mouse.ly;
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(cx-lx),Math.abs(cy-ly))/Math.max(1,S.brush/2)));
  if(erase||S.tool==="gas"||S.tool==="wall"||S.tool==="prop")for(let i=1;i<=n;i++)applyBrush(Math.round(lx+(cx-lx)*i/n),Math.round(ly+(cy-ly)*i/n),erase);mouse.lx=cx;mouse.ly=cy;}
function hitObj(tx,ty){
  const inR=(o,m)=>tx>=o.x0-m&&tx<=o.x1+m&&ty>=o.y0-m&&ty<=o.y1+m;
  for(const p of plugs)if(p.x===tx&&p.y===ty)return{kind:"plug",id:p.id};          // exact hits first
  for(const v of valves)if(inR(v,0))return{kind:"valve",id:v.id};
  for(const o of injs)if(inR(o,0))return{kind:"inj",id:o.id};
  for(const c of checks)if(inR(c,0))return{kind:"check",id:c.id};
  for(const p of plugs)if(Math.abs(p.x-tx)<=1&&Math.abs(p.y-ty)<=1)return{kind:"plug",id:p.id};   // then a little slack
  for(const v of valves)if(inR(v,1))return{kind:"valve",id:v.id};
  for(const c of checks)if(inR(c,1))return{kind:"check",id:c.id};
  for(const t of tanks)if(tx>=t.x0-1&&tx<=t.x1+1&&ty>=t.y0-1&&ty<=t.y1+1)return{kind:"tank",id:t.id};
  return null;}
function rotateSel(d){const v=sel&&lineKind(sel.kind)&&selObj();
  if(!v){if(S.tool==="valve"||S.tool==="check"){S.vdir=1-S.vdir;ctxUI();}else if(S.tool==="inj"){S.idir=1-S.idir;ctxUI();}return;}
  pushUndo();
  const cx=v.x+(v.dir?(v.len-1)/2:0),cy=v.y+(v.dir?0:(v.len-1)/2),nd=1-v.dir;
  doAct("set",sel.kind,v.id,{dir:nd,x:Math.round(cx-(nd?(v.len-1)/2:0)),y:Math.round(cy-(nd?0:(v.len-1)/2))});wallsDirty=true;inspUI(true);}
let lastResizeUndo=0;
function resizeSel(dl){const v=sel&&lineKind(sel.kind)&&selObj();if(!v)return false;
  if(performance.now()-lastResizeUndo>800)pushUndo();lastResizeUndo=performance.now();
  const len=Math.max(1,Math.min(80,v.len+dl)),cx=v.x+(v.dir?(v.len-1)/2:0),cy=v.y+(v.dir?0:(v.len-1)/2);
  doAct("set",sel.kind,v.id,{len,x:Math.round(cx-(v.dir?(len-1)/2:0)),y:Math.round(cy-(v.dir?0:(len-1)/2))});wallsDirty=true;inspUI(true);return true;}
function screenXY(e){const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H];}
function toWorld(e){const[sx,sy]=screenXY(e);mouse.x=Math.max(0,Math.min(W-1,cam.x+sx/cam.z));mouse.y=Math.max(0,Math.min(H-1,cam.y+sy/cam.z));}
const ZL=[1,1.5,2,3,4,6,8];
function clampCam(){cam.x=Math.max(0,Math.min(W-W/cam.z,cam.x));cam.y=Math.max(0,Math.min(H-H/cam.z,cam.y));}
function zoomStep(d,sx,sy){let i=ZL.indexOf(cam.z);i=Math.max(0,Math.min(ZL.length-1,(i<0?0:i)+d));sx=sx===undefined?W/2:sx;sy=sy===undefined?H/2:sy;
  const wx=cam.x+sx/cam.z,wy=cam.y+sy/cam.z;cam.z=ZL[i];cam.x=wx-sx/cam.z;cam.y=wy-sy/cam.z;clampCam();}
cv.addEventListener("contextmenu",e=>e.preventDefault());
// phones: two fingers pinch to zoom and drag to pan. These listeners sit on the canvas's parent in the capture phase, so they
// see every touch before the tools do and can swallow the second finger (otherwise it would paint or move things).
const touches=new Map();let pinch=null;
function pinchMid(){const[a,b]=[...touches.values()];return{x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,d:Math.hypot(a[0]-b[0],a[1]-b[1])||1};}
cv.parentElement.addEventListener("pointerdown",e=>{if(e.target!==cv||e.pointerType!=="touch")return;touches.set(e.pointerId,screenXY(e));
  if(touches.size===2){const m=pinchMid();pinch={...m,z:cam.z,wx:cam.x+m.x/cam.z,wy:cam.y+m.y/cam.z};   // the world point under the fingers stays under them
    mouse.down=false;grab=null;drag=null;e.stopImmediatePropagation();}},true);
cv.parentElement.addEventListener("pointermove",e=>{if(!touches.has(e.pointerId))return;touches.set(e.pointerId,screenXY(e));
  if(!pinch)return;e.stopImmediatePropagation();if(touches.size<2)return;const m=pinchMid(),want=pinch.z*m.d/pinch.d;
  let z=ZL[0];for(const q of ZL)if(Math.abs(Math.log(q/want))<Math.abs(Math.log(z/want)))z=q;   // snap to the zoom steps the renderer knows
  cam.z=z;cam.x=pinch.wx-m.x/z;cam.y=pinch.wy-m.y/z;clampCam();},true);
const touchEnd=e=>{if(!touches.delete(e.pointerId))return;if(pinch){e.stopImmediatePropagation();mouse.down=false;if(!touches.size)pinch=null;}};
cv.parentElement.addEventListener("pointerup",touchEnd,true);cv.parentElement.addEventListener("pointercancel",touchEnd,true);
cv.addEventListener("wheel",e=>{e.preventDefault();const d=e.deltaY||e.deltaX;if(!d)return;const up=d<0;
  if(e.shiftKey){
    if(S.tool==="select"&&resizeSel(up?1:-1))return;
    if(S.tool==="valve"||S.tool==="check"){S.vlen=Math.max(1,Math.min(80,S.vlen+(up?1:-1)*(S.vlen>=12?2:1)));ctxUI();return;}
    if(S.tool==="inj"){S.ilen=Math.max(2,Math.min(40,S.ilen+(up?1:-1)));ctxUI();return;}
    if(S.tool==="pipe"){S.pw=Math.max(1,Math.min(6,S.pw+(up?1:-1)));ctxUI();return;}
    S.brush=Math.max(1,Math.min(40,S.brush+(up?1:-1)*(S.brush>=10?2:1)));ctxUI();return;}
  const[sx,sy]=screenXY(e);zoomStep(up?1:-1,sx,sy);toWorld(e);},{passive:false});
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);mouse.touch=e.pointerType!=="mouse";
  if(e.button===1||e.altKey){const[sx,sy]=screenXY(e);pan={sx,sy,cx:cam.x,cy:cam.y};e.preventDefault();return;}
  toWorld(e);mouse.in=true;mouse.down=true;mouse.btn=e.button===2?2:0;mouse.lx=-1;mouse.ly=-1;const tx=mouse.x/CP|0,ty=mouse.y/CP|0;
  mouse.ax=tx;mouse.ay=ty;mouse.axis=null;            // where the stroke started (for Shift = straight line)
  if(mouse.btn===2&&S.tool!=="select"||["wall","erase","plug","valve","pipe","inj","check"].includes(S.tool))pushUndo();
  if(S.tool==="select"){
    if(mouse.btn===2){select(null);mouse.down=false;return;}
    const h=hitObj(tx,ty);
    if(h&&e.shiftKey&&sel&&lineKind(h.kind)&&h.kind===sel.kind&&h.id===sel.id){const v=selObj(),a=v.dir?(Math.abs(tx-v.x0)<Math.abs(tx-v.x1)?v.x1:v.x0):(Math.abs(ty-v.y0)<Math.abs(ty-v.y1)?v.y1:v.y0);
      pushUndo();grab={mode:"stretch",kind:h.kind,id:v.id,anchor:a,dir:v.dir};return;}
    select(h);
    if(h&&(h.kind==="valve"||h.kind==="plug"||h.kind==="inj"||h.kind==="check")){const o=selObj();pushUndo();grab={mode:"move",kind:h.kind,id:h.id,dx:(h.kind==="plug"?o.x:o.x)-tx,dy:(h.kind==="plug"?o.y:o.y)-ty,moved:false};}
    return;}
  if(mouse.btn===0&&S.tool==="plug"){const p=doAct("plug",tx,ty);wallsDirty=true;select({kind:"plug",id:p.id});mouse.down=false;return;}
  if(mouse.btn===0&&S.tool==="valve"){const g=ghostValve(),v=doAct("valve",g.x,g.y,g.len,g.dir);wallsDirty=true;select({kind:"valve",id:v.id});mouse.down=false;return;}
  if(mouse.btn===0&&S.tool==="tank"){drag={x0:tx,y0:ty,x1:tx,y1:ty,kind:"tank"};return;}
  if(mouse.btn===0&&S.tool==="check"){const g=ghostValve(),c=doAct("check",g.x,g.y,g.len,g.dir,1);wallsDirty=true;select({kind:"check",id:c.id});mouse.down=false;return;}
  if(mouse.btn===0&&S.tool==="inj"){const g=ghostInj(),o=doAct("inj",g.x,g.y,g.len,g.dir,S.itype);wallsDirty=true;select({kind:"inj",id:o.id});mouse.down=false;return;}
  if(mouse.btn===0&&S.tool==="pipe"){doAct("pipe",tx,ty,tx,ty,S.pw);wallsDirty=true;mouse.lx=tx;mouse.ly=ty;return;}
  stroke();});
cv.addEventListener("pointermove",e=>{if(pan){const[sx,sy]=screenXY(e);cam.x=pan.cx-(sx-pan.sx)/cam.z;cam.y=pan.cy-(sy-pan.sy)/cam.z;clampCam();return;}
  toWorld(e);mouse.in=true;let tx=mouse.x/CP|0,ty=mouse.y/CP|0;
  // Shift while painting walls, pipes, gas or erasing: lock the stroke to a straight line along one axis
  if(mouse.down&&!grab&&!drag&&["wall","pipe","gas","erase","spark"].includes(S.tool)||mouse.down&&mouse.btn===2&&S.tool!=="select"){
    if(e.shiftKey){const dx=tx-mouse.ax,dy=ty-mouse.ay;if(!mouse.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=2)mouse.axis=Math.abs(dx)>=Math.abs(dy)?"x":"y";
      if(mouse.axis==="x"){ty=mouse.ay;mouse.y=ty*CP+2;}else if(mouse.axis==="y"){tx=mouse.ax;mouse.x=tx*CP+2;}}
    else mouse.axis=null;}
  if(grab){const o=selObj();if(!o){grab=null;return;}
    if(grab.mode==="move"){const nx=tx+grab.dx,ny=ty+grab.dy;if(nx!==o.x||ny!==o.y){doAct("set",grab.kind,grab.id,{x:nx,y:ny});wallsDirty=true;grab.moved=true;}}
    else{const c=grab.dir?tx:ty,lo=Math.max(0,Math.min(grab.anchor,c)),hi=Math.max(grab.anchor,c),len=hi-lo+1;
      if(len!==o.len||(grab.dir?o.x:o.y)!==lo){doAct("set",grab.kind,grab.id,grab.dir?{x:lo,len}:{y:lo,len});wallsDirty=true;}}
    return;}
  if(drag){drag.x1=tx;drag.y1=ty;}
  else if(mouse.down&&S.tool==="pipe"&&mouse.btn===0){if(tx!==mouse.lx||ty!==mouse.ly){doAct("pipe",mouse.lx,mouse.ly,tx,ty,S.pw);wallsDirty=true;mouse.lx=tx;mouse.ly=ty;}}
  else if(mouse.down)stroke();});
cv.addEventListener("pointerup",()=>{if(pan){pan=null;return;}
  if(grab){if(grab.mode==="move"&&!grab.moved)undoS.pop();grab=null;inspUI(true);}   // a plain click isn't an edit
  if(drag){const x0=Math.min(drag.x0,drag.x1),y0=Math.min(drag.y0,drag.y1),x1=Math.max(drag.x0,drag.x1),y1=Math.max(drag.y0,drag.y1);drag=null;
    if(x1-x0>=2&&y1-y0>=2){pushUndo();const g=GASES[S.gas],t=doAct("tankBox",x0,y0,x1,y1,g.Y,S.P,S.T,S.inf,g.name);wallsDirty=true;select({kind:"tank",id:t.id});}}
  mouse.down=false;mouse.btn=0;});
cv.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")mouse.in=false;});

// ---------- settings popup ----------
const insp=$("insp");let inspFor="";
function select(h){sel=h;inspUI(true);}
const keyOpts=cur=>`<option value="0"${!cur?" selected":""}>None</option>`+[1,2,3,4,5,6,7,8,9].map(k=>`<option value="${k}"${cur===k?" selected":""}>Key ${k}</option>`).join("");
function inspUI(rebuild){
  const o=selObj();
  if(!o){insp.classList.remove("show");inspFor="";return;}
  const tag=sel.kind+":"+sel.id;
  if(rebuild||tag!==inspFor){inspFor=tag;
    const X='<button class="x" data-a="close" aria-label="Close" title="Close (Esc)">×</button>',MN='<button class="mn" data-a="min" title="Minimise">–</button>';
    if(sel.kind==="valve"){
      insp.innerHTML=`<div class="hd"><b>VALVE</b>${MN}${X}</div>
        <button class="b state" data-a="toggle"></button>
        <label class="sl2">Key<select data-a="key" style="grid-column:2/4">${keyOpts(o.key)}</select></label>
        <label class="sl2">Length<input type="range" min="1" max="60" data-a="len" value="${o.len}"><output data-o="len">${o.len}</output></label>
        <div class="seg"><button data-a="dir0" title="Q / E">↕ Up-down</button><button data-a="dir1" title="Q / E">↔ Left-right</button></div>
        <div class="foot"><span class="tip">Shift+wheel length · Q/E turn</span><button class="b danger" data-a="del">Delete</button></div>`;
    }else if(sel.kind==="check"){
      insp.innerHTML=`<div class="hd"><b>CHECK VALVE</b>${MN}${X}</div>
        <div class="two"><label class="lb">State<button class="b state" disabled></button></label><label class="lb">Arrow<button class="b" data-a="cflip">⇄ Flip</button></label></div>
        <label class="sl2">Length<input type="range" min="1" max="60" data-a="len" value="${o.len}"><output data-o="len">${o.len}</output></label>
        <div class="seg"><button data-a="dir0" title="Q / E">↕ Up-down</button><button data-a="dir1" title="Q / E">↔ Left-right</button></div>
        <div class="foot"><span class="tip">Opens one way, shuts on backflow</span><button class="b danger" data-a="del">Delete</button></div>`;
    }else if(sel.kind==="inj"){
      insp.innerHTML=`<div class="hd"><b>INJECTOR</b>${MN}${X}</div>
        <div class="two"><label class="lb">Type<select data-a="itype">${INJ_TYPES.map(t=>`<option value="${t}"${o.type===t?" selected":""}>${t[0].toUpperCase()+t.slice(1)}</option>`).join("")}</select></label>
          <label class="lb">Holes every<select data-a="gap">${[2,3,4,5,6].map(g=>`<option value="${g}"${o.gap===g?" selected":""}>${g} cells</option>`).join("")}</select></label></div>
        <button class="b" data-a="iflip" title="Which way angled or swirl jets lean">⇅ Flip lean</button>
        <label class="sl2">Length<input type="range" min="2" max="40" data-a="len" value="${o.len}"><output data-o="len">${o.len}</output></label>
        <div class="seg"><button data-a="dir0" title="Q / E">↕ Up-down</button><button data-a="dir1" title="Q / E">↔ Left-right</button></div>
        <div class="foot"><span class="tip" data-o="idesc"></span><button class="b danger" data-a="del">Delete</button></div>`;
    }else if(sel.kind==="plug"){
      insp.innerHTML=`<div class="hd"><b>TORCH IGNITER</b>${MN}${X}</div>
        <div class="two"><label class="lb">Key<select data-a="key">${keyOpts(o.key)}</select></label>
          <label class="lb">Flame<button class="b state" data-a="ptoggle"></button></label></div>
        <div class="foot"><span class="tip">A small flame that lights the engine</span><button class="b danger" data-a="del">Delete</button></div>`;
    }else{
      insp.innerHTML=`<div class="hd"><b>TANK</b>${MN}${X}</div>
        <div class="two"><label class="lb">Gas<select data-a="gas">${GASES.map((g,i)=>`<option value="${i}"${g.name===o.name?" selected":""}>${g.name}</option>`).join("")}</select></label>
          <label class="lb">Refill<button class="b state" data-a="inf"></button></label></div>
        <label class="sl2">Pressure<input type="range" min="1" max="1000" data-a="P" value="${Math.round(o.P/PSI_PA)}"><output data-o="P">${Math.round(o.P/PSI_PA)} psi</output></label>
        <label class="sl2">Temp<input type="range" min="100" max="3000" step="10" data-a="T" value="${o.T}"><output data-o="T">${fmt(o.T)} K</output></label>
        <div class="foot"><span class="tip">Deleting keeps the walls</span><button class="b danger" data-a="del">Delete</button></div>`;
    }
  }
  // live state
  if(sel.kind==="check"){const st=insp.querySelector(".state");st.textContent=o.open?"OPEN":"SHUT";st.className="b state "+(o.open?"go":"danger");
    const d0=insp.querySelector('[data-a="dir0"]'),d1=insp.querySelector('[data-a="dir1"]');d0.classList.toggle("on",!o.dir);d1.classList.toggle("on",!!o.dir);
    const L=insp.querySelector('[data-a="len"]');if(document.activeElement!==L){L.value=o.len;insp.querySelector('[data-o="len"]').textContent=o.len;}
    placeInsp();insp.classList.add("show");return;}
  if(sel.kind==="inj"){const d0=insp.querySelector('[data-a="dir0"]'),d1=insp.querySelector('[data-a="dir1"]');d0.classList.toggle("on",!o.dir);d1.classList.toggle("on",!!o.dir);
    insp.querySelector('[data-a="iflip"]').style.display=o.type==="angled"||o.type==="swirl"?"":"none";
    insp.querySelector('[data-o="idesc"]').textContent={straight:"Plain straight jets",impinging:"Neighbouring jets collide",angled:"Every jet leans one way",swirl:"Jets spin and churn the gas",pintle:"One centre slot, wide fan"}[o.type];
    const L=insp.querySelector('[data-a="len"]');if(document.activeElement!==L){L.value=o.len;insp.querySelector('[data-o="len"]').textContent=o.len;}
    placeInsp();insp.classList.add("show");return;}
  const st=insp.querySelector(".state");
  if(sel.kind==="valve"){st.textContent=o.openAt>0?"OPENING…":o.open?"OPEN":"CLOSED";st.className="b state "+(o.open?"go":o.openAt>0?"on":"danger");
    const d0=insp.querySelector('[data-a="dir0"]'),d1=insp.querySelector('[data-a="dir1"]');d0.classList.toggle("on",!o.dir);d1.classList.toggle("on",!!o.dir);
    const L=insp.querySelector('[data-a="len"]');if(document.activeElement!==L){L.value=o.len;insp.querySelector('[data-o="len"]').textContent=o.len;}}
  else if(sel.kind==="plug"){const lit=torchLit(o);st.textContent=o.key?(lit?"BURNING":"KEY "+o.key):(o.on?"ON":"OFF");st.className="b state "+(lit?"on":"");st.disabled=!!o.key;}
  else{st.textContent=o.inf?"INFINITE":"ONE FILL";st.className="b state "+(o.inf?"on":"");}
  placeInsp();
  insp.classList.add("show");
}
function placeInsp(){
  if(SMALL||insp.dataset.moved)return;
  const stage=$("stage").getBoundingClientRect(),c=$("ctx").getBoundingClientRect(),bot=document.querySelector(".bot").getBoundingClientRect(),h=insp.offsetHeight||220;
  const lo=c.bottom-stage.top+8,hi=bot.top-stage.top-h-8;           // between the tool panel and the bottom bar
  const y=Math.max(lo,Math.min(hi,(stage.height-h)/2));
  insp.style.top=Math.round(y)+"px";
}
insp.addEventListener("click",e=>{const a=e.target.closest("[data-a]");if(!a||!sel)return;const o=selObj();if(!o)return;const A=a.dataset.a;
  if(A!=="close"&&A!=="min"&&A!=="dir0"&&A!=="dir1")pushUndo();
  if(A==="min"){insp.classList.toggle("min");savePanel(insp,"insp");return;}
  if(A==="close")select(null);
  else if(A==="del"){doAct("del",sel.kind,sel.id);wallsDirty=true;select(null);keysUI();}
  else if(A==="toggle")doAct("set","valve",sel.id,{open:!(o.open||o.openAt>0)});
  else if(A==="ptoggle"&&!o.key)doAct("set","plug",sel.id,{on:!o.on});
  else if(A==="dir0"&&o.dir)rotateSel();else if(A==="dir1"&&!o.dir)rotateSel();
  else if(A==="iflip")doAct("set","inj",sel.id,{flip:!o.flip});
  else if(A==="cflip")doAct("set","check",sel.id,{flow:-(o.flow||1)});
  else if(A==="inf")doAct("set","tank",sel.id,{inf:!o.inf});
  wallsDirty=true;keysUI();if(sel)inspUI(false);});
let inspArmed=true;insp.addEventListener("pointerdown",()=>{inspArmed=true;});insp.addEventListener("focusin",()=>{inspArmed=true;});
insp.addEventListener("input",e=>{const a=e.target.dataset.a;if(!a||!sel)return;const o=selObj();if(!o)return;const v=+e.target.value;
  if(inspArmed&&a!=="len"){pushUndo();inspArmed=false;}
  if(a==="len"){insp.querySelector('[data-o="len"]').textContent=v;resizeSel(v-o.len);}
  else if(a==="P"){insp.querySelector('[data-o="P"]').textContent=v+" psi";doAct("set","tank",sel.id,{P:v*PSI_PA});}
  else if(a==="T"){insp.querySelector('[data-o="T"]').textContent=fmt(v)+" K";doAct("set","tank",sel.id,{T:v});}});
insp.addEventListener("change",e=>{const a=e.target.dataset.a;if(!a||!sel)return;const v=+e.target.value;
  if(a==="key"||a==="delay"||a==="gas"||a==="itype"||a==="gap")pushUndo();
  if(a==="itype"){doAct("set","inj",sel.id,{type:e.target.value});wallsDirty=true;inspUI(false);return;}
  if(a==="gap"){doAct("set","inj",sel.id,{gap:v});wallsDirty=true;inspUI(false);return;}
  if(a==="key"){doAct("set",sel.kind,sel.id,{key:v});keysUI();}
  else if(a==="delay")doAct("set","valve",sel.id,{delay:Math.max(0,Math.min(50,v))/1000});
  else if(a==="gas"){const g=GASES[v];doAct("set","tank",sel.id,{Y:g.Y,name:g.name});}
  inspUI(false);});

// ---------- side panel ----------
function ctxUI(){
  const t=S.tool,show=new Set({prop:["brush","srb"],gas:["gas","press","temp","brush"],wall:["brush"],erase:["brush"],tank:["gas","press","temp","inf"],valve:["vlen","vdir"],check:["vlen","vdir"],spark:["brush"],pipe:["pw"],inj:["itype","ilen","idir"]}[t]||[]);
  $("ctxTitle").textContent=TOOLS.find(x=>x[0]===t)[1]+" tool";
  for(const id of["gas","press","temp","brush","inf","vlen","vdir","pw","itype","ilen","idir","srb"])$("c_"+id).style.display=show.has(id)?"":"none";
  $("pw").value=S.pw;$("oPw").textContent=S.pw+" cell"+(S.pw>1?"s":"");$("ilen").value=S.ilen;$("oIlen").textContent=S.ilen+" cells";$("itype").value=S.itype;
  document.querySelectorAll("#c_idir button").forEach(b=>b.classList.toggle("on",+b.dataset.d===S.idir));
  $("ctxTip").innerHTML=TIPS[t];
  $("brush").value=S.brush;$("oBrush").textContent=S.brush+" cell"+(S.brush>1?"s":"");
  $("vlen").value=S.vlen;$("oVlen").textContent=S.vlen+" cell"+(S.vlen>1?"s":"");
  document.querySelectorAll("#c_vdir button").forEach(b=>b.classList.toggle("on",+b.dataset.d===S.vdir));
  document.querySelectorAll("#c_gas .chip").forEach(b=>b.classList.toggle("on",+b.dataset.g===S.gas));
  $("bInf").textContent=S.inf?"Infinite (refills)":"One fill";$("bInf").classList.toggle("on",S.inf);
}
function buildCtx(){
  $("ctxBody").innerHTML=`
    <div class="row" id="c_gas">${GASES.map((g,i)=>`<button class="chip" data-g="${i}"><span class="sw" style="background:${g.sw}"></span>${g.name}</button>`).join("")}</div>
    <label class="sl" id="c_press" for="press">Pressure<input id="press" type="range" min="1" max="1000" value="30"><output id="oPress"></output></label>
    <label class="sl" id="c_temp" for="temp">Temperature<input id="temp" type="range" min="100" max="3000" step="10" value="300"><output id="oTemp"></output></label>
    <label class="sl" id="c_srb" for="srbR" title="How fast the propellant surface burns back (1× = the built-in burn rate)">Burn rate<input id="srbR" type="range" min="0.4" max="2.5" step="0.1" value="1"><output id="oSrb"></output></label>
    <label class="sl" id="c_brush" for="brush">Brush<input id="brush" type="range" min="1" max="40" value="6"><output id="oBrush"></output></label>
    <div class="row" id="c_inf"><button class="b" id="bInf"></button></div>
    <label class="sl" id="c_vlen" for="vlen">Length<input id="vlen" type="range" min="1" max="60" value="6"><output id="oVlen"></output></label>
    <div class="row" id="c_vdir"><div class="seg"><button data-d="0">↕ Up-down</button><button data-d="1">↔ Left-right</button></div><span class="tip">Q / E</span></div>
    <label class="sl" id="c_pw" for="pw">Inside<input id="pw" type="range" min="1" max="6" value="2"><output id="oPw"></output></label>
    <label class="sl" id="c_itype" for="itype">Type<select id="itype" style="grid-column:2/4;height:28px;background:#141b31;border:1px solid var(--edge);border-radius:5px;color:var(--txt);font:600 12px var(--body)">${INJ_TYPES.map(t=>`<option value="${t}">${t[0].toUpperCase()+t.slice(1)}</option>`).join("")}</select></label>
    <label class="sl" id="c_ilen" for="ilen">Length<input id="ilen" type="range" min="2" max="40" value="9"><output id="oIlen"></output></label>
    <div class="row" id="c_idir"><div class="seg"><button data-d="0">↕ Up-down</button><button data-d="1">↔ Left-right</button></div><span class="tip">Q / E</span></div>`;
  document.querySelectorAll("#c_gas .chip").forEach(b=>b.onclick=()=>{S.gas=+b.dataset.g;ctxUI();});
  const bind=(id,out,fn)=>{const el=$(id),g=()=>{$(out).textContent=fn(+el.value);};el.oninput=g;g();};
  bind("press","oPress",v=>{S.P=v*PSI_PA;return v+" psi";});
  bind("temp","oTemp",v=>{S.T=v;return fmt(v)+" K";});
  bind("srbR","oSrb",v=>{doAct("srbRate",v);return v.toFixed(1)+"×";});
  $("brush").oninput=()=>{S.brush=+$("brush").value;ctxUI();};
  $("vlen").oninput=()=>{S.vlen=+$("vlen").value;ctxUI();};
  document.querySelectorAll("#c_vdir button").forEach(b=>b.onclick=()=>{S.vdir=+b.dataset.d;ctxUI();});
  $("bInf").onclick=()=>{S.inf=!S.inf;ctxUI();};
  $("pw").oninput=()=>{S.pw=+$("pw").value;ctxUI();};$("ilen").oninput=()=>{S.ilen=+$("ilen").value;ctxUI();};$("itype").onchange=()=>{S.itype=$("itype").value;};
  document.querySelectorAll("#c_idir button").forEach(b=>b.onclick=()=>{S.idir=+b.dataset.d;ctxUI();});
}
let keySig="";
function keysUI(){const sig=valves.map(v=>v.key+(v.open?"o":"c")).join()+"|"+plugs.map(p=>p.key).join()+"|"+keyState.join("");if(sig===keySig)return;keySig=sig;
  const el=$("keys");el.innerHTML="";const ks=[...new Set([...valves.map(v=>v.key),...plugs.map(p=>p.key)].filter(Boolean))].sort((a,b)=>a-b);
  if(!ks.length){el.innerHTML='<span class="tip">Nothing on a number key yet. Select a valve or igniter and pick a key.</span>';return;}
  for(const k of ks){const nv=valves.filter(v=>v.key===k).length,np=plugs.filter(p=>p.key===k).length,on=!!keyState[k],b=document.createElement("button");
    b.className="keyb"+(on?" open":"");b.innerHTML=`${k} · ${on?"ON":"OFF"}<small>${[nv?nv+" valve"+(nv>1?"s":""):"",np?np+" igniter"+(np>1?"s":""):""].filter(Boolean).join(", ")}</small>`;
    b.title=`Press ${k} to switch`;b.onclick=()=>{doAct("key",k);wallsDirty=true;keysUI();};el.appendChild(b);}}
let atmoShown=-1;
function atmoUI(){if(atmo===atmoShown)return;atmoShown=atmo;icoBtn($("bAir"),atmo?"globe":"vacuum",atmo?"Sea level":"Vacuum");$("bAir").classList.toggle("on",!atmo);}
const VIEWS=[[6,"Real"],[0,"Glow"],[1,"Gases"],[2,"Pressure"],[3,"Temp"],[4,"Mach"],[5,"Shocks"]];
function setView(v){S.view=v;document.querySelectorAll("#views button").forEach(b=>b.classList.toggle("on",+b.dataset.v===v));}
function load(id){if(id==="custom"){if(customDesign){loadDesignUI(customDesign,$("scen").querySelector('[value=custom]').textContent);undoS.pop();}return;}
  S.scen=id;doAct("scen",id);select(null);wallsDirty=true;TN=0;keySig="";keysUI();atmoShown=-1;atmoUI();cam.z=1;cam.x=cam.y=0;lastWater=waterMade;lastSim=simTime;$("scen").value=id;
  if(SMALL)setTimeout(fitCam,60);}
// phones: the whole world squeezed into a narrow screen makes the engine a few pixels tall, so zoom in on the walls
// (the engine) and leave a bit of room behind the nozzle for the flame
function fitCam(){let x0=NX,x1=-1,y0=NY,y1=-1;for(let k=0;k<NC;k++)if(wall[k]){const x=k%NX,y=(k/NX)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return;const bw=(x1-x0+1)*CP*1.6,bh=(y1-y0+1)*CP*1.25;let z=1;for(const q of ZL)if(W/q>=bw&&H/q>=bh)z=q;
  cam.z=z;cam.x=x0*CP-(W/z-bw/1.6)*0.12;cam.y=((y0+y1+1)/2)*CP-H/z/2;clampCam();}
// build toolbar + views
$("tools").innerHTML=TOOLS.map(([id,name,key])=>`<button class="tool" data-tool="${id}" title="${name} (${key})"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${ICON[id]}</svg><span>${name}</span><kbd>${key}</kbd></button>`).join("");
document.querySelectorAll("#tools .tool").forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$("views").innerHTML=VIEWS.map(([v,n])=>`<button data-v="${v}">${n}</button>`).join("");
document.querySelectorAll("#views button").forEach(b=>b.onclick=()=>setView(+b.dataset.v));
buildCtx();
const bindB=(id,out,fn)=>{const el=$(id),g=()=>{$(out).textContent=fn(+el.value);};el.oninput=g;g();};
bindB("heat","oHeat",v=>{doAct("fuel",v/10);return (v/10).toFixed(1)+"×";});
bindB("spd","oSpd",v=>{S.spd=v;cfg();return v>=10?"max":String(v);});
$("bAir").onclick=()=>{doAct("atmo",!atmo);atmoShown=-1;atmoUI();};
$("bPause").onclick=()=>{S.paused=!S.paused;cfg();icoBtn($("bPause"),S.paused?"play":"pause",S.paused?"Resume":"Pause");$("bPause").classList.toggle("on",S.paused);};
$("bClear").onclick=()=>{doAct("clear");TN=0;};
$("scen").onchange=()=>{pushUndo();load($("scen").value);};$("bReload").onclick=()=>{pushUndo();load(S.scen);};
$("bUndo").onclick=undo;$("bRedo").onclick=redo;
// world size: changing it reloads the page (your build is autosaved first, so you can load it back from Designs)
$("wsize").value=NX+"x"+NY;
$("wsize").onchange=()=>{const[a,b]=$("wsize").value.split("x").map(Number);try{localStorage.setItem(AS,JSON.stringify({t:Date.now(),d:exportDesign()}));localStorage.setItem("throat.size.v1",JSON.stringify([a,b]));}catch(e){}
  location.reload();};
// ---------- designs: saved in this browser, as files, and autosaved ----------
const dlg=$("designs"),LS="throat.designs.v1",AS="throat.autosave.v1";
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}};
let customDesign=null;
// ---------- motion helpers (v1.15) ----------
// Everyone who turned on "reduce motion" in their system settings gets no shake, no sliding and no rolling numbers.
var REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
// Rolling numbers: a readout eases toward its new value instead of jumping, like a broadcast graphic. One helper for every
// readout (probe, flight, editor). roll(key, element, number, format): the key keeps the motion going even when the element
// is rebuilt; a value of null shows "–". Big jumps (more than 20× or a change of sign) snap, so nothing counts for ages.
var ROLL=new Map(),rollT=0;
function roll(key,el,v,f){if(!el)return;let r=ROLL.get(key);
  if(v==null||!isFinite(v)){ROLL.delete(key);if(el.textContent!=="–")el.textContent="–";return;}
  if(!r){r={c:v};ROLL.set(key,r);}
  const big=Math.abs(v)>20*Math.abs(r.c)+1||Math.abs(r.c)>20*Math.abs(v)+1||(v>0)!==(r.c>0)&&Math.abs(v-r.c)>Math.max(Math.abs(v),1)*0.5;
  r.t=v;r.f=f;r.el=el;if(REDUCED||big)r.c=v;r.seen=performance.now();rollPaint(r);
  if(!rollT)rollT=requestAnimationFrame(rollTick);}
function rollPaint(r){const s=r.f(r.c);if(r.el.textContent!==s)r.el.textContent=s;}
function rollTick(now){rollT=0;let more=false;const dt=1/60;
  for(const[k,r]of ROLL){if(now-r.seen>3000){ROLL.delete(k);continue;}if(r.c===r.t)continue;
    r.c+=(r.t-r.c)*(1-Math.exp(-dt*11));if(Math.abs(r.t-r.c)<=Math.max(1e-9,Math.abs(r.t)*0.0005))r.c=r.t;rollPaint(r);if(r.c!==r.t)more=true;}
  if(more)rollT=requestAnimationFrame(rollTick);}
// A jolt for the whole screen: shake plus a white flash, for ignitions and launches (k = 0..1 strength)
function kick(el,k){if(REDUCED||!el)return;el.style.setProperty("--kick",String(Math.max(0.2,Math.min(1,k||1))));el.classList.remove("kick");void el.offsetWidth;el.classList.add("kick");
  const f=document.createElement("div");f.className="flash";f.style.opacity=String(0.25+0.4*(k||1));el.appendChild(f);setTimeout(()=>f.remove(),700);}
// Play a screen's entrance again (fade plus a slight scale), e.g. when you come back to the test stand
function enter(el){if(!el||REDUCED)return;el.classList.remove("enter");void el.offsetWidth;el.classList.add("enter");}
// ---------- fold-away panels with edge tabs ----------
// Only the key numbers stay on screen; each data panel hides behind a small labelled tab on the edge of the screen.
// Click a tab to slide the panel out, again to put it away. Several can be open at once, and the game remembers which.
// defs: [{el, label, side:"l"|"r", open:true/false (first visit)}]
const TABS="throat.tabs.v1";
function foldUI(host,name,defs){
  const all=store.get(TABS,{}),mine=all[name]||Object.fromEntries(defs.map(d=>[d.label,!!d.open]));
  const box={};for(const side of["l","r"]){if(!defs.some(d=>d.side===side))continue;const b=document.createElement("div");b.className="etabs "+side;b.dataset.for=name;host.appendChild(b);box[side]=b;}
  const save=()=>{const a=store.get(TABS,{});a[name]=mine;store.set(TABS,a);};
  const api={};
  for(const d of defs){const t=document.createElement("button");t.className="etab";t.type="button";t.textContent=d.label;t.title=(d.title||d.label)+" (click to show or hide)";
    box[d.side].appendChild(t);d.el.classList.add("fold",d.side==="l"?"fl":"fr");
    const show=(on,anim)=>{mine[d.label]=on;t.classList.toggle("on",on);t.setAttribute("aria-expanded",on);
      if(on){d.el.classList.remove("folded","closing");if(anim&&!REDUCED){d.el.classList.remove("opening");void d.el.offsetWidth;d.el.classList.add("opening");}}
      else if(anim&&!REDUCED){d.el.classList.add("closing");setTimeout(()=>{if(!mine[d.label]){d.el.classList.add("folded");d.el.classList.remove("closing");}},180);}
      else d.el.classList.add("folded");};
    show(mine[d.label]===undefined?!!d.open:!!mine[d.label],false);
    t.onclick=()=>{const on=!mine[d.label];
      if(on&&!d.free&&matchMedia("(max-width:700px)").matches)for(const o of defs)if(o!==d&&!o.free&&mine[o.label])api[o.label](false);   // phones: one panel at a time
      show(on,true);save();};api[d.label]=on=>{show(on,true);save();};}
  if(matchMedia("(max-width:700px)").matches){let seen=false;for(const d of defs)if(mine[d.label]&&!d.free){if(seen)api[d.label](false);seen=true;}}
  return api;}
// ---------- movable panels ----------
const PS="throat.panels.v1";
function savePanel(el,id){const all=store.get(PS,{}),st=$("stage").getBoundingClientRect(),r=el.getBoundingClientRect();
  all[id]={fx:(r.left-st.left)/st.width,fy:(r.top-st.top)/st.height,min:el.classList.contains("min"),moved:!!el.dataset.moved};store.set(PS,all);}
function placePanel(el,fx,fy){const st=$("stage").getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;
  const x=Math.max(0,Math.min(st.width-w,fx*st.width)),y=Math.max(0,Math.min(st.height-Math.min(h,40),fy*st.height));
  el.style.left=Math.round(x)+"px";el.style.top=Math.round(y)+"px";el.style.right="auto";el.style.bottom="auto";el.style.transform="none";}
function makePanel(el,id,handleSel){
  const saved=store.get(PS,{})[id];
  if(saved){if(saved.min)el.classList.add("min");if(saved.moved&&!SMALL){el.dataset.moved="1";requestAnimationFrame(()=>placePanel(el,saved.fx,saved.fy));}}
  let d=null;
  el.addEventListener("pointerdown",e=>{const hd=e.target===el||e.target.closest(handleSel);if(!hd||SMALL||e.target.closest("button,select,input,label.sl"))return;
    const r=el.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top};el.setPointerCapture(e.pointerId);el.classList.add("dragging");e.preventDefault();});
  el.addEventListener("pointermove",e=>{if(!d)return;const st=$("stage").getBoundingClientRect();el.dataset.moved="1";
    placePanel(el,(e.clientX-d.dx-st.left)/st.width,(e.clientY-d.dy-st.top)/st.height);});
  const end=()=>{if(!d)return;d=null;el.classList.remove("dragging");savePanel(el,id);};
  el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);
  el.addEventListener("dblclick",e=>{if(!(e.target===el||e.target.closest(handleSel))||e.target.closest("button,select,input"))return;   // double-click the title: back to its spot
    delete el.dataset.moved;el.style.left=el.style.top=el.style.right=el.style.bottom=el.style.transform="";const all=store.get(PS,{});delete all[id];store.set(PS,all);if(el===insp&&sel)inspUI(false);});
  const mn=el.querySelector(":scope > .ph .mn");if(mn)mn.onclick=()=>{el.classList.toggle("min");savePanel(el,id);};
}
if(!SMALL)foldUI($("stage"),"stand",[{el:$("probe"),label:"PROBE",side:"l",open:true,title:"Probe: the gas under the cursor, thrust and Isp"},{el:$("ctx"),label:"TOOL",side:"r",open:true,title:"Tool settings and engine keys"}]);
makePanel($("probe"),"probe",".ph,.pbody");makePanel($("ctx"),"ctx",".ph");makePanel(insp,"insp",".hd");
addEventListener("resize",()=>{const all=store.get(PS,{});for(const[id,el]of[["probe",$("probe")],["ctx",$("ctx")],["insp",insp]]){const p=all[id];if(p&&p.moved&&!SMALL)placePanel(el,p.fx,p.fy);}});
function loadDesignUI(d,name){pushUndo();doAct("design",d);customDesign=d;S.scen="custom";$("scen").value="custom";$("scen").querySelector('[value=custom]').textContent=name||"My design";
  select(null);wallsDirty=true;TN=0;keySig="";keysUI();atmoShown=-1;atmoUI();$("heat").value=Math.round((d.heat||1)*10);$("oHeat").textContent=(d.heat||1).toFixed(1)+"×";dlg.classList.remove("show");}
function listDesigns(){const L=store.get(LS,[]),a=store.get(AS,null),el=$("dList");el.innerHTML="";
  const row=(name,t,d,i)=>{const r=document.createElement("div");r.className="dl";r.innerHTML=`<b></b><small>${new Date(t).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</small><button class="b go">Load</button>${i>=0?'<button class="b danger">Delete</button>':""}`;
    r.querySelector("b").textContent=name;r.querySelector(".go").onclick=()=>loadDesignUI(d,name);
    if(i>=0)r.querySelector(".danger").onclick=()=>{const L2=store.get(LS,[]);L2.splice(i,1);store.set(LS,L2);listDesigns();};el.appendChild(r);};
  if(a)row("Autosave",a.t,a.d,-1);L.forEach((x,i)=>row(x.name,x.t,x.d,i));
  if(!a&&!L.length)el.innerHTML='<span class="tip">Nothing saved yet.</span>';}
$("bDesigns").onclick=()=>{listDesigns();dlg.classList.add("show");$("dName").focus();};
dlg.onclick=e=>{if(e.target===dlg)dlg.classList.remove("show");};
$("dName").addEventListener("keydown",e=>{if(e.key==="Enter")$("dSave").onclick();if(e.key==="Escape")dlg.classList.remove("show");});
$("dSave").onclick=()=>{const name=($("dName").value||"").trim()||"Design "+new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
  const L=store.get(LS,[]);const i=L.findIndex(x=>x.name===name);const rec={name,t:Date.now(),d:exportDesign()};if(i>=0)L[i]=rec;else L.unshift(rec);
  if(!store.set(LS,L.slice(0,30)))$("dList").innerHTML='<span class="bad">This browser won\'t let the page save. Use “Download as file” instead.</span>';else{$("dName").value="";listDesigns();}};
// inside claude.ai the page asks the viewer to save through the artifact's downloads capability; anywhere else it's a plain download
let dlNS=null;try{if(window.claude&&window.claude.use)window.claude.use("downloads").then(n=>{dlNS=n;},()=>{});}catch(e){}
$("dDown").onclick=async()=>{const name=($("dName").value||"").trim()||"throat-design",json=JSON.stringify({name,...exportDesign()}),fn=(name.replace(/[^\w\- ]+/g,"")||"throat-design")+".throat.json";
  if(dlNS){try{await dlNS.save({filename:fn,data:json});}catch(err){if(!err||err.code!=="declined")$("dList").innerHTML='<span class="bad">Couldn\'t save a file here. Designs still save in this browser.</span>';}return;}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([json],{type:"application/json"}));a.download=fn;document.body.appendChild(a);a.click();a.remove();};
$("dFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!d.wall||!d.tanks)throw 0;loadDesignUI(d,d.name||f.name.replace(/\.throat\.json$|\.json$/,""));}
  catch(err){$("dList").innerHTML='<span class="bad">That file isn\'t a THROAT design.</span>';}e.target.value="";};
let lastAuto="";setInterval(()=>{const d=exportDesign(),j=JSON.stringify(d);if(j!==lastAuto){lastAuto=j;store.set(AS,{t:Date.now(),d});}},6000);
const help=$("help");$("bHelp").onclick=()=>help.classList.toggle("show");help.onclick=e=>{if(e.target===help)help.classList.remove("show");};
window.addEventListener("keydown",e=>{const tg=e.target.tagName;if(tg==="INPUT"||tg==="SELECT"||tg==="TEXTAREA")return;const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){e.preventDefault();if(e.shiftKey)redo();else undo();return;}
  if((e.ctrlKey||e.metaKey)&&k==="y"){e.preventDefault();redo();return;}
  if(e.ctrlKey||e.metaKey)return;
  if(k>="1"&&k<="9"){if(doAct("key",+k)!==null){wallsDirty=true;keysUI();}}
  else if({s:1,g:1,w:1,x:1,t:1,v:1,i:1,f:1,p:1,j:1,k:1,b:1}[k])setTool({s:"select",g:"gas",w:"wall",x:"erase",t:"tank",v:"valve",i:"plug",f:"spark",p:"pipe",j:"inj",k:"check",b:"prop"}[k]);
  else if(k==="q"||k==="e")rotateSel(k==="q"?-1:1);
  else if(k==="delete"||k==="backspace"){if(sel){e.preventDefault();pushUndo();doAct("del",sel.kind,sel.id);wallsDirty=true;select(null);keysUI();}}
  else if(k==="escape"){if(help.classList.contains("show"))help.classList.remove("show");else if(dlg.classList.contains("show"))dlg.classList.remove("show");else select(null);}
  else if(k===" "){e.preventDefault();$("bPause").onclick();}
  else if(k==="a")$("bAir").onclick();else if(k==="c")$("bClear").onclick();else if(k==="r")$("bReload").onclick();
  else if(k==="h"||k==="?")help.classList.toggle("show");
  else if(k==="`"||k==="~"){const i=VIEWS.findIndex(x=>x[0]===S.view);setView(VIEWS[(i+1)%VIEWS.length][0]);}
  else if(k==="n")setView(S.view===6?0:6);
  else if(k==="["||k==="]"){S.brush=Math.max(1,Math.min(40,S.brush+(k==="]"?1:-1)));ctxUI();}
  else if(k==="+"||k==="=")zoomStep(1);else if(k==="-")zoomStep(-1);else if(k==="0"){cam.z=1;cam.x=cam.y=0;}
  else if(k.startsWith("arrow")){e.preventDefault();const d=40/cam.z;if(k==="arrowleft")cam.x-=d;if(k==="arrowright")cam.x+=d;if(k==="arrowup")cam.y-=d;if(k==="arrowdown")cam.y+=d;clampCam();}});

// ---------- readouts ----------
let lastWater=0,lastSim=0,rateShown=0,frames=0,lastT=performance.now(),fps=0,ui=0;
// thrust = the net push of the gas (above outside pressure) on everything solid; propellant use = what the tanks pour out
let thrX=0,thrY=0,mdotS=0,lastMass=0,lastMassT=0,lastSrb=0,burn=null;
// which fuel the engine on the stand burns: whichever fuel gas the tanks hold most of (flight draws its flame to match)
function standFuel(){let h=0,c=0,k=0;for(const t of tanks){h+=t.Y[H2]||0;c+=t.Y[CH4]||0;k+=t.Y[KER]||0;}return c>h&&c>=k?"ch4":k>h&&k>c?"kero":"h2";}
function measureThrust(){let fx=0,fy=0;const A=DX*DX;
  for(let k=0;k<NC;k++){if(wall[k])continue;const x=k%NX,pg=(GAM-1)*(En[k]-0.5*(mx[k]*mx[k]+my[k]*my[k])/rho[k])-pAmb;
    if(x>0&&wall[k-1])fx-=pg*A;if(x<NX-1&&wall[k+1])fx+=pg*A;if(k>=NX&&wall[k-NX])fy-=pg*A;if(k+NX<NC&&wall[k+NX])fy+=pg*A;}
  thrX=thrX*0.7+fx*0.3;thrY=thrY*0.7+fy*0.3;
  let m=0;for(let s=0;s<NS;s++)m+=added[s]-removed[s];
  // a solid motor's propellant use is what the grain burns (the hollow it leaves refills for free in the time-lapse)
  if(simTime>lastMassT&&lastMassT>0){const dt=simTime-lastMassT,md=srbMass>lastSrb||srbBurning?(srbMass-lastSrb)/dt:(m-lastMass)/dt;if(isFinite(md))mdotS=mdotS*0.7+md*0.3;
    // booster burn summary: impulse and average Isp over the whole burn
    if(srbBurning&&!burn)burn={t0:lastMassT,m0:lastSrb,imp:0,peak:0,done:false,s:[],air:atmo};
    if(burn&&!burn.done){const F=Math.hypot(thrX,thrY);burn.imp+=F*dt;burn.peak=Math.max(burn.peak,F);burn.s.push([burn.imp,F,srbMass]);if(!srbBurning&&srbMass-burn.m0>0){burn.done=true;burn.t1=simTime;burnDone(burn);}}}
  if(srbMass<lastSrb)burn=null;
  lastMass=m;lastMassT=simTime;lastSrb=srbMass;}
// a finished booster burn goes to flight (and the engine library): average thrust, Isp, and the thrust curve. The curve is sampled
// against impulse delivered so far, which is the same as propellant burned (Isp is steady), because flight burns it that way
// Booster Isp = thrust ÷ propellant burn rate while the motor pushes properly (above half its peak thrust). The time-lapse makes
// the chamber fill at ignition and the blow-down after burnout ~120× too big, so averaging over the whole burn reads too low.
function steadyIsp(b){const on=b.s.filter(q=>q[1]>0.5*b.peak);if(on.length<3)return 0;const a=on[0],z=on[on.length-1];
  return z[2]>a[2]?(z[0]-a[0])/((z[2]-a[2])*9.80665):0;}
function burnDone(b){const mp=srbMass-b.m0,dur=b.t1-b.t0;if(!(mp>0&&dur>0&&b.imp>0)||b.s.length<4)return;
  const Fa=b.imp/dur,N=12,c=[];let j=0;
  for(let i=0;i<N;i++){const I=b.imp*(i+0.5)/N;while(j<b.s.length-1&&b.s[j][0]<I)j++;c.push(b.s[j][1]/Fa);}
  const mean=c.reduce((a,x)=>a+x,0)/N;
  recordBurn({F:Fa,isp:steadyIsp(b)||b.imp/(mp*9.80665),curve:c.map(x=>+(x/mean).toFixed(3)),atmo:b.air,dur});}
const ARW=["→","↘","↓","↙","←","↖","↑","↗"];
let lastF=0;
function readouts(){
  const set=(id,v)=>{ROLL.delete(id);const el=$(id);if(el.textContent!==v)el.textContent=v;};
  if(mouse.in){const cx=mouse.x/CP|0,cy=mouse.y/CP|0,k=cy*NX+cx;
    if(wall[k]){set("rP",wall[k]===4?`propellant ${Math.round(prop[k]*100)}%${lit[k]?" · burning":""}`:["","wall","valve","igniter"][wall[k]]);["rT","rV","rM","rG","rX"].forEach(i=>set(i,"–"));}
    else{const w=cellPrim(k),sp=Math.hypot(w.u,w.v),c=Math.sqrt(GAM*w.p/w.r);roll("rP",$("rP"),w.p/PSI_PA,x=>x.toFixed(1)+" psi");roll("rT",$("rT"),w.T,x=>fmt(x)+" K");roll("rV",$("rV"),sp,x=>fmt(x)+" m/s");set("rM",(sp/c).toFixed(2));
      const X=w.Y.map((y,s)=>y/MW[s]),ns=X.reduce((a,b)=>a+b,0),top=X.map((x,s)=>[x/ns,s]).sort((a,b)=>b[0]-a[0]).filter(q=>q[0]>0.08).slice(0,2);
      set("rG",top.map(([f,s])=>`${SPN[s]} ${Math.round(f*100)}%`).join(" · "));
      // mixture: the oxygen here compared with what the fuel here needs to burn completely (per molecule: H₂ ½, CH₄ 2, a kerosene CH₂ link 1½)
      const need=X[H2]*0.5+X[CH4]*2+X[KER]*1.5,no=X[O2],phi=no/need;
      set("rX",need/ns<0.01||no/ns<0.02?"–":`${phi<0.85?"fuel-rich":phi>1.15?"O₂-rich":"perfect"} · ${phi.toFixed(2)}× O₂`);}}
  else ["rP","rT","rV","rM","rG","rX"].forEach(i=>set(i,"–"));
  if(++ui%10===0){
    if(simTime>lastSim){const r=(waterMade-lastWater)/(simTime-lastSim)*MW[H2O]*1000;rateShown=rateShown*0.6+r*0.4;lastWater=waterMade;lastSim=simTime;}
    set("rW",rateShown>0.05?rateShown.toFixed(1)+" g/s":"–");
    measureThrust();const F=Math.hypot(thrX,thrY);
    // sound follows the thrust; goals tick off when something real happens on the stand
    JUICE.stand.F=F;JUICE.stand.srb=!!srbBurning;JUICE.stand.air=atmo?1:0;
    if(F>800&&!srbBurning)JUICE.goal("light");if(F>800&&!atmo)JUICE.goal("vac");if(burn&&burn.done)JUICE.goal("srb");
    {const ar=ARW[((Math.round(Math.atan2(thrY,thrX)/(Math.PI/4))%8)+8)%8];roll("rF",$("rF"),F<100?null:F,x=>(x>=1000?(x/1000).toFixed(2)+" kN ":Math.round(x)+" N ")+ar);}
    if(F>1200&&lastF<300&&!S.paused)kick($("stage"),Math.min(1,F/3500));lastF=F;   // something just lit: jolt the screen
    if(!srbBurning)recordTest(F,F>=100&&mdotS>1e-2?F/(mdotS*9.80665):0,standFuel());
    roll("rI",$("rI"),F>=100&&mdotS>1e-2?F/(mdotS*9.80665):null,x=>Math.round(x)+" s");
    {const r=$("rowB");if(burn){r.style.display="";const mp=srbMass-burn.m0,t=(burn.done?burn.t1:simTime)-burn.t0;
      set("rBurn",`${burn.done?"burnt out":"burning"} · ${(t*1e3).toFixed(1)} ms · peak ${(burn.peak/1000).toFixed(2)} kN · ${burn.imp.toFixed(1)} N·s${steadyIsp(burn)>0?` · Isp ${Math.round(steadyIsp(burn))} s`:""}`);}else r.style.display="none";}
    const ac=atomCheck();set("rA",ac.ok?"conserved ✓":"drift");$("rA").className=ac.ok?"ok":"bad";
    set("rS",(simTime*1000).toFixed(2)+" ms · "+fps+" fps");$("rS").title=PERF.sps+" physics steps per second";
    if(sel)inspUI(false);}
}
const PERF={step:0,render:0,sps:0},BUDGET=26;window.__perf=PERF;let stepsWin=0;
function frame(now){
  if(FLT.on||FLT.vab){requestAnimationFrame(frame);return;}     // flying: the test stand waits
  const sparkHeld=S.tool==="spark"&&mouse.down&&mouse.btn===0&&!S.paused;
  if(worker){
    if(sparkHeld){const[a,b,c,d]=brushRect(mouse.x/CP|0,mouse.y/CP|0);doAct("heat",a,b,c,d,2500);}
    if(snap)takeSnapshot();askSnapshot(now);
  }else if(!S.paused){let dts=0;runPlugs();runSparks();
    if(sparkHeld){const[a,b,c,d]=brushRect(mouse.x/CP|0,mouse.y/CP|0);heatRegion(a,b,c,d,2500);}
    const t0=performance.now(),cap=S.spd>=10?60:S.spd;let n=0;   // no background thread: as many steps as fit in ~26 ms
    do{dts+=step();n++;}while(n<cap&&performance.now()-t0+PERF.step<BUDGET);
    PERF.step=PERF.step*0.8+(performance.now()-t0)/n*0.2;stepsWin+=n;tracers(dts);keysUI();}
  const t1=performance.now();render();PERF.render=PERF.render*0.9+(performance.now()-t1)*0.1;frames++;
  if(now-lastT>=500){fps=Math.round(frames*1000/(now-lastT));if(!worker)PERF.sps=Math.round(stepsWin*1000/(now-lastT));stepsWin=0;frames=0;lastT=now;}
  readouts();requestAnimationFrame(frame);}
setTool("select");setView(6);load("engine");startWorker();
requestAnimationFrame(frame);
/*FLIGHT*/
})();
