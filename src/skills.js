/** Additional, separate skill progress. XP and armor saves stay in progression.js. */
import { LEVEL_THRESHOLDS, MISSION_REWARDS } from './progression.js';

export const SKILLS = Object.freeze([
  Object.freeze({
    id: 'combat-focus', branch: 'combat', title: 'Disciplina das ondas', cost: 1, requires: null,
    description: 'Receba mais 5 pontos de foco ao acertar um golpe.', effectkey: 'focusBonus', value: 5,
  }),
  Object.freeze({
    id: 'combat-counter', branch: 'combat', title: 'Reflexos apurados', cost: 1, requires: 'combat-focus',
    description: 'A janela para aparar ataques aumenta em 0,08 segundo.', effectkey: 'parryBonus', value: .08,
  }),
  Object.freeze({
    id: 'combat-impact', branch: 'combat', title: 'Coragem de Okinawa', cost: 1, requires: 'combat-counter',
    description: 'Acrescente 1 ponto ao dano dos ataques corpo a corpo.', effectkey: 'meleeBonus', value: 1,
  }),
  Object.freeze({
    id: 'traversal-glide', branch: 'traversal', title: 'Prancha aerodinâmica', cost: 1, requires: null,
    description: 'Plane 3 metros por segundo mais rápido.', effectkey: 'glideBonus', value: 3,
  }),
  Object.freeze({
    id: 'traversal-grapple', branch: 'traversal', title: 'Motor de alta tensão', cost: 1, requires: 'traversal-glide',
    description: 'O onda recebe mais 8 metros por segundo de velocidade.', effectkey: 'grappleBonus', value: 8,
  }),
  Object.freeze({
    id: 'traversal-wind', branch: 'traversal', title: 'Domínio dos céus', cost: 1, requires: 'traversal-grapple',
    description: 'Receba 50% mais sustentação das correntes de ar.', effectkey: 'windBonus', value: .5,
  }),
  Object.freeze({
    id: 'detective-scan', branch: 'detective', title: 'Visor de longo alcance', cost: 1, requires: null,
    description: 'Analise pistas a mais 8 metros de distância.', effectkey: 'scanBonus', value: 8,
  }),
  Object.freeze({
    id: 'detective-shadow', branch: 'detective', title: 'Passos nas sombras', cost: 1, requires: 'detective-scan',
    description: 'Os guardas demoram 20% mais para perceber você.', effectkey: 'stealthBonus', value: .2,
  }),
  Object.freeze({
    id: 'detective-recovery', branch: 'detective', title: 'Preparação de campo', cost: 1, requires: 'detective-shadow',
    description: 'Recupere mais 10 pontos de vitalidade ao concluir um objetivo.', effectkey: 'healingBonus', value: 10,
  }),
]);

const skillById = new Map(SKILLS.map(skill => [skill.id, skill]));
const emptyBonuses = () => ({
  meleeBonus: 0, focusBonus: 0, parryBonus: 0,
  glideBonus: 0, grappleBonus: 0, windBonus: 0,
  scanBonus: 0, stealthBonus: 0, healingBonus: 0,
});

/**
 * Read parsed storage or JSON. Known parents must exist in the same save; input
 * order does not matter. The returned array is detached and follows tree order.
 */
export function createSkillProfile(raw) {
  let data = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)
      || (data.version !== undefined && data.version !== 1)) data = {};
  const requested = new Set(Array.isArray(data.unlocked) ? data.unlocked : []);
  const unlocked = [];
  for (const skill of SKILLS) {
    if (requested.has(skill.id) && (!skill.requires || unlocked.includes(skill.requires))) unlocked.push(skill.id);
  }
  return { version: 1, unlocked };
}

/** Only the five campaign missions and supported character levels grant points. */
export function getSkillPoints(skillProfile, progress = {}) {
  const { level = 1, completedMissions = [] } = progress && typeof progress === 'object' ? progress : {};
  const currentLevel = Number.isFinite(level)
    ? Math.max(1, Math.min(LEVEL_THRESHOLDS.length, Math.floor(level))) : 1;
  const completed = new Set(Array.isArray(completedMissions)
    ? completedMissions.filter(id => typeof id === 'string' && Object.hasOwn(MISSION_REWARDS, id)) : []);
  const earned = currentLevel - 1 + Math.floor(completed.size / 2);
  const spent = createSkillProfile(skillProfile).unlocked.reduce((total, id) => total + skillById.get(id).cost, 0);
  return { earned, spent, available: Math.max(0, earned - spent) };
}

function mutableProfile(profile) {
  return profile && typeof profile === 'object' && !Array.isArray(profile) && !Object.isFrozen(profile)
    && profile.version === 1 && Array.isArray(profile.unlocked) && !Object.isFrozen(profile.unlocked);
}

/** A rejected purchase leaves both the profile and the point balance unchanged. */
export function canUnlockSkill(skillProfile, id, progress) {
  const skill = skillById.get(id);
  if (!skill) return { ok: false, reason: 'unknown' };
  if (!mutableProfile(skillProfile)) return { ok: false, reason: 'invalid-profile' };
  const unlocked = createSkillProfile(skillProfile).unlocked;
  if (unlocked.includes(id)) return { ok: false, reason: 'unlocked' };
  if (skill.requires && !unlocked.includes(skill.requires)) return { ok: false, reason: 'prerequisite' };
  if (getSkillPoints(skillProfile, progress).available < skill.cost) return { ok: false, reason: 'points' };
  return { ok: true };
}

export function unlockSkill(skillProfile, id, progress) {
  const result = canUnlockSkill(skillProfile, id, progress);
  if (!result.ok) return result;
  const normalized = createSkillProfile(skillProfile);
  normalized.unlocked.push(id);
  skillProfile.unlocked = createSkillProfile(normalized).unlocked;
  return { ok: true, skill: skillById.get(id), points: getSkillPoints(skillProfile, progress) };
}

/** Always return every supported bonus, including zeros for unlearned skills. */
export function getSkillBonuses(skillProfile) {
  const bonuses = emptyBonuses();
  for (const id of createSkillProfile(skillProfile).unlocked) {
    const skill = skillById.get(id);
    bonuses[skill.effectkey] += skill.value;
  }
  return bonuses;
}
