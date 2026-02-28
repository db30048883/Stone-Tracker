const STORAGE_KEY = "stone-tracker.records.v3";
const PUBLIC_URL_KEY = "stone-tracker.public-url";
const API_ENDPOINT = "/api/stones";

const form = document.getElementById("stone-form");
const rows = document.getElementById("stone-rows");
const publicUrlInput = document.getElementById("public-url");
const scanInput = document.getElementById("scan-input");
const scanResult = document.getElementById("scan-result");
const findStoneButton = document.getElementById("find-stone");
const cloudStatus = document.getElementById("cloud-status");
const syncCloudButton = document.getElementById("sync-cloud");

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
initializeCloud();

publicUrlInput.addEventListener("change", () => {
  const normalized = normalizeBaseUrl(publicUrlInput.value);
  publicUrlInput.value = normalized;
  localStorage.setItem(PUBLIC_URL_KEY, normalized);
});

syncCloudButton.addEventListener("click", async () => {
  const result = await syncFromCloud();
  if (!result.ok) {
    setCloudStatus(`Cloud unavailable: ${result.reason}.`, true);
  }
});

form.addEventListener("submit", async (event) => {
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

  try {
    await saveToCloud(record);
    setCloudStatus("Cloud connected. Stone saved online.");
  } catch (error) {
    setCloudStatus(`Saved on this device only. Cloud save failed: ${error?.message || "unknown error"}.`, true);
  }
});

findStoneButton.addEventListener("click", async () => {
  await lookupStone(scanInput.value.trim());
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
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `STONE-${window.crypto.randomUUID().split("-")[0].toUpperCase()}`;
  }

  const fallback = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  return `STONE-${fallback}`;
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
  if (typeof qrDialog.showModal === "function") {
    qrDialog.showModal();
    return;
  }

  window.open(stoneUrl, "_blank", "noopener");
}

async function lookupStone(inputValue) {
  const stoneId = extractStoneId(inputValue);
  if (!stoneId) {
    scanResult.textContent = "Paste a scanned QR URL or a STONE- ID.";
    hideFieldCard();
    return;
  }

  let found = records.find((record) => record.stoneId === stoneId);
  if (!found) {
    found = await fetchStoneFromCloud(stoneId);
    if (found) {
      mergeRecord(found);
      persist();
      render();
    }
  }

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
  fieldWeight.textContent = `${Number(record.weight).toFixed(2)} tons`;
  fieldDate.textContent = record.date;
  fieldIdCode.textContent = record.stoneId;
  fieldCard.classList.remove("hidden");
}

function hideFieldCard() {
  fieldCard.classList.add("hidden");
}

function mergeRecord(record) {
  const existingIndex = records.findIndex((entry) => entry.stoneId === record.stoneId);
  if (existingIndex === -1) {
    records.unshift(record);
    return;
  }

  records[existingIndex] = record;
}

function render() {
  rows.innerHTML = "";

  for (const record of records) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${record.stoneId}</code></td>
      <td>${Number(record.weight).toFixed(2)}</td>
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

async function initializeCloud() {
  setCloudStatus("Checking cloud connection...");
  const result = await syncFromCloud();
  if (!result.ok) {
    setCloudStatus(`Cloud unavailable: ${result.reason}. App still works locally on this device.`, true);
  }
}

async function syncFromCloud() {
  try {
    const response = await fetch(API_ENDPOINT, { method: "GET" });
    if (!response.ok) {
      const reason = await extractApiError(response);
      return { ok: false, reason };
    }

    const payload = await response.json();
    const cloudRecords = Array.isArray(payload.records) ? payload.records : [];

    for (const record of cloudRecords) {
      mergeRecord(record);
    }

    persist();
    render();
    setCloudStatus(`Cloud connected. ${cloudRecords.length} records synced.`);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || "network error" };
  }
}

async function saveToCloud(record) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const reason = await extractApiError(response);
    throw new Error(reason);
  }
}

async function fetchStoneFromCloud(stoneId) {
  try {
    const url = new URL(API_ENDPOINT, window.location.origin);
    url.searchParams.set("stoneId", stoneId);
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) return null;

    const payload = await response.json();
    return payload.record || null;
  } catch {
    return null;
  }
}


async function extractApiError(response) {
  const statusLabel = `HTTP ${response.status}`;

  try {
    const data = await response.json();
    if (data && typeof data.error === "string" && data.error.trim()) {
      return `${statusLabel} - ${data.error}`;
    }
  } catch {
    // ignore json parsing errors
  }

  return statusLabel;
}
function setCloudStatus(message, isWarning = false) {
  cloudStatus.textContent = message;
  cloudStatus.classList.toggle("warning", isWarning);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
