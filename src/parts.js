// ================= PARTS & VEHICLES =================
// Parts are rectangles: x = centre, y = bottom, in units of 10 cm (UM = 0.1 m per unit), so a 40 × 300 tank is a real-size
// 4 m × 30 m tank holding about 136 t. They join wherever two of them touch, so the editor and the flight both read the
// rocket straight from its shape: no hidden attachment tree to get out of sync.
// v1.16 made rockets real size: ten times longer than before, so masses (volume) and thrust are MK = 1000× the old numbers.
// Your test-stand engine is a 2D slice a few cm across; in flight it is scaled up to the part's size the same way
// (thrust grows with the nozzle's area, Isp stays what you measured).
const UM=0.1,MK=1000;
// RCS: each block of jets pushes 250 kN in any direction it's asked and carries its own 2.5 t of monopropellant (Isp 180 s).
// The fuel's weight stays in the part's mass the whole flight: it's small next to the rocket and not worth the bookkeeping.
const RCS_F=250*MK,RCS_ISP=180,RCS_MONO=2.5*MK;
const G0=9.80665,RHO_P=360;   // bulk density of liquid hydrogen + liquid oxygen, kg/m³
// v1.35: a tank holds whatever its engines burn, and the propellants weigh very different amounts for the same tank: liquid
// hydrogen is so light that hydrogen + oxygen comes to 360 kg/m³; methane + oxygen 830; kerosene + oxygen 1,030 (nearly 3×).
// So a kerosene stage is heavy and compact, a hydrogen stage big and light. p.fk on a tank = the fuel it holds (none = hydrogen).
const RHO_FUEL={h2:RHO_P,ch4:830,kero:1030},FUEL_NAME={h2:"hydrogen",ch4:"methane",kero:"kerosene"};
const tankCap=(w,h,fk)=>(RHO_FUEL[fk]||RHO_P)*Math.PI*(w*UM/2)**2*(h*UM);
// solid boosters carry their own propellant, packed much denser than the liquids (real solid propellant is ~1,750 kg/m³;
// 900 allows for the hollow core);
// the bottom 2 m is the nozzle, so it holds no propellant
const RHO_S=900,SRB_NZ=20,SRB_REF=18;   // SRB_REF: a booster this wide pushes its listed thrust × MK (real SLS boosters: ~15 MN at 3.7 m)
const srbCap=(w,h)=>RHO_S*Math.PI*(w*UM/2)**2*(Math.max(0,h-SRB_NZ)*UM);
const capOf=p=>p.t==="tank"?tankCap(p.w,p.h,p.fk)*(p.v==="ball"?0.66:1):p.t==="srb"?srbCap(p.w,p.h):0;
const hasProp=p=>p.t==="tank"||p.t==="srb";
const isEng=p=>p.t==="engine"||p.t==="srb";
const isBrain=p=>p.t==="probe"||p.t==="capsule"||p.t==="nose"&&p.v==="cockpit";   // a capsule is a probe core with a heat shield, parachutes and a crew
// engine clusters: an engine part can hold k engines side by side under one thrust plate (like SLS 4, New Glenn 7, Falcon 9 9).
// Up to 3 sit in one row; more go in two rows (the back row is drawn behind, a little higher). Each engine is ew wide.
// v1.46: a cluster built in the editor stores its engine size (p.es); the plate width always follows from it (clusterW), so
// changing the engine count keeps every engine the same size and +/− grows the engines, not a plate they rattle around in.
// (Clusters saved before keep the old rule: engines fill the plate, up to 1.15× the model's own size.)
const clusterRows=k=>k<=3?1:2,clusterFront=k=>Math.ceil(k/clusterRows(k));
const clusterW=(k,es)=>k<=1?es:Math.round(clusterFront(k)*es*1.02/0.96);
function clusterGeo(p){const k=Math.max(1,p.k||1),E=ENG[engKey(p)],rows=clusterRows(k),front=Math.ceil(k/rows),ew=k===1?p.w:p.es?p.es:Math.min(p.w*0.96/front,E.w*1.15),plate=k>1?5:0;
  // the back row sits behind the gaps (odd counts) or squeezed inward (even counts), always symmetric about the centre line
  const back=k-front,bs=back>1?(back===front?(front-1)*(front-1)/front:back-1)/(back-1):0,xs=[];for(let i=0;i<front;i++)xs.push([(i-(front-1)/2)*ew*1.02,0]);for(let i=0;i<back;i++)xs.push([(i-(back-1)/2)*bs*ew*1.02,1]);
  return{k,ew,plate,eh:Math.round(E.h*ew/E.w),xs};}
const engH=p=>{const g=clusterGeo(p);return g.plate+g.eh;};
// thrust in readable units: kN up to 1 MN, then MN
// masses in readable units: kg up to 10 t, then tonnes
const fM=m=>m>=1e4?Math.round(m/1000).toLocaleString()+" t":Math.round(m).toLocaleString()+" kg";
const fF=F=>F>=1e6?(F/1e6).toFixed(2)+" MN":Math.round(F/1000)+" kN";
const A2=(w,r)=>(w/r)**2;   // how a part's mass (or an engine's thrust) grows with its width: by cross-section area
// ws: [default width]; wr: [narrowest, widest] the editor lets you stretch it to (free width for everything in the stack)
const PT={
  probe:  {name:"Probe core",     ws:[40], wr:[10,160], h:w=>Math.round(w*0.5), m:w=>4*MK*A2(w,60), desc:"The brain. You need one to steer, and its reaction wheels turn the rocket even with the engine off."},
  nose:   {name:"Nose cone",      ws:[40], wr:[10,160], h:w=>Math.round(w*1.6), m:w=>1.5*MK*A2(w,60), desc:"Cuts air drag a lot. Put one on top of every stack that leads the way."},
  tank:   {name:"Fuel tank",      ws:[40], wr:[10,160], h:()=>200, m:(w,h)=>MK*A2(w,60)*h/90+0.08*tankCap(w,h), desc:"Propellant for the engines under it: hydrogen + oxygen (light), or methane / kerosene + oxygen if those engines burn it (2–3× heavier for the same tank). Shift+wheel stretches its length, Ctrl+wheel its width."},
  adapter:{name:"Adapter",        ws:[84], wr:[14,160], h:w=>40, m:w=>3*MK*A2(w,120), desc:"Joins a wide stack (below) to a narrower one (above). Set both widths in its settings."},
  engine: {name:"Engine",         ws:[30], wr:[8,120],  h:w=>w, m:()=>9*MK, desc:"An engine."},
  srb:    {name:"Solid booster",  ws:[37], wr:[10,120], h:()=>300,m:(w,h)=>2*MK*A2(w,60)*h/150+0.12*srbCap(w,h), desc:"Fuel and engine in one. Lights when you throttle up and can't be stopped or throttled until it burns out. Stretch it for a longer burn."},
  dock:   {name:"Docking port",   ws:[20], wr:[10,80],  h:w=>Math.max(4,Math.round(w*0.3)), m:w=>0.6*MK*A2(w,20), desc:"Goes on top of a stack. Two craft whose ports touch nose to nose, slower than 0.5 m/s, lock together (N lets go). Use RCS (T, then I J K L) to line up."},
  truss:  {name:"Truss",          ws:[40], wr:[10,160], h:()=>60, m:(w,h)=>0.5*MK*A2(w,60)*h/60, desc:"An open steel frame: a light spacer between parts. You can see right through it."},
  chute:  {name:"Parachute",      ws:[16], wr:[8,60],   h:w=>Math.round(w*0.75), m:w=>0.4*MK*A2(w,16), desc:"A packed parachute for any stage or payload: put it on top. P opens it in the air below 280 m/s, and it lands the craft gently."},
  brake:  {name:"Airbrake",       ws:[12],              h:()=>40, m:()=>0.6*MK, radial:1, desc:"A flap that swings open by itself when the stage falls through the air with its engines off: big drag to slow it down before landing."},
  antenna:{name:"Antenna dish",   ws:[14],              h:()=>24, m:()=>0.15*MK, radial:1, desc:"A folded dish that opens in space (like the solar panels) to talk to home. Light: for satellites and probes."},
  dec:    {name:"Decoupler",      ws:[40], wr:[10,160], h:()=>6,  m:w=>2*MK*A2(w,60), desc:"Space drops everything below it. Engines sitting on one stay off until it fires."},
  sdec:   {name:"Side decoupler", ws:[3],               h:()=>40, m:()=>1.5*MK, radial:1, desc:"Hang boosters on the side, almost touching the core. Space drops them (it goes with the booster)."},
  fin:    {name:"Fin",            ws:[30],              h:()=>50, fin:1, m:()=>1.2*MK, radial:1, desc:"Keeps the rocket pointing where it's going while in the air."},
  rcs:    {name:"RCS thrusters",  ws:[10],              h:()=>20, m:()=>0.8*MK+RCS_MONO, radial:1, desc:"Little gas jets. T turns RCS on: they help the rocket turn (in space too), and I J K L nudge it forward, back and sideways. Own fuel."},
  capsule:{name:"Crew capsule",   ws:[50], wr:[16,120], h:w=>Math.round(w*0.66), m:w=>9*MK*A2(w,50), desc:"Orion-style capsule: the brain (like a probe core) with a heat shield underneath and parachutes (P). Come home heat-shield first."},
  les:    {name:"Escape tower",   ws:[14], wr:[6,60],  h:w=>Math.round(w*4.4), m:w=>6*MK*A2(w,14), desc:"Launch escape tower: goes on top of the capsule. ABORT (Backspace) fires it and pulls the capsule away from the rocket. It drops off by itself in space."},
  leg:    {name:"Landing leg",    ws:[30],              h:()=>90, m:()=>2.5*MK, radial:1, desc:"G deploys. Lets you land at up to 9 m/s instead of about 3."},
  // v1.37
  solar:  {name:"Solar panel",    ws:[10],              h:()=>40, m:()=>0.4*MK, radial:1, desc:"Folds flat against the side and opens out once you're in space. Makes a satellite look like one."},
  light:  {name:"Floodlight",     ws:[8],               h:()=>10, m:()=>0.05*MK, radial:1, desc:"A bright lamp: it lights up at night and in the shadow, so you can see where you're landing."},
  fair:   {name:"Payload fairing",ws:[40], wr:[10,160], h:()=>4,  m:w=>0.5*MK*A2(w,40), desc:"Goes on the upper stage, with your payload on top of it. Its shell covers the payload like a nose cone (less drag) and splits open by itself in space. Set its height in the settings."},
  shield: {name:"Heat shield",    ws:[40], wr:[10,160], h:()=>5,  m:w=>1.2*MK*A2(w,40), desc:"A heat-shield plate for the bottom of anything you bring home. Coming in shield-first, it takes the re-entry heat, like a capsule's."},
};
// v1.37: variants: the same kind of part (same physics) in another design. Palette id "type:variant" → p.v; w, h: its default size
const VARS={
  "tank:ball":   {name:"Fuel spheres", w:40, h:()=>80, desc:"Round tanks in an open frame, like a lunar lander's. They hold about two-thirds of what a tank this size would."},
  "fin:grid":    {name:"Grid fins",    w:22, h:()=>22, desc:"Lattice fins, like a returning booster's. Put them near the top: they steer a falling stage through the air."},
  "fin:wing":    {name:"Wing",         w:90, h:()=>130,desc:"A big swept wing. Lots of grip on the air: for spaceplanes and very steady rockets."},
  "probe:cabin": {name:"Lander cabin", w:60, h:w=>Math.round(w*0.8), desc:"Apollo-style lander cabin for a crew: it's the brain, light and gold-wrapped. No heat shield, so don't bring it home through the air."},
  "nose:cockpit":{name:"Cockpit",      w:40, h:w=>Math.round(w*1.5), desc:"Spaceplane cockpit: a nose cone with a crew and windows. It's the brain, and it cuts drag like a nose."},
  "leg:big":     {name:"Big landing leg",w:54,h:()=>162,desc:"A long, wide-stance leg for big landers and boosters. G deploys. Same gentle landing speed, but it holds a heavy stage steady."},
  "capsule:dragon":{name:"Big capsule",w:70, h:w=>Math.round(w*0.72), desc:"Dragon-style capsule: wider and rounder, seats seven. Heat shield underneath and parachutes (P), like the small one."}};
const varOf=p=>p.v&&VARS[p.t+":"+p.v]?VARS[p.t+":"+p.v]:null;
// procedural fins and wings (v1.46). A fin is a flat panel: span (p.w, out from the body), root chord (p.h, along the body),
// tip chord p.tc (as a share of the root) and sweep p.sb (how far the tip's front edge sits behind the root's front edge, as a
// share of the root). Its mass and its grip on the air follow its area, compared with the default shape of its kind, so
// every rocket built before keeps exactly the numbers it had. Grid fins are a lattice, not a panel: they stay as they are.
const FIN_DEF={fin:{w:30,h:50,tc:0.18,sb:0.82},wing:{w:90,h:130,tc:0.18,sb:0.72}};
const finDef=p=>FIN_DEF[p.v==="wing"?"wing":"fin"];
function finShape(p){const d=finDef(p),tc=p.tc!=null?p.tc:d.tc,sb=Math.max(0,Math.min(1-tc,p.sb!=null?p.sb:d.sb));return{tc,sb,sw:1-sb-tc};}   // sw: tip's back edge above the root's
const finPanel=p=>p.t==="fin"&&p.v!=="grid";
const finShapeK=p=>finPanel(p)?(1+finShape(p).tc)/(1+finDef(p).tc):1;   // area per span×root, vs the default shape
// height of the fin's lift on its root (share of the root chord): the middle of its area, moved by how this shape differs from
// the default (so a default fin still reads 0.5, as before; a fin with its tip pushed back lifts lower down)
const finMidY=(sw,tc)=>(1+sw+sw+tc)/4;
const finLiftY=p=>{const s=finShape(p),d=finDef(p);return 0.5+finMidY(s.sw,s.tc)-finMidY(1-d.sb-d.tc,d.tc);};
const finAreaK=p=>finPanel(p)?p.w*p.h*finShapeK(p)/(finDef(p).w*finDef(p).h):1;   // area vs the default fin of its kind
// paint: tanks (p.sk) and nose cones; each as a base colour for the round-tube shading
const SKIN_COL={white:[236,238,241],steel:[196,200,206],foam:[196,96,36],black:[44,46,52],stripes:[236,238,241],gold:[214,172,72]};
// engines: your own (numbers from the test stand) and four ready-made ones, at their default size (w × h units).
// Numbers here are at that size, in the old small units; engStat() scales them by MK and by the nozzle area of the actual part.
const ENG={
  stand:{name:"Your engine",w:30,h:46,m:9,desc:"Your engine, with the thrust and Isp it made on the test stand, scaled up to this size."},
  wren: {name:"Wren",w:22,h:32,m:5,fuel:"kero",pf:0.6,sl:{F:1100,isp:285},vac:{F:1250,isp:322},desc:"Small and light, for sea level. Good for hoppers and landers."},
  mule: {name:"Mule",w:32,h:46,m:12,fuel:"kero",sl:{F:3300,isp:305},vac:{F:3650,isp:338},desc:"The workhorse: lots of push at sea level for its size."},
  bison:{name:"Bison",w:56,h:70,m:28,fuel:"kero",pf:0.88,sl:{F:7500,isp:300},vac:{F:8300,isp:330},desc:"Big, powerful sea-level engine for heavy first stages."},
  vac:  {name:"Lumen Vac",w:36,h:84,m:7,pf:0.9,sl:{F:800,isp:140},vac:{F:2600,isp:445},desc:"Huge bell for space: best Isp of all, but weak at sea level (the exhaust is over-expanded)."},
  // v1.37: four more, each a different kind of engine (fuel: what its tanks hold; pf: how wide the flame starts, of the part)
  gnat: {name:"Gnat",w:12,h:18,m:1.2,fuel:"ch4",pf:0.6,sl:{F:180,isp:270},vac:{F:230,isp:320},desc:"Tiny methane thruster. For small landers and probes, or a cluster of them for fine control."},
  spike:{name:"Spike",w:44,h:28,m:14,pf:0.9,sl:{F:3400,isp:330},vac:{F:3600,isp:352},desc:"Aerospike: no bell. The air itself shapes the exhaust, so it works almost as well at sea level as in space."},
  condor:{name:"Condor",w:62,h:78,m:32,fuel:"ch4",pf:0.88,sl:{F:9800,isp:330},vac:{F:10600,isp:356},desc:"Huge full-flow methane engine (Raptor-style). The strongest engine for big boosters."},
  atom: {name:"Atom",w:40,h:110,m:30,pf:0.7,sl:{F:250,isp:190},vac:{F:900,isp:820},desc:"Nuclear: a reactor heats hydrogen instead of burning it. Twice the Isp of any other engine, but heavy and weak: for space only."},
  lib:  {name:"Saved engine",w:30,h:46,m:9,desc:"An engine you tested and saved in the engine library, scaled up to this size."}};
// solid boosters: what's inside the casing. "Your booster" = your last burn on the test stand; saved ones keep a copy of their numbers
// on the part (p.n), so a rocket still flies the same after the library entry is deleted. The curve is thrust (relative to the
// average) against how much of the propellant has burned, sampled evenly from first to last.
const BOOST={
  stand:  {name:"Your booster",desc:"Your booster, with the thrust, Isp and thrust curve of your last full burn on the test stand."},
  thumper:{name:"Thumper",sl:{F:3400,isp:215},vac:{F:3750,isp:237},curve:[1.2,1.15,1.1,1.05,1,1,1,0.98,0.95,0.92,0.9,0.85],desc:"A ready-made booster: hard kick at lift-off that tapers off."},
  // v1.37: two more with their own sizes (w × h) and looks
  sprinter:{name:"Sprinter",w:30,h:180,sl:{F:5200,isp:205},vac:{F:5600,isp:228},curve:[1.5,1.45,1.35,1.2,1.05,0.95,0.85,0.8,0.75,0.7,0.65,0.6],desc:"Short and fierce: a huge kick off the pad that fades fast. Gets a heavy rocket moving."},
  longhorn:{name:"Longhorn",w:40,h:520,sl:{F:2200,isp:240},vac:{F:2450,isp:262},curve:[0.9,0.95,1,1,1.02,1.02,1.03,1.03,1,1,0.98,0.95],desc:"Long and steady: a gentler push, but a long burn and the best Isp of the boosters."},
  lib:    {name:"Saved booster",desc:"A booster you burned on the test stand and saved in the engine library."}};
const boostKey=p=>p.b&&BOOST[p.b]?p.b:"stand";
// v1.47 (Wyatt: "it's hard to get enough thrust from engines"): liquid engines push 1.3x what they did (more burns rockets up low in the air at full throttle). The real-size tanks
// (v1.16) are heavy, and one engine of a tank's width barely lifted it. Isp (fuel economy) is unchanged, so delta-v stays the same;
// the engines just burn their fuel faster and lift more.
const THR_K=1.3;
function boostStat(p){const k=boostKey(p);return scaleStat(k==="lib"&&p.n?p.n:k==="stand"?boosterNums():BOOST[k],MK*A2(p.w,SRB_REF));}
// numbers at real size: thrust × k (Isp unchanged); keeps the extra fields (curve, name, est, src)
function scaleStat(E,k){const o=Object.assign({},E);o.sl=Object.assign({},E.sl,{F:E.sl.F*k});o.vac=Object.assign({},E.vac,{F:E.vac.F*k});return o;}
// thrust multiplier when a fraction u of the propellant is gone (straight lines between the curve's samples)
function curveAt(c,u){if(!c||c.length<2)return 1;const x=Math.max(0,Math.min(1,u))*(c.length-1),i=Math.min(c.length-2,Math.floor(x));return c[i]+(c[i+1]-c[i])*(x-i);}
const ENG_ORDER=["stand","gnat","wren","mule","spike","bison","condor","vac","atom"],BOOST_ORDER=["stand","thumper","sprinter","longhorn"];
const engKey=p=>p.e&&ENG[p.e]?p.e:"stand";
function engStat(p){if(p.t==="srb")return boostStat(p);const k=engKey(p);return scaleStat(k==="lib"&&p.n?p.n:k==="stand"?engineNums():ENG[k],THR_K*MK*A2(clusterGeo(p).ew,ENG[k].w)*(p.k||1));}
const PT_ORDER=["probe","probe:cabin","nose","nose:cockpit","tank","tank:ball","adapter","truss","fair","shield","engine:stand","engine:gnat","engine:wren","engine:mule","engine:spike","engine:bison","engine:condor","engine:vac","engine:atom","engine:stand:4",
  "srb:stand","srb:thumper","srb:sprinter","srb:longhorn","dec","sdec","dock","chute","fin","fin:grid","fin:wing","brake","rcs","leg","leg:big","solar","antenna","light","capsule","capsule:dragon","les"];
let partId=1;
// t can carry a model: "engine:mule", "srb:thumper"; n = a saved library entry's numbers to copy onto the part
function mkPart(t,w,h,e,n){let b,k=1;if(t.startsWith("engine:")){e=t.slice(7);t="engine";if(e.includes(":")){k=+e.split(":")[1];e=e.split(":")[0];}}else if(t.startsWith("srb:")){b=t.slice(4);t="srb";}let va;if(t.includes(":")){va=t.split(":")[1];t=t.split(":")[0];}const d=PT[t],V=va&&VARS[t+":"+va];if(V){w=w||V.w;h=h||V.h(w);}
  if(t==="engine"){e=e||"stand";const E=ENG[e];w=w||(k>1?Math.round(E.w*(k<=3?k:Math.ceil(k/2))*1.05):E.w);if(!h){h=engH({t,e,w,k});}}w=w||d.ws[0];const p={id:partId++,t,x:0,y:0,w,h:h||d.h(w),f:1,tw:0};if(e)p.e=e;if(t==="srb")p.b=b||"stand";
  if(b&&BOOST[b]&&BOOST[b].w&&!p.n){if(!p.w||p.w===d.ws[0])p.w=BOOST[b].w;if(p.h===d.h(d.ws[0]))p.h=BOOST[b].h;}   // boosters with their own size
  if(V)p.v=va;if(t==="fair")p.fh=120;   // fairing shell height above its ring (12 m)
  if(t==="adapter")p.w2=Math.round(w*0.48);if(k>1)p.k=k;
  if(n)p.n=JSON.parse(JSON.stringify(n));return p;}
const fairShell=p=>p.t==="fair"&&!p.open?0.02*(p.fh||120)*MK*A2(p.w,40):0;   // the shell's mass, gone once it opens
const partMass=p=>fairShell(p)+(p.t==="engine"?ENG[engKey(p)].m*MK*A2(clusterGeo(p).ew,ENG[engKey(p)].w)*(p.k||1)+(p.k>1?0.6*MK*A2(p.w,40):0):PT[p.t].m(p.w,p.h)*(p.t==="fin"?finAreaK(p):1));
const partName=p=>varOf(p)?varOf(p).name:p.t==="engine"?(engKey(p)==="lib"&&p.n?p.n.name:ENG[engKey(p)].name)+(p.k>1?" ×"+p.k:""):p.t==="srb"?(boostKey(p)==="lib"&&p.n?p.n.name:BOOST[boostKey(p)].name):PT[p.t].name;
// a decoupler under an engine gets a shroud (interstage) that covers the engine until it separates
function shroudsOf(ps){const out=[];ps.forEach((d,i)=>{if(d.t!=="dec"||d.shed)return;let top=-1e9;
  for(const e of ps)if(e.t==="engine"&&near(e.y,d.y+d.h)&&ovl(e.x-e.w/2,e.x+e.w/2,d.x-d.w/2,d.x+d.w/2)>0.5)top=Math.max(top,e.y+e.h);
  if(top>-1e9)out.push({i,x:d.x,w:d.w,y0:d.y+d.h,y1:top});});return out;}
function drawShroud(c,s,al){c.save();c.globalAlpha=al==null?1:al;const L=s.x-s.w/2,R=s.x+s.w/2;   // black carbon interstage, like Falcon 9's
  c.fillStyle=cyl(c,L,R,[42,44,50]);c.fillRect(L,s.y0,s.w,s.y1-s.y0);c.fillStyle="rgba(255,255,255,.045)";for(let yy=s.y0+3;yy<s.y1;yy+=3)c.fillRect(L,yy,s.w,0.6);
  c.fillStyle="rgba(255,255,255,.16)";c.fillRect(L,s.y1-1.2,s.w,1.2);c.fillStyle="rgba(0,0,0,.4)";c.fillRect(s.x-0.5,s.y0,1,s.y1-s.y0);c.restore();}
// payload fairing shell (v1.37+): white clamshell over whatever sits on the ring, an ogive top, the split line down the middle.
// Drawn after the parts so it covers them (al < 1 in the editor so you can see the payload inside)
function drawFairing(c,p,al){const L=p.x-p.w/2,R=p.x+p.w/2,y0=p.y+p.h,top=y0+(p.fh||120),nh=Math.min((p.fh||120)*0.6,p.w*1.3),yb=top-nh,x=p.x,w=p.w;
  c.save();c.globalAlpha=al==null?1:al;c.beginPath();c.moveTo(L,y0);c.lineTo(L,yb);c.bezierCurveTo(L,yb+nh*0.42,x-w*0.22,yb+nh*0.86,x-w*0.03,top-0.6);c.quadraticCurveTo(x,top+0.3,x+w*0.03,top-0.6);
  c.bezierCurveTo(x+w*0.22,yb+nh*0.86,R,yb+nh*0.42,R,yb);c.lineTo(R,y0);c.closePath();c.fillStyle=cyl(c,L,R,SKIN_COL[p.sk]||[240,241,244]);c.fill();
  c.save();c.clip();c.fillStyle="rgba(0,0,0,.2)";c.fillRect(x-0.5,y0,1,top-y0);c.fillStyle="rgba(0,0,0,.07)";for(let yy=y0+30;yy<yb;yy+=30)c.fillRect(L,yy,w,0.8);
  c.fillStyle="#c23b2e";c.fillRect(L,y0+2,w,1.2);c.restore();c.restore();}
const isRad=p=>!!PT[p.t].radial;
const topW=p=>p.t==="nose"||p.t==="les"?0:p.t==="capsule"?Math.round(p.w*(p.v==="dragon"?0.5:0.34)):p.t==="probe"&&p.v==="cabin"?Math.round(p.w*0.5):p.t==="adapter"?(p.w2||Math.round(p.w*0.48)):p.w;
const ovl=(a0,a1,b0,b1)=>Math.min(a1,b1)-Math.max(a0,b0);
const near=(a,b)=>Math.abs(a-b)<0.01;
function touching(a,b){
  if(near(a.y+a.h,b.y)&&ovl(a.x-topW(a)/2,a.x+topW(a)/2,b.x-b.w/2,b.x+b.w/2)>0.5)return true;
  if(near(b.y+b.h,a.y)&&ovl(b.x-topW(b)/2,b.x+topW(b)/2,a.x-a.w/2,a.x+a.w/2)>0.5)return true;
  if((near(a.x+a.w/2,b.x-b.w/2)||near(b.x+b.w/2,a.x-a.w/2))&&ovl(a.y,a.y+a.h,b.y,b.y+b.h)>0.5)return true;
  return false;}
const collide=(a,b)=>ovl(a.x-a.w/2,a.x+a.w/2,b.x-b.w/2,b.x+b.w/2)>0.5&&ovl(a.y,a.y+a.h,b.y,b.y+b.h)>0.5;
function adjOf(ps){const adj=ps.map(()=>[]);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(touching(ps[i],ps[j])){adj[i].push(j);adj[j].push(i);}return adj;}
function rootIdx(ps){let r=-1;ps.forEach((p,i)=>{if(isBrain(p)&&(r<0||p.y>ps[r].y))r=i;});return r;}
function bfs(adj,start,allow){const seen=new Set([start]),q=[start];while(q.length){const i=q.pop();for(const j of adj[i])if(!seen.has(j)&&allow(j)){seen.add(j);q.push(j);}}return seen;}
// an engine sitting on a stack decoupler waits for it to fire
function engOn(ps,adj,i,inSet){const e=ps[i];for(const j of adj[i]){const d=ps[j];if(inSet&&!inSet.has(j))continue;if(d.t==="dec"&&near(d.y+d.h,e.y))return false;}return true;}
// the tanks an engine can drink from: everything joined to it without passing a decoupler
function feedOf(ps,adj,i,inSet){if(ps[i].t==="srb")return[i];   // a solid booster burns only what's inside it
  const s=bfs(adj,i,j=>(!inSet||inSet.has(j))&&ps[j].t!=="dec"&&ps[j].t!=="sdec");return[...s].filter(j=>ps[j].t==="tank").sort((a,b)=>a-b);}
// the decouplers that fire on the next Space: the lowest ones (mirror twins and anything level with them)
// v1.47 (Wyatt: "there's no way to change staging"): the editor's stage list sets the order. Each decoupler then carries a
// stage number p.sg (1 fires first); everything with the lowest number left fires together. Rockets without numbers
// (older saves, ready-made ones) stage by height as before: the lowest decouplers go first.
function nextDecs(ps,inSet){let sg=1e9;for(const i of inSet){const p=ps[i];if((p.t==="dec"||p.t==="sdec")&&p.sg!=null)sg=Math.min(sg,p.sg);}
  if(sg<1e8)return[...inSet].filter(i=>(ps[i].t==="dec"||ps[i].t==="sdec")&&ps[i].sg===sg);
  return nextDecsH(ps,inSet);}
// v1.47 KSP-style staging (the editor's STAGES panel): engines, decouplers and fairings carry p.sg, the stage that sets them off.
// Stage 1 is the launch (its engines light at lift-off); every Space after that sets off the next stage: its decouplers fire,
// its engines light, its fairings open. Rockets with no numbers (older saves, ready-made ones) stage by height as before.
const isStg=p=>p.t==="dec"||p.t==="sdec"||p.t==="engine"||p.t==="srb"||p.t==="fair";
const isStaged=ps=>ps.some(p=>p.sg!=null&&isStg(p));
function nextStgNo(ps,cur,inSet){let n=null;(inSet?[...inSet]:ps.keys&&[...ps.keys()]).forEach(i=>{const p=ps[i];if(isStg(p)&&p.sg!=null&&p.sg>cur&&!(p.t==="fair"&&p.open)&&(n==null||p.sg<n))n=p.sg;});return n;}
function nextDecsH(ps,inSet){let lo=1e9;for(const i of inSet){const p=ps[i];if(p.t==="dec"||p.t==="sdec")lo=Math.min(lo,p.y+p.h/2);}
  if(lo>1e8)return[];return[...inSet].filter(i=>(ps[i].t==="dec"||ps[i].t==="sdec")&&Math.abs(ps[i].y+ps[i].h/2-lo)<3);}
// fire decouplers: what stays joined to the probe without crossing them, and the pieces that fall away
function split(ps,adj,inSet,decs,root){const D=new Set(decs);
  const keep=bfs(adj,root,j=>inSet.has(j)&&!D.has(j));
  const rest=[...inSet].filter(i=>!keep.has(i)),restS=new Set(rest),pieces=[],done=new Set();
  for(const i of rest)if(!done.has(i)){const c=bfs(adj,i,j=>restS.has(j));c.forEach(j=>done.add(j));pieces.push(c);}
  return{keep,pieces};}
// stage-by-stage Δv: burn until whatever the next decoupler drops has run dry, drop it, repeat
// which fuel an engine burns: the kerosene workhorses (Wren, Mule, Bison), your engine = what you last tested on the stand,
// a saved engine = what it was saved with, the rest hydrogen
function engFuel(p){const k=engKey(p);return ENG[k].fuel?ENG[k].fuel:k==="lib"?(p.n&&p.n.fuel)||"h2":k==="stand"&&typeof engineNums==="function"?engineNums().fuel||"h2":"h2";}
// mark each tank with the fuel of the engines it feeds (a tank shared by two kinds takes the denser one). In flight the marks are
// kept (a dropped tank keeps what's in it); in the editor they're redone, since engines get swapped.
function tagTanks(ps,adj,redo){const all=new Set(ps.keys());if(redo)for(const p of ps)if(p.t==="tank")delete p.fk;
  ps.forEach((p,i)=>{if(p.t!=="engine")return;const k=engFuel(p);if(k==="h2")return;
    for(const j of feedOf(ps,adj,i,all)){const q=ps[j];if(q.t==="tank"&&(!q.fk||RHO_FUEL[k]>RHO_FUEL[q.fk]))q.fk=k;}});}
function analyze(ps,_eng,fuel){
  const out={stages:[],total:0,warn:[],root:rootIdx(ps),m0:0,H:0,mass:0};
  if(!ps.length){out.warn.push("Drag parts in from the left to build a rocket.");return out;}
  if(out.root<0){out.warn.push("Add a probe core. It's the brain, and the rocket is built around it.");return out;}
  const adj=adjOf(ps),all=bfs(adj,out.root,()=>true);tagTanks(ps,adj,!(typeof FLT!=="undefined"&&FLT.on));
  const loose=ps.length-all.size;if(loose)out.warn.push(`${loose} part${loose>1?"s aren't":" isn't"} attached (parked, shown faded) and will stay behind at launch.`);
  const F=ps.map((p,i)=>hasProp(p)?(fuel?fuel[i]:capOf(p)):0);
  let S=all,first=true,lo=1e9,hi=-1e9;for(const i of all){lo=Math.min(lo,ps[i].y);hi=Math.max(hi,ps[i].y+ps[i].h);}out.H=(hi-lo)*UM;
  const massOf=set=>{let m=0;for(const i of set)m+=partMass(ps[i])+F[i];return m;};
  out.mass=massOf(all);
  const stg=isStaged(ps);let cur=1;
  for(let k=0;k<12;k++){
    // staged rockets: a Space that only lights engines (no decoupler) counts as pressed at once, so its engines join this burn
    if(stg)for(;;){const n=nextStgNo(ps,cur,S);if(n==null||[...S].some(i=>(ps[i].t==="dec"||ps[i].t==="sdec")&&ps[i].sg===n))break;cur=n;}
    const nx=stg?nextStgNo(ps,cur,S):null;
    const act=[...S].filter(i=>isEng(ps[i])&&engOn(ps,adj,i,S)&&(!stg||ps[i].sg==null||ps[i].sg<=cur)),decs=stg?(nx==null?[]:[...S].filter(i=>(ps[i].t==="dec"||ps[i].t==="sdec")&&ps[i].sg===nx)):nextDecs(ps,S);
    const sp=decs.length?split(ps,adj,S,decs,out.root):null,drop=new Set(sp?[...S].filter(i=>!sp.keep.has(i)):[]);
    const must=decs.length?act.filter(i=>drop.has(i)):act;
    const feeds=act.map(i=>feedOf(ps,adj,i,S)),m0=massOf(S);let m=m0,dv=0,t=0;
    const est=act.map(i=>engStat(ps[i])),Fsl=est.reduce((q,e)=>q+e.sl.F,0),Fv=est.reduce((q,e)=>q+e.vac.F,0),mdE=est.map(e=>e.vac.F/(e.vac.isp*G0));
    for(let it=0;it<20;it++){
      const live=act.map((e,n)=>feeds[n].reduce((s,j)=>s+F[j],0)>1e-6);
      if(!must.some((e,n)=>live[act.indexOf(e)]))break;
      // each distinct tank group drains at the rate of the engines on it
      const grp=new Map();let FT=0;act.forEach((e,n)=>{if(!live[n])return;const key=feeds[n].join(",");const g=grp.get(key)||{tanks:feeds[n],md:0};g.md+=mdE[n];FT+=est[n].vac.F;grp.set(key,g);});
      let dt=1e9,mdT=0;for(const g of grp.values()){const f=g.tanks.reduce((s,j)=>s+F[j],0);dt=Math.min(dt,f/g.md);mdT+=g.md;}
      if(!(dt<1e8)||mdT<=0)break;
      for(const g of grp.values()){const f=g.tanks.reduce((s,j)=>s+F[j],0),use=g.md*dt;for(const j of g.tanks)F[j]=Math.max(0,F[j]-use*(f>0?F[j]/f:0));}
      const m1=m-mdT*dt,ve=FT/mdT;dv+=ve*Math.log(m/Math.max(m1,1e-6));m=m1;t+=dt;}
    out.stages.push({dv,twr:(first?Fsl:Fv)/(m0*G0),burn:t,eng:act.length,m0,decs,dropKind:decs.length?(decs.some(i=>ps[i].t==="sdec")?"boosters":"stage"):null});
    out.total+=dv;
    if(!decs.length)break;
    S=sp.keep;first=false;if(stg)cur=nx;}
  out.m0=massOf(all);return out;}
// ---------- drawing (in centimetres, y up) ----------
function hazard(c,x0,y0,w,h,vert){c.save();c.beginPath();c.rect(x0,y0,w,h);c.clip();c.fillStyle="#1f232c";c.fillRect(x0,y0,w,h);c.fillStyle="#e8b923";
  const st=10;for(let k=-Math.max(w,h);k<Math.max(w,h)*2;k+=st*2){c.beginPath();if(vert){c.moveTo(x0,y0+k);c.lineTo(x0+w,y0+k+w);c.lineTo(x0+w,y0+k+w+st);c.lineTo(x0,y0+k+st);}else{c.moveTo(x0+k,y0);c.lineTo(x0+k+h,y0+h);c.lineTo(x0+k+h+st,y0+h);c.lineTo(x0+k+st,y0);}c.closePath();c.fill();}
  c.restore();c.strokeStyle="rgba(0,0,0,.5)";c.lineWidth=1.5;c.strokeRect(x0,y0,w,h);}
function metal(c,L,R,a,b,cA,cB){const g=c.createLinearGradient(L,0,R,0);g.addColorStop(0,a);g.addColorStop(0.42,cA);g.addColorStop(0.72,cB);g.addColorStop(1,b);return g;}
// cylinder lighting: dark at both edges, a soft highlight a third of the way across (light from the upper left), so a flat
// rectangle reads as a round tube
// tank finish: chosen per tank in the editor (p.sk); otherwise narrow tanks are white and wide ones orange foam
const TANK_SKINS=[["white","White"],["steel","Stainless"],["foam","Orange foam"],["black","Carbon black"],["stripes","Black & white"],["gold","Gold foil"]];
const tankSkin=p=>p.sk||(p.w>=120?"foam":"white");
const NOSE_SKINS=[["white","White"],["black","Black"],["steel","Steel"],["foam","Orange"],["gold","Gold"]];
function cyl(c,L,R,col){const g=c.createLinearGradient(L,0,R,0),sh=m=>`rgb(${col.map(v=>Math.max(0,Math.min(255,Math.round(v*m)))).join()})`;
  g.addColorStop(0,sh(0.52));g.addColorStop(0.1,sh(0.8));g.addColorStop(0.32,sh(1.07));g.addColorStop(0.48,sh(1));g.addColorStop(0.78,sh(0.76));g.addColorStop(1,sh(0.48));return g;}
// a real nozzle bell: from the throat (half-width tw at yt) it flares fast, then straightens toward the exit (half-width ew at ye).
// Top part regen-cooled (copper tubes), lower part darker; thin lines follow the cooling tubes; a lit rim at the exit.
function bell(c,x,yt,ye,tw,ew,cLow,cTop,split){const H=yt-ye,path=()=>{c.beginPath();c.moveTo(x-tw,yt);c.bezierCurveTo(x-tw-(ew-tw)*0.32,yt-H*0.22,x-ew*0.9,ye+H*0.32,x-ew,ye);
    c.lineTo(x+ew,ye);c.bezierCurveTo(x+ew*0.9,ye+H*0.32,x+tw+(ew-tw)*0.32,yt-H*0.22,x+tw,yt);c.closePath();};
  path();c.fillStyle=cyl(c,x-ew,x+ew,cLow);c.fill();c.save();c.clip();
  // v1.47 (Wyatt: "the engine models are ugly"): the hot top fades into the cooler skirt instead of a hard line, the cooling
  // tubes follow the bell's curve and are faint, and a soft highlight runs down one side so it reads as a smooth metal bell
  const sy=ye+H*(split==null?0.55:split),fade=H*0.16;
  {c.save();c.fillStyle=cyl(c,x-ew,x+ew,cTop);c.fillRect(x-ew,sy+fade*0.5,ew*2,yt-sy);
    const g=c.createLinearGradient(0,sy+fade*0.5,0,sy-fade*0.5),mid=cTop.map(v=>Math.round(v*0.8));g.addColorStop(0,`rgba(${mid},.9)`);g.addColorStop(1,`rgba(${mid},0)`);c.fillStyle=g;c.fillRect(x-ew,sy-fade*0.5,ew*2,fade);c.restore();}
  c.strokeStyle="rgba(0,0,0,.13)";c.lineWidth=Math.max(0.25,ew*0.012);for(let t=-0.88;t<=0.89;t+=0.11){c.beginPath();for(let u=0;u<=1.001;u+=0.1){const[hx,hy]=bellPt(yt,ye,tw,ew,u);u?c.lineTo(x+t*hx,hy):c.moveTo(x+t*hx,hy);}c.stroke();}
  {const g=c.createLinearGradient(x-ew,0,x+ew,0);g.addColorStop(0.18,"rgba(255,255,255,0)");g.addColorStop(0.3,"rgba(255,255,255,.16)");g.addColorStop(0.4,"rgba(255,255,255,0)");c.fillStyle=g;c.fillRect(x-ew,ye,ew*2,H);}
  c.restore();
  c.fillStyle="rgba(10,10,12,.55)";c.fillRect(x-ew,ye,ew*2,Math.max(0.6,H*0.012));c.fillStyle="rgba(235,225,210,.5)";c.fillRect(x-ew,ye+Math.max(0.6,H*0.012),ew*2,Math.max(0.5,H*0.01));}   // the exit lip
// a point on the bell's edge, u = 0 at the throat … 1 at the exit (the same curve bell() draws)
function bellPt(yt,ye,tw,ew,u){const H=yt-ye,a=1-u,P=[[tw,yt],[tw+(ew-tw)*0.32,yt-H*0.22],[ew*0.9,ye+H*0.32],[ew,ye]],b=[a*a*a,3*a*a*u,3*a*u*u,u*u*u];
  return[b[0]*P[0][0]+b[1]*P[1][0]+b[2]*P[2][0]+b[3]*P[3][0],b[0]*P[0][1]+b[1]*P[1][1]+b[2]*P[2][1]+b[3]*P[3][1]];}
// v1.46: every engine model wears a coloured badge with its initial on the powerhead (and has its own bell finish), so they're
// easy to tell apart on a rocket and in the parts menu. Your own engine is the red one.
const ENG_ID={stand:["#e5483a","Y","#fff"],lib:["#e5483a","Y","#fff"],gnat:["#e3b23c","G","#1a1a1a"],wren:["#3fbf6a","W","#08210f"],mule:["#f08a24","M","#1a1006"],
  spike:["#d0844a","S","#1a0d04"],bison:["#3f7fe0","B","#fff"],condor:["#eef1f6","C","#1b1e26"],vac:["#9a6ae0","V","#fff"],atom:["#f2d03b","A","#1a1a1a"]};
// v1.47: the big coloured badge is now a small dark plate on the thrust frame with the initial in the engine's colour
function drawEngine(c,x,y,w,h,k,noPlate){drawEngine0(c,x,y,w,h,k);const id=ENG_ID[k];if(!id||noPlate)return;
  const bw=Math.max(3,w*0.17),bh=bw*0.62,by=y+h*(k==="spike"?0.9:k==="atom"?0.905:k==="gnat"?0.78:0.885)+(k==="gnat"?0:0),r=bh*0.25;
  c.beginPath();c.moveTo(x-bw/2+r,by);c.lineTo(x+bw/2-r,by);c.quadraticCurveTo(x+bw/2,by,x+bw/2,by+r);c.lineTo(x+bw/2,by+bh-r);c.quadraticCurveTo(x+bw/2,by+bh,x+bw/2-r,by+bh);
  c.lineTo(x-bw/2+r,by+bh);c.quadraticCurveTo(x-bw/2,by+bh,x-bw/2,by+bh-r);c.lineTo(x-bw/2,by+r);c.quadraticCurveTo(x-bw/2,by,x-bw/2+r,by);c.closePath();
  c.fillStyle="#1c1e23";c.fill();c.strokeStyle=id[0];c.lineWidth=Math.max(0.2,bw*0.04);c.stroke();
  if(bh>=3){c.save();c.translate(x,by+bh*0.5);c.scale(1,-1);c.fillStyle=id[0]==="#eef1f6"?"#dfe3ea":id[0];c.font=`700 ${bh*0.72}px sans-serif`;c.textAlign="center";c.textBaseline="middle";c.fillText(id[1],0,bh*0.04);c.restore();}}
function drawEngine0(c,x,y,w,h,k){const T=y+h,dk=[46,48,54],cu=[176,108,62],ch=[150,152,158],red="#a8392d";
  const pipe=(pts,wd,col)=>{c.strokeStyle=col;c.lineWidth=wd;c.lineCap="round";c.lineJoin="round";c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke();c.lineCap="butt";
    c.strokeStyle="rgba(255,255,255,.18)";c.lineWidth=wd*0.3;c.beginPath();c.moveTo(pts[0][0]-wd*0.2,pts[0][1]+wd*0.2);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0]-wd*0.2,pts[i][1]+wd*0.2);c.stroke();};   // a lit edge so it reads as a tube
  const flange=(px,py,s,col)=>{s*=0.75;c.fillStyle=col||"#5a5e66";c.fillRect(px-s,py-s,s*2,s*2);c.fillStyle="rgba(255,255,255,.25)";c.fillRect(px-s,py+s-0.4,s*2,0.4);};
  const pipeF=(pts,wd,col,fc)=>{pipe(pts,wd,col);for(const q of pts)flange(q[0],q[1],wd*0.75,fc);};   // pipe with a bolted flange at every joint
  const valve=(px,py,s)=>{c.fillStyle=red;c.fillRect(px-s,py-s*0.7,s*2,s*1.4);c.fillStyle="rgba(0,0,0,.35)";c.fillRect(px-s,py-s*0.7,s*2,0.5);c.fillStyle="#7a7e88";c.fillRect(px-s*0.25,py+s*0.7,s*0.5,s*0.8);};   // red-painted valve actuator
  const box=(x0,y0,bw,bh,col)=>{c.fillStyle=cyl(c,x0,x0+bw,col);c.fillRect(x0,y0,bw,bh);c.fillStyle="rgba(0,0,0,.18)";c.fillRect(x0,y0,bw,0.5);c.fillRect(x0,y0+bh-0.5,bw,0.5);};
  const mount=(yb,hw)=>{c.beginPath();c.moveTo(x-w*0.36,T);c.lineTo(x+w*0.36,T);c.lineTo(x+hw,yb);c.lineTo(x-hw,yb);c.closePath();c.fillStyle=cyl(c,x-w*0.36,x+w*0.36,dk);c.fill();
    c.fillStyle="#2a2c31";c.fillRect(x-hw*0.8,yb-1.6,hw*1.6,1.6);};   // thrust frame and the gimbal bearing under it
  // two gimbal actuators: a fat cylinder from the thrust frame and a shiny rod down to a lug on the bell
  const struts=(yt,tw)=>{for(const sd of[-1,1]){const ax=x+sd*w*0.3,ay=T-1,bx=x+sd*(tw+w*0.04),by=yt-h*0.08,mx=ax+(bx-ax)*0.55,my=ay+(by-ay)*0.55;
    pipe([[ax,ay],[mx,my]],Math.max(1.2,w*0.05),"#3a3d44");pipe([[mx,my],[bx,by]],Math.max(0.6,w*0.022),"#c9ccd1");flange(bx,by,Math.max(0.5,w*0.02),"#2a2c31");}};
  // stiffener bands round the bell (the RS-25's "hatbands"), and an optional coloured band at the exit
  const bands=(yt,tw,ew,us,col,bh)=>{for(const u of us){const[hx,hy]=bellPt(yt,y,tw,ew,u);c.fillStyle=cyl(c,x-hx,x+hx,col);c.fillRect(x-hx,hy-bh/2,hx*2,bh);c.fillStyle="rgba(255,255,255,.12)";c.fillRect(x-hx,hy+bh/2-0.3,hx*2,0.3);}};
  const exitBand=(ew,col,bh)=>{c.fillStyle=cyl(c,x-ew,x+ew,col);c.fillRect(x-ew,y,ew*2,bh);c.fillStyle="rgba(0,0,0,.3)";c.fillRect(x-ew,y+bh,ew*2,0.4);};
  const cables=(yt,tw,ew)=>{c.strokeStyle="rgba(10,10,12,.7)";c.lineWidth=Math.max(0.35,w*0.012);for(const sd of[-1,1]){c.beginPath();for(let u=0.05;u<=0.97;u+=0.08){const[hx,hy]=bellPt(yt,y,tw,ew,u);const px=x+sd*hx*0.82;u<0.1?c.moveTo(px,hy):c.lineTo(px,hy);}c.stroke();}};
  if(k==="gnat"){   // tiny thruster: a gold-foil valve block and a short shiny bell
    const yt=y+h*0.55;mount(y+h*0.86,w*0.14);box(x-w*0.22,y+h*0.6,w*0.44,h*0.26,[196,160,70]);
    c.fillStyle="rgba(255,240,180,.25)";c.fillRect(x-w*0.22,y+h*0.72,w*0.44,0.6);valve(x+w*0.28,y+h*0.7,w*0.07);
    bell(c,x,yt,y,w*0.09,w*0.36,[150,152,160],[200,204,212],0.6);bands(yt,w*0.09,w*0.36,[0.5],[120,122,130],0.6);return;}
  if(k==="spike"){   // aerospike: a ring of small chambers round the top, and a plug tapering down; the air outside is its "bell"
    mount(y+h*0.9,w*0.44);c.fillStyle=cyl(c,x-w*0.48,x+w*0.48,[70,72,80]);c.fillRect(x-w*0.48,y+h*0.7,w*0.96,h*0.2);   // the chamber ring
    pipe([[x-w*0.46,y+h*0.86],[x+w*0.46,y+h*0.86]],Math.max(1,w*0.03),"#8a8e98");for(let q=-0.36;q<=0.37;q+=0.24)flange(x+q*w,y+h*0.86,w*0.02);   // the feed manifold round the ring
    c.fillStyle="#1b1d22";for(let q=-0.4;q<=0.41;q+=0.16)c.fillRect(x+q*w-1,y+h*0.68,2,2);valve(x-w*0.3,y+h*0.95,w*0.04);valve(x+w*0.3,y+h*0.95,w*0.04);
    c.beginPath();c.moveTo(x-w*0.44,y+h*0.7);c.bezierCurveTo(x-w*0.4,y+h*0.4,x-w*0.22,y+h*0.12,x-w*0.16,y);c.lineTo(x+w*0.16,y);c.bezierCurveTo(x+w*0.22,y+h*0.12,x+w*0.4,y+h*0.4,x+w*0.44,y+h*0.7);c.closePath();
    c.fillStyle=cyl(c,x-w*0.44,x+w*0.44,[176,108,62]);c.fill();c.save();c.clip();c.strokeStyle="rgba(0,0,0,.2)";c.lineWidth=0.5;
    for(let t=-0.9;t<=0.9;t+=0.15){c.beginPath();c.moveTo(x+t*w*0.44,y+h*0.7);c.lineTo(x+t*w*0.16,y);c.stroke();}
    c.fillStyle="rgba(60,30,10,.35)";for(const q of[0.3,0.55])c.fillRect(x-w*0.5,y+h*q,w,0.8);c.restore();
    c.fillStyle="rgba(40,40,46,.9)";c.fillRect(x-w*0.16,y,w*0.32,1.6);return;}
  if(k==="condor"){   // full-flow methane engine (Raptor-style): two big pumps either side, thick hot-gas ducts, gimbal struts,
    // blue-capped valve housings, a stubby dark bell with a bright rim
    const yt=y+h*0.6,tw=w*0.08,ew=w*0.46;mount(y+h*0.92,w*0.14);
    for(const sd of[-1,1]){box(x+sd*w*0.17-(sd<0?w*0.16:0),y+h*0.64,w*0.16,h*0.26,[150,154,162]);box(x+sd*w*0.19-(sd<0?w*0.12:0),y+h*0.86,w*0.12,h*0.04,[70,110,170]);
      pipeF([[x+sd*w*0.25,y+h*0.64],[x+sd*w*0.25,y+h*0.6],[x+sd*w*0.1,y+h*0.58]],Math.max(1.6,w*0.05),"#565a63");pipe([[x+sd*w*0.22,y+h*0.86],[x+sd*w*0.07,y+h*0.82]],2.2,"#9a9ea8");}
    box(x-w*0.11,yt,w*0.22,h*0.3,[170,172,178]);pipeF([[x-w*0.06,y+h*0.9],[x-w*0.06,y+h*0.8],[x+w*0.04,y+h*0.76]],Math.max(0.8,w*0.025),"#7a7e88");
    bell(c,x,yt,y,tw,ew,[150,156,166],[214,186,160],0.82);struts(yt,tw);cables(yt,tw,ew);c.fillStyle="rgba(230,232,236,.7)";c.fillRect(x-ew,y,ew*2,1.2);return;}
  if(k==="atom"){   // nuclear: a fat reactor drum (with the radiation sign), shielding on top, one pump, then a long bell
    const yt=y+h*0.5,tw=w*0.06,ew=w*0.44;mount(y+h*0.96,w*0.18);box(x-w*0.3,y+h*0.9,w*0.6,h*0.04,[60,62,68]);
    box(x-w*0.24,y+h*0.6,w*0.48,h*0.3,[150,154,160]);c.fillStyle="rgba(0,0,0,.18)";for(let q=0.64;q<0.9;q+=0.05)c.fillRect(x-w*0.24,y+h*q,w*0.48,0.5);
    for(const sd of[-1,1])box(x+sd*w*0.24-(sd<0?w*0.05:0),y+h*0.62,w*0.05,h*0.26,[110,114,122]);   // control-drum housings
    const cx=x,cy=y+h*0.75,R=w*0.12;c.fillStyle="#f2c230";c.beginPath();c.arc(cx,cy,R,0,6.2832);c.fill();c.fillStyle="#1d1d1d";
    for(let a=0;a<3;a++){const a0=a*2.094+Math.PI/2-0.52;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,R*0.85,a0,a0+1.05);c.closePath();c.fill();}
    c.fillStyle="#f2c230";c.beginPath();c.arc(cx,cy,R*0.24,0,6.2832);c.fill();c.fillStyle="#1d1d1d";c.beginPath();c.arc(cx,cy,R*0.14,0,6.2832);c.fill();
    box(x-w*0.08,yt,w*0.16,h*0.1,ch);box(x+w*0.12,y+h*0.52,w*0.1,h*0.07,[120,124,132]);pipeF([[x+w*0.17,y+h*0.59],[x+w*0.17,y+h*0.62]],Math.max(0.8,w*0.03),"#7a7e88");
    bell(c,x,yt,y,tw,ew,[58,60,66],[96,98,106],0.75);bands(yt,tw,ew,[0.35,0.6,0.82],[72,74,80],1);return;}
  if(k==="vac"){   // vacuum engine (MVac-style): small regen chamber on top, then a huge, thin, dark radiatively cooled extension
    const yt=y+h*0.74,tw=w*0.05,ew=w*0.47;mount(y+h*0.92,w*0.1);box(x+w*0.06,y+h*0.76,w*0.12,h*0.13,[120,124,132]);
    box(x-w*0.09,yt,w*0.18,h*0.18,ch);valve(x-w*0.14,y+h*0.84,w*0.03);
    bell(c,x,yt,y,tw,ew,[86,70,124],[176,120,96],0.85);
    {const g=c.createLinearGradient(0,yt-(yt-y)*0.15,0,yt-(yt-y)*0.45);g.addColorStop(0,"rgba(150,90,170,.18)");g.addColorStop(1,"rgba(150,90,170,0)");   // heat tint where the extension starts
      c.save();c.beginPath();c.moveTo(x-tw,yt);for(let u=0;u<=1.001;u+=0.1){const[hx,hy]=bellPt(yt,y,tw,ew,u);c.lineTo(x-hx,hy);}for(let u=1;u>=-0.001;u-=0.1){const[hx,hy]=bellPt(yt,y,tw,ew,u);c.lineTo(x+hx,hy);}c.closePath();c.clip();c.fillStyle=g;c.fillRect(x-ew,y,ew*2,yt-y);c.restore();}
    bands(yt,tw,ew,[0.3,0.55,0.8],[40,42,48],0.9);
    pipeF([[x+w*0.14,y+h*0.78],[x+w*0.2,y+h*0.7]],1.6,"#3a3d44");return;}
  if(k==="bison"){   // big staged-combustion engine (BE-4 / Raptor style): squat, dense plumbing, two pumps, gimbal struts
    const yt=y+h*0.62,tw=w*0.075,ew=w*0.44;mount(y+h*0.9,w*0.12);
    box(x-w*0.3,y+h*0.68,w*0.14,h*0.2,[128,132,140]);box(x+w*0.16,y+h*0.68,w*0.14,h*0.2,[128,132,140]);
    box(x-w*0.1,yt,w*0.2,h*0.26,ch);
    pipeF([[x-w*0.23,y+h*0.68],[x-w*0.23,y+h*0.64],[x-w*0.1,y+h*0.64]],2.4,"#6c707a");pipeF([[x+w*0.23,y+h*0.68],[x+w*0.23,y+h*0.64],[x+w*0.1,y+h*0.64]],2.4,"#6c707a");
    pipe([[x-w*0.2,y+h*0.84],[x-w*0.06,y+h*0.8]],1.8,"#8a8e98");pipe([[x+w*0.2,y+h*0.84],[x+w*0.06,y+h*0.8]],1.8,"#8a8e98");
    valve(x-w*0.06,y+h*0.86,w*0.03);valve(x+w*0.25,y+h*0.9,w*0.03);
    bell(c,x,yt,y,tw,ew,[36,52,88],[150,110,84],0.8);bands(yt,tw,ew,[0.45,0.75],[30,42,72],1.2);struts(yt,tw);cables(yt,tw,ew);return;}
  if(k==="wren"){   // small pressure-fed engine: no pump, just valves and a helium line; short bell
    const yt=y+h*0.62,tw=w*0.06,ew=w*0.3;mount(y+h*0.88,w*0.1);box(x-w*0.08,yt,w*0.16,h*0.26,ch);
    box(x+w*0.1,y+h*0.72,w*0.1,h*0.1,[100,104,112]);pipeF([[x+w*0.15,y+h*0.72],[x+w*0.08,y+h*0.68]],1.4,"#7a7e88");
    pipeF([[x-w*0.2,y+h*0.86],[x-w*0.14,y+h*0.76],[x-w*0.08,y+h*0.74]],1.2,"#8a8e98");valve(x-w*0.2,y+h*0.8,w*0.05);
    bell(c,x,yt,y,tw,ew,[150,100,52],[206,156,104],0.78);bands(yt,tw,ew,[0.6],[112,72,38],0.9);return;}
  if(k==="mule"){   // gas-generator kerosene engine (Merlin-like): turbopump on one side, its exhaust pipe down the bell, gimbal struts
    const yt=y+h*0.7,sd=-1,tw=w*0.065,ew=w*0.4;mount(y+h*0.92,w*0.1);
    box(x-w*0.1,yt,w*0.2,h*0.22,ch);c.fillStyle="rgba(0,0,0,.2)";c.fillRect(x-w*0.1,y+h*0.86,w*0.2,1);   // chamber + injector-head line
    box(x+sd*w*0.12-w*0.14,y+h*0.72,w*0.14,h*0.16,[120,124,132]);                                         // turbopump
    pipeF([[x+w*0.11,y+h*0.9],[x+w*0.2,y+h*0.84],[x+w*0.2,y+h*0.76],[x+w*0.1,y+h*0.74]],Math.max(1,w*0.04),"#9aa0a8");valve(x+w*0.2,y+h*0.8,w*0.035);
    bell(c,x,yt,y,tw,ew,[44,44,46],cu,0.8);bands(yt,tw,ew,[0.5,0.78],[226,120,36],1.1);struts(yt,tw);
    pipe([[x+sd*w*0.2,y+h*0.72],[x+sd*w*0.24,y+h*0.5],[x+sd*w*0.34,y+h*0.1]],2.4,"#2c2e33");flange(x+sd*w*0.24,y+h*0.5,1.4);   // gas-generator exhaust
    pipe([[x+sd*w*0.13,y+h*0.78],[x+sd*w*0.08,y+h*0.75]],1.6,"#8a8e98");return;}
  // your engine / saved engines: staged-combustion hydrogen engine (RS-25 style). A busy powerhead: two turbopumps, a big bent
  // hot-gas duct with flanges, red valve actuators; a short chamber, then a near-black bell ringed with stiffener bands, cables
  // running down it, and a red band round the exit
  const yt=y+h*0.64,tw=w*0.07,ew=w*0.4;mount(y+h*0.94,w*0.12);
  box(x-w*0.14,y+h*0.68,w*0.28,h*0.24,ch);                                                           // main injector / powerhead
  box(x-w*0.36,y+h*0.66,w*0.16,h*0.2,[150,152,160]);box(x+w*0.2,y+h*0.66,w*0.15,h*0.18,[140,142,150]);   // high-pressure pumps
  pipeF([[x-w*0.2,y+h*0.88],[x-w*0.4,y+h*0.86],[x-w*0.44,y+h*0.76],[x-w*0.36,y+h*0.66]],Math.max(1.6,w*0.06),"#a4a8b0",red);   // the big bent duct
  pipeF([[x+w*0.14,y+h*0.9],[x+w*0.3,y+h*0.88],[x+w*0.3,y+h*0.84]],Math.max(1,w*0.035),"#8a8e98");
  pipe([[x-w*0.12,y+h*0.7],[x-w*0.2,y+h*0.74]],Math.max(0.6,w*0.02),"#3a3d44");pipe([[x+w*0.12,y+h*0.72],[x+w*0.2,y+h*0.78]],Math.max(0.6,w*0.02),"#3a3d44");
  valve(x+w*0.08,y+h*0.9,w*0.035);valve(x-w*0.26,y+h*0.72,w*0.03);valve(x+w*0.3,y+h*0.74,w*0.03);valve(x-w*0.05,y+h*0.72,w*0.025);
  box(x-w*0.09,yt,w*0.18,h*0.05,ch);
  bell(c,x,yt,y,tw,ew,[34,35,40],[58,60,66],0.92);bands(yt,tw,ew,[0.34,0.6,0.82],[50,52,58],1);cables(yt,tw,ew);exitBand(ew,[190,44,36],2.2);
  struts(yt,tw);}
// frost on a cryogenic tank: the super-cold propellant freezes the air's moisture onto the skin, so it shows exactly up to
// the fuel level. k (0..1) fades it as it flakes off on the way up. Patchy streaks from a fixed hash, so it doesn't flicker.
function frost(c,L,w,y,h,fuel,k){const fh=h*Math.max(0,Math.min(1,fuel==null?1:fuel));if(fh<2)return;c.save();c.beginPath();c.rect(L,y,w,fh);c.clip();
  c.fillStyle=`rgba(236,242,248,${0.55*k})`;c.fillRect(L,y,w,fh);
  for(let i=0,n=w*fh/14;i<n;i++){const xx=L+(i*37.7)%w,yy=y+(i*53.3)%fh,a=(0.15+((i*7)%5)*0.06)*k;c.fillStyle=i%3?`rgba(255,255,255,${a})`:`rgba(170,185,200,${a*0.8})`;c.fillRect(xx,yy,0.6+(i%3)*0.5,2+(i%4)*2.5);}
  c.fillStyle=`rgba(255,255,255,${0.5*k})`;c.fillRect(L,y+fh-0.8,w,0.8);c.restore();}
function drawPart(c,p,o={}){
  const{x,y,w,h,f}=p,L=x-w/2,R=x+w/2,T=y+h;
  c.lineJoin="round";
  switch(p.t){
    case"tank":{const sk=tankSkin(p);
      if(p.v==="ball"){   // fuel spheres in an open frame (Apollo lander / Starliner style): one ball per tank-width of height
        const n=Math.max(1,Math.round(h/w)),r=Math.min(w/2,h/n/2)*0.94,col=SKIN_COL[sk]||SKIN_COL.white,sh=m=>`rgb(${col.map(v=>Math.max(0,Math.min(255,Math.round(v*m)))).join()})`;
        c.strokeStyle="#5d636c";c.lineWidth=Math.max(1,w*0.04);c.strokeRect(L+1,y+1,w-2,h-2);c.lineWidth=Math.max(0.6,w*0.02);c.beginPath();c.moveTo(L+1,y+1);c.lineTo(R-1,T-1);c.moveTo(R-1,y+1);c.lineTo(L+1,T-1);c.stroke();
        for(let i=0;i<n;i++){const cy=y+h*(i+0.5)/n,g=c.createRadialGradient(x-r*0.35,cy+r*0.35,r*0.1,x,cy,r);g.addColorStop(0,sh(1.12));g.addColorStop(0.7,sh(0.86));g.addColorStop(1,sh(0.5));
          c.fillStyle=g;c.beginPath();c.arc(x,cy,r,0,6.2832);c.fill();c.strokeStyle="rgba(0,0,0,.25)";c.lineWidth=0.6;c.beginPath();c.moveTo(x-r,cy);c.lineTo(x+r,cy);c.stroke();}   // weld seam round the middle
        c.fillStyle="#3a3f46";c.fillRect(L,y,w,2);c.fillRect(L,T-2,w,2);break;}   // mounting rings top and bottom
      if(sk==="black"||sk==="gold"||sk==="stripes"){c.fillStyle=cyl(c,L,R,SKIN_COL[sk]);c.fillRect(L,y,w,h);
        if(sk==="black"){c.fillStyle="rgba(255,255,255,.04)";for(let yy=y+3;yy<T;yy+=3)c.fillRect(L,yy,w,0.6);for(let xx=L+2;xx<R;xx+=4)c.fillRect(xx,y,0.5,h);}   // carbon weave
        if(sk==="stripes"){const bh=Math.max(10,w*0.5);let i=0;c.fillStyle=cyl(c,L,R,[30,32,36]);for(let yy=y;yy<T;yy+=bh,i++)c.fillRect(i%2?x:L,yy,w/2,Math.min(bh,T-yy));}   // Saturn-style roll pattern: you can see it spin
        if(sk==="gold"){c.save();c.beginPath();c.rect(L,y,w,h);c.clip();for(let i=0,n=w*h/60;i<n;i++){const px=L+(i*41.3)%w,py=y+(i*29.7)%h;c.fillStyle=i%2?"rgba(255,240,170,.25)":"rgba(90,60,10,.18)";c.beginPath();c.moveTo(px,py);c.lineTo(px+3+(i%4),py+1.5);c.lineTo(px+1,py+3+(i%3));c.closePath();c.fill();}c.restore();}   // crinkled foil
        c.fillStyle="rgba(0,0,0,.2)";c.fillRect(L,y+2.5,w,1);c.fillRect(L,T-3.5,w,1);if(o.frost>0&&sk!=="gold")frost(c,L,w,y,h,o.fuel,o.frost);break;}
      if(sk==="steel"){   // bare stainless steel, Starship-style: a sharp mirror highlight, brushed grain, welded rings with a slight heat tint
        const g=c.createLinearGradient(L,0,R,0);[[0,"#4b4f56"],[0.07,"#8f949c"],[0.2,"#dfe2e6"],[0.28,"#fbfcfd"],[0.34,"#c7cbd1"],[0.55,"#8d9299"],[0.8,"#b3b7be"],[0.92,"#7d8289"],[1,"#41454c"]].forEach(([q,cc])=>g.addColorStop(q,cc));
        c.fillStyle=g;c.fillRect(L,y,w,h);
        for(let i=0;i<w*1.4;i++){const xx=L+(i*37.31)%w;c.fillStyle=i%3?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)";c.fillRect(xx,y,0.5,h);}
        let n=0;for(let yy=y+22;yy<T-8;yy+=22,n++){c.fillStyle=n%2?"rgba(190,140,90,.05)":"rgba(120,140,170,.05)";c.fillRect(L,yy-22,w,22);
          c.fillStyle="rgba(0,0,0,.22)";c.fillRect(L,yy,w,0.7);c.fillStyle="rgba(255,255,255,.18)";c.fillRect(L,yy+0.7,w,0.5);}
        c.fillStyle="rgba(0,0,0,.3)";c.fillRect(L,y+2,w,1);c.fillRect(L,T-3,w,1);if(o.frost>0)frost(c,L,w,y,h,o.fuel,o.frost);break;}
      const foam=sk==="foam";
      // white: painted Falcon-style skin; foam: SLS-style orange spray-on insulation (mottled)
      c.fillStyle=cyl(c,L,R,foam?[196,96,36]:[236,238,241]);c.fillRect(L,y,w,h);
      if(foam){   // like the SLS core in sunlight: burnt orange, uneven where the foam was sprayed in passes, faint vertical streaks
        for(let i=0;i<w*0.6;i++){const xx=L+(i*41.7)%w,a=0.03+((i*7)%5)*0.012;c.fillStyle=i%2?`rgba(90,35,5,${a})`:`rgba(255,190,130,${a*0.7})`;c.fillRect(xx,y,1+(i%3),h);}
        for(let i=0,n=w*h/700;i<n;i++){const px=L+(i*73.7)%w,py=y+(i*37.3)%h;c.fillStyle=i%2?"rgba(100,40,8,.045)":"rgba(255,200,150,.04)";c.beginPath();c.ellipse(px,py,4+(i%4),2+(i%3),0,0,6.2832);c.fill();}
        if(h>=90){const ib=Math.min(16,h*0.12);c.fillStyle=cyl(c,L,R,[178,84,30]);c.fillRect(L,T-ib-3,w,ib);   // intertank: ribbed band near the top
          c.fillStyle="rgba(70,25,0,.22)";for(let xx=L+2;xx<R;xx+=3.2)c.fillRect(xx,T-ib-3,0.9,ib);c.fillStyle="rgba(0,0,0,.2)";c.fillRect(L,T-ib-3,w,0.8);c.fillRect(L,T-3,w,0.8);}}
      c.fillStyle="rgba(0,0,0,.2)";c.fillRect(L,y+2.5,w,1);c.fillRect(L,T-3.5,w,1);                 // dome welds at each end
      c.fillStyle="rgba(0,0,0,.06)";for(let yy=y+40;yy<T-15;yy+=40)c.fillRect(L,yy,w,0.8);           // barrel-section welds
      if(h>=45){const rx=L+w*0.74;c.fillStyle=cyl(c,rx,rx+4,foam?[170,88,36]:[205,208,214]);c.fillRect(rx,y+5,4,h-10);   // cable raceway running down the side
        c.fillStyle="rgba(0,0,0,.18)";c.fillRect(rx+4,y+5,0.8,h-10);}
      if(o.frost>0)frost(c,L,w,y,h,o.fuel,o.frost);
      break;}
    case"probe":if(p.v==="cabin"){   // Apollo-style lander cabin: gold-foil base, grey angled crew cabin with triangle windows, hatch on top
        c.beginPath();c.moveTo(L,y);c.lineTo(R,y);c.lineTo(R,y+h*0.6);c.lineTo(x+w*0.25,T-2);c.lineTo(x-w*0.25,T-2);c.lineTo(L,y+h*0.6);c.closePath();c.fillStyle=cyl(c,L,R,[188,190,196]);c.fill();
        c.save();c.clip();c.fillStyle=cyl(c,L,R,SKIN_COL.gold);c.fillRect(L,y,w,h*0.32);
        for(let i=0,n=w*h*0.32/50;i<n;i++){const px=L+(i*41.3)%w,py=y+(i*29.7)%(h*0.32);c.fillStyle=i%2?"rgba(255,240,170,.3)":"rgba(90,60,10,.2)";c.beginPath();c.moveTo(px,py);c.lineTo(px+3+(i%4),py+1.5);c.lineTo(px+1,py+3+(i%3));c.closePath();c.fill();}
        c.strokeStyle="rgba(0,0,0,.15)";c.lineWidth=0.5;for(let yy=y+h*0.4;yy<T;yy+=h*0.12){c.beginPath();c.moveTo(L,yy);c.lineTo(R,yy);c.stroke();}c.restore();
        c.fillStyle="#1d2128";for(const sd of[-1,1]){c.beginPath();c.moveTo(x+sd*w*0.06,y+h*0.62);c.lineTo(x+sd*w*0.24,y+h*0.62);c.lineTo(x+sd*w*0.06,y+h*0.78);c.closePath();c.fill();}
        c.fillStyle=cyl(c,x-w*0.25,x+w*0.25,[120,124,132]);c.fillRect(x-w*0.25,T-2.4,w*0.5,2.4);
        c.strokeStyle="#c9ccd1";c.lineWidth=0.7;c.beginPath();c.moveTo(R-w*0.12,y+h*0.6);c.lineTo(R-w*0.02,y+h*0.86);c.stroke();c.beginPath();c.arc(R-w*0.02,y+h*0.86,w*0.06,Math.PI*0.9,Math.PI*1.9);c.stroke();break;}   // antenna dish
    {   // avionics ring in black carbon composite (v1.47: more going on): bright metal rims with bolts, a gold-foil band, an access
      // hatch with a handle, a row of vents, a green status light and a little whip antenna
      c.fillStyle=cyl(c,L,R,[44,46,52]);c.fillRect(L,y,w,h);
      c.fillStyle="rgba(255,255,255,.05)";for(let yy=y+3;yy<T;yy+=3)c.fillRect(L,yy,w,0.6);
      c.fillStyle=cyl(c,L,R,[150,154,162]);c.fillRect(L,y,w,Math.max(1.2,h*0.1));c.fillRect(L,T-Math.max(1.2,h*0.1),w,Math.max(1.2,h*0.1));
      c.fillStyle="rgba(30,32,36,.8)";for(let q=L+w*0.05;q<R;q+=Math.max(3,w/12)){c.fillRect(q,y+h*0.035,0.6,0.6);c.fillRect(q,T-h*0.065,0.6,0.6);}
      c.fillStyle=cyl(c,L,R,[200,160,64]);c.fillRect(L,y+h*0.16,w,h*0.12);c.fillStyle="rgba(255,240,190,.25)";for(let q=L+2;q<R;q+=w/9)c.fillRect(q,y+h*0.16,0.5,h*0.12);   // foil band
      c.strokeStyle="rgba(255,255,255,.28)";c.lineWidth=0.8;c.strokeRect(x+w*0.06,y+h*0.36,w*0.24,h*0.46);c.fillStyle="#8a8f98";c.fillRect(x+w*0.14,y+h*0.57,w*0.08,Math.max(0.6,h*0.04));   // hatch + handle
      c.fillStyle="rgba(0,0,0,.45)";for(const q of[-0.34,-0.27,-0.2])c.fillRect(x+w*q,y+h*0.62,Math.max(1,w*0.04),h*0.14);   // vents
      c.fillStyle="#4fe08a";c.beginPath();c.arc(x-w*0.38,y+h*0.45,Math.max(0.7,w*0.025),0,6.2832);c.fill();
      c.strokeStyle="#c9ccd1";c.lineWidth=Math.max(0.4,w*0.012);c.beginPath();c.moveTo(R-w*0.1,T);c.lineTo(R-w*0.04,T+h*0.35);c.stroke();break;}
    case"nose":{   // payload fairing: a smooth white ogive with the split line down the middle (or a straight cone: SLS booster tips)
      c.beginPath();if(p.ns==="cone"){c.moveTo(L,y);c.lineTo(x-w*0.04,T-1.5);c.quadraticCurveTo(x,T+0.5,x+w*0.04,T-1.5);c.lineTo(R,y);c.closePath();}else{c.moveTo(L,y);c.bezierCurveTo(L,y+h*0.42,x-w*0.22,y+h*0.86,x-w*0.03,T-0.6);c.quadraticCurveTo(x,T+0.3,x+w*0.03,T-0.6);c.bezierCurveTo(x+w*0.22,y+h*0.86,R,y+h*0.42,R,y);c.closePath();}
      c.fillStyle=cyl(c,L,R,p.v!=="cockpit"&&SKIN_COL[p.sk]||[240,241,244]);c.fill();c.save();c.clip();
      if(p.v==="cockpit"){   // a crew cockpit: a wrap-around windscreen, a red cheat line and black tiles underneath
        const wy=y+h*0.52,g=c.createLinearGradient(0,wy,0,wy+h*0.13);g.addColorStop(0,"#0f1218");g.addColorStop(1,"#3b4656");c.fillStyle=g;c.fillRect(L,wy,w,h*0.13);
        c.fillStyle="rgba(255,255,255,.35)";for(const q of[-0.25,0,0.25])c.fillRect(x+q*w-0.4,wy,0.8,h*0.13);c.fillStyle="#c23b2e";c.fillRect(L,y+h*0.3,w,Math.max(1,h*0.025));
        c.fillStyle="#1c1e22";c.fillRect(L,y,w,h*0.08);}
      c.fillStyle="rgba(0,0,0,.18)";c.fillRect(x-0.5,y,1,h);c.fillStyle="rgba(0,0,0,.25)";c.fillRect(L,y,w,2);
      c.fillStyle="rgba(0,0,0,.05)";c.fillRect(L,y+h*0.3,w,0.8);c.restore();break;}
    case"adapter":{   // carbon interstage cone
      const tw2=topW(p)/2;c.beginPath();c.moveTo(L,y);c.lineTo(x-tw2,T);c.lineTo(x+tw2,T);c.lineTo(R,y);c.closePath();c.fillStyle=cyl(c,L,R,[46,48,54]);c.fill();
      c.save();c.clip();c.fillStyle="rgba(255,255,255,.05)";for(let yy=y+3;yy<T;yy+=3)c.fillRect(L,yy,w,0.6);c.restore();
      c.fillStyle="rgba(255,255,255,.16)";c.fillRect(L,y,w,1.2);c.fillRect(x-tw2,T-1.2,tw2*2,1.2);break;}
    case"engine":{const g=clusterGeo(p);if(g.k===1){drawEngine(c,x,y,w,h,engKey(p));break;}
      for(const[ex,row]of g.xs.slice().sort((a,b)=>b[1]-a[1])){c.save();if(row&&"filter"in c)c.filter="brightness(0.55)";else if(row)c.globalAlpha=0.6;   // the back row is in shadow
        drawEngine(c,x+ex,y+(row?g.eh*0.04:0),g.ew,g.eh*(row?0.96:1),engKey(p),!!row);c.restore();}
      c.fillStyle=cyl(c,L,R,[78,81,88]);c.fillRect(L,T-g.plate,w,g.plate);c.fillStyle="rgba(0,0,0,.4)";c.fillRect(L,T-g.plate,w,0.8);c.fillStyle="rgba(255,255,255,.18)";c.fillRect(L,T-0.6,w,0.6);
      c.fillStyle="rgba(20,22,26,.8)";for(let q=L+w*0.04;q<R;q+=Math.max(4,w/24))c.fillRect(q,T-g.plate*0.55,0.7,0.7);break;}   // thrust plate on top, with a row of bolts
    case"capsule":if(p.v==="dragon"){   // Dragon-style: rounder sides, four square windows, little side thrusters, black heat shield, grey nose ring
        const tw=topW(p)/2;c.beginPath();c.moveTo(L,y+2);c.bezierCurveTo(L+w*0.02,y+h*0.6,x-tw-w*0.06,T-2,x-tw,T-2);c.lineTo(x+tw,T-2);c.bezierCurveTo(x+tw+w*0.06,T-2,R-w*0.02,y+h*0.6,R,y+2);c.closePath();
        c.fillStyle=cyl(c,L,R,[232,234,237]);c.fill();c.save();c.clip();c.fillStyle="rgba(0,0,0,.08)";c.fillRect(L,y+h*0.42,w,0.8);c.restore();
        c.fillStyle="#1d2128";for(const q of[-0.3,-0.1,0.1,0.3])c.fillRect(x+q*w-w*0.035,y+h*0.52,w*0.07,w*0.07);
        c.fillStyle="#2a2d33";for(const sd of[-1,1])for(const q of[0.25,0.32])c.fillRect(sd>0?R-w*0.06-sd*0:L+w*0.02,y+h*q,w*0.04,1.6);
        c.fillStyle="#2b2723";c.fillRect(L-0.5,y,w+1,2.5);c.fillStyle=cyl(c,x-tw,x+tw,[90,94,102]);c.fillRect(x-tw,T-2.6,tw*2,2.6);break;}
    {   // Orion-style: a blunt cone of white panels, dark heat shield underneath, two windows, docking ring on top
      const tw=topW(p)/2;c.beginPath();c.moveTo(L,y+2);c.lineTo(x-tw,T-2);c.lineTo(x+tw,T-2);c.lineTo(R,y+2);c.closePath();c.fillStyle=cyl(c,L,R,[226,228,232]);c.fill();
      c.save();c.clip();c.strokeStyle="rgba(0,0,0,.12)";c.lineWidth=0.5;for(let yy=y+6;yy<T;yy+=5){c.beginPath();c.moveTo(L,yy);c.lineTo(R,yy);c.stroke();}c.restore();
      c.fillStyle="#2b2723";c.beginPath();c.moveTo(L-0.5,y);c.lineTo(R+0.5,y);c.lineTo(R,y+2.5);c.lineTo(L,y+2.5);c.closePath();c.fill();   // heat shield
      c.fillStyle="#1d2128";for(const q of[-0.18,0.05]){const wx=x+q*w,wy=y+h*0.55;c.beginPath();c.moveTo(wx,wy);c.lineTo(wx+w*0.09,wy);c.lineTo(wx+w*0.08,wy+h*0.13);c.lineTo(wx+w*0.01,wy+h*0.13);c.closePath();c.fill();}
      c.fillStyle=cyl(c,x-tw,x+tw,[150,154,162]);c.fillRect(x-tw,T-2.4,tw*2,2.4);break;}
    case"les":{   // launch escape tower: a nose spike, the abort motor with four angled nozzles, the jettison motor and a truss
      const mw=w*0.5;c.fillStyle=cyl(c,L,R,[200,202,206]);c.beginPath();c.moveTo(L,y);c.lineTo(x-mw*0.6,y+h*0.25);c.lineTo(x+mw*0.6,y+h*0.25);c.lineTo(R,y);c.closePath();c.fill();
      c.strokeStyle="#9aa0a8";c.lineWidth=0.6;c.beginPath();c.moveTo(x-mw*0.6,y+h*0.25);c.lineTo(x+mw*0.6,y+h*0.32);c.moveTo(x+mw*0.6,y+h*0.25);c.lineTo(x-mw*0.6,y+h*0.32);c.stroke();
      c.fillStyle=cyl(c,x-mw/2,x+mw/2,[232,233,236]);c.fillRect(x-mw/2,y+h*0.32,mw,h*0.5);c.fillStyle="#2a2d33";for(const sd of[-1,1]){c.beginPath();c.moveTo(x+sd*mw/2,y+h*0.52);c.lineTo(x+sd*mw*0.85,y+h*0.47);c.lineTo(x+sd*mw/2,y+h*0.6);c.fill();}
      c.fillStyle="#c23b2e";c.fillRect(x-mw/2,y+h*0.74,mw,1.2);c.fillStyle="#d8dade";c.beginPath();c.moveTo(x-mw/2,y+h*0.82);c.lineTo(x,T);c.lineTo(x+mw/2,y+h*0.82);c.fill();break;}
    case"srb":{const cy=y+SRB_NZ;   // SLS-style solid booster: white steel segments, an aft skirt, and a gimballed nozzle
      bell(c,x,cy-2,y,w*0.12,w*0.36,[60,62,68],[92,88,84]);
      const bk=boostKey(p),body=p.sk&&SKIN_COL[p.sk]||(bk==="sprinter"?[40,42,48]:bk==="longhorn"?[178,182,188]:[236,237,240]);   // painted (p.sk), or the model's own look: Sprinter black with yellow bands, Longhorn bare steel
      c.fillStyle=cyl(c,L,R,body);c.fillRect(L,cy,w,T-cy);
      if(p.sk==="stripes"){const bh=Math.max(10,w*0.6);let i=0;c.fillStyle=cyl(c,L,R,[30,32,36]);for(let yy=cy;yy<T;yy+=bh,i++)c.fillRect(i%2?x:L,yy,w/2,Math.min(bh,T-yy));}
      if(bk==="sprinter"&&!p.sk){c.fillStyle="#e8b923";for(const q of[0.2,0.55,0.9]){const yy=cy+(T-cy)*q;c.fillRect(L,yy-3,w,6);}}
      if(bk==="longhorn"&&!p.sk){for(let i=0;i<w*1.2;i++){const xx=L+(i*37.31)%w;c.fillStyle=i%3?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)";c.fillRect(xx,cy,0.5,T-cy);}}
      // aft skirt: flares out a little at the bottom, with the hold-down posts' bolt pads (v1.40: from the SLS booster photo)
      c.beginPath();c.moveTo(L-2,cy);c.lineTo(R+2,cy);c.lineTo(R,cy+12);c.lineTo(L,cy+12);c.closePath();c.fillStyle=cyl(c,L-2,R+2,bk==="sprinter"?[60,62,68]:[214,216,222]);c.fill();
      c.fillStyle="rgba(0,0,0,.28)";for(const q of[-0.3,0.3])c.fillRect(x+q*w-1.5,cy+1,3,3);c.fillStyle="rgba(0,0,0,.25)";c.fillRect(L,cy+12,w,1);
      c.fillStyle="rgba(0,0,0,.12)";for(const q of[16,22,28])c.fillRect(L,cy+q,w,0.8);   // stiffener rings above the skirt
      const seg=T-cy-12;for(const k of[0.25,0.5,0.75]){const yy=cy+12+seg*k;   // field joints: a raised band with a ring of pins
        c.fillStyle=cyl(c,L,R,bk==="sprinter"&&!p.sk?[70,72,80]:[188,192,198]);c.fillRect(L,yy-1.8,w,3.6);c.fillStyle="rgba(0,0,0,.35)";for(let xx=L+2;xx<R-1;xx+=4)c.fillRect(xx,yy-0.4,0.8,0.8);}
      {const ay=T-seg*0.12;c.fillStyle="rgba(0,0,0,.25)";c.fillRect(L,ay,w,1.2);c.fillStyle="#3a3d44";c.fillRect(L-1,ay-2.5,2.5,5);c.fillRect(R-1.5,ay-2.5,2.5,5);}   // forward attach ring
      c.fillStyle="rgba(255,255,255,.12)";c.fillRect(L+w*0.18,cy+12,0.8,T-cy-15);   // a highlight down the casing
      c.fillStyle="rgba(0,0,0,.3)";c.fillRect(L,T-3,w,3);c.fillStyle="rgba(235,225,210,.55)";c.fillRect(x-w*0.36,y,w*0.72,1.6);   // the nozzle's exit lip
      break;}
    case"truss":{   // open steel frame: two rails, cross braces and end rings, see-through
      c.strokeStyle="#aeb3bb";c.lineWidth=Math.max(1.2,w*0.05);c.beginPath();
      c.moveTo(L+w*0.08,y);c.lineTo(L+w*0.08,T);c.moveTo(R-w*0.08,y);c.lineTo(R-w*0.08,T);
      const n=Math.max(1,Math.round(h/(w*0.9)));for(let k=0;k<n;k++){const a=y+h*k/n,b=y+h*(k+1)/n;c.moveTo(L+w*0.08,a);c.lineTo(R-w*0.08,b);c.moveTo(R-w*0.08,a);c.lineTo(L+w*0.08,b);}c.stroke();
      c.fillStyle=cyl(c,L,R,[120,124,132]);c.fillRect(L,y,w,Math.min(3,h*0.08));c.fillRect(L,T-Math.min(3,h*0.08),w,Math.min(3,h*0.08));break;}
    case"chute":{   // parachute canister: a white drum with a rounded orange cap and a dark strap
      c.fillStyle=cyl(c,L,R,[232,234,238]);c.fillRect(L+w*0.06,y,w*0.88,h*0.7);
      c.beginPath();c.moveTo(L+w*0.06,y+h*0.68);c.quadraticCurveTo(x,T+h*0.12,R-w*0.06,y+h*0.68);c.closePath();c.fillStyle=cyl(c,L,R,[226,112,40]);c.fill();
      c.fillStyle="rgba(30,32,38,.75)";c.fillRect(L+w*0.06,y+h*0.3,w*0.88,Math.max(1,h*0.08));break;}
    case"brake":{   // airbrake (v1.47: Wyatt said it was "just a box"): a hinge block on the body, a perforated flap hinged at its top,
      // and a hydraulic ram that pushes it out into the airflow as it opens (o.brake 0..1)
      const ix=f>0?L:R,k=Math.max(0,Math.min(1,o.brake||0)),ang=k*1.05,len=h-4,th=Math.min(w*0.55,6),hx=ix+f*2,hy=T-2,dx=f*Math.sin(ang),dy=-Math.cos(ang),nx=f*Math.cos(ang),ny=Math.sin(ang);
      const P=(u,v)=>[hx+dx*len*u+nx*th*v,hy+dy*len*u+ny*th*v];
      c.fillStyle=cyl(c,L,R,[64,68,76]);c.fillRect(f>0?L:R-4,y+2,4,h-4);c.fillStyle="#2a2d33";c.fillRect(f>0?L:R-5,T-7,5,7);   // the housing it folds into, and the hinge block
      {const r0=[ix+f*2.5,y+h*0.3],r1=P(0.55,0.5);c.strokeStyle="#3a3e46";c.lineWidth=2.4;c.lineCap="round";c.beginPath();c.moveTo(r0[0],r0[1]);c.lineTo(r0[0]+(r1[0]-r0[0])*0.5,r0[1]+(r1[1]-r0[1])*0.5);c.stroke();
        c.strokeStyle="#cfd3d9";c.lineWidth=1.1;c.beginPath();c.moveTo(r0[0]+(r1[0]-r0[0])*0.45,r0[1]+(r1[1]-r0[1])*0.45);c.lineTo(r1[0],r1[1]);c.stroke();c.lineCap="butt";}   // hydraulic ram
      c.beginPath();const q=[P(0,0),P(1,0),P(1,1),P(0,1)];c.moveTo(...q[0]);for(const z of q.slice(1))c.lineTo(...z);c.closePath();
      c.fillStyle=cyl(c,Math.min(q[0][0],q[2][0]),Math.max(q[0][0],q[2][0])+1,[186,190,198]);c.fill();c.strokeStyle="rgba(0,0,0,.4)";c.lineWidth=0.6;c.stroke();
      c.fillStyle="rgba(20,22,26,.55)";for(let u=0.16;u<0.92;u+=0.12)for(const v of[0.33,0.67]){const[px,py]=P(u,v);c.beginPath();c.arc(px,py,Math.min(0.9,th*0.13),0,6.2832);c.fill();}   // perforations
      {const[ax,ay]=P(0.97,0),[bx,by]=P(0.97,1);c.strokeStyle="#e8b23a";c.lineWidth=1.4;c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.stroke();}   // yellow edge so the moving part reads
      break;}
    case"antenna":{   // folded: a closed dish (petals furled like an umbrella) on its mount; open (in space): a boom, a ribbed white dish
      // and the feed horn held at its focus by three struts
      const ix=f>0?L:R,ox=f>0?R:L,open=o.open!=null?o.open:o.legs;
      c.fillStyle=cyl(c,L,R,[70,74,82]);c.fillRect(f>0?L:R-3,y+h*0.25,3,h*0.5);   // mount plate on the body
      if(!open){const bx=ix+f*3;c.beginPath();c.moveTo(bx,y+h*0.42);c.lineTo(ox-f*1,y+h*0.08);c.lineTo(ox,y+h*0.5);c.lineTo(ox-f*1,y+h*0.92);c.closePath();c.fillStyle=cyl(c,L,R,[220,222,228]);c.fill();
        c.strokeStyle="rgba(0,0,0,.22)";c.lineWidth=0.5;for(const v of[0.25,0.5,0.75]){c.beginPath();c.moveTo(bx,y+h*0.5);c.lineTo(ox-f*0.5,y+h*v);c.stroke();}   // furled petals
        c.fillStyle="#c9a24a";c.fillRect(bx-1,y+h*0.44,2,h*0.12);break;}
      const bx=ox+f*3,R0=h*0.62,cy=y+h/2,rx=bx+f*w*0.32;c.strokeStyle="#9aa0a8";c.lineWidth=1.4;c.beginPath();c.moveTo(ix+f*3,cy);c.lineTo(bx,cy);c.stroke();   // boom
      c.beginPath();c.moveTo(rx,cy-R0);c.quadraticCurveTo(bx-f*w*0.3,cy,rx,cy+R0);c.quadraticCurveTo(bx-f*w*0.02,cy,rx,cy-R0);c.closePath();   // the dish, seen edge-on, hollow side out
      c.fillStyle=cyl(c,Math.min(bx,rx)-2,Math.max(bx,rx)+2,[236,238,242]);c.fill();c.strokeStyle="rgba(0,0,0,.25)";c.lineWidth=0.5;c.stroke();
      const fx=bx+f*w*0.75,fy=cy;c.strokeStyle="#b8bdc5";c.lineWidth=0.6;for(const v of[-0.85,0.85]){c.beginPath();c.moveTo(rx,cy+v*R0);c.lineTo(fx,fy);c.stroke();}c.beginPath();c.moveTo(bx+f*w*0.05,cy);c.lineTo(fx,fy);c.stroke();   // feed struts
      c.fillStyle="#c9a24a";c.fillRect(fx-1.2,fy-1.2,2.4,2.4);break;}
    case"dock":{   // docking port: a short collar, a soft-capture ring on top with guide petals, and a white target cross
      c.fillStyle=cyl(c,L,R,[150,154,162]);c.fillRect(L+w*0.1,y,w*0.8,h*0.65);             // collar (bottom)
      c.fillStyle=cyl(c,L,R,[205,208,214]);c.fillRect(L,y+h*0.58,w,h*0.3);                // capture ring
      c.fillStyle="rgba(240,200,60,.9)";for(const f of[0.12,0.5,0.88])c.fillRect(x+(f-0.5)*w-1,T-h*0.14,2,h*0.14);   // guide petals on top
      c.fillStyle="rgba(255,255,255,.85)";c.fillRect(x-0.6,y+h*0.1,1.2,h*0.45);c.fillRect(x-w*0.18,y+h*0.3,w*0.36,1);break;}
    case"dec":{   // separation ring: dark structure, a bright pyro line where it splits, and its bolts
      c.fillStyle=cyl(c,L,R,[70,73,80]);c.fillRect(L,y,w,h);c.fillStyle=cyl(c,L,R,[140,144,152]);c.fillRect(L,y,w,0.9);c.fillRect(L,T-0.9,w,0.9);   // ring with bright rims
      c.fillStyle="rgba(230,232,236,.8)";c.fillRect(L,y+h/2-0.6,w,1.2);c.fillStyle="#e8b23a";for(let xx=L+3;xx<R-2;xx+=6)c.fillRect(xx,y+h/2-0.6,2.6,1.2);   // the pyro line, marked yellow
      c.fillStyle="rgba(15,16,20,.6)";for(let xx=L+5;xx<R-2;xx+=9){c.fillRect(xx,y+1.4,1.6,1.4);c.fillRect(xx,T-2.8,1.6,1.4);}break;}   // bolts each side of the split
    case"sdec":{   // side attach strut with its separation bolts
      c.fillStyle=cyl(c,L,R,[64,67,74]);c.fillRect(L+2,y+6,w-4,h-12);c.fillStyle=cyl(c,L,R,[150,154,162]);c.fillRect(L,y+4,w,5);c.fillRect(L,T-9,w,5);
      c.fillStyle="rgba(255,255,255,.75)";c.fillRect(L+2,y+h/2-0.6,w-4,1.2);break;}
    case"fin":if(p.v==="grid"){   // grid fin: a titanium frame full of little square cells
        c.fillStyle="rgba(150,154,160,.25)";c.fillRect(L,y,w,h);c.strokeStyle="#9aa0a8";c.lineWidth=Math.max(0.5,w*0.035);
        c.beginPath();for(let k=0;k<=1.001;k+=0.2){c.moveTo(L+w*k,y);c.lineTo(L+w*k,T);c.moveTo(L,y+h*k);c.lineTo(R,y+h*k);}c.stroke();
        c.strokeStyle="#5d636c";c.lineWidth=Math.max(1,w*0.08);c.strokeRect(L,y,w,h);c.fillStyle="#3a3f46";c.fillRect(f>0?L-1:R-2,y+h*0.35,3,h*0.3);break;}
      else if(p.v==="wing"){   // swept wing: white top, black tiles along the bottom edge, a grey leading edge and an elevon at the back
        const ix=f>0?L:R,ox=f>0?R:L,S=finShape(p),tb=y+h*S.sw,tt=y+h*(S.sw+S.tc);c.beginPath();c.moveTo(ix,T);c.lineTo(ox,tt);c.lineTo(ox,tb);c.lineTo(ix+(ox-ix)*0.2,y+(tb-y)*0.2);c.lineTo(ix,y);c.closePath();
        c.fillStyle=cyl(c,Math.min(ix,ox),Math.max(ix,ox),[234,236,240]);c.fill();c.save();c.clip();c.fillStyle="#1c1e22";c.fillRect(L,y,w,h*0.06);
        c.fillStyle="rgba(0,0,0,.15)";c.fillRect(L,y+h*0.12,w,0.8);c.restore();c.strokeStyle="#9aa0a8";c.lineWidth=2;c.beginPath();c.moveTo(ix,T);c.lineTo(ox,tt);c.stroke();break;}
    {const ix=f>0?L:R,ox=f>0?R:L,S=finShape(p),tb=y+h*S.sw,tt=y+h*(S.sw+S.tc);c.beginPath();c.moveTo(ix,T);c.lineTo(ox,tt);c.lineTo(ox,tb);c.lineTo(ix,y);c.closePath();
      c.fillStyle=cyl(c,Math.min(ix,ox),Math.max(ix,ox),[58,61,68]);c.fill();c.strokeStyle="rgba(210,214,222,.7)";c.lineWidth=1.5;   // carbon fin, titanium leading edge
      c.beginPath();c.moveTo(ix,T);c.lineTo(ox,tt);c.stroke();c.strokeStyle="rgba(0,0,0,.35)";c.lineWidth=1;c.beginPath();c.moveTo(ix,y);c.lineTo(ox,tb);c.stroke();break;}
    case"rcs":{const ix=f>0?L:R,ox=f>0?R:L,cx=(L+R)/2;c.fillStyle=cyl(c,L,R,[228,230,234]);c.fillRect(L,y+6,w,h-12);c.fillStyle="rgba(0,0,0,.2)";c.fillRect(ix,y+6,f*2,h-12);   // white thruster pod (Dragon-style)
      for(const[ax,ay,bx,by]of[[cx,y+6,cx,y],[cx,T-6,cx,T],[ox-f*2,y+h/2,ox+f*4,y+h/2]]){const nx=by===ay?0:3,ny=by===ay?3:0;c.beginPath();c.moveTo(ax-nx*0.6,ay-ny*0.6);c.lineTo(bx-nx,by-ny);c.lineTo(bx+nx,by+ny);c.lineTo(ax+nx*0.6,ay+ny*0.6);c.closePath();c.fillStyle="#8a909a";c.fill();c.strokeStyle="#2a2d33";c.lineWidth=0.5;c.stroke();c.fillStyle="#15171b";c.fillRect(bx-nx*0.6-(nx?0:0.6),by-ny*0.6-(ny?0:0.6),nx?nx*1.2:1.2,ny?ny*1.2:1.2);}   // grey nozzles with dark mouths
      c.fillStyle="#c23b2e";c.fillRect(ix+f*2.5,y+h/2-1,f*1.6,2);
      if(o.puff)for(const[px,py,dx,dy]of o.puff){c.fillStyle="rgba(240,244,255,.75)";c.beginPath();c.moveTo(px,py);c.lineTo(px+dx*16-dy*5,py+dy*16-dx*5);c.lineTo(px+dx*16+dy*5,py+dy*16+dx*5);c.closePath();c.fill();}
      break;}
    case"solar":{const ix=f>0?L:R,ox=f>0?R:L,open=o.open!=null?o.open:o.legs;
      if(!open){c.fillStyle="#1f3b6e";c.fillRect(L+1,y,w-2,h);c.strokeStyle="#c9ccd1";c.lineWidth=0.6;c.strokeRect(L+1,y,w-2,h);   // folded flat: a stack of panels
        c.strokeStyle="rgba(255,255,255,.18)";c.beginPath();for(let yy=y+5;yy<T;yy+=5){c.moveTo(L+1,yy);c.lineTo(R-1,yy);}c.stroke();break;}
      const len=h*2.4,a=Math.min(ox+f*6,ox+f*(6+len)),b=Math.max(ox+f*6,ox+f*(6+len)),ph=h*0.7,py=y+h*0.15;   // open: a boom out, then a wide blue panel
      c.fillStyle="#5d636c";c.fillRect(Math.min(ix,ox),y+h*0.4,w,h*0.2);c.strokeStyle="#8a919b";c.lineWidth=1.2;c.beginPath();c.moveTo(ox,y+h/2);c.lineTo(ox+f*6,y+h/2);c.stroke();
      const g=c.createLinearGradient(0,py+ph,0,py);g.addColorStop(0,"#14284d");g.addColorStop(1,"#2f5596");c.fillStyle=g;c.fillRect(a,py,b-a,ph);
      c.strokeStyle="rgba(200,220,255,.25)";c.lineWidth=0.4;c.beginPath();for(let xx=a+5;xx<b;xx+=5){c.moveTo(xx,py);c.lineTo(xx,py+ph);}c.moveTo(a,py+ph/2);c.lineTo(b,py+ph/2);c.stroke();
      c.strokeStyle="#c9ccd1";c.lineWidth=0.7;c.strokeRect(a,py,b-a,ph);break;}
    case"light":{const ox=f>0?R:L;c.fillStyle=cyl(c,L,R,[70,73,80]);c.fillRect(L,y,w,h);c.fillStyle="rgba(0,0,0,.3)";for(let q=1;q<h-1;q+=2)c.fillRect(f>0?L:R-w*0.45,y+q,w*0.45,0.6);   // housing with cooling fins
      c.fillStyle=o.lamp?"#fff6d8":"#c3c8d0";c.fillRect(f>0?R-2.2:L,y+0.8,2.2,h-1.6);c.fillStyle="rgba(255,255,255,.6)";c.fillRect(f>0?R-1.4:L+0.8,y+h*0.6,0.6,h*0.25);   // lens and its glint
      if(o.lamp){const g=c.createRadialGradient(ox,y+h/2,0,ox,y+h/2,h*1.4);g.addColorStop(0,"rgba(255,246,216,.6)");g.addColorStop(1,"rgba(255,246,216,0)");c.fillStyle=g;c.beginPath();c.arc(ox,y+h/2,h*1.4,0,6.2832);c.fill();}break;}
    case"fair":{c.fillStyle=cyl(c,L,R,[70,73,80]);c.fillRect(L,y,w,h);c.fillStyle="rgba(230,232,236,.8)";c.fillRect(L,y+h/2-0.5,w,1);   // the base ring
      if(o.shell&&!p.open)drawFairing(c,p,1);break;}
    case"shield":{c.fillStyle=cyl(c,L,R,[58,48,40]);c.fillRect(L,y,w,h);c.fillStyle="rgba(0,0,0,.25)";for(let xx=L+3;xx<R;xx+=4)c.fillRect(xx,y,0.6,h);   // ablative tiles
      c.fillStyle="rgba(255,200,150,.12)";c.fillRect(L,T-1,w,1);break;}
    case"leg":if(p.v==="big"){const k=1.8,ix=f>0?L:R,sw=w/k,sh=h/k;   // the big leg is the normal one drawn 1.8× around its top hinge
        c.save();c.translate(ix,T);c.scale(k,k);c.translate(-ix,-T);drawPart(c,Object.assign({},p,{v:undefined,w:sw,h:sh,x:ix+f*sw/2,y:T-sh}),{legs:o.legs});c.restore();break;}
    {const ix=f>0?L:R,d0=+(o.legs||0),d=d0<=0?0:d0>=1?1:d0*d0*(3-2*d0);   // o.legs: false/true, or 0..1 while it swings down (v1.47)
      const quad=(ax,ay,bx,by,wa,wb,col)=>{const dx=bx-ax,dy=by-ay,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;c.beginPath();c.moveTo(ax+nx*wa/2,ay+ny*wa/2);c.lineTo(bx+nx*wb/2,by+ny*wb/2);c.lineTo(bx-nx*wb/2,by-ny*wb/2);c.lineTo(ax-nx*wa/2,ay-ny*wa/2);c.closePath();c.fillStyle=col;c.fill();};
      // one hinge near the bottom: folded, the leg lies flat up the side with its foot at the top (like a Falcon 9 leg); it swings
      // out and down through ~145° to stand on its foot pad, the shock strut stretching with it
      const hx=ix+f*7*(1-d),hy=y+2+3*d,len0=h-14,len1=Math.hypot(63,85),len=len0+(len1-len0)*d,th=d*Math.atan2(63,-85),fx=hx+f*Math.sin(th)*len,fy=hy+Math.cos(th)*len;
      const sax=ix+f*2,say=y+62,kx=hx+(fx-hx)*0.55,ky=hy+(fy-hy)*0.55;
      if(d>0.02){c.strokeStyle="#d8dbe0";c.lineWidth=4;c.lineCap="round";c.beginPath();c.moveTo(sax,say);c.lineTo(kx,ky);c.stroke();   // shock strut
        c.strokeStyle="#5a6070";c.lineWidth=6;c.beginPath();c.moveTo(sax,say);c.lineTo(sax+(kx-sax)*0.45,say+(ky-say)*0.45);c.stroke();c.lineCap="butt";}
      quad(hx,hy,fx,fy,13+d,8,"#2a2c31");c.strokeStyle="#4b5263";c.lineWidth=1.5;c.beginPath();c.moveTo(hx+(fx-hx)*0.1,hy+(fy-hy)*0.1);c.lineTo(hx+(fx-hx)*0.85,hy+(fy-hy)*0.85);c.stroke();
      c.fillStyle="#3a3f4a";for(const q of[0.3,0.62])c.fillRect(hx+(fx-hx)*q-1.5,hy+(fy-hy)*q-1.5,3,3);   // rivet plates
      {const a=d>0.5?14:9,b=d>0.5?9:14;c.fillStyle="#1b1e26";c.beginPath();c.moveTo(fx-a,fy);c.lineTo(fx+a,fy);c.lineTo(fx+b,fy+8);c.lineTo(fx-b,fy+8);c.closePath();c.fill();}   // foot pad, wide side down once it's out
      c.fillStyle="#9aa3b5";c.beginPath();c.arc(hx,hy,3.5,0,6.2832);c.fill();c.fillStyle="#2a2c31";c.beginPath();c.arc(hx,hy,1.4,0,6.2832);c.fill();
      break;}
  }
  if(o.sel||o.bad||o.ghost){c.save();c.lineWidth=o.lw||3;c.strokeStyle=o.bad?"#ff4d3a":o.sel?"#ffcf7a":"rgba(255,255,255,.5)";c.setLineDash(o.ghost?[6,5]:[]);c.strokeRect(L-2,y-2,w+4,h+4);
    if(o.bad){c.fillStyle="rgba(255,60,40,.22)";c.fillRect(L,y,w,h);}c.restore();}
}
// ---------- centre of mass, lift and thrust (backlog 6) ----------
// mass: every part with its propellant. lift: where the air pushes sideways when the rocket flies at an angle, taken as the middle
// of the side area (fins count double, they're made to catch the air). thrust: where the engines that light first push.
// A rocket is stable in the air when the centre of lift is BELOW the centre of mass (like the feathers on an arrow).
function centres(ps){if(!ps.length)return null;let m=0,mx=0,my=0,A=0,ax=0,ay=0,F=0,fx=0,fy=0;const adj=adjOf(ps),all=new Set(ps.keys());
  ps.forEach((p,i)=>{const pm=partMass(p)+(p.fuel!=null?p.fuel:capOf(p));m+=pm;mx+=pm*p.x;my+=pm*(p.y+p.h/2);
    const a=finShapeK(p)*p.w*p.h*(p.t==="fin"?(p.v==="grid"?0.5:2):p.t==="solar"||p.t==="light"||p.t==="antenna"?0.3:p.t==="nose"||p.t==="les"?0.5:p.t==="engine"||p.t==="srb"&&false?0.6:1)*(p.t==="rcs"?0.3:1);A+=a;ax+=a*p.x;ay+=a*(p.y+p.h*(p.t==="nose"?0.33:finPanel(p)?finLiftY(p):0.5));
    if(isEng(p)&&engOn(ps,adj,i,all)){const f=engStat(p).sl.F;F+=f;fx+=f*p.x;fy+=f*p.y;}});
  return{com:[mx/m,my/m],col:A?[ax/A,ay/A]:null,cot:F?[fx/F,fy/F]:null};}
// draw the three markers (in part units; k = how many part units one screen pixel is, so the markers stay the same size on screen)
function drawCentres(c,cn,k,labels){if(!cn)return;const R=9*k;c.save();c.lineWidth=1.5*k;
  if(cn.cot){const[x,y]=cn.cot;c.strokeStyle="#ff3b2f";c.fillStyle="#ff3b2f";c.beginPath();c.moveTo(x,y-R*2.6);c.lineTo(x,y-R*0.6);c.stroke();c.beginPath();c.moveTo(x,y-R*0.2);c.lineTo(x-R*0.55,y-R*1.1);c.lineTo(x+R*0.55,y-R*1.1);c.closePath();c.fill();}   // thrust: an arrow pushing up
  if(cn.col){const[x,y]=cn.col;c.strokeStyle="#6fc3ff";c.fillStyle="rgba(111,195,255,.25)";c.beginPath();c.arc(x,y,R*0.85,0,6.2832);c.fill();c.stroke();c.fillStyle="#6fc3ff";c.beginPath();c.arc(x,y,R*0.3,0,6.2832);c.fill();}
  {const[x,y]=cn.com;c.fillStyle="#111";c.beginPath();c.arc(x,y,R,0,6.2832);c.fill();c.fillStyle="#ffd23f";for(const q of[0,2]){c.beginPath();c.moveTo(x,y);c.arc(x,y,R,q*Math.PI/2,(q+1)*Math.PI/2);c.closePath();c.fill();}
    c.strokeStyle="#fff";c.beginPath();c.arc(x,y,R,0,6.2832);c.stroke();}   // mass: the classic quartered disc
  if(labels){c.scale(1,-1);c.font=`600 ${10*k}px system-ui,sans-serif`;c.textBaseline="middle";const lab=(p,t,col)=>{if(!p)return;c.fillStyle=col;c.fillText(t,p[0]+R*1.4,-p[1]);};
    lab(cn.com,"MASS","#ffd23f");lab(cn.col,"LIFT","#6fc3ff");if(cn.cot)lab([cn.cot[0],cn.cot[1]-R*1.4],"THRUST","#ff3b2f");}
  c.restore();}
// lowest points of a rocket, for touching the ground (centimetres, local)
function contactPts(ps,legs){const pts=[];
  for(const p of ps){if(p.t==="leg"&&legs){const k=p.v==="big"?1.8:1,ix=p.x-p.f*p.w/2;pts.push([ix+p.f*63*k,p.y+p.h-170*k,1]);continue;}   // the foot, k× further out for a big leg
    if(p.t==="fin"||p.t==="leg")continue;
    pts.push([p.x-p.w/2,p.y,0],[p.x+p.w/2,p.y,0],[p.x-p.w/2,p.y+p.h,0],[p.x+p.w/2,p.y+p.h,0]);}
  return pts;}
// ---------- rockets saved before v1.16 ----------
// Back then parts were small and chunky: engines and tanks 60 units wide, decouplers 15 tall, fins 45 wide. Loaded today those
// numbers make engines ~4× too strong for tanks that hold a fraction of the fuel, so an old rocket flies wrong. oldScale spots
// one by a part only the old catalogue made; upscaleOld rebuilds it with today's parts: same layout, each part swapped for its
// modern size (tanks 2/3 as wide and 2.4× as long, standard-size engines, thin decouplers), stacks re-stacked from the bottom
// up, side parts re-hung on whatever they were hanging on.
const OLD_ENG={stand:[60,60],wren:[60,45],mule:[60,60],bison:[120,90],vac:[60,105],lib:[60,60]};
function oldScale(ps){return Array.isArray(ps)&&ps.some(p=>p.t==="dec"&&p.h===15||p.t==="sdec"&&p.w===15||p.t==="fin"&&p.w===45||
  p.t==="engine"&&!p.k&&OLD_ENG[p.e||"stand"]&&p.w===OLD_ENG[p.e||"stand"][0]&&p.h===OLD_ENG[p.e||"stand"][1]);}
function upscaleOld(ps){
  const r=Math.round,clampW=(t,w)=>PT[t].wr?Math.max(PT[t].wr[0],Math.min(PT[t].wr[1],w)):w;
  const size=p=>{const t=p.t;let w,h;
    if(t==="tank"){w=clampW(t,r(p.w*2/3));h=r(p.h*2.4*(p.fk?Math.min(1,1.2*RHO_P/RHO_FUEL[p.fk]):1));}   // kerosene/methane tanks: shorter, as their propellant is denser
    else if(t==="srb"){w=clampW(t,r(p.w*0.3));h=r(p.h*1.73);}   // the old 60×150 booster becomes the Sparrow's 18×260
    else if(t==="engine"){const e=p.e||"stand",o=OLD_ENG[e]||[60,60];w=clampW(t,r(ENG[e].w*p.w/o[0]));h=engH({t,e,w,k:1});}
    else if(PT[t].radial){w=PT[t].ws[0];h=PT[t].h(w);}
    else{w=clampW(t,r(p.w*2/3));h=PT[t].h(w);}
    return{w,h};};
  tagTanks(ps,adjOf(ps),true);
  const q=ps.map(p=>({p,o:{x:p.x,y:p.y,w:p.w,h:p.h},n:size(p),nx:null,ny:null}));
  const touchY=(a,b)=>Math.abs(b.o.y-(a.o.y+a.o.h))<0.6&&Math.abs(a.o.x-b.o.x)<(a.o.w+b.o.w)/2-0.5;   // b sits on a
  const stack=q.filter(e=>!PT[e.p.t].radial).sort((a,b)=>a.o.y-b.o.y);
  const centre=()=>stack.filter(e=>Math.abs(e.o.x)<0.5&&e.ny!=null);
  for(const e of stack){
    const below=stack.filter(a=>a!==e&&a.ny!=null&&touchY(a,e));
    if(below.length){e.ny=Math.max(...below.map(a=>a.ny+a.n.h));
      if(e.p.t==="nose"&&below.length===1){e.n.w=Math.min(e.n.w,below[0].n.w);e.n.h=PT.nose.h(e.n.w);}   // a nose no wider than what it caps
      continue;}
    // nothing under it: the bottom of the rocket (y 0), or a side booster hung from a decoupler: same height on the core as before
    const c=centre().find(a=>e.o.y>=a.o.y-0.5&&e.o.y<=a.o.y+a.o.h+0.5);
    e.ny=e.o.y<0.5||!c?0:c.ny+(e.o.y-c.o.y)/c.o.h*c.n.h;
  }
  // side columns (boosters): every part in one keeps one centre line, set so the column's widest point sits flush against the
  // core beside it, with a thin decoupler's width between them if there was a gap for one before
  const cols=new Map();for(const e of stack)if(Math.abs(e.o.x)>=0.5){const k=Math.round(e.o.x*2);if(!cols.has(k))cols.set(k,[]);cols.get(k).push(e);}
  for(const e of stack)if(Math.abs(e.o.x)<0.5)e.nx=0;
  for(const col of cols.values()){const sd=Math.sign(col[0].o.x);let x=0;
    for(const e of col){const old=centre().filter(a=>a.o.y<e.o.y+e.o.h&&a.o.y+a.o.h>e.o.y),cw=old.length?Math.max(...old.map(a=>a.o.w)):0,
        now=centre().filter(a=>a.ny<e.ny+e.n.h-0.5&&a.ny+a.n.h>e.ny+0.5),ncw=now.length?Math.max(...now.map(a=>a.n.w)):0,
        gap=Math.abs(e.o.x)-e.o.w/2-cw/2;
      x=Math.max(x,ncw/2+(gap>1?PT.sdec.ws[0]:0)+e.n.w/2);}
    for(const e of col)e.nx=sd*x;}
  // side parts (fins, legs, side decouplers): find what they hung on, then put them at the same place on its new shape
  for(const e of q){if(!PT[e.p.t].radial)continue;
    // a side decoupler must touch both: hang it on the booster's inner edge, at a height where the core beside it is widest
    if(e.p.t==="sdec"){const bo=stack.find(a=>Math.abs(a.o.x)>Math.abs(e.o.x)&&Math.abs(Math.abs(a.o.x-e.o.x)-(a.o.w/2+e.o.w/2))<1.5&&e.o.y<a.o.y+a.o.h&&e.o.y+e.o.h>a.o.y);
      const near=bo&&centre().filter(a=>a.ny<bo.ny+bo.n.h&&a.ny+a.n.h>bo.ny).sort((a,b)=>b.n.w-a.n.w)[0];
      if(bo&&near){const sd=Math.sign(e.o.x),lo=Math.max(bo.ny,near.ny),hi=Math.min(bo.ny+bo.n.h,near.ny+near.n.h);
        e.ny=Math.max(lo,Math.min(hi-e.n.h,lo+(hi-lo-e.n.h)*0.3));e.nx=bo.nx-sd*(bo.n.w/2+e.n.w/2);continue;}}
    const hosts=stack.filter(a=>Math.abs(Math.abs(e.o.x-a.o.x)-(a.o.w/2+e.o.w/2))<1.5&&e.o.y<a.o.y+a.o.h&&e.o.y+e.o.h>a.o.y);
    const h=hosts.sort((a,b)=>Math.abs(a.o.x)-Math.abs(b.o.x))[0];
    if(!h){e.nx=e.o.x*2/3;e.ny=e.o.y;continue;}
    const sd=Math.sign(e.o.x-h.o.x)||1;e.ny=h.ny+Math.max(0,Math.min(1,(e.o.y-h.o.y)/h.o.h))*h.n.h;
    if(e.ny+e.n.h>h.ny+h.n.h)e.ny=Math.max(h.ny,h.ny+h.n.h-e.n.h);
    // against the widest part of that stack beside it (an engine below a tank is narrower: hung on it, it would float off the tank)
    const side=stack.filter(a=>Math.abs(a.nx-h.nx)<0.5&&a.ny<e.ny+e.n.h-0.5&&a.ny+a.n.h>e.ny+0.5),hw=Math.max(h.n.w,...side.map(a=>a.n.w));
    e.nx=h.nx+sd*(hw/2+e.n.w/2);}
  for(const e of q){const p=e.p;p.w=e.n.w;p.h=e.n.h;p.x=e.nx;p.y=e.ny;if(p.t==="adapter")p.w2=r(p.w*0.5);}
  return ps;}
// ready-made rockets
function tpl(name){const A=[];const add=(t,x,y,w,h,f)=>{const p=mkPart(t,w,h);p.x=x;p.y=y;p.f=f||1;A.push(p);return p;};
  const pair=(t,x,y,w,h)=>{const a=add(t,x,y,w,h,1),b=add(t,-x,y,w,h,-1);a.tw=b.id;b.tw=a.id;};
  // a stack, bottom to top: each entry [type, width, height]; returns the top y. Units are 10 cm.
  const stack=(y,list)=>{for(const[t,w,h]of list){const p=add(t,0,y,w,h);y+=p.h;}return y;};
  const W=40;   // 4 m core, Falcon-like
  if(name==="hopper"){stack(0,[["engine",30],["tank",W,120],["probe",W],["nose",W]]);pair("leg",W/2+15,46);}
  else if(name==="orbiter"){stack(0,[["engine",30],["tank",W,150],["dec",W],["engine:stand",30],["tank",W,45],["probe",W],["nose",W]]);pair("fin",W/2+15,46);}
  // v1.35: kerosene tanks (Mule, Bison, Wren) hold nearly 3× the mass of hydrogen ones, so they are about half as long as before
  else if(name==="heavy"){const top=stack(0,[["engine",30],["tank",W,170],["dec",W],["engine:vac",30],["tank",W,45],["probe",W],["nose",W]]);
    const bw=34,bx=W/2+3+bw/2,mh=mkPart("engine:mule",30).h;pair("sdec",W/2+1.5,90);pair("engine:mule",bx,0,30);pair("tank",bx,mh,bw,85);pair("nose",bx,mh+85,bw);pair("fin",bx+bw/2+15,mh);}
  else if(name==="sparrow"){   // the Orbiter with two solid boosters strapped on, flush to the core: they light with the throttle; Space drops them
    stack(0,[["engine",30],["tank",W,140],["dec",W],["engine:stand",30],["tank",W,45],["probe",W],["nose",W]]);
    const bw=14,bx=W/2+3+bw/2;pair("sdec",W/2+1.5,60);pair("srb:thumper",bx,0,bw,230);pair("nose",bx,230,bw);pair("fin",bx+bw/2+15,0);}
  else if(name==="lander"){const y=stack(0,[["engine:bison",56],["tank",84,70],["adapter",84],["dec",W],["engine:wren",22],["tank",W,40],["probe",W],["nose",W]]);
    pair("leg",W/2+15,A.find(p=>p.t==="engine"&&p.e==="wren").y+32);pair("fin",84/2+15,70);}
  else if(name==="sls"){   // SLS proportions: an 8.4 m orange core with a 4-engine cluster, two slim 3.7 m solid boosters flush to its
    // sides with pointed noses, an upper stage with a vacuum engine, a service module, and an Orion-style capsule with its escape tower
    // a decoupler under the capsule (v1.35): coming home, the service module drops so the heat shield faces the air
    // core 48 m, boosters 44 m (v1.30; were 60 and 54): the long core alone had a thrust-to-weight of 1.1 after the boosters left,
    // so the climb to orbit took ~14 minutes and it arrived with 490 t of fuel unused. Now it gets there in ~7, like the others.
    const C=84,eng=add("engine:stand:4",0,0,C);let y=eng.h;
    const core=add("tank",0,y,C,480);core.sk="foam";y+=480;
    const ad=add("adapter",0,y,C,50);ad.w2=50;y+=50;
    y=stack(y,[["dec",50],["engine:vac",28],["tank",50,80],["dec",50],["engine:wren",22],["tank",50,18],["dec",50],["capsule",50],["les",14]]);
    const bw=37,bx=C/2+3+bw/2;pair("sdec",C/2+1.5,200);pair("srb:thumper",bx,0,bw,440);pair("nose",bx,440,bw,80);for(const p of A)if(p.t==="nose"&&p.w===bw)p.ns="cone";}
  else if(name==="pathfinder"){   // v1.37 showcase: a steel methane booster with grid fins, a nuclear upper stage on gold-foil tanks,
    // solar panels and floodlights, and a Dragon-style capsule on top
    const S=62;let y=stack(0,[["engine:condor",S],["tank",S,230]]);A[1].sk="steel";pair("fin:grid",S/2+11,y-30);pair("fin:wing",S/2+45,0);
    y=stack(y,[["dec",S],["adapter",S]]);A[A.length-1].w2=W;
    const at=add("engine:atom",0,y,W);y+=at.h;const ut=add("tank",0,y,W,260);ut.sk="gold";y+=260;pair("solar",W/2+5,y-120);pair("light",W/2+4,y-150);
    y=stack(y,[["dec",W],["shield",W],["capsule:dragon",W]]);}
  else if(name==="comsat"){   // a satellite launcher: kerosene first stage, vacuum upper stage, and a payload fairing with a small
    // satellite inside (gold-foil tank, probe core, folded solar panels). Above the air the fairing splits open and the panels unfold.
    let y=stack(0,[["engine:mule",32],["tank",W,85],["dec",W],["engine:vac",30],["tank",W,30]]);pair("fin",W/2+15,0);
    const fr=add("fair",0,y,48);fr.fh=110;y+=fr.h;const st=add("tank",0,y,24,40);st.sk="gold";y+=40;add("probe",0,y,24);pair("solar",12+5,y-34);}
  return A;}
