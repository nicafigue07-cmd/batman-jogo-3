/* Shared collision, camera and input rules. Original code, MIT. */
(function (root) {
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function overlaps(x, z, obstacle, radius = .4) {
    if (obstacle.hx !== undefined) {
      if(obstacle.rot){const c=Math.cos(obstacle.rot),s=Math.sin(obstacle.rot),dx=x-obstacle.x,dz=z-obstacle.z;return Math.hypot(Math.max(0,Math.abs(dx*c-dz*s)-obstacle.hx),Math.max(0,Math.abs(dx*s+dz*c)-obstacle.hz))<radius-.00001;}
      const nearX = clamp(x, obstacle.x - obstacle.hx, obstacle.x + obstacle.hx);
      const nearZ = clamp(z, obstacle.z - obstacle.hz, obstacle.z + obstacle.hz);
      return Math.hypot(x - nearX, z - nearZ) < radius - .00001;
    }
    return Math.hypot(x - obstacle.x, z - obstacle.z) < (obstacle.r || 0) + radius - .00001;
  }
  function containsRect(x,z,o,margin=0){const dx=x-o.x,dz=z-o.z,c=Math.cos(o.rot||0),s=Math.sin(o.rot||0);return Math.abs(dx*c-dz*s)<=o.hx+margin&&Math.abs(dx*s+dz*c)<=o.hz+margin;}
  function solidAt(obstacle,foot,height=2.3){return foot<(obstacle.roofHeight??obstacle.height??Infinity)-.025&&foot+height>(obstacle.minHeight??-Infinity)+.025;}
  function pushOut(position, obstacles, radius = .4) {
    for (let pass = 0; pass < 6; pass++) {
      let changed = false;
      for (const o of obstacles) {
        if (!overlaps(position.x, position.z, o, radius)) continue;
        if(o.rot){const c=Math.cos(o.rot),s=Math.sin(o.rot),dx=position.x-o.x,dz=position.z-o.z,local={x:dx*c-dz*s,z:dx*s+dz*c};pushOut(local,[{x:0,z:0,hx:o.hx,hz:o.hz}],radius);position.x=o.x+local.x*c+local.z*s;position.z=o.z-local.x*s+local.z*c;changed=true;continue;}
        if (o.hx !== undefined) {
          const nx = clamp(position.x, o.x - o.hx, o.x + o.hx);
          const nz = clamp(position.z, o.z - o.hz, o.z + o.hz);
          let dx = position.x - nx, dz = position.z - nz, length = Math.hypot(dx, dz);
          if (length > .00001) {
            position.x = nx + dx / length * (radius + .001);
            position.z = nz + dz / length * (radius + .001);
          } else {
            const exits = [
              {d: position.x - (o.x - o.hx), x: o.x - o.hx - radius - .001, z: position.z},
              {d: o.x + o.hx - position.x, x: o.x + o.hx + radius + .001, z: position.z},
              {d: position.z - (o.z - o.hz), x: position.x, z: o.z - o.hz - radius - .001},
              {d: o.z + o.hz - position.z, x: position.x, z: o.z + o.hz + radius + .001},
            ];
            const exit = exits.reduce((best, e) => e.d < best.d ? e : best);
            position.x = exit.x; position.z = exit.z;
          }
        } else {
          let dx = position.x - o.x, dz = position.z - o.z, length = Math.hypot(dx, dz);
          if (length < .00001) { dx = 1; dz = 0; length = 1; }
          position.x = o.x + dx / length * ((o.r || 0) + radius + .001);
          position.z = o.z + dz / length * ((o.r || 0) + radius + .001);
        }
        changed = true;
      }
      if (!changed) break;
    }
    return position;
  }
  function move(position, dx, dz, obstacles = [], radius = .4) {
    dx = finite(dx); dz = finite(dz);
    pushOut(position, obstacles, radius);
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .12));
    for (let step = 0; step < steps; step++) {
      const nx = position.x + dx / steps;
      if (!obstacles.some(o => overlaps(nx, position.z, o, radius))) position.x = nx;
      const nz = position.z + dz / steps;
      if (!obstacles.some(o => overlaps(position.x, nz, o, radius))) position.z = nz;
    }
    return position;
  }
  function cameraPosition(target, desired, obstacles) {
    const result = [...desired], dx = desired[0] - target[0], dz = desired[2] - target[2];
    const length = Math.hypot(dx, dz), samples = Math.max(2, Math.ceil(length / .15));
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const y=target[1]+(desired[1]-target[1])*t;
      if (obstacles.some(o => (o.height===undefined||y<o.height+.35)&&(o.minHeight===undefined||y>o.minHeight-.15)&&overlaps(target[0] + dx * t, target[2] + dz * t, o, .22))) {
        const safe = Math.max(.02 / Math.max(length,.02), (i - 1) / samples);
        result[0] = target[0] + dx * safe; result[1] = target[1]+(desired[1]-target[1])*safe; result[2] = target[2] + dz * safe;
        break;
      }
    }
    return result;
  }
  function safeCamera(target,desired,obstacles){let best=cameraPosition(target,desired,obstacles),distance=Math.hypot(best[0]-target[0],best[2]-target[2]);if(distance>=2.4)return best;const dx=desired[0]-target[0],dz=desired[2]-target[2];for(const angle of [Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI]){const c=Math.cos(angle),s=Math.sin(angle),candidate=cameraPosition(target,[target[0]+dx*c+dz*s,desired[1],target[2]-dx*s+dz*c],obstacles),length=Math.hypot(candidate[0]-target[0],candidate[2]-target[2]);if(length>distance){best=candidate;distance=length;}if(distance>=2.4)break;}return best;}
  function stick(x, z, deadzone = .16) {
    x = clamp(finite(x), -1, 1); z = clamp(finite(z), -1, 1);
    const length = Math.hypot(x, z);
    if (length <= deadzone) return {x: 0, z: 0};
    const magnitude = (Math.min(1, length) - deadzone) / (1 - deadzone);
    return {x: x / length * magnitude, z: z / length * magnitude};
  }
  function gamepad(pad, previous = [], dt = .016) {
    const neutral = {x: 0, z: 0, lookX: 0, lookY: 0, jump: false, run: false, buttons: [], pressed: []};
    if (!pad || pad.connected === false || !pad.axes || !pad.buttons ||
        (pad.mapping && pad.mapping !== 'standard')) return neutral;
    const move = stick(pad.axes[0], pad.axes[1]), look = stick(pad.axes[2], pad.axes[3]);
    const buttons = Array.from(pad.buttons, b => b === 1 || b?.pressed === true || b?.value > .5);
    return {...move, lookX: look.x * clamp(finite(dt), 0, .05) * 2.1,
      lookY: look.z * clamp(finite(dt), 0, .05) * 3,
      jump: !!buttons[0], run: !!buttons[4], buttons,
      pressed: buttons.map((b, i) => b && !previous[i])};
  }

  function preferences(raw) {
    const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    const number=(name,fallback,min,max)=>Number.isFinite(Number(s[name]))?clamp(Number(s[name]),min,max):fallback;
    const result={quality:['1','1.5','2'].includes(String(s.quality))?String(s.quality):'1.5',
      fpsCap:Number(s.fpsCap)===30?30:60,compatibility:!!s.compatibility,
      difficulty:['easy','normal','hard'].includes(s.difficulty)?s.difficulty:'normal',
      dayCycle:s.dayCycle!==false,narration:!!s.narration,dialogueVolume:number('dialogueVolume',70,0,100),volume:number('volume',35,0,100),music:number('music',0,0,100),distance:number('distance',95,40,140),
      sensitivity:number('sensitivity',1,.5,2),map:s.map!==false,shadows:s.shadows!==false,weather:s.weather!==false,
      reducedMotion:!!s.reducedMotion,contrast:!!s.contrast,largeText:!!s.largeText,cinematics:s.cinematics!==false,
      tutorials:s.tutorials!==false,performance:!!s.performance,bindings:{}};
    const defaults={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',power:'KeyQ',interact:'KeyE',dodge:'KeyR',attack:'KeyF',parry:'KeyG'};
    const reserved=new Set(['KeyK','KeyJ','KeyI','KeyM','KeyC','Escape','ShiftLeft','ShiftRight']);
    const taken=new Set();
    for(const name of Object.keys(defaults)){
      const value=s.bindings?.[name];
      const valid=typeof value==='string'&&/^(Key[A-Z]|Space|ControlLeft|ControlRight)$/.test(value)&&!reserved.has(value)&&!taken.has(value)&&!Object.entries(defaults).some(([other,key])=>other!==name&&key===value);
      result.bindings[name]=valid?value:defaults[name];taken.add(result.bindings[name]);
    }
    return result;
  }

  function combatFraming(player,target,angle,dt,reduced,out={}){
    out.angle=angle;out.x=player.x;out.z=player.z;out.distance=0;out.fov=0;
    if(!target||reduced)return out;
    const dx=player.x-target.x,dz=player.z-target.z,length=Math.hypot(dx,dz),desired=Math.atan2(dx,dz);
    out.angle=angle+Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle))*(1-Math.exp(-clamp(finite(dt),0,.05)*4));
    const blend=Math.min(.22,3/Math.max(1,length));out.x=player.x-dx*blend;out.z=player.z-dz*blend;out.distance=target.boss?2:1;out.fov=target.boss?4:2;return out;
  }
  function frustum(matrix,out=new Float32Array(24)){let index=0;for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const a=matrix[3]+sign*matrix[axis],b=matrix[7]+sign*matrix[axis+4],c=matrix[11]+sign*matrix[axis+8],d=matrix[15]+sign*matrix[axis+12],length=Math.hypot(a,b,c)||1;out[index++]=a/length;out[index++]=b/length;out[index++]=c/length;out[index++]=d/length;}return out;}
  function visibleSphere(planes,x,y,z,radius){for(let i=0;i<24;i+=4)if(planes[i]*x+planes[i+1]*y+planes[i+2]*z+planes[i+3]<-radius)return false;return true;}
  function daylight(time){return .18+.82*Math.max(0,Math.sin((finite(time)/480*24+4)/24*Math.PI*2));}
  function worldClock(time){const minutes=Math.floor(((finite(time)/480*24+10)%24)*60);return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
  const api = {containsRect,solidAt,safeCamera,daylight,worldClock,frustum,visibleSphere,combatFraming,preferences, finite, clamp, overlaps, pushOut, move, cameraPosition, stick, gamepad};
  root.KaitoSystems = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
