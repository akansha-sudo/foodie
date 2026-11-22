(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Korbo = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const marketMultipliers = {
    Lidl: 0.92,
    Aldi: 0.94,
    Rewe: 1.08,
    Edeka: 1.12,
    Kaufland: 1.0,
  };

  const catalog = [
    { name: "Rolled oats", category: "Breakfast", unit: "1 kg", price: 1.49, servings: 12, emoji: "🌾" },
    { name: "Milk", category: "Dairy", unit: "1 litre", price: 1.09, servings: 5, emoji: "🥛" },
    { name: "Free-range eggs", category: "Protein", unit: "10 pieces", price: 2.89, servings: 5, emoji: "🥚" },
    { name: "Wholegrain bread", category: "Bakery", unit: "1 loaf", price: 1.29, servings: 6, emoji: "🍞" },
    { name: "Bananas", category: "Fruit", unit: "1 kg", price: 1.49, servings: 6, emoji: "🍌" },
    { name: "Apples", category: "Fruit", unit: "1 kg", price: 2.29, servings: 7, emoji: "🍎" },
    { name: "Natural yogurt", category: "Dairy", unit: "500 g", price: 1.39, servings: 4, emoji: "🥣" },
    { name: "Tomatoes", category: "Vegetables", unit: "500 g", price: 1.99, servings: 4, emoji: "🍅" },
    { name: "Cucumbers", category: "Vegetables", unit: "1 piece", price: 1.29, servings: 3, emoji: "🥒" },
    { name: "Potatoes", category: "Vegetables", unit: "2 kg", price: 2.49, servings: 10, emoji: "🥔" },
    { name: "Carrots", category: "Vegetables", unit: "1 kg", price: 1.29, servings: 6, emoji: "🥕" },
    { name: "Pasta", category: "Pantry", unit: "500 g", price: 1.19, servings: 5, emoji: "🍝" },
    { name: "Rice", category: "Pantry", unit: "1 kg", price: 2.49, servings: 10, emoji: "🍚" },
    { name: "Red lentils", category: "Pantry", unit: "500 g", price: 1.79, servings: 6, emoji: "🫘" },
    { name: "Chicken breast", category: "Protein", unit: "500 g", price: 6.99, servings: 4, emoji: "🍗" },
    { name: "Cheese", category: "Dairy", unit: "300 g", price: 2.49, servings: 5, emoji: "🧀" },
    { name: "Tinned tuna", category: "Protein", unit: "1 tin", price: 1.29, servings: 2, emoji: "🐟" },
    { name: "Frozen vegetables", category: "Vegetables", unit: "750 g", price: 1.99, servings: 5, emoji: "🥦" },
  ];

  function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function buildBasket(budget, people, days, market) {
    const safeBudget = Math.max(0, Number(budget) || 0);
    const safePeople = Math.max(1, Number(people) || 1);
    const safeDays = Math.max(1, Number(days) || 1);
    const multiplier = marketMultipliers[market] || 1;
    const targetServings = safePeople * safeDays * 1.5;
    const basket = [];
    let total = 0;
    let servings = 0;

    const affordable = catalog
      .map((item) => ({ ...item, price: roundCurrency(item.price * multiplier) }))
      .sort((a, b) => b.servings / b.price - a.servings / a.price);

    for (const item of affordable) {
      while (servings < targetServings && total + item.price <= safeBudget) {
        basket.push(item);
        total = roundCurrency(total + item.price);
        servings += item.servings;
        if (basket.length >= 24) break;
      }
      if (basket.length >= 24) break;
    }

    if (basket.length === 0 && safeBudget >= affordable[affordable.length - 1].price) {
      const cheapest = affordable[affordable.length - 1];
      basket.push(cheapest);
      total = cheapest.price;
    }

    return {
      items: basket,
      total,
      remaining: roundCurrency(safeBudget - total),
      percentage: safeBudget ? Math.min(100, roundCurrency((total / safeBudget) * 100)) : 0,
    };
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  }

  function initApp() {
    if (typeof document === "undefined") return;

    const state = { market: "Lidl", people: 2, days: 7 };
    const budgetInput = document.getElementById("budget");
    const marketOptions = document.getElementById("marketOptions");
    const basketList = document.getElementById("basketList");

    function render() {
      const budget = Math.max(10, Number(budgetInput.value) || 10);
      const plan = buildBasket(budget, state.people, state.days, state.market);

      document.getElementById("totalPrice").textContent = formatCurrency(plan.total);
      document.getElementById("budgetUsed").textContent = `${plan.percentage}% of budget`;
      document.getElementById("remainingBudget").textContent = `${formatCurrency(Math.max(0, plan.remaining))} left`;
      document.getElementById("progressBar").style.width = `${plan.percentage}%`;
      document.getElementById("summaryMarket").textContent = state.market;
      document.getElementById("summaryHousehold").textContent = `${state.people} ${state.people === 1 ? "person" : "people"}`;
      document.getElementById("summaryDays").textContent = `${state.days} ${state.days === 1 ? "day" : "days"}`;
      document.getElementById("summaryMeals").textContent = `~${state.people * state.days} meals`;

      basketList.innerHTML = plan.items.map((item, index) => `
        <article class="basket-item" style="animation-delay:${index * 25}ms">
          <div class="item-icon" aria-hidden="true">${item.emoji}</div>
          <div>
            <div class="item-name">${item.name}</div>
            <div class="item-meta">${item.category} · ${item.unit}</div>
          </div>
          <div class="item-price">${formatCurrency(item.price)}</div>
        </article>
      `).join("");
    }

    marketOptions.addEventListener("click", (event) => {
      const chip = event.target.closest(".market-chip");
      if (!chip) return;
      marketOptions.querySelectorAll(".market-chip").forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
      state.market = chip.dataset.market;
      render();
    });

    document.querySelectorAll(".stepper").forEach((stepper) => {
      stepper.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const key = stepper.dataset.control;
        state[key] = Math.max(key === "people" ? 1 : 1, Math.min(key === "people" ? 12 : 30, state[key] + Number(button.dataset.step)));
        document.getElementById(key).textContent = state[key];
        render();
      });
    });

    budgetInput.addEventListener("input", render);
    document.getElementById("resetButton").addEventListener("click", () => {
      Object.assign(state, { market: "Lidl", people: 2, days: 7 });
      budgetInput.value = "80";
      document.getElementById("people").textContent = "2";
      document.getElementById("days").textContent = "7";
      marketOptions.querySelectorAll(".market-chip").forEach((item) => {
        const active = item.dataset.market === "Lidl";
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      render();
    });

    document.getElementById("saveButton").addEventListener("click", () => {
      const toast = document.getElementById("toast");
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 2200);
    });

    render();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initApp);
    else initApp();
  }

  return { catalog, marketMultipliers, buildBasket, formatCurrency, roundCurrency };
});
