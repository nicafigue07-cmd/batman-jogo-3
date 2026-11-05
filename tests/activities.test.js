import test from 'node:test';
import assert from 'node:assert/strict';
import { createChallenge, tickChallenge, submitChallenge } from '../src/activities.js';

const insideZone = state => state.cursor >= state.zoneStart && state.cursor <= state.zoneStart + state.zoneWidth;

// Let the activity's own clock move the cursor; never assign progress or timing.
function waitForCursor(state, predicate) {
  for (let frame = 0; frame < 1000; frame++) {
    tickChallenge(state, .02);
    if (predicate(state)) return;
  }
  assert.fail('The moving cursor never reached the requested timing window');
}

function synchronize(state) {
  waitForCursor(state, insideZone);
  return submitChallenge(state, 'sync');
}

test('a transmitter requires three synchronizations inside the moving target zones', () => {
  const state = createChallenge('signal', 'signals-financial');
  assert.equal(insideZone(state), false);
  assert.deepEqual(submitChallenge(state, 'sync'), { ok: false, complete: false });
  assert.equal(state.progress, 0);

  for (let hit = 1; hit <= 3; hit++) {
    assert.deepEqual(synchronize(state), { ok: true, complete: hit === 3 });
    assert.equal(state.progress, hit);
    assert.equal(state.finished, hit === 3);
  }
});

test('synchronizing outside the target never advances and never removes more than one hit', () => {
  const state = createChallenge('signal', 'signals-old-gotham');
  synchronize(state);
  synchronize(state);
  assert.equal(state.progress, 2);

  for (const expectedProgress of [1, 0, 0]) {
    waitForCursor(state, current => !insideZone(current));
    const previousProgress = state.progress;
    assert.deepEqual(submitChallenge(state, 'sync'), { ok: false, complete: false });
    assert.equal(state.progress, expectedProgress);
    assert.ok(state.progress <= previousProgress);
    assert.ok(previousProgress - state.progress <= 1);
    assert.equal(state.finished, false);
  }

  // A timing mistake is recoverable by playing all three steps again.
  synchronize(state);
  synchronize(state);
  assert.deepEqual(synchronize(state), { ok: true, complete: true });
});

test('a different button cannot synchronize even while the cursor is in the target', () => {
  const state = createChallenge('signal', 'signals-tower');
  synchronize(state);
  waitForCursor(state, insideZone);
  assert.deepEqual(submitChallenge(state, 'A'), { ok: false, complete: false });
  assert.equal(state.progress, 0);
  assert.equal(state.finished, false);
});

test('the route evidence accepts its three buttons only in order', () => {
  const state = createChallenge('evidence', 'evidence-route');
  assert.deepEqual(state.pattern, ['A', 'C', 'B']);
  assert.deepEqual(submitChallenge(state, 'A'), { ok: true, complete: false });
  assert.deepEqual(submitChallenge(state, 'C'), { ok: true, complete: false });
  assert.equal(state.progress, 2);
  assert.equal(state.finished, false);
  assert.deepEqual(submitChallenge(state, 'B'), { ok: true, complete: true });
});

test('the intercepted orders use their distinct four-button sequence', () => {
  const state = createChallenge('evidence', 'evidence-orders');
  assert.deepEqual(state.pattern, ['B', 'A', 'C', 'B']);
  for (const [index, input] of ['B', 'A', 'C', 'B'].entries()) {
    assert.deepEqual(submitChallenge(state, input), { ok: true, complete: index === 3 });
    assert.equal(state.progress, index + 1);
  }
});

test('a wrong evidence button resets the whole sequence, including a valid but misplaced button', () => {
  const state = createChallenge('evidence', 'evidence-route');
  submitChallenge(state, 'A');
  submitChallenge(state, 'C');
  assert.deepEqual(submitChallenge(state, 'A'), { ok: false, complete: false });
  assert.equal(state.progress, 0);
  assert.equal(state.finished, false);
  assert.deepEqual(submitChallenge(state, 'C'), { ok: false, complete: false });
  assert.equal(state.progress, 0);
  for (const input of ['A', 'C', 'B']) submitChallenge(state, input);
  assert.equal(state.finished, true);
});

test('unknown evidence inputs cannot count as a decoded step', () => {
  for (const input of [undefined, null, '', 'a', 'sync', 'D']) {
    const state = createChallenge('evidence', 'evidence-orders');
    submitChallenge(state, 'B');
    assert.deepEqual(submitChallenge(state, input), { ok: false, complete: false });
    assert.equal(state.progress, 0);
    assert.equal(state.finished, false);
  }
});

test('completed activities ignore further input and clock updates', () => {
  for (const kind of ['signal', 'evidence']) {
    const state = createChallenge(kind, kind === 'signal' ? 'signals-financial' : 'evidence-orders');
    if (kind === 'signal') {
      synchronize(state); synchronize(state); synchronize(state);
    } else {
      for (const input of state.pattern) submitChallenge(state, input);
    }
    const completed = structuredClone(state);
    for (const input of ['sync', 'A', 'B', undefined]) {
      assert.deepEqual(submitChallenge(state, input), { ok: false, complete: true });
      tickChallenge(state, .1);
      assert.deepEqual(state, completed);
    }
  }
});

test('invalid or nonpositive elapsed time cannot move the cursor or change activity state', () => {
  for (const kind of ['signal', 'evidence']) {
    const state = createChallenge(kind, 'test-site');
    tickChallenge(state, .02);
    const original = structuredClone(state);
    for (const dt of [undefined, null, NaN, Infinity, -Infinity, 0, -1, '.02']) {
      tickChallenge(state, dt);
      assert.deepEqual(state, original);
    }
  }
});

test('a delayed frame advances the clock by at most a tenth of a second', () => {
  const delayed = createChallenge('signal', 'signals-financial');
  const ordinary = createChallenge('signal', 'signals-financial');
  tickChallenge(delayed, 10);
  tickChallenge(ordinary, .1);
  assert.deepEqual(delayed, ordinary);
});

test('new activities never inherit another activity progress or timer', () => {
  const previous = createChallenge('signal', 'signals-financial');
  synchronize(previous);
  const fresh = createChallenge('signal', 'signals-financial');
  assert.equal(previous.progress, 1);
  assert.equal(fresh.progress, 0);
  assert.equal(fresh.time, 0);
  assert.equal(fresh.finished, false);
  assert.notEqual(fresh.pattern, previous.pattern);
});

test('unsupported activity kinds fail explicitly', () => {
  for (const kind of ['rescue', 'finale', '', 'unknown', undefined, null]) {
    assert.throws(() => createChallenge(kind, 'test-site'), RangeError);
  }
});
