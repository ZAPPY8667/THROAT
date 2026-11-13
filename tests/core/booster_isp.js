// booster Isp. "steady" = thrust ÷ propellant burn rate over the part of the burn above half the peak thrust: what a real motor
// delivers (the time-lapse inflates the start-up fill and the blow-down after burnout, so whole-burn numbers are skewed)
global.THROAT_SIZE=[160,90];const fs=require('fs');
const M=new module.constructor();M._compile(fs.readFileSync(require('path').join(__dirname,'..','..','src','core.js'),'utf8')+'\nmodule.exports.__s={step,act,wall,pres,NX,NC,DX,get simTime(){return simTime},get pAmb(){return pAmb},get srbMass(){return srbMass},get srbFree(){return srbFree},get srbBurning(){return srbBurning}};',"c");const C=M.exports.__s;
C.act('scen','srb');C.act('key',1);
function thrust(){let fx=0;const A=C.DX*C.DX;for(let k=0;k<C.NC;k++){if(C.wall[k])continue;const x=k%C.NX,pg=C.pres(k)-C.pAmb;if(x>0&&C.wall[k-1])fx-=pg*A;if(x<C.NX-1&&C.wall[k+1])fx+=pg*A;}return -fx;}
let I=0,t=C.simTime,burnEnd=null;const S=[];
while(C.simTime<0.016){for(let i=0;i<20;i++)C.step();const F=thrust();I+=F*(C.simTime-t);t=C.simTime;S.push([t,F,I,C.srbMass]);if(C.srbBurning===0&&C.srbMass>0&&burnEnd===null)burnEnd=t;}
const peak=Math.max(...S.map(s=>s[1])),on=S.filter(s=>s[1]>0.5*peak),a=on[0],b=on[on.length-1];
const steady=(b[2]-a[2])/((b[3]-a[3])*9.80665);
console.log(`steady Isp ${steady.toFixed(0)} s (${((b[0]-a[0])*1e3).toFixed(1)} ms above half of the ${(peak/1000).toFixed(2)} kN peak); whole burn ${(I/(C.srbMass*9.80665)).toFixed(0)} s on propellant, ${(I/((C.srbMass+C.srbFree)*9.80665)).toFixed(0)} s counting the gas that fills the burnt-out grain; propellant ${(C.srbMass*1000).toFixed(2)} g, burn ${(burnEnd*1e3).toFixed(1)} ms`);
