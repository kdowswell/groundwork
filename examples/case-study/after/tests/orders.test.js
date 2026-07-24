"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");

test("orders module exports list", () => {
  const orders = require("../orders");
  assert.equal(typeof orders.list, "function");
});
