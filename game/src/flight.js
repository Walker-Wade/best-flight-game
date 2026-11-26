// Bank creates heading change; reduced airspeed also reduces vertical support.
import { CONFIG } from './config.js';
import { groundHeight } from './terrain.js';
export function createFlight(){return {x:0,y:180,z:450,speed:49,heading:0,pitch:0,roll:0,throttle:.68,vertical:0,stall:false,onGround:false};}
export function stepFlight(f,input,dt,fuel){
 f.throttle=Math.max(0,Math.min(1,f.throttle+input.throttle*dt*.32));
 f.roll+=(input.roll*.92-f.roll*.65)*dt;f.roll=Math.max(-1.15,Math.min(1.15,f.roll));
 f.pitch+=(input.pitch*.42-f.pitch*.45)*dt;f.pitch=Math.max(-.48,Math.min(.48,f.pitch));
 f.speed+=((fuel>0?f.throttle:0)*13-3.2-f.speed*f.speed*.0014-Math.sin(f.pitch)*9)*dt;f.speed=Math.max(8,Math.min(CONFIG.maxSpeed,f.speed));
 f.stall=f.speed<CONFIG.stall;if(f.stall)f.pitch-=dt*.22;
 f.heading+=Math.tan(f.roll)*9.81/Math.max(20,f.speed)*dt;
 f.vertical=Math.sin(f.pitch)*f.speed+(f.speed<29?-(29-f.speed)*.8:0);f.y+=f.vertical*dt;
 f.x+=Math.sin(f.heading)*f.speed*dt;f.z-=Math.cos(f.heading)*f.speed*dt;
 const floor=groundHeight(f.x,f.z)+CONFIG.collisionHeight;
 if(f.y<=floor){const impact=Math.abs(f.vertical);f.y=floor;f.onGround=true;return {impact,runway:Math.abs(f.x-310)<38&&f.z>-2050&&f.z<-950};}f.onGround=false;return null;
}
