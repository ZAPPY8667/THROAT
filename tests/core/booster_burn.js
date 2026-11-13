global.THROAT_SIZE=[160,90];const fs=require('fs');
const M=new module.constructor();M._compile(fs.readFileSync(require('path').join(__dirname,'..','..','src','core.js'),'utf8')+'\nmodule.exports.__s={step,act,atomCheck,added,removed,edgeOut,wall,prop,lit,pres,temp,NX,NY,NC,get simTime(){return simTime},get srbBurning(){return srbBurning},PSI_PA,DX,GAM,mx,my,En,rho,get pAmb(){return pAmb},NS};',"c");const C=M.exports.__s;
C.act('scen','srb');let cells0=0;for(let k=0;k<C.NC;k++)if(C.wall[k]===4)cells0++;console.log('grain cells',cells0);
C.act('key',1);
function thrust(){let fx=0;const A=C.DX*C.DX;for(let k=0;k<C.NC;k++){if(C.wall[k])continue;const x=k%C.NX,pg=C.pres(k)-C.pAmb;if(x>0&&C.wall[k-1])fx-=pg*A;if(x<C.NX-1&&C.wall[k+1])fx+=pg*A;}return fx;}
let lastM=0,lastT=0;const t0=Date.now();
for(let it=0;it<900;it++){for(let i=0;i<60;i++)C.step();
  let left=0;for(let k=0;k<C.NC;k++)if(C.wall[k]===4)left+=C.prop[k];
  const pc=C.pres(45*C.NX+30)/C.PSI_PA,tc=C.temp(45*C.NX+30);
  if(it%6===0)console.log(`t=${(C.simTime*1e3).toFixed(2)}ms burning=${C.srbBurning} grain=${(100*left/cells0).toFixed(1)}% Pc=${pc.toFixed(0)}psi Tc=${tc.toFixed(0)}K F=${(-thrust()/1000).toFixed(2)}kN atoms=${C.atomCheck().ok}`);
  if(left<0.5&&it>20)break;}
console.log('real s',(Date.now()-t0)/1000);
