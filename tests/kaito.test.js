import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { KAITO_PROFILE,createKaito } from '../src/kaito.js';

const allPartNames=hero=>{
 const names=[];hero.traverse(part=>{names.push(part.name,...part.userData.parts||[]);});return names.join('\n');
};
const materials=hero=>{
 const found=new Map();hero.traverse(part=>{if(part.material)found.set(part.material.name||part.material.uuid,part.material);});return found;
};

test('Kaito has the requested identity, child proportions and locally generated accessories',()=>{
 const hero=createKaito(THREE);
 assert.equal(hero.name,'Kaito Nami');assert.equal(hero.userData.characterId,'kaito-nami');
 assert.deepEqual(KAITO_PROFILE,{name:'Kaito Nami',age:12,origin:'Okinawa, Japão',personality:['divertido','corajoso','inteligente','curioso','protetor dos amigos']});
 assert.ok(Object.isFrozen(KAITO_PROFILE.personality));
 const names=allPartNames(hero);
 for(const detail of ['Rosto infantil natural','Mecha bagunçada','Lente vermelha','Desenho de onda','Bermuda florida','Sola de chinelo','Mochila vermelha','Prancha de surf personalizada','Inicial K','Inicial N'])assert.ok(names.includes(detail),detail);
 assert.doesNotMatch(names,/Batman|Batsuit|Cape|capa|bat-symbol/);
 hero.updateMatrixWorld(true);
 const body=new THREE.Box3().setFromObject(hero.getObjectByName('Corpo de Kaito'));
 const head=new THREE.Box3().setFromObject(hero.getObjectByName('Rosto infantil e cabelo curto'));
 const bodyHeight=body.max.y-body.min.y,headHeight=head.max.y-head.min.y;
 assert.ok(bodyHeight>1.95&&bodyHeight<2.2,`child height ${bodyHeight}`);
 assert.ok(bodyHeight/headHeight>4.8&&bodyHeight/headHeight<6.6,`natural head ratio ${bodyHeight/headHeight}`);
 assert.ok(body.max.x-body.min.x<.95,'slender child body, not adult superhero shoulders');
 let textures=0;
 hero.traverse(part=>{if(part.material?.map){textures++;assert.ok(part.material.map.isDataTexture,'clothing pattern is local data');assert.ok(part.material.map.image.data.length>0);assert.equal(part.material.map.source.data.src,undefined);}});
 assert.ok(textures>0,'floral pattern is rendered, not only metadata');
 assert.ok(hero.userData.renderStats.afterMeshes<hero.userData.renderStats.beforeMeshes*.65,'rigid parts are batched');
});

test('equipment preserves the blue wave shirt, red lenses, red backpack and floral shorts',()=>{
 const hero=createKaito(THREE),byName=materials(hero);
 const blue=byName.get('Camiseta azul'),pack=byName.get('Mochila vermelha'),lenses=byName.get('Lentes vermelhas');
 const palette=[blue.color.getHex(),pack.color.getHex(),lenses.color.getHex()];
 for(const id of ['vigilante','tactical','rescue','detective','armored']){
   assert.equal(hero.userData.setArmor(id),id);assert.equal(hero.userData.armorId,id);
   assert.deepEqual([blue.color.getHex(),pack.color.getHex(),lenses.color.getHex()],palette);
   assert.match(allPartNames(hero),/Bermuda florida/);
 }
 assert.equal(hero.userData.setArmor('unknown'),'vigilante');
});

test('surfing deploys the board below the feet and all gameplay poses stay finite',()=>{
 const hero=createKaito(THREE),board=hero.getObjectByName('Prancha de surf personalizada');
 assert.equal(hero.userData.boardState,'back');assert.equal(hero.userData.boardMode,'carried');assert.ok(board.position.y>.9);assert.ok(board.position.z<-.3);
 hero.userData.update({time:1.2,gliding:true});
 assert.equal(hero.userData.boardState,'surf');assert.equal(hero.userData.boardMode,'surfing');assert.equal(hero.userData.surfing,true);assert.ok(board.position.y<.1);assert.ok(Math.abs(board.rotation.x)<.1);
 const poses=[{moving:true},{grappling:true},{defending:true},{finisher:true,attackPhase:.5},{attackType:'heavy',attackPhase:.5},{attackType:'slam',attackPhase:.4},{attacking:true,attackType:'punch',attackPhase:.6},{time:Infinity,attackPhase:NaN}];
 for(const pose of poses){
   hero.userData.update({time:.8,...pose});hero.updateMatrixWorld(true);
   hero.traverse(part=>{assert.ok(part.matrixWorld.elements.every(Number.isFinite),part.name);});
 }
 hero.userData.update();assert.equal(hero.userData.boardState,'back');assert.equal(hero.userData.surfing,false);
});
