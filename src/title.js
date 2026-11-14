// ================= TITLE SCREEN =================
// The first thing anyone sees. Behind the title the demo runs for real (the Super Heavy on the pad, then launching), with the
// cockpit displays hidden; when it ends it starts again. Three ways in: watch the whole demo with its captions, go to the test
// stand and build an engine (a first-time player gets the tutorial), or go straight to the rocket editor.
let titleUp=false,titleEl=null;
function titleOpen(){titleUp=true;
  if(!titleEl){const d=document.createElement("div");d.className="title";
    d.innerHTML=`<div class="title-box"><span class="title-tag">Rocket engine sandbox</span><h1>THROAT</h1>
      <p>Build a rocket engine on real gas physics: hydrogen and oxygen flowing, burning and blasting out of a nozzle you shaped.
      Then build a rocket around it and fly it to the Moon.</p>
      <div class="title-b"><button class="b go" data-ic="play" id="tWatch">Watch a launch</button><button class="b" data-ic="flame" id="tEngine">Build an engine</button><button class="b" data-ic="rocket" id="tFly">Fly a rocket</button></div>
      <small>A game by Wyatt · Enter: watch · Esc: build an engine</small></div>`;
    document.body.appendChild(d);titleEl=d;d.querySelectorAll("[data-ic]").forEach(b=>{b.innerHTML=ico(b.dataset.ic)+b.innerHTML;});
    $("tWatch").onclick=()=>titleGo("watch");$("tEngine").onclick=()=>titleGo("engine");$("tFly").onclick=()=>titleGo("fly");}
  titleEl.style.display="";demoStart({bg:true});$("flight").classList.add("attract");requestAnimationFrame(titleLoop);}
function titleLoop(){if(!titleUp)return;requestAnimationFrame(titleLoop);
  if(!DEMO.on&&(DEMO.ph==="end"||AV&&AV.crashed||!FLT.on))demoStart({bg:true});}   // the attract loop: when the demo ends, start it again
function titleGo(how){titleUp=false;titleEl.style.display="none";$("flight").classList.remove("attract");
  if(how==="watch"){demoStart();return;}
  demoStop();endFlight();
  if(how==="fly"){openVab();return;}
  const st=store.get(TUT_KEY,null);if(!st&&!(JX&&Object.keys(JX.done).length>2))setTimeout(tutStart,400);}   // first time on the stand: the tutorial
addEventListener("keydown",e=>{if(!titleUp)return;if(e.key==="Enter"){titleGo("watch");e.preventDefault();}else if(e.key==="Escape")titleGo("engine");
  e.stopImmediatePropagation();},true);
window.__title={open:titleOpen,go:titleGo,get up(){return titleUp;}};
setTimeout(titleOpen,50);
