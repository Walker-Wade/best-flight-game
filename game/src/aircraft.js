// Local forward is negative Z; the propeller remains independent of the airframe.
import * as T from '../vendor/three.module.min.js';
export function createAircraft() {
 const root=new T.Group(), cream=new T.MeshStandardMaterial({color:0xf6d9a2,metalness:.32,roughness:.4}), orange=new T.MeshStandardMaterial({color:0xd75836,metalness:.3,roughness:.45}), dark=new T.MeshStandardMaterial({color:0x142e43,metalness:.6,roughness:.2});
 const part=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);root.add(m);return m;};
 const fuselage=part(new T.CylinderGeometry(1.2,1.75,11,12),cream,0,0,0);fuselage.rotation.x=Math.PI/2;
 part(new T.SphereGeometry(1.65,12,8),dark,0,.7,-1.6).scale.set(1, .8,1.7);
 part(new T.BoxGeometry(19,.35,3),cream,0,1.25,-.4);part(new T.BoxGeometry(5,.4,3.05),orange,-7,1.28,-.4);part(new T.BoxGeometry(5,.4,3.05),orange,7,1.28,-.4);
 part(new T.BoxGeometry(7,.25,1.8),cream,0,.6,4.5);part(new T.BoxGeometry(.3,3,2),orange,0,1.6,4.3);
 for(const x of [-2.3,2.3]) {part(new T.BoxGeometry(.17,2,.17),dark,x,-1.6,0);const wheel=part(new T.CylinderGeometry(.65,.65,.5,12),dark,x,-2.4,0);wheel.rotation.z=Math.PI/2;}
 const prop=new T.Group();prop.position.set(0,0,-5.8);root.add(prop);const blade=new T.Mesh(new T.BoxGeometry(.22,6,.15),dark);prop.add(blade);part(new T.SphereGeometry(.65,10,8),orange,0,0,-5.8);
 for(const [x,c] of [[-9.7,0xff594f],[9.7,0x64ffd9]])part(new T.SphereGeometry(.22,8,8),new T.MeshBasicMaterial({color:c}),x,1.4,-.4);
 root.scale.setScalar(1.5);return {root,update(dt,throttle){prop.rotation.z+=dt*(25+throttle*70);}};
}
