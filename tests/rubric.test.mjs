import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePredominant, scorePredominant, serializePredominant } from '../src/lib/rubric.mjs';

const burningBush = [['red', 50], ['lightblue', 26], ['pink', 9.8], ['black', 3.2], ['brown', 2.5], ['orange', 2.3]];

test('a target scores the share of the photo in its Cloudinary color buckets', () => {
  assert.equal(scorePredominant([['orange', 40], ['green', 60]], 'orange').score, 40);
  assert.equal(scorePredominant([['green', 100]], 'orange').score, 0);
});

test('red also counts pink, since crimson leaves split between the two', () => {
  const score = scorePredominant(burningBush, 'red');

  assert.equal(score.score, 60);
  assert.deepEqual(score.matches.map((match) => match.name), ['red', 'pink']);
});

test('a mostly-red photo outranks a photo with a single red leaf', () => {
  const mostlyRed = scorePredominant([['red', 45], ['green', 55]], 'red').score;
  const oneLeaf = scorePredominant([['green', 97], ['red', 3]], 'red').score;

  assert.ok(mostlyRed > oneLeaf);
});

test('one photo can be scored against every target', () => {
  assert.equal(scorePredominant(burningBush, 'orange').score, 2);
  assert.equal(scorePredominant(burningBush, 'yellow').score, 0);
});

test('missing or unknown data returns no score', () => {
  assert.equal(scorePredominant([], 'red'), null);
  assert.equal(scorePredominant(undefined, 'red'), null);
  assert.equal(scorePredominant(burningBush, 'purple'), null);
});

test('predominant colors round-trip through context metadata', () => {
  const stored = serializePredominant(burningBush);

  assert.equal(stored, 'red:50.0,lightblue:26.0,pink:9.8,black:3.2,brown:2.5,orange:2.3');
  assert.deepEqual(parsePredominant(stored).map(([name]) => name), burningBush.map(([name]) => name));
  assert.deepEqual(parsePredominant('garbage,<b>:5,red:x'), []);
});
