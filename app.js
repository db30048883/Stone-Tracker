const STORAGE_KEY = "stone-tracker.records.v2";
const PUBLIC_URL_KEY = "stone-tracker.public-url";

const form = document.getElementById("stone-form");
const rows = document.getElementById("stone-rows");
const publicUrlInput = document.getElementById("public-url");
const scanInput = document.getElementById("scan-input");
const scanResult = document.getElementById("scan-result");
const findStoneButton = document.getElementById("find-stone");

const fieldCard = document.getElementById("field-card");
const fieldStoneId = document.getElementById("field-stone-id");
const fieldWeight = document.getElementById("field-weight");
const fieldDate = document.getElementById("field-date");
const fieldIdCode = document.getElementById("field-id-code");

const qrDialog = document.getElementById("qr-dialog");
const qrImage = document.getElementById("qr-image");
const qrStoneId = document.getElementById("qr-stone-id");
const qrLink = document.getElementById("qr-link");
const printQrButton = document.getElementById("print-qr");
const closeDialogButton = document.getElementById("close-dialog");

const records = loadRecords();

publicUrlInput.value = localStorage.getItem(PUBLIC_URL_KEY) || `${window.location.origin}${window.location.pathname}`;
render();
lookupFromPageUrl();

publicUrlInput.addEventListener("change", () => {
  const normalized = normalizeBaseUrl(publicUrlInput.value);
  publicUrlInput.value = normalized;
  localStorage.setItem(PUBLIC_URL_KEY, normalized);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const weight = Number.parseFloat(document.getElementById("weight").value);
  const date = document.getElementById("date").value;
  if (Number.isNaN(weight) || !date) return;

  const stoneId = generateStoneId();

  const record = {
    stoneId,
    weight,
    date,
    createdAt: new Date().toISOString(),
  };

  records.unshift(record);
  persist();
  render();
  showQr(record);
  form.reset();
});

findStoneButton.addEventListener("click", () => {
  lookupStone(scanInput.value.trim());
});

printQrButton.addEventListener("click", () => window.print());
closeDialogButton.addEventListener("click", () => qrDialog.close());

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateStoneId() {
  return `STONE-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
}

function normalizeBaseUrl(urlValue) {
  const fallback = `${window.location.origin}${window.location.pathname}`;
  if (!urlValue || !urlValue.trim()) return fallback;

  try {
    const url = new URL(urlValue.trim());
    return `${url.origin}${url.pathname}`;
  } catch {
    return fallback;
  }
}

function buildStoneUrl(stoneId) {
  const base = normalizeBaseUrl(publicUrlInput.value);
  const url = new URL(base);
  url.searchParams.set("stone", stoneId);
  return url.toString();
}

function showQr(record) {
  const stoneUrl = buildStoneUrl(record.stoneId);
  const qrApiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(stoneUrl)}&size=300`;
  qrImage.src = qrApiUrl;
  qrStoneId.textContent = record.stoneId;
  qrLink.href = stoneUrl;
  qrLink.textContent = stoneUrl;
  qrDialog.showModal();
}

function lookupStone(inputValue) {
  const stoneId = extractStoneId(inputValue);
  if (!stoneId) {
    scanResult.textContent = "Paste a scanned QR URL or a STONE- ID.";
    hideFieldCard();
    return;
  }

  const found = records.find((record) => record.stoneId === stoneId);
  if (!found) {
    scanResult.textContent = `No record found for ${stoneId}.`;
    hideFieldCard();
    return;
  }

  scanResult.textContent = `Match found: ${found.stoneId}`;
  showFieldCard(found);
}

function extractStoneId(inputValue) {
  if (!inputValue) return "";
  const trimmed = inputValue.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("STONE-")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const fromQuery = parsed.searchParams.get("stone");
    return fromQuery ? fromQuery.trim() : "";
  } catch {
    return "";
  }
}

function lookupFromPageUrl() {
  const stone = new URL(window.location.href).searchParams.get("stone");
  if (!stone) return;
  scanInput.value = stone;
  lookupStone(stone);
}

function showFieldCard(record) {
  fieldStoneId.textContent = record.stoneId;
  fieldWeight.textContent = `${record.weight.toFixed(2)} tons`;
  fieldDate.textContent = record.date;
  fieldIdCode.textContent = record.stoneId;
  fieldCard.classList.remove("hidden");
}

function hideFieldCard() {
  fieldCard.classList.add("hidden");
}

function render() {
  rows.innerHTML = "";

  for (const record of records) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${record.stoneId}</code></td>
      <td>${record.weight.toFixed(2)}</td>
      <td>${record.date}</td>
      <td class="actions">
        <button type="button" data-action="qr">QR</button>
        <button type="button" data-action="lookup" class="secondary">Lookup</button>
      </td>
    `;

    tr.querySelector('[data-action="qr"]').addEventListener("click", () => showQr(record));
    tr.querySelector('[data-action="lookup"]').addEventListener("click", () => {
      scanInput.value = record.stoneId;
      lookupStone(record.stoneId);
    });

    rows.appendChild(tr);
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
