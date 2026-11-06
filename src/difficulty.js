/** Gameplay difficulty is separate from saves and never changes earned rewards. */
export const DIFFICULTIES = Object.freeze({
  story: Object.freeze({
    id: 'story', label: 'História', damageMultiplier: .55,
    enemySpeedMultiplier: .85, timeMultiplier: 1.4, parryBonus: .08,
  }),
  normal: Object.freeze({
    id: 'normal', label: 'Equilibrado', damageMultiplier: 1,
    enemySpeedMultiplier: 1, timeMultiplier: 1, parryBonus: 0,
  }),
  knight: Object.freeze({
    id: 'knight', label: 'Cavaleiro', damageMultiplier: 1.3,
    enemySpeedMultiplier: 1.1, timeMultiplier: .85, parryBonus: -.04,
  }),
});

/** Unknown, missing, or malformed selections use the balanced preset. */
export function getDifficulty(id) {
  return typeof id === 'string' && Object.hasOwn(DIFFICULTIES, id)
    ? DIFFICULTIES[id] : DIFFICULTIES.normal;
}
