// The audio graph is created only after a pilot gesture.
export class FlightAudio {
 start(){if(this.context){this.context.resume();return;}const c=this.context=new AudioContext();this.engine=c.createOscillator();this.engine.type='sawtooth';this.gain=c.createGain();this.gain.gain.value=.025;const filter=c.createBiquadFilter();filter.frequency.value=350;this.engine.connect(filter).connect(this.gain).connect(c.destination);this.engine.start();}
 update(throttle){if(this.context)this.engine.frequency.setTargetAtTime(36+throttle*65,this.context.currentTime,.2);}
 tone(kind){if(!this.context)return;const c=this.context;for(const [i,n] of (kind==='success'?[523,659,784]:kind==='ring'?[880,1320]:[180]).entries()){const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.09;o.frequency.value=n;g.gain.setValueAtTime(.08,t);g.gain.exponentialRampToValueAtTime(.001,t+.45);o.connect(g).connect(c.destination);o.start(t);o.stop(t+.5);}}
}
