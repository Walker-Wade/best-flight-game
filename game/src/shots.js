// These frozen flight-log moments use the same world, airframe and HUD as play.
export function stageShot(name,world){
 world.reset(name==='approach'?2:0);world.time=83;world.score=1250;world.fuel=72;
 // Gate scores and elapsed resources reflect each frozen route milestone.
 if(name==='cover'){Object.assign(world.flight,{x:95,y:229,z:-710,heading:.16,roll:.12,pitch:.03});world.progress=2;world.score=750;world.time=52;world.fuel=80;}
 // Measured ground here is 115.296322 m; keep the aircraft and chase camera clear on final.
 if(name==='approach')Object.assign(world.flight,{x:310,y:165.296322,z:-675,heading:0,speed:34,throttle:.35,pitch:-.035});
 if(name==='canyon'){Object.assign(world.flight,{x:-100,y:100,z:680,heading:-.12,roll:-.19,speed:56});world.score=250;world.time=24;world.fuel=84;}
 if(name==='complete'){Object.assign(world.flight,{x:90,y:240,z:-720,heading:.1,roll:0});world.progress=8;world.score=3420;world.status='complete';world.reason='ALL GATES CLEARED · Northern route certified';}
 world.rings.forEach((r,i)=>r.visible=world.contract===0&&i>=world.progress);
}
// Shot staging needs no unused flight controller; gameplay uses player input.
