// Execution-adjudication die: read why a sandbox run passed or failed and judge differentially
// (base vs patched) so a correct fix isn't called wrong just because the repo already had
// unrelated failures or a broken test harness.
export function parseTestCounts(log) {
  const g = (re) => { const m = re.exec(String(log || "")); return m ? Number(m[1]) : null; };
  return { tests: g(/# tests (\d+)/), pass: g(/# pass (\d+)/), fail: g(/# fail (\d+)/) };
}

export function parseMarkers(log) {
  const t = String(log || "");
  const markers = [];
  // Match REAL tool output, not the workflow's own echoed sentinels (the Actions log includes
  // the rendered shell script, so matching "PATCH_APPLY_FAILED" literally false-positives).
  if (/error:[^\n]*(patch failed|does not apply)/i.test(t)) markers.push("patch-apply-failed");
  if (/Cannot find module/.test(t)) markers.push("module-not-found");
  return markers;
}

export function summarizeRun(log) {
  const counts = parseTestCounts(log);
  const markers = parseMarkers(log);
  const harnessBroken = markers.includes("module-not-found");
  return { counts, markers, harnessBroken };
}

// Compare a base (unpatched) run to a patched run. base/patched: { summary } from summarizeRun.
export function differentialVerdict(base, patched) {
  if (patched.summary.markers.includes("patch-apply-failed")) {
    return { verdict: "patch-does-not-apply", reason: "our patch failed to apply in the sandbox" };
  }
  if (base.summary.harnessBroken) {
    return { verdict: "inconclusive", reason: "the repo's own test harness is broken at base — correctness can't be judged here (pick a repo with a working suite)" };
  }
  const bf = base.summary.counts.fail, pf = patched.summary.counts.fail;
  if (bf == null || pf == null) {
    return { verdict: "inconclusive", reason: "no parseable test counts in one of the runs" };
  }
  if (pf < bf) return { verdict: "improved", reason: `failing tests ${bf} -> ${pf}: our fix makes a previously-failing test pass` };
  if (pf === bf) return { verdict: "no-regression", reason: `failing tests unchanged at ${bf}: our fix breaks nothing but no relevant test proves it` };
  return { verdict: "regression", reason: `failing tests ${bf} -> ${pf}: our patch BROKE something` };
}
