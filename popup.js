const { storageKey } = globalThis.DeepSeekSearchToggle;

const enabledInput = document.getElementById("enabled");
const statusElement = document.getElementById("status");

function setStatus(text) {
  statusElement.textContent = text;
}

function loadState() {
  chrome.storage.sync.get({ [storageKey]: true }, (result) => {
    if (chrome.runtime.lastError) {
      enabledInput.checked = false;
      setStatus("Failed to load setting. Leaving disabled.");
      return;
    }

    const isEnabled = Boolean(result[storageKey]);
    enabledInput.checked = isEnabled;
    setStatus(isEnabled ? "Enabled" : "Disabled");
  });
}

enabledInput.addEventListener("change", () => {
  const isEnabled = enabledInput.checked;
  chrome.storage.sync.set({ [storageKey]: isEnabled }, () => {
    if (chrome.runtime.lastError) {
      setStatus("Failed to save setting.");
      return;
    }
    setStatus(isEnabled ? "Enabled" : "Disabled");
  });
});

loadState();
