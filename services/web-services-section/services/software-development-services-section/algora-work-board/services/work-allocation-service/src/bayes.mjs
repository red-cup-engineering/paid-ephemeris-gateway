// Bayesian primitives for the work-allocation die. Beta-Bernoulli is the right model: each
// opportunity's success is a coin with unknown bias p; a Beta(alpha,beta) posterior carries
// both our estimate AND its uncertainty, which is what lets us explore/exploit honestly
// instead of ranking on a point guess. Sampling is seedable so it is deterministically testable.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleNormal(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Marsaglia–Tsang gamma sampler.
export function sampleGamma(k, rng) {
  if (k < 1) return sampleGamma(1 + k, rng) * Math.pow(rng() || 1e-12, 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = sampleNormal(rng); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(alpha, beta, rng) {
  const x = sampleGamma(alpha, rng), y = sampleGamma(beta, rng);
  return x / (x + y);
}

export function betaMean(alpha, beta) {
  return alpha / (alpha + beta);
}

// Posterior variance — a first-class "how unsure are we" number (drives exploration).
export function betaVariance(alpha, beta) {
  const s = alpha + beta;
  return (alpha * beta) / (s * s * (s + 1));
}
