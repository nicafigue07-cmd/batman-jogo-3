const finitePoint=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
/** First contact along a segment. A fast projectile cannot skip a small target. */
export function segmentSphereContact(start,end,center,radius){
 if(!finitePoint(start)||!finitePoint(end)||!finitePoint(center)||!Number.isFinite(radius)||radius<=0)return null;
 const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
 const ox=start.x-center.x,oy=start.y-center.y,oz=start.z-center.z;
 const c=ox*ox+oy*oy+oz*oz-radius*radius;if(c<=0)return 0;
 const a=dx*dx+dy*dy+dz*dz;if(a<1e-12)return null;
 const b=ox*dx+oy*dy+oz*dz,disc=b*b-a*c;if(disc<0)return null;
 const t=(-b-Math.sqrt(disc))/a;return t>=0&&t<=1?t:null;
}
