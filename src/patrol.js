/** Deterministic encounter selection and rewards; scene objects remain in main.js. */
export const PATROL_TYPES = Object.freeze({
  ambush: Object.freeze({
    title: 'Emboscada em Gotham',
    description: 'Neutralize o grupo armado. Use os telhados para escolher como entrar no combate.',
    timeLimit: 120, guardCount: 3, reward: 40,
  }),
  rescue: Object.freeze({
    title: 'Civil em perigo',
    description: 'Liberte o civil e acompanhe sua fuga até o ponto de extração.',
    timeLimit: 150, guardCount: 2, reward: 55,
  }),
  bomb: Object.freeze({
    title: 'Contagem regressiva',
    description: 'Encontre o explosivo, afaste os guardas e sincronize o desarme antes do fim do tempo.',
    timeLimit: 75, guardCount: 2, reward: 60,
  }),
  chase: Object.freeze({
    title: 'Mensageiro em fuga',
    description: 'Persiga o mensageiro pela rua e intercepte-o de perto antes que ele escape.',
    timeLimit: 100, guardCount: 0, reward: 50,
  }),
});

const groundOnly = new Set(['rescue', 'chase']);
const validLocation = location => location && typeof location.id === 'string'
  && location.id.length > 0 && ['ground', 'roof'].includes(location.terrain)
  && ['x', 'y', 'z'].every(axis => Number.isFinite(location[axis]));

export function createPatrolRun({ seed = Date.now() } = {}) {
  const normalizedSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 1;
  return {
    seed: normalizedSeed, randomState: normalizedSeed,
    round: 0, current: null, history: [], completed: 0, failed: 0, score: 0,
  };
}

function random(state) {
  // Mulberry32: the initial seed and all state are serializable and reproducible.
  state.randomState = (state.randomState + 0x6D2B79F5) >>> 0;
  let value = state.randomState;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

function pick(state, values) {
  return values[Math.floor(random(state) * values.length)];
}

export function nextEncounter(state, locations = []) {
  if (state.current && !state.current.finished) return state.current;

  // Keep the first descriptor for an id so duplicate entries cannot bias selection.
  const unique = new Map();
  for (const location of Array.isArray(locations) ? locations : []) {
    if (validLocation(location) && !unique.has(location.id)) unique.set(location.id, location);
  }
  const available = [...unique.values()];
  if (!available.length) throw new RangeError('A patrulha precisa de pelo menos um local válido.');

  const recent = state.history.slice(-2);
  const previousTypes = new Set(recent.map(entry => entry.type));
  const previousLocations = new Set(recent.map(entry => entry.locationId));
  const pairs = Object.keys(PATROL_TYPES).flatMap(type => available
    .filter(location => !groundOnly.has(type) || location.terrain === 'ground')
    .map(location => ({ type, location })));

  // Prefer both forms of variety together, then relax only when the pool requires it.
  const fresh = pairs.filter(pair => !previousTypes.has(pair.type) && !previousLocations.has(pair.location.id));
  const freshTypes = pairs.filter(pair => !previousTypes.has(pair.type));
  const freshLocations = pairs.filter(pair => !previousLocations.has(pair.location.id));
  const pool = fresh.length ? fresh : freshTypes.length ? freshTypes : freshLocations.length ? freshLocations : pairs;
  // Choose a type first so adding extra roof locations does not suppress ground missions.
  const type = pick(state, [...new Set(pool.map(pair => pair.type))]);
  const { location } = pick(state, pool.filter(pair => pair.type === type));
  const definition = PATROL_TYPES[type];
  state.round++;
  state.current = {
    id: `patrol-${state.round}`, type, locationId: location.id,
    title: definition.title, description: definition.description,
    x: location.x, y: location.y, z: location.z, terrain: location.terrain,
    timeLimit: definition.timeLimit, guardCount: definition.guardCount,
    reward: definition.reward, finished: false,
  };
  return state.current;
}

export function finishEncounter(state, { success, elapsed, damageTaken = 0, stealth = false } = {}) {
  const encounter = state.current;
  if (!encounter || encounter.finished) {
    return { ok: false, success: false, xpEarned: 0, bonusEarned: 0, summary: 'Esta ocorrência já foi encerrada.' };
  }
  if (!Number.isFinite(elapsed) || elapsed < 0 || !Number.isFinite(damageTaken) || damageTaken < 0) {
    return { ok: false, success: false, xpEarned: 0, bonusEarned: 0, summary: 'Tempo ou dano inválido.' };
  }
  const timedOut = elapsed > encounter.timeLimit;
  const completed = success === true && !timedOut;
  const bonusEarned = completed ? (damageTaken === 0 ? 10 : 0) + (stealth === true ? 10 : 0) : 0;
  const xpEarned = completed ? encounter.reward + bonusEarned : 0;
  encounter.finished = true;
  encounter.success = completed;
  state.completed += completed ? 1 : 0;
  state.failed += completed ? 0 : 1;
  state.score += xpEarned;
  state.history.push({
    id: encounter.id, type: encounter.type, locationId: encounter.locationId,
    success: completed, elapsed, damageTaken, stealth: stealth === true, xpEarned,
  });
  if (state.history.length > 12) state.history.splice(0, state.history.length - 12);
  return {
    ok: true, success: completed, xpEarned, bonusEarned,
    summary: completed
      ? `${encounter.title}: ocorrência resolvida! +${xpEarned} XP${bonusEarned ? ` (${bonusEarned} de bônus)` : ''}.`
      : timedOut ? 'O tempo acabou. Há outra ocorrência para investigar.' : 'Ocorrência encerrada. Prepare a próxima abordagem.',
  };
}
