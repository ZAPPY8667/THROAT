// ================= DEMO: "WATCH A LAUNCH" =================
// One click and the game shows itself off: the Super Heavy counts down, lifts off, drops its boosters and core, reaches orbit,
// flies to the Moon, lands, takes off again and comes home under parachutes, while a caption says in plain words what's
// happening. Everything is flown by the real autopilot and physics (nothing is pre-recorded). Time speeds up on the long quiet parts. Any key, or "Take control",
// hands the rocket to the player wherever it is.
const DEMO={on:false,ph:"",t:0,el:null,zoom:1,said:{}};
function demoStart(o){   // o.bg: running behind the title screen (no caption box)
  if(FLT.vab&&typeof closeVab==="function")closeVab(true);
  startFlight(tpl("sls"),"Super Heavy");
  Object.assign(DEMO,{on:true,ph:"pad",t:0,zoom:1,said:{},tz:null,close:false,s:0});msgT=0;
  if(JX)JX.quiet=true;   // watching isn't doing: no goals are ticked off during the demo
  if(!DEMO.el){const d=document.createElement("div");d.className="demo";
    d.innerHTML='<span class="demo-tag">Demo</span><p></p><div class="row"><button class="b go" data-ic="play">Take control</button><button class="b">Stop demo</button></div>';
    $("flight").appendChild(d);DEMO.el=d;const[bt,bs]=d.querySelectorAll("button");
    bt.onclick=()=>demoStop("You have the controls. The autopilot tabs on the left (ASCENT, NODE, LAND) can fly it again.");
    bs.onclick=()=>{demoStop();endFlight();};
    if(typeof ico==="function")d.querySelectorAll("[data-ic]").forEach(b=>{b.innerHTML=ico(b.dataset.ic)+b.innerHTML;});}
  DEMO.bg=!!(o&&o.bg);DEMO.el.style.display=DEMO.bg?"none":"";dSay("The Super Heavy: 91 m tall, 2,100 tonnes. A crew capsule sits on top, under its escape tower. Nobody is touching the controls: the autopilot flies everything from here.");}
function demoStop(why){if(JX)JX.quiet=false;if(!DEMO.el)return;const was=DEMO.on;DEMO.on=false;DEMO.el.style.display="none";
  // hand over as it is: engines keep burning, the heading hold keeps it pointing where it was (apOff would cut the throttle)
  if(was&&AP.mode){AP.mode=null;AP.ph="";if(AV){AV.sas="stab";AV.hold=AV.phi;}}
  if(was){warp=1;warpTo=null;zoomF=1;if(why){msg=why;msgT=6;}}}
const dSay=t=>{if(DEMO.el)DEMO.el.querySelector("p").textContent=t;};
const dOnce=(k,f)=>{if(!DEMO.said[k]){DEMO.said[k]=1;f();}};
// called once per frame from flightFrame (real seconds)
function demoStep(dt){if(!DEMO.on&&DEMO.ph==="end"&&DEMO.el&&DEMO.el.style.display!=="none"&&zoomF!==1)zoomF=Math.exp(Math.log(zoomF)*(1-Math.min(1,dt*1.2)));
  if(!DEMO.on||!AV)return;DEMO.t+=dt;const v=AV,P=DEMO.ph;
  if(v.crashed){dSay("Something went wrong and the rocket was lost. Press R to try again, or Stop demo.");DEMO.on=false;return;}
  // the camera: closer on the pad, and for a few seconds after each separation, then back to the normal tracking shot.
  // The tracking camera (renderFlight) picks a base scale from three: framing the rocket, following the ground as it climbs,
  // keeping a small craft visible; zoomF multiplies it. A close-up wants the rocket ~a third of the screen tall. The demo eases
  // the size on screen (DEMO.s, pixels per metre), not zoomF, so when the base scale jumps (the small-craft rule switches on at
  // 40 km) the picture doesn't. Heights are above the ground under the craft, as the camera measures them.
  const hAG=Math.hypot(v.x,v.y)-BOD[v.body].R-(v.body===0?Math.max(0,terrH(Math.atan2(v.x,v.y)*PR)):0),H=Math.max(2.4,v.H),sBase=FH/(H*3.4),sFol=FH*0.42/Math.max(1,hAG),
    sMin=v.body===0&&hAG<ATM_TOP&&v.H<15?40/H:0,base=Math.max(Math.min(sBase,sFol),sMin),want=DEMO.close?Math.max(base,0.8*sBase):base*DEMO.zoom;
  if(!(DEMO.s>0))DEMO.s=base*zoomF;DEMO.s=Math.exp(Math.log(DEMO.s)+(Math.log(want)-Math.log(DEMO.s))*Math.min(1,dt*1.2));zoomF=DEMO.s/base;
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
      dSay("Orbit: going almost 4 km/s sideways, it falls around the Earth and keeps missing the ground. Next stop: the Moon.");}}
  else if(P==="orbit"){
    if(DEMO.t>6&&!DEMO.said.plan){DEMO.said.plan=1;if(AP.mode)apOff("done");const n=planNode("moon");
      if(!n){dSay("No Moon transfer this lap, so the demo stops here. Try the NODE tab yourself!");DEMO.on=false;return;}
      AP.node=n;mapView=true;mapOpen();apEngage("node");DEMO.ph="burn";
      dSay("The map. The dashed red line is the planned burn to the Moon. The autopilot warps to the right moment, points the engine and burns.");}}
  else if(P==="burn"){if(v.F>0&&warp<4)warp=4;   // the long burn, sped up (×4 is the most the game allows with an engine on)
    if(!AP.mode){DEMO.ph="coast";DEMO.t=0;dSay("On the way. In real life this takes three days; here, time warp. Watch the path bend as the Moon's gravity grabs it.");}}
  else if(P==="coast"){if(DEMO.t>3&&!DEMO.said.wm){DEMO.said.wm=1;   // warp to just before the Moon's gravity takes over
      const Pr=v.body===0?predict(v.body,v.x,v.y,v.vx,v.vy,FT):null,mk=Pr&&Pr.marks.find(m=>m.k==="enter");if(mk)warpToEventAt(FT+mk.t-60,"the Moon");}
    if(v.body===1){DEMO.ph="moon";DEMO.t=0;warp=1;warpTo=null;mapView=false;DEMO.zoom=1;
      // the core still has fuel, but it's 48 m of tank: the upper stage does the landing, so drop the core here
      if(v.ps.some(p=>p.t==="engine"&&p.k>1)){doStage();DEMO.close=true;}
      dSay("The Moon's gravity has us. The big core stage is dropped: the upper stage, the service module and the capsule go on to land.");}}
  // ---- part 2: land on the Moon, take off, fly home, re-enter, parachutes (v1.35) ----
  else if(P==="moon"){if(DEMO.t>6){DEMO.close=false;DEMO.ph="approach";DEMO.t=0;
      const Pr=predict(v.body,v.x,v.y,v.vx,v.vy,FT),mk=Pr.marks.find(m=>m.k==="pe"&&m.body===1);if(mk&&mk.t>120)warpToEventAt(FT+mk.t-90,"the Moon");
      dSay("Falling toward the Moon. Nobody steers yet: time warp until we're close.");}}
  else if(P==="approach"){if(warpTo==null&&DEMO.t>2){apEngage("land",{target:"here"});DEMO.ph="land";DEMO.t=0;
      dSay("Landing. The Moon has no air to slow us, so the engine does it all: first it cancels the sideways speed, about 1 km/s.");}}
  else if(P==="land"){const hAG2=hAG;
    warp=v.F>0?(hAG2<400?1:4):hAG2>6000?20:4;DEMO.close=hAG2<2500;
    if(AP.ph==="fall"&&!AP.burning)dOnce("fall",()=>dSay("Now it just falls. The landing burn starts as late as it can: the shorter the burn, the less fuel it takes."));
    if(AP.burning)dOnce("burn",()=>dSay("Landing burn! Slowing from hundreds of metres a second to a gentle 2 m/s at touchdown."));
    if(v.landed){DEMO.ph="onmoon";DEMO.t=0;warp=1;DEMO.close=true;dSay("Touchdown on the Moon! Gravity here is a sixth of Earth's. Now: home.");}}
  else if(P==="onmoon"){if(DEMO.t>6){apEngage("ascent",{alt:20000,turnEnd:8000});DEMO.ph="moonup";DEMO.t=0;DEMO.close=false;
      dSay("Lift-off from the Moon. With no air in the way it can lean over almost at once, straight into orbit.");}}
  else if(P==="moonup"){warp=v.F>0?4:hAG>5000?20:4;
    if(!AP.mode){DEMO.ph="moonorbit";DEMO.t=0;warp=1;dSay("In orbit around the Moon, 20 km up. One more burn and we're on the way home.");}}
  else if(P==="moonorbit"){if(DEMO.t>4){const n=planNode("home");
      if(!n){dSay("No path home found this lap, so the demo stops here. Try NODE → Home from Moon yourself!");DEMO.on=false;if(JX)JX.quiet=false;return;}
      AP.node=n;mapView=true;mapOpen();apEngage("node");DEMO.ph="homeburn";
      dSay("The burn home: aimed so the path just skims Earth's air, about 30 km up. The air will do the braking.");}}
  else if(P==="homeburn"){if(v.F>0&&warp<4)warp=4;
    if(!AP.mode){DEMO.ph="homecoast";DEMO.t=0;
      const Pr=predict(v.body,v.x,v.y,v.vx,v.vy,FT),mk=Pr.marks.find(m=>m.k==="pe"&&m.body===0);if(mk)warpToEventAt(FT+mk.t-240,"Earth");
      dSay("Falling home to Earth. Time warp again.");}}
  else if(P==="homecoast"){if(v.body===0&&(warpTo==null||hAG<250e3)){warpTo=null;warp=1;mapView=false;
      while(v.ps.some(p=>p.t==="dec"))doStage();   // only the capsule comes home: drop everything under its heat shield
      const c=AV;c.sas="retro";DEMO.ph="reentry";DEMO.t=0;DEMO.close=true;
      dSay("Only the capsule comes home. It turns its heat shield to the front: hitting the air at 4 km/s will make it glow.");}}
  else if(P==="reentry"){warp=hAG>45000||(v.hf||0)<1.5e7?10:4;   // slow only while it glows
    if((v.hf||0)>1e7)dOnce("hot",()=>dSay("Re-entry! The air in front of the shield is squeezed so hard it glows. The shield takes the heat."));
    const sp=Math.hypot(v.vx,v.vy);if(sp<240&&hAG<9000){chutes();DEMO.ph="chutes";DEMO.t=0;dSay("Slow enough: parachutes out.");}}
  else if(P==="chutes"){warp=hAG>400?10:2;
    if(v.landed){DEMO.ph="end";warp=1;DEMO.close=true;
      dSay((v.wet?"Splashdown! ":"Touchdown! ")+"Earth to the Moon and back, flown by the autopilots on real physics. That's the demo: take control, or press B and build your own rocket.");
      DEMO.on=false;if(JX)JX.quiet=false;const b=DEMO.el.querySelectorAll("button")[1];b.lastChild.textContent="Close";b.onclick=()=>{DEMO.el.style.display="none";};}}}
window.__demo={get D(){return DEMO;},start:demoStart,stop:demoStop,get ph(){return DEMO.ph;},get on(){return DEMO.on;}};
$("bDemo").onclick=demoStart;
$("bDemo2").onclick=()=>{$("help").classList.remove("show");demoStart();};
