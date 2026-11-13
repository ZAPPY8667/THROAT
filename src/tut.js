// ================= FIRST-TIME TUTORIAL =================
// A few coach cards that walk a newcomer through the whole game once: light the engine on the test stand, build a rocket
// around it, launch. Each step moves on by itself when the player actually does the thing (no "Next" to click through),
// and a ring shows what to press. Runs on the first visit; Skip ends it; Controls and Goals can start it again.
const TUT_KEY="throat.tut.v1";
const TUT=[
  {t:"Welcome to THROAT",p:"This is a rocket engine on a test stand. Real gas physics runs here: hydrogen and oxygen flow in, burn, and blast out of the nozzle. Let's fire it, then fly it.",next:"Let's go"},
  {t:"Light the igniter",p:"Press <kbd>2</kbd> (or click the 2 key below) to light the torch igniter: a small flame in the chamber.",at:()=>$("keys"),done:()=>!!keyState[2]||thrust()>800},
  {t:"Open the main valves",p:"Now press <kbd>1</kbd>. Hydrogen and oxygen pour in, hit the flame, and the engine lights.",at:()=>$("keys"),done:()=>thrust()>800},
  {t:"It's running",p:()=>`Your engine makes <b>${(thrust()/1000).toFixed(2)} kN</b> of thrust. Watch the Mach diamonds in the plume. The test stand just recorded these numbers for flight.`,at:()=>$("probe"),side:"right",next:"Next"},
  {t:"Build a rocket",p:"Click <b>Rocket</b> to build a rocket around your engine.",at:()=>$("bLaunch"),done:()=>FLT.vab||FLT.on},
  {t:"The rocket editor",p:"Here's a rocket, ready to fly. Later you can drag parts in from the left to build your own. For now, press <b>Launch</b>.",at:()=>$("vGo"),done:()=>FLT.on},
  {t:"Lift off",p:"Press <kbd>Z</kbd> for full throttle. Steer with <kbd>A</kbd> / <kbd>D</kbd>.",at:()=>$("fThr"),done:()=>FLT.on&&AV&&AV.maxAlt>150},
  {t:"You're flying",p:"Lean east (<kbd>D</kbd>) as you climb. When the fuel runs out press <kbd>Space</kbd> to drop the stage. <kbd>M</kbd> shows the map. Try to reach space, then orbit. 🏆 Goals has more to try.",pos:"bl",next:"Got it"}];
let tutI=-1,tutEl=null,tutRing=null,tutShown=-1;
const thrust=()=>Math.hypot(thrX,thrY);
function tutStart(){tutI=0;tutShown=-1;if(!tutEl){
    tutEl=document.createElement("div");tutEl.className="tut";document.body.appendChild(tutEl);
    tutRing=document.createElement("div");tutRing.className="tutring";document.body.appendChild(tutRing);}
  tutEl.style.display=tutRing.style.display="";requestAnimationFrame(tutLoop);}
function tutEnd(){tutI=-1;store.set(TUT_KEY,{done:true,t:Date.now()});if(tutEl)tutEl.style.display=tutRing.style.display="none";}
function tutCard(){const s=TUT[tutI],n=TUT.length;
  tutEl.innerHTML=`<div class="tut-h"><span>Tutorial · ${tutI+1} of ${n}</span><button class="tut-x" title="Skip the tutorial">Skip</button></div><b class="tut-t"></b><p></p>
    <div class="tut-f"><span class="tut-dots">${TUT.map((_,i)=>`<i class="${i<tutI?"d":i===tutI?"c":""}"></i>`).join("")}</span>${s.next?`<button class="b go tut-n">${s.next}</button>`:`<span class="tut-w">Waiting for you…</span>`}</div>`;
  tutEl.querySelector(".tut-t").textContent=s.t;tutEl.querySelector("p").innerHTML=typeof s.p==="function"?s.p():s.p;
  tutEl.querySelector(".tut-x").onclick=tutEnd;const nb=tutEl.querySelector(".tut-n");if(nb)nb.onclick=()=>{if(tutI>=TUT.length-1)tutEnd();else tutI++;};}
function tutLoop(){
  if(tutI<0)return;requestAnimationFrame(tutLoop);
  while(tutI<TUT.length&&TUT[tutI].done&&TUT[tutI].done())tutI++;   // already did it (or skipped ahead by playing): move on
  if(tutI>=TUT.length){tutEnd();return;}
  if(tutShown!==tutI){tutShown=tutI;tutCard();}
  else if(typeof TUT[tutI].p==="function"){const pe=tutEl.querySelector("p"),h=TUT[tutI].p();if(pe.innerHTML!==h)pe.innerHTML=h;}   // live numbers
  const s=TUT[tutI],el=s.at&&s.at(),r=el&&el.offsetParent!==null?el.getBoundingClientRect():null,W=innerWidth,H=innerHeight,narrow=W<700;
  // the ring sits on the thing to press; the card sits next to it (on phones: pinned to the bottom of the screen)
  if(r&&r.width>0){tutRing.style.display="";Object.assign(tutRing.style,{left:r.left-5+"px",top:r.top-5+"px",width:r.width+10+"px",height:r.height+10+"px"});}
  else tutRing.style.display="none";
  const cw=tutEl.offsetWidth,ch=tutEl.offsetHeight;let x,y;
  if(narrow||!r){x=(W-cw)/2;y=narrow?(r&&r.top+r.height/2>H/2?12:H-ch-12):H*0.22;if(!narrow&&s.pos==="bl"){x=12;y=H-ch-90;}}   // phones: keep clear of the target
  else if(s.side==="right"&&r.right+14+cw<W){x=r.right+14;y=r.top;}
  else{x=Math.max(10,Math.min(W-cw-10,r.left+r.width/2-cw/2));y=r.bottom+14+ch<H-8?r.bottom+14:Math.max(10,r.top-ch-14);}
  tutEl.style.left=Math.round(x)+"px";tutEl.style.top=Math.round(y)+"px";}
// first visit: start once the page has settled; anyone who already finished goals before this existed has played: skip it
setTimeout(()=>{const st=store.get(TUT_KEY,null);if(!st&&!(JX&&Object.keys(JX.done).length>2))tutStart();},700);
$("bTut").onclick=()=>{$("help").classList.remove("show");tutStart();};
window.__tut={start:tutStart,end:tutEnd,get step(){return tutI;}};
