import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldCancelClickAfterNeuronGrab,
  shouldHandleNeuralPointer,
} from "../src/lib/neuralNetInteraction.ts";

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

test("a stale neuron-grab flag never cancels a foreground control click", () => {
  assert.equal(shouldCancelClickAfterNeuronGrab(true, targetMatching(true)), false);
});

test("a neuron grab still cancels the synthetic click on background content", () => {
  assert.equal(shouldCancelClickAfterNeuronGrab(true, targetMatching(false)), true);
  assert.equal(shouldCancelClickAfterNeuronGrab(false, targetMatching(false)), false);
});
