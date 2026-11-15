// ================= TECH TREE (v1.38) =================
// Wyatt's idea: you don't get every part at once. You start with a small kit (probe, nose cone, tank, the Wren, a fin, a
// decoupler, and the engine and booster you built yourself on the test stand) and earn science by doing things for the first
// time: every goal is a "first" worth some science (juice.js, GOALS). Spend it in the tree to unlock more parts. THROAT stays
// a sandbox: one switch, "Unlock everything", opens the whole catalogue (and that's what the test stand's own engine always is).
// Saved in throat.tech.v1: {got: [node ids], all: true/false}. Science isn't stored: it's worked out from the goals done.
const TECH_KEY="throat.tech.v1";
function techSt(){if(!techSt.s){techSt.s=store.get(TECH_KEY,{got:[],all:false});if(!Array.isArray(techSt.s.got))techSt.s.got=[];}return techSt.s;}
function techSave(){store.set(TECH_KEY,techSt());}
// what you start with (palette ids); your own engine and booster are always yours
function techStart(){return["probe","nose","tank","engine:stand","engine:wren","dec","fin","srb:stand"];}
// the tree: six lines of nodes, each needing the one above it. col: which line; need: the node before it
function techNodes(){return[
  {id:"work",  col:0,name:"Workhorse engines",cost:5, parts:["engine:mule","adapter"],          desc:"A stronger sea-level engine, and adapters to change the width of a stack."},
  {id:"heavy", col:0,name:"Heavy lift",       cost:15,parts:["engine:bison","engine:stand:4"],need:"work",desc:"A big first-stage engine, and clusters: several engines under one plate."},
  {id:"ch4",   col:0,name:"Methane",          cost:25,parts:["engine:condor","engine:gnat"],  need:"heavy",desc:"The strongest engine there is, and a tiny one for landers."},
  {id:"vac",   col:1,name:"Space engines",    cost:15,parts:["engine:vac"],                   need:"work",desc:"A huge bell made for vacuum: the best Isp of the chemical engines."},
  {id:"spike", col:1,name:"Aerospike",        cost:25,parts:["engine:spike"],                 need:"vac",desc:"Works almost as well at sea level as in space."},
  {id:"atom",  col:1,name:"Nuclear",          cost:50,parts:["engine:atom"],                  need:"spike",desc:"Twice the Isp of anything else. For long trips in space."},
  {id:"srb",   col:2,name:"Strap-on boosters",cost:10,parts:["srb:thumper","sdec"],                     desc:"A ready-made booster and side decouplers to hang boosters on a core."},
  {id:"srb2",  col:2,name:"Booster family",   cost:25,parts:["srb:sprinter","srb:longhorn"],  need:"srb",desc:"A short fierce booster and a long steady one."},
  {id:"land",  col:3,name:"Landing",          cost:10,parts:["leg","fin:grid"],                         desc:"Landing legs, and grid fins to steer a falling stage."},
  {id:"lander",col:3,name:"Landers",          cost:15,parts:["tank:ball","probe:cabin"],      need:"land",desc:"Fuel spheres and a crew cabin: build a Moon lander."},
  {id:"plane", col:3,name:"Spaceplanes",      cost:20,parts:["fin:wing","nose:cockpit"],      need:"land",desc:"Wings and a cockpit."},
  {id:"crew",  col:4,name:"Crew",             cost:20,parts:["capsule","les","shield"],                 desc:"A crew capsule with parachutes, its escape tower, and heat-shield plates."},
  {id:"crew2", col:4,name:"Big capsule",      cost:35,parts:["capsule:dragon"],               need:"crew",desc:"A wider, rounder capsule."},
  {id:"ctrl",  col:5,name:"Control",          cost:10,parts:["rcs","light"],                            desc:"RCS thrusters to turn and nudge in space, and floodlights for the dark."},
  {id:"power", col:5,name:"Power",            cost:15,parts:["solar"],                        need:"ctrl",desc:"Solar panels that open in space."}];}
const techScience=()=>JX?JX.science():0;
const techSpent=()=>techNodes().reduce((a,n)=>a+(techSt().got.includes(n.id)?n.cost:0),0);
const techLeft=()=>Math.max(0,techScience()-techSpent());
// can this palette id be used? (saved-library parts are your own, so always)
function techOK(id){const st=techSt();if(st.all||!JX||id.startsWith("lib:")||techStart().includes(id))return true;
  if(id.startsWith("kit:")){const B=KITS[id.slice(4)];if(!B)return true;const pid=partId,L=B.build();partId=pid;return L.every(p=>techOK(partKey(p)));}   // a kit: all its parts
  return techNodes().some(n=>st.got.includes(n.id)&&n.parts.includes(id));}
function techNodeOf(id){return techNodes().find(n=>n.parts.includes(id));}
// a placed part's palette id: "engine:mule", "srb:thumper", "fin:grid", "tank"…
function partKey(p){if(p.t==="engine")return p.e==="lib"?"lib:x":"engine:"+(p.e||"stand");if(p.t==="srb")return p.b==="lib"?"lib:x":"srb:"+(p.b||"stand");return p.v?p.t+":"+p.v:p.t;}
// the parts of a rocket you haven't unlocked yet (names, once each). Clusters also need Heavy lift.
function techMissing(ps){const out=new Set();for(const p of ps){const k=partKey(p);if(!techOK(k))out.add(partName(p));if(p.t==="engine"&&p.k>1&&!techOK("engine:stand:4"))out.add("Engine clusters");}return[...out];}
function techUnlock(id){const n=techNodes().find(q=>q.id===id),st=techSt();if(!n||st.got.includes(id)||n.need&&!st.got.includes(n.need)||techLeft()<n.cost)return false;
  st.got.push(id);techSave();if(JX){JX.toast(`<small>Unlocked · −${n.cost} science</small>🔓 ${n.name}`);JX.snd.chime();}techChanged();return true;}
// called when science or unlocks change: refresh the editor's palette, its Tech button and the open tree
function techChanged(){techBtn();if(typeof vab!=="undefined"&&vab.classList.contains("show")){vPalUI();vInspUI();}if(techEl&&techEl.classList.contains("show"))techList();}
function techBtn(){const b=$("vTech");if(!b)return;const st=techSt(),can=!st.all&&techNodes().some(n=>!st.got.includes(n.id)&&(!n.need||st.got.includes(n.need))&&n.cost<=techLeft());
  b.innerHTML=ico("flask")+`<span>${st.all?"All parts":techLeft()+" science"}</span>`;b.classList.toggle("ping",can);}   // a red dot when something can be unlocked
// ---------- the tree card ----------
let techEl=null;
function techOpen(why){if(!techEl){techEl=document.createElement("div");techEl.className="help tech";
    techEl.innerHTML=`<div class="card"><h2>Tech tree</h2><div class="tsci"></div><div class="tmsg"></div><div class="tgrid"></div>
      <div class="row" style="margin-top:12px;align-items:center"><label class="tall"><input type="checkbox" id="tAll"> Unlock everything (sandbox)</label><span class="tip" style="margin-left:auto">Earn science by doing goals for the first time (🏆). Esc to close.</span></div></div>`;
    document.body.appendChild(techEl);techEl.onclick=e=>{if(e.target===techEl)techEl.classList.remove("show");};
    techEl.querySelector("#tAll").onchange=e=>{techSt().all=e.target.checked;techSave();techChanged();};
    addEventListener("keydown",e=>{if(e.key==="Escape"&&techEl.classList.contains("show")){techEl.classList.remove("show");e.stopImmediatePropagation();}},true);}
  const m=techEl.querySelector(".tmsg");m.textContent=why||"";m.style.display=why?"":"none";techList();techEl.classList.add("show");}
function techList(){const st=techSt(),left=techLeft(),g=techEl.querySelector(".tgrid");techEl.querySelector("#tAll").checked=!!st.all;
  techEl.querySelector(".tsci").innerHTML=st.all?`<b>Everything is unlocked</b> <span class="tip">(sandbox). Untick the box below to go back to earning parts.</span>`:
    `<b>${left}</b> science to spend <span class="tip">· ${techScience()} earned from ${JX?JX.GOALS.filter(q=>JX.done[q[0]]).length:0} goals · you started with: probe, nose cone, tank, Wren, fin, decoupler, your own engine and booster</span>`;
  g.innerHTML="";const cols=[[],[],[],[],[],[]];for(const n of techNodes())cols[n.col].push(n);
  for(const col of cols){const c=document.createElement("div");c.className="tcol";g.appendChild(c);
    for(const n of col){const have=st.all||st.got.includes(n.id),open=!n.need||st.got.includes(n.need)||st.all,d=document.createElement("div");
      d.className="tnode"+(have?" have":open?(n.cost<=left?" can":""):" shut");
      d.innerHTML=`<b></b><span class="tip"></span><div class="ticons"></div><div class="tfoot"></div>`;d.querySelector("b").textContent=n.name;d.querySelector(".tip").textContent=n.desc;
      for(const id of n.parts){const ic=partIcon(id);ic.title=VARS[id]?VARS[id].name:id.startsWith("engine:")?(id.split(":")[2]?"Engine cluster":ENG[id.split(":")[1]].name):id.startsWith("srb:")?BOOST[id.slice(4)].name:PT[id].name;d.querySelector(".ticons").appendChild(ic);}
      const f=d.querySelector(".tfoot");
      if(have)f.innerHTML=`<span class="ok">✓ Unlocked</span>`;
      else if(!open)f.innerHTML=`<span class="tip">Needs ${techNodes().find(q=>q.id===n.need).name}</span>`;
      else{const b=document.createElement("button");b.className="b"+(n.cost<=left?" go":"");b.disabled=n.cost>left;b.innerHTML=`Unlock · ${n.cost}`;b.onclick=()=>techUnlock(n.id);f.appendChild(b);}
      c.appendChild(d);}}}
$("vTech").onclick=()=>techOpen();
