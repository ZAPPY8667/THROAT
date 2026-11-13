// ================= ENGINE LIBRARY =================
// Save what you tested on the stand under a name: liquid engines (sea-level + vacuum thrust and Isp) and solid boosters
// (the same, plus the thrust curve your grain shape made). Saved ones show up in the rocket editor's parts list.
// A part copies the numbers when you place it, so deleting a library entry never breaks a rocket you already built.
const ELIB="throat.englib.v1";
const libAll=()=>store.get(ELIB,[]);
const libGet=id=>libAll().find(e=>e.id===id);
const libNums=e=>({name:e.name,sl:e.sl,vac:e.vac,curve:e.curve});
function libSave(kind,name){const N=kind==="solid"?boosterNums():engineNums();if(N.src!=="tested")return null;
  const L=libAll(),e={id:"e"+Date.now().toString(36),name,kind,sl:{F:N.sl.F,isp:N.sl.isp,est:!!N.sl.est},vac:{F:N.vac.F,isp:N.vac.isp,est:!!N.vac.est},t:Date.now()};
  if(kind==="solid")e.curve=N.curve;
  const i=L.findIndex(x=>x.name===name&&x.kind===kind);if(i>=0){e.id=L[i].id;L[i]=e;}else L.push(e);store.set(ELIB,L.slice(-40));return e;}
const kN=F=>(F/1000).toFixed(2)+" kN";
function numsTxt(N){return`Sea level <b>${kN(N.sl.F)} · ${Math.round(N.sl.isp)} s</b>${N.sl.est?" (est.)":""} &nbsp; Vacuum <b>${kN(N.vac.F)} · ${Math.round(N.vac.isp)} s</b>${N.vac.est?" (est.)":""}`;}
// a tiny picture of a thrust curve: how hard it pushes from lighting (left) to burnout (right)
function curveSvg(c){if(!c||c.length<2)return"";const mx=Math.max(1.3,...c),pts=c.map((v,i)=>`${(i/(c.length-1)*96+2).toFixed(1)},${(26-v/mx*22).toFixed(1)}`).join(" ");
  return`<svg viewBox="0 0 100 28" width="100" height="28" style="vertical-align:middle;background:#0a0e14;border:1px solid #1e2632;border-radius:3px"><polyline points="2,26 ${pts} 98,26" fill="rgba(255,170,40,.25)" stroke="#ffaa28" stroke-width="1.5"/></svg>`;}
// ---------- the dialog ----------
const lbx=document.createElement("div");lbx.className="help";lbx.id="engLib";
lbx.innerHTML=`<div class="card"><h2>Engine library</h2>
  <div class="lsec"><h3>Your engine now</h3><div class="tip" id="lEng"></div>
    <div class="row" style="flex-wrap:nowrap;margin-top:6px"><input id="lEngN" class="lname" maxlength="30" placeholder="Name it, e.g. Hornet"><button class="b go" id="lEngS">Save engine</button></div></div>
  <div class="lsec"><h3>Your last booster burn</h3><div class="tip" id="lSrb"></div>
    <div class="row" style="flex-wrap:nowrap;margin-top:6px"><input id="lSrbN" class="lname" maxlength="30" placeholder="Name it, e.g. Firecracker"><button class="b go" id="lSrbS">Save booster</button></div></div>
  <h3 style="margin-top:12px">Saved</h3><div id="lList" class="llist"></div>
  <p class="tip" style="margin:10px 0 0">Saved engines and boosters appear in the 🚀 Rocket editor's parts list. Strap boosters to the side with a side decoupler. Esc to close.</p></div>`;
$("stage").appendChild(lbx);
function libUI(){const E=engineNums(),B=boosterNums();
  $("lEng").innerHTML=E.src==="tested"?numsTxt(E):"Not tested yet. Run the First engine scenario (2 for the torch, then 1) until the thrust holds steady.";
  $("lEngS").disabled=E.src!=="tested";
  $("lSrb").innerHTML=B.src==="tested"?numsTxt(B)+`<br>Thrust curve ${curveSvg(B.curve)}`:"No full burn yet. Pick “Solid booster”, press 1 and let it burn out.";
  $("lSrbS").disabled=B.src!=="tested";
  const el=$("lList"),L=libAll();el.innerHTML=L.length?"":'<span class="tip">Nothing saved yet.</span>';
  for(const e of L){const r=document.createElement("div");r.className="dl";
    r.innerHTML=`<b></b><small>${e.kind==="solid"?"Booster":"Engine"} · SL ${kN(e.sl.F)} ${Math.round(e.sl.isp)} s · Vac ${kN(e.vac.F)} ${Math.round(e.vac.isp)} s</small>${e.kind==="solid"?curveSvg(e.curve):""}<button class="b danger">Delete</button>`;
    r.querySelector("b").textContent=e.name;r.querySelector(".danger").onclick=()=>{store.set(ELIB,libAll().filter(x=>x.id!==e.id));libUI();};el.appendChild(r);}}
function libSaveUI(kind){const inp=$(kind==="solid"?"lSrbN":"lEngN"),n=(inp.value||"").trim()||(kind==="solid"?"Booster ":"Engine ")+(libAll().filter(x=>x.kind===kind).length+1);
  if(libSave(kind,n)){inp.value="";libUI();if(JX)JX.toast(`<small>Saved to the engine library</small>${kind==="solid"?"🧨":"🔥"} ${n.replace(/</g,"&lt;")}`);}}
$("lEngS").onclick=()=>libSaveUI("liquid");$("lSrbS").onclick=()=>libSaveUI("solid");
for(const[id,k]of[["lEngN","liquid"],["lSrbN","solid"]])$(id).addEventListener("keydown",e=>{if(e.key==="Enter")libSaveUI(k);if(e.key==="Escape")lbx.classList.remove("show");});
$("bLib").onclick=()=>{libUI();lbx.classList.add("show");};
lbx.onclick=e=>{if(e.target===lbx)lbx.classList.remove("show");};
addEventListener("keydown",e=>{if(e.key==="Escape"&&lbx.classList.contains("show")){lbx.classList.remove("show");e.stopImmediatePropagation();}},true);
