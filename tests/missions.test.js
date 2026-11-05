import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, createCampaign, getCurrentMission, getCurrentObjective, advanceObjective } from '../src/missions.js';

const complete = state => advanceObjective(state, { distance: 0, guardsRemaining: 0 });

test('mission definitions contain five distinct missions and eleven objectives', () => {
  assert.deepEqual(MISSIONS.map(mission => mission.id), ['signals', 'rescue', 'evidence', 'finale', 'flight']);
  const objectives = MISSIONS.flatMap(mission => mission.objectives);
  assert.equal(objectives.length, 11);
  assert.equal(new Set(objectives.map(objective => objective.id)).size, 11);
  assert.equal(MISSIONS[3].objectives[0].guardHealth, 10);
  assert.equal(MISSIONS[2].objectives[0].guardCount, 0);
  for (const mission of MISSIONS) {
    assert.ok(mission.title && mission.description && mission.briefing && mission.completeMessage);
    for (const objective of mission.objectives) {
      assert.ok(objective.name && objective.kind && objective.interaction);
      assert.ok([objective.x, objective.y, objective.z].every(Number.isFinite));
    }
  }
});

test('missions cover streets, rooftops, and the sky with a different villain in each', () => {
  assert.deepEqual(MISSIONS.map(mission => [mission.id, mission.terrain, mission.villainId]), [
    ['signals', 'roof', 'firefly'],
    ['rescue', 'ground', 'penguin'],
    ['evidence', 'ground', 'riddler'],
    ['finale', 'roof', 'bane'],
    ['flight', 'air', 'man-bat'],
  ]);
  assert.equal(new Set(MISSIONS.map(mission => mission.villainId)).size, MISSIONS.length);
  const groundObjectives = MISSIONS.filter(mission => mission.terrain === 'ground').flatMap(mission => mission.objectives);
  assert.deepEqual(groundObjectives.map(({ id, x, y, z }) => ({ id, x, y, z })), [
    { id: 'rescue-civilian', x: -28, y: 0, z: 112 },
    { id: 'evidence-route', x: -28, y: 0, z: 56 },
    { id: 'evidence-orders', x: 28, y: 0, z: 0 },
  ]);
  assert.deepEqual(MISSIONS[0].objectives.map(({ x, y, z }) => [x, y, z]), [[56,35,56],[-112,47,-56],[56,52,-112]]);
  assert.deepEqual(MISSIONS[3].objectives.map(({ x, y, z }) => [x, y, z]), [[112,28.638754334766418,-112]]);
});

test('flight starts above the city and descends through three street-aligned gates before its rooftop finale', () => {
  const flight = MISSIONS.find(mission => mission.id === 'flight');
  assert.deepEqual(flight.launch, { x: 6, y: 84, z: -168 });
  const gates = flight.objectives.filter(objective => objective.kind === 'flight');
  assert.equal(gates.length, 3);
  assert.deepEqual(gates.map(gate => gate.gateIndex), [1, 2, 3]);
  assert.ok(gates.every(gate => gate.gateTotal === 3 && gate.guardCount === 0 && gate.x === 28));
  for (let index = 0; index < gates.length; index++) {
    const previous = index === 0 ? flight.launch : gates[index - 1];
    assert.ok(gates[index].y <= previous.y, 'gates start at launch height and continue down the flight route');
    assert.ok(gates[index].z > previous.z, 'gates follow one route toward the destination roof');
  }
  assert.equal(flight.objectives.at(-1).id, 'flight-finale');
  assert.equal(flight.objectives.at(-1).kind, 'flight-finale');
  assert.equal(flight.objectives.at(-1).guardCount, 0);
});

test('campaign starts at the first transmitter without shared progress', () => {
  const state = createCampaign();
  assert.equal(state.missionId, null);
  assert.equal(getCurrentMission(state).id, 'signals');
  assert.equal(getCurrentObjective(state).id, 'signals-financial');
  assert.equal(state.finished, false);
  assert.deepEqual(state.completedMissionIds, []);
  assert.deepEqual(state.objectiveCounts, { signals: 0, rescue: 0, evidence: 0, finale: 0, flight: 0 });
});

test('out-of-range or invalid distances cannot change mission progress', () => {
  const state = createCampaign();
  const original = structuredClone(state);
  for (const distance of [5.01, Infinity, NaN, -1, undefined, null]) {
    assert.deepEqual(advanceObjective(state, { distance, guardsRemaining: 0 }), { ok: false, reason: 'distance' });
    assert.deepEqual(state, original);
  }
});

test('remaining guards block interactions, including an attempted final interaction', () => {
  const state = createCampaign({ missionId: 'finale' });
  const original = structuredClone(state);
  assert.deepEqual(advanceObjective(state, { distance: 2, guardsRemaining: 1 }), { ok: false, reason: 'guards' });
  assert.deepEqual(state, original);
  assert.equal(state.finished, false);
  assert.equal(getCurrentMission(state).id, 'finale');
});

test('invalid guard counts cannot bypass combat prerequisites', () => {
  const state = createCampaign();
  const original = structuredClone(state);
  for (const guardsRemaining of [undefined, NaN, Infinity, -1]) {
    assert.deepEqual(advanceObjective(state, { distance: 0, guardsRemaining }), { ok: false, reason: 'guards' });
    assert.deepEqual(state, original);
  }
});

test('distance of exactly five meters permits the active objective', () => {
  const state = createCampaign();
  const result = advanceObjective(state, { distance: 5, guardsRemaining: 0 });
  assert.deepEqual(result, { ok: true, missionCompleted: false, finished: false, completedMission: null, nextMission: null });
  assert.equal(state.objectiveIndex, 1);
  assert.equal(state.objectiveCounts.signals, 1);
  assert.equal(getCurrentObjective(state).id, 'signals-old-gotham');
});

test('the original three signals advance to rescue without ending the campaign', () => {
  const state = createCampaign();
  complete(state); complete(state);
  const result = complete(state);
  assert.equal(result.missionCompleted, true);
  assert.equal(result.finished, false);
  assert.equal(result.completedMission, MISSIONS[0]);
  assert.equal(result.nextMission, MISSIONS[1]);
  assert.equal(state.objectiveIndex, 0);
  assert.equal(getCurrentMission(state).id, 'rescue');
  assert.deepEqual(state.completedMissionIds, ['signals']);
  assert.equal(state.objectiveCounts.signals, 3);
});

test('the full campaign wins only after all eleven objectives across five missions', () => {
  const state = createCampaign();
  const observedMissions = [];
  let result;
  for(let index = 0; index < 11; index++) {
    observedMissions.push(getCurrentMission(state).id);
    result = complete(state);
    assert.equal(result.ok, true);
    assert.equal(result.finished, index === 10);
  }
  assert.deepEqual(observedMissions, ['signals', 'signals', 'signals', 'rescue', 'evidence', 'evidence', 'finale', 'flight', 'flight', 'flight', 'flight']);
  assert.deepEqual(state.completedMissionIds, ['signals', 'rescue', 'evidence', 'finale', 'flight']);
  assert.deepEqual(state.objectiveCounts, { signals: 3, rescue: 1, evidence: 2, finale: 1, flight: 4 });
  assert.equal(result.completedMission.id, 'flight');
  assert.equal(result.nextMission, null);
  assert.match(result.completedMission.completeMessage, /Morcego-Humano foi detido/);
  assert.equal(getCurrentMission(state), null);
  assert.equal(getCurrentObjective(state), null);
  const finishedState = structuredClone(state);
  assert.deepEqual(complete(state), { ok: false, reason: 'complete' });
  assert.deepEqual(state, finishedState);
});

test('selecting evidence runs its two clues independently and then finishes', () => {
  const state = createCampaign({ missionId: 'evidence' });
  assert.equal(state.currentMissionIndex, 2);
  assert.equal(getCurrentObjective(state).id, 'evidence-route');
  assert.equal(complete(state).finished, false);
  assert.equal(getCurrentObjective(state).id, 'evidence-orders');
  const result = complete(state);
  assert.equal(result.finished, true);
  assert.equal(result.completedMission.id, 'evidence');
  assert.equal(result.nextMission, null);
  assert.deepEqual(state.completedMissionIds, ['evidence']);
  assert.deepEqual(state.objectiveCounts, { signals: 0, rescue: 0, evidence: 2, finale: 0, flight: 0 });
});

test('single-mission rescue does not start investigation or report campaign progress', () => {
  const state = createCampaign({ missionId: 'rescue' });
  assert.equal(getCurrentMission(state).id, 'rescue');
  const result = complete(state);
  assert.equal(result.finished, true);
  assert.equal(result.nextMission, null);
  assert.deepEqual(state.completedMissionIds, ['rescue']);
  assert.deepEqual(state.objectiveCounts, { signals: 0, rescue: 1, evidence: 0, finale: 0, flight: 0 });
});

test('the old finale remains independently playable and campaign play continues to flight', () => {
  const single = createCampaign({ missionId: 'finale' });
  assert.equal(complete(single).finished, true);
  assert.deepEqual(single.completedMissionIds, ['finale']);
  const campaign = createCampaign();
  for (let index = 0; index < 7; index++) complete(campaign);
  assert.equal(campaign.finished, false);
  assert.equal(getCurrentMission(campaign).id, 'flight');
  assert.equal(getCurrentObjective(campaign).id, 'flight-gate-1');
});

test('standalone flight requires all three gates and its final encounter before completion', () => {
  const state = createCampaign({ missionId: 'flight' });
  for (const id of ['flight-gate-1', 'flight-gate-2', 'flight-gate-3']) {
    assert.equal(getCurrentObjective(state).id, id);
    assert.equal(complete(state).finished, false);
  }
  assert.equal(getCurrentObjective(state).id, 'flight-finale');
  assert.deepEqual(advanceObjective(state, { distance: 0, guardsRemaining: 1 }), { ok: false, reason: 'guards' });
  const result = complete(state);
  assert.equal(result.finished, true);
  assert.deepEqual(state.completedMissionIds, ['flight']);
  assert.equal(state.objectiveCounts.flight, 4);
});

test('a new campaign or restart never retains counts or changes mission definitions', () => {
  const definitions = structuredClone(MISSIONS);
  const previous = createCampaign();
  complete(previous); complete(previous); complete(previous); complete(previous);
  const next = createCampaign();
  assert.equal(next.currentMissionIndex, 0);
  assert.equal(next.objectiveIndex, 0);
  assert.deepEqual(next.completedMissionIds, []);
  assert.equal(next.objectiveCounts.signals, 0);
  assert.equal(previous.objectiveCounts.signals, 3);
  const restarted = createCampaign({ missionId: 'evidence' });
  assert.equal(restarted.objectiveIndex, 0);
  assert.equal(restarted.objectiveCounts.evidence, 0);
  assert.deepEqual(MISSIONS, definitions);
});

test('unknown mission IDs fail explicitly instead of starting another mission', () => {
  assert.throws(() => createCampaign({ missionId: 'missing' }), RangeError);
  assert.throws(() => createCampaign({ missionId: '' }), RangeError);
});
