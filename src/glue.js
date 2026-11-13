// ===== physics thread: steps the world back-to-back and sends snapshots when the screen asks =====
let W_on=false,W_paused=false,W_spd=10,W_bank=0,W_bankT=performance.now(),W_want=true,W_seq=0,W_dts=0,W_steps=0,W_win=0,W_winT=performance.now(),W_sps=0;
onmessage=e=>{const m=e.data;
  if(m.t==="init"){importState(m.state);floodOutside();W_paused=m.paused;W_spd=m.spd;if(!W_on){W_on=true;W_loop();}}
  else if(m.t==="act"){try{act(m.name,...m.args);}catch(err){}W_seq=m.seq;}
  else if(m.t==="cfg"){W_paused=m.paused;W_spd=m.spd;}
  else if(m.t==="want")W_want=true;};
const W_ch=new MessageChannel();W_ch.port1.onmessage=()=>W_loop();
function W_loop(){
  const t0=performance.now();let allow=1e9,n=0;
  if(!W_paused){
    if(W_spd<10){W_bank=Math.min(W_bank+(t0-W_bankT)*W_spd*0.03,12);allow=Math.floor(W_bank);}  // Speed n = n×30 steps/s
    while(n<allow&&performance.now()-t0<8){if(W_steps%4===0){runPlugs();runSparks();}W_dts+=step();W_steps++;n++;}
    if(W_spd<10)W_bank-=n;}
  W_bankT=t0;W_win+=n;
  if(t0-W_winT>=500){W_sps=Math.round(W_win*1000/(t0-W_winT));W_win=0;W_winT=t0;}
  if(W_want){const s=exportState();s.seq=W_seq;s.dts=W_dts;s.sps=W_sps;W_dts=0;W_want=false;
    postMessage(s,[s.big.buffer,s.prop.buffer,s.lit.buffer,s.rr.buffer,s.wall.buffer,s.resv.buffer]);}
  if(W_paused||n===0)setTimeout(W_loop,8);else W_ch.port2.postMessage(0);
}
