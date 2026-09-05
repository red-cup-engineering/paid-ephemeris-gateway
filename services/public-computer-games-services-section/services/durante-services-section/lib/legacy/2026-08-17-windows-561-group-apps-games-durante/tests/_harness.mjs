// _harness — a zero-dependency assert harness for the tsander proofs (mirrors arnold's). Each proof
// imports modules by ABSOLUTE path (the agent cwd resets between calls), runs assertions, and exits
// non-zero on the first failure.

let passed = 0;

export function ok(cond, label) {
  if (!cond) { console.error(`  ✗ ${label}`); process.exit(1); }
  passed++;
  console.log(`  ✓ ${label}`);
}

export function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`  ✗ ${label}\n      expected ${e}\n      got      ${a}`);
    process.exit(1);
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

export function close(a, b, label, eps = 1e-4) {
  if (Math.abs(a - b) > eps) {
    console.error(`  ✗ ${label}\n      ${a} ≉ ${b}`);
    process.exit(1);
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

export function closeArr(a, b, label, eps = 1e-4) {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > eps) {
      console.error(`  ✗ ${label}\n      [${a}] ≉ [${b}] at ${i}`);
      process.exit(1);
    }
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

export function done(name) {
  console.log(`${name}: ${passed} assertion(s) passed`);
}
