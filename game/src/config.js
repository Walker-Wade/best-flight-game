// Flight values use metres and seconds; the HUD converts airspeed to knots.
// Fuel reserves should make the optional refuelling ring worth considering.
export const CONFIG = {
  // Stall speed: below this the wing stops flying.
  stall: 25,
  // Cruise speed the contracts are tuned around.
  cruise: 49,
  // Structural top speed.
  maxSpeed: 78,
  // Fuel burned per second at full throttle, scaled by (0.3 + throttle).
  fuelBurn: .2,
  // Amber gate rings: fly within this distance of a ring centre to clear it.
  ringRadius: 31,
  // Height above the ground at which the wheels count as touching down.
  collisionHeight: 2.5,
  // Terrain spans this many metres on each side.
  worldSize: 14000,
  // Physics advances in fixed steps of this size.
  fixedStep: 1/60,
};
// The three contracts offered on the title screen.
export const CONTRACTS = [
  { name: 'Ring Run', subtitle: 'Thread the northern lights', detail: 'Fly through 8 amber gates in order.' },
  { name: 'Supply Drop', subtitle: 'A lifeline in the wilderness', detail: 'Space: release supplies over the cyan beacon.' },
  { name: 'Ridge Landing', subtitle: 'Bring your crew home', detail: 'Land on the lit strip at 48–80 knots.' },
];
