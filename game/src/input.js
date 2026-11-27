const held = new Set();
let mouseDX = 0;
let mouseDY = 0;
let wheelDelta = 0;
let pressedC = false;
let pressedF = false;
let dragging = false;

export function getInputState() {
  return Object.freeze({ mouseDX, mouseDY, wheelDelta, pressedC, pressedF, keys: Object.freeze([...held]) });
}

export function resetFrameInput() {
  mouseDX = 0;
  mouseDY = 0;
  wheelDelta = 0;
  pressedC = false;
  pressedF = false;
}

export function createInput(onAction) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!held.has(event.code)) {
      if (['Space', 'Escape', 'KeyP', 'KeyR'].includes(event.code)) onAction(event.code);
      if (event.code === 'KeyC') pressedC = true;
      if (event.code === 'KeyF') pressedF = true;
    }
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    dragging = false;
  });
  window.addEventListener('mousedown', (event) => {
    if (event.button === 0 && event.target.id === 'view') dragging = true;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    mouseDX += event.movementX || 0;
    mouseDY += event.movementY || 0;
  });
  window.addEventListener('wheel', (event) => {
    wheelDelta += event.deltaY;
    event.preventDefault();
  }, { passive: false });
  return {
    read() {
      return {
        throttle: Number(held.has('KeyW') || held.has('ShiftLeft')) - Number(held.has('KeyS') || held.has('ControlLeft')),
        pitch: Number(held.has('ArrowDown')) - Number(held.has('ArrowUp')) + (dragging ? Math.max(-0.3, Math.min(0.3, mouseDY * 0.006)) : 0),
        roll: Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft')) + (dragging ? Math.max(-0.3, Math.min(0.3, mouseDX * 0.006)) : 0)
      };
    }
  };
}
