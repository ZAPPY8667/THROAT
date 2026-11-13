// the same engine on hydrogen, methane and kerosene: steady thrust, Isp, chamber temperature, mixture, atoms balanced
global.THROAT_SIZE=[160,90];const fs=require('fs');
const M=new module.constructor();M._compile(fs.readFileSync(require('path').join(__dirname,'..','..','src','core.js'),'utf8')+'\nmodule.exports.__s={step,act,atomCheck,added,removed,wall,rs,MW,pres,temp,NX,NC,DX,PSI_PA,NS,O2,H2,CH4,KER,get simTime(){return simTime},get pAmb(){return pAmb}};',"c");const C=M.exports.__s;
function thrust(){let fx=0;const A=C.DX*C.DX;for(let k=0;k<C.NC;k++){if(C.wall[k])continue;const x=k%C.NX,pg=C.pres(k)-C.pAmb;if(x>0&&C.wall[k-1])fx-=pg*A;if(x<C.NX-1&&C.wall[k+1])fx+=pg*A;}return -fx;}
const fed=()=>{let m=0;for(let s=0;s<C.NS;s++)m+=C.added[s]-C.removed[s];return m;};   // propellant poured in by the tanks
for(const[scen,fuel]of[['engine','H2'],['methane','CH4'],['kerosene','KER']]){
  C.act('scen',scen);C.act('key',2);for(let i=0;i<300;i++)C.step();C.act('key',1);for(let i=0;i<1500;i++)C.step();
  let F=0,n=0,T=0;const m0=fed(),t0=C.simTime;
  for(let it=0;it<20;it++){for(let i=0;i<40;i++)C.step();F+=thrust();T+=C.temp(45*C.NX+30);n++;}
  const md=(fed()-m0)/(C.simTime-t0),Fa=F/n,a=C.atomCheck();
  // mixture in the chamber: oxygen there vs oxygen the fuel would need to burn completely
  const k=45*C.NX+30,need=C.rs[C.H2][k]/C.MW[C.H2]*0.5+C.rs[C.CH4][k]/C.MW[C.CH4]*2+C.rs[C.KER][k]/C.MW[C.KER]*1.5;
  console.log(`${fuel.padEnd(3)} thrust ${(Fa/1000).toFixed(2)} kN  Isp ${(Fa/(md*9.80665)).toFixed(0)} s  chamber ${(T/n).toFixed(0)} K ${(C.pres(k)/C.PSI_PA).toFixed(0)} psi  mixture ${(C.rs[C.O2][k]/C.MW[C.O2]/need).toFixed(2)}× the O₂ needed  atoms ${a.ok}`);}
