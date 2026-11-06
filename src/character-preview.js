/** A separate presentation scene uses the existing canvas without moving the player. */
export function createCharacterPreview(THREE, createCharacter) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9dce2');
  scene.add(new THREE.HemisphereLight(0xf0faff,0x6c8f97,2));
  const key=new THREE.DirectionalLight(0xffe0c0,2.7);key.position.set(3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0xc5fbff,1.5);rim.position.set(-3,3,-4);scene.add(rim);
  const model=createCharacter(THREE);scene.add(model);
  const camera=new THREE.PerspectiveCamera(36,1,.1,30);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(5,64),new THREE.MeshStandardMaterial({color:0xc4dfd9,roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.13;scene.add(floor);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.05,1.09,64),new THREE.MeshBasicMaterial({color:0x429aa8,transparent:true,opacity:.45,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=-.12;scene.add(ring);
  let targetAngle=.2,angle=.2,lastTime=0;
  return {
    model,
    turn(){targetAngle+=Math.PI;},
    reset(){targetAngle=.2;angle=.2;lastTime=0;},
    getState:()=>({angle,targetAngle}),
    render(renderer,time,width,height) {
      const dt=lastTime?Math.min(.1,Math.max(0,time-lastTime)):.016;lastTime=time;
      angle+=(targetAngle-angle)*(1-Math.exp(-dt*7));model.rotation.y=angle;
      model.userData.update?.({time,moving:false,gliding:false});
      const portrait=height>width;camera.aspect=width/height;camera.updateProjectionMatrix();
      if(portrait){camera.position.set(2.7,2.05,5.2);camera.lookAt(0,.18,0);}
      else {camera.position.set(2.55,1.9,4.4);camera.lookAt(1.05,1.08,0);}
      renderer.render(scene,camera);
    },
  };
}
