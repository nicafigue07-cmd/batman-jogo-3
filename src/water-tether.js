const point=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
/** A water rope is an upper distance constraint, not a scripted flight path. */
export function createWaterTether(position,velocity,anchor){
 if(!point(position)||!point(velocity)||!point(anchor))return null;
 const length=Math.hypot(position.x-anchor.x,position.y-anchor.y,position.z-anchor.z);
 if(length<8||length>150)return null;
 return {anchor:{...anchor},length,position:{...position},velocity:{...velocity},taut:false};
}
export function stepWaterTether(state,dt,steer={x:0,z:0}){
 if(!state||!Number.isFinite(dt)||dt<=0)return state;
 dt=Math.min(dt,.025);const v=state.velocity,p=state.position;
 const x=Number.isFinite(steer.x)?steer.x:0,z=Number.isFinite(steer.z)?steer.z:0,l=Math.max(1,Math.hypot(x,z));
 v.x=(v.x+x/l*12*dt)*Math.exp(-dt*.04);v.z=(v.z+z/l*12*dt)*Math.exp(-dt*.04);v.y-=24*dt;
 const speed=Math.hypot(v.x,v.y,v.z);if(speed>65){v.x*=65/speed;v.y*=65/speed;v.z*=65/speed;}
 p.x+=v.x*dt;p.y+=v.y*dt;p.z+=v.z*dt;
 const dx=p.x-state.anchor.x,dy=p.y-state.anchor.y,dz=p.z-state.anchor.z,d=Math.hypot(dx,dy,dz);
 state.taut=d>=state.length;
 if(d>state.length){const nx=dx/d,ny=dy/d,nz=dz/d;p.x=state.anchor.x+nx*state.length;p.y=state.anchor.y+ny*state.length;p.z=state.anchor.z+nz*state.length;const radial=v.x*nx+v.y*ny+v.z*nz;if(radial>0){v.x-=radial*nx;v.y-=radial*ny;v.z-=radial*nz;}}
 return state;
}
export function releaseWaterTether(state){return state?{...state.velocity}:{x:0,y:0,z:0};}
export function jumpImpulse(charge=0,speed=0){const c=Number.isFinite(charge)?Math.max(0,Math.min(1,charge)):0,s=Number.isFinite(speed)?Math.max(0,Math.min(20,speed)):0;return 15+c*9+s*.12;}
