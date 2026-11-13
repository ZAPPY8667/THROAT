global.THROAT_SIZE=[160,90];const fs=require('fs');
const M=new module.constructor();M._compile(fs.readFileSync(require('path').join(__dirname,'..','..','src','core.js'),'utf8')+'\nmodule.exports.__s={step,act,wall,pres,NX,NC,DX,get simTime(){return simTime},get pAmb(){return pAmb},get srbMass(){return srbMass},get srbBurning(){return srbBurning}};',"c");const C=M.exports.__s;
C.act('scen','srb');C.act('key',1);
function thrust(){let fx=0;const A=C.DX*C.DX;for(let k=0;k<C.NC;k++){if(C.wall[k])continue;const x=k%C.NX,pg=C.pres(k)-C.pAmb;if(x>0&&C.wall[k-1])fx-=pg*A;if(x<C.NX-1&&C.wall[k+1])fx+=pg*A;}return -fx;}
let I=0,t=C.simTime,burnEnd=null,Iend=0;
while(C.simTime<0.016){for(let i=0;i<20;i++)C.step();const F=thrust();I+=F*(C.simTime-t);t=C.simTime;if(C.srbBurning===0&&C.srbMass>0&&burnEnd===null){burnEnd=t;Iend=I;}}
console.log('total impulse',I.toFixed(1),'N·s, propellant',(C.srbMass*1000).toFixed(2),'g, delivered Isp',(I/(C.srbMass*9.81)).toFixed(0),'s; at burnout',(Iend/(C.srbMass*9.81)).toFixed(0),'s, burn',(burnEnd*1e3).toFixed(1),'ms');
