// GPU vs CPU: the same engines run on the graphics card (WebGPU, in headless Chrome) must give the same thrust, Isp and
// chamber temperature as the CPU core (tests/core/fuels.js), with atoms balanced. Usage: node tests/gpu/compare.js [scen...]
// Headless Chrome has no real GPU here, so WebGPU runs on SwiftShader (a GPU emulated on the CPU): this checks the
// physics, not the speed.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),os=require('os');
const src=f=>fs.readFileSync(path.join(__dirname,'..','..','src',f),'utf8');
const SZ=[160,90];
const page=`<!doctype html><meta charset=utf-8><script>var THROAT_SIZE=${JSON.stringify(SZ)};</script><script>${src('core.js')}</script><script>${src('gpu.js')}</script>
<script>
function thrust(){let fx=0;const A=DX*DX;for(let k=0;k<NC;k++){if(wall[k])continue;const x=k%NX,pg=pres(k)-pAmb;if(x>0&&wall[k-1])fx-=pg*A;if(x<NX-1&&wall[k+1])fx+=pg*A;}return -fx;}
const fed=()=>{let m=0;for(let s=0;s<NS;s++)m+=added[s]-removed[s];return m;};
async function runG(n,chunk){while(n>0){const c=Math.min(chunk,n);await GPU.run(c);n-=c;}}
async function engine(scen){
  act('scen',scen);GPU.upload();
  act('key',2);GPU.upload();await runG(300,50);act('key',1);GPU.upload();await runG(1500,100);
  let F=0,n=0,T=0;const m0=fed(),t0=simTime;
  for(let it=0;it<20;it++){await runG(40,40);F+=thrust();T+=temp(45*NX+30);n++;}
  const md=(fed()-m0)/(simTime-t0),Fa=F/n,a=atomCheck();
  return {scen,thrust:Fa/1000,isp:Fa/(md*9.80665),T:T/n,P:pres(45*NX+30)/PSI_PA,atoms:a.ok,err:a.err.map(e=>+e.toExponential(1))};
}
async function srbRun(){
  act('scen','srb');GPU.upload();act('key',1);GPU.upload();
  let peak=0,steps=0;const t0=performance.now();
  while(steps<6000){await GPU.run(50);steps+=50;const F=thrust();if(F>peak)peak=F;if(steps>600&&!srbBurning&&!wall.includes(4))break;}
  let left=0;for(let k=0;k<NC;k++)if(wall[k]===4)left++;
  return {scen:'srb',peakKN:peak/1000,steps,simMs:simTime*1000,propLeft:left,atoms:atomCheck().ok,srbMass:srbMass*1000};
}
window.go=async(list)=>{const ok=await GPU.init();if(!ok)return {err:GPU.err};const out=[];
  for(const s of list){const t=performance.now();const r=s==='srb'?await srbRun():await engine(s);r.sec=+((performance.now()-t)/1000).toFixed(1);out.push(r);}
  return out;};
</script>`;
(async()=>{
  const f=path.join(os.tmpdir(),'throat_gpu_cmp.html');fs.writeFileSync(f,page);
  const b=await chromium.launch({args:['--enable-unsafe-webgpu']});const p=await b.newPage();
  p.on('console',m=>{if(m.type()==='error')console.log('console:',m.text());});p.on('pageerror',e=>console.log('pageerror:',e.message));
  await p.goto('file://'+f);
  const list=process.argv.slice(2).length?process.argv.slice(2):['engine','methane','kerosene','srb'];
  const r=await p.evaluate(l=>window.go(l),list);
  if(r.err){console.log('GPU init failed:',r.err);process.exitCode=1;}
  else for(const x of r)console.log(JSON.stringify(x));
  await b.close();
})();
