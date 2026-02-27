const STORAGE_KEY = "stone-tracker.records.v1";

const form = document.getElementById("stone-form");
const rows = document.getElementById("stone-rows");
const scanInput = document.getElementById("scan-input");
const scanResult = document.getElementById("scan-result");
const findStoneButton = document.getElementById("find-stone");
const startNfcReadButton = document.getElementById("start-nfc-read");
const qrDialog = document.getElementById("qr-dialog");
const qrLink = document.getElementById("qr-link");
const closeDialog = document.getElementById("close-dialog");

const records = loadRecords();
render();

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
  const found = records.find((record) => record.tagCode === code);
  scanResult.textContent = found
    ? `Match: ${found.stoneId} | ${found.weight}kg | ${found.date}`
    : "No stone found for that code.";
}

function openQrLabel(code) {
  const qrApiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(code)}&size=300`;
  qrLink.href = qrApiUrl;
  qrLink.textContent = qrApiUrl;
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
