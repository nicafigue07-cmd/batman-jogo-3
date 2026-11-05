/** Persistent character progress. Storage and mission detection belong to the game. */
export const LEVEL_THRESHOLDS = Object.freeze([0, 100, 250, 450, 700]);
export const MAX_XP = 100000;
export const MISSION_REWARDS = Object.freeze({ signals: 120, rescue: 140, evidence: 160, finale: 220, flight: 180 });

export const ARMORS = Object.freeze([
  Object.freeze({
    id: 'vigilante', title: 'Vigilante', unlockedBy: null,
    description: 'Defesa padrão. Dano corpo a corpo: 1. Gancho a 48 m/s.',
    defense: 1, meleeDamage: 1, grappleSpeed: 48, scanBonus: 0,
  }),
  Object.freeze({
    id: 'tactical', title: 'Tática', unlockedBy: 'signals',
    description: 'Receba 15% menos dano. Dano corpo a corpo: 1. Gancho a 62 m/s.',
    defense: 0.85, meleeDamage: 1, grappleSpeed: 62, scanBonus: 0,
  }),
  Object.freeze({
    id: 'rescue', title: 'Resgate', unlockedBy: 'rescue',
    description: 'Receba 25% menos dano. Dano corpo a corpo: 1. Gancho a 48 m/s.',
    defense: 0.75, meleeDamage: 1, grappleSpeed: 48, scanBonus: 0,
  }),
  Object.freeze({
    id: 'detective', title: 'Detetive', unlockedBy: 'evidence',
    description: 'Bônus de +1 no scanner. Defesa padrão, dano corpo a corpo 1 e gancho a 48 m/s.',
    defense: 1, meleeDamage: 1, grappleSpeed: 48, scanBonus: 1,
  }),
  Object.freeze({
    id: 'armored', title: 'Blindada', unlockedBy: 'finale',
    description: 'Receba 40% menos dano. Dano corpo a corpo: 2. Gancho a 44 m/s.',
    defense: 0.6, meleeDamage: 2, grappleSpeed: 44, scanBonus: 0,
  }),
]);

function normalizeXP(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.max(0, Math.min(MAX_XP, Math.floor(value))) : 0;
}

function normalizeCompleted(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => typeof id === 'string' && Object.hasOwn(MISSION_REWARDS, id)))];
}

function isUnlocked(armor, completedMissions) {
  return armor.unlockedBy === null || completedMissions.includes(armor.unlockedBy);
}

function isMutableProfile(profile) {
  return profile !== null && typeof profile === 'object' && !Array.isArray(profile) &&
    !Object.isFrozen(profile) && profile.version === 1 &&
    Number.isInteger(profile.xp) && profile.xp >= 0 && profile.xp <= MAX_XP &&
    Array.isArray(profile.completedMissions) && typeof profile.equippedArmor === 'string';
}

/** Accept parsed storage or its JSON string; malformed or newer schemas start fresh. */
export function createProfile(raw) {
  let data = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      (data.version !== undefined && data.version !== 1)) data = {};

  const profile = {
    version: 1,
    xp: normalizeXP(data.xp),
    completedMissions: normalizeCompleted(data.completedMissions),
    equippedArmor: 'vigilante',
  };
  const requestedArmor = ARMORS.find(armor => armor.id === data.equippedArmor);
  if (requestedArmor && isUnlocked(requestedArmor, profile.completedMissions)) profile.equippedArmor = requestedArmor.id;
  return profile;
}

export function getLevel(profile) {
  const xp = normalizeXP(profile?.xp);
  for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index--) {
    if (xp >= LEVEL_THRESHOLDS[index]) return index + 1;
  }
  return 1;
}

/** current/needed describe XP within this level, rather than total lifetime XP. */
export function getLevelProgress(profile) {
  const level = getLevel(profile);
  const maxLevel = level === LEVEL_THRESHOLDS.length;
  if (maxLevel) return { level, current: 0, needed: 0, percent: 100, maxLevel: true };
  const current = normalizeXP(profile?.xp) - LEVEL_THRESHOLDS[level - 1];
  const needed = LEVEL_THRESHOLDS[level] - LEVEL_THRESHOLDS[level - 1];
  return { level, current, needed, percent: current / needed * 100, maxLevel: false };
}

export function getUnlockedArmors(profile) {
  const completed = normalizeCompleted(profile?.completedMissions);
  return ARMORS.filter(armor => isUnlocked(armor, completed));
}

/** Reading an invalid equipped selection never grants locked armor benefits. */
export function getArmor(profile) {
  const equipped = ARMORS.find(armor => armor.id === profile?.equippedArmor);
  return equipped && isUnlocked(equipped, normalizeCompleted(profile?.completedMissions)) ? equipped : ARMORS[0];
}

export function equipArmor(profile, id) {
  const armor = ARMORS.find(candidate => candidate.id === id);
  if (!armor) return { ok: false, reason: 'unknown' };
  if (!isMutableProfile(profile)) return { ok: false, reason: 'invalid-profile' };
  if (!isUnlocked(armor, normalizeCompleted(profile.completedMissions))) return { ok: false, reason: 'locked' };
  profile.equippedArmor = armor.id;
  return { ok: true };
}

/** Called once per successful mission completion, not per objective or enemy. */
export function awardMission(profile, missionId) {
  if (typeof missionId !== 'string' || !Object.hasOwn(MISSION_REWARDS, missionId)) return { ok: false, reason: 'unknown' };
  if (!isMutableProfile(profile)) return { ok: false, reason: 'invalid-profile' };

  const normalized = createProfile(profile);
  const oldXP = normalized.xp;
  const oldLevel = getLevel(normalized);
  const previousArmors = new Set(getUnlockedArmors(normalized).map(armor => armor.id));
  const firstCompletion = !normalized.completedMissions.includes(missionId);
  const reward = firstCompletion ? MISSION_REWARDS[missionId] : 30;
  normalized.xp = Math.min(MAX_XP, normalized.xp + reward);
  if (firstCompletion) normalized.completedMissions.push(missionId);
  profile.xp = normalized.xp;
  profile.completedMissions = normalized.completedMissions;
  profile.equippedArmor = normalized.equippedArmor;
  const level = getLevel(profile);
  return {
    ok: true,
    firstCompletion,
    xpEarned: normalized.xp - oldXP,
    unlockedArmors: getUnlockedArmors(profile).filter(armor => !previousArmors.has(armor.id)),
    leveledUp: level > oldLevel,
    level,
  };
}

/** Return only supported fields and detached arrays before serializing storage. */
export function getProfileData(profile) {
  return createProfile(profile);
}
