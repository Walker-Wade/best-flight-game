// Height queries and the visible mesh share the same valley profile.
import * as T from '../vendor/three.module.min.js';
import { seededRandom } from './random.js';
export function riverX(z) { return Math.sin(z/1100)*170 + Math.sin(z/440)*45; }
export function groundHeight(x,z) {
  const d=Math.abs(x-riverX(z));
  const ridge=Math.max(0,d-220);
  const natural=6+ridge*.32+(Math.sin(x*.003+z*.002)*.5+.5)*ridge*.4+Math.sin(z*.008)*Math.min(ridge*.04,25);
  // Ease the runway cut into the hillside so final approach has no cliff at the threshold.
  const distance=Math.hypot(Math.max(0,Math.abs(x-310)-53),Math.max(0,-2100-z,z+900));
  const t=Math.min(1,distance/150),blend=t*t*(3-2*t);
  return 24+(natural-24)*blend;
}
export function buildTerrain(scene,seed) {
  const random=seededRandom(seed), geometry=new T.PlaneGeometry(14000,14000,180,180); geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position, colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=groundHeight(x,z);p.setY(i,y);const c=new T.Color(y>1000?'#d6c9dd':y>500?'#71657f':y>100?'#4a5865':'#375b59');c.multiplyScalar(.8+random()*.25);colors.push(c.r,c.g,c.b);}
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();scene.add(new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true})));
  // Soften the water's sun reflection behind the lower-left contract text.
  const water=new T.Mesh(new T.PlaneGeometry(14000,14000),new T.MeshStandardMaterial({color:0x297e91,metalness:.15,roughness:.8}));water.rotation.x=-Math.PI/2;water.position.y=9;scene.add(water);
  const lake=new T.Mesh(new T.CircleGeometry(310,64),water.material);lake.rotation.x=-Math.PI/2;lake.position.set(0,11,1000);scene.add(lake);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(1.4,2,13,5),new T.MeshStandardMaterial({color:0x544a51}),1400);
  const crowns=new T.InstancedMesh(new T.ConeGeometry(13,48,6),new T.MeshStandardMaterial({color:0x1b4545,roughness:1}),1400);const dummy=new T.Object3D();const trees=[];
  // Limit the visible trees while retaining their existing collision heights.
  for(let i=0;i<1400;i++){let x=(random()-.5)*6200,z=(random()-.5)*11000,y=groundHeight(x,z);if(y<15||y>950||(Math.abs(x-310)<90&&z>-2200&&z<-800)){x+=600;y=groundHeight(x,z);} const s=.7+random()*.8,visual=s*.55;dummy.position.set(x,y+7*visual,z);dummy.scale.setScalar(visual);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=y+30*visual;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);trees.push({x,z,y,height:54*s});}scene.add(trunks,crowns);
  const strip=new T.Mesh(new T.BoxGeometry(76,2,1100),new T.MeshStandardMaterial({color:0x263b48,roughness:.85}));strip.position.set(310,25,-1500);scene.add(strip);
  for(let z=-2000;z<-950;z+=70){const mark=new T.Mesh(new T.BoxGeometry(3,.2,28),new T.MeshBasicMaterial({color:0xf6e3bd}));mark.position.set(310,26.1,z);scene.add(mark);for(const x of [270,350]){const light=new T.Mesh(new T.SphereGeometry(2.3,6,6),new T.MeshBasicMaterial({color:0x8cfff1}));light.position.set(x,28,z);scene.add(light);}}
  return {trees};
}
