// Each world receives a private stream so scenery never depends on frame timing.
// Mulberry32: a small, fast seeded generator with a full 32-bit period.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    // Advance the state by the golden-ratio constant.
    state += 0x6d2b79f5;
    let n = state;
    // First mix: xor-shift, then multiply by an odd constant.
    n = Math.imul(n ^ n >>> 15, n | 1);
    // Second mix: add the shifted product back in.
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    // Final xor-shift, then scale the unsigned 32-bit value to [0, 1).
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
