// time the physics core on the default engine (L world), with the engine running
global.THROAT_SIZE=[240,135];const fs=require('fs');const path=process.argv[2]||require('path').join(__dirname,'..','..','src','core.js');
const M=new module.constructor();M._compile(fs.readFileSync(path,'utf8')+'\nmodule.exports.__s={step,act,SCENS,keyState,get simTime(){return simTime},atomCheck,toggleKey};',path);const C=M.exports.__s;
C.act('scen','engine');C.act('key',2);for(let i=0;i<400;i++)C.step();C.act('key',1);for(let i=0;i<2000;i++)C.step();
const t0=Date.now();let n=0;while(Date.now()-t0<6000){C.step();n++;}
console.log('steps/s',(n/((Date.now()-t0)/1000)).toFixed(0),'atoms ok',C.atomCheck().ok);
