import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMORS,
  createProfile,
  getLevel,
  getLevelProgress,
  getUnlockedArmors,
  getArmor,
  equipArmor,
  awardMission,
  getProfileData,
} from '../src/progression.js';

const armorIds = profile => getUnlockedArmors(profile).map(armor => armor.id);
const freshProfile = { version: 1, xp: 0, completedMissions: [], equippedArmor: 'vigilante' };

test('a new profile starts at level one with only the Vigilante armor', () => {
  const profile = createProfile();
  assert.deepEqual(profile, freshProfile);
  assert.equal(getLevel(profile), 1);
  assert.deepEqual(armorIds(profile), ['vigilante']);
  assert.equal(getArmor(profile).id, 'vigilante');
  const another = createProfile();
  profile.completedMissions.push('signals');
  assert.deepEqual(another, freshProfile, 'new runs do not share completion arrays');
});

test('armor definitions expose the promised gameplay benefits and mission unlocks', () => {
  const expected = {
    vigilante: { title: 'Vigilante', unlockedBy: null, defense: 1, meleeDamage: 1, grappleSpeed: 48, scanBonus: 0 },
    tactical: { title: 'Tática', unlockedBy: 'signals', defense: .85, meleeDamage: 1, grappleSpeed: 62, scanBonus: 0 },
    rescue: { title: 'Resgate', unlockedBy: 'rescue', defense: .75, meleeDamage: 1, grappleSpeed: 48, scanBonus: 0 },
    detective: { title: 'Detetive', unlockedBy: 'evidence', defense: 1, meleeDamage: 1, grappleSpeed: 48, scanBonus: 1 },
    armored: { title: 'Blindada', unlockedBy: 'finale', defense: .6, meleeDamage: 2, grappleSpeed: 44, scanBonus: 0 },
  };
  assert.equal(ARMORS.length, 5);
  assert.equal(new Set(ARMORS.map(armor => armor.id)).size, 5);
  for (const armor of ARMORS) {
    const { title, unlockedBy, defense, meleeDamage, grappleSpeed, scanBonus } = armor;
    assert.deepEqual({ title, unlockedBy, defense, meleeDamage, grappleSpeed, scanBonus }, expected[armor.id]);
    assert.ok(typeof armor.description === 'string' && armor.description.length > 10);
  }
});

test('first mission completions give their full XP reward and unlock their armor once', () => {
  const profile = createProfile();
  const expected = [
    { mission: 'signals', armor: 'tactical', reward: 120, total: 120, level: 2, leveledUp: true },
    { mission: 'rescue', armor: 'rescue', reward: 140, total: 260, level: 3, leveledUp: true },
    { mission: 'evidence', armor: 'detective', reward: 160, total: 420, level: 3, leveledUp: false },
    { mission: 'finale', armor: 'armored', reward: 220, total: 640, level: 4, leveledUp: true },
    { mission: 'flight', armor: null, reward: 180, total: 820, level: 5, leveledUp: true },
  ];
  for (const step of expected) {
    const result = awardMission(profile, step.mission);
    assert.equal(result.ok, true);
    assert.equal(result.firstCompletion, true);
    assert.equal(result.xpEarned, step.reward);
    assert.deepEqual(result.unlockedArmors.map(armor => armor.id), step.armor ? [step.armor] : []);
    assert.equal(result.leveledUp, step.leveledUp);
    assert.equal(result.level, step.level);
    assert.equal(profile.xp, step.total);
    assert.equal(profile.equippedArmor, 'vigilante', 'unlocking does not silently equip an armor');
  }
  assert.deepEqual(profile.completedMissions, ['signals', 'rescue', 'evidence', 'finale', 'flight']);
  assert.deepEqual(armorIds(profile), ['vigilante', 'tactical', 'rescue', 'detective', 'armored']);
});

test('old version-one saves keep their progress and armors when flight is added', () => {
  const previous = { version: 1, xp: 640, completedMissions: ['signals', 'rescue', 'evidence', 'finale'], equippedArmor: 'armored' };
  const profile = createProfile(JSON.stringify(previous));
  assert.deepEqual(profile, previous);
  assert.equal(armorIds(profile).length, 5);
  const result = awardMission(profile, 'flight');
  assert.equal(result.firstCompletion, true);
  assert.equal(result.xpEarned, 180);
  assert.equal(result.level, 5);
  assert.deepEqual(result.unlockedArmors, []);
  assert.equal(profile.equippedArmor, 'armored');
  assert.deepEqual(createProfile(JSON.stringify(getProfileData(profile))), profile);
});

test('flight completion persists without granting unrelated armor and repeats for thirty XP', () => {
  const profile = createProfile();
  const first = awardMission(profile, 'flight');
  assert.equal(first.ok, true);
  assert.equal(first.xpEarned, 180);
  assert.equal(first.firstCompletion, true);
  assert.deepEqual(first.unlockedArmors, []);
  assert.deepEqual(armorIds(profile), ['vigilante']);
  assert.deepEqual(profile.completedMissions, ['flight']);
  const reloaded = createProfile(JSON.stringify(getProfileData(profile)));
  const replay = awardMission(reloaded, 'flight');
  assert.equal(replay.xpEarned, 30);
  assert.equal(replay.firstCompletion, false);
  assert.deepEqual(replay.unlockedArmors, []);
  assert.equal(reloaded.xp, 210);
  assert.deepEqual(reloaded.completedMissions, ['flight']);
  assert.deepEqual(armorIds(reloaded), ['vigilante']);
});

test('mission replays earn thirty XP without duplicate completions or new unlocks', () => {
  const profile = createProfile({ xp: 640, completedMissions: ['signals', 'rescue', 'evidence', 'finale'] });
  const firstReplay = awardMission(profile, 'rescue');
  assert.equal(firstReplay.firstCompletion, false);
  assert.equal(firstReplay.xpEarned, 30);
  assert.deepEqual(firstReplay.unlockedArmors, []);
  assert.equal(firstReplay.leveledUp, false);
  assert.equal(profile.xp, 670);
  const secondReplay = awardMission(profile, 'signals');
  assert.equal(secondReplay.xpEarned, 30);
  assert.equal(secondReplay.leveledUp, true);
  assert.equal(secondReplay.level, 5);
  assert.equal(profile.xp, 700);
  const maxLevelReplay = awardMission(profile, 'finale');
  assert.equal(maxLevelReplay.xpEarned, 30);
  assert.equal(maxLevelReplay.leveledUp, false);
  assert.equal(maxLevelReplay.level, 5);
  assert.equal(profile.xp, 730);
  assert.deepEqual(profile.completedMissions, ['signals', 'rescue', 'evidence', 'finale']);
});

test('locked and unknown armors cannot be equipped or mutate the profile', () => {
  const profile = createProfile();
  const original = structuredClone(profile);
  for (const id of ['tactical', 'rescue', 'detective', 'armored']) {
    assert.deepEqual(equipArmor(profile, id), { ok: false, reason: 'locked' });
    assert.deepEqual(profile, original);
  }
  for (const id of ['missing', 'constructor', null]) {
    assert.deepEqual(equipArmor(profile, id), { ok: false, reason: 'unknown' });
    assert.deepEqual(profile, original);
  }
});

test('a mission unlock permits equipping only its earned armor', () => {
  const profile = createProfile();
  awardMission(profile, 'signals');
  const earnedState = structuredClone(profile);
  assert.deepEqual(equipArmor(profile, 'tactical'), { ok: true });
  assert.equal(profile.equippedArmor, 'tactical');
  assert.equal(getArmor(profile).grappleSpeed, 62);
  assert.equal(getArmor(profile).defense, .85);
  assert.equal(profile.xp, earnedState.xp);
  assert.deepEqual(profile.completedMissions, earnedState.completedMissions);
  assert.deepEqual(equipArmor(profile, 'armored'), { ok: false, reason: 'locked' });
  assert.equal(profile.equippedArmor, 'tactical');
  assert.deepEqual(equipArmor(profile, 'vigilante'), { ok: true });
});

test('armor getters safely fall back without rewriting untrusted profile fields', () => {
  const locked = { version: 1, xp: 0, completedMissions: [], equippedArmor: 'armored' };
  const original = structuredClone(locked);
  assert.equal(getArmor(locked).id, 'vigilante');
  assert.deepEqual(armorIds(locked), ['vigilante']);
  assert.deepEqual(locked, original);
  assert.equal(getArmor({ ...locked, equippedArmor: 'missing' }).id, 'vigilante');
});

test('level thresholds include exact boundaries and cap the level at five', () => {
  const cases = [[0,1],[99,1],[100,2],[249,2],[250,3],[449,3],[450,4],[699,4],[700,5],[100000,5]];
  for (const [xp, level] of cases) assert.equal(getLevel(createProfile({ xp })), level, `${xp} XP`);
});

test('level progress measures the current band and handles maximum level without division by zero', () => {
  const cases = [
    [0, { level: 1, current: 0, needed: 100, percent: 0, maxLevel: false }],
    [99, { level: 1, current: 99, needed: 100, percent: 99, maxLevel: false }],
    [100, { level: 2, current: 0, needed: 150, percent: 0, maxLevel: false }],
    [175, { level: 2, current: 75, needed: 150, percent: 50, maxLevel: false }],
    [250, { level: 3, current: 0, needed: 200, percent: 0, maxLevel: false }],
    [350, { level: 3, current: 100, needed: 200, percent: 50, maxLevel: false }],
    [450, { level: 4, current: 0, needed: 250, percent: 0, maxLevel: false }],
    [575, { level: 4, current: 125, needed: 250, percent: 50, maxLevel: false }],
    [700, { level: 5, current: 0, needed: 0, percent: 100, maxLevel: true }],
    [100000, { level: 5, current: 0, needed: 0, percent: 100, maxLevel: true }],
  ];
  for (const [xp, expected] of cases) assert.deepEqual(getLevelProgress(createProfile({ xp })), expected);
});

test('valid persisted data reloads with XP, unique known missions and unlocked equipped armor', () => {
  const raw = { version: 1, xp: 260, completedMissions: ['rescue', 'rescue', 'missing', 'signals', null], equippedArmor: 'rescue', extra: 'discard' };
  const profile = createProfile(JSON.stringify(raw));
  assert.deepEqual(profile, { version: 1, xp: 260, completedMissions: ['rescue', 'signals'], equippedArmor: 'rescue' });
  assert.equal(getLevel(profile), 3);
  assert.deepEqual(armorIds(profile), ['vigilante', 'tactical', 'rescue']);
  assert.deepEqual(createProfile(JSON.stringify(getProfileData(profile))), profile);
  assert.deepEqual(raw.completedMissions, ['rescue', 'rescue', 'missing', 'signals', null], 'normalization leaves the input untouched');
});

test('malformed persisted shapes and unsupported versions safely produce a fresh profile', () => {
  for (const raw of [undefined, null, false, 12, [], ['signals'], '{broken', 'null', 'true', '42', '[]', '"text"', { version: 2, xp: 1000, completedMissions: ['finale'], equippedArmor: 'armored' }]) {
    assert.deepEqual(createProfile(raw), freshProfile);
  }
  assert.deepEqual(createProfile({ completedMissions: 'signals', equippedArmor: 'tactical' }), freshProfile);
});

test('invalid XP is rejected, fractional XP is normalized, and totals are capped', () => {
  for (const xp of [-1, NaN, Infinity, -Infinity, undefined, null, '120', true]) {
    assert.equal(createProfile({ xp }).xp, 0);
  }
  assert.equal(createProfile({ xp: 120.9 }).xp, 120);
  assert.equal(createProfile({ xp: 1000000 }).xp, 100000);
  assert.equal(createProfile({ xp: 300, equippedArmor: 'armored' }).equippedArmor, 'vigilante');
  assert.equal(createProfile({ xp: 300, completedMissions: ['finale'], equippedArmor: 'armored' }).equippedArmor, 'armored');
});

test('XP cap reports the actual reward while preserving first-completion unlocks', () => {
  const profile = createProfile({ xp: 99990 });
  const first = awardMission(profile, 'finale');
  assert.equal(first.firstCompletion, true);
  assert.equal(first.xpEarned, 10);
  assert.equal(first.level, 5);
  assert.equal(first.leveledUp, false);
  assert.deepEqual(first.unlockedArmors.map(armor => armor.id), ['armored']);
  assert.equal(profile.xp, 100000);
  const repeat = awardMission(profile, 'finale');
  assert.equal(repeat.xpEarned, 0);
  assert.equal(repeat.firstCompletion, false);
  assert.deepEqual(repeat.unlockedArmors, []);
  assert.deepEqual(profile.completedMissions, ['finale']);
});

test('unknown mission identifiers cannot award XP, unlock armor, or alter saves', () => {
  const profile = createProfile({ xp: 175, completedMissions: ['signals'], equippedArmor: 'tactical' });
  const original = structuredClone(profile);
  for (const id of ['unknown', '__proto__', 'constructor', null, 42]) {
    assert.deepEqual(awardMission(profile, id), { ok: false, reason: 'unknown' });
    assert.deepEqual(profile, original);
  }
});

test('mutators reject malformed or frozen profiles without throwing or changing them', () => {
  const invalidProfiles = [null, false, 12, [], {}, Object.freeze(createProfile())];
  for (const profile of invalidProfiles) {
    const original = structuredClone(profile);
    assert.deepEqual(equipArmor(profile, 'vigilante'), { ok: false, reason: 'invalid-profile' });
    assert.deepEqual(awardMission(profile, 'signals'), { ok: false, reason: 'invalid-profile' });
    assert.deepEqual(profile, original);
  }
});

test('profile persistence data is normalized and detached from live progress', () => {
  const profile = createProfile({ xp: 120, completedMissions: ['signals'], equippedArmor: 'tactical' });
  const saved = getProfileData(profile);
  assert.deepEqual(saved, profile);
  assert.notEqual(saved, profile);
  assert.notEqual(saved.completedMissions, profile.completedMissions);
  saved.completedMissions.push('finale');
  saved.xp = 999;
  assert.deepEqual(profile.completedMissions, ['signals']);
  assert.equal(profile.xp, 120);
  assert.deepEqual(getProfileData({ version: 1, xp: NaN, completedMissions: ['missing'], equippedArmor: 'armored' }), freshProfile);
});
