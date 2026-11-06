const MAX_STEPS = 4;
const MAX_DELTA = .1;
const MAX_STEP = .025;

const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Catch up a slow frame with bounded physics steps, without replaying time spent
 * in another tab. Smaller caller budgets are allowed; no call can exceed four
 * steps, .025 seconds per step or .1 seconds of simulated time.
 */
export function makeSimulationSteps(rawDelta, {maxDelta = MAX_DELTA, maxStep = MAX_STEP} = {}) {
  if (!positive(rawDelta)) return [];
  const stepLimit = positive(maxStep) ? Math.min(maxStep, MAX_STEP) : MAX_STEP;
  const frameLimit = positive(maxDelta) ? Math.min(maxDelta, MAX_DELTA) : MAX_DELTA;
  const elapsed = Math.min(rawDelta, frameLimit, stepLimit * MAX_STEPS);
  const count = Math.min(MAX_STEPS, Math.max(1, Math.ceil(elapsed / stepLimit)));
  const step = elapsed / count;
  const steps = Array(count).fill(step);
  // Keep the sum equal to the budget even when division has a binary remainder.
  steps[count - 1] = elapsed - step * (count - 1);
  return steps;
}
