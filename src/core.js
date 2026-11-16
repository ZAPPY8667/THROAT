"use strict";
// ================= THROAT v0.8 CORE: gas on a grid =================
// Every 4x4-pixel tile is a 1 cm cube of gas. Compressible Euler equations (MUSCL-Hancock + HLLC, dimensional
// splitting) move mass, momentum and energy between boxes; each box tracks the mass of H2, O2, N2 and H2O.
const _SZ=(typeof THROAT_SIZE!=="undefined"&&THROAT_SIZE)||[160,90];   // world size in cells (chosen before the page loads)
const NX=_SZ[0],NY=_SZ[1],NC=NX*NY,DX=0.01,CELLV=DX*DX*DX;      // cells are 1 cm cubes
// AL = aluminium oxide smoke from solid propellant (a heavy "gas" here). KER = kerosene: really a liquid sprayed in as droplets.
// Kerosene is long chains of –CH₂– links, so here it's a gas of single CH₂ links: same carbon-to-hydrogen, same heat per kg.
// (As one big C₁₂H₂₄ molecule it would be a very heavy gas, and heavy gas pushes far too much mass through an injector hole.)
const NS=8,H2=0,O2=1,N2=2,H2O=3,CO2=4,AL=5,CH4=6,KER=7;
const MW=[0.002016,0.032,0.028014,0.018015,0.04401,0.10196,0.016043,0.014027];   // kg/mol
const ATOMS=[[2,0,0,0,0],[0,2,0,0,0],[0,0,2,0,0],[2,1,0,0,0],[0,2,0,1,0],[0,3,0,0,2],[4,0,0,1,0],[2,0,0,1,0]];   // H,O,N,C,Al atoms per molecule
const NE=5;
let NSA=4;   // gases actually present anywhere: the rare ones (CO₂, smoke) cost nothing until something makes them
function updNSA(){let n=1;for(let s=NS-1;s>0;s--){const a=rs[s];let any=false;for(let k=0;k<NC;k++)if(a[k]>0){any=true;break;}if(any){n=s+1;break;}}NSA=Math.max(4,n);}
const RU=8.314,PSI_PA=6894.76;
const AIRY=[0,0.233,0.767,0,0,0,0,0];                         // air by mass
const MIXY=[2*MW[0]/(2*MW[0]+MW[1]),MW[1]/(2*MW[0]+MW[1]),0,0,0,0,0,0]; // 2 H2 : 1 O2 by molecules
let GAM=1.3;
const rho=new Float64Array(NC),mx=new Float64Array(NC),my=new Float64Array(NC),En=new Float64Array(NC);
const rs=Array.from({length:NS},()=>new Float64Array(NC));        // species partial densities
const wall=new Uint8Array(NC);                            // 0 gas, 1 wall, 2 closed valve, 3 igniter plug, 4 solid propellant
const prop=new Float32Array(NC),lit=new Uint8Array(NC);   // solid propellant left in a cell (1 = full), and whether it's burning
const resv=new Uint8Array(NC);                            // inside an infinite tank
const rr=new Float32Array(NC);                            // reaction rate (for the flame glow)
let pAmb=101325,TAmb=300,atmo=1,simTime=0;
// ---- combustion: three fuels, each burning with oxygen ----
//   2 H₂ + O₂ → 2 H₂O            CH₄ + 2 O₂ → CO₂ + 2 H₂O            CH₂ + 1½ O₂ → CO₂ + H₂O  (kerosene, per link)
// FUELS: species, O₂ needed per molecule, heat per mol of O₂ used (real values), H₂O and CO₂ made per molecule, lighting temperature
const FUELS=[[H2,0.5,483.6e3,1,0,750],[CH4,2,401.2e3,2,1,850],[KER,1.5,404e3,1,1,800]];   // kerosene: 43 MJ/kg
const DH=483.6e3;          // J per mol O2 burned (hydrogen, real)
const HEAT_SCALE=0.45;     // simplified: real H2O soaks up some heat in vibration/dissociation; this puts the engine chamber near 2,300 K
let heatMult=1,T_IGN=750,KR=2e5,combustion=true;
// ---- bookkeeping (kg) ----
const added=new Float64Array(NS),removed=new Float64Array(NS),edgeOut=new Float64Array(NS);
let waterMade=0;           // mol of H2O formed (cumulative)
function resetTallies(){added.fill(0);removed.fill(0);edgeOut.fill(0);waterMade=0;}
const RofY=Y=>{let s=0;for(let i=0;i<NS;i++)s+=(Y[i]||0)/MW[i];return RU*s;};
function Rcell(k){let s=0;for(let i=0;i<NSA;i++)s+=rs[i][k]/MW[i];return RU*s/rho[k];}
function pres(k){const r=rho[k];return (GAM-1)*(En[k]-0.5*(mx[k]*mx[k]+my[k]*my[k])/r);}
function temp(k){return pres(k)/(rho[k]*Rcell(k));}
const rhoAmb=()=>pAmb/(RofY(AIRY)*TAmb);
function ambY(){return AIRY;}
// set a cell to a gas state, keeping the mass tallies honest
function setGas(k,Y,P,T,u,v){
  u=u||0;v=v||0;const r=P/(RofY(Y)*T);
  for(let s=0;s<NS;s++){const ys=Y[s]||0;if(ys>0&&s>=NSA)NSA=s+1;const d=(r*ys-rs[s][k])*CELLV;if(d>0)added[s]+=d;else removed[s]-=d;rs[s][k]=r*ys;}
  rho[k]=r;mx[k]=r*u;my[k]=r*v;En[k]=P/(GAM-1)+0.5*r*(u*u+v*v);
}
function clearCellMass(k){for(let s=0;s<NS;s++){removed[s]+=rs[s][k]*CELLV;rs[s][k]=0;}rho[k]=0;mx[k]=my[k]=En[k]=0;}
function outsideState(k){if(atmo)setGas(k,AIRY,pAmb,TAmb);else setGas(k,AIRY,pAmb,TAmb);}
function cellPrim(k){const r=rho[k],u=mx[k]/r,v=my[k]/r,p=(GAM-1)*(En[k]-0.5*r*(u*u+v*v));const Y=new Array(NS).fill(0);for(let s=0;s<NS;s++)Y[s]=rs[s][k]/r;return{r,u,v,p,Y,T:p/(r*Rcell(k))};}

// ---------------- solver ----------------
const LMAX=Math.max(NX,NY),RHO_MIN=1e-5,P_MIN=5;
const Wr=new Float64Array(LMAX),Wu=new Float64Array(LMAX),Wt=new Float64Array(LMAX),Wp=new Float64Array(LMAX),Sol=new Uint8Array(LMAX),Idx=new Int32Array(LMAX);
const Lr=new Float64Array(LMAX),Lu=new Float64Array(LMAX),Lt=new Float64Array(LMAX),Lp=new Float64Array(LMAX);
const Rr=new Float64Array(LMAX),Rv=new Float64Array(LMAX),Rt=new Float64Array(LMAX),Rp=new Float64Array(LMAX);

const F0=new Float64Array(LMAX+1),F1=new Float64Array(LMAX+1),F2=new Float64Array(LMAX+1),F3=new Float64Array(LMAX+1),FSx=0;
const mm=(a,b)=>(a*b<=0?0:(Math.abs(a)<Math.abs(b)?a:b));
const HF=new Float64Array(5);   // HLLC result: 4 fluxes + upwind side
function hllc(rL,uL,tL,pL,rR,uR,tR,pR){
  const g=GAM,cL=Math.sqrt(g*pL/rL),cR=Math.sqrt(g*pR/rR);
  const EL=pL/(g-1)+0.5*rL*(uL*uL+tL*tL),ER=pR/(g-1)+0.5*rR*(uR*uR+tR*tR);
  const SL=Math.min(uL-cL,uR-cR),SR=Math.max(uL+cL,uR+cR);
  if(SL>=0){HF[0]=rL*uL;HF[1]=rL*uL*uL+pL;HF[2]=rL*uL*tL;HF[3]=uL*(EL+pL);HF[4]=0;return;}
  if(SR<=0){HF[0]=rR*uR;HF[1]=rR*uR*uR+pR;HF[2]=rR*uR*tR;HF[3]=uR*(ER+pR);HF[4]=1;return;}
  const Ss=(pR-pL+rL*uL*(SL-uL)-rR*uR*(SR-uR))/(rL*(SL-uL)-rR*(SR-uR));
  if(Ss>=0){const f=rL*(SL-uL)/(SL-Ss);
    HF[0]=rL*uL+SL*(f-rL);HF[1]=rL*uL*uL+pL+SL*(f*Ss-rL*uL);HF[2]=rL*uL*tL+SL*(f*tL-rL*tL);HF[3]=uL*(EL+pL)+SL*(f*(EL/rL+(Ss-uL)*(Ss+pL/(rL*(SL-uL))))-EL);HF[4]=0;}
  else{const f=rR*(SR-uR)/(SR-Ss);
    HF[0]=rR*uR+SR*(f-rR);HF[1]=rR*uR*uR+pR+SR*(f*Ss-rR*uR);HF[2]=rR*uR*tR+SR*(f*tR-rR*tR);HF[3]=uR*(ER+pR)+SR*(f*(ER/rR+(Ss-uR)*(Ss+pR/(rR*(SR-uR))))-ER);HF[4]=1;}
}
// open edges: supersonic outflow leaves freely; subsonic outflow only feels outside pressure; inflow draws in still outside air
const GH=new Float64Array(4);let gIn=false;
function edgeGhost(r,u,t,p,s){
  const c=Math.sqrt(GAM*p/r),out=s*u;
  if(out>=c){GH[0]=r;GH[1]=u;GH[2]=t;GH[3]=p;gIn=false;}
  else if(out>=0){GH[0]=r;GH[1]=u;GH[2]=t;GH[3]=pAmb;gIn=false;}
  else{const ra=rhoAmb();GH[0]=ra;GH[1]=u;GH[2]=0;GH[3]=Math.max(pAmb*0.2,pAmb-0.5*ra*u*u);gIn=true;}
}
const WYf=new Float64Array(LMAX*NS),LYf=new Float64Array(LMAX*NS),RYf=new Float64Array(LMAX*NS),FSf=new Float64Array((LMAX+1)*NS),VS_=new Float64Array(NS);
function sweep(isX,dt){const ns=NSA,R=rs;
  const lines=isX?NY:NX,len=isX?NX:NY,M=isX?mx:my,T=isX?my:mx,lam=dt/DX,g1=GAM-1,face=dt*DX*DX,h=0.5*lam,str=isX?1:NX;
  for(let ln=0;ln<lines;ln++){
    let any=false;const base=isX?ln*NX:ln;
    for(let i=0;i<len;i++){
      const k=base+i*str;Idx[i]=k;if(wall[k]){Sol[i]=1;continue;}Sol[i]=0;any=true;
      let r=rho[k];if(r<RHO_MIN)r=RHO_MIN;const u=M[k]/r,t=T[k]/r;let p=g1*(En[k]-0.5*r*(u*u+t*t));if(p<P_MIN)p=P_MIN;
      Wr[i]=r;Wu[i]=u;Wt[i]=t;Wp[i]=p;
      const o=i*NS;let sm=0;for(let s=0;s<ns;s++){let y=R[s][k]/r;if(y<0)y=0;WYf[o+s]=y;sm+=y;}
      if(sm>0){const q=1/sm;for(let s=0;s<ns;s++)WYf[o+s]*=q;}
    }
    if(!any)continue;
    for(let i=0;i<len;i++){
      if(Sol[i])continue;
      const r=Wr[i],u=Wu[i],t=Wt[i],p=Wp[i];
      let ar,au,at,ap,br,bu,bt,bp,oa=i*NS,ob=i*NS;
      if(i===0){edgeGhost(r,u,t,p,-1);ar=GH[0];au=GH[1];at=GH[2];ap=GH[3];}else if(Sol[i-1]){ar=r;au=-u;at=t;ap=p;}else{ar=Wr[i-1];au=Wu[i-1];at=Wt[i-1];ap=Wp[i-1];oa=(i-1)*NS;}
      if(i===len-1){edgeGhost(r,u,t,p,1);br=GH[0];bu=GH[1];bt=GH[2];bp=GH[3];}else if(Sol[i+1]){br=r;bu=-u;bt=t;bp=p;}else{br=Wr[i+1];bu=Wu[i+1];bt=Wt[i+1];bp=Wp[i+1];ob=(i+1)*NS;}
      const dr=mm(r-ar,br-r),du=mm(u-au,bu-u),dtt=mm(t-at,bt-t),dp=mm(p-ap,bp-p);
      let lr=r-0.5*dr,lu=u-0.5*du,lt=t-0.5*dtt,lp=p-0.5*dp,qr=r+0.5*dr,qu=u+0.5*du,qt=t+0.5*dtt,qp=p+0.5*dp;
      const o=i*NS;
      if(oa!==o||ob!==o)for(let s=0;s<ns;s++){const y=WYf[o+s],da=y-WYf[oa+s],db=WYf[ob+s]-y;
        const hd=da*db<=0?0:0.5*(da>0?(da<db?da:db):(da>db?da:db)),l=y-hd,q=y+hd;LYf[o+s]=l>0?l:0;RYf[o+s]=q>0?q:0;}
      else for(let s=0;s<ns;s++){LYf[o+s]=RYf[o+s]=WYf[o+s];}
      if(lr<=RHO_MIN||qr<=RHO_MIN||lp<=P_MIN||qp<=P_MIN){lr=qr=r;lu=qu=u;lt=qt=t;lp=qp=p;}
      const ELc=lp/g1+0.5*lr*(lu*lu+lt*lt),ERc=qp/g1+0.5*qr*(qu*qu+qt*qt);
      const d0=lr*lu-qr*qu,d1=(lr*lu*lu+lp)-(qr*qu*qu+qp),d2=lr*lu*lt-qr*qu*qt,d3=lu*(ELc+lp)-qu*(ERc+qp);
      const c0=lr+h*d0,c1=lr*lu+h*d1,c2=lr*lt+h*d2,c3=ELc+h*d3,e0=qr+h*d0,e1=qr*qu+h*d1,e2=qr*qt+h*d2,e3=ERc+h*d3;
      const pl=g1*(c3-0.5*(c1*c1+c2*c2)/c0),pr=g1*(e3-0.5*(e1*e1+e2*e2)/e0);
      if(c0<=RHO_MIN||e0<=RHO_MIN||pl<=P_MIN||pr<=P_MIN){Lr[i]=Rr[i]=r;Lu[i]=Rv[i]=u;Lt[i]=Rt[i]=t;Lp[i]=Rp[i]=p;continue;}
      Lr[i]=c0;Lu[i]=c1/c0;Lt[i]=c2/c0;Lp[i]=pl;Rr[i]=e0;Rv[i]=e1/e0;Rt[i]=e2/e0;Rp[i]=pr;
    }
    for(let f=0;f<=len;f++){
      const a=f-1,b=f,aF=a>=0&&!Sol[a],bF=b<len&&!Sol[b],of=f*NS;
      if(!aF&&!bF){F0[f]=F1[f]=F2[f]=F3[f]=0;for(let s=0;s<ns;s++)FSf[of+s]=0;continue;}
      let sr,su,st,sp,tr,tu,tt,tp,edgeIn=false;
      if(aF){sr=Rr[a];su=Rv[a];st=Rt[a];sp=Rp[a];}
      if(bF){tr=Lr[b];tu=Lu[b];tt=Lt[b];tp=Lp[b];}
      if(!aF){if(a<0){edgeGhost(tr,tu,tt,tp,-1);sr=GH[0];su=GH[1];st=GH[2];sp=GH[3];edgeIn=gIn;}else{sr=tr;su=-tu;st=tt;sp=tp;}}
      if(!bF){if(b>=len){edgeGhost(sr,su,st,sp,1);tr=GH[0];tu=GH[1];tt=GH[2];tp=GH[3];edgeIn=gIn;}else{tr=sr;tu=-su;tt=st;tp=sp;}}
      hllc(sr,su,st,sp,tr,tu,tt,tp);
      const m=HF[0];F0[f]=m;F1[f]=HF[1];F2[f]=HF[2];F3[f]=HF[3];
      // species ride the mass flux, taking the composition of the upwind side
      const fromRight=HF[4]===1,up=fromRight?(bF?b:-1):(aF?a:-1);
      if(up<0&&edgeIn){for(let s=0;s<ns;s++)FSf[of+s]=m*AIRY[s];continue;}  // outside air drawn in
      let A,oy;
      if(up>=0){A=fromRight?LYf:RYf;oy=up*NS;}
      else{const c=aF?a:b;oy=c*NS;A=fromRight?(bF?LYf:RYf):(aF?RYf:LYf);}
      for(let s=0;s<ns;s++)FSf[of+s]=m*A[oy+s];
    }
    // edge bookkeeping: mass leaving through the left/top (face 0) and right/bottom (face len)
    if(!Sol[0])for(let s=0;s<ns;s++)edgeOut[s]-=FSf[s]*face;
    if(!Sol[len-1])for(let s=0;s<ns;s++)edgeOut[s]+=FSf[len*NS+s]*face;
    for(let i=0;i<len;i++){
      if(Sol[i])continue;const k=Idx[i],o=i*NS,o1=o+NS;
      M[k]-=lam*(F1[i+1]-F1[i]);T[k]-=lam*(F2[i+1]-F2[i]);En[k]-=lam*(F3[i+1]-F3[i]);
      let sum=0;for(let s=0;s<ns;s++){let v=R[s][k]-lam*(FSf[o1+s]-FSf[o+s]);if(v<0){added[s]-=v*CELLV;v=0;}VS_[s]=v;sum+=v;}
      if(sum<RHO_MIN){const add=RHO_MIN-sum;VS_[2]+=add;added[2]+=add*CELLV;sum=RHO_MIN;}
      for(let s=0;s<ns;s++)R[s][k]=VS_[s];rho[k]=sum;
      const ke=0.5*(M[k]*M[k]+T[k]*T[k])/sum;if(En[k]-ke<P_MIN/g1)En[k]=ke+P_MIN/g1;
    }
  }
}
function maxDt(cfl){
  let smax=1;
  for(let k=0;k<NC;k++){if(wall[k])continue;const r=rho[k],u=mx[k]/r,v=my[k]/r,p=(GAM-1)*(En[k]-0.5*r*(u*u+v*v)),c=Math.sqrt(GAM*Math.max(p,P_MIN)/r);
    const s=Math.max(Math.abs(u),Math.abs(v))+c;if(s>smax)smax=s;}
  return cfl*DX/smax;
}
// ---------------- chemistry ----------------
// Each fuel burns at the same kind of rate once the gas is hot enough to light it. They share the oxygen in a cell,
// hydrogen first (it's the quickest to burn in real life too).
function react(dt){
  const sc=HEAT_SCALE*heatMult;
  rr.fill(0);if(!combustion)return;
  const nf=NSA>KER?3:NSA>CH4?2:1;   // methane and kerosene cost nothing until one of them is somewhere in the world
  for(let k=0;k<NC;k++){
    if(wall[k]||resv[k])continue;if(rs[O2][k]<1e-7)continue;
    let T=-1,burnt=0;
    for(let f=0;f<nf;f++){const[sp,nu,dh,nw,nc,tig]=FUELS[f],fm=rs[sp][k];if(fm<1e-7)continue;
      if(T<0)T=pres(k)/(rho[k]*Rcell(k));if(T<tig)continue;
      const o=rs[O2][k];if(o<1e-9)break;
      const lim=Math.min(fm/MW[sp],o/MW[O2]/nu),xi=lim*(1-Math.exp(-KR*Math.min(1,(T-tig)/300)*dt));   // xi = mol of fuel burned
      if(xi<=0)continue;
      const dF=xi*MW[sp],dO=xi*nu*MW[O2],dW=xi*nw*MW[H2O],dC=xi*nc*MW[CO2];
      rs[sp][k]-=dF;rs[O2][k]-=dO;rs[H2O][k]+=dW;if(dC)rs[CO2][k]+=dC;
      rho[k]-=dF+dO-dW-dC;En[k]+=xi*nu*dh*sc;burnt+=xi*nu;waterMade+=xi*nw*CELLV;}
    if(burnt>0)rr[k]=burnt/dt;
  }
}
// ---------------- heat loss ----------------
// Slow, hot gas loses heat to the cold chamber walls and by glowing, so a small flame stays small instead of slowly
// filling the chamber with hot gas. Fast gas (a running engine, the jet) doesn't sit still long enough to notice.
let COOL_TAU=1.0e-3,U_COOL=120,HAZE_U=400;
function cool(dt){
  for(let k=0;k<NC;k++){
    if(wall[k]||resv[k])continue;const r=rho[k],u=mx[k]/r,v=my[k]/r,sp=Math.sqrt(u*u+v*v);if(sp>=HAZE_U)continue;
    if(NSA>AL&&rs[AL][k]>0.05*r&&(GAM-1)*(En[k]-0.5*r*sp*sp)>2*pAmb)continue;   // a solid motor's chamber doesn't lose heat like a small flame does
    const ke=0.5*r*(u*u+v*v),p=(GAM-1)*(En[k]-ke);
    let f=sp<U_COOL?1-sp/U_COOL:0;
    if(atmo&&p>0.8*pAmb&&p<1.25*pAmb){const h=0.6*(1-sp/HAZE_U);if(h>f)f=h;}   // leftover warm haze at outside pressure fades too
    if(f<=0)continue;const R=Rcell(k),T=p/(r*R);if(T<450)continue;
    const dT=(T-300)*f*Math.min(1,dt/COOL_TAU);En[k]-=r*R*dT/(GAM-1);}
}
// ---------------- turbulent mixing ----------------
// Slow-moving gas (chambers, tanks, still air) stirs itself: neighbouring cells swap a little of everything they hold
// (each gas, momentum, energy). Swapping whole parcels keeps every cell physically consistent and conserves everything.
// Fast gas (nozzle, supersonic plume core) is left alone so the jet keeps its shape.
let DMIX=60,MIX_M=0.6,U_MIX=120;   // stirring fades out in still gas (below ~120 m/s) and in fast gas (above Mach 0.6)              // m^2/s turbulent diffusivity, fades out by Mach MIX_M
// 1-cell passages (injector holes, valve slots) never stir, so hot chamber gas can't creep back up the feed lines
const blk=j=>wall[j]!==0||resv[j]!==0;
function narrow(k){const x=k%NX,y=(k/NX)|0;
  return (x>0&&x<NX-1&&blk(k-1)&&blk(k+1))||(y>0&&y<NY-1&&blk(k-NX)&&blk(k+NX));}
const NARROW=new Uint8Array(NC),BOOST=new Float32Array(NC);   // BOOST: extra stirring in front of swirl/impinging injectors
let narrowVer=-1;
const mg=new Float32Array(NC),ms=new Float32Array(NC),YB=new Float32Array(NC*NS),FA=new Int32Array(NC*4),FB=new Int32Array(NC*4),FC=new Float32Array(NC*4);
// Only faces where two different gases meet get stirred (uniform air or uniform exhaust has nothing to mix), so this stays cheap.
function mix(dt){
  if(DMIX<=0)return;
  const want=DMIX*dt/(DX*DX),n=Math.min(6,Math.ceil(want/0.22)),c0=Math.min(0.22,want/n);
  if(narrowVer!==wallVer+resvVer*1e6){narrowVer=wallVer+resvVer*1e6;for(let k=0;k<NC;k++)NARROW[k]=wall[k]||resv[k]||narrow(k)?1:0;}
  for(let k=0;k<NC;k++){if(NARROW[k]){mg[k]=0;continue;}const r=rho[k],u=mx[k]/r,v=my[k]/r,p=(GAM-1)*(En[k]-0.5*r*(u*u+v*v));
    const M=Math.sqrt((u*u+v*v)*r/(GAM*Math.max(p,1)));mg[k]=M>=MIX_M?0:c0*(1-M/MIX_M);ms[k]=Math.min(1,Math.sqrt(u*u+v*v)/U_MIX);
    const o=k*NS;for(let s=0;s<NSA;s++)YB[o+s]=rs[s][k]/r;}
  let nf=0;
  const addF=(k,j)=>{const a=mg[k],b=mg[j];if(a===0||b===0)return;const o=k*NS,q=j*NS;
    let dY=0;for(let s=0;s<NSA;s++)dY+=Math.abs(YB[o+s]-YB[q+s]);if(dY<0.01)return;
    const bo=BOOST[k]>BOOST[j]?BOOST[k]:BOOST[j];let sp=ms[k]>ms[j]?ms[k]:ms[j];if(bo>sp)sp=bo;if(sp<=0)return;
    FA[nf]=k;FB[nf]=j;FC[nf]=Math.min(0.24,(a<b?a:b)*sp*(1+2*bo));nf++;};
  for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){const k=y*NX+x;if(mg[k]===0)continue;if(x<NX-1)addF(k,k+1);if(y<NY-1)addF(k,k+NX);}
  // every face swaps a share of every quantity; one pass over the faces handles them all (each quantity still sees the faces in the same order)
  const ns=NSA;
  for(let it=0;it<n;it++)for(let f=0;f<nf;f++){const k=FA[f],j=FB[f],c=FC[f];let d;
    d=c*(rho[j]-rho[k]);rho[k]+=d;rho[j]-=d;d=c*(mx[j]-mx[k]);mx[k]+=d;mx[j]-=d;d=c*(my[j]-my[k]);my[k]+=d;my[j]-=d;d=c*(En[j]-En[k]);En[k]+=d;En[j]-=d;
    for(let q=0;q<ns;q++){const A=rs[q];d=c*(A[j]-A[k]);A[k]+=d;A[j]-=d;}}
}
// ---------------- world: tanks, valves, igniters ----------------
let tanks=[];    // {id,x0,y0,x1,y1,Y,P,T,inf,name}   (x0..y1 = the gas inside; its walls are one cell outside)
let valves=[];   // {id,x,y,len,dir (0 up-down, 1 left-right),key (0 = none),open,delay,openAt,under[], x0,y0,x1,y1}
let plugs=[];    // {id,x,y,key (0 = none),on,flash,...}
let nextId=1;
const keyState=new Uint8Array(10);
let frameNo=0,hint="";
function inTank(k){return resv[k]===1;}
let resvVer=0;
function rebuildResv(){resvVer++;resv.fill(0);for(const t of tanks)if(t.inf)for(let y=t.y0;y<=t.y1;y++)for(let x=t.x0;x<=t.x1;x++)resv[y*NX+x]=1;}
function holdTanks(){for(const t of tanks)if(t.inf)for(let y=t.y0;y<=t.y1;y++)for(let x=t.x0;x<=t.x1;x++){const k=y*NX+x;if(!wall[k])setGas(k,t.Y,t.P,t.T);}}
function fillRect(x0,y0,x1,y1,Y,P,T){for(let y=Math.max(0,y0);y<=Math.min(NY-1,y1);y++)for(let x=Math.max(0,x0);x<=Math.min(NX-1,x1);x++){const k=y*NX+x;if(!wall[k])setGas(k,Y,P,T);}}
let wallVer=0;     // bumps whenever any cell turns solid or opens up
function makeSolid(k,v){if(!wall[k])clearCellMass(k);wall[k]=v;wallVer++;prop[k]=v===4?1:0;lit[k]=0;}
function makeGasFromNeighbours(k){ // a solid cell turns into gas: start it like its gas neighbours (or outside air)
  const x=k%NX,y=(k/NX)|0,nb=[];if(x>0)nb.push(k-1);if(x<NX-1)nb.push(k+1);if(y>0)nb.push(k-NX);if(y<NY-1)nb.push(k+NX);
  const g=nb.filter(j=>!wall[j]&&rho[j]>0);wall[k]=0;wallVer++;prop[k]=0;lit[k]=0;
  if(!g.length){outsideState(k);return;}
  let r=0,P=0,T=0;const Y=new Array(NS).fill(0);for(const j of g){const w=cellPrim(j);r+=w.r;P+=w.p;T+=w.T;for(let s=0;s<NSA;s++)Y[s]+=w.Y[s];}
  for(let s=0;s<NSA;s++)Y[s]/=g.length;setGas(k,Y,P/g.length,T/g.length);
}
// A valve is one object: a straight run of `len` cells. Closed it's solid; open, gas flows through it.
// It remembers what was under it (wall or open space) so moving, turning or deleting it puts things back.
function valveCells(v){const c=[];for(let i=0;i<v.len;i++){const x=v.dir?v.x+i:v.x,y=v.dir?v.y:v.y+i;if(x>=0&&y>=0&&x<NX&&y<NY)c.push(y*NX+x);}return c;}
function syncValveRect(v){v.x0=v.x;v.y0=v.y;v.x1=v.dir?v.x+v.len-1:v.x;v.y1=v.dir?v.y:v.y+v.len-1;}
function setValve(v,open){v.open=open;for(const k of valveCells(v)){if(wall[k]===3)continue;
  if(open){if(wall[k]===2||wall[k]===1)makeGasFromNeighbours(k);}else if(wall[k]!==2)makeSolid(k,2);}
  for(const k of v.bore||[]){if(open){if(wall[k]===1)makeGasFromNeighbours(k);}else if(!wall[k])makeSolid(k,1);}}   // the bore through a thick wall
function liftValve(v){const c=valveCells(v);c.forEach((k,i)=>{if(wall[k]===3)return;if(v.under[i]===1){if(!wall[k])clearCellMass(k);wall[k]=1;wallVer++;}else if(wall[k])makeGasFromNeighbours(k);});
  for(const k of v.bore||[])if(!wall[k])makeSolid(k,1);v.bore=[];}
// A valve set into a wall thicker than one cell bores straight through it (both ways, up to 12 cells) so it actually connects
// the two sides; the bore is solid wall while the valve is shut.
function boreFor(v){const out=[],px=v.dir?0:1,py=v.dir?1:0,mine=new Set(valveCells(v));
  valveCells(v).forEach((k,i)=>{if(!v.under[i])return;const x=k%NX,y=(k/NX)|0;
    for(const s of[-1,1]){const run=[];let ok=false;
      for(let j=1;j<=12;j++){const xx=x+s*px*j,yy=y+s*py*j;if(xx<0||yy<0||xx>=NX||yy>=NY)break;const q=yy*NX+xx;
        if(wall[q]===1&&!mine.has(q))run.push(q);else{ok=wall[q]===0;break;}}
      if(ok)out.push(...run);}});
  return out;}
function dropValve(v){syncValveRect(v);v.under=valveCells(v).map(k=>wall[k]===1||wall[k]===2?1:0);v.bore=boreFor(v);setValve(v,v.open);}
function newValve(x,y,len,dir,key,open,delay){
  const v={id:nextId++,x,y,len:Math.max(1,len|0),dir:dir?1:0,key:key||0,open:!!open,delay:delay||0,openAt:0,under:[]};
  for(const o of valves.filter(o=>rectsHit(o,{x0:x,y0:y,x1:dir?x+len-1:x,y1:dir?y:y+len-1})))removeValve(o);   // no stacking
  dropValve(v);valves.push(v);return v;}
function removeValve(v){liftValve(v);valves=valves.filter(o=>o!==v);}
const rectsHit=(a,b)=>!(a.x1<b.x0||a.x0>b.x1||a.y1<b.y0||a.y0>b.y1);
function addValve(x0,y0,x1,y1,key,open,delay){const v=newValve(x0,y0,x1>x0?x1-x0+1:y1-y0+1,x1>x0?1:0,key,open,delay);if(key)keyState[key]=v.open?1:0;return v;}
function keyOn(k){return !!keyState[k];}
// ---------------- check valves ----------------
// A check valve lets gas through one way only (the way its arrow points). It opens while the pressure behind it beats the
// pressure in front, and slams shut the moment gas tries to flow backwards (e.g. a chamber pressure spike at ignition).
let checks=[];   // {id,x,y,len,dir,flow (+1/-1 along the line's normal),open,under[], x0,y0,x1,y1}
function setCheck(c,open){c.open=open;for(const k of valveCells(c)){if(wall[k]===3)continue;
  if(open){if(wall[k]===2)makeGasFromNeighbours(k);}else if(wall[k]!==2)makeSolid(k,2);}}
function dropCheck(c){syncValveRect(c);c.under=valveCells(c).map(k=>wall[k]===1||wall[k]===2?1:0);setCheck(c,c.open);}
function liftCheck(c){valveCells(c).forEach((k,i)=>{if(wall[k]===3)return;if(c.under[i]===1){if(!wall[k])clearCellMass(k);wall[k]=1;wallVer++;}else if(wall[k])makeGasFromNeighbours(k);});}
function newCheck(x,y,len,dir,flow){const c={id:nextId++,x,y,len:Math.max(1,len|0),dir:dir?1:0,flow:flow<0?-1:1,open:false,under:[]};
  for(const o of checks.filter(o=>rectsHit(o,{x0:x,y0:y,x1:dir?x+len-1:x,y1:dir?y:y+len-1})))removeCheck(o);
  dropCheck(c);checks.push(c);return c;}
function removeCheck(c){liftCheck(c);checks=checks.filter(o=>o!==c);}
function runChecks(){
  for(const c of checks){const nx=c.dir?0:1,ny=c.dir?1:0,f=c.flow;let pi=0,po=0,ni=0,no=0,back=0;
    for(const k of valveCells(c)){const x=k%NX,y=(k/NX)|0,xi=x-nx*f,yi=y-ny*f,xo=x+nx*f,yo=y+ny*f;
      if(xi>=0&&yi>=0&&xi<NX&&yi<NY){const q=yi*NX+xi;if(!wall[q]){pi+=pres(q);ni++;}}
      if(xo>=0&&yo>=0&&xo<NX&&yo<NY){const q=yo*NX+xo;if(!wall[q]){po+=pres(q);no++;}}
      if(c.open&&!wall[k])back+=(mx[k]*nx+my[k]*ny)*f;}
    if(!ni||!no){if(c.open)setCheck(c,false);continue;}
    pi/=ni;po/=no;
    if(c.open){if(po>pi*1.002+20||back<-1e-3*valveCells(c).length)setCheck(c,false);}   // backwards push or backflow: slam shut
    else if(pi>po*1.004+40)setCheck(c,true);}                                            // pushed the right way: swing open
}
// ---------------- injectors ----------------
// An injector is a plate set into the wall between a propellant feed and the chamber: a line of cells, solid except its holes.
// Its type decides how the jets leave the holes (that's where fuel and oxidizer meet, so it decides how well they mix):
//   straight  – plain showerhead jets            impinging – neighbouring jets angle into each other and collide
//   angled    – every jet leans the same way      swirl     – jets spin and churn the gas in front of the plate
//   pintle    – one centre slot sprays a wide fan sideways (like SpaceX's Merlin)
let injs=[];   // {id,x,y,len,dir,type,gap,flip,under[], x0,y0,x1,y1}
const INJ_TYPES=["straight","impinging","angled","swirl","pintle"];
function injCells(o){return valveCells(o);}
function injHoles(o){const n=o.len,h=[];
  if(o.type==="pintle"){const m=Math.floor((n-1)/2);h.push(m);if(n>1)h.push(m+1);}
  else for(let i=0;i<n;i++)if(i%o.gap===Math.floor(o.gap/2)%o.gap)h.push(i);
  if(!h.length)h.push(Math.floor(n/2));return h;}
function dropInj(o){syncValveRect(o);const c=injCells(o);o.under=c.map(k=>wall[k]===1?1:0);const holes=new Set(injHoles(o));
  c.forEach((k,i)=>{if(holes.has(i)){if(wall[k])makeGasFromNeighbours(k);}else if(wall[k]!==1){if(wall[k]===0)clearCellMass(k);wall[k]=1;wallVer++;}});}
function liftInj(o){injCells(o).forEach((k,i)=>{if(o.under[i]===1){if(!wall[k])clearCellMass(k);wall[k]=1;wallVer++;}else if(wall[k])makeGasFromNeighbours(k);});}
function newInj(x,y,len,dir,type,gap){const o={id:nextId++,x,y,len:Math.max(1,len|0),dir:dir?1:0,type:INJ_TYPES.includes(type)?type:"straight",gap:gap||3,flip:0,under:[]};
  dropInj(o);injs.push(o);return o;}
function removeInj(o){liftInj(o);injs=injs.filter(q=>q!==o);}
const INJ_ANG={straight:0,impinging:0.7,angled:0.6,swirl:0.5,pintle:1.3};
function injectors(){
  if(!injs.length){if(BOOSTED){BOOST.fill(0);BOOSTED=false;}return;}
  BOOST.fill(0);BOOSTED=true;
  for(const o of injs){const nx=o.dir?0:1,ny=o.dir?1:0,ax=o.dir?1:0,ay=o.dir?0:1,holes=injHoles(o),c=injCells(o),mid=(o.len-1)/2;
    holes.forEach((i,hi)=>{const h=c[i];if(h===undefined||wall[h])return;const hx=h%NX,hy=(h/NX)|0;
      const ka=(hx-nx)>=0&&(hy-ny)>=0?(hy-ny)*NX+(hx-nx):-1,kb=(hx+nx)<NX&&(hy+ny)<NY?(hy+ny)*NX+(hx+nx):-1;if(ka<0||kb<0||wall[ka]||wall[kb])return;
      const out=pres(ka)<pres(kb)?-1:1,d=out<0?ka:kb;          // the jet leaves toward the lower-pressure side
      let a=0,boost=0;
      if(o.type==="impinging"){a=(hi%2?-1:1)*INJ_ANG.impinging;boost=0.5;}
      else if(o.type==="angled")a=(o.flip?-1:1)*INJ_ANG.angled;
      else if(o.type==="swirl"){a=INJ_ANG.swirl*(o.flip?-1:1);boost=1;}
      else if(o.type==="pintle"){a=(i<=mid?-1:1)*INJ_ANG.pintle;boost=0.4;}
      if(a){const m=Math.hypot(mx[d],my[d]),along=(mx[d]*nx+my[d]*ny)*out;
        if(along>0){const tx=nx*out*Math.cos(a)+ax*Math.sin(a),ty=ny*out*Math.cos(a)+ay*Math.sin(a);mx[d]=m*tx;my[d]=m*ty;}}   // steer the jet, same speed
      if(boost){const dx=d%NX,dy=(d/NX)|0;for(let yy=dy-2;yy<=dy+2;yy++)for(let xx=dx-2;xx<=dx+2;xx++){
        const sx=xx+nx*out*2,sy=yy+ny*out*2;if(sx<0||sy<0||sx>=NX||sy>=NY)continue;const q=sy*NX+sx;if(BOOST[q]<boost)BOOST[q]=boost;}}});}
}
let BOOSTED=false;
// ---------------- pipes ----------------
// A pipe is drawn as a stroke: a hollow channel `w` cells wide with a one-cell wall on each side. Crossing an existing wall
// (a tank, a chamber) opens a way through, so a pipe joins whatever it touches. It never builds walls inside a tank.
const pipeIn=new Uint8Array(NC);
function pipeSeg(x0,y0,x1,y1,w){
  const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1),h=Math.floor((w-1)/2),pts=[];
  for(let i=0;i<=n;i++)pts.push([Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n)]);
  for(const[x,y]of pts)for(let yy=y-h;yy<y-h+w;yy++)for(let xx=x-h;xx<x-h+w;xx++)if(xx>=0&&yy>=0&&xx<NX&&yy<NY)pipeIn[yy*NX+xx]=1;
  for(const[x,y]of pts)for(let yy=y-h-1;yy<=y-h+w;yy++)for(let xx=x-h-1;xx<=x-h+w;xx++){if(xx<0||yy<0||xx>=NX||yy>=NY)continue;const k=yy*NX+xx;
    if(!pipeIn[k]&&!wall[k]&&!resv[k])makeSolid(k,1);}
  for(const[x,y]of pts)for(let yy=y-h;yy<y-h+w;yy++)for(let xx=x-h;xx<x-h+w;xx++){if(xx<0||yy<0||xx>=NX||yy>=NY)continue;const k=yy*NX+xx;
    if(wall[k]===1&&!valves.some(v=>v.under&&valveCells(v).includes(k))&&!injs.some(o=>injCells(o).includes(k)))makeGasFromNeighbours(k);}
}
function addPlug(x,y,key,on){const k=y*NX+x;for(const p of plugs.filter(p=>p.x===x&&p.y===y))removePlug(p);if(wall[k]!==3)makeSolid(k,3);
  const p={id:nextId++,x,y,key:key||0,on:on===undefined?!key:!!on,flash:0,phase:(Math.random()*6)|0};plugs.push(p);return p;}
function removePlug(p){const k=p.y*NX+p.x;if(wall[k]===3)makeGasFromNeighbours(k);plugs=plugs.filter(o=>o!==p);}
function plugOn(p){return p.key?!!keyState[p.key]:!!p.on;}
function removeTank(t){tanks=tanks.filter(o=>o!==t);rebuildResv();}   // the gas and walls stay; it just stops being a refilling tank
function heatRegion(x0,y0,x1,y1,T){ // raise gas temperature to at least T (spark / igniter)
  for(let y=Math.max(0,y0);y<=Math.min(NY-1,y1);y++)for(let x=Math.max(0,x0);x<=Math.min(NX-1,x1);x++){const k=y*NX+x;if(wall[k])continue;
    const r=rho[k],ke=0.5*(mx[k]*mx[k]+my[k]*my[k])/r,eNeed=r*Rcell(k)*T/(GAM-1);if(En[k]-ke<eNeed)En[k]=ke+eNeed;}
}
function runPlugs(){frameNo++;}
// Igniters are torch igniters, like real engines use: a tiny burner that blows a small, fuel-rich flame out of its face.
// Its unburned hydrogen keeps burning wherever it finds oxygen, so before the main valves open you get a lazy flame
// licking out of the nozzle, and the moment propellant arrives it lights off in the hot gas.
let TORCH_P=5e5,TORCH_T=2100,TORCH_V=250,TORCH_TAU=2.5e-4,TORCH_WANDER=63;
const TORCH_Y=[0.5,0,0,0.5,0,0,0,0];       // fuel-rich: the extra hydrogen burns where it meets air
const gauss=()=>Math.sqrt(-2*Math.log(Math.random()+1e-12))*Math.cos(6.2832*Math.random());
function torches(dt){
  if(!plugs.length)return;
  const Rt=RofY(TORCH_Y),rt=TORCH_P/(Rt*TORCH_T),e=Rt*TORCH_T/(GAM-1),sq=Math.sqrt(dt);
  for(const p of plugs){if(!torchLit(p))continue;
    // a real flame never sits still: its direction and strength drift randomly (two slow random walks)
    p.ang=Math.max(-1.3,Math.min(1.3,(p.ang||0)*(1-dt/TORCH_TAU)+TORCH_WANDER*sq*gauss()));
    p.str=Math.max(0.15,Math.min(1.9,(p.str||1)+(1-(p.str||1))*dt/TORCH_TAU+0.8*TORCH_WANDER*sq*gauss()));
    p.flash=p.str;
    const open=[];let bx=0,by=0;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy;if(x<0||y<0||x>=NX||y>=NY)continue;const j=y*NX+x;if(!wall[j]&&!resv[j]){open.push([dx,dy,j]);bx+=dx;by+=dy;}}
    if(!open.length)continue;
    const base=(bx||by)?Math.atan2(by,bx):0,a=base+p.ang,ux=Math.cos(a),uy=Math.sin(a);   // points away from whatever it's mounted on
    let wsum=0;const w=open.map(([dx,dy])=>{const c=Math.max(0.05,dx*ux+dy*uy);wsum+=c*c;return c*c;});
    const mainOpen=p.key&&valves.some(v=>v.key===p.key&&v.open);
    open.forEach(([dx,dy,j],i)=>{
      const dm=rt*TORCH_V*p.str*dt/DX*w[i]/wsum,vx=ux*TORCH_V,vy=uy*TORCH_V;
      for(let s=0;s<NSA;s++){const m=dm*TORCH_Y[s];rs[s][j]+=m;added[s]+=m*CELLV;}
      rho[j]+=dm;mx[j]+=dm*vx;my[j]+=dm*vy;En[j]+=dm*(e+0.5*TORCH_V*TORCH_V);
      // once propellant is pouring in, the torch mouth holds a flame so the cold rush can't blow it out
      const x=j%NX,y=(j/NX)|0;
      if(mainOpen)heatRegion(x+dx-1,y+dy-1,x+dx+1,y+dy+1,1600);
      else if(w[i]/wsum>0.4)heatRegion(x,y,x,y,1800);});      // the base of the flame (always hot enough to light whatever reaches it)
  }
}
// valves with a delay open that long after their key is switched on (the igniter on the same key lights first)
// Once every valve on its key has been open for 1.5 ms the engine is self-sustaining, so the torch shuts off (like real engines);
// an igniter on a key with no valves just keeps burning.
const TORCH_CUT=1.5e-3;
function torchLit(p){return plugOn(p)&&!p.done;}
function runValveTimers(){
  for(const v of valves)if(v.openAt>0&&simTime>=v.openAt){v.openAt=0;setValve(v,true);}
  for(const p of plugs){if(!p.key||!plugOn(p)||p.done)continue;
    const vs=valves.filter(v=>v.key===p.key);
    if(!vs.length){if(srbBurning>20){if(!p.cutAt)p.cutAt=simTime+0.8e-3;else if(simTime>=p.cutAt)p.done=true;}continue;}   // a booster's igniter quits once the grain is burning well
    if(!vs.every(v=>v.open))continue;
    if(!p.cutAt)p.cutAt=simTime+TORCH_CUT;else if(simTime>=p.cutAt)p.done=true;}
}
function toggleKey(k){
  const vs=valves.filter(v=>v.key===k);if(!vs.length&&!plugs.some(p=>p.key===k))return null;
  const open=!keyState[k];keyState[k]=open?1:0;
  for(const p of plugs)if(p.key===k){p.done=false;p.cutAt=0;}
  for(const v of vs){if(open&&v.delay>0)v.openAt=simTime+v.delay;else{v.openAt=0;setValve(v,open);}}
  return open;
}
let sparks=[];   // timed heat zones {x0,y0,x1,y1,frames}
function runSparks(){for(const s of sparks)if(s.frames-->0)heatRegion(s.x0,s.y0,s.x1,s.y1,2500);sparks=sparks.filter(s=>s.frames>0);}
// outside air / vacuum for everything connected to the edge
const outsideMask=new Uint8Array(NC);
function floodOutside(){outsideMask.fill(0);const q=[];const push=k=>{if(!wall[k]&&!outsideMask[k]){outsideMask[k]=1;q.push(k);}};
  for(let x=0;x<NX;x++){push(x);push((NY-1)*NX+x);}for(let y=0;y<NY;y++){push(y*NX);push(y*NX+NX-1);}
  while(q.length){const k=q.pop(),x=k%NX,y=(k/NX)|0;if(x>0)push(k-1);if(x<NX-1)push(k+1);if(y>0)push(k-NX);if(y<NY-1)push(k+NX);}}
function setAtmo(on){atmo=on?1:0;pAmb=on?101325:40;floodOutside();for(let k=0;k<NC;k++)if(outsideMask[k]&&!resv[k])setGas(k,AIRY,pAmb,TAmb);}
// ---------------- solid propellant ----------------
// Painted propellant (like the rubbery aluminium-perchlorate fuel in a real booster) burns wherever it touches hot gas.
// Its surface eats back at r = a·Pⁿ, faster at higher chamber pressure like real composite propellant, and what burns
// becomes hot, smoky exhaust right at the surface. So the shape of the hole you leave (round, star, slots, end-burner)
// sets how much surface is burning, and with it the pressure and thrust curve, and it changes as the grain burns away.
// Time-lapse: each cell holds SRB_K× less propellant than real and burns back SRB_K× faster, so a booster burns out in a few
// milliseconds of simulated time while putting out the same gas flow per area of burning surface as the real thing.
const SRB_Y=[0.02,0,0.13,0.30,0.25,0.30,0,0];   // exhaust by mass: a little unburnt H₂, N₂, steam, CO₂ (standing in for CO/CO₂/HCl), Al₂O₃ smoke
const RHO_P=1750,SRB_K=120,SRB_N=0.35,SRB_TF=3000,SRB_TIGN=800;
let srbMass=0,SRB_A=2.5e-4,srbRate=1,srbBurning=0,srbList=new Int32Array(0),srbVer=-1;   // SRB_A is game-tuned: a 2D slice has far less burning surface per throat than a real 3D grain
const R_SRB=RofY(SRB_Y);
function srb(dt){
  if(srbVer!==wallVer){srbVer=wallVer;let n=0;for(let k=0;k<NC;k++)if(wall[k]===4)n++;srbList=new Int32Array(n);n=0;for(let k=0;k<NC;k++)if(wall[k]===4)srbList[n++]=k;}
  if(!srbList.length){srbBurning=0;return;}
  let burning=0;const eT=R_SRB*SRB_TF*heatMult/(GAM-1),gone=[];
  for(let q=0;q<srbList.length;q++){const k=srbList[q];if(wall[k]!==4)continue;
    const x=k%NX,y=(k/NX)|0;let faces=0,pSum=0,hot=false;
    for(let d=0;d<4;d++){const j=d===0?(x>0?k-1:-1):d===1?(x<NX-1?k+1:-1):d===2?(y>0?k-NX:-1):(y<NY-1?k+NX:-1);
      if(j<0||wall[j]||resv[j])continue;faces++;const p=pres(j);pSum+=p;if(!lit[k]&&p/(rho[j]*Rcell(j))>SRB_TIGN)hot=true;}
    if(!faces)continue;if(!lit[k]){if(!hot)continue;lit[k]=1;}
    burning++;
    const P=Math.max(2e4,pSum/faces),r=SRB_A*srbRate*Math.pow(P,SRB_N);                 // regression rate, m/s
    const want=faces*r*SRB_K*dt/DX,take=Math.min(want,prop[k]),mFace=RHO_P*r*DX*DX*dt*(take/want);   // kg out of each burning face
    for(let d=0;d<4;d++){const j=d===0?(x>0?k-1:-1):d===1?(x<NX-1?k+1:-1):d===2?(y>0?k-NX:-1):(y<NY-1?k+NX:-1);
      if(j<0||wall[j]||resv[j])continue;const dr=mFace/CELLV;
      for(let s=0;s<NS;s++){const a=SRB_Y[s]*dr;if(a){rs[s][j]+=a;added[s]+=a*CELLV;}}rho[j]+=dr;En[j]+=dr*eT;srbMass+=mFace;}
    prop[k]-=take;if(prop[k]<=1e-6)gone.push(k);}
  if(burning)NSA=Math.max(NSA,AL+1);srbBurning=burning;
  for(const k of gone)openBurntCell(k);}
// When the last of a cell's propellant burns, the hole it leaves fills with chamber gas.
// In a real motor the chamber grows so slowly that the gas filling it is under 0.5% of the propellant: it never robs the nozzle.
// The time-lapse grows the chamber 120× faster, so if the hole had to be filled from the exhaust, a quarter of the gas would
// sit in the chamber and dribble out at low pressure after burnout. So the hole is filled straight at chamber conditions
// (like a real motor, the nozzle flow isn't robbed) and that gas is tallied apart (srbFree). The same inflation makes the
// start-up fill and the blow-down after burnout ~120× too big, so the honest Isp is the steady one: thrust ÷ propellant
// burn rate while the motor pushes properly (the test stand measures it over the part of the burn above half the peak thrust).
let srbFree=0;
function openBurntCell(k){makeGasFromNeighbours(k);if(!wall[k])srbFree+=rho[k]*CELLV;}
// ---------------- stepping ----------------
let START_DELAY=0,PLUG_X=18,H2P=350;   // valves open instantly; light the igniter (key 2) first for the slow-flame start
let H2HOLES=[37,40,43],O2HOLES=[47,50,53,56],O2P=350;   // 3 H2 : 4 O2 holes, both tanks at 350 psi → mixture ratio ≈ 5, steady
let stepNo=0,flip=false,dtCache=0,dtAge=0,CFL=0.85,DT_EVERY=1;
function step(){
  holdTanks();runValveTimers();if(checks.length)runChecks();if((++stepNo&63)===0)updNSA();
  if(dtAge--<=0){dtCache=maxDt(CFL);dtAge=DT_EVERY-1;}
  const dt=dtCache;
  if(flip){sweep(true,dt);sweep(false,dt);}else{sweep(false,dt);sweep(true,dt);}
  flip=!flip;torches(dt);injectors();srb(dt);mix(dt);react(dt);cool(dt);simTime+=dt;return dt;
}
// ---------------- atoms ----------------
function domainMass(){const m=new Float64Array(NS);for(let k=0;k<NC;k++){if(wall[k])continue;for(let s=0;s<NSA;s++)m[s]+=rs[s][k]*CELLV;}return m;}
function atoms(m){const a=new Array(NE).fill(0);for(let s=0;s<NSA;s++)for(let e=0;e<NE;e++)a[e]+=m[s]/MW[s]*ATOMS[s][e];return a;}  // mol of atoms
function atomCheck(){const d=atoms(domainMass()),o=atoms(edgeOut),r=atoms(removed),a=atoms(added);
  const err=d.map((x,e)=>Math.abs(d[e]+o[e]+r[e]-a[e])/Math.max(1e-9,a[e]));return{now:d,out:o,ok:err.every((x,e)=>x<0.002||a[e]<1e-9),err};}
// ---------------- scenarios ----------------
function solidRect(x0,y0,x1,y1,v){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const k=y*NX+x;if(v)makeSolid(k,v);else if(wall[k]){wall[k]=0;wallVer++;}}}
function resetWorld(on){
  wall.fill(0);prop.fill(0);lit.fill(0);srbMass=0;srbFree=0;srbBurning=0;wallVer++;resv.fill(0);rr.fill(0);tanks=[];valves=[];plugs=[];injs=[];checks=[];pipeIn.fill(0);sparks=[];keyState.fill(0);hint="";simTime=0;nextId=1;
  for(let s=0;s<NSA;s++)rs[s].fill(0);rho.fill(0);mx.fill(0);my.fill(0);En.fill(0);resetTallies();
  atmo=on?1:0;pAmb=on?101325:40;for(let k=0;k<NC;k++)setGas(k,AIRY,pAmb,TAmb);
}
function finishScenario(){rebuildResv();holdTanks();floodOutside();for(let k=0;k<NC;k++)if(!wall[k]&&rho[k]<=0)outsideState(k);}
// The same engine for three fuels. Each fuel needs a different amount of oxygen, and pushes a different amount through a hole,
// so the number of fuel holes and the tank pressures change (found by running the engine and measuring what it burns):
//   hydrogen 3 holes at 350 psi, O₂ 350 · methane 1 hole at 600 psi, O₂ 550 · kerosene 1 hole at 550 psi, O₂ 450  (O₂: 4 holes)
// Each runs fuel-rich, like real engines (it keeps the chamber cooler; for kerosene it makes the soot). The fuel tank sits
// well above the chamber pressure on purpose: closer than about 1.5× and the fuel flow collapses whenever the chamber
// pressure rises, so the mixture jumps between far too rich and far too lean.
const ENG_FUEL={h2:{sp:H2,name:"H₂",gap:3,P:350,oP:350},ch4:{sp:CH4,name:"CH₄",gap:9,P:600,oP:550},ker:{sp:KER,name:"Kerosene",gap:9,P:550,oP:450}};
function scEngine(fuel){
  const F=ENG_FUEL[fuel]||ENG_FUEL.h2,std=F.sp===H2;
  resetWorld(true);
  // pressure-fed H2/O2 engine. Through a hole, O2 carries ~4x the mass of H2 at the same pressure, so 3 H2 : 4 O2 holes
  // runs at a mixture ratio of about 5 (a bit fuel-rich, like real hydrogen engines). equal tank pressures and a big injector pressure drop keep the injectors
  // "stiff" (big pressure drop), so the mixture can't wander as the chamber pressure changes.
  solidRect(3,28,72,62,1);
  solidRect(6,33,16,44,0);solidRect(6,46,16,57,0);                   // tanks + valve columns
  // injector plates in the face (holes every 3 cells: H2 at 37,40,43 · O2 at 47,50,53,56) — click one to change its type
  if(!std||H2HOLES.join()==="37,40,43"&&O2HOLES.join()==="47,50,53,56"){newInj(17,36,9,0,"straight",F.gap);newInj(17,46,11,0,"straight",3);}
  else{for(const y of H2HOLES)solidRect(17,y,17,y,0);for(const y of O2HOLES)solidRect(17,y,17,y,0);}
  solidRect(18,34,42,56,0);                                            // combustion chamber
  for(let x=43;x<=72;x++){const h=x<=50?Math.round(11-(x-43)*8/7):x<=53?3:Math.round(3+8*(1-(1-(x-53)/19)**2));solidRect(x,45-h,x,45+h,0);} // throat 7 cells, exit ~3.3x
  for(let k=0;k<NC;k++)if(!wall[k])setGas(k,AIRY,pAmb,TAmb);
  const fY=new Array(NS).fill(0);fY[F.sp]=1;if(F.sp>=NSA)NSA=F.sp+1;
  tanks.push({id:nextId++,x0:6,y0:33,x1:15,y1:44,Y:fY,P:(std?H2P:F.P)*PSI_PA,T:300,inf:true,name:F.name});
  tanks.push({id:nextId++,x0:6,y0:46,x1:15,y1:57,Y:[0,1,0,0],P:(std?O2P:F.oP)*PSI_PA,T:300,inf:true,name:"O₂"});
  // start sequence on key 1: the torch igniter lights first and its flame works its way out of the nozzle,
  // then the main valves open into the hot chamber and the engine lights off
  addValve(16,33,16,44,1,false,0);addValve(16,46,16,57,1,false,0);          // main valves on key 1: open instantly
  addPlug(PLUG_X,45,2);                                                // torch igniter sticking out of the middle of the injector face
  finishScenario();
  hint="Press 2 to light the igniter, then 1 to open the main valves";
}
function scSpark(){resetWorld(true);solidRect(20,18,139,18,1);solidRect(20,71,139,71,1);solidRect(20,18,20,71,1);solidRect(139,18,139,71,1);
  fillRect(21,19,138,70,MIXY,20*PSI_PA,300);finishScenario();sparks.push({x0:26,y0:40,x1:31,y1:49,frames:6});hint="Sealed box of 2 H₂ : 1 O₂ at 20 psi, sparked on the left";}
function scTwo(){resetWorld(false);for(const[a,b,c,d]of[[20,15,139,15],[20,74,139,74],[20,15,20,74],[139,15,139,74]])solidRect(a,b,c,d,1);
  fillRect(21,16,79,73,[0,0,1,0],35*PSI_PA,300);fillRect(81,16,138,73,[0,1,0,0],6*PSI_PA,300);addValve(80,16,80,73,1,false);finishScenario();hint="Press 1 to open the divider valve";}
function scEmpty(){resetWorld(true);finishScenario();}
function scSRB(){
  resetWorld(true);
  // steel case with a head end, a grain with a slotted bore (a 2D "star"), a short aft chamber and a contoured nozzle
  solidRect(3,27,95,63,1);
  solidRect(6,30,58,60,0);                                            // inside the case
  for(let y=31;y<=59;y++)for(let x=7;x<=57;x++){const k=y*NX+x;makeSolid(k,4);}   // the grain
  solidRect(7,41,57,49,0);                                            // central bore (wider than the throat, or the bore itself chokes the flow)
  for(const sx of[17,28,39,50])solidRect(sx,35,sx+1,55,0);            // star slots: extra burning surface early on
  solidRect(58,35,62,55,0);                                           // aft chamber
  for(let x=63;x<=95;x++){const h=x<=67?Math.round(10-(x-63)*7/4):x<=69?3:Math.round(3+13*(1-(1-(x-69)/26)**2));solidRect(x,45-h,x,45+h,0);}   // throat 7 cells, exit ~4×
  for(let k=0;k<NC;k++)if(!wall[k])setGas(k,AIRY,pAmb,TAmb);
  addPlug(7,45,1);                                                    // igniter at the head end of the bore, on key 1
  finishScenario();
  hint="Press 1 to fire the igniter. The flame runs down the bore, the grain lights, and it burns until the propellant is gone";}

// ---------------- player actions ----------------
// Everything the player changes goes through act(), so it can run the same way on the physics thread and the screen copy.
// The scenarios are drawn for the normal 160×90 world; in a bigger world they're slid over so they sit where they should.
function shiftWorld(dx,dy){
  if(!dx&&!dy)return;
  const A=[rho,mx,my,En,...rs],T=A.map(a=>a.slice()),Wl=wall.slice(),Pi=pipeIn.slice(),Pr=prop.slice(),Lt=lit.slice();prop.fill(0);lit.fill(0);
  for(let k=0;k<NC;k++){wall[k]=0;pipeIn[k]=0;setGas(k,AIRY,pAmb,TAmb);}
  for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=NX||ny>=NY)continue;const a=y*NX+x,b=ny*NX+nx;
    for(let i=0;i<A.length;i++)A[i][b]=T[i][a];wall[b]=Wl[a];pipeIn[b]=Pi[a];prop[b]=Pr[a];lit[b]=Lt[a];}
  for(const t of tanks){t.x0+=dx;t.x1+=dx;t.y0+=dy;t.y1+=dy;}
  for(const o of[...valves,...injs,...checks]){o.x+=dx;o.y+=dy;syncValveRect(o);if(o.bore)o.bore=o.bore.map(k=>k+dy*NX+dx);}
  for(const p of plugs){p.x+=dx;p.y+=dy;}
  wallVer++;rebuildResv();floodOutside();resetTallies();const m=domainMass();for(let i=0;i<NS;i++)added[i]=m[i];}   // fresh atom bookkeeping
const place=(fx,fy)=>shiftWorld(Math.round((NX-160)*fx),Math.round((NY-90)*fy));
const SCENS={srb:()=>{scSRB();place(0.08,0.5);},engine:()=>{scEngine("h2");place(0.08,0.5);},methane:()=>{scEngine("ch4");place(0.08,0.5);},kerosene:()=>{scEngine("ker");place(0.08,0.5);},spark:()=>{scSpark();place(0.5,0.5);},two:()=>{scTwo();place(0.5,0.5);},empty:()=>scEmpty()};
const byId=(arr,id)=>arr.find(o=>o.id===id);
const ACTS={
  brush(x0,y0,x1,y1,mode,Y,P,T){            // mode 0 gas, 1 wall, 2 erase
    if(mode===2){const R={x0,y0,x1,y1},inR=(x,y)=>x>=x0&&x<=x1&&y>=y0&&y<=y1;
      for(const v of valves.filter(v=>rectsHit(v,R)))removeValve(v);
      for(const q of injs.filter(q=>rectsHit(q,R)))removeInj(q);
      for(const c of checks.filter(c=>rectsHit(c,R)))removeCheck(c);
      for(const p of plugs.filter(p=>inR(p.x,p.y)))removePlug(p);
      const nT=tanks.length;tanks=tanks.filter(t=>!inR((t.x0+t.x1)>>1,(t.y0+t.y1)>>1));if(tanks.length!==nT)rebuildResv();}
    for(let y=Math.max(0,y0);y<=Math.min(NY-1,y1);y++)for(let x=Math.max(0,x0);x<=Math.min(NX-1,x1);x++){const k=y*NX+x;
      if(mode===2){if(wall[k]){wall[k]=0;makeGasFromNeighbours(k);}else if(!resv[k])outsideState(k);}
      else if(mode===1){if(!wall[k]||wall[k]===4)makeSolid(k,1);}
      else if(mode===3){if(!wall[k]&&!resv[k])makeSolid(k,4);else if(wall[k]===4){prop[k]=1;lit[k]=0;}}
      else if(!wall[k])setGas(k,Y,P,T);}
  },
  plug(x,y){return addPlug(x,y,0,false);},
  valve(x,y,len,dir){return newValve(x,y,len,dir,0,false,0);},
  inj(x,y,len,dir,type){return newInj(x,y,len,dir,type,3);},
  check(x,y,len,dir,flow){return newCheck(x,y,len,dir,flow);},
  pipe(x0,y0,x1,y1,w){pipeSeg(x0,y0,x1,y1,w);},
  key(k){const r=toggleKey(k);if(r!==null)hint="";return r;},
  tankBox(x0,y0,x1,y1,Y,P,T,inf,name){
    for(let x=x0;x<=x1;x++){makeSolid(y0*NX+x,1);makeSolid(y1*NX+x,1);}for(let y=y0;y<=y1;y++){makeSolid(y*NX+x0,1);makeSolid(y*NX+x1,1);}
    const t={id:nextId++,x0:x0+1,y0:y0+1,x1:x1-1,y1:y1-1,Y,P,T,inf,name};fillRect(t.x0,t.y0,t.x1,t.y1,Y,P,T);
    if(tanks.length>=12)removeTank(tanks[0]);tanks.push(t);rebuildResv();return t;},
  // change settings of a valve / igniter / tank (only the fields given)
  set(kind,id,o){
    if(kind==="valve"){const v=byId(valves,id);if(!v)return;
      if("key"in o){v.key=o.key;v.openAt=0;if(o.key){const on=!!keyState[o.key];if(v.open!==on)setValve(v,on);}}
      if("delay"in o)v.delay=o.delay;
      if("open"in o){v.openAt=0;if(v.key){if(!!keyState[v.key]!==o.open)toggleKey(v.key);}else setValve(v,o.open);}
      if("len"in o||"dir"in o||"x"in o||"y"in o){liftValve(v);
        if("len"in o)v.len=Math.max(1,Math.min(80,o.len|0));if("dir"in o)v.dir=o.dir?1:0;if("x"in o)v.x=o.x;if("y"in o)v.y=o.y;
        v.x=Math.max(0,Math.min(NX-(v.dir?v.len:1),v.x));v.y=Math.max(0,Math.min(NY-(v.dir?1:v.len),v.y));dropValve(v);}}
    else if(kind==="check"){const c=byId(checks,id);if(!c)return;liftCheck(c);
      if("flow"in o)c.flow=o.flow<0?-1:1;if("len"in o)c.len=Math.max(1,Math.min(60,o.len|0));if("dir"in o)c.dir=o.dir?1:0;if("x"in o)c.x=o.x;if("y"in o)c.y=o.y;
      c.x=Math.max(0,Math.min(NX-(c.dir?c.len:1),c.x));c.y=Math.max(0,Math.min(NY-(c.dir?1:c.len),c.y));c.open=false;dropCheck(c);}
    else if(kind==="inj"){const q=byId(injs,id);if(!q)return;liftInj(q);
      if("type"in o&&INJ_TYPES.includes(o.type))q.type=o.type;if("gap"in o)q.gap=Math.max(2,Math.min(6,o.gap|0));if("flip"in o)q.flip=o.flip?1:0;
      if("len"in o)q.len=Math.max(1,Math.min(60,o.len|0));if("dir"in o)q.dir=o.dir?1:0;if("x"in o)q.x=o.x;if("y"in o)q.y=o.y;
      q.x=Math.max(0,Math.min(NX-(q.dir?q.len:1),q.x));q.y=Math.max(0,Math.min(NY-(q.dir?1:q.len),q.y));dropInj(q);}
    else if(kind==="plug"){const p=byId(plugs,id);if(!p)return;
      if("key"in o){p.key=o.key;p.done=false;p.cutAt=0;}if("on"in o){p.on=o.on;p.done=false;p.cutAt=0;}
      if(("x"in o||"y"in o)){const nx=Math.max(0,Math.min(NX-1,"x"in o?o.x:p.x)),ny=Math.max(0,Math.min(NY-1,"y"in o?o.y:p.y));
        if(nx!==p.x||ny!==p.y){const k=p.y*NX+p.x;if(wall[k]===3)makeGasFromNeighbours(k);p.x=nx;p.y=ny;const j=ny*NX+nx;if(wall[j]!==3)makeSolid(j,3);}}}
    else if(kind==="tank"){const t=byId(tanks,id);if(!t)return;
      for(const f of["Y","P","T","inf","name"])if(f in o)t[f]=o[f];
      fillRect(t.x0,t.y0,t.x1,t.y1,t.Y,t.P,t.T);rebuildResv();}
  },
  del(kind,id){if(kind==="valve"){const v=byId(valves,id);if(v)removeValve(v);}else if(kind==="check"){const c=byId(checks,id);if(c)removeCheck(c);}else if(kind==="inj"){const q=byId(injs,id);if(q)removeInj(q);}else if(kind==="plug"){const p=byId(plugs,id);if(p)removePlug(p);}
    else if(kind==="tank"){const t=byId(tanks,id);if(t)removeTank(t);}},
  atmo(on){setAtmo(on);},
  clear(){for(let k=0;k<NC;k++)if(!wall[k]&&!resv[k])outsideState(k);},
  scen(id){SCENS[id]();},
  heat(x0,y0,x1,y1,T){heatRegion(x0,y0,x1,y1,T);},
  fuel(m){heatMult=m;},
  srbRate(m){srbRate=m;},
};
function act(name,...a){return ACTS[name](...a);}
// ---------------- undo + saved designs ----------------
const clone=o=>JSON.parse(JSON.stringify(o));
// everything you build (walls, tanks, valves, igniters, keys) but not the gas
function getLayout(){return{prop:prop.slice(),wall:wall.slice(),tanks:clone(tanks),valves:clone(valves),plugs:clone(plugs),injs:clone(injs),checks:clone(checks),keyState:keyState.slice(),nextId};}
function applyLayout(L){
  for(let k=0;k<NC;k++){const a=wall[k],b=L.wall[k];if(a===b)continue;if(b&&!a)makeSolid(k,b);else if(!b&&a)makeGasFromNeighbours(k);else{wall[k]=b;wallVer++;}}
  if(L.prop){prop.set(L.prop);for(let k=0;k<NC;k++)if(wall[k]!==4){prop[k]=0;lit[k]=0;}}
  tanks=clone(L.tanks);valves=clone(L.valves);plugs=clone(L.plugs);injs=clone(L.injs||[]);checks=clone(L.checks||[]);keyState.set(L.keyState);nextId=L.nextId;rebuildResv();}
const rle=a=>{const o=[];let v=a[0],n=0;for(let i=0;i<a.length;i++){if(a[i]===v)n++;else{o.push(v+"*"+n);v=a[i];n=1;}}o.push(v+"*"+n);return o.join(",");};
const unrle=s=>{const a=new Uint8Array(NC);let i=0;for(const r of s.split(",")){const[v,n]=r.split("*").map(Number);a.fill(v,i,i+n);i+=n;}return a;};
function exportDesign(){
  const w=wall.slice();
  for(const v of valves){valveCells(v).forEach((k,i)=>{w[k]=v.under[i]?1:0;});for(const k of v.bore||[])w[k]=1;}   // valves go back in shut
  for(const p of plugs)w[p.y*NX+p.x]=0;for(const q of injs)injCells(q).forEach((k,i)=>{w[k]=q.under[i]?1:0;});for(const c of checks)valveCells(c).forEach((k,i)=>{w[k]=c.under[i]?1:0;});for(let k=0;k<NC;k++)if(w[k]!==1&&w[k]!==4)w[k]=0;
  return{v:1,nx:NX,ny:NY,atmo,heat:heatMult,srb:srbRate,wall:rle(w),tanks:tanks.map(t=>({x0:t.x0,y0:t.y0,x1:t.x1,y1:t.y1,Y:t.Y,P:t.P,T:t.T,inf:t.inf,name:t.name})),
    valves:valves.map(v=>({x:v.x,y:v.y,len:v.len,dir:v.dir,key:v.key,delay:v.delay})),injs:injs.map(q=>({x:q.x,y:q.y,len:q.len,dir:q.dir,type:q.type,gap:q.gap,flip:q.flip})),checks:checks.map(c=>({x:c.x,y:c.y,len:c.len,dir:c.dir,flow:c.flow})),plugs:plugs.map(p=>({x:p.x,y:p.y,key:p.key,on:!!p.on}))};}
function loadDesign(d){
  resetWorld(d.atmo!==0);
  const dnx=d.nx||160,dny=d.ny||90,ox=dnx===NX?0:Math.round((NX-dnx)*0.08),oy=Math.round((NY-dny)/2);   // a design from another world size sits in the middle-left
  const w=new Uint8Array(dnx*dny);{let i=0;for(const r of d.wall.split(",")){const[v,n]=r.split("*").map(Number);w.fill(v,i,i+n);i+=n;}}
  for(let y=0;y<dny;y++)for(let x=0;x<dnx;x++){const wv=w[y*dnx+x];if(wv!==1&&wv!==4)continue;const X=x+ox,Y=y+oy;if(X>=0&&Y>=0&&X<NX&&Y<NY)makeSolid(Y*NX+X,wv);}
  if(ox||oy)d=JSON.parse(JSON.stringify(d,(k,v)=>v),(k,v)=>v),d.tanks.forEach(t=>{t.x0+=ox;t.x1+=ox;t.y0+=oy;t.y1+=oy;}),
    [...d.valves,...(d.injs||[]),...(d.checks||[]),...d.plugs].forEach(o=>{o.x+=ox;o.y+=oy;});
  for(const t of d.tanks)tanks.push({id:nextId++,...t});
  for(const v of d.valves)newValve(v.x,v.y,v.len,v.dir,v.key,false,v.delay);
  for(const q of d.injs||[]){const o=newInj(q.x,q.y,q.len,q.dir,q.type,q.gap);o.flip=q.flip||0;}
  for(const c of d.checks||[])newCheck(c.x,c.y,c.len,c.dir,c.flow);
  for(const p of d.plugs)addPlug(p.x,p.y,p.key,p.on);
  if(d.heat)heatMult=d.heat;if(d.srb)srbRate=d.srb;finishScenario();hint="";}
ACTS.layout=L=>applyLayout(L);
ACTS.design=d=>loadDesign(d);
// snapshot of the whole simulation (physics thread → screen)
const SNAP_F64=()=>[rho,mx,my,En,...rs],NSNAP=4+NS;
function exportState(){
  const big=new Float64Array(NC*NSNAP),A=SNAP_F64();for(let i=0;i<NSNAP;i++)big.set(A[i],i*NC);
  return{big,prop:prop.slice(),lit:lit.slice(),srbBurning,srbRate,srbMass,NSA,rr:rr.slice(),wall:wall.slice(),resv:resv.slice(),keyState:keyState.slice(),added:added.slice(),removed:removed.slice(),edgeOut:edgeOut.slice(),
    tanks,valves,plugs,injs,checks,sparks,hint,simTime,waterMade,atmo,pAmb,heatMult,frameNo,nextId};
}
function importState(o){
  const A=SNAP_F64();for(let i=0;i<NSNAP;i++)A[i].set(o.big.subarray(i*NC,(i+1)*NC));
  if(o.prop){prop.set(o.prop);lit.set(o.lit);srbBurning=o.srbBurning;srbRate=o.srbRate;srbMass=o.srbMass||0;NSA=o.NSA;}
  rr.set(o.rr);wall.set(o.wall);wallVer++;resv.set(o.resv);resvVer++;keyState.set(o.keyState);added.set(o.added);removed.set(o.removed);edgeOut.set(o.edgeOut);
  tanks=o.tanks;valves=o.valves;plugs=o.plugs;injs=o.injs||[];checks=o.checks||[];sparks=o.sparks;hint=o.hint;simTime=o.simTime;waterMade=o.waterMade;atmo=o.atmo;pAmb=o.pAmb;heatMult=o.heatMult;frameNo=o.frameNo;nextId=o.nextId;
}
if(typeof module!=="undefined")module.exports={get checks(){return checks},get injs(){return injs},pipeSeg,getLayout,applyLayout,exportDesign,loadDesign,get tanks(){return tanks},setCool:(t,u)=>{COOL_TAU=t;U_COOL=u;},setTorch2:(p,v,tau,w)=>{TORCH_P=p;TORCH_V=v;TORCH_TAU=tau;TORCH_WANDER=w;},setO2:(h,p)=>{O2HOLES=h;O2P=p;},setH2P:v=>{H2P=v;},setPlugX:x=>{PLUG_X=x;},setTY:y=>{for(let i=0;i<4;i++)TORCH_Y[i]=y[i];},torches,setStart:d=>{START_DELAY=d;},setTorch:(p,v,t)=>{TORCH_P=p;TORCH_V=v;TORCH_T=t;},get plugs(){return plugs},get valves(){return valves},act,exportState,importState,sweep,maxDt,holdTanks,heatRegion,mix,setCFL:(c,e)=>{CFL=c;DT_EVERY=e;},setHoles:h=>{H2HOLES=h;},setMix:(d)=>{DMIX=d;},NX,NY,NC,DX,PSI_PA,rho,mx,my,En,rs,wall,resv,rr,step,react,cellPrim,pres,temp,toggleKey,runPlugs,runSparks,atomCheck,
  scEngine,scSpark,scTwo,scEmpty,setAtmo,get simTime(){return simTime},get waterMade(){return waterMade},set heatMult(v){heatMult=v},MW,H2,O2,N2,H2O,domainMass,edgeOut,added,removed};
