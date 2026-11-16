// ===== physics thread: steps the world back-to-back and sends snapshots when the screen asks =====
// It runs the physics on the graphics card when it can (gpu.js) and on the CPU otherwise (or with ?cpu in the address).
let W_on=false,W_paused=false,W_spd=10,W_bank=0,W_bankT=performance.now(),W_want=true,W_seq=0,W_dts=0,W_steps=0,W_win=0,W_winT=performance.now(),W_sps=0;
let W_gpu=false,W_q=[],W_n=8;   // GPU mode: edits wait in a queue until the end of the current burst of steps
onmessage=e=>{const m=e.data;
  if(m.t==="init"){importState(m.state);floodOutside();W_paused=m.paused;W_spd=m.spd;if(!W_on){W_on=true;W_start(m.gpu!==false);}}
  else if(m.t==="act"){if(W_gpu)W_q.push(m);else{try{act(m.name,...m.args);}catch(err){}W_seq=m.seq;}}
  else if(m.t==="cfg"){W_paused=m.paused;W_spd=m.spd;}
  else if(m.t==="want")W_want=true;};
const W_ch=new MessageChannel();W_ch.port1.onmessage=()=>W_loop();
async function W_start(tryGpu){
  W_post();   // answer at once: setting up the GPU (compiling its programs) can take a few seconds
  if(tryGpu&&typeof GPU!=="undefined"){W_gpu=true;if(await GPU.init()){G_loop();return;}}
  W_gpu=false;for(const m of W_q){try{act(m.name,...m.args);}catch(err){}W_seq=m.seq;}W_q=[];   // no GPU: the CPU takes over
  W_loop();
}
function W_post(){const s=exportState();s.seq=W_seq;s.dts=W_dts;s.sps=W_sps;s.gpu=W_gpu?1:0;s.gpuErr=typeof GPU!=="undefined"?GPU.err:"";W_dts=0;W_want=false;
  postMessage(s,[s.big.buffer,s.prop.buffer,s.lit.buffer,s.rr.buffer,s.wall.buffer,s.resv.buffer]);}
function W_rate(t0,n){W_win+=n;if(t0-W_winT>=500){W_sps=Math.round(W_win*1000/(t0-W_winT));W_win=0;W_winT=t0;}}
function W_loop(){
  const t0=performance.now();let allow=1e9,n=0;
  if(!W_paused){
    if(W_spd<10){W_bank=Math.min(W_bank+(t0-W_bankT)*W_spd*0.03,12);allow=Math.floor(W_bank);}  // Speed n = n×30 steps/s
    while(n<allow&&performance.now()-t0<8){if(W_steps%4===0){runPlugs();runSparks();}W_dts+=step();W_steps++;n++;}
    if(W_spd<10)W_bank-=n;}
  W_bankT=t0;W_rate(t0,n);
  if(W_want)W_post();
  if(W_paused||n===0)setTimeout(W_loop,8);else W_ch.port2.postMessage(0);
}
// GPU loop: a burst of steps on the card, the world comes back, the CPU applies edits and its own rules, repeat.
// Bursts grow until each takes ~12 ms, but stay short while something needs the CPU often (sparks, check valves, a lit igniter,
// a valve waiting on its timer).
async function G_loop(){
  while(GPU.on){
    const t0=performance.now();let n=0;
    if(W_q.length){for(const m of W_q){try{act(m.name,...m.args);}catch(err){}W_seq=m.seq;}W_q=[];GPU.upload();}
    if(!W_paused){
      n=W_n;
      if(W_spd<10){W_bank=Math.min(W_bank+(t0-W_bankT)*W_spd*0.03,12);n=Math.min(n,Math.floor(W_bank));}
      if(sparks.length)n=Math.min(n,4);
      if(checks.length||valves.some(v=>v.openAt>0))n=Math.min(n,16);
      if(plugs.some(torchLit))n=Math.min(n,64);
    }
    W_bankT=t0;
    if(n>0){
      const tb=performance.now();let dts;
      try{dts=await GPU.run(n);}catch(err){GPU.err=String(err&&err.message||err);GPU.release();break;}
      const ms=performance.now()-tb;
      W_n=Math.max(4,Math.min(4000,Math.round(W_n*Math.min(2,Math.max(0.5,12/Math.max(0.5,ms))))));
      W_dts+=dts;frameNo+=Math.floor((W_steps+n+3)/4)-Math.floor((W_steps+3)/4);W_steps+=n;if(W_spd<10)W_bank-=n;
      const wv=wallVer;runValveTimers();if(checks.length)runChecks();if(wallVer!==wv)GPU.upload();   // valves opening on time, check valves
    }else await new Promise(r=>setTimeout(r,8));
    W_rate(performance.now(),n);
    if(W_want)W_post();
  }
  // the GPU went away: carry on on the CPU from the last world it sent back
  W_gpu=false;for(const m of W_q){try{act(m.name,...m.args);}catch(err){}W_seq=m.seq;}W_q=[];
  W_loop();
}
