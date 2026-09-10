// Smoothing for the weight chart using an Exponential Moving Average (EMA).
// Formula: smoothed[i] = alpha * raw[i] + (1 - alpha) * smoothed[i - 1].
// Seeded with the first raw value.
// Input: weight entries sorted ascending by date, each { logged_date, weight_kg }.
// Output: same entries plus a `trend` field (rounded to 0.1 kg).

export function smoothedWeights(entries, alpha = 0.25) {
  if (!entries || entries.length === 0) return [];

  const result = [];
  let prevSmoothed = entries[0].weight_kg;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    let trendValue = prevSmoothed;
    if (entry.weight_kg != null) {
      trendValue = alpha * entry.weight_kg + (1 - alpha) * prevSmoothed;
      prevSmoothed = trendValue;
    }

    result.push({
      ...entry,
      trend: Math.round(trendValue * 10) / 10,
    });
  }

  return result;
}
