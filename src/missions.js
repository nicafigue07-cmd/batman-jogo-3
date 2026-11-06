/** Mission definitions shared by the game, mission selector, and progress HUD. */
export const MISSIONS = [
  {
    id: 'signals',
    type: 'signal',
    terrain: 'roof',
    villainId: 'firefly',
    title: 'Silêncio na frequência',
    description: 'Persiga o Vagalume pelos telhados, neutralize seus guardas e sincronize três transmissores antes de encerrar a sabotagem.',
    briefing: 'Rádio da equipe: Kaito, o Vagalume está sabotando as antenas nos telhados. Libere os transmissores e use F para invadi-los. Sincronize três vezes com Espaço na faixa dourada e enfrente o sabotador.',
    completeMessage: 'Rede restaurada! Kaito ajudou a equipe a deter o Vagalume e desligar os três transmissores. Gotham voltou a se comunicar.',
    objectives: [
      { id: 'signals-financial', name: 'Distrito financeiro', x: 56, y: 35, z: 56, kind: 'signal', guardCount: 2, guardHealth: 3, interaction: 'Desativar transmissor' },
      { id: 'signals-old-gotham', name: 'Old Gotham', x: -112, y: 47, z: -56, kind: 'signal', guardCount: 2, guardHealth: 3, interaction: 'Desativar transmissor' },
      { id: 'signals-tower', name: 'Torre de transmissão', x: 56, y: 52, z: -112, kind: 'signal', guardCount: 2, guardHealth: 3, interaction: 'Desativar transmissor' },
    ],
  },
  {
    id: 'rescue',
    type: 'rescue',
    terrain: 'ground',
    villainId: 'penguin',
    title: 'Resgate na Rua do Mercado',
    description: 'Desça às ruas, enfrente o Pinguim e seus capangas e escolte o refém até a área de extração.',
    briefing: 'Rádio da equipe: Kaito, o Pinguim mantém um refém na Rua do Mercado. Vença os criminosos no chão, liberte o civil com F e acompanhe-o até o círculo de extração. Confirme a evacuação com F.',
    completeMessage: 'Civil a salvo! Kaito acompanhou a evacuação, o Pinguim perdeu o controle da rua e a equipe de emergência assumiu o resgate.',
    objectives: [
      { id: 'rescue-civilian', name: 'Rua do Mercado', x: -28, y: 0, z: 112, kind: 'rescue', guardCount: 2, guardHealth: 3, interaction: 'Resgatar civil' },
    ],
  },
  {
    id: 'evidence',
    type: 'evidence',
    terrain: 'ground',
    villainId: 'riddler',
    title: 'Rastros na noite',
    description: 'Investigue os enigmas do Charada nas ruas com o visor detetive e decifre duas sequências para desmontar sua armadilha.',
    briefing: 'Rádio da equipe: Kaito, o Charada deixou pistas nas ruas. Ative R nas áreas de busca, use F e reproduza a sequência A/B/C de cada prova. A última pista levará ao criminoso.',
    completeMessage: 'Enigmas resolvidos. O Charada foi encontrado e suas provas revelaram a operação na Torre de controle.',
    objectives: [
      { id: 'evidence-route', name: 'Beco dos enigmas', x: -28, y: 0, z: 56, kind: 'evidence', guardCount: 0, guardHealth: 3, interaction: 'Recolher pista' },
      { id: 'evidence-orders', name: 'Cruzamento do Charada', x: 28, y: 0, z: 0, kind: 'evidence', guardCount: 1, guardHealth: 3, interaction: 'Recolher pista' },
    ],
  },
  {
    id: 'finale',
    type: 'finale',
    terrain: 'roof',
    villainId: 'bane',
    title: 'Último sinal',
    description: 'Enfrente Bane na Torre de controle: esquive dos golpes pesados e ataque durante a abertura antes de desligar o terminal.',
    briefing: 'Rádio da equipe: Kaito, Bane protege o terminal no telhado. Aproxime-se para atrair o golpe pesado, esquive com Shift e contra-ataque quando sua defesa baixar. Depois desligue o terminal com F.',
    completeMessage: 'Operação encerrada. Bane foi neutralizado e o último terminal está desligado. Uma nova ameaça ainda cruza o céu de Gotham.',
    objectives: [
      { id: 'finale-terminal', name: 'Torre de controle', x: 112, y: 28.638754334766418, z: -112, kind: 'finale', guardCount: 0, guardHealth: 10, interaction: 'Desligar terminal final' },
    ],
  },
  {
    id: 'flight',
    type: 'flight',
    terrain: 'air',
    villainId: 'man-bat',
    title: 'Prancha contra o medo',
    description: 'Plane com a prancha por três anéis sobre as avenidas, siga o Morcego-Humano e enfrente-o no telhado final.',
    briefing: 'Rádio da equipe: Kaito, salte da torre central e segure Espaço para planar com sua prancha. Atravesse os três anéis dourados em ordem, sem usar o gancho dentro deles. Depois pouse no telhado marcado e detenha o Morcego-Humano.',
    completeMessage: 'Céu seguro. O Morcego-Humano foi detido após a perseguição aérea e Gotham pode respirar por esta noite.',
    launch: { x: 6, y: 84, z: -168 },
    objectives: [
      { id: 'flight-gate-1', name: 'Rastro sobre a avenida', x: 28, y: 84, z: -145, kind: 'flight', gateIndex: 1, gateTotal: 3, gateRadius: 8, gateDirectionZ: 1, guardCount: 0, guardHealth: 3, interaction: 'Planar pelo primeiro anel' },
      { id: 'flight-gate-2', name: 'Corredor aéreo', x: 28, y: 77, z: -105, kind: 'flight', gateIndex: 2, gateTotal: 3, gateRadius: 8, gateDirectionZ: 1, guardCount: 0, guardHealth: 3, interaction: 'Planar pelo segundo anel' },
      { id: 'flight-gate-3', name: 'Última curva', x: 28, y: 70, z: -65, kind: 'flight', gateIndex: 3, gateTotal: 3, gateRadius: 8, gateDirectionZ: 1, guardCount: 0, guardHealth: 3, interaction: 'Planar pelo terceiro anel' },
      { id: 'flight-finale', name: 'Pouso do Morcego-Humano', x: 56, y: 0, z: -56, kind: 'flight-finale', guardCount: 0, guardHealth: 3, interaction: 'Encerrar perseguição aérea' },
    ],
  },
];

/** A new state is also the reset operation; no progress is shared between runs. */
export function createCampaign({ missionId = null } = {}) {
  const selectedIndex = missionId === null ? 0 : MISSIONS.findIndex(mission => mission.id === missionId);
  if (selectedIndex < 0) throw new RangeError(`Missão desconhecida: ${missionId}`);
  return {
    missionId,
    currentMissionIndex: selectedIndex,
    objectiveIndex: 0,
    completedMissionIds: [],
    objectiveCounts: Object.fromEntries(MISSIONS.map(mission => [mission.id, 0])),
    finished: false,
  };
}

export function getCurrentMission(state) {
  return state.finished ? null : MISSIONS[state.currentMissionIndex] ?? null;
}

export function getCurrentObjective(state) {
  return getCurrentMission(state)?.objectives[state.objectiveIndex] ?? null;
}

/**
 * Advance only when the caller confirms that the active objective is reachable
 * and its guards are defeated. Coordinates and combat stay in the game layer.
 */
export function advanceObjective(state, { distance, guardsRemaining } = {}) {
  const mission = getCurrentMission(state);
  if (!mission || !getCurrentObjective(state)) return { ok: false, reason: 'complete' };
  if (!Number.isFinite(distance) || distance < 0 || distance > 5) return { ok: false, reason: 'distance' };
  if (!Number.isFinite(guardsRemaining) || guardsRemaining < 0 || guardsRemaining > 0) return { ok: false, reason: 'guards' };

  state.objectiveIndex++;
  state.objectiveCounts[mission.id]++;
  const missionCompleted = state.objectiveIndex === mission.objectives.length;
  let nextMission = null;
  if (missionCompleted) {
    state.completedMissionIds.push(mission.id);
    state.finished = state.missionId !== null || state.currentMissionIndex === MISSIONS.length - 1;
    if (!state.finished) {
      state.currentMissionIndex++;
      state.objectiveIndex = 0;
      nextMission = getCurrentMission(state);
    }
  }
  return {
    ok: true,
    missionCompleted,
    finished: state.finished,
    completedMission: missionCompleted ? mission : null,
    nextMission,
  };
}
