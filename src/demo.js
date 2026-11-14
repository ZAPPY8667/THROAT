// ================= DEMO: "WATCH A LAUNCH" =================
// One click and the game shows itself off: the Super Heavy counts down, lifts off, drops its boosters and core, reaches orbit,
// then plans and flies the burn to the Moon, while a caption says in plain words what's happening. Everything is flown by the
// real autopilot and physics (nothing is pre-recorded). Time speeds up on the long quiet parts. Any key, or "Take control",
// hands the rocket to the player wherever it is.
const DEMO={on:false,ph:"",t:0,el:null,zoom:1,said:{}};
function demoStart(){
  if(FLT.vab&&typeof closeVab==="function")closeVab(true);
  startFlight(tpl("sls"),"Super Heavy");
  Object.assign(DEMO,{on:true,ph:"pad",t:0,zoom:1,said:{},tz:null,close:false});msgT=0;
  if(JX)JX.quiet=true;   // watching isn't doing: no goals are ticked off during the demo
  if(!DEMO.el){const d=document.createElement("div");d.className="demo";
    d.innerHTML='<span class="demo-tag">Demo</span><p></p><div class="row"><button class="b go" data-ic="play">Take control</button><button class="b">Stop demo</button></div>';
    $("flight").appendChild(d);DEMO.el=d;const[bt,bs]=d.querySelectorAll("button");
    bt.onclick=()=>demoStop("You have the controls. The autopilot tabs on the left (ASCENT, NODE, LAND) can fly it again.");
    bs.onclick=()=>{demoStop();endFlight();};
    if(typeof ico==="function")d.querySelectorAll("[data-ic]").forEach(b=>{b.innerHTML=ico(b.dataset.ic)+b.innerHTML;});}
  DEMO.el.style.display="";dSay("The Super Heavy: 91 m tall, 2,100 tonnes. A crew capsule sits on top, under its escape tower. Nobody is touching the controls: the autopilot flies everything from here.");}
function demoStop(why){if(JX)JX.quiet=false;if(!DEMO.el)return;const was=DEMO.on;DEMO.on=false;DEMO.el.style.display="none";
  // hand over as it is: engines keep burning, the heading hold keeps it pointing where it was (apOff would cut the throttle)
  if(was&&AP.mode){AP.mode=null;AP.ph="";if(AV){AV.sas="stab";AV.hold=AV.phi;}}
  if(was){warp=1;warpTo=null;zoomF=1;if(why){msg=why;msgT=6;}}}
const dSay=t=>{if(DEMO.el)DEMO.el.querySelector("p").textContent=t;};
const dOnce=(k,f)=>{if(!DEMO.said[k]){DEMO.said[k]=1;f();}};
// called once per frame from flightFrame (real seconds)
function demoStep(dt){if(!DEMO.on||!AV)return;DEMO.t+=dt;const v=AV,P=DEMO.ph;
  if(v.crashed){dSay("Something went wrong and the rocket was lost. Press R to try again, or Stop demo.");DEMO.on=false;return;}
  // the camera: closer on the pad, and for a few seconds after each separation, then back to the normal tracking shot
  // close-ups: the tracking camera pulls far back to keep the ground in view; a close-up undoes that so the rocket fills ~a third
  // of the screen (the pull-back is height above ground ÷ (1.43 × rocket height), see the camera in flight.js)
  const hAG=Math.hypot(v.x,v.y)-BOD[v.body].R,close=Math.max(1,hAG/(1.43*Math.max(2.4,v.H)))*0.8,want=DEMO.close?close:DEMO.zoom;
  zoomF=Math.exp(Math.log(zoomF)+(Math.log(want)-Math.log(zoomF))*Math.min(1,dt*1.2));
  const seps=EV.filter(e=>e.k==="sep"&&e.t!=null).length;
  if(P==="pad"){DEMO.zoom=1.4;if(DEMO.t>5){apEngage("ascent",{alt:70000});DEMO.ph="count";
      dSay("Countdown. At T−5 water floods the pad to soak up the sound; at T−3 the four core engines light while clamps hold the rocket down.");}}
  else if(P==="count"){if(CD.s==="go"){DEMO.ph="up";DEMO.t=0;DEMO.zoom=1;dSay("Lift-off! The two side boosters burn solid fuel: once lit they can't be throttled or stopped.");}}
  else if(P==="up"){
    if(DEMO.t>14&&warp<4&&!DEMO.said.w4){DEMO.said.w4=1;warp=4;dSay("Time ×4 from here. The autopilot leans the rocket east as it climbs: going sideways fast is what makes an orbit.");}
    if(said.maxq)dOnce("q",()=>{DEMO.close=true;DEMO.tz=DEMO.t;dSay("Max-Q: the air pushes hardest on the rocket here. The autopilot eases off the throttle until it's through.");});
    if(seps>=1)dOnce("s1",()=>{DEMO.close=true;warp=1;DEMO.tz=DEMO.t;dSay("Booster separation: the empty boosters fall away. Throwing away dead weight is why rockets have stages.");});
    if(seps>=2)dOnce("s2",()=>{DEMO.close=true;warp=1;DEMO.tz=DEMO.t;dSay("Core separation: the big orange stage is empty too. The upper stage's vacuum engine takes over: it has a huge bell made for space.");});
    if(DEMO.tz!=null&&DEMO.t-DEMO.tz>8){DEMO.tz=null;DEMO.close=false;warp=4;}
    if(said.space)dOnce("sp",()=>dSay("Space! Above 40 km there's no air left. The escape tower isn't needed any more, so it flew off."));
    if(said.orbit||AP.lastFor==="ascent"&&!AP.mode){DEMO.ph="orbit";DEMO.t=0;warp=1;DEMO.zoom=1;
      dSay("Orbit: going 3 km/s sideways, it falls around the Earth and keeps missing the ground. Next stop: the Moon.");}}
  else if(P==="orbit"){
    if(DEMO.t>6&&!DEMO.said.plan){DEMO.said.plan=1;if(AP.mode)apOff("done");const n=planNode("moon");
      if(!n){dSay("No Moon transfer this lap, so the demo stops here. Try the NODE tab yourself!");DEMO.on=false;return;}
      AP.node=n;mapView=true;mapOpen();apEngage("node");DEMO.ph="burn";
      dSay("The map. The dashed red line is the planned burn to the Moon. The autopilot warps to the right moment, points the engine and burns.");}}
  else if(P==="burn"){if(v.F>0&&warp<4)warp=4;   // the long burn, sped up (×4 is the most the game allows with an engine on)
    if(!AP.mode){DEMO.ph="coast";DEMO.t=0;dSay("On the way. In real life this takes three days; here, time warp. Watch the path bend as the Moon's gravity grabs it.");}}
  else if(P==="coast"){if(DEMO.t>3&&!DEMO.said.wm){DEMO.said.wm=1;   // warp to just before the Moon's gravity takes over
      const Pr=v.body===0?predict(v.body,v.x,v.y,v.vx,v.vy,FT):null,mk=Pr&&Pr.marks.find(m=>m.k==="enter");if(mk)warpToEventAt(FT+mk.t-60,"the Moon");}
    if(v.body===1){DEMO.ph="end";warp=1;warpTo=null;mapView=false;DEMO.zoom=1;
      dSay("Arrived at the Moon! That's the demo. Take control to fly it yourself (LAND can set you down), or build your own rocket with B.");
      DEMO.on=false;if(JX)JX.quiet=false;const b=DEMO.el.querySelectorAll("button")[1];b.lastChild.textContent="Close";b.onclick=()=>{DEMO.el.style.display="none";};}}}
window.__demo={start:demoStart,stop:demoStop,get ph(){return DEMO.ph;},get on(){return DEMO.on;}};
$("bDemo").onclick=demoStart;
$("bDemo2").onclick=()=>{$("help").classList.remove("show");demoStart();};
