import assert from "node:assert/strict";
import test from "node:test";

import {
  isBeyondCodeHistoryState,
  openBeyondCodeHistory,
} from "../src/lib/beyondCodeHistory.ts";

test("opening Beyond the Code adds history without changing the root URL", () => {
  const calls: Array<[unknown, string, string]> = [];
  const history = {
    state: { existing: "value" },
    pushState: (state: unknown, title: string, url: string) => {
      calls.push([state, title, url]);
    },
  };

  openBeyondCodeHistory(history);

  assert.deepEqual(calls, [
    [{ existing: "value", beyondCode: true }, "", "/"],
  ]);
});

test("recognizes only the dedicated Beyond the Code history entry", () => {
  assert.equal(isBeyondCodeHistoryState({ beyondCode: true }), true);
  assert.equal(isBeyondCodeHistoryState({ beyondCode: false }), false);
  assert.equal(isBeyondCodeHistoryState(null), false);
});
