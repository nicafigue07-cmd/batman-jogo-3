/** Quiet procedural ambience. No audio resources or contexts exist before opt-in. */
export function createSoundscape() {
  let context = null, master = null, rainGain = null, windGain = null;
  let windFilter = null, droneGain = null, combatGain = null;
  let enabled = false, disposed = false, revision = 0, lastUpdate = -Infinity;
  let speed = 0, gliding = false, inCombat = false;
  const nodes = [], sources = [];
  const keep = node => { nodes.push(node); return node; };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function smooth(param, target, time, duration = .25) {
    param.cancelScheduledValues(time);
    param.setTargetAtTime(target, time, duration);
  }

  function releaseGraph() {
    for (const source of sources.splice(0)) {
      try { source.stop(); } catch { /* A partially initialized source may not be running. */ }
    }
    for (const node of nodes.splice(0)) {
      try { node.disconnect(); } catch { /* Disposal is safe after an interrupted setup. */ }
    }
    const previous = context;
    context = master = rainGain = windGain = windFilter = droneGain = combatGain = null;
    if (previous && previous.state !== 'closed') {
      try { Promise.resolve(previous.close()).catch(() => {}); } catch { /* Audio is optional. */ }
    }
  }

  function createGraph() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (typeof AudioContextClass !== 'function') return false;
    try {
      context = new AudioContextClass({ latencyHint: 'interactive' });
      master = keep(context.createGain());
      master.gain.value = 0;
      master.connect(context.destination);

      // A single looping noise buffer feeds the rain and wind filters.
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
      const noise = keep(context.createBufferSource());
      noise.buffer = buffer;
      noise.loop = true;
      sources.push(noise);

      const rainFilter = keep(context.createBiquadFilter());
      rainFilter.type = 'highpass';
      rainFilter.frequency.value = 1700;
      const rainSoftener = keep(context.createBiquadFilter());
      rainSoftener.type = 'lowpass';
      rainSoftener.frequency.value = 6500;
      rainGain = keep(context.createGain());
      rainGain.gain.value = .012;
      noise.connect(rainFilter).connect(rainSoftener).connect(rainGain).connect(master);

      windFilter = keep(context.createBiquadFilter());
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 420;
      windFilter.Q.value = .55;
      windGain = keep(context.createGain());
      windGain.gain.value = .002;
      noise.connect(windFilter).connect(windGain).connect(master);

      // A quiet minor-third drone sits beneath the city rather than leading it.
      droneGain = keep(context.createGain());
      droneGain.gain.value = .0025;
      droneGain.connect(master);
      for (const frequency of [55, 65.4064]) {
        const drone = keep(context.createOscillator());
        drone.type = 'sine';
        drone.frequency.value = frequency;
        drone.connect(droneGain);
        sources.push(drone);
      }

      const pulse = keep(context.createOscillator());
      pulse.type = 'sine';
      pulse.frequency.value = 110;
      const pulseEnvelope = keep(context.createGain());
      pulseEnvelope.gain.value = .5;
      const pulseLFO = keep(context.createOscillator());
      pulseLFO.type = 'sine';
      pulseLFO.frequency.value = 2.4;
      const pulseDepth = keep(context.createGain());
      pulseDepth.gain.value = .45;
      pulseLFO.connect(pulseDepth).connect(pulseEnvelope.gain);
      combatGain = keep(context.createGain());
      combatGain.gain.value = 0;
      pulse.connect(pulseEnvelope).connect(combatGain).connect(master);
      sources.push(pulse, pulseLFO);
      for (const source of sources) source.start();
      lastUpdate = -Infinity;
      return true;
    } catch {
      releaseGraph();
      return false;
    }
  }

  function applyMix(force = false) {
    if (!enabled || !context || context.state !== 'running') return;
    const now = context.currentTime;
    // A few control updates each second suffice; rendering never creates audio nodes.
    if (!force && now - lastUpdate < .08) return;
    lastUpdate = now;
    const movement = clamp(speed / 32, 0, 1);
    smooth(rainGain.gain, gliding ? .009 : .012, now);
    smooth(windGain.gain, .002 + movement * .014 + (gliding ? .012 : 0), now, .18);
    smooth(windFilter.frequency, 420 + movement * 680 + (gliding ? 360 : 0), now);
    smooth(droneGain.gain, inCombat ? .0018 : .0025, now, .6);
    smooth(combatGain.gain, inCombat ? .008 : 0, now, .3);
  }

  /** Call from the sound button gesture. Autoplay refusal resolves false, never rejects. */
  function setEnabled(value) {
    const currentRevision = ++revision;
    enabled = value === true && !disposed;
    if (!enabled) {
      if (!context || context.state === 'closed') return Promise.resolve(false);
      try {
        smooth(master.gain, 0, context.currentTime, .04);
        return Promise.resolve(context.suspend()).then(() => false, () => false);
      } catch { return Promise.resolve(false); }
    }
    if (!context && !createGraph()) {
      enabled = false;
      return Promise.resolve(false);
    }
    try {
      // Resume synchronously within the user's gesture, before awaiting its result.
      return Promise.resolve(context.resume()).then(() => {
        if (disposed || !enabled || currentRevision !== revision || context?.state !== 'running') return false;
        smooth(master.gain, 1, context.currentTime, .12);
        applyMix(true);
        return true;
      }).catch(() => {
        if (currentRevision === revision) enabled = false;
        return false;
      });
    } catch {
      if (currentRevision === revision) enabled = false;
      return Promise.resolve(false);
    }
  }

  function update(settings = {}) {
    const input = settings && typeof settings === 'object' ? settings : {};
    speed = Number.isFinite(input.speed) ? clamp(input.speed, 0, 100) : 0;
    gliding = input.gliding === true;
    inCombat = input.inCombat === true;
    if (disposed) return;
    try { applyMix(); } catch { /* Device changes cannot interrupt the game loop. */ }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    enabled = false;
    revision++;
    releaseGraph();
  }

  return { setEnabled, update, dispose };
}
