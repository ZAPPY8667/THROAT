// Quick GPU check for every push (~1 min): two scenarios with no randomness run 300 steps on the CPU (Node) and on the GPU
// (WebGPU in headless Chrome, on SwiftShader when there's no real GPU). The overall numbers must agree:
//   two   — a divider valve opens between 35 psi nitrogen and 6 psi oxygen: shock waves, mixing (no burning)
//   spark — a sealed box of hydrogen + oxygen, sparked: the flame front, burning, heat loss
// (mixing is worked out a little differently on the GPU, all cells at once, and numbers are 32-bit, so not bit-identical.)
// The full engines (thrust, Isp) are in tests/gpu/compare.js (slow on SwiftShader: ~4 min each).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),os=require('os');
const src=f=>fs.readFileSync(path.join(__dirname,'..','..','src',f),'utf8');
const SZ=[160,90],STEPS=300;
// the same measurements on both sides
const MEASURE=`function measure(){let E=0,pmax=0,umax=0,m=0,n=0,ps=0;
  for(let k=0;k<NC;k++){if(wall[k])continue;const p=pres(k);E+=En[k];m+=rho[k];ps+=p;n++;if(p>pmax)pmax=p;const u=Math.hypot(mx[k],my[k])/rho[k];if(u>umax)umax=u;}
  return {pMean:ps/n,pMax:pmax,uMax:umax,E:E,mass:m,water:waterMade*1e6,simMs:simTime*1000,atoms:atomCheck().ok};}`;
function cpu(scen){
  global.THROAT_SIZE=SZ;const M=new module.constructor();
  M._compile(src('core.js')+'\n'+MEASURE+'\nmodule.exports.__s={step,act,measure,runSparks};','c');const C=M.exports.__s;
  C.act('scen',scen);if(scen==='two')C.act('key',1);for(let i=0;i<STEPS;i++){if(i%4===0)C.runSparks();C.step();}return C.measure();   // the glue fires sparks every 4 steps
}
const page=`<!doctype html><meta charset=utf-8><script>var THROAT_SIZE=${JSON.stringify(SZ)};</script><script>${src('core.js')}</script><script>${src('gpu.js')}</script>
<script>${MEASURE}
window.go=async(list)=>{if(!await GPU.init())return {err:GPU.err};const out={};
  for(const s of list){act('scen',s);if(s==='two')act('key',1);GPU.upload();let n=${STEPS};while(n>0){const c=Math.min(n,s==='spark'?4:50);await GPU.run(c);n-=c;}out[s]=measure();}
  return out;};</script>`;
(async()=>{
  const list=['two','spark'];
  const f=path.join(os.tmpdir(),'throat_gpu_quick.html');fs.writeFileSync(f,page);
  let b;try{b=await chromium.launch({args:['--enable-unsafe-webgpu']});}catch(e){console.log('skipped: no Chrome');return;}
  const p=await b.newPage();p.on('pageerror',e=>console.log('pageerror:',e.message));
  await p.goto('file://'+f);
  const g=await p.evaluate(l=>window.go(l),list);await b.close();
  if(g.err){console.log('skipped: no WebGPU here ('+g.err+')');return;}
  let ok=true;
  const near=(a,b,tol)=>Math.abs(a-b)<=tol*Math.max(Math.abs(a),Math.abs(b),1e-9);
  for(const s of list){const c=cpu(s),q=g[s];
    const checks=[['pMean',0.02],['pMax',0.15],['uMax',0.15],['E',0.02],['mass',0.002],['simMs',0.05]].concat(s==='spark'?[['water',0.15]]:[]);
    const bad=checks.filter(([k,t])=>!near(c[k],q[k],t)).map(([k])=>k);if(!q.atoms)bad.push('atoms');
    if(bad.length)ok=false;
    console.log(`${s.padEnd(5)} ${bad.length?'DIFFERS ('+bad.join(', ')+')':'ok'}  `+checks.map(([k])=>`${k} ${(+c[k]).toPrecision(4)}/${(+q[k]).toPrecision(4)}`).join('  ')+`  atoms ${q.atoms}`);}
  console.log(ok?'GPU matches CPU':'GPU DIFFERS from CPU');if(!ok)process.exitCode=1;
})();
