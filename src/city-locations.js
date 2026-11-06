/** Collision volumes use absolute top height and optional lower height. */
export const SURF_SHOP=Object.freeze({x:-215,z:-165,width:12,depth:10});
export function cityLocationSolids(){const {x,z}=SURF_SHOP;return [
 {id:'shop-left',x:x-6,z,w:.3,d:10,h:3.2},{id:'shop-right',x:x+6,z,w:.3,d:10,h:3.2},
 {id:'shop-back',x,z:z-5,w:12,d:.3,h:3.2},
 {id:'shop-front-left',x:x-3.6,z:z+5,w:4.8,d:.3,h:3.2},{id:'shop-front-right',x:x+3.6,z:z+5,w:4.8,d:.3,h:3.2},
 {id:'shop-roof',x,z,w:12.3,d:10.3,baseY:3.2,h:3.5},
 {id:'tunnel-left',x:79,z:112,w:.4,d:18,h:4.9},{id:'tunnel-right',x:89,z:112,w:.4,d:18,h:4.9},
 {id:'tunnel-roof',x:84,z:112,w:10.4,d:18,baseY:4.5,h:4.9}
 ];}
export function inSurfShop(p){return p&&Math.abs(p.x-SURF_SHOP.x)<5.7&&Math.abs(p.z-SURF_SHOP.z)<4.7&&p.y>=0&&p.y<3.2;}
