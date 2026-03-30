const DATA_URL = "https://script.google.com/macros/s/AKfycbx6SMI3W_XOV48mqxn87nJo1Dkcf9aOyAHMxreEIdXKBQWsojnNCOqtva_Kd0wt-T05oA/exec";

let appData = {
  metrics: [],
  listed: [],
  closet: [],
  sold: [],
  newsletters: []
};

let currentSection = "closet";

function imageFromAssetId(assetId) {
  if (!assetId) return "";
  return `images/${assetId}.jpg`;
}

function metricValue(metrics, key) {
  const row = metrics.find(item => item.key === key);
  return row ? row.value : "";
}

function populateFilters() {
  const brandFilter = document.getElementById("brandFilter");
  const categoryFilter = document.getElementById("categoryFilter");

  if (!brandFilter || !categoryFilter) return;

  const allItems = [...appData.listed, ...appData.closet, ...appData.sold];

  const brands = [...new Set(allItems.map(item => item.brand).filter(Boolean))].sort();
  const categories = [...new Set(allItems.map(item => item.category).filter(Boolean))].sort();

  brandFilter.innerHTML = `<option value="">All Brands</option>` +
    brands.map(brand => `<option value="${brand}">${brand}</option>`).join("");

  categoryFilter.innerHTML = `<option value="">All Categories</option>` +
    categories.map(category => `<option value="${category}">${category}</option>`).join("");
}

function filteredItems(items) {
  const brandValue = document.getElementById("brandFilter")?.value || "";
  const categoryValue = document.getElementById("categoryFilter")?.value || "";

  return items.filter(item => {
    const brandMatch = !brandValue || item.brand === brandValue;
    const categoryMatch = !categoryValue || item.category === categoryValue;
    return brandMatch && categoryMatch;
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
            <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
            <div class="label">Listed</div>
            <div class="item-brand">${item.brand || ""}</div>
            <h2>${item.name || ""}</h2>
            <div class="meta-row">
              <span class="meta-pill">${item.category || ""}</span>
              <span class="meta-pill">${item.condition || ""}</span>
            </div>
            <p>${item.note || ""}</p>
            <div class="item-price">${item.price || ""}</div>
            <a href="${item.link || "#"}" target="_blank" class="buy-button">Buy</a>
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
            <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
            <div class="label">Closet</div>
            <div class="item-brand">${item.brand || ""}</div>
            <h2>${item.name || ""}</h2>
            <div class="meta-row">
              <span class="meta-pill">${item.category || ""}</span>
              <span class="meta-pill">${item.condition || ""}</span>
            </div>
            <p>${item.note || ""}</p>
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
            <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
            <div class="label">Sold</div>
            <div class="item-brand">${item.brand || ""}</div>
            <h2>${item.name || ""}</h2>
            <div class="meta-row">
              <span class="meta-pill">${item.category || ""}</span>
              <span class="meta-pill">${item.condition || ""}</span>
            </div>
            <p>${item.note || ""}</p>
            <div class="sold-meta">
              <span>${item.soldPrice || ""}</span>
              <span>${item.soldDate || ""}</span>
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

    const capitalOnHand = document.getElementById("capitalOnHand");
    const inventoryCost = document.getElementById("inventoryCost");
    const netPnL = document.getElementById("netPnL");

    if (capitalOnHand) capitalOnHand.textContent = metricValue(appData.metrics, "capitalOnHand");
    if (inventoryCost) inventoryCost.textContent = metricValue(appData.metrics, "inventoryCost");
    if (netPnL) netPnL.textContent = metricValue(appData.metrics, "netPnL");

    populateFilters();
    renderSection("closet");

    const newsletterGrid = document.getElementById("newsletter-grid");
    if (newsletterGrid) {
      newsletterGrid.innerHTML = appData.newsletters
        .map(item => `
          <div class="card">
            <div class="label">Latest Note</div>
            <h2>${item.title || ""}</h2>
            <p>${item.description || ""}</p>
            <a href="${item.link || "#"}" target="_blank" class="buy-button">Read</a>
          </div>
        `)
        .join("");
    }
  } catch (err) {
    console.error("loadData failed:", err);
  }
}

loadData();
