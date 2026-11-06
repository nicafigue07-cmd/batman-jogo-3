import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, getCurrentMission, getCurrentObjective, advanceObjective } from '../src/missions.js';
import { makeCheckpoint, parseCheckpoint, restoreCheckpoint } from '../src/checkpoint.js';

const advance = campaign => advanceObjective(campaign, { distance: 0, guardsRemaining: 0 });
const roundTrip = campaign => restoreCheckpoint(JSON.stringify(makeCheckpoint(campaign)));

test('checkpoint restores the next transmitter rather than repeating completed transmitters', () => {
  const campaign = createCampaign();
  advance(campaign);
  const restored = roundTrip(campaign);
  assert.deepEqual(restored, campaign);
  assert.equal(getCurrentObjective(restored).id, 'signals-old-gotham');
  assert.equal(restored.objectiveCounts.signals, 1);
  advance(restored);
  assert.equal(getCurrentObjective(restored).id, 'signals-tower');
  assert.equal(getCurrentObjective(campaign).id, 'signals-old-gotham');
});

test('campaign checkpoint reconstructs prior completions and the ground mission position', () => {
  const campaign = createCampaign();
  for (let index = 0; index < 3; index++) advance(campaign);
  assert.equal(getCurrentMission(campaign).id, 'rescue');
  assert.deepEqual(roundTrip(campaign), campaign);
  const restored = roundTrip(campaign);
  assert.equal(restored.missionId, null);
  assert.equal(restored.currentMissionIndex, 1);
  assert.equal(restored.objectiveCounts.signals, 3);
  assert.equal(restored.objectiveCounts.rescue, 0);
});

test('aerial checkpoint preserves the remaining gates and prior campaign mission counts', () => {
  const campaign = createCampaign();
  for (let index = 0; index < 9; index++) advance(campaign);
  assert.equal(getCurrentObjective(campaign).id, 'flight-gate-3');
  assert.deepEqual(roundTrip(campaign), campaign);
  const checkpoint = makeCheckpoint(campaign);
  assert.deepEqual(checkpoint.completedMissionIds, ['signals', 'rescue', 'evidence', 'finale']);
  assert.equal(checkpoint.selectedMissionId, null);
  assert.equal(checkpoint.missionId, 'flight');
});

test('individual mission selection stays individual after restoring', () => {
  for (const id of ['signals', 'evidence', 'flight']) {
    const campaign = createCampaign({ missionId: id });
    advance(campaign);
    const checkpoint = makeCheckpoint(campaign), restored = roundTrip(campaign);
    assert.equal(checkpoint.selectedMissionId, id);
    assert.equal(restored.missionId, id);
    assert.deepEqual(restored.completedMissionIds, []);
    assert.deepEqual(restored, campaign);
    while (!restored.finished) advance(restored);
    assert.equal(getCurrentMission(restored), null);
    assert.equal(makeCheckpoint(restored), null);
  }
});

test('invalid or mismatched checkpoints cannot skip mission order or restore foreign objectives', () => {
  const valid = makeCheckpoint(createCampaign());
  const invalid = [
    undefined, null, false, 0, 'broken json', 'null', '[]', [], {},
    { ...valid, version: 2 }, { ...valid, version: undefined }, { ...valid, finished: true },
    { ...valid, selectedMissionId: undefined }, { ...valid, selectedMissionId: 'unknown' },
    { ...valid, selectedMissionId: 'rescue' }, { ...valid, missionId: 'unknown' },
    { ...valid, objectiveId: 'rescue-civilian' }, { ...valid, objectiveId: 'unknown' },
    { ...valid, completedMissionIds: ['signals'] }, { ...valid, completedMissionIds: null },
    { ...valid, missionId: 'rescue', objectiveId: 'rescue-civilian', completedMissionIds: [] },
    { ...valid, missionId: 'evidence', objectiveId: 'evidence-route', completedMissionIds: ['rescue', 'signals'] },
    { ...valid, missionId: 'rescue', objectiveId: 'rescue-civilian', completedMissionIds: ['signals', 'signals'] },
  ];
  for (const raw of invalid) {
    assert.equal(parseCheckpoint(raw), null, JSON.stringify(raw));
    assert.equal(restoreCheckpoint(raw), null, JSON.stringify(raw));
  }
});

test('parsing and restoring detach arrays and omit unrelated save fields', () => {
  const campaign = createCampaign();
  for (let index = 0; index < 3; index++) advance(campaign);
  const checkpoint = makeCheckpoint(campaign);
  checkpoint.xp = 99999;
  checkpoint.equippedArmor = 'armored';
  const parsed = parseCheckpoint(checkpoint), restored = restoreCheckpoint(checkpoint);
  assert.equal(parsed.xp, undefined);
  assert.equal(restored.equippedArmor, undefined);
  assert.notEqual(parsed.completedMissionIds, checkpoint.completedMissionIds);
  assert.notEqual(restored.completedMissionIds, checkpoint.completedMissionIds);
  checkpoint.completedMissionIds.push('rescue');
  assert.deepEqual(parsed.completedMissionIds, ['signals']);
  assert.deepEqual(restored.completedMissionIds, ['signals']);
});

test('invalid campaign objects and completed campaigns produce no checkpoint', () => {
  const campaign = createCampaign({ missionId: 'rescue' });
  advance(campaign);
  for (const invalid of [null, {}, [], campaign,
    { ...createCampaign(), objectiveIndex: -1 },
    { ...createCampaign(), objectiveIndex: .5 },
    { ...createCampaign(), currentMissionIndex: 99 },
    { ...createCampaign(), finished: true },
  ]) assert.equal(makeCheckpoint(invalid), null);
});
