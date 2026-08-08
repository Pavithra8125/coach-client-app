// Smoothing for the weight chart. The coach logs daily-ish weights that wobble
// day to day (water, sleep, timing); a raw line reads as noise. This computes a
// centered moving average: each entry's trend value is the mean of itself and
// its `window` neighbours (±half on each side), shrinking the window at the
// ends so no logged day is dropped. With fewer than 3 points there is nothing
// to smooth, so trend = the raw weight.
//
// Input: weight entries sorted ascending by date, each { date, weight }.
// Output: same entries plus a `trend` field (rounded to 0.1 kg).
export function smoothedWeights(entries, window = 5) {
  if (entries.length < 3) return entries.map((entry) => ({ ...entry, trend: entry.weight }));

  const half = Math.floor(window / 2);
  const n = entries.length;
  return entries.map((entry, i) => {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    const slice = entries.slice(lo, hi + 1);
    const mean = slice.reduce((sum, e) => sum + e.weight, 0) / slice.length;
    return { ...entry, trend: Math.round(mean * 10) / 10 };
  });
}
