/** Input-driven activities. Rendering and mission rewards stay in the game. */
export function createChallenge(kind, siteId) {
  if (!['signal', 'evidence'].includes(kind)) throw new RangeError('Atividade desconhecida');
  return {
    kind, siteId, progress: 0, time: 0, cursor: 0.5, zoneStart: .22, zoneWidth: .22,
    pattern: siteId === 'evidence-orders' ? ['B','A','C','B'] : ['A','C','B'],
    finished: false,
  };
}

export function tickChallenge(state, dt) {
  if (state.finished || !Number.isFinite(dt) || dt <= 0) return;
  state.time += Math.min(dt, .1);
  state.cursor = (Math.sin(state.time * 2.4) + 1) / 2;
  state.zoneStart = [.22, .60, .40][state.progress] ?? .40;
}

export function submitChallenge(state, input) {
  if (state.finished) return { ok: false, complete: true };
  const correct = state.kind === 'signal'
    ? input === 'sync' && state.cursor >= state.zoneStart && state.cursor <= state.zoneStart + state.zoneWidth
    : input === state.pattern[state.progress];
  if (!correct) {
    state.progress = state.kind === 'signal' ? Math.max(0, state.progress-1) : 0;
    state.zoneStart = [.22, .60, .40][state.progress];
    return { ok: false, complete: false };
  }
  state.progress++;
  state.finished = state.progress >= (state.kind === 'signal' ? 3 : state.pattern.length);
  state.zoneStart = [.22, .60, .40][state.progress] ?? .40;
  return { ok: true, complete: state.finished };
}
