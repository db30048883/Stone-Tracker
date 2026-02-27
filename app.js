const STORAGE_KEY = "stone-tracker.records.v1";

const form = document.getElementById("stone-form");
const rows = document.getElementById("stone-rows");
const scanInput = document.getElementById("scan-input");
const scanResult = document.getElementById("scan-result");
const findStoneButton = document.getElementById("find-stone");
const startNfcReadButton = document.getElementById("start-nfc-read");
const qrDialog = document.getElementById("qr-dialog");
const qrLink = document.getElementById("qr-link");
const qrImage = document.getElementById("qr-image");
const qrRawCode = document.getElementById("qr-raw-code");
const closeDialog = document.getElementById("close-dialog");
const fieldResultCard = document.getElementById("field-result-card");
const fieldStoneId = document.getElementById("field-stone-id");
const fieldStoneWeight = document.getElementById("field-stone-weight");
const fieldStoneDate = document.getElementById("field-stone-date");
const fieldStoneTag = document.getElementById("field-stone-tag");

const records = loadRecords();
render();
lookupFromPageUrl();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const stoneId = document.getElementById("stone-id").value.trim();
  const weight = Number.parseFloat(document.getElementById("weight").value);
  const date = document.getElementById("date").value;

  if (!stoneId || Number.isNaN(weight) || !date) return;

  const uid = crypto.randomUUID();
  const tagCode = `STONE-${uid}`;

  records.unshift({
    uid,
    stoneId,
    weight,
    date,
    tagCode,
    createdAt: new Date().toISOString(),
  });

  persist();
  render();
  form.reset();
});

findStoneButton.addEventListener("click", () => {
  lookupStone(scanInput.value.trim());
});

startNfcReadButton.addEventListener("click", async () => {
  if (!("NDEFReader" in window)) {
    scanResult.textContent = "NFC reading is not supported on this device/browser.";
    clearFieldCard();
    return;
  }

  const ndef = new NDEFReader();
  await ndef.scan();
  scanResult.textContent = "Waiting for NFC tag...";

  ndef.onreading = (event) => {
    const decoder = new TextDecoder();
    for (const record of event.message.records) {
      const scannedCode = decoder.decode(record.data);
      scanInput.value = scannedCode;
      lookupStone(scannedCode);
      return;
    }
  };
});

closeDialog.addEventListener("click", () => qrDialog.close());

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

function lookupStone(code) {
  const normalized = normalizeTagFromInput(code);

  if (!normalized) {
    scanResult.textContent = "Scan or paste a tag code first.";
    clearFieldCard();
    return;
  }

  const found = records.find((record) => record.tagCode === normalized);

  if (!found) {
    scanResult.textContent = "No stone found for that code.";
    clearFieldCard();
    return;
  }

  scanResult.textContent = `Match: ${found.stoneId} | ${found.weight}kg | ${found.date}`;
  showFieldCard(found);
}

function showFieldCard(record) {
  fieldStoneId.textContent = record.stoneId;
  fieldStoneWeight.textContent = `${record.weight.toFixed(2)} kg`;
  fieldStoneDate.textContent = record.date;
  fieldStoneTag.textContent = record.tagCode;
  fieldResultCard.classList.remove("hidden");
}

function clearFieldCard() {
  fieldStoneId.textContent = "No stone selected";
  fieldStoneWeight.textContent = "-";
  fieldStoneDate.textContent = "-";
  fieldStoneTag.textContent = "-";
  fieldResultCard.classList.add("hidden");
}

function buildLookupUrl(tagCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("tag", tagCode);
  return url.toString();
}

function normalizeTagFromInput(value) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("STONE-")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const tag = parsed.searchParams.get("tag");
    return tag ? tag.trim() : trimmed;
  } catch {
    return trimmed;
  }
}

function lookupFromPageUrl() {
  const tagFromUrl = new URL(window.location.href).searchParams.get("tag");
  if (!tagFromUrl) return;

  scanInput.value = tagFromUrl;
  lookupStone(tagFromUrl);
}

function openQrLabel(code) {
  const lookupUrl = buildLookupUrl(code);
  const qrApiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(lookupUrl)}&size=300`;
  qrImage.src = qrApiUrl;
  qrImage.alt = `QR for ${code}`;
  qrLink.href = lookupUrl;
  qrLink.textContent = lookupUrl;
  qrRawCode.textContent = code;
  qrDialog.showModal();
}

async function writeNfcTag(code) {
  if (!("NDEFReader" in window)) {
    alert("NFC writing is not supported on this device/browser.");
    return;
  }

  const ndef = new NDEFReader();
  await ndef.write(code);
  alert(`NFC tag written with code: ${code}`);
}

function render() {
  rows.innerHTML = "";

  for (const record of records) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${record.stoneId}</td>
      <td>${record.weight.toFixed(2)} kg</td>
      <td>${record.date}</td>
      <td><code>${record.tagCode}</code></td>
      <td class="actions">
        <button type="button" data-action="qr" data-code="${record.tagCode}">QR</button>
        <button type="button" data-action="nfc" data-code="${record.tagCode}" class="secondary">Write NFC</button>
      </td>
    `;

    tr.querySelector('[data-action="qr"]').addEventListener("click", () => openQrLabel(record.tagCode));
    tr.querySelector('[data-action="nfc"]').addEventListener("click", () => {
      writeNfcTag(record.tagCode);
    });

    rows.appendChild(tr);
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
