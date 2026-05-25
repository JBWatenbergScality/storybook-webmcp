import { describe, expect, it } from 'vitest';
import { closestMatches } from './levenshtein';

describe('closestMatches', () => {
  it('returns up to k closest strings by edit distance', () => {
    const candidates = ['ui-button', 'ui-input', 'ui-card', 'ui-modal'];
    expect(closestMatches('ui-buton', candidates, 2)).toEqual(['ui-button', 'ui-input']);
  });

  it('returns at most k results even if more candidates exist', () => {
    expect(closestMatches('x', ['a', 'b', 'c', 'd'], 2)).toHaveLength(2);
  });
});
