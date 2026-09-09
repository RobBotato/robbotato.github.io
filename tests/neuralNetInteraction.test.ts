import assert from "node:assert/strict";
import test from "node:test";

import { shouldHandleNeuralPointer } from "../src/lib/neuralNetInteraction.ts";

const targetMatching = (match: boolean) => ({
  closest: () => (match ? {} : null),
});

test("neural net ignores pointer events that start on interactive page controls", () => {
  assert.equal(shouldHandleNeuralPointer(targetMatching(true)), false);
});

test("neural net handles pointer events that start on non-interactive content", () => {
  assert.equal(shouldHandleNeuralPointer(targetMatching(false)), true);
});

test("neural net handles pointer events without an element target", () => {
  assert.equal(shouldHandleNeuralPointer(null), true);
});
