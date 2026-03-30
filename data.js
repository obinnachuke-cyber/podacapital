const SHEET_ID = "18mzjxPhh-6GBEhTiaONdKWVrddXvOosUzj7fY7PArFg";

const endpoints = {
  metrics: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=metrics`,
  listed: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=listed`,
  closet: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=closet`,
  sold: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=sold`,
  newsletters: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=newsletters`
};

function normalizeHeader(header) {
  return header
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(cell => cell.replace(/\r/g, "").trim());
}

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);

  const text = await res.text();
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");

  if (lines.length === 0) return [];

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};

    headers.forEach((header, i) => {
      obj[header] = values[i] || "";
    });

    return obj;
  });
}

function imageFromAssetId(assetId) {
  if (!assetId) return "";
  return `images/${assetId}.jpg`;
}

async function loadData() {
  try {
    const [metrics, listed, closet, sold, newsletters] = await Promise.all([
      fetchCSV(endpoints.metrics),
      fetchCSV(endpoints.listed),
      fetchCSV(endpoints.closet),
      fetchCSV(endpoints.sold),
      fetchCSV(endpoints.newsletters)
    ]);

    const metricMap = {};
    metrics.forEach(row => {
      if (row.key) metricMap[row.key] = row.value;
    });

    const capitalOnHand = document.getElementById("capitalOnHand");
    const inventoryCost = document.getElementById("inventoryCost");
    const netPnL = document.getElementById("netPnL");

    if (capitalOnHand) capitalOnHand.textContent = metricMap.capitalonhand || metricMap.capitalOnHand || "";
    if (inventoryCost) inventoryCost.textContent = metricMap.inventorycost || metricMap.inventoryCost || "";
    if (netPnL) netPnL.textContent = metricMap.netpnl || metricMap.netPnL || "";

    const listedGrid = document.getElementById("listed-grid");
    if (listedGrid) {
      listedGrid.innerHTML = listed
        .filter(item => item.assetid)
        .map(item => `
          <div class="card">
            <img src="${imageFromAssetId(item.assetid)}" class="product-image" alt="${item.name}">
            <div class="label">Listed</div>
            <div class="item-brand">${item.brand || ""}</div>
            <h2>${item.name || ""}</h2>
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
        .filter(item => item.assetid)
        .map(item => `
          <div class="card">
            <img src="${imageFromAssetId(item.assetid)}" class="product-image" alt="${item.name}">
            <div class="label">Closet</div>
            <div class="item-brand">${item.brand || ""}</div>
            <h2>${item.name || ""}</h2>
            <p>${item.note || ""}</p>
          </div>
        `)
        .join("");
    }

    const soldGrid = document.getElementById("sold-grid");
    if (soldGrid) {
      soldGrid.innerHTML = sold
        .filter(item => item.assetid)
        .map(item => `
          <div class="card">
            <img src="${imageFromAssetId(item.assetid)}" class="product-image" alt="${item.name}">
            <div class="label">Sold</div>
            <div class="item-brand">${item.brand || ""}</div>
            <h2>${item.name || ""}</h2>
            <p>${item.note || ""}</p>
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
  } catch (error) {
    console.error("loadData error:", error);
  }
}

loadData();
