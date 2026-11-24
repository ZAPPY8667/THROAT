// STAGING (v1.47): rockets staged in the editor's STAGES panel (p.sg on engines, decouplers and fairings). Engines only light
// in their own stage, each Space sets off the next stage number, and a stage with no decoupler just lights engines or opens a fairing.
const F=require('./harness.js');let bad=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)bad++;};
const isD=p=>p.t==="dec"||p.t==="sdec",isE=p=>p.t==="engine"||p.t==="srb";
// the editor's defaults: stack decouplers by height from stage 2 up (side decouplers level with each other share one),
// engines with the closest stack decoupler under them, everything else at launch
function stageIt(ps){const D=ps.filter(isD).sort((a,b)=>a.y-b.y),lv=[];for(const d of D){const l=lv.find(l=>Math.abs(l.y-d.y)<3&&l.t===d.t);if(l)d.sg=l.sg;else{d.sg=lv.length+2;lv.push({y:d.y,t:d.t,sg:d.sg});}}
  for(const e of ps.filter(isE)){let best=null;for(const d of D)if(d.t==="dec"&&d.y+d.h<=e.y+e.h/2&&Math.abs(d.x-e.x)<d.w/2&&(!best||d.y>best.y))best=d;e.sg=best?best.sg:1;}return ps;}
const lit=()=>F.AV.eng.map(i=>F.AV.ps[i].sg);
// 1. heavy: boosters, then core, then upper stage
{const ps=stageIt(F.tpl('heavy'));F.startFlight(ps,'heavy');ok(F.AV.stg===1,'staged rocket starts in stage 1');
  ok(lit().length&&lit().every(s=>s===1),'only launch engines are on the pad: '+JSON.stringify(lit()));
  const n0=F.VS.length;F.doStage();ok(F.AV.stg===2&&F.VS.length>n0,'first Space drops the boosters (stage '+F.AV.stg+')');
  F.doStage();ok(F.AV.stg===3&&lit().includes(3),'second Space drops the core and lights the upper stage: '+JSON.stringify(lit()));
  const s=F.AV.stg;F.doStage();ok(F.AV.stg===s,'nothing left to stage leaves it alone');}
// 2. the upper engine in a stage of its own: the core drops first, the engine lights on the next Space
{const ps=stageIt(F.tpl('heavy')),top=Math.max(...ps.filter(isD).map(p=>p.sg));for(const p of ps)if(isE(p)&&p.sg===top)p.sg=top+1;
  F.startFlight(ps,'heavy');F.doStage();F.doStage();ok(!lit().includes(top+1),'upper engine still off after the core drops');
  const v=F.VS.length;F.doStage();ok(lit().includes(top+1)&&F.VS.length===v,'ignition-only stage lights it without dropping anything');}
// 3. a fairing in its own stage opens on Space, before the payload decoupler
{const ps=stageIt(F.tpl('comsat')),fa=ps.find(p=>p.t==="fair");if(!fa)ok(false,'comsat has a fairing');else{
  const top=Math.max(...ps.filter(isD).map(p=>p.sg));for(const p of ps)if(p.sg!=null&&p.sg>=top)p.sg++;fa.sg=top;
  F.startFlight(ps,'comsat');F.doStage();const f=F.AV.ps.find(p=>p.t==="fair");ok(f&&f.open&&F.AV.stg===top,'Space opens the fairing (stage '+F.AV.stg+')');
  const n=F.VS.length;F.doStage();ok(F.VS.length>n||F.AV.stg>top,'next Space fires the payload decoupler');}}
// 4. the autopilot flies staged rockets to orbit (heavy+: its upper engine lights in a stage of its own)
const split=ps=>{const top=Math.max(...ps.filter(isD).map(p=>p.sg));for(const p of ps)if(isE(p)&&p.sg===top)p.sg=top+1;return ps;};
for(const n of ['sparrow','heavy','sls','heavy+']){const ps=stageIt(F.tpl(n.replace('+','')));F.startFlight(n.endsWith('+')?split(ps):ps,n);F.apEngage('ascent',{alt:70000});let t=0;const dt=0.01;
  while(t<2400&&F.AP.mode){F.apStep(dt);for(const v of F.VS)F.stepV(v,dt,0);t+=dt;if(F.AV.crashed)break;}
  const o=F.orbitOf(F.AV);ok(!F.AV.crashed&&!o.esc&&o.pe>40e3,`${n} staged: autopilot to orbit in ${t.toFixed(0)} s, Pe ${(o.pe/1e3).toFixed(1)} km, stage ${F.AV.stg}`);}
if(bad){console.log(bad+' failed');process.exit(1);}console.log('staging ok');
