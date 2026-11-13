// ================= ORBITS: Earth, the Moon, and where you're headed =================
// Each craft moves around one body at a time (its "sphere of influence"), like Space Flight Simulator and KSP.
// Coasting at high time warp it rides its orbit exactly ("on rails") instead of being stepped.
const PR=300e3,MU=9.81*PR*PR,P0=101325,RHO0=1.225,HSC=4500,ATM_TOP=40e3,PAD2=2000;   // a small Earth; landing zone 2 km east of the pad
const RM=90e3,MUM=1.62*RM*RM,DM=2.5e6,NM=Math.sqrt(MU/DM**3),SOI=DM*Math.pow(MUM/MU,0.4),TH0=Math.PI/2+0.35;
const BOD=[{name:"Earth",R:PR,mu:MU,atm:true,floor:ATM_TOP,soi:Infinity},{name:"Moon",R:RM,mu:MUM,atm:false,floor:4000,soi:SOI}];
const atmP=h=>h>ATM_TOP?0:P0*Math.exp(-h/HSC),atmRho=h=>h>ATM_TOP?0:RHO0*Math.exp(-h/HSC);
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
// the Moon goes round clockwise, the same way rockets fly east from the pad
function moonAt(t){const th=TH0-NM*t,c=Math.cos(th),s=Math.sin(th);return{x:DM*c,y:DM*s,vx:DM*NM*s,vy:-DM*NM*c};}
// ---------- two-body motion (universal variables: works for circles, ellipses and escape paths) ----------
function stumpC(z){if(z>1e-6){const s=Math.sqrt(z);return(1-Math.cos(s))/z;}if(z<-1e-6){const s=Math.sqrt(-z);return(Math.cosh(s)-1)/(-z);}return 0.5-z/24;}
function stumpS(z){if(z>1e-6){const s=Math.sqrt(z);return(s-Math.sin(s))/(s*s*s);}if(z<-1e-6){const s=Math.sqrt(-z);return(Math.sinh(s)-s)/(s*s*s);}return 1/6-z/120;}
function kepler(x,y,vx,vy,mu,dt){
  const r0=Math.hypot(x,y),v2=vx*vx+vy*vy,vr=(x*vx+y*vy)/r0,al=2/r0-v2/mu,sm=Math.sqrt(mu);
  let chi=sm*Math.abs(al)*dt;if(!(Math.abs(al)>1e-12)||!isFinite(chi)||chi===0)chi=sm*dt/r0;
  for(let i=0;i<60;i++){const z=al*chi*chi,C=stumpC(z),S=stumpS(z);
    const F=r0*vr/sm*chi*chi*C+(1-al*r0)*chi*chi*chi*S+r0*chi-sm*dt,dF=r0*vr/sm*chi*(1-z*S)+(1-al*r0)*chi*chi*C+r0;
    const d=F/dF;chi-=d;if(Math.abs(d)<1e-9*Math.max(1,Math.abs(chi)))break;}
  const z=al*chi*chi,C=stumpC(z),S=stumpS(z),f=1-chi*chi/r0*C,g=dt-chi*chi*chi/sm*S;
  const nx=f*x+g*vx,ny=f*y+g*vy,rn=Math.hypot(nx,ny),fd=sm/(rn*r0)*(z*chi*S-chi),gd=1-chi*chi/rn*C;
  return[nx,ny,fd*x+gd*vx,fd*y+gd*vy];}
// ---------- orbit shape ----------
function elems(x,y,vx,vy,mu){
  const r=Math.hypot(x,y),v2=vx*vx+vy*vy,rv=x*vx+y*vy,hz=x*vy-y*vx,s=hz>=0?1:-1;
  const ex=((v2-mu/r)*x-rv*vx)/mu,ey=((v2-mu/r)*y-rv*vy)/mu;let e=Math.hypot(ex,ey);
  const En=v2/2-mu/r,a=Math.abs(En)>1e-9?-mu/(2*En):1e18,p=hz*hz/mu;
  if(Math.abs(e-1)<2e-4)e=e<1?1-2e-4:1+2e-4;
  const w=e>1e-7?Math.atan2(ey,ex):Math.atan2(y,x);let nu=s*(Math.atan2(y,x)-w);nu=((nu%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
  if(e>=1&&nu>Math.PI)nu-=2*Math.PI;
  const per=e<1?2*Math.PI*Math.sqrt(a*a*a/mu):Infinity;
  return{e,a,p,w,s,nu,mu,per,hz,rp:p/(1+e),ra:e<1?p/(1-e):Infinity,nuMax:e>=1?Math.acos(-1/e):Math.PI};}
const posNu=(el,nu)=>{const r=el.p/(1+el.e*Math.cos(nu)),an=el.w+el.s*nu;return[r*Math.cos(an),r*Math.sin(an),r];};
function velNu(el,nu){const k=Math.sqrt(el.mu/el.p),vr=k*el.e*Math.sin(nu),vt=k*(1+el.e*Math.cos(nu)),an=el.w+el.s*nu,c=Math.cos(an),s=Math.sin(an);
  return[vr*c-vt*el.s*s,vr*s+vt*el.s*c];}
function tPe(el,nu){   // time since periapsis at true anomaly nu (negative before it)
  const e=el.e;
  if(e<1){let n=nu;if(n>Math.PI)n-=2*Math.PI;const E=2*Math.atan(Math.sqrt((1-e)/(1+e))*Math.tan(n/2));return(E-e*Math.sin(E))/Math.sqrt(el.mu/(el.a**3));}
  const F=2*Math.atanh(Math.sqrt((e-1)/(e+1))*Math.tan(nu/2));return(e*Math.sinh(F)-F)/Math.sqrt(el.mu/((-el.a)**3));}
function dtTo(el,nu0,nu1){let d=tPe(el,nu1)-tPe(el,nu0);if(el.e<1){while(d<-1e-6)d+=el.per;}return d;}
// ---------- the path ahead: up to three legs (around Earth → into the Moon's sphere → back out), with labelled points ----------
// Positions come back in Earth's frame. A leg around the Moon is drawn around where the Moon will be when you arrive.
function predict(body,x,y,vx,vy,T0){
  const out={legs:[],marks:[]};let st={body,x,y,vx,vy,t:0},first=true;
  for(let leg=0;leg<3;leg++){const B=BOD[st.body],el=elems(st.x,st.y,st.vx,st.vy,B.mu);
    const anchor=st.body===1?moonAt(T0+st.t):{x:0,y:0};
    const span=el.e<1?2*Math.PI:(el.nuMax-0.02)-el.nu;if(span<=0)break;
    const N=el.e<1?360:300,pts=[];let next=null,prev=null;
    const at=nu=>{const[px,py,r]=posNu(el,nu),t=st.t+dtTo(el,el.nu,nu);return{px,py,r,t};};
    for(let k=0;k<=N;k++){
      const nu=el.nu+span*(el.e<1?k/N:Math.pow(k/N,1.6)),q=at(nu);
      // hitting the ground
      if(q.r<B.R){let lo=prev?prev.nu:el.nu,hi=nu;for(let i=0;i<30;i++){const m=(lo+hi)/2;if(at(m).r<B.R)hi=m;else lo=m;}const h=at(hi);
        pts.push([h.px+anchor.x,h.py+anchor.y]);out.marks.push({x:h.px+anchor.x,y:h.py+anchor.y,t:h.t,k:"impact",body:st.body});next=null;prev=null;break;}
      // entering / leaving the Moon's sphere of influence
      let cross=false;
      if(st.body===0){const M=moonAt(T0+q.t);cross=Math.hypot(q.px-M.x,q.py-M.y)<SOI;}else cross=q.r>SOI;
      if(cross&&k>0){let lo=prev.nu,hi=nu;const test=m=>{const z=at(m);if(st.body===0){const M=moonAt(T0+z.t);return Math.hypot(z.px-M.x,z.py-M.y)<SOI;}return z.r>SOI;};
        for(let i=0;i<30;i++){const m=(lo+hi)/2;if(test(m))hi=m;else lo=m;}
        const z=at(hi),[wx,wy]=velNu(el,hi);pts.push([z.px+anchor.x,z.py+anchor.y]);
        if(st.body===0){const M=moonAt(T0+z.t);next={body:1,x:z.px-M.x,y:z.py-M.y,vx:wx-M.vx,vy:wy-M.vy,t:z.t};out.marks.push({x:z.px,y:z.py,t:z.t,k:"enter"});}
        else{const M=moonAt(T0+z.t);next={body:0,x:z.px+M.x,y:z.py+M.y,vx:wx+M.vx,vy:wy+M.vy,t:z.t};out.marks.push({x:z.px+anchor.x,y:z.py+anchor.y,t:z.t,k:"leave"});}
        break;}
      pts.push([q.px+anchor.x,q.py+anchor.y]);prev={nu};}
    // apoapsis and periapsis, when this leg actually gets there
    const endT=next?next.t:out.marks.length&&out.marks[out.marks.length-1].k==="impact"&&out.marks[out.marks.length-1].t>=st.t?out.marks[out.marks.length-1].t:Infinity;
    for(const[nu,k]of[[0,"pe"],[Math.PI,"ap"]]){if(k==="ap"&&el.e>=1)continue;if(el.e<1e-3)continue;
      const t=st.t+dtTo(el,el.nu,nu);if(t>endT||(el.e>=1&&k==="pe"&&el.nu>0))continue;const[px,py,r]=posNu(el,nu);
      if(r<B.R&&k==="pe")continue;out.marks.push({x:px+anchor.x,y:py+anchor.y,t,k,alt:r-B.R,body:st.body});}
    out.legs.push({body:st.body,pts,anchor:st.body===1?{x:anchor.x,y:anchor.y,ghost:!first}:null,el});
    first=false;if(!next)break;st=next;}
  return out;}
