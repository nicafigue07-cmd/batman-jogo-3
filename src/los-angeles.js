/** Stylized Los Angeles scenery; existing streets and mission roofs stay usable. */
export function createLosAngeles(THREE,scene){
 const group=new THREE.Group();group.name='Los Angeles · palmeiras e costa';scene.add(group);
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.23,.38,10,7),new THREE.MeshStandardMaterial({color:0x99755b,roughness:1}),48);
 const leaves=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),new THREE.MeshStandardMaterial({color:0x478757,roughness:1,side:THREE.DoubleSide}),48*7);
 const dummy=new THREE.Object3D();let index=0;
 for(const x of [-140,-28,84,196])for(const z of [-190,-130,-70,-10,50,110,170,215, -210,-155,145,195]){
  dummy.position.set(x+6,5,z);dummy.rotation.set(0,0,.025*Math.sin(index));dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(index,dummy.matrix);
  for(let j=0;j<7;j++){const a=j/7*Math.PI*2;dummy.position.set(x+6+Math.sin(a)*1.6,9.8,z+Math.cos(a)*1.6);dummy.rotation.set(Math.cos(a)*.55,a,Math.sin(a)*.55);dummy.scale.set(.8,.24,3.3);dummy.updateMatrix();leaves.setMatrixAt(index*7+j,dummy.matrix);}index++;
 }
 trunks.castShadow=leaves.castShadow=true;group.add(trunks,leaves);
 const ocean=new THREE.Mesh(new THREE.PlaneGeometry(850,800),new THREE.MeshStandardMaterial({color:0x359fb9,roughness:.35,metalness:.25}));ocean.rotation.x=-Math.PI/2;ocean.position.set(-657,-.2,0);group.add(ocean);
 const sand=new THREE.Mesh(new THREE.PlaneGeometry(38,600),new THREE.MeshStandardMaterial({color:0xe5cd9c,roughness:1}));sand.rotation.x=-Math.PI/2;sand.position.set(-214,.02,0);group.add(sand);
 const hillMaterial=new THREE.MeshStandardMaterial({color:0xa9ac7a,roughness:1});
 for(let i=0;i<7;i++){const hill=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),hillMaterial);hill.position.set(-250+i*90,-8,-365);hill.scale.set(95,42+i%3*16,65);group.add(hill);}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const ctx=canvas.getContext('2d');ctx.font='bold 110px Arial';ctx.textAlign='center';ctx.fillStyle='#fff8e6';ctx.fillText('HOLLYWOOD',512,120);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(110,17),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,side:THREE.DoubleSide}));sign.position.set(0,47,-315);group.add(sign);
 return {group,palmCount:index};
}
