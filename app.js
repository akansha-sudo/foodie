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
    const multiplier = marketMultipliers[market] || 1;
    const basket = [];
    let total = 0;

    const affordable = catalog
      .map((item) => ({ ...item, price: roundCurrency(item.price * multiplier) }))
      .sort((a, b) => b.servings / b.price - a.servings / a.price);

    for (const item of affordable) {
      if (basket.length < 12 && total + item.price <= safeBudget) {
        basket.push(item);
        total = roundCurrency(total + item.price);
      }
      if (basket.length >= 12) break;
    }

    if (basket.length === 0) {
      const cheapest = affordable.reduce((lowest, item) => item.price < lowest.price ? item : lowest);
      if (safeBudget < cheapest.price) return { items: [], total: 0, remaining: roundCurrency(safeBudget), percentage: 0 };
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
    const savedStorageKey = "korbo-saved-lists";
    const budgetInput = document.getElementById("budget");
    const marketOptions = document.getElementById("marketOptions");
    const basketList = document.getElementById("basketList");
    const plannerView = document.getElementById("plannerView");
    const savedView = document.getElementById("savedView");
    const savedList = document.getElementById("savedList");
    const savedCount = document.getElementById("savedCount");
    let activeSavedId = null;

    function loadSavedLists() {
      try {
        const saved = JSON.parse(localStorage.getItem(savedStorageKey) || "[]");
        if (Array.isArray(saved)) return saved;

        const legacy = JSON.parse(localStorage.getItem("korbo-grocery-list") || "null");
        return legacy ? [{ id: "legacy", name: "Saved grocery list", createdAt: null, budget: 80, ...legacy }] : [];
      } catch (_) {
        return [];
      }
    }

    let savedLists = loadSavedLists();

    function persistSavedLists() {
      try {
        localStorage.setItem(savedStorageKey, JSON.stringify(savedLists));
      } catch (_) {
        // Saving is optional when browser storage is unavailable.
      }
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function switchView(view) {
      const showSaved = view === "saved";
      plannerView.hidden = showSaved;
      savedView.hidden = !showSaved;
      document.querySelectorAll(".app-tab").forEach((tab) => {
        const active = tab.dataset.view === view;
        tab.classList.toggle("active", active);
        tab.toggleAttribute("aria-current", active);
      });
      if (showSaved) renderSavedLists();
    }

    function renderSavedLists() {
      savedCount.textContent = String(savedLists.length);
      if (savedLists.length === 0) {
        savedList.innerHTML = `
          <div class="saved-empty">
            <span aria-hidden="true">🧺</span>
            <h3>No saved lists yet</h3>
            <p>Create a basket, then save it to take with you shopping.</p>
            <button type="button" class="empty-new-button" data-action="new">Create a grocery plan</button>
          </div>
        `;
        return;
      }

      savedList.innerHTML = savedLists.map((list) => {
        const purchased = list.items.filter((item) => item.purchased).length;
        const date = list.createdAt ? new Date(list.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : "Saved";
        return `
          <article class="saved-card">
            <div class="saved-card-main">
              <div class="saved-basket-icon" aria-hidden="true">🧺</div>
              <div>
                <h3>${escapeHtml(list.name)}</h3>
                <p>${escapeHtml(list.market)} · ${list.people} ${list.people === 1 ? "person" : "people"} · ${list.days} ${list.days === 1 ? "day" : "days"}</p>
                <div class="saved-progress">
                  <span>${purchased} of ${list.items.length} purchased</span>
                  <div><i style="width:${list.items.length ? (purchased / list.items.length) * 100 : 0}%"></i></div>
                </div>
              </div>
            </div>
            <div class="saved-card-actions">
              <time>${date}</time>
              <button type="button" class="open-list-button" data-action="open" data-id="${escapeHtml(list.id)}">Open list</button>
              <button type="button" class="delete-list-button" data-action="delete" data-id="${escapeHtml(list.id)}" aria-label="Delete ${escapeHtml(list.name)}">×</button>
            </div>
          </article>
        `;
      }).join("");
    }

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
          <input type="checkbox" aria-label="Mark ${item.name} as purchased" />
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
      activeSavedId = null;
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
      const items = Array.from(basketList.querySelectorAll(".basket-item")).map((row) => ({
        name: row.querySelector(".item-name").textContent,
        purchased: row.querySelector("input").checked,
        category: row.querySelector(".item-meta").textContent.split(" · ")[0],
        unit: row.querySelector(".item-meta").textContent.split(" · ")[1] || "",
        price: row.querySelector(".item-price").textContent,
        emoji: row.querySelector(".item-icon").textContent,
      }));
      const listNumber = savedLists.length + 1;
      const savedId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      savedLists.unshift({
        id: savedId,
        name: `${state.market} grocery list ${listNumber}`,
        createdAt: new Date().toISOString(),
        budget: Math.max(10, Number(budgetInput.value) || 10),
        market: state.market,
        people: state.people,
        days: state.days,
        items,
      });
      activeSavedId = savedId;
      persistSavedLists();
      renderSavedLists();
      const toast = document.getElementById("toast");
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 2200);
    });

    document.querySelectorAll(".app-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    document.getElementById("newListButton").addEventListener("click", () => switchView("planner"));

    basketList.addEventListener("change", (event) => {
      if (!event.target.matches('input[type="checkbox"]') || !activeSavedId) return;
      const row = event.target.closest(".basket-item");
      const name = row.querySelector(".item-name").textContent;
      const list = savedLists.find((entry) => entry.id === activeSavedId);
      const item = list?.items.find((entry) => entry.name === name);
      if (!item) return;
      item.purchased = event.target.checked;
      persistSavedLists();
    });

    savedList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;

      if (action === "new") {
        switchView("planner");
        return;
      }

      const list = savedLists.find((entry) => entry.id === button.dataset.id);
      if (!list) return;

      if (action === "delete") {
        savedLists = savedLists.filter((entry) => entry.id !== list.id);
        persistSavedLists();
        renderSavedLists();
        return;
      }

      if (action === "open") {
        activeSavedId = list.id;
        budgetInput.value = String(list.budget || 80);
        Object.assign(state, {
          market: list.market || "Lidl",
          people: list.people || 2,
          days: list.days || 7,
        });
        document.getElementById("people").textContent = String(state.people);
        document.getElementById("days").textContent = String(state.days);
        marketOptions.querySelectorAll(".market-chip").forEach((chip) => {
          const active = chip.dataset.market === state.market;
          chip.classList.toggle("active", active);
          chip.setAttribute("aria-pressed", String(active));
        });
        render();

        Array.from(basketList.querySelectorAll(".basket-item")).forEach((row) => {
          const name = row.querySelector(".item-name").textContent;
          const savedItem = list.items.find((item) => item.name === name);
          row.querySelector("input").checked = Boolean(savedItem?.purchased);
        });
        switchView("planner");
      }
    });

    render();
    renderSavedLists();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initApp);
    else initApp();
  }

  return { catalog, marketMultipliers, buildBasket, formatCurrency, roundCurrency };
});
