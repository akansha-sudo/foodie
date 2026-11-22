const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBasket, marketMultipliers } = require("./app.js");

test("basket stays within the selected budget", () => {
  for (const market of Object.keys(marketMultipliers)) {
    const plan = buildBasket(80, 2, 7, market);
    assert.ok(plan.total <= 80);
  }
});

test("basket scales up for larger households", () => {
  const small = buildBasket(150, 1, 7, "Lidl");
  const large = buildBasket(150, 4, 7, "Lidl");
  assert.ok(large.items.length >= small.items.length);
});

test("basket produces a useful item for a small budget", () => {
  const plan = buildBasket(10, 1, 3, "Aldi");
  assert.ok(plan.items.length > 0);
  assert.ok(plan.total <= 10);
});

test("longer duration can increase basket size", () => {
  const shortPlan = buildBasket(120, 2, 3, "Rewe");
  const longPlan = buildBasket(120, 2, 14, "Rewe");
  assert.ok(longPlan.items.length >= shortPlan.items.length);
});
