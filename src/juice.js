// ================= SOUND + GOALS =================
// Everything you hear is made on the spot with WebAudio (no sound files, so the game still works offline in one file):
// the roar is filtered noise that gets louder and brighter with thrust, a bang is a burst of noise plus a falling
// low "thump", and a solid booster's crackle is hundreds of tiny clicks a second at random moments.
// The test stand and flight just say how hard things are burning (JUICE.stand / JUICE.fly); this file's own loop
// turns that into sound, so whichever screen is open is what you hear.
const JUICE=(()=>{
  const SK="throat.sound.v1";let on=store.get(SK,true),A=null,master=null,white=null,roarG,roarF,hissG,crackOut,lastT=0,lvl=0,lvlT=0,lastBang=-9;
  const stand={F:0,srb:false,air:1},fly={lvl:0,air:1,srb:0,lit:false};
  function init(){
    if(A)return A;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    try{A=new C();}catch(e){return null;}
    master=A.createGain();master.gain.value=on?0.55:0;
    const comp=A.createDynamicsCompressor();master.connect(comp);comp.connect(A.destination);   // a crash on top of a roar shouldn't clip
    const n=A.sampleRate*2;white=A.createBuffer(1,n,A.sampleRate);const brown=A.createBuffer(1,n,A.sampleRate),w=white.getChannelData(0),b=brown.getChannelData(0);
    let br=0;for(let i=0;i<n;i++){w[i]=Math.random()*2-1;br=(br+0.02*w[i])/1.02;b[i]=br*3.5;}   // brown noise = deep rumble
    // the roar: rumble through a low-pass that opens up with thrust, plus a hiss layer for the hard edge at full power
    const rs=A.createBufferSource();rs.buffer=brown;rs.loop=true;roarF=A.createBiquadFilter();roarF.type="lowpass";roarF.frequency.value=200;roarG=A.createGain();roarG.gain.value=0;
    rs.connect(roarF);roarF.connect(roarG);roarG.connect(master);rs.start();
    const hs=A.createBufferSource();hs.buffer=white;hs.loop=true;const hf=A.createBiquadFilter();hf.type="bandpass";hf.frequency.value=1100;hf.Q.value=0.6;hissG=A.createGain();hissG.gain.value=0;
    hs.connect(hf);hf.connect(hissG);hissG.connect(master);hs.start(0.37);
    crackOut=A.createBiquadFilter();crackOut.type="highpass";crackOut.frequency.value=1400;crackOut.connect(master);
    return A;}
  // browsers only allow sound after the player touches the page
  const wake=()=>{if(init()&&A.state==="suspended")A.resume();};
  addEventListener("pointerdown",wake,true);addEventListener("keydown",wake,true);
  const now=()=>A.currentTime;
  function noise(t,dur,gain,f0,f1,type){   // a burst of noise whose filter sweeps f0 → f1 and whose volume dies away
    const s=A.createBufferSource();s.buffer=white;const f=A.createBiquadFilter();f.type=type||"lowpass";f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);
    const g=A.createGain();g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t,Math.random()*1.5);s.stop(t+dur+0.05);}
  function thump(t,dur,gain,f0,f1,wave){   // a tone that falls in pitch: the chest-thump under a bang
    const o=A.createOscillator();o.type=wave||"sine";o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
    const g=A.createGain();g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.05);}
  function grains(t0,span,count,gain){   // crackle: lots of tiny clicks at random times
    for(let i=0;i<count;i++){const t=t0+Math.random()*span,d=0.003+Math.random()*0.01,s=A.createBufferSource();s.buffer=white;
      const g=A.createGain();g.gain.setValueAtTime(gain*(0.3+Math.random()*0.7),t);g.gain.exponentialRampToValueAtTime(0.001,t+d);s.connect(g);g.connect(crackOut);s.start(t,Math.random()*1.9);s.stop(t+d+0.01);}}
  const ok=()=>A&&A.state==="running"&&on;
  const snd={
    bang(size){if(!ok())return;const t=now();if(t-lastBang<0.8)return;lastBang=t;size=size||1;noise(t,0.55,0.9*size,3500,250);thump(t,0.4,0.9*size,120,38);},
    crash(size){if(!ok())return;const t=now();size=Math.max(0.2,Math.min(1,size||1));noise(t,2.6,1.3*size,2200,90);thump(t,1.3,1.1*size,75,24);noise(t+0.08,0.6,0.5*size,6000,800,"highpass");grains(t+0.1,1.6,60,0.45*size);},
    clunk(){if(!ok())return;const t=now();noise(t,0.12,0.6,900,250,"bandpass");thump(t,0.14,0.5,190,80,"triangle");},
    chime(){if(!ok())return;const t=now();thump(t,0.25,0.16,660,655,"triangle");thump(t+0.11,0.45,0.16,990,985,"triangle");},
    // countdown beep: a short clean tone, higher for the last ones
    beep(hi){if(!ok())return;const t=now();thump(t,0.13,0.14,hi?1320:880,hi?1315:875,"sine");},
    // spoken callouts with the browser's own offline voice: a bit low and quick, like a radio loop. Silent with sound off.
    say(txt){if(!on||typeof speechSynthesis==="undefined")return;try{const u=new SpeechSynthesisUtterance(txt);u.rate=1.08;u.pitch=0.85;u.volume=0.9;
      const v=speechSynthesis.getVoices().find(x=>/en[-_](US|GB)/i.test(x.lang)&&/male|david|daniel|alex|google us/i.test(x.name))||speechSynthesis.getVoices().find(x=>/^en/i.test(x.lang));if(v)u.voice=v;
      speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}},
    get on(){return on;},
    toggle(){on=!on;store.set(SK,on);if(init()){if(A.state==="suspended")A.resume();master.gain.setTargetAtTime(on?0.55:0,now(),0.05);}btns();}};
  // ---------- the loop: what is burning right now → roar, hiss and crackle ----------
  function loop(){
    requestAnimationFrame(loop);
    if(!A||A.state!=="running")return;const t=now(),dt=Math.min(0.1,t-(lastT||t));lastT=t;
    let L=0,air=1,crack=0;
    if(FLT.on){L=fly.lvl;air=fly.air;crack=fly.srb;}
    else if(!FLT.vab&&!S.paused){L=Math.min(1,stand.F/2600);air=stand.air;crack=stand.srb?Math.max(0.35,L):0;}
    if(document.hidden)L=crack=0;
    // a sudden jump in thrust = something just lit: bang (the test stand's thrust readout updates a few times a second)
    if(L>0.3&&lvl<0.1&&t-lvlT<0.6)snd.bang(0.5+0.5*L);if(L<0.1){lvl=L;lvlT=t;}else lvl=L;
    const mu=0.35+0.65*air,wob=1+(Math.random()-0.5)*0.12;   // in vacuum you'd hear nothing; keep a muffled rumble so it still feels alive
    roarG.gain.setTargetAtTime(Math.pow(L,0.8)*0.9*mu*wob,t,0.06);roarF.frequency.setTargetAtTime((160+1100*L*(0.35+0.65*air))*wob,t,0.08);
    hissG.gain.setTargetAtTime(L*L*0.22*air,t,0.08);
    if(crack>0&&dt>0)grains(t+0.02,dt,Math.round((60+200*crack)*dt+Math.random()),0.35*crack*mu);}
  requestAnimationFrame(loop);
  // ---------- goals ----------
  const GK="throat.goals.v1";let done=store.get(GK,{});
  // each goal is also a "first" that earns science for the tech tree (v1.38): [id, name, hint, science]
  const GOALS=[
    ["light","Light the engine","Test stand: press 2 for the torch, then 1 to open the main valves.",5],
    ["vac","Fire it in vacuum","Switch the outside air to Vacuum (A) and run the engine. Watch the plume balloon.",5],
    ["srb","Burn a solid booster","Pick “Solid booster” from the scenario list and press 1.",10],
    ["launch","Launch a rocket","🚀 Rocket → pick or build one → Launch, then Z for full throttle.",10],
    ["km10","Climb to 10 km","Fly straight up first, then lean over gently.",10],
    ["stage","Drop a stage","Space throws away the empty stage.",10],
    ["space","Reach space","Get above 40 km, where the air ends.",20],
    ["orbit","Get into orbit","Lean east as you climb, then burn sideways at the top until the periapsis is above 40 km.",30],
    ["pad","Land on the landing zone","It's 2 km west of the launch pad (or use the LAND autopilot). Legs down (G), touch down slower than 9 m/s.",20],
    ["moonsoi","Reach the Moon","From orbit, burn prograde until the map shows a Moon encounter.",40],
    ["moonland","Land on the Moon","Kill your sideways speed, legs down, come in gently.",60],
    ["abort","Abort!","Launch the Super Heavy (it has a crew capsule), then press Backspace: the escape tower pulls the capsule away.",10],
    ["chutes","Come home under parachutes","Capsule falling below 280 m/s in the air: press P, then touch down slower than 10 m/s.",15],
    ["splash","Splash down","Come down in the sea slower than 12 m/s (the ocean starts just east of the pad).",10],
    ["ap_ascent","Autopilot to orbit","Flight: open the ASCENT tab on the left and press Engage. It even starts the countdown.",10],
    ["ap_node","Fly a planned burn","In orbit: NODE tab → pick a burn (e.g. To the Moon) → Execute.",15],
    ["ap_land","Autopilot landing","LAND tab → Engage while falling toward the ground (needs legs and some fuel).",15]];
  let toasts=[],toastEl=null;
  function toast(html){toasts.push(html);if(!toastEl)nextToast();}
  function nextToast(){const h=toasts.shift();if(!h){toastEl=null;return;}
    toastEl=document.createElement("div");toastEl.className="toast";toastEl.innerHTML=h;document.body.appendChild(toastEl);
    requestAnimationFrame(()=>toastEl.classList.add("in"));const el=toastEl;
    setTimeout(()=>{el.classList.remove("in");setTimeout(()=>{el.remove();nextToast();},350);},3800);}
  const count=()=>GOALS.filter(g=>done[g[0]]).length;
  function goal(id){if(done[id]||api.quiet)return;const g=GOALS.find(x=>x[0]===id);if(!g)return;done[id]=Date.now();store.set(GK,done);
    const n=count();toast(`<small>Goal ${n===GOALS.length?"— ALL DONE! 🎉":`${n} of ${GOALS.length}`} · +${g[3]} science</small>🏆 ${g[1]}`);if(typeof techChanged==="function")techChanged();snd.chime();btns();if(gl&&gl.classList.contains("show"))list();}
  // the goals card: what's done, and a hint for each thing still to do
  const gl=document.createElement("div");gl.className="help goals";gl.innerHTML='<div class="card"><h2>Goals</h2><div class="glist"></div><div class="row" style="margin-top:10px"><span class="tip">Hints show for goals you haven\'t done yet. Esc to close.</span><button class="b" style="margin-left:auto">Reset goals</button></div></div>';
  document.body.appendChild(gl);gl.onclick=e=>{if(e.target===gl)gl.classList.remove("show");};
  gl.querySelector("button").onclick=()=>{if(confirm("Start the goals over?")){done={};store.set(GK,done);list();btns();}};
  function list(){const el=gl.querySelector(".glist");el.innerHTML="";
    for(const[id,name,hint,sc]of GOALS){const r=document.createElement("div");r.className="gi"+(done[id]?" done":"");r.innerHTML=`<b>${done[id]?"✓":"○"}</b><span></span><small></small><i class="gsc">+${sc}</i>`;
      r.querySelector("span").textContent=name;r.querySelector("small").textContent=done[id]?"":hint;el.appendChild(r);}}
  function openGoals(){list();gl.classList.add("show");}
  addEventListener("keydown",e=>{const tg=e.target.tagName;if(tg==="INPUT"||tg==="SELECT"||e.ctrlKey||e.metaKey)return;
    if(e.key==="Escape"&&gl.classList.contains("show")){gl.classList.remove("show");e.stopImmediatePropagation();}
    else if(e.key.toLowerCase()==="u")snd.toggle();},true);
  // buttons: 🔊 on the test stand and in flight, 🏆 on the test stand
  function btns(){for(const id of["bSnd","fSnd"]){const b=$(id);if(b){b.innerHTML=ico(on?"sound":"mute");b.title=on?"Sound on (U)":"Sound off (U)";}}
    const g=$("bGoals");if(g)g.innerHTML=ico("trophy")+`<b>${count()}/${GOALS.length}</b>`;}
  for(const id of["bSnd","fSnd"])$(id).onclick=()=>snd.toggle();$("bGoals").onclick=openGoals;btns();
  window.__juice={get audio(){return A&&A.state;},get roar(){return roarG?+roarG.gain.value.toFixed(3):null;},get cutoff(){return roarF?Math.round(roarF.frequency.value):null;},stand,fly,get done(){return done;}};   // for browser tests
  const science=()=>GOALS.reduce((a,g)=>a+(done[g[0]]?g[3]:0),0);   // science earned so far: every goal done counts, old ones too
  const api={snd,goal,stand,fly,openGoals,toast,GOALS,science,get done(){return done;},quiet:false};   // quiet: the demo is flying, no goals
  return api;
})();
