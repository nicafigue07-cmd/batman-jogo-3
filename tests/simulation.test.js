import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSimulationSteps } from '../src/simulation.js';

const sum = steps => steps.reduce((total, step) => total + step, 0);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ~= ${expected}`);

test('frame budgets are conserved without exceeding CPU or physics step limits', () => {
  for (const delta of [1/240, 1/120, 1/60, 1/30, 1/20, .075, .1, .2, 60, Number.MAX_VALUE]) {
    const steps = makeSimulationSteps(delta);
    assert.ok(steps.length >= 1 && steps.length <= 4);
    for (const step of steps) assert.ok(Number.isFinite(step) && step > 0 && step <= .025 + Number.EPSILON);
    close(sum(steps), Math.min(delta, .1));
  }
  assert.equal(makeSimulationSteps(.1).length, 4);
  assert.equal(makeSimulationSteps(1/20).length, 2);
});

test('invalid elapsed time cannot advance simulation and background gaps stay capped', () => {
  for (const delta of [undefined, null, NaN, Infinity, -Infinity, -1, 0, '0.05', {}, []]) {
    assert.deepEqual(makeSimulationSteps(delta), []);
  }
  close(sum(makeSimulationSteps(300)), .1);
});

test('one second of constant-acceleration motion agrees at 60, 20 and 10 fps', () => {
  const simulate = frames => {
    let position = 0, velocity = 3, time = 0;
    for (let frame = 0; frame < frames; frame++) for (const dt of makeSimulationSteps(1 / frames)) {
      // Exact per-step integration isolates elapsed-time conservation from the
      // known frame-rate dependence of a particular game's numerical integrator.
      position += velocity * dt + .5 * 7 * dt * dt;
      velocity += 7 * dt;
      time += dt;
    }
    return {position, velocity, time};
  };
  for (const frames of [60, 20, 10]) {
    const result = simulate(frames);
    close(result.time, 1); close(result.velocity, 10); close(result.position, 6.5);
  }
});

test('smaller custom budgets remain bounded even with adversarial configuration', () => {
  close(sum(makeSimulationSteps(.1, {maxDelta:.04})), .04);
  const tiny = makeSimulationSteps(.1, {maxStep:.001});
  assert.equal(tiny.length, 4);
  close(sum(tiny), .004);
  for (const options of [{maxDelta:100,maxStep:100}, {maxDelta:NaN,maxStep:-1}, {maxDelta:'1',maxStep:Infinity}]) {
    const steps = makeSimulationSteps(100, options);
    assert.equal(steps.length, 4);
    close(sum(steps), .1);
  }
});
