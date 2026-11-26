// Flight values use metres and seconds; the HUD converts airspeed to knots.
// Fuel reserves should make the optional refuelling ring worth considering.
export const CONFIG = { stall: 25, cruise: 49, maxSpeed: 78, fuelBurn: .2, ringRadius: 31, collisionHeight: 2.5, worldSize: 14000, fixedStep: 1/60 };
export const CONTRACTS = [ {name:'Ring Run', subtitle:'Thread the northern lights', detail:'Fly through 8 amber gates in order.'}, {name:'Supply Drop', subtitle:'A lifeline in the wilderness', detail:'Space: release supplies over the cyan beacon.'}, {name:'Ridge Landing', subtitle:'Bring your crew home', detail:'Land on the lit strip at 48–80 knots.'} ];
