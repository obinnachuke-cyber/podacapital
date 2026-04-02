const DATA_URL = "https://script.google.com/macros/s/AKfycbx6SMI3W_XOV48mqxn87nJo1Dkcf9aOyAHMxreEIdXKBQWsojnNCOqtva_Kd0wt-T05oA/exec";

let appData = {
  metrics: [],
  listed: [],
  closet: [],
  sold: [],
  newsletters: []
};

let currentSection = "closet";
let filtersInitialized = false;
let openFilterName = null;
const filterState = {
  brand: "",
  source: ""
};

function imageFromAssetId(assetId) {
  if (!assetId) return "";
  return `images/${assetId}.jpg`;
}

function metricValue(metrics, key) {
  const row = metrics.find(item => item.key === key);
  return row ? row.value : "";
}

function parseNumberLoose(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const s = String(value).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[$,%\s]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value, { signed = false } = {}) {
  const n = parseNumberLoose(value);
  const abs = Math.abs(n);
  const base = `$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (!signed) return base;
  return `${n >= 0 ? "+" : "-"}${base}`;
}

function formatPercent(value) {
  const n = parseNumberLoose(value);
  const maybeFraction = n > 0 && n <= 1 ? n * 100 : n;
  return `${maybeFraction.toLocaleString("en-US", { maximumFractionDigits: 0 })}%`;
}

function setSignedValue(el, rawNumber) {
  if (!el) return;
  const n = parseNumberLoose(rawNumber);
  el.textContent = formatMoney(n, { signed: true });
  el.classList.remove("positive", "negative");
  if (n > 0) el.classList.add("positive");
  if (n < 0) el.classList.add("negative");
}

let capitalByStatusChartInstance = null;
let netPnLOverTimeChartInstance = null;

function getMetric(metrics, key) {
  return metricValue(metrics, key);
}

function getMetricNumber(metrics, key) {
  return parseNumberLoose(getMetric(metrics, key));
}

function renderPortfolioDashboard(metrics, maybeMonthlyPnL) {
  const kpiCapitalOnHand = document.getElementById("kpiCapitalOnHand");
  const kpiInventoryCost = document.getElementById("kpiInventoryCost");
  const kpiMarketValue = document.getElementById("kpiMarketValue");
  const kpiNetPnL = document.getElementById("kpiNetPnL");
  const kpiUnrealizedPnL = document.getElementById("kpiUnrealizedPnL");

  if (kpiCapitalOnHand) kpiCapitalOnHand.textContent = formatMoney(getMetric(metrics, "capitalOnHand"));
  if (kpiInventoryCost) kpiInventoryCost.textContent = formatMoney(getMetric(metrics, "inventoryCost"));
  if (kpiMarketValue) kpiMarketValue.textContent = formatMoney(getMetric(metrics, "estMarketValue"));
  setSignedValue(kpiNetPnL, getMetric(metrics, "netPnL"));
  setSignedValue(kpiUnrealizedPnL, getMetric(metrics, "unrealizedPnL"));

  const statTotalItems = document.getElementById("statTotalItems");
  const statAvgDaysToSell = document.getElementById("statAvgDaysToSell");
  const statSellThroughRate = document.getElementById("statSellThroughRate");
  const statBestBrand = document.getElementById("statBestBrand");
  const statAvgMarkupPct = document.getElementById("statAvgMarkupPct");

  if (statTotalItems) statTotalItems.textContent = `${getMetricNumber(metrics, "totalItems").toLocaleString("en-US")}`;
  if (statAvgDaysToSell) statAvgDaysToSell.textContent = `${getMetricNumber(metrics, "avgDaysToSell").toLocaleString("en-US")} days`;
  if (statSellThroughRate) statSellThroughRate.textContent = formatPercent(getMetric(metrics, "sellThroughRate"));
  if (statBestBrand) statBestBrand.textContent = getMetric(metrics, "bestBrand") || "";
  if (statAvgMarkupPct) statAvgMarkupPct.textContent = formatPercent(getMetric(metrics, "avgMarkupPct"));

  // Charts
  const invCost = getMetricNumber(metrics, "inventoryCost");
  const capitalDeployed = getMetricNumber(metrics, "capitalDeployed");
  const listedEstimate = invCost * 0.35; // estimate (can be replaced when sheet provides a listedCost metric)
  const inCloset = Math.max(0, invCost - listedEstimate);
  const sold = Math.max(0, capitalDeployed - invCost);

  const barCanvas = document.getElementById("capitalByStatusChart");
  if (barCanvas && window.Chart) {
    const barData = {
      labels: ["In Closet", "Listed", "Sold"],
      datasets: [
        {
          data: [inCloset, listedEstimate, sold],
          backgroundColor: "rgba(76, 51, 153, 0.8)",
          borderRadius: 10
        }
      ]
    };

    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => formatMoney(ctx.raw || 0)
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#666" },
          border: { display: false }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: "#666",
            callback: value => `$${Number(value).toLocaleString("en-US")}`
          },
          border: { display: false }
        }
      }
    };

    if (capitalByStatusChartInstance) {
      capitalByStatusChartInstance.data = barData;
      capitalByStatusChartInstance.options = barOptions;
      capitalByStatusChartInstance.update();
    } else {
      capitalByStatusChartInstance = new Chart(barCanvas, {
        type: "bar",
        data: barData,
        options: barOptions
      });
    }
  }

  const lineCanvas = document.getElementById("netPnLOverTimeChart");
  if (lineCanvas && window.Chart) {
    const placeholder = [
      { month: "Jan", value: 190 },
      { month: "Feb", value: 215 },
      { month: "Mar", value: 405 }
    ];

    const src = Array.isArray(maybeMonthlyPnL) && maybeMonthlyPnL.length ? maybeMonthlyPnL : placeholder;

    const points = src
      .map(row => {
        const month = row.month || row.label || row.date || row.period || "";
        const value = row.netPnL ?? row.netpnl ?? row.value ?? row.pnl ?? row.amount ?? 0;
        return { month: String(month), value: parseNumberLoose(value) };
      })
      .filter(p => p.month);

    const labels = points.length ? points.map(p => p.month) : placeholder.map(p => p.month);
    const values = points.length ? points.map(p => p.value) : placeholder.map(p => p.value);

    const lineData = {
      labels,
      datasets: [
        {
          label: "Net P&L",
          data: values,
          borderColor: "#16A34A",
          backgroundColor: "rgba(22, 163, 74, 0.1)",
          tension: 0.35,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 4
        }
      ]
    };

    const lineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => formatMoney(ctx.raw || 0, { signed: true })
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#666" },
          border: { display: false }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: "#666",
            callback: value => formatMoney(value, { signed: true })
          },
          border: { display: false }
        }
      }
    };

    if (netPnLOverTimeChartInstance) {
      netPnLOverTimeChartInstance.data = lineData;
      netPnLOverTimeChartInstance.options = lineOptions;
      netPnLOverTimeChartInstance.update();
    } else {
      netPnLOverTimeChartInstance = new Chart(lineCanvas, {
        type: "line",
        data: lineData,
        options: lineOptions
      });
    }
  }
}

function formatPrice(priceValue) {
  if (priceValue === null || priceValue === undefined) return "";
  const raw = String(priceValue).trim();
  if (!raw) return "";
  if (raw.startsWith("$")) return raw;
  return `$${raw}`;
}

function formatSoldDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function setFilterTriggerLabel(filterName, text) {
  const trigger = document.getElementById(`${filterName}FilterTrigger`);
  const label = trigger?.querySelector(".filter-trigger-label");
  if (label) label.textContent = text;
}

function currentSectionItems() {
  return appData[currentSection] || [];
}

function currentSectionFilterOptions() {
  const items = currentSectionItems();
  const brands = [...new Set(items.map(item => item.brand).filter(Boolean))].sort();
  const sources = [...new Set(items.map(item => item.source).filter(Boolean))].sort();
  return { brands, sources };
}

function closeAllFilterPanels() {
  document.querySelectorAll(".filter-panel").forEach(panel => panel.classList.remove("show"));
  document.querySelectorAll(".filter-trigger").forEach(trigger => trigger.setAttribute("aria-expanded", "false"));
  openFilterName = null;
}

function toggleFilterPanel(filterName) {
  const panel = document.getElementById(`${filterName}FilterPanel`);
  const trigger = document.getElementById(`${filterName}FilterTrigger`);
  if (!panel || !trigger) return;

  const shouldOpen = openFilterName !== filterName || !panel.classList.contains("show");
  closeAllFilterPanels();
  if (shouldOpen) {
    panel.classList.add("show");
    trigger.setAttribute("aria-expanded", "true");
    openFilterName = filterName;
  }
}

function renderFilterOptions(filterName, options, allLabel) {
  const panel = document.getElementById(`${filterName}FilterPanel`);
  if (!panel) return;

  const rows = [{ value: "", label: allLabel }, ...options.map(option => ({ value: option, label: option }))];
  panel.innerHTML = rows
    .map(row => {
      const selected = filterState[filterName] === row.value;
      return `
        <button type="button" class="filter-option${selected ? " selected" : ""}" data-filter-name="${filterName}" data-value="${escapeAttr(row.value)}">
          <span class="filter-check">${selected ? "✓" : ""}</span>
          <span>${escapeHtml(row.label)}</span>
        </button>
      `;
    })
    .join("");
}

function getFilterValue(filterName) {
  return filterState[filterName] || "";
}

function setupCustomFilters() {
  if (filtersInitialized) return;

  const brandTrigger = document.getElementById("brandFilterTrigger");
  const sourceTrigger = document.getElementById("sourceFilterTrigger");
  const brandPanel = document.getElementById("brandFilterPanel");
  const sourcePanel = document.getElementById("sourceFilterPanel");

  if (!brandTrigger || !sourceTrigger || !brandPanel || !sourcePanel) return;

  brandTrigger.addEventListener("click", e => {
    e.stopPropagation();
    toggleFilterPanel("brand");
  });

  sourceTrigger.addEventListener("click", e => {
    e.stopPropagation();
    toggleFilterPanel("source");
  });

  function onOptionClick(e) {
    const option = e.target.closest(".filter-option");
    if (!option) return;
    const filterName = option.getAttribute("data-filter-name");
    const value = option.getAttribute("data-value") || "";
    if (!filterName) return;

    filterState[filterName] = value;
    setFilterTriggerLabel(filterName, option.textContent.replace("✓", "").trim());

    const { brands, sources } = currentSectionFilterOptions();
    renderFilterOptions("brand", brands, "All Brands");
    renderFilterOptions("source", sources, "All Sources");

    closeAllFilterPanels();
    applyFilters();
  }

  brandPanel.addEventListener("click", onOptionClick);
  sourcePanel.addEventListener("click", onOptionClick);

  document.addEventListener("click", e => {
    if (!e.target.closest(".custom-dropdown")) {
      closeAllFilterPanels();
    }
  });

  filtersInitialized = true;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  // Same escaping is fine for attribute values in this simple use case.
  return escapeHtml(value);
}

function normalizeConditionPill(conditionValue) {
  if (!conditionValue) return "";
  const cond = String(conditionValue).trim();
  if (!cond) return "";

  const lower = cond.toLowerCase();
  if (lower.includes("thrift")) return "thrift";
  if (lower.includes("gently")) return "gently used";
  if (lower.includes("retail")) return "retail";
  if (lower === "new" || lower.includes(" new")) return "new";
  return cond;
}

function normalizeSourcePill(sourceValue) {
  if (!sourceValue) return "";
  const src = String(sourceValue).trim();
  return src;
}

function renderSourceConditionPills(item) {
  const pills = [];

  const src = normalizeSourcePill(item?.source);
  if (src) pills.push(src);

  const cond = normalizeConditionPill(item?.condition);
  if (cond) pills.push(cond);

  return pills
    .slice(0, 2)
    .map(p => `<span class="tag-pill">${escapeHtml(p)}</span>`)
    .join("");
}

function isRemoveX(noteValue) {
  const n = String(noteValue || "").trim();
  const nl = n.toLowerCase();
  return nl === "x" || n === "✕";
}

function noteForDisplay(noteValue) {
  if (isRemoveX(noteValue)) return "";
  return String(noteValue || "").trim();
}

function renderRemoveOverlay(item) {
  const href = item?.removeUrl || item?.removeLink;
  if (href) {
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer" class="remove-overlay-btn" aria-label="Remove">✕</a>`;
  }

  // If the sheet uses "x" in `note` as a remove marker, replace it visually with the overlay.
  if (isRemoveX(item?.note)) {
    const aid = item?.assetId ? String(item.assetId) : "";
    return `<button class="remove-overlay-btn" type="button" aria-label="Remove" data-asset-id="${escapeAttr(aid)}">✕</button>`;
  }

  return "";
}

function inferTags(item) {
  const tags = [];

  if (item && item.source) {
    const src = String(item.source).trim();
    if (src) tags.push(src);
  }

  if (Array.isArray(item.tags)) {
    item.tags.forEach(t => {
      if (t) tags.push(String(t).trim());
    });
  } else if (typeof item.tags === "string") {
    item.tags.split(",").forEach(t => {
      const v = t.trim();
      if (v) tags.push(v);
    });
  }

  if (tags.length === 0 && item.condition) {
    const cond = String(item.condition).toLowerCase();
    if (cond.includes("thrift")) tags.push("thrift");
    if (cond.includes("gently")) tags.push("gently used");
    if (cond.includes("retail")) tags.push("retail");
    if (cond === "new" || cond.includes(" new")) tags.push("new");
  }

  if (tags.length === 0 && item.condition) {
    const fallback = String(item.condition).trim();
    if (fallback) tags.push(fallback);
  }

  return [...new Set(tags)].filter(Boolean);
}

function renderTagPills(tags) {
  return (tags || [])
    .map(tag => `<span class="tag-pill">${tag}</span>`)
    .join("");
}

function populateFilters() {
  setupCustomFilters();

  const { brands, sources } = currentSectionFilterOptions();

  renderFilterOptions("brand", brands, "All Brands");
  renderFilterOptions("source", sources, "All Sources");
  setFilterTriggerLabel("brand", filterState.brand || "All Brands");
  setFilterTriggerLabel("source", filterState.source || "All Sources");
}

function resetFilters() {
  filterState.brand = "";
  filterState.source = "";
  closeAllFilterPanels();
  populateFilters();
  applyFilters();
}

function filteredItems(items) {
  const brandValue = getFilterValue("brand");
  const sourceValue = getFilterValue("source");

  return items.filter(item => {
    const brandMatch = !brandValue || item.brand === brandValue;
    const sourceMatch = !sourceValue || item.source === sourceValue;
    return brandMatch && sourceMatch;
  });
}

function renderSection(sectionName) {
  const items = filteredItems(appData[sectionName] || []);

  if (sectionName === "listed") {
    const listedGrid = document.getElementById("listed-grid");
    if (listedGrid) {
      listedGrid.innerHTML = items
        .filter(item => item.assetId)
        .map(item => `
          <div class="card product-card">
            ${renderRemoveOverlay(item)}
            <div class="product-image-wrap">
              <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
            </div>
            <div class="product-card-body">
              <div class="status-label">LISTED</div>
              <div class="brand-label">${item.brand || ""}</div>
              <div class="item-name">${item.name || ""}</div>
              <div class="item-tags">${renderSourceConditionPills(item)}</div>
              <p>${noteForDisplay(item.note)}</p>
              <div class="item-price">${formatPrice(item.price || "")}</div>
              <a href="${item.link || "#"}" target="_blank" class="buy-button">Buy</a>
            </div>
          </div>
        `)
        .join("");
    }
  }

  if (sectionName === "closet") {
    const closetGrid = document.getElementById("closet-grid");
    if (closetGrid) {
      closetGrid.innerHTML = items
        .filter(item => item.assetId)
        .map(item => `
          <div class="card product-card">
            ${renderRemoveOverlay(item)}
            <div class="product-image-wrap">
              <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
            </div>
            <div class="product-card-body">
              <div class="status-label">CLOSET</div>
              <div class="brand-label">${item.brand || ""}</div>
              <div class="item-name">${item.name || ""}</div>
              <div class="item-tags">${renderSourceConditionPills(item)}</div>
              <p>${noteForDisplay(item.note)}</p>
            </div>
          </div>
        `)
        .join("");
    }
  }

  if (sectionName === "sold") {
    const soldGrid = document.getElementById("sold-grid");
    if (soldGrid) {
      soldGrid.innerHTML = items
        .filter(item => item.assetId)
        .map(item => `
          <div class="card product-card">
            ${renderRemoveOverlay(item)}
            <div class="product-image-wrap">
              <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
            </div>
            <div class="product-card-body">
              <div class="status-label">SOLD</div>
              <div class="brand-label">${item.brand || ""}</div>
              <div class="item-name">${item.name || ""}</div>
              <div class="item-tags">${renderSourceConditionPills(item)}</div>
              <p>${noteForDisplay(item.note)}</p>
            </div>
            <div class="product-card-footer">
              <span class="sold-price">${formatPrice(item.soldPrice || "")}</span>
              <span class="sold-date">${formatSoldDate(item.soldDate || "")}</span>
            </div>
          </div>
        `)
        .join("");
    }
  }
}

function applyFilters() {
  renderSection(currentSection);
}

async function loadData() {
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();

    appData = {
      metrics: data.metrics || [],
      listed: data.listed || [],
      closet: data.closet || [],
      sold: data.sold || [],
      newsletters: data.newsletters || []
    };

    // Metrics dashboard (pull all keys from the metrics sheet)
    renderPortfolioDashboard(appData.metrics, data.monthlyPnL || data.monthly_pnl || data.monthly || []);

populateFilters();
currentSection = "closet";
renderSection("closet");
renderSection("listed");
renderSection("sold");

const newsletterHero = document.getElementById("newsletter-hero");
const newsletterPanels = document.getElementById("newsletter-panels");

if (appData.newsletters.length) {
  const item = appData.newsletters[0];

  if (newsletterHero) {
    newsletterHero.innerHTML = `
      <div class="newsletter-hero-copy">
        <div class="label">Newsletter</div>
        <h2>${item["newsletter title"] || ""}</h2>
        <p>${item["quick bio"] || ""}</p>
      </div>
      <div class="newsletter-actions">
        <a href="https://podacapital.substack.com/" target="_blank" rel="noreferrer" class="buy-button">Read / Subscribe</a>
      </div>
    `;
  }

  if (newsletterPanels) {
    newsletterPanels.innerHTML = `
      <div class="card note-panel">
        <div class="note-kicker">Latest Note</div>
        <div class="note-title">${item.title || ""}</div>
        <div class="note-description">${item["latest description"] || ""}</div>
        <div class="note-link-row">
          <a href="${item.link || "#"}" target="_blank" rel="noreferrer">Read Latest</a>
        </div>
      </div>

      <div class="card note-panel">
        <div class="note-kicker">Highlighted Note</div>
        <div class="note-title">${item["monthly highlight"] || ""}</div>
        <div class="note-description">${item["highlight description"] || ""}</div>
        <div class="note-link-row">
          <a href="${item["mh link"] || "#"}" target="_blank" rel="noreferrer">Read Highlight</a>
        </div>
      </div>
    `;
  }
}
  } catch (err) {
    console.error("loadData failed:", err);
  }
}

loadData();
