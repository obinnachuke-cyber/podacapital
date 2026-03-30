const DATA_URL = "https://script.google.com/macros/s/AKfycbx6SMI3W_XOV48mqxn87nJo1Dkcf9aOyAHMxreEIdXKBQWsojnNCOqtva_Kd0wt-T05oA/exec";

function imageFromAssetId(assetId) {
  if (!assetId) return "";
  return `images/${assetId}.jpg`;
}

function metricValue(metrics, key) {
  const row = metrics.find(item => item.key === key);
  return row ? row.value : "";
}

async function loadData() {
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();

    const metrics = data.metrics || [];
    const listed = data.listed || [];
    const closet = data.closet || [];
    const sold = data.sold || [];
    const newsletters = data.newsletters || [];

    const capitalOnHand = document.getElementById("capitalOnHand");
    const inventoryCost = document.getElementById("inventoryCost");
    const netPnL = document.getElementById("netPnL");

    if (capitalOnHand) capitalOnHand.textContent = metricValue(metrics, "capitalOnHand");
    if (inventoryCost) inventoryCost.textContent = metricValue(metrics, "inventoryCost");
    if (netPnL) netPnL.textContent = metricValue(metrics, "netPnL");

const listedGrid = document.getElementById("listed-grid");
if (listedGrid) {
  listedGrid.innerHTML = listed
    .filter(item => item.assetId)
    .map(item => `
      <div class="card product-card">
        <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
        <div class="label">Listed</div>
        <div class="item-brand">${item.brand || ""}</div>
        <h2>${item.name || ""}</h2>
        <div class="meta-row">
          <span class="meta-pill">${item.source || ""}</span>
          <span class="meta-pill">${item.condition || ""}</span>
        </div>
        <p>${item.note || ""}</p>
        <div class="item-price">${item.price || ""}</div>
        <a href="${item.link || "#"}" target="_blank" class="buy-button">Buy</a>
      </div>
    `)
    .join("");
}

 const closetGrid = document.getElementById("closet-grid");
if (closetGrid) {
  closetGrid.innerHTML = closet
    .filter(item => item.assetId)
    .map(item => `
      <div class="card product-card">
        <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
        <div class="label">Closet</div>
        <div class="item-brand">${item.brand || ""}</div>
        <h2>${item.name || ""}</h2>
        <div class="meta-row">
          <span class="meta-pill">${item.source || ""}</span>
          <span class="meta-pill">${item.condition || ""}</span>
        </div>
        <p>${item.note || ""}</p>
      </div>
    `)
    .join("");
}

const soldGrid = document.getElementById("sold-grid");
if (soldGrid) {
  soldGrid.innerHTML = sold
    .filter(item => item.assetId)
    .map(item => `
      <div class="card product-card">
        <img src="${imageFromAssetId(item.assetId)}" class="product-image" alt="${item.name}">
        <div class="label">Sold</div>
        <div class="item-brand">${item.brand || ""}</div>
        <h2>${item.name || ""}</h2>
        <div class="meta-row">
          <span class="meta-pill">${item.source || ""}</span>
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

    const newsletterGrid = document.getElementById("newsletter-grid");
    if (newsletterGrid) {
      newsletterGrid.innerHTML = newsletters
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
