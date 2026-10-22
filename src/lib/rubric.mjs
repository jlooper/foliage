// Cloudinary's predominant-color analysis (`colors: true`) groups every pixel into
// named buckets such as "red", "pink" or "lightblue" and reports each bucket's
// share of the photo. A leaderboard score is the share of the photo that falls in
// the buckets belonging to that target color.
export const TARGETS = {
  orange: { label: 'Orange', hex: '#FF8000', buckets: ['orange'] },
  red: { label: 'Red', hex: '#DC143C', buckets: ['red', 'pink'] },
  yellow: { label: 'Yellow', hex: '#FFD400', buckets: ['yellow'] },
};

// Context metadata is stored as "red:50,lightblue:26.1".
export function parsePredominant(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').flatMap((entry) => {
    const [name, share] = entry.split(':');
    const numericShare = Number(share);
    return /^[a-z]+$/.test(name ?? '') && Number.isFinite(numericShare) && numericShare >= 0
      ? [[name, numericShare]]
      : [];
  });
}

export function serializePredominant(predominant) {
  return Array.isArray(predominant)
    ? predominant
      .filter((entry) => Array.isArray(entry) && /^[a-z]+$/.test(String(entry[0])) && Number.isFinite(Number(entry[1])))
      .map(([name, share]) => `${name}:${Number(share).toFixed(1)}`)
      .join(',')
    : '';
}

export function scorePredominant(predominant, targetKey) {
  const target = TARGETS[targetKey];
  if (!target || !Array.isArray(predominant) || predominant.length === 0) return null;

  const matches = predominant.filter(([name]) => target.buckets.includes(name));
  const share = matches.reduce((total, [, value]) => total + value, 0);

  return {
    score: Math.min(100, Math.round(share)),
    matches: matches.map(([name, value]) => ({ name, share: value })),
  };
}
