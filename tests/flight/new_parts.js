// v1.37+ parts: a closed payload fairing works as a nose cone and carries its shell's mass; once open the craft is lighter and
// blunt; big landing legs stand wider; every palette part can be made and has a sane mass.
const F=require('./harness.js');let bad=0;const ok=(c,t)=>{console.log((c?'ok   ':'FAIL ')+t);if(!c)bad++;};
const shut=F.mkVessel(F.tpl('comsat'),'C');
const open=F.tpl('comsat');for(const p of open)if(p.t==='fair')p.open=true;const op=F.mkVessel(open,'O');
ok(shut.nose&&!op.nose,'closed fairing counts as a nose cone, open one doesn\'t');
ok(shut.dry-op.dry>500,`the shell is dropped when it opens (${((shut.dry-op.dry)/1000).toFixed(1)} t)`);
ok(shut.H>op.H,'the closed shell is the top of the rocket');
const leg=F.mkPart('leg'),big=F.mkPart('leg:big');leg.x=big.x=20;leg.y=big.y=0;leg.f=big.f=1;
const a=F.contactPts([leg],true)[0],b=F.contactPts([big],true)[0];ok(b[0]>a[0]+20&&b[1]<a[1]-20,'big legs reach further out and down');
let bad2=[];for(const id of F.PT_ORDER){const p=F.mkPart(id);const m=F.partMass(p);if(!(m>0&&isFinite(m)&&p.w>0&&p.h>0))bad2.push(id);}
ok(!bad2.length,'every palette part has a size and mass'+(bad2.length?': '+bad2.join(','):''));
console.log(bad?'new parts FAILED':'new parts ok');process.exit(bad?1:0);
