const SHEET_ID = "18mzjxPhh-6GBEhTiaONdKWVrddXvOosUzj7fY7PArFg";

const endpoints = {
  metrics: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=metrics`,
  listed: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=listed`,
  closet: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=closet`,
  sold: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=sold`,
  newsletters: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=newsletters`
};

async function fetchCSV(url) {
  const res = await fetch(url);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r => r.split(","));
  const headers = rows[0].map(h => h.trim());

  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i]?.trim() || "";
    });
    return obj;
  });
}

function imageFromAssetId(assetId) {
  if (!assetId) return "";
  return `images/${assetId}.jpg`;
}

async function loadData() {
  const [metrics, listed, closet, sold, newsletters] = await Promise.all([
    fetchCSV(endpoints.metrics),
    fetchCSV(endpoints.listed),
    fetchCSV(endpoints.closet),
    fetchCSV(endpoints.sold),
    fetchCSV(endpoints.newsletters)
  ]);

  const metricMap = {};
  metrics.forEach(m => {
    metricMap[m.key] = m.value;
  });

  document.getElementById("capitalOnHand").textContent = metricMap.capitalOnHand || "";
  document.getElementById("inventoryCost").textContent = metricMap.inventoryCost || "";
  document.getElementById("netPnL").textContent = metricMap.netPnL || "";

  document.getElementById("listed-grid").innerHTML = listed.map(item => `
    <div class="card">
      <img src="${imageFromAssetId(item.assetId)}" class="product-image">
      <div class="label">Listed</div>
      <div class="item-brand">${item.brand}</div>
      <h2>${item.name}</h2>
      <p>${item.note}</p>
      <div class="item-price">${item.price}</div>
      <a href="${item.link}" target="_blank" class="buy-button">Buy</a>
    </div>
  `).join("");

  document.getElementById("closet-grid").innerHTML = closet.map(item => `
    <div class="card">
      <img src="${imageFromAssetId(item.assetId)}" class="product-image">
      <div class="label">Closet</div>
      <div class="item-brand">${item.brand}</div>
      <h2>${item.name}</h2>
      <p>${item.note}</p>
    </div>
  `).join("");

  document.getElementById("sold-grid").innerHTML = sold.map(item => `
    <div class="card">
      <img src="${imageFromAssetId(item.assetId)}" class="product-image">
      <div class="label">Sold</div>
      <div class="item-brand">${item.brand}</div>
      <h2>${item.name}</h2>
      <p>${item.note}</p>
    </div>
  `).join("");

  document.getElementById("newsletter-grid").innerHTML = newsletters.map(n => `
    <div class="card">
      <div class="label">Newsletter</div>
      <h2>${n.title}</h2>
      <p>${n.description}</p>
      <a href="${n.link}" target="_blank" class="buy-button">Read</a>
    </div>
  `).join("");
}

loadData();
