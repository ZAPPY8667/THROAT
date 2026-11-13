global.THROAT_SIZE=[160,90];const fs=require('fs');const path=process.argv[2]||require('path').join(__dirname,'..','..','src','core.js');
const M=new module.constructor();M._compile(fs.readFileSync(path,'utf8')+'\nmodule.exports.__s={step,act,atomCheck,added,removed,edgeOut,domainMass,atoms};',path);const C=M.exports.__s;
C.act('scen','engine');console.log('start',JSON.stringify(C.atomCheck().err));C.act('key',2);for(let i=0;i<300;i++)C.step();console.log('torch',JSON.stringify(C.atomCheck().err));
C.act('key',1);for(let i=0;i<800;i++)C.step();const a=C.atomCheck();console.log('run',JSON.stringify(a.err),a.ok);
