// Edge actions avoid repeated cargo releases when a key is held down.
export function createInput(onAction){
 const held=new Set();window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(!held.has(e.code)&&['Space','Escape','KeyP','KeyR'].includes(e.code))onAction(e.code);held.add(e.code);});window.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',()=>held.clear());
 return {read(){return {throttle:Number(held.has('KeyW')||held.has('ShiftLeft'))-Number(held.has('KeyS')||held.has('ControlLeft')),pitch:Number(held.has('ArrowDown'))-Number(held.has('ArrowUp')),roll:Number(held.has('ArrowRight'))-Number(held.has('ArrowLeft'))};}};
}
