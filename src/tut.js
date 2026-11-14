// ================= FIRST-TIME TUTORIAL =================
// A few coach cards that walk a newcomer through the whole game once: light the engine on the test stand, build a rocket
// around it, launch. Each step moves on by itself when the player actually does the thing (no "Next" to click through),
// and a ring shows what to press. Starts when a first-time player picks "Build an engine" on the title screen; Skip ends it; Controls and Goals can start it again.
const TUT_KEY="throat.tut.v1";
const TUT=[
  {t:"Welcome to THROAT",p:"This is a rocket engine on a test stand. Real gas physics runs here: hydrogen and oxygen flow in, burn, and blast out of the nozzle. Let's fire it, then fly it.",next:"Let's go"},
  {t:"Light the igniter",p:"Press <kbd>2</kbd> (or click the 2 key below) to light the torch igniter: a small flame in the chamber.",at:()=>$("keys"),done:()=>!!keyState[2]||thrust()>800},
  {t:"Open the main valves",p:"Now press <kbd>1</kbd>. Hydrogen and oxygen pour in, hit the flame, and the engine lights.",at:()=>$("keys"),done:()=>thrust()>800},
  {t:"It's running",p:()=>`Your engine makes <b>${(thrust()/1000).toFixed(2)} kN</b> of thrust. Watch the Mach diamonds in the plume. The test stand just recorded these numbers for flight.`,at:()=>$("probe"),side:"right",next:"Next"},
  {t:"Build a rocket",p:"Click <b>Rocket</b> to build a rocket around your engine.",at:()=>$("bLaunch"),done:()=>FLT.vab||FLT.on},
  {t:"The rocket editor",p:"Here's a rocket, ready to fly. Later you can drag parts in from the left to build your own. For now, press <b>Launch</b>.",at:()=>$("vGo"),done:()=>FLT.on},
  {t:"Lift off",p:"Press <kbd>Space</kbd> (or <b>Start countdown</b>) to count down from 10. The engines light at T−3 and the rocket goes at zero. Then steer with <kbd>A</kbd> / <kbd>D</kbd>.",at:()=>$("fCount"),done:()=>FLT.on&&AV&&AV.maxAlt>150},
  {t:"You're flying",p:"Lean east (<kbd>D</kbd>) as you climb. When the fuel runs out press <kbd>Space</kbd> to drop the stage. <kbd>M</kbd> shows the map. Try to reach space, then orbit. Later, <b>Flight school</b> (in Controls, <kbd>H</kbd>) teaches abort, parachutes and the autopilots.",pos:"bl",next:"Got it"}];
// Flight school: a second, optional lesson for the things the first flight doesn't touch. It flies the Super Heavy because
// that's the ready-made rocket with a crew capsule (escape tower + parachutes). "Load it" does the clicks for you.
function loadSls(){if(!FLT.vab&&!FLT.on)$("bLaunch").click();if(FLT.on)$("fBuild").click();
  setTimeout(()=>{const l=$("vLoad");l.value="t:sls";l.onchange();setTimeout(()=>$("vGo").click(),150);},250);}
const cap=()=>AV&&AV.hasCap&&!AV.crashed;
const TUT2=[
  {t:"Flight school",p:"Three things real launches have: an <b>abort</b> that saves the crew, <b>parachutes</b> to come home, and an <b>autopilot</b>. We'll use the Super Heavy: it has a crew capsule on top.",next:"Load it",go:loadSls},
  {t:"Count down",p:"Press <kbd>Space</kbd> (or <b>Start countdown</b>). Let it climb a little.",at:()=>$("fCount"),done:()=>FLT.on&&AV&&AV.maxAlt>300},
  {t:"Abort!",p:"Something's wrong! Press <kbd>Backspace</kbd> (or <b>Abort</b>): the escape tower fires and pulls the capsule off the rocket.",at:()=>$("fAbort"),done:()=>JX&&!!JX.done.abort},
  {t:"Parachutes",p:()=>`Wait for the capsule to slow down, then press <kbd>P</kbd> (or <b>Chutes</b>). They tear above 280 m/s. Now: <b>${AV?Math.round(Math.hypot(AV.vx,AV.vy)):0} m/s</b>.`,at:()=>$("fChute"),done:()=>cap()&&!!AV.chute},
  {t:"Touchdown",p:"The capsule comes down slowly under its chutes. Under 10 m/s on land (or 12 in the sea) is safe. Wait for it…",pos:"bl",done:()=>cap()&&AV.landed},
  {t:"Now the autopilot",side:"right",p:"Press <kbd>R</kbd> to put the rocket back on the pad. Then open the <b>ASCENT</b> tab on the left and press <b>Engage</b>: it counts down and flies to orbit by itself.",at:()=>$("aGo").offsetParent&&$("aGo").getBoundingClientRect().width?$("aGo"):[...document.querySelectorAll(".etab")].find(t=>t.textContent==="ASCENT"&&t.offsetParent),done:()=>AP.mode==="ascent"},
  {t:"Hands off",p:"It turns, throttles back through Max-Q, drops stages and circularises. Touch a key and you take over. In orbit: <b>NODE</b> → <b>To the Moon</b> → <b>Execute</b> flies the Moon burn, and <b>LAND</b> sets you down. Press <kbd>M</kbd> to watch on the map.",pos:"bl",next:"Done"}];
let LES=TUT;
let tutI=-1,tutEl=null,tutRing=null,tutShown=-1;
const thrust=()=>Math.hypot(thrX,thrY);
function tutStart(list){LES=list||TUT;tutI=0;tutShown=-1;if(!tutEl){
    tutEl=document.createElement("div");tutEl.className="tut";document.body.appendChild(tutEl);
    tutRing=document.createElement("div");tutRing.className="tutring";document.body.appendChild(tutRing);}
  tutEl.style.display=tutRing.style.display="";requestAnimationFrame(tutLoop);}
function tutEnd(){tutI=-1;store.set(TUT_KEY,{done:true,t:Date.now()});if(tutEl)tutEl.style.display=tutRing.style.display="none";}
function tutCard(){const s=LES[tutI],n=LES.length;
  tutEl.innerHTML=`<div class="tut-h"><span>${LES===TUT?"Tutorial":"Flight school"} · ${tutI+1} of ${n}</span><button class="tut-x" title="Skip the tutorial">Skip</button></div><b class="tut-t"></b><p></p>
    <div class="tut-f"><span class="tut-dots">${LES.map((_,i)=>`<i class="${i<tutI?"d":i===tutI?"c":""}"></i>`).join("")}</span>${s.next?`<button class="b go tut-n">${s.next}</button>`:`<span class="tut-w">Waiting for you…</span>`}</div>`;
  tutEl.querySelector(".tut-t").textContent=s.t;tutEl.querySelector("p").innerHTML=typeof s.p==="function"?s.p():s.p;
  tutEl.querySelector(".tut-x").onclick=tutEnd;const nb=tutEl.querySelector(".tut-n");if(nb)nb.onclick=()=>{if(s.go)s.go();if(tutI>=LES.length-1)tutEnd();else tutI++;};}
function tutLoop(){
  if(tutI<0)return;requestAnimationFrame(tutLoop);
  while(tutI<LES.length&&LES[tutI].done&&LES[tutI].done())tutI++;   // already did it (or skipped ahead by playing): move on
  if(tutI>=LES.length){tutEnd();return;}
  if(tutShown!==tutI){tutShown=tutI;tutCard();}
  else if(typeof LES[tutI].p==="function"){const pe=tutEl.querySelector("p"),h=LES[tutI].p();if(pe.innerHTML!==h)pe.innerHTML=h;}   // live numbers
  const s=LES[tutI],el=s.at&&s.at(),r=el&&el.offsetParent!==null?el.getBoundingClientRect():null,W=innerWidth,H=innerHeight,narrow=W<700;
  // the ring sits on the thing to press; the card sits next to it (on phones: pinned to the bottom of the screen)
  if(r&&r.width>0){tutRing.style.display="";Object.assign(tutRing.style,{left:r.left-5+"px",top:r.top-5+"px",width:r.width+10+"px",height:r.height+10+"px"});}
  else tutRing.style.display="none";
  const cw=tutEl.offsetWidth,ch=tutEl.offsetHeight;let x,y;
  if(narrow||!r){x=(W-cw)/2;y=narrow?(r&&r.top+r.height/2>H/2?12:H-ch-12):H*0.22;if(!narrow&&s.pos==="bl"){x=12;y=H-ch-90;}}   // phones: keep clear of the target
  else if(s.side==="right"&&r.right+14+cw<W){x=r.right+14;y=r.top;}
  else{x=Math.max(10,Math.min(W-cw-10,r.left+r.width/2-cw/2));y=r.bottom+14+ch<H-8?r.bottom+14:Math.max(10,r.top-ch-14);}
  tutEl.style.left=Math.round(x)+"px";tutEl.style.top=Math.round(y)+"px";}
// first visit: start once the page has settled; anyone who already finished goals before this existed has played: skip it
// first visit: the title screen (title.js) starts the tutorial when the player picks "Build an engine"
$("bTut").onclick=()=>{$("help").classList.remove("show");tutStart();};
$("bTut2").onclick=()=>{$("help").classList.remove("show");tutStart(TUT2);};
window.__tut={start:tutStart,school:()=>tutStart(TUT2),end:tutEnd,get step(){return tutI;}};
