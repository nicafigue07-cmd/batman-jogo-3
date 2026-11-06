import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, getLevel } from '../src/progression.js';
import { SKILLS, createSkillProfile, getSkillPoints, canUnlockSkill, unlockSkill, getSkillBonuses } from '../src/skills.js';

const fullProgress = { level: 5, completedMissions: ['signals', 'rescue', 'evidence', 'finale', 'flight'] };

test('existing XP and armor saves coexist with a fresh, detached skill save', () => {
  const old = { version: 1, xp: 820, completedMissions: [...fullProgress.completedMissions], equippedArmor: 'armored' };
  const original = JSON.stringify(old);
  const hero = createProfile(old);
  const skills = createSkillProfile();
  assert.deepEqual(skills, { version: 1, unlocked: [] });
  assert.deepEqual(getSkillPoints(skills, { level: getLevel(hero), completedMissions: hero.completedMissions }), { earned: 6, spent: 0, available: 6 });
  assert.equal(unlockSkill(skills, 'combat-focus', fullProgress).ok, true);
  assert.equal(JSON.stringify(hero), original, 'spending a skill point never consumes XP or alters armor unlocks');
  assert.deepEqual(createSkillProfile(), { version: 1, unlocked: [] });
});

test('malformed and future saves cannot grant skills or orphaned descendants', () => {
  for (const value of [null, false, 22, [], '{bad', { version: 2, unlocked: ['combat-focus'] }]) {
    assert.deepEqual(createSkillProfile(value), { version: 1, unlocked: [] });
  }
  const input = { version: 1, unlocked: ['combat-impact', 'combat-counter', 'traversal-wind', 'detective-shadow', 'unknown', 3] };
  assert.deepEqual(createSkillProfile(input).unlocked, []);
  assert.equal(getSkillBonuses(input).meleeBonus, 0);
  assert.equal(getSkillBonuses(input).windBonus, 0);
  const complete = createSkillProfile(JSON.stringify({ version: 1, unlocked: ['combat-impact', 'combat-counter', 'combat-focus', 'combat-focus', 'unknown'] }));
  assert.deepEqual(complete.unlocked, ['combat-focus', 'combat-counter', 'combat-impact']);
  complete.unlocked.push('traversal-glide');
  assert.equal(input.unlocked.length, 6, 'normalization never retains the caller array');
});

test('only earned levels and unique known missions provide capped skill points', () => {
  const profile = createSkillProfile();
  assert.deepEqual(getSkillPoints(profile), { earned: 0, spent: 0, available: 0 });
  for (const progress of [null, false, 12, 'level5']) assert.deepEqual(getSkillPoints(profile, progress), { earned: 0, spent: 0, available: 0 });
  assert.deepEqual(getSkillPoints(profile, { level: 3, completedMissions: ['signals', 'signals', 'rescue', 'unknown'] }), { earned: 3, spent: 0, available: 3 });
  for (const level of [-5, NaN, Infinity, '5']) assert.equal(getSkillPoints(profile, { level }).earned, 0);
  assert.equal(getSkillPoints(profile, { level: 1000, completedMissions: [...fullProgress.completedMissions, ...fullProgress.completedMissions] }).earned, 6);
  assert.equal(getSkillPoints(profile, { level: 2.9 }).earned, 1);
  const overspent = createSkillProfile({ unlocked: SKILLS.map(skill => skill.id) });
  assert.deepEqual(getSkillPoints(overspent, fullProgress), { earned: 6, spent: 9, available: 0 });
  assert.deepEqual(getSkillPoints(overspent), { earned: 0, spent: 9, available: 0 });
});

test('learning obeys prerequisites, costs one point and cannot charge twice', () => {
  const profile = createSkillProfile();
  const lowProgress = { level: 2, completedMissions: [] };
  assert.equal(canUnlockSkill(profile, 'combat-counter', fullProgress).reason, 'prerequisite');
  assert.equal(unlockSkill(profile, 'combat-focus').reason, 'points');
  assert.deepEqual(profile.unlocked, []);
  assert.equal(unlockSkill(profile, 'combat-focus', lowProgress).ok, true);
  assert.deepEqual(getSkillPoints(profile, lowProgress), { earned: 1, spent: 1, available: 0 });
  const before = JSON.stringify(profile);
  assert.equal(unlockSkill(profile, 'combat-focus', fullProgress).reason, 'unlocked');
  assert.equal(unlockSkill(profile, 'traversal-glide', lowProgress).reason, 'points');
  assert.equal(unlockSkill(profile, 'not-a-skill', fullProgress).reason, 'unknown');
  assert.equal(JSON.stringify(profile), before);
  assert.equal(unlockSkill(profile, 'combat-counter', fullProgress).ok, true);
  assert.equal(unlockSkill(profile, 'combat-impact', fullProgress).ok, true);
  assert.equal(getSkillBonuses(profile).focusBonus, 5);
  assert.equal(getSkillBonuses(profile).parryBonus, .08);
  assert.equal(getSkillBonuses(profile).meleeBonus, 1);
});

test('six campaign points support a build choice without unlocking all three branches', () => {
  const profile = createSkillProfile();
  const ids = ['traversal-glide', 'traversal-grapple', 'traversal-wind', 'detective-scan', 'detective-shadow', 'detective-recovery'];
  for (const id of ids) assert.equal(unlockSkill(profile, id, fullProgress).ok, true);
  assert.deepEqual(getSkillPoints(profile, fullProgress), { earned: 6, spent: 6, available: 0 });
  assert.equal(unlockSkill(profile, 'combat-focus', fullProgress).reason, 'points');
  assert.deepEqual(getSkillBonuses(profile), {
    meleeBonus: 0, focusBonus: 0, parryBonus: 0,
    glideBonus: 3, grappleBonus: 8, windBonus: .5,
    scanBonus: 8, stealthBonus: .2, healingBonus: 10,
  });
  assert.deepEqual(createSkillProfile(JSON.stringify(profile)), profile, 'learned build survives storage round trip');
});

test('frozen, missing or unsupported mutable profiles reject a purchase safely', () => {
  for (const invalid of [null, [], {}, { version: 2, unlocked: [] }, Object.freeze(createSkillProfile()), { version: 1, unlocked: Object.freeze([]) }]) {
    assert.deepEqual(unlockSkill(invalid, 'combat-focus', fullProgress), { ok: false, reason: 'invalid-profile' });
  }
});
