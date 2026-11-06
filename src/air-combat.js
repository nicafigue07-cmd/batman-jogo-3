export function createAirborneState(y){return Number.isFinite(y)?{y,velocity:12,finished:false}:null;}
export function tickAirborne(state,dt,floor=0){if(!state||state.finished||!Number.isFinite(dt)||dt<=0)return state;dt=Math.min(dt,.025);state.velocity-=26*dt;state.y+=state.velocity*dt;if(state.y<=floor&&state.velocity<=0){state.y=floor;state.velocity=0;state.finished=true;}return state;}
