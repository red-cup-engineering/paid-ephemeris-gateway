// Allocation calibration makes improvement measurable: keep making our
// predicted success-probabilities match reality. Brier score = mean squared error of our
// predictions vs outcomes (lower is better; 0 is perfect, 0.25 is a coin-flip on balanced
// data). Reliability bins show WHERE we're mis-calibrated. The RSI signal is: Brier trending
// down over cycles as posteriors absorb outcomes from the witness ledger.
export function brierScore(predictions) {
  if (!predictions || predictions.length === 0) return null;
  return predictions.reduce((s, { p, y }) => s + (p - y) ** 2, 0) / predictions.length;
}

export function reliability(predictions, bins = 10) {
  const b = Array.from({ length: bins }, () => ({ n: 0, psum: 0, ysum: 0 }));
  for (const { p, y } of predictions || []) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(p * bins)));
    b[i].n++; b[i].psum += p; b[i].ysum += y;
  }
  return b.map((x, i) => ({ bin: i, n: x.n, predicted: x.n ? x.psum / x.n : null, empirical: x.n ? x.ysum / x.n : null }));
}

// Base rate for reference (a predictor must beat predicting this constant).
export function baseRate(predictions) {
  if (!predictions || predictions.length === 0) return null;
  return predictions.reduce((s, { y }) => s + y, 0) / predictions.length;
}
