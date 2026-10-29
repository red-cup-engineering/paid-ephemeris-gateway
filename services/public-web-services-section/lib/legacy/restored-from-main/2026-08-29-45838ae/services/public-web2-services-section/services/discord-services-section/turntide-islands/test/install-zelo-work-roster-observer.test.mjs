import assert from "node:assert/strict";
import test from "node:test";
import { spliceZeloWorkObserver, zeloWorkObserverBlock } from "../lib/management/install-zelo-work-roster-observer.mjs";

test("installs one locked five-minute Zelo work observer without disturbing other recurrence", () => {
  const existing = "0 0 * * * unrelated\n";
  const options = { ttiRoot: "/srv/tti", nodePath: "/usr/bin/node" };
  const once = spliceZeloWorkObserver(existing, options);
  const twice = spliceZeloWorkObserver(once, options);
  assert.equal(once, twice);
  assert.match(once, /0 0 \* \* \* unrelated/u);
  assert.match(zeloWorkObserverBlock(options), /\*\/5 \* \* \* \*.*flock.*zelo-work-roster\.mjs observe/u);
});

test("refuses torn recurrence markers", () => {
  assert.throws(() => spliceZeloWorkObserver("# BEGIN TTI ZELO WORK ROSTER OBSERVER\n"), /markers malformed/u);
});
