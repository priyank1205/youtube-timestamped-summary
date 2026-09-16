// The Detail field draws the three levels to scale against each other, and
// captions itself with the point count the request will really ask for. Both
// come from `detailEstimate`, so these tests guard the one property that makes
// the picture trustworthy: it is the same arithmetic the prompt uses, and the
// levels it reports are ordered the way the control claims they are.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const load = (rel) => import(path.join(__dirname, rel));

test('the estimate is the density model, not a second opinion', async () => {
  const { detailEstimate, densityFor } = await load('../scripts/constants.js');
  // Under the windowing threshold, where one request covers the whole video and
  // the estimate is exactly densityFor's answer.
  const minutes = 72.7;

  const estimate = detailEstimate(minutes);
  assert.equal(estimate.exact, true);
  for (const preset of ['brief', 'standard', 'detailed']) {
    assert.equal(estimate.targets[preset], densityFor(preset, minutes).target,
      `${preset} must match the count the prompt will ask for`);
  }
});

test('more detail never means fewer points', async () => {
  const { detailEstimate } = await load('../scripts/constants.js');
  // Across a spread of real runtimes, including the short ones where the floor
  // gives way and the levels are allowed to converge.
  for (const minutes of [1, 3, 8, 22, 45, 103.2, 240]) {
    const { brief, standard, detailed } = detailEstimate(minutes).targets;
    assert.ok(brief <= standard && standard <= detailed,
      `levels out of order at ${minutes} min: ${brief}/${standard}/${detailed}`);
    assert.ok(brief >= 1, `no level may ask for nothing at ${minutes} min`);
  }
});

test('the estimate counts the windows the run will actually be split into', async () => {
  const { detailEstimate, densityFor } = await load('../scripts/constants.js');
  const { WINDOW_TARGET_MINUTES, WINDOW_THRESHOLD_MINUTES } =
    await load('../scripts/transcript-windows.js');

  // What the run really asks for: planWindows cuts a long video up and prices
  // each window on its own length, so the total is the sum of the windows —
  // not one calculation over the whole runtime. Rounding five times over 48
  // minutes and once over 240 are different numbers, and the panel is only
  // honest if it does the same arithmetic the requests will.
  const asRequested = (preset, minutes) => {
    if (!(minutes > WINDOW_THRESHOLD_MINUTES)) return densityFor(preset, minutes).target;
    const count = Math.max(2, Math.round(minutes / WINDOW_TARGET_MINUTES));
    let total = 0;
    for (let i = 0; i < count; i++) total += densityFor(preset, minutes / count).target;
    return total;
  };

  // Either side of the windowing threshold, and well past it.
  for (const minutes of [45, 72.7, 89, 91, 103.2, 150, 240, 360, 600]) {
    const shown = detailEstimate(minutes).targets;
    for (const preset of ['brief', 'standard', 'detailed']) {
      assert.equal(shown[preset], asRequested(preset, minutes),
        `${preset} at ${minutes} min: panel shows ${shown[preset]}, run asks for ${asRequested(preset, minutes)}`);
    }
  }
});

test('a long video separates the levels the field is meant to show apart', async () => {
  const { detailEstimate } = await load('../scripts/constants.js');
  const { brief, detailed } = detailEstimate(103.2).targets;
  // The field lights each level in proportion to the densest one. If Brief ever
  // rounded to the same share as In-depth on an hour-plus video, the picture
  // would show three identical combs and say nothing.
  const SLOTS = 42; // DETAIL_FIELD_SLOTS in ui-builder.js
  assert.ok(Math.round((brief / detailed) * SLOTS) < SLOTS - 4,
    'Brief and In-depth must be visibly different densities on a long video');
});

test('an unreadable duration still yields the counts the fallback prompt asks for', async () => {
  const CONSTANTS = (await load('../scripts/constants.js')).default;
  const { detailEstimate } = await load('../scripts/constants.js');

  for (const bad of [null, undefined, 0, -5, NaN, 'twelve']) {
    const estimate = detailEstimate(bad);
    assert.equal(estimate.exact, false, `${String(bad)} is not a usable duration`);
    assert.deepEqual(estimate.targets, CONSTANTS.PROMPTS.LENGTH_PRESET_COUNTS,
      'the fallback counts are the ones LENGTH_PRESETS actually requests');
  }
});
