const STORAGE_KEY = "stone-tracker.records.v1";

const form = document.getElementById("stone-form");
const rows = document.getElementById("stone-rows");
const scanInput = document.getElementById("scan-input");
const scanResult = document.getElementById("scan-result");
const findStoneButton = document.getElementById("find-stone");
const startNfcReadButton = document.getElementById("start-nfc-read");
const syncNowButton = document.getElementById("sync-now");
const cloudStatus = document.getElementById("cloud-status");
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

const config = window.STONE_TRACKER_CONFIG || {};
const supabaseClient = initSupabaseClient();

const records = loadRecords();
render();
lookupFromPageUrl();
updateCloudStatus();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const stoneId = document.getElementById("stone-id").value.trim();
  const weight = Number.parseFloat(document.getElementById("weight").value);
  const date = document.getElementById("date").value;

  if (!stoneId || Number.isNaN(weight) || !date) return;

  const uid = crypto.randomUUID();
  const tagCode = `STONE-${uid}`;

  const newRecord = {
  records.unshift({
    uid,
    stoneId,
    weight,
    date,
    tagCode,
    createdAt: new Date().toISOString(),
  };

  upsertLocalRecord(newRecord);
  render();
  form.reset();

  if (supabaseClient) {
    const { error } = await supabaseClient.from("stones").upsert([toCloudRecord(newRecord)], { onConflict: "tag_code" });
    if (error) {
      cloudStatus.textContent = `Saved locally. Cloud save failed: ${error.message}`;
      return;
    }
    cloudStatus.textContent = "Saved locally + synced to cloud.";
  }
  });

  persist();
  render();
  form.reset();
});

findStoneButton.addEventListener("click", () => {
  lookupStone(scanInput.value.trim());
});

syncNowButton.addEventListener("click", async () => {
  await syncFromCloud();
});

startNfcReadButton.addEventListener("click", async () => {
  if (!("NDEFReader" in window)) {
    scanResult.textContent = "NFC reading is not supported on this device/browser.";
    clearFieldCard();
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

function initSupabaseClient() {
  const hasConfig = config.SUPABASE_URL && config.SUPABASE_ANON_KEY;
  if (!hasConfig || !window.supabase) return null;
  return window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
}

function updateCloudStatus() {
  if (!supabaseClient) {
    cloudStatus.textContent = "Cloud sync disabled (using offline local mode).";
    syncNowButton.disabled = true;
    return;
  }
  cloudStatus.textContent = "Cloud sync enabled.";
}

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

function upsertLocalRecord(record) {
  const existingIndex = records.findIndex((item) => item.tagCode === record.tagCode);
  if (existingIndex >= 0) {
    records[existingIndex] = { ...records[existingIndex], ...record };
  } else {
    records.unshift(record);
  }
  persist();
}

function toCloudRecord(record) {
  return {
    tag_code: record.tagCode,
    stone_id: record.stoneId,
    weight_tons_imperial: record.weight,
    date: record.date,
    created_at: record.createdAt,
  };
}

function fromCloudRecord(record) {
  return {
    uid: record.tag_code.replace("STONE-", "") || crypto.randomUUID(),
    stoneId: record.stone_id,
    weight: Number.parseFloat(record.weight_tons_imperial),
    date: record.date,
    tagCode: record.tag_code,
    createdAt: record.created_at || new Date().toISOString(),
  };
}

async function syncFromCloud() {
  if (!supabaseClient) return;

  cloudStatus.textContent = "Syncing from cloud...";
  const { data, error } = await supabaseClient.from("stones").select("tag_code,stone_id,weight_tons_imperial,date,created_at").order("created_at", { ascending: false });
  if (error) {
    cloudStatus.textContent = `Sync failed: ${error.message}`;
    return;
  }

  for (const cloudRecord of data) {
    upsertLocalRecord(fromCloudRecord(cloudRecord));
  }

  render();
  cloudStatus.textContent = `Sync complete (${data.length} records loaded).`;
}

async function lookupStone(code) {
  const normalized = normalizeTagFromInput(code);

  if (!normalized) {
    scanResult.textContent = "Scan or paste a tag code first.";
    clearFieldCard();
    return;
  }

  let found = records.find((record) => record.tagCode === normalized);

  if (!found && supabaseClient) {
    const { data, error } = await supabaseClient
      .from("stones")
      .select("tag_code,stone_id,weight_tons_imperial,date,created_at")
      .eq("tag_code", normalized)
      .maybeSingle();

    if (!error && data) {
      found = fromCloudRecord(data);
      upsertLocalRecord(found);
      render();
    }
  }

  if (!found) {
    scanResult.textContent = "No stone found for that code.";
    clearFieldCard();
    return;
  }

  scanResult.textContent = `Match: ${found.stoneId} | ${found.weight} tons (imperial) | ${found.date}`;
  showFieldCard(found);
}

function showFieldCard(record) {
  fieldStoneId.textContent = record.stoneId;
  fieldStoneWeight.textContent = `${Number(record.weight).toFixed(2)} tons (imperial)`;
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
  const base = config.PUBLIC_APP_URL || window.location.origin + window.location.pathname;
  const url = new URL(base);
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
      <td>${Number(record.weight).toFixed(2)} tons (imperial)</td>
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
