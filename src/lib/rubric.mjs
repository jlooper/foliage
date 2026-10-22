export const TARGETS = {
  orange: { label: 'Orange', hex: '#FF8000', hueTolerance: 180 },
  red: { label: 'Red', hex: '#DC143C', hueTolerance: 60 },
  yellow: { label: 'Yellow', hex: '#FFFF00', hueTolerance: 180 },
};

// Red sits only ~20° from orange in CIELAB hue, so a wide tolerance lets orange
// trees score nearly as well as true reds; red gets a narrower one.
const DEFAULT_HUE_TOLERANCE = 180;

const MIN_CONFIDENT_CHROMA = 12;

function hexToLab(hex) {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const channels = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);

  const x = (red * 0.4124564 + green * 0.3575761 + blue * 0.1804375) / 0.95047;
  const y = (red * 0.2126729 + green * 0.7151522 + blue * 0.0721750);
  const z = (red * 0.0193339 + green * 0.1191920 + blue * 0.9503041) / 1.08883;
  const curve = (value) => value > 0.008856 ? Math.cbrt(value) : (7.787 * value) + (16 / 116);
  const fx = curve(x);
  const fy = curve(y);
  const fz = curve(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function hueAndChroma(lab) {
  return {
    hue: (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360,
    chroma: Math.hypot(lab[1], lab[2]),
  };
}

function hueDifference(left, right) {
  const difference = Math.abs(left - right);
  return Math.min(difference, 360 - difference);
}

export function scorePalette(palette, targetHex) {
  const hueTolerance = Object.values(TARGETS).find((entry) => entry.hex.toLowerCase() === String(targetHex).toLowerCase())?.hueTolerance
    ?? DEFAULT_HUE_TOLERANCE;
  const targetLab = hexToLab(targetHex);
  const target = targetLab && hueAndChroma(targetLab);
  const colors = Array.isArray(palette)
    ? palette
      .filter((entry) => Array.isArray(entry) && typeof entry[0] === 'string')
      .map(([hex, share]) => {
        const lab = hexToLab(hex);
        return { hex, ...hueAndChroma(lab ?? [0, 0, 0]), share: Number(share), valid: Boolean(lab) };
      })
      .filter((entry) => entry.valid && Number.isFinite(entry.share) && entry.share >= 0)
    : [];

  if (!target || colors.length === 0) return null;

  const closest = colors.reduce((best, color) => {
    const difference = hueDifference(color.hue, target.hue);
    const chromaConfidence = Math.min(1, color.chroma / MIN_CONFIDENT_CHROMA);
    const score = Math.round(100 * Math.max(0, 1 - difference / hueTolerance) * chromaConfidence);
    return !best || score > best.score
      ? { ...color, hueDifference: difference, score }
      : best;
  }, null);

  return {
    score: closest.score,
    hueDifferenceDegrees: Number(closest.hueDifference.toFixed(2)),
    closestColor: closest.hex,
    closestShare: closest.share,
  };
}