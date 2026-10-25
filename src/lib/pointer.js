// Single shared pointer state (normalized -0.5..0.5) for every pointer-driven effect.
// Written only by useInteractiveEffects; read by the crystal scene's render loop.
export const pointer = { x: 0, y: 0 };
