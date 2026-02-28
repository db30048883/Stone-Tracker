const STORAGE_KEY = "stone-tracker.records.v1";
const statusNode = document.getElementById("status");
const startOverButton = document.getElementById("start-over");

startOverButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  statusNode.textContent = "Reset confirmed. Local stone records cleared.";
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
