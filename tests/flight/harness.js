// Node harness: runs parts.js + flight.js physics without a browser
const fs=require('fs');
const el=()=>new Proxy({style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},dataset:{},getContext:()=>new Proxy({},{get:()=>()=>({addColorStop(){}})}),getBoundingClientRect:()=>({width:1280,height:720,left:0,top:0}),addEventListener(){},querySelectorAll:()=>[],appendChild(){}},{get:(t,k)=>k in t?t[k]:(k==='value'?0:undefined),set:(t,k,v)=>{t[k]=v;return true}});
const els={};global.$=id=>els[id]||(els[id]=el());
global.store={get:(k,d)=>d,set(){}};global.S={paused:false};global.cfg=()=>{};global.simTime=0;global.atmo=true;global.fmt=n=>Math.round(n).toLocaleString();
global.addEventListener=()=>{};global.requestAnimationFrame=()=>{};global.performance={now:()=>0};global.devicePixelRatio=1;global.document={activeElement:null,createElement:()=>el(),elementFromPoint:()=>null};global.window=global;
global.FLT={on:false,vab:false};global._rt=null;global._rb=null;global.vAn=null;global.openVab=()=>{};global.partId=1;
let src=['parts.js','orbit.js','world.js','flight.js','autopilot.js'].map(n=>fs.readFileSync(require('path').join(__dirname,'..','..','src',n),'utf8')).join('\n')+'\nfunction mapOpen(){}function mapFocus(){}function mapWheel(){}function renderMap(){}';
src+='\nmodule.exports={dockCheck,dockFollow,undock,portWorld,freePorts,mkPart,contactPts,PT_ORDER,partMass,BLD,bldAt,PAD2,tpl,oldScale,upscaleOld,analyze,mkVessel,stepV,doStage,startFlight,orbitOf,get VS(){return VS},get AV(){return AV},set AV(v){AV=v},PR,MU,engineNums,derive,padDist,setEN:e=>{EN=e},railStep,moonAt,BOD,SOI,get FT(){return FT},set FT(x){FT=x},predict,kepler,sasTarget,SAS_MODES,RCS_MONO,RCS_F,terrH,groundAt,biomeAt,hourAt,AP,apEngage,apStep,planNode,apOff,abort,chutes,jettisonLes,lesCheck,mkPart,get wx(){return wx}};';
const M=new module.constructor();M.paths=module.paths;M._compile(src,require('path').join(__dirname,'bundle.js'));module.exports=M.exports;
