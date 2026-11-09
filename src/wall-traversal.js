/** Contact with a facade, excluding floors, rooftops and suspended ceilings. */
export function findWallContact(p,solids,radius=.42,height=2.05){
 let best=null;
 for(const b of solids){if(![b.x,b.z,b.w,b.d,b.h].every(Number.isFinite)||b.w<=0||b.d<=0)continue;const base=Number.isFinite(b.baseY)?b.baseY:0;if(p.y+height<=base||p.y>=b.h-.1)continue;
 const faces=[{gap:Math.abs(Math.abs(p.x-b.x)-b.w/2-radius),normal:{x:Math.sign(p.x-b.x)||1,z:0},valid:Math.abs(p.z-b.z)<b.d/2+.3},{gap:Math.abs(Math.abs(p.z-b.z)-b.d/2-radius),normal:{x:0,z:Math.sign(p.z-b.z)||1},valid:Math.abs(p.x-b.x)<b.w/2+.3}];
 for(const f of faces)if(f.valid&&f.gap<.65&&(!best||f.gap<best.gap))best={...f,building:b};
 }return best;
}
export function wallRunVelocity(contact,direction){if(!contact||![direction?.x,direction?.z].every(Number.isFinite))return null;const n=contact.normal,dot=direction.x*n.x+direction.z*n.z;const tx=direction.x-n.x*dot,tz=direction.z-n.z*dot,t=Math.hypot(tx,tz);if(t>.35)return {x:tx/t*13,y:1.5,z:tz/t*13,kind:'horizontal'};if(dot<-.2)return {x:0,y:12,z:0,kind:'vertical'};return null;}
export function isBodyClear(p,solids,radius=.42,height=2.05){return !solids.some(b=>p.y<b.h-1e-5&&p.y+height>(Number.isFinite(b.baseY)?b.baseY:0)+1e-5&&Math.abs(p.x-b.x)<b.w/2+radius-1e-5&&Math.abs(p.z-b.z)<b.d/2+radius-1e-5);}
