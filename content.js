(() => {
  "use strict";

  const { storageKey } = globalThis.DeepSeekSearchToggle;
  const MAX_ATTEMPTS = 50;
  const POLL_INTERVAL_MS = 200;

  function findSearchToggle() {
    const candidates = document.querySelectorAll(
      '.ds-toggle-button[role="button"]'
    );
    for (const el of candidates) {
      if (el.textContent.trim().toLowerCase().includes("search")) {
        return el;
      }
    }
    return null;
  }

  function isSelected(el) {
    return el.classList.contains("ds-toggle-button--selected");
  }

  function tryDisable() {
    const toggle = findSearchToggle();
    if (!toggle) return null;
    if (!isSelected(toggle)) return false;
    toggle.click();
    return true;
  }

  function poll() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const result = tryDisable();
      if (result !== null || attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
      }
    }, POLL_INTERVAL_MS);
  }

  function isFeatureEnabled() {
    return new Promise((resolve) => {
      if (!chrome?.storage?.sync) {
        resolve(false);
        return;
      }

      chrome.storage.sync.get({ [storageKey]: true }, (result) => {
        resolve(chrome.runtime.lastError ? false : Boolean(result[storageKey]));
      });
    });
  }

  async function main() {
    if (!(await isFeatureEnabled())) return;
    poll();
  }

  globalThis.DeepSeekSearchToggleRuntime = Object.freeze({
    findSearchToggle,
    isFeatureEnabled,
    isSelected,
    tryDisable,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main, { once: true });
  } else {
    main();
  }
})();
