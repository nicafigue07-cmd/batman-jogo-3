import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, getDifficulty } from '../src/difficulty.js';

test('difficulty presets make survival and reaction windows easier or harder together', () => {
  const { story, normal, knight } = DIFFICULTIES;
  assert.ok(story.damageMultiplier < normal.damageMultiplier && normal.damageMultiplier < knight.damageMultiplier);
  assert.ok(story.enemySpeedMultiplier < normal.enemySpeedMultiplier && normal.enemySpeedMultiplier < knight.enemySpeedMultiplier);
  assert.ok(story.timeMultiplier > normal.timeMultiplier && normal.timeMultiplier > knight.timeMultiplier);
  assert.ok(story.parryBonus > normal.parryBonus && normal.parryBonus > knight.parryBonus);
  for (const [id, preset] of Object.entries(DIFFICULTIES)) {
    assert.equal(getDifficulty(id), preset);
    assert.equal(preset.id, id);
    assert.ok(preset.label.length > 0);
    for (const key of ['damageMultiplier', 'enemySpeedMultiplier', 'timeMultiplier']) assert.ok(Number.isFinite(preset[key]) && preset[key] > 0);
  }
});

test('malformed selections cannot select inherited properties or mutate shared presets', () => {
  for (const value of [undefined, null, '', 'invalid', '__proto__', 'constructor', {}, [], 0]) {
    assert.equal(getDifficulty(value), DIFFICULTIES.normal);
  }
  assert.ok(Object.isFrozen(DIFFICULTIES));
  for (const preset of Object.values(DIFFICULTIES)) {
    assert.ok(Object.isFrozen(preset));
    assert.throws(() => { preset.damageMultiplier = 100; }, TypeError);
  }
});
