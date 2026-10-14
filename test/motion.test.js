import assert from "node:assert/strict";
import test from "node:test";
import { longestTransition, toMilliseconds } from "../src/lib/motion.mjs";

test("reads seconds and milliseconds from computed styles and tokens", () => {
    assert.equal(toMilliseconds("0.22s"), 220);
    assert.equal(toMilliseconds(" 150ms"), 150);
    assert.equal(toMilliseconds(".01ms"), 0.01);
    assert.equal(toMilliseconds(""), 0);
});

test("the longest transition includes its delay and repeats delays like CSS", () => {
    assert.equal(longestTransition("0.22s, 0.15s", "0s, 0.1s"), 250);
    assert.equal(longestTransition("0.15s, 0.22s, 0s", "0.05s"), 270);
    assert.equal(longestTransition("0s", "0s"), 0);
    assert.equal(longestTransition("1e-05s", "0s"), 0.01);
});
