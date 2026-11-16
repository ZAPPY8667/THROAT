// ===== THROAT GPU physics: the same gas solver, run on the graphics card (WebGPU) =====
// The CPU core (core.js) stays in charge of everything you build and everything that happens rarely: edits, valves opening on
// their timers, check valves, the igniter's random flicker. The GPU does the heavy part every step, for every cell at once:
// tanks refilling, the time step, the gas moving (MUSCL-Hancock + HLLC, the same scheme as core.js), igniter flames,
// injector jets, solid propellant burning and burning out, stirring, burning and heat loss.
// Between bursts of steps the CPU reads the whole world back (the screen needs it anyway), runs its own rules, and if it
// changed anything sends the world back up. If WebGPU isn't there, the game just keeps using the CPU (glue.js).
// Numbers on the GPU are 32-bit (7 digits) instead of 64-bit: plenty for gas, and the atom bookkeeping still balances.
const GPU={on:false,dev:null,err:"",steps:0};
(function(){
const NF=4+NS,WG=64;   // fields per cell: rho, mx, my, En, then one per gas
const NWG=Math.ceil(NC/WG),NWGR=Math.ceil(NC/256);
// float buffer layout (indices into FB)
const OPROP=0,ORR=NC,OMG=2*NC,OMS=3*NC,OYB=4*NC,OACC=12*NC,NACC=20,ODT=OACC+NACC*NC,OPART=ODT+4,ORED=OPART+NWGR,FBN=ORED+NWGR*NACC;
const LMAX=1<<16;      // floats in the per-burst list buffer (tanks, igniter sources, heat spots, injector holes)
const f=x=>{const s=String(+x);return /[.e]/.test(s)?s:s+".0";};
const arr=(a,n)=>"array<f32,"+n+">("+Array.from({length:n},(_,i)=>f(a[i]||0)).join(",")+")";
function wgsl(){return `
const NX:u32=${NX}u; const NY:u32=${NY}u; const NC:u32=${NC}u;
const RHO_MIN:f32=${f(1e-5)}; const P_MIN:f32=5.0; const DX:f32=${f(DX)}; const CELLV:f32=${f(CELLV)}; const RU:f32=${f(RU)};
const MW=${arr(MW,8)}; const AIRY=${arr(AIRY,8)}; const SRB_Y=${arr(SRB_Y,8)};
const FSP=array<u32,3>(${FUELS.map(F=>F[0]+"u").join(",")}); const FNU=${arr(FUELS.map(F=>F[1]),3)}; const FDH=${arr(FUELS.map(F=>F[2]),3)};
const FNW=${arr(FUELS.map(F=>F[3]),3)}; const FNC=${arr(FUELS.map(F=>F[4]),3)}; const FTI=${arr(FUELS.map(F=>F[5]),3)};
const OPROP:u32=${OPROP}u; const ORR:u32=${ORR}u; const OMG:u32=${OMG}u; const OMS:u32=${OMS}u; const OYB:u32=${OYB}u;
const OACC:u32=${OACC}u; const ODT:u32=${ODT}u; const OPART:u32=${OPART}u; const ORED:u32=${ORED}u;
struct Pm{gam:f32,pAmb:f32,tAmb:f32,rhoAmb:f32,cfl:f32,heat:f32,kr:f32,comb:f32,
  coolTau:f32,uCool:f32,hazeU:f32,atmo:f32,dmix:f32,mixM:f32,uMix:f32,nMix:f32,
  srbA:f32,srbN:f32,srbK:f32,rhoP:f32,eSrb:f32,srbTign:f32,heatScale:f32,pad0:f32,
  nWG:u32,nTank:u32,nSrc:u32,nHeat:u32,nSpark:u32,nInj:u32,srcOff:u32,heatOff:u32,
  sparkOff:u32,injOff:u32,pad1:u32,pad2:u32};
@group(0) @binding(0) var<uniform> P:Pm;
@group(0) @binding(1) var<storage,read_write> A:array<f32>;    // the world now
@group(0) @binding(2) var<storage,read_write> B:array<f32>;    // the world after this pass (then they swap)
@group(0) @binding(3) var<storage,read_write> W:array<u32>;    // wall type | inside a tank <<8 | burning <<9 | tank number <<16
@group(0) @binding(4) var<storage,read_write> BS:array<atomic<u32>>;  // injector stirring boost per cell, then counters
@group(0) @binding(5) var<storage,read_write> FB:array<f32>;   // propellant left, flame glow, scratch, bookkeeping, time step
@group(0) @binding(6) var<storage,read> L:array<f32>;          // lists from the CPU: tanks, igniter sources, heat spots, injector holes
var<workgroup> SH:array<f32,256>;
fn wl(k:u32)->u32{return W[k]&255u;}
fn rsv(k:u32)->bool{return (W[k]&256u)!=0u;}
fn blk(k:u32)->bool{return (W[k]&511u)!=0u;}
fn G1()->f32{return P.gam-1.0;}
fn dtv()->f32{return FB[ODT];}
fn acc(c:u32,k:u32,v:f32){FB[OACC+c*NC+k]+=v;}
fn presA(k:u32)->f32{let r=A[k];return G1()*(A[3u*NC+k]-0.5*(A[NC+k]*A[NC+k]+A[2u*NC+k]*A[2u*NC+k])/r);}
fn RcellA(k:u32)->f32{var s=0.0;for(var i=0u;i<8u;i++){s+=A[(4u+i)*NC+k]/MW[i];}return RU*s/A[k];}

// ---------- 1. tanks refill, stirring boost cleared, fastest signal for the time step ----------
@compute @workgroup_size(256) fn begin(@builtin(global_invocation_id) g:vec3<u32>,@builtin(local_invocation_id) l:vec3<u32>,@builtin(workgroup_id) wg:vec3<u32>){
  let k=g.x;var smax=1.0;
  if(k<NC){
    atomicStore(&BS[k],0u);
    let w=W[k];
    if((w&255u)==0u){
      let t=(w>>16u)&255u;
      if(t>0u){let o=(t-1u)*10u;
        for(var s=0u;s<8u;s++){let nv=L[o+s];acc(s,k,(nv-A[(4u+s)*NC+k])*CELLV);A[(4u+s)*NC+k]=nv;}
        A[k]=L[o+8u];A[NC+k]=0.0;A[2u*NC+k]=0.0;A[3u*NC+k]=L[o+9u];}
      let r=A[k];let u=A[NC+k]/r;let v=A[2u*NC+k]/r;let p=G1()*(A[3u*NC+k]-0.5*r*(u*u+v*v));let c=sqrt(P.gam*max(p,P_MIN)/r);
      smax=max(smax,max(abs(u),abs(v))+c);}}
  SH[l.x]=smax;workgroupBarrier();
  for(var s=128u;s>0u;s>>=1u){if(l.x<s){SH[l.x]=max(SH[l.x],SH[l.x+s]);}workgroupBarrier();}
  if(l.x==0u){FB[OPART+wg.x]=SH[0];}
}
@compute @workgroup_size(256) fn dtk(@builtin(local_invocation_id) l:vec3<u32>){
  var m=1.0;for(var i=l.x;i<P.nWG;i+=256u){m=max(m,FB[OPART+i]);}
  SH[l.x]=m;workgroupBarrier();
  for(var s=128u;s>0u;s>>=1u){if(l.x<s){SH[l.x]=max(SH[l.x],SH[l.x+s]);}workgroupBarrier();}
  if(l.x==0u){let dt=P.cfl*DX/SH[0];FB[ODT]=dt;FB[ODT+1u]+=dt;atomicStore(&BS[NC],0u);}
}

// ---------- 2. gas moving: one pass along x, one along y (each cell works out both of its faces) ----------
struct Pr{r:f32,u:f32,t:f32,p:f32}
struct Rec{L:Pr,R:Pr,LY:array<f32,8>,RY:array<f32,8>}
struct Fl{f0:f32,f1:f32,f2:f32,f3:f32,fs:array<f32,8>}
struct Gh{s:Pr,inflow:bool}
fn cid(line:u32,pos:i32,isX:bool)->u32{if(isX){return line*NX+u32(pos);}return u32(pos)*NX+line;}
fn loadP(k:u32,isX:bool)->Pr{
  let r=max(A[k],RHO_MIN);
  var M=A[2u*NC+k];var T=A[NC+k];if(isX){M=A[NC+k];T=A[2u*NC+k];}
  let u=M/r;let t=T/r;let p=max(G1()*(A[3u*NC+k]-0.5*r*(u*u+t*t)),P_MIN);
  return Pr(r,u,t,p);}
fn loadY(k:u32)->array<f32,8>{
  let r=max(A[k],RHO_MIN);var y:array<f32,8>;var sm=0.0;
  for(var s=0u;s<8u;s++){let v=max(A[(4u+s)*NC+k]/r,0.0);y[s]=v;sm+=v;}
  if(sm>0.0){let q=1.0/sm;for(var s=0u;s<8u;s++){y[s]*=q;}}
  return y;}
fn ghost(w:Pr,sd:f32)->Gh{
  let c=sqrt(P.gam*w.p/w.r);let out=sd*w.u;
  if(out>=c){return Gh(w,false);}
  if(out>=0.0){return Gh(Pr(w.r,w.u,w.t,P.pAmb),false);}
  let ra=P.rhoAmb;return Gh(Pr(ra,w.u,0.0,max(P.pAmb*0.2,P.pAmb-0.5*ra*w.u*w.u)),true);}
fn mm(a:f32,b:f32)->f32{if(a*b<=0.0){return 0.0;}if(abs(a)<abs(b)){return a;}return b;}
fn recon(line:u32,i:i32,len:i32,isX:bool,h:f32)->Rec{
  let k=cid(line,i,isX);let w=loadP(k,isX);let wy=loadY(k);
  var a=w;var b=w;var ya=wy;var yb=wy;
  if(i==0){a=ghost(w,-1.0).s;}else{let ka=cid(line,i-1,isX);if(wl(ka)!=0u){a=Pr(w.r,-w.u,w.t,w.p);}else{a=loadP(ka,isX);ya=loadY(ka);}}
  if(i==len-1){b=ghost(w,1.0).s;}else{let kb=cid(line,i+1,isX);if(wl(kb)!=0u){b=Pr(w.r,-w.u,w.t,w.p);}else{b=loadP(kb,isX);yb=loadY(kb);}}
  let dr=mm(w.r-a.r,b.r-w.r);let du=mm(w.u-a.u,b.u-w.u);let dtt=mm(w.t-a.t,b.t-w.t);let dp=mm(w.p-a.p,b.p-w.p);
  var lr=w.r-0.5*dr;var lu=w.u-0.5*du;var lt=w.t-0.5*dtt;var lp=w.p-0.5*dp;
  var qr=w.r+0.5*dr;var qu=w.u+0.5*du;var qt=w.t+0.5*dtt;var qp=w.p+0.5*dp;
  var o:Rec;
  for(var s=0u;s<8u;s++){let y=wy[s];let da=y-ya[s];let db=yb[s]-y;var hd=0.0;
    if(da*db>0.0){if(da>0.0){hd=0.5*min(da,db);}else{hd=0.5*max(da,db);}}
    o.LY[s]=max(y-hd,0.0);o.RY[s]=max(y+hd,0.0);}
  if(lr<=RHO_MIN||qr<=RHO_MIN||lp<=P_MIN||qp<=P_MIN){lr=w.r;qr=w.r;lu=w.u;qu=w.u;lt=w.t;qt=w.t;lp=w.p;qp=w.p;}
  let g1=G1();
  let ELc=lp/g1+0.5*lr*(lu*lu+lt*lt);let ERc=qp/g1+0.5*qr*(qu*qu+qt*qt);
  let d0=lr*lu-qr*qu;let d1=(lr*lu*lu+lp)-(qr*qu*qu+qp);let d2=lr*lu*lt-qr*qu*qt;let d3=lu*(ELc+lp)-qu*(ERc+qp);
  let c0=lr+h*d0;let c1=lr*lu+h*d1;let c2=lr*lt+h*d2;let c3=ELc+h*d3;let e0=qr+h*d0;let e1=qr*qu+h*d1;let e2=qr*qt+h*d2;let e3=ERc+h*d3;
  let pl=g1*(c3-0.5*(c1*c1+c2*c2)/c0);let pr=g1*(e3-0.5*(e1*e1+e2*e2)/e0);
  if(c0<=RHO_MIN||e0<=RHO_MIN||pl<=P_MIN||pr<=P_MIN){o.L=w;o.R=w;}
  else{o.L=Pr(c0,c1/c0,c2/c0,pl);o.R=Pr(e0,e1/e0,e2/e0,pr);}
  return o;}
fn face(line:u32,fi:i32,len:i32,isX:bool,h:f32)->Fl{
  var o:Fl;let a=fi-1;let b=fi;
  let aF=a>=0&&wl(cid(line,max(a,0),isX))==0u;let bF=b<len&&wl(cid(line,min(b,len-1),isX))==0u;
  if(!aF&&!bF){return o;}
  var s:Pr;var t:Pr;var sY:array<f32,8>;var tY:array<f32,8>;var edgeIn=false;
  if(aF){let ra=recon(line,a,len,isX,h);s=ra.R;sY=ra.RY;}
  if(bF){let rb=recon(line,b,len,isX,h);t=rb.L;tY=rb.LY;}
  if(!aF){if(a<0){let gh=ghost(t,-1.0);s=gh.s;edgeIn=gh.inflow;}else{s=Pr(t.r,-t.u,t.t,t.p);}}
  if(!bF){if(b>=len){let gh=ghost(s,1.0);t=gh.s;edgeIn=gh.inflow;}else{t=Pr(s.r,-s.u,s.t,s.p);}}
  // HLLC (same as core.js hllc)
  let g=P.gam;let rL=s.r;let uL=s.u;let tL=s.t;let pL=s.p;let rR=t.r;let uR=t.u;let tR=t.t;let pR=t.p;
  let cL=sqrt(g*pL/rL);let cR=sqrt(g*pR/rR);
  let EL=pL/(g-1.0)+0.5*rL*(uL*uL+tL*tL);let ER=pR/(g-1.0)+0.5*rR*(uR*uR+tR*tR);
  let SL=min(uL-cL,uR-cR);let SR=max(uL+cL,uR+cR);var fromRight=false;
  if(SL>=0.0){o.f0=rL*uL;o.f1=rL*uL*uL+pL;o.f2=rL*uL*tL;o.f3=uL*(EL+pL);}
  else if(SR<=0.0){o.f0=rR*uR;o.f1=rR*uR*uR+pR;o.f2=rR*uR*tR;o.f3=uR*(ER+pR);fromRight=true;}
  else{let Ss=(pR-pL+rL*uL*(SL-uL)-rR*uR*(SR-uR))/(rL*(SL-uL)-rR*(SR-uR));
    if(Ss>=0.0){let q=rL*(SL-uL)/(SL-Ss);
      o.f0=rL*uL+SL*(q-rL);o.f1=rL*uL*uL+pL+SL*(q*Ss-rL*uL);o.f2=rL*uL*tL+SL*(q*tL-rL*tL);o.f3=uL*(EL+pL)+SL*(q*(EL/rL+(Ss-uL)*(Ss+pL/(rL*(SL-uL))))-EL);}
    else{let q=rR*(SR-uR)/(SR-Ss);
      o.f0=rR*uR+SR*(q-rR);o.f1=rR*uR*uR+pR+SR*(q*Ss-rR*uR);o.f2=rR*uR*tR+SR*(q*tR-rR*tR);o.f3=uR*(ER+pR)+SR*(q*(ER/rR+(Ss-uR)*(Ss+pR/(rR*(SR-uR))))-ER);fromRight=true;}}
  // gases ride the mass flux with the make-up of the upwind side
  let m=o.f0;let upGas=select(aF,bF,fromRight);
  if(!upGas&&edgeIn){for(var q=0u;q<8u;q++){o.fs[q]=m*AIRY[q];}}
  else if(upGas){if(fromRight){for(var q=0u;q<8u;q++){o.fs[q]=m*tY[q];}}else{for(var q=0u;q<8u;q++){o.fs[q]=m*sY[q];}}}
  else if(aF){for(var q=0u;q<8u;q++){o.fs[q]=m*sY[q];}}else{for(var q=0u;q<8u;q++){o.fs[q]=m*tY[q];}}
  return o;}
fn sweep(k:u32,isX:bool){
  if(k>=NC){return;}
  if(wl(k)!=0u){for(var q=0u;q<12u;q++){B[q*NC+k]=A[q*NC+k];}return;}
  var line:u32;var pos:i32;var len:i32;
  if(isX){line=k/NX;pos=i32(k%NX);len=i32(NX);}else{line=k%NX;pos=i32(k/NX);len=i32(NY);}
  let dt=dtv();let lam=dt/DX;let h=0.5*lam;let fa=dt*DX*DX;let g1=G1();
  let Fl_=face(line,pos,len,isX,h);let Fr=face(line,pos+1,len,isX,h);
  var M=A[2u*NC+k];var T=A[NC+k];if(isX){M=A[NC+k];T=A[2u*NC+k];}
  M-=lam*(Fr.f1-Fl_.f1);T-=lam*(Fr.f2-Fl_.f2);var E=A[3u*NC+k]-lam*(Fr.f3-Fl_.f3);
  var sum=0.0;var vs:array<f32,8>;
  for(var s=0u;s<8u;s++){var v=A[(4u+s)*NC+k]-lam*(Fr.fs[s]-Fl_.fs[s]);if(v<0.0){acc(s,k,-v*CELLV);v=0.0;}vs[s]=v;sum+=v;}
  if(sum<RHO_MIN){let ad=RHO_MIN-sum;vs[2]+=ad;acc(2u,k,ad*CELLV);sum=RHO_MIN;}
  for(var s=0u;s<8u;s++){B[(4u+s)*NC+k]=vs[s];}
  B[k]=sum;
  let ke=0.5*(M*M+T*T)/sum;if(E-ke<P_MIN/g1){E=ke+P_MIN/g1;}
  if(isX){B[NC+k]=M;B[2u*NC+k]=T;}else{B[2u*NC+k]=M;B[NC+k]=T;}
  B[3u*NC+k]=E;
  // gas leaving (or coming in) through the open edges of the world
  if(pos==0){for(var s=0u;s<8u;s++){acc(8u+s,k,-Fl_.fs[s]*fa);}}
  if(pos==len-1){for(var s=0u;s<8u;s++){acc(8u+s,k,Fr.fs[s]*fa);}}
}
@compute @workgroup_size(${WG}) fn sweepX(@builtin(global_invocation_id) g:vec3<u32>){sweep(g.x,true);}
@compute @workgroup_size(${WG}) fn sweepY(@builtin(global_invocation_id) g:vec3<u32>){sweep(g.x,false);}

// ---------- 3. igniter flames: fuel-rich gas poured in, then spots held hot ----------
@compute @workgroup_size(64) fn sources(@builtin(global_invocation_id) g:vec3<u32>){
  if(g.x>=P.nSrc){return;}let o=P.srcOff+g.x*13u;let k=u32(L[o]);let dm=L[o+1u]*dtv();
  for(var s=0u;s<8u;s++){let m=dm*L[o+5u+s];A[(4u+s)*NC+k]+=m;acc(s,k,m*CELLV);}
  A[k]+=dm;A[NC+k]+=dm*L[o+2u];A[2u*NC+k]+=dm*L[o+3u];A[3u*NC+k]+=dm*L[o+4u];}
fn heatCell(k:u32,T:f32){if(wl(k)!=0u){return;}
  let r=A[k];let ke=0.5*(A[NC+k]*A[NC+k]+A[2u*NC+k]*A[2u*NC+k])/r;let need=r*RcellA(k)*T/G1();
  if(A[3u*NC+k]-ke<need){A[3u*NC+k]=ke+need;}}
@compute @workgroup_size(64) fn heat(@builtin(global_invocation_id) g:vec3<u32>){
  if(g.x>=P.nHeat){return;}let o=P.heatOff+g.x*2u;heatCell(u32(L[o]),L[o+1u]);}
@compute @workgroup_size(64) fn spark(@builtin(global_invocation_id) g:vec3<u32>){
  if(g.x>=P.nSpark){return;}let o=P.sparkOff+g.x*2u;heatCell(u32(L[o]),L[o+1u]);}

// ---------- 4. injector holes: the jet leaves toward the lower pressure, steered by the injector type ----------
@compute @workgroup_size(64) fn injk(@builtin(global_invocation_id) g:vec3<u32>){
  if(g.x>=P.nInj){return;}let o=P.injOff+g.x*10u;
  let hk=u32(L[o]);let ka=u32(L[o+1u]);let kb=u32(L[o+2u]);
  if(wl(hk)!=0u||wl(ka)!=0u||wl(kb)!=0u){return;}
  let nx=L[o+3u];let ny=L[o+4u];let ax=L[o+5u];let ay=L[o+6u];let a=L[o+7u];let boost=L[o+8u];
  var out=1.0;var d=kb;if(presA(ka)<presA(kb)){out=-1.0;d=ka;}
  if(a!=0.0){let m=sqrt(A[NC+d]*A[NC+d]+A[2u*NC+d]*A[2u*NC+d]);let along=(A[NC+d]*nx+A[2u*NC+d]*ny)*out;
    if(along>0.0){let tx=nx*out*cos(a)+ax*sin(a);let ty=ny*out*cos(a)+ay*sin(a);A[NC+d]=m*tx;A[2u*NC+d]=m*ty;}}
  if(boost>0.0){let dx=i32(d%NX);let dy=i32(d/NX);let bb=bitcast<u32>(boost);
    for(var yy=dy-2;yy<=dy+2;yy++){for(var xx=dx-2;xx<=dx+2;xx++){
      let sx=xx+i32(nx*out*2.0);let sy=yy+i32(ny*out*2.0);
      if(sx<0||sy<0||sx>=i32(NX)||sy>=i32(NY)){continue;}atomicMax(&BS[u32(sy)*NX+u32(sx)],bb);}}}
}

// ---------- 5. solid propellant: burn where it touches hot gas, pour exhaust into the gas beside it, open up when gone ----------
fn nb(k:u32,d:u32)->i32{let x=k%NX;let y=k/NX;
  if(d==0u){if(x>0u){return i32(k-1u);}return -1;} if(d==1u){if(x<NX-1u){return i32(k+1u);}return -1;}
  if(d==2u){if(y>0u){return i32(k-NX);}return -1;} if(y<NY-1u){return i32(k+NX);}return -1;}
@compute @workgroup_size(64) fn srbBurn(@builtin(global_invocation_id) g:vec3<u32>){
  let k=g.x;if(k>=NC){return;}FB[OMG+k]=0.0;FB[OMS+k]=0.0;
  if(wl(k)!=4u){return;}
  var faces=0.0;var pSum=0.0;var hot=false;let isLit=(W[k]&512u)!=0u;
  for(var d=0u;d<4u;d++){let j=nb(k,d);if(j<0){continue;}let ju=u32(j);if(blk(ju)){continue;}
    faces+=1.0;let p=presA(ju);pSum+=p;if(!isLit&&p/(A[ju]*RcellA(ju))>P.srbTign){hot=true;}}
  if(faces==0.0){return;}
  if(!isLit){if(!hot){return;}W[k]=W[k]|512u;}
  atomicAdd(&BS[NC],1u);
  let dt=dtv();let Pc=max(2e4,pSum/faces);let r=P.srbA*pow(Pc,P.srbN);
  let want=faces*r*P.srbK*dt/DX;let pr=FB[OPROP+k];let take=min(want,pr);let mFace=P.rhoP*r*DX*DX*dt*(take/want);
  FB[OMG+k]=mFace;acc(17u,k,mFace*faces);
  FB[OPROP+k]=pr-take;
  if(pr-take<=1e-6){FB[OMS+k]=1.0;}}
@compute @workgroup_size(64) fn srbGas(@builtin(global_invocation_id) g:vec3<u32>){
  let k=g.x;if(k>=NC){return;}if(blk(k)){return;}
  for(var d=0u;d<4u;d++){let j=nb(k,d);if(j<0){continue;}let ju=u32(j);if(wl(ju)!=4u){continue;}let mf=FB[OMG+ju];if(mf<=0.0){continue;}
    let dr=mf/CELLV;
    for(var s=0u;s<8u;s++){let a=SRB_Y[s]*dr;if(a!=0.0){A[(4u+s)*NC+k]+=a;acc(s,k,a*CELLV);}}
    A[k]+=dr;A[3u*NC+k]+=dr*P.eSrb;}}
// a burnt-out cell becomes gas like its gas neighbours (worked out into the spare buffer, then copied in)
@compute @workgroup_size(64) fn srbOpen1(@builtin(global_invocation_id) g:vec3<u32>){
  let k=g.x;if(k>=NC){return;}if(FB[OMS+k]==0.0){return;}
  var n=0.0;var Psum=0.0;var Tsum=0.0;var Y:array<f32,8>;
  for(var d=0u;d<4u;d++){let j=nb(k,d);if(j<0){continue;}let ju=u32(j);if(wl(ju)!=0u||A[ju]<=0.0){continue;}
    let r=A[ju];let p=presA(ju);n+=1.0;Psum+=p;Tsum+=p/(r*RcellA(ju));for(var s=0u;s<8u;s++){Y[s]+=A[(4u+s)*NC+ju]/r;}}
  var Pg=P.pAmb;var Tg=P.tAmb;
  if(n>0.0){Pg=Psum/n;Tg=Tsum/n;for(var s=0u;s<8u;s++){Y[s]/=n;}}else{for(var s=0u;s<8u;s++){Y[s]=AIRY[s];}}
  var ry=0.0;for(var s=0u;s<8u;s++){ry+=Y[s]/MW[s];}
  let r=Pg/(RU*ry*Tg);
  for(var s=0u;s<8u;s++){B[(4u+s)*NC+k]=r*Y[s];}
  B[k]=r;B[NC+k]=0.0;B[2u*NC+k]=0.0;B[3u*NC+k]=Pg/G1();}
@compute @workgroup_size(64) fn srbOpen2(@builtin(global_invocation_id) g:vec3<u32>){
  let k=g.x;if(k>=NC){return;}if(FB[OMS+k]==0.0){return;}
  for(var q=0u;q<12u;q++){A[q*NC+k]=B[q*NC+k];}
  for(var s=0u;s<8u;s++){acc(s,k,B[(4u+s)*NC+k]*CELLV);}
  acc(18u,k,B[k]*CELLV);
  W[k]=W[k]&0xFFFFFC00u;FB[OPROP+k]=0.0;}

// ---------- 6. stirring: neighbouring cells swap a little of everything where different gases meet ----------
fn narrow(k:u32)->bool{let x=k%NX;let y=k/NX;
  return (x>0u&&x<NX-1u&&blk(k-1u)&&blk(k+1u))||(y>0u&&y<NY-1u&&blk(k-NX)&&blk(k+NX));}
@compute @workgroup_size(64) fn mixPrep(@builtin(global_invocation_id) g:vec3<u32>){
  let k=g.x;if(k>=NC){return;}
  if(blk(k)||narrow(k)){FB[OMG+k]=0.0;return;}
  let want=P.dmix*dtv()/(DX*DX);let c0=min(0.22,want/P.nMix);
  let r=A[k];let u=A[NC+k]/r;let v=A[2u*NC+k]/r;let p=G1()*(A[3u*NC+k]-0.5*r*(u*u+v*v));
  let Mc=sqrt((u*u+v*v)*r/(P.gam*max(p,1.0)));
  FB[OMG+k]=select(c0*(1.0-Mc/P.mixM),0.0,Mc>=P.mixM);FB[OMS+k]=min(1.0,sqrt(u*u+v*v)/P.uMix);
  for(var s=0u;s<8u;s++){FB[OYB+s*NC+k]=A[(4u+s)*NC+k]/r;}}
fn coef(k:u32,j:u32)->f32{
  let a=FB[OMG+k];let b=FB[OMG+j];if(a==0.0||b==0.0){return 0.0;}
  var dY=0.0;for(var s=0u;s<8u;s++){dY+=abs(FB[OYB+s*NC+k]-FB[OYB+s*NC+j]);}if(dY<0.01){return 0.0;}
  let bo=max(bitcast<f32>(atomicLoad(&BS[k])),bitcast<f32>(atomicLoad(&BS[j])));var sp=max(FB[OMS+k],FB[OMS+j]);if(bo>sp){sp=bo;}
  if(sp<=0.0){return 0.0;}
  return min(0.24,min(a,b)*sp*(1.0+2.0*bo));}
@compute @workgroup_size(64) fn mixIt(@builtin(global_invocation_id) g:vec3<u32>){
  let k=g.x;if(k>=NC){return;}
  var c=array<f32,4>(0.0,0.0,0.0,0.0);var jj=array<u32,4>(k,k,k,k);
  if(FB[OMG+k]!=0.0){for(var d=0u;d<4u;d++){let j=nb(k,d);if(j>=0){jj[d]=u32(j);c[d]=coef(k,u32(j));}}}
  for(var q=0u;q<12u;q++){let o=q*NC;let a=A[o+k];var v=a;
    for(var d=0u;d<4u;d++){if(c[d]!=0.0){v+=c[d]*(A[o+jj[d]]-a);}}
    B[o+k]=v;}}

// ---------- 7. burning, then heat loss ----------
@compute @workgroup_size(64) fn chem(@builtin(global_invocation_id) g:vec3<u32>){
  let k=g.x;if(k>=NC){return;}
  FB[ORR+k]=0.0;
  if(blk(k)){return;}
  let dt=dtv();let g1=G1();
  if(P.comb!=0.0&&A[5u*NC+k]>=1e-7){
    var T=-1.0;var burnt=0.0;let sc=P.heatScale*P.heat;
    for(var fi=0u;fi<3u;fi++){let sp=FSP[fi];let fm=A[(4u+sp)*NC+k];if(fm<1e-7){continue;}
      if(T<0.0){T=presA(k)/(A[k]*RcellA(k));}if(T<FTI[fi]){continue;}
      let ox=A[5u*NC+k];if(ox<1e-9){break;}
      let nu=FNU[fi];let lim=min(fm/MW[sp],ox/MW[1]/nu);let xi=lim*(1.0-exp(-P.kr*min(1.0,(T-FTI[fi])/300.0)*dt));
      if(xi<=0.0){continue;}
      let dF=xi*MW[sp];let dO=xi*nu*MW[1];let dW=xi*FNW[fi]*MW[3];let dC=xi*FNC[fi]*MW[4];
      A[(4u+sp)*NC+k]-=dF;A[5u*NC+k]-=dO;A[7u*NC+k]+=dW;A[8u*NC+k]+=dC;
      A[k]-=dF+dO-dW-dC;A[3u*NC+k]+=xi*nu*FDH[fi]*sc;burnt+=xi*nu;acc(16u,k,xi*FNW[fi]*CELLV);}
    if(burnt>0.0){FB[ORR+k]=burnt/dt;}}
  // heat loss (same rules as core.js cool)
  let r=A[k];let u=A[NC+k]/r;let v=A[2u*NC+k]/r;let sp=sqrt(u*u+v*v);if(sp>=P.hazeU){return;}
  if(A[9u*NC+k]>0.05*r&&g1*(A[3u*NC+k]-0.5*r*sp*sp)>2.0*P.pAmb){return;}
  let ke=0.5*r*(u*u+v*v);let p=g1*(A[3u*NC+k]-ke);
  var fc=0.0;if(sp<P.uCool){fc=1.0-sp/P.uCool;}
  if(P.atmo!=0.0&&p>0.8*P.pAmb&&p<1.25*P.pAmb){let hz=0.6*(1.0-sp/P.hazeU);if(hz>fc){fc=hz;}}
  if(fc<=0.0){return;}let R=RcellA(k);let T=p/(r*R);if(T<450.0){return;}
  let dT=(T-300.0)*fc*min(1.0,dt/P.coolTau);A[3u*NC+k]-=r*R*dT/g1;}

// ---------- 8. end of a burst: add up the bookkeeping per workgroup and clear it ----------
@compute @workgroup_size(256) fn reduce(@builtin(global_invocation_id) g:vec3<u32>,@builtin(local_invocation_id) l:vec3<u32>,@builtin(workgroup_id) wg:vec3<u32>){
  let k=g.x;
  for(var c=0u;c<${NACC}u;c++){
    var v=0.0;if(k<NC){v=FB[OACC+c*NC+k];FB[OACC+c*NC+k]=0.0;}
    SH[l.x]=v;workgroupBarrier();
    for(var s=128u;s>0u;s>>=1u){if(l.x<s){SH[l.x]+=SH[l.x+s];}workgroupBarrier();}
    if(l.x==0u){FB[ORED+wg.x*${NACC}u+c]=SH[0];}
    workgroupBarrier();}
}
`;}

let dev,pipes={},bg=[],stB=[],Wb,BSb,FBb,Lb,Ub,stage,cur=0,lastDt=2e-6,Lf=new Float32Array(LMAX);
const STATEN=NF*NC,STG=(STATEN+NC+2*NC+4+NWGR*NACC+4);   // state, walls, propellant + glow, time step, sums, counters
GPU.init=async function(){
  try{
    if(typeof navigator==="undefined"||!navigator.gpu){GPU.err="no WebGPU";return false;}
    const ad=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});if(!ad){GPU.err="no GPU adapter";return false;}
    const need=FBN*4,lim=ad.limits;
    if(lim.maxStorageBufferBindingSize<need||lim.maxBufferSize<need){GPU.err="world too big for this GPU";return false;}
    dev=await ad.requestDevice({requiredLimits:{maxStorageBufferBindingSize:Math.max(need,STATEN*4),maxBufferSize:Math.max(need,STATEN*4)}});
    dev.lost.then(i=>{GPU.on=false;GPU.err="GPU lost: "+(i&&i.message);});
    const mod=dev.createShaderModule({code:wgsl()});
    const info=await mod.getCompilationInfo();const errs=info.messages.filter(m=>m.type==="error");
    if(errs.length){GPU.err="shader: "+errs.map(m=>m.lineNum+": "+m.message).join(" | ");return false;}
    const S=GPUBufferUsage.STORAGE,CS=GPUBufferUsage.COPY_SRC,CD=GPUBufferUsage.COPY_DST;
    const bgl=dev.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},
      ...[1,2,3,4,5].map(b=>({binding:b,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}})),
      {binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}]});
    const pl=dev.createPipelineLayout({bindGroupLayouts:[bgl]});
    dev.pushErrorScope("validation");
    for(const e of["begin","dtk","sweepX","sweepY","sources","heat","spark","injk","srbBurn","srbGas","srbOpen1","srbOpen2","mixPrep","mixIt","chem","reduce"])
      pipes[e]=await dev.createComputePipelineAsync({layout:pl,compute:{module:mod,entryPoint:e}});
    stB=[0,1].map(()=>dev.createBuffer({size:STATEN*4,usage:S|CS|CD}));
    Wb=dev.createBuffer({size:NC*4,usage:S|CS|CD});
    BSb=dev.createBuffer({size:(NC+4)*4,usage:S|CS|CD});
    FBb=dev.createBuffer({size:FBN*4,usage:S|CS|CD});
    Lb=dev.createBuffer({size:LMAX*4,usage:GPUBufferUsage.STORAGE|CD});
    Ub=dev.createBuffer({size:160,usage:GPUBufferUsage.UNIFORM|CD});
    stage=dev.createBuffer({size:STG*4,usage:GPUBufferUsage.MAP_READ|CD});
    for(let c=0;c<2;c++)bg[c]=dev.createBindGroup({layout:bgl,entries:[{binding:0,resource:{buffer:Ub}},{binding:1,resource:{buffer:stB[c]}},{binding:2,resource:{buffer:stB[1-c]}},
      {binding:3,resource:{buffer:Wb}},{binding:4,resource:{buffer:BSb}},{binding:5,resource:{buffer:FBb}},{binding:6,resource:{buffer:Lb}}]});
    const e=await dev.popErrorScope();if(e){GPU.err="setup: "+e.message;return false;}
    dev.queue.writeBuffer(FBb,0,new Float32Array(FBN));
    GPU.dev=dev;GPU.on=true;GPU.upload();return true;
  }catch(err){GPU.err=String(err&&err.message||err);GPU.on=false;return false;}
};
// CPU → GPU: the whole world (after anything the CPU changed)
GPU.upload=function(){
  const st=new Float32Array(STATEN),A=[rho,mx,my,En,...rs];for(let q=0;q<NF;q++)st.set(A[q],q*NC);
  dev.queue.writeBuffer(stB[cur],0,st);
  const tk=new Uint8Array(NC);let n=0;for(const t of tanks){if(!t.inf)continue;n++;if(n>250)break;for(let y=t.y0;y<=t.y1;y++)for(let x=t.x0;x<=t.x1;x++)tk[y*NX+x]=n;}
  const w=new Uint32Array(NC);for(let k=0;k<NC;k++)w[k]=wall[k]|(resv[k]?256:0)|(lit[k]?512:0)|(tk[k]<<16);
  dev.queue.writeBuffer(Wb,0,w);
  dev.queue.writeBuffer(FBb,OPROP*4,prop);
};
const gauss2=()=>Math.sqrt(-2*Math.log(Math.random()+1e-12))*Math.cos(6.2832*Math.random());
// the lists for this burst: tanks (refill state), igniter sources and hot spots, sparks, injector holes
function lists(Tc){
  let o=0;const tankOff=o;
  for(const t of tanks){if(!t.inf)continue;const r=t.P/(RofY(t.Y)*t.T);for(let s=0;s<NS;s++)Lf[o+s]=r*(t.Y[s]||0);Lf[o+8]=r;Lf[o+9]=t.P/(GAM-1);o+=10;}
  const nTank=(o-tankOff)/10,srcOff=o,heatMap=new Map();
  // igniters: the CPU keeps their random flicker (two slow random walks), the GPU pours the gas in every step
  const Rt=RofY(TORCH_Y),rt=TORCH_P/(Rt*TORCH_T),e=Rt*TORCH_T/(GAM-1),dec=Math.exp(-Tc/TORCH_TAU),sd=TORCH_WANDER*Math.sqrt(TORCH_TAU/2*(1-dec*dec));
  let nSrc=0;
  for(const p of plugs){if(!torchLit(p))continue;
    p.ang=Math.max(-1.3,Math.min(1.3,(p.ang||0)*dec+sd*gauss2()));
    p.str=Math.max(0.15,Math.min(1.9,1+((p.str||1)-1)*dec+0.8*sd*gauss2()));p.flash=p.str;
    const open=[];let bx=0,by=0;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy;if(x<0||y<0||x>=NX||y>=NY)continue;const j=y*NX+x;if(!wall[j]&&!resv[j]){open.push([dx,dy,j]);bx+=dx;by+=dy;}}
    if(!open.length)continue;
    const base=(bx||by)?Math.atan2(by,bx):0,a=base+p.ang,ux=Math.cos(a),uy=Math.sin(a);
    let wsum=0;const w=open.map(([dx,dy])=>{const c=Math.max(0.05,dx*ux+dy*uy);wsum+=c*c;return c*c;});
    const mainOpen=p.key&&valves.some(v=>v.key===p.key&&v.open);
    const hot=(k,T)=>{if((heatMap.get(k)||0)<T)heatMap.set(k,T);};
    open.forEach(([dx,dy,j],i)=>{
      Lf[o]=j;Lf[o+1]=rt*TORCH_V*p.str/DX*w[i]/wsum;Lf[o+2]=ux*TORCH_V;Lf[o+3]=uy*TORCH_V;Lf[o+4]=e+0.5*TORCH_V*TORCH_V;
      for(let s=0;s<8;s++)Lf[o+5+s]=TORCH_Y[s];o+=13;nSrc++;
      const x=j%NX,y=(j/NX)|0;
      if(mainOpen){for(let yy=y+dy-1;yy<=y+dy+1;yy++)for(let xx=x+dx-1;xx<=x+dx+1;xx++)if(xx>=0&&yy>=0&&xx<NX&&yy<NY)hot(yy*NX+xx,1600);}
      else if(w[i]/wsum>0.4)hot(j,1800);});}
  const heatOff=o;for(const[k,T]of heatMap){Lf[o]=k;Lf[o+1]=T;o+=2;}const nHeat=(o-heatOff)/2;
  // sparks: hot spots for a few frames (applied once per burst; bursts are 4 steps while a spark lives)
  const sparkOff=o;
  for(const s of sparks)if(s.frames-->0)for(let y=Math.max(0,s.y0);y<=Math.min(NY-1,s.y1);y++)for(let x=Math.max(0,s.x0);x<=Math.min(NX-1,s.x1);x++){Lf[o]=y*NX+x;Lf[o+1]=2500;o+=2;}
  sparks=sparks.filter(s=>s.frames>0);const nSpark=(o-sparkOff)/2;
  const injOff=o;let nInj=0;
  for(const q of injs){const nx=q.dir?0:1,ny=q.dir?1:0,ax=q.dir?1:0,ay=q.dir?0:1,holes=injHoles(q),c=injCells(q),mid=(q.len-1)/2;
    holes.forEach((i,hi)=>{const h=c[i];if(h===undefined||wall[h])return;const hx=h%NX,hy=(h/NX)|0;
      const ka=(hx-nx)>=0&&(hy-ny)>=0?(hy-ny)*NX+(hx-nx):-1,kb=(hx+nx)<NX&&(hy+ny)<NY?(hy+ny)*NX+(hx+nx):-1;if(ka<0||kb<0)return;
      let a=0,boost=0;
      if(q.type==="impinging"){a=(hi%2?-1:1)*INJ_ANG.impinging;boost=0.5;}
      else if(q.type==="angled")a=(q.flip?-1:1)*INJ_ANG.angled;
      else if(q.type==="swirl"){a=INJ_ANG.swirl*(q.flip?-1:1);boost=1;}
      else if(q.type==="pintle"){a=(i<=mid?-1:1)*INJ_ANG.pintle;boost=0.4;}
      Lf[o]=h;Lf[o+1]=ka;Lf[o+2]=kb;Lf[o+3]=nx;Lf[o+4]=ny;Lf[o+5]=ax;Lf[o+6]=ay;Lf[o+7]=a;Lf[o+8]=boost;Lf[o+9]=0;o+=10;nInj++;});}
  if(o>LMAX)throw new Error("GPU list overflow");
  if(o)dev.queue.writeBuffer(Lb,0,Lf,0,o);
  return{nTank,nSrc,srcOff,nHeat,heatOff,nSpark,sparkOff,nInj,injOff};
}
// one burst of n steps on the GPU, then the world comes back to the CPU arrays. Returns the simulated time it covered.
GPU.run=async function(n){
  const want=DMIX*lastDt/(DX*DX),nMix=DMIX>0?Math.max(1,Math.min(6,Math.ceil(want/0.22))):0;
  const Ls=lists(lastDt*n);
  const u=new ArrayBuffer(160),uf=new Float32Array(u),ui=new Uint32Array(u);
  uf.set([GAM,pAmb,TAmb,rhoAmb(),CFL,heatMult,KR,combustion?1:0, COOL_TAU,U_COOL,HAZE_U,atmo,DMIX,MIX_M,U_MIX,nMix||1,
    SRB_A*srbRate,SRB_N,SRB_K,RHO_P,R_SRB*SRB_TF*heatMult/(GAM-1),SRB_TIGN,HEAT_SCALE,0]);
  ui.set([NWGR,Ls.nTank,Ls.nSrc,Ls.nHeat,Ls.nSpark,Ls.nInj,Ls.srcOff,Ls.heatOff,Ls.sparkOff,Ls.injOff,0,0],24);
  dev.queue.writeBuffer(Ub,0,u);
  const hasSrb=wall.includes(4);
  const enc=dev.createCommandEncoder(),ps=enc.beginComputePass();
  let bound=-1;const go=(name,count)=>{ps.setPipeline(pipes[name]);if(bound!==cur){ps.setBindGroup(0,bg[cur]);bound=cur;}ps.dispatchWorkgroups(count);};
  const cells=Math.ceil(NC/WG),few=c=>Math.max(1,Math.ceil(c/64));
  for(let i=0;i<n;i++){
    go("begin",NWGR);go("dtk",1);
    if(flip){go("sweepX",cells);cur^=1;go("sweepY",cells);cur^=1;}else{go("sweepY",cells);cur^=1;go("sweepX",cells);cur^=1;}
    flip=!flip;
    if(Ls.nSrc){go("sources",few(Ls.nSrc));}
    if(Ls.nHeat){go("heat",few(Ls.nHeat));}
    if(i===0&&Ls.nSpark){go("spark",few(Ls.nSpark));}
    if(Ls.nInj){go("injk",few(Ls.nInj));}
    if(hasSrb){go("srbBurn",cells);go("srbGas",cells);go("srbOpen1",cells);go("srbOpen2",cells);}
    if(nMix){go("mixPrep",cells);for(let m=0;m<nMix;m++){go("mixIt",cells);cur^=1;}}
    go("chem",cells);
  }
  go("reduce",NWGR);
  ps.end();
  let o=0;const cp=(src,off,len)=>{enc.copyBufferToBuffer(src,off*4,stage,o*4,len*4);o+=len;};
  cp(stB[cur],0,STATEN);cp(Wb,0,NC);cp(FBb,OPROP,2*NC);cp(FBb,ODT,4);cp(FBb,ORED,NWGR*NACC);cp(BSb,NC,4);
  // the time-step sum restarts each burst
  enc.clearBuffer(FBb,(ODT+1)*4,4);
  dev.queue.submit([enc.finish()]);
  await stage.mapAsync(GPUMapMode.READ);
  const F=new Float32Array(stage.getMappedRange().slice(0));stage.unmap();
  // back into the CPU's arrays
  const A=[rho,mx,my,En,...rs];for(let q=0;q<NF;q++)A[q].set(F.subarray(q*NC,(q+1)*NC));
  o=STATEN;const Wv=new Uint32Array(F.buffer,o*4,NC);let wch=false;
  for(let k=0;k<NC;k++){const w=Wv[k]&255;if(wall[k]!==w){wall[k]=w;wch=true;}lit[k]=(Wv[k]>>9)&1;}
  if(wch)wallVer++;
  o+=NC;prop.set(F.subarray(o,o+NC));rr.set(F.subarray(o+NC,o+2*NC));o+=2*NC;
  const dtSum=F[o+1];lastDt=F[o]||lastDt;o+=4;
  const sum=new Float64Array(NACC);for(let w=0;w<NWGR;w++)for(let c=0;c<NACC;c++)sum[c]+=F[o+w*NACC+c];o+=NWGR*NACC;
  for(let s=0;s<NS;s++){if(sum[s]>0)added[s]+=sum[s];else removed[s]-=sum[s];edgeOut[s]+=sum[8+s];}
  waterMade+=sum[16];srbMass+=sum[17];srbFree+=sum[18];
  srbBurning=new Uint32Array(F.buffer,o*4,1)[0];if(srbBurning)NSA=Math.max(NSA,AL+1);
  simTime+=dtSum;GPU.steps+=n;updNSA();
  return dtSum;
};
GPU.wgsl=wgsl;
GPU.release=function(){try{if(dev)dev.destroy();}catch(e){}GPU.on=false;};
})();
