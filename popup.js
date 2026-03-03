const STORAGE_KEY = "autoDisableSearchEnabled";

const enabledInput = document.getElementById("enabled");
const statusElement = document.getElementById("status");

function setStatus(text) {
  statusElement.textContent = text;
}

function loadState() {
  chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
    if (chrome.runtime.lastError) {
      enabledInput.checked = true;
      setStatus("Failed to load setting. Using enabled.");
      return;
    }

    const isEnabled = Boolean(result[STORAGE_KEY]);
    enabledInput.checked = isEnabled;
    setStatus(isEnabled ? "Enabled" : "Disabled");
  });
}

enabledInput.addEventListener("change", () => {
  const isEnabled = enabledInput.checked;
  chrome.storage.sync.set({ [STORAGE_KEY]: isEnabled }, () => {
    if (chrome.runtime.lastError) {
      setStatus("Failed to save setting.");
      return;
    }
    setStatus(isEnabled ? "Enabled" : "Disabled");
  });
});

loadState();
