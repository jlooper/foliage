import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePalette, TARGETS } from '../src/lib/rubric.mjs';

test('an exact target color receives a perfect score', () => {
  assert.deepEqual(scorePalette([[TARGETS.orange.hex, 100]], TARGETS.orange.hex), {
    score: 100,
    hueDifferenceDegrees: 0,
    closestColor: TARGETS.orange.hex,
    closestShare: 100,
  });
});

test('a dark red ranks close to pure red because hue matters more than lightness', () => {
  const score = scorePalette([['#731316', 100]], TARGETS.red.hex);

  assert.ok(score.score >= 85, `expected dark red to score at least 85, got ${score.score}`);
  assert.equal(score.closestColor, '#731316');
});

test('the nearest tone determines score regardless of its palette share', () => {
  const orangeHeavy = scorePalette([[TARGETS.orange.hex, 90], ['#0000FF', 10]], TARGETS.orange.hex);
  const orangeTrace = scorePalette([[TARGETS.orange.hex, 1], ['#0000FF', 99]], TARGETS.orange.hex);

  assert.equal(orangeHeavy.score, 100);
  assert.equal(orangeTrace.score, 100);
  assert.equal(orangeTrace.closestColor, TARGETS.orange.hex);
  assert.equal(orangeTrace.closestShare, 1);
});

test('a palette can be compared against each target color', () => {
  const palette = [['#F5A623', 70], ['#66724B', 30]];
  const scores = Object.fromEntries(Object.entries(TARGETS).map(([key, target]) => [
    key,
    scorePalette(palette, target.hex).score,
  ]));

  assert.equal(Object.keys(scores).length, 3);
  assert.ok(scores.orange > scores.red);
  assert.ok(scores.orange > scores.yellow);
});

test('invalid or missing palettes return no score', () => {
  assert.equal(scorePalette([], TARGETS.orange.hex), null);
  assert.equal(scorePalette([['not-a-color', 100]], TARGETS.orange.hex), null);
});

test('near-neutral colors have low hue confidence', () => {
  const score = scorePalette([['#808080', 100]], TARGETS.red.hex);

  assert.ok(score.score < 10);
});