(() => {
  "use strict";

  const STORAGE_KEY = "autoDisableSearchEnabled";
  const MAX_ATTEMPTS = 50;        // poll up to ~10 seconds
  const POLL_INTERVAL_MS = 200;

  /**
   * Find the Search toggle: a div[role="button"] whose class contains
   * "ds-toggle-button" and whose text includes "Search".
   */
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

  /** Return true when the toggle carries the "--selected" modifier class. */
  function isSelected(el) {
    return el.classList.contains("ds-toggle-button--selected");
  }

  /**
   * If Search is selected, click it once and return true.
   * Otherwise return false (nothing to do).
   */
  function tryDisable() {
    const toggle = findSearchToggle();
    if (!toggle) return null;          // not rendered yet
    if (!isSelected(toggle)) return false; // already off
    toggle.click();
    return true;                       // clicked
  }

  /** Simple polling loop – clicks once then stops. */
  function poll() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const result = tryDisable();
      // Stop if we clicked it off, or it was already off, or we exhausted attempts
      if (result !== null || attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
      }
    }, POLL_INTERVAL_MS);
  }

  /** Check chrome.storage for the user's popup toggle (default: enabled). */
  function isFeatureEnabled() {
    return new Promise((resolve) => {
      if (!chrome?.storage?.sync) { resolve(true); return; }
      chrome.storage.sync.get({ [STORAGE_KEY]: true }, (r) => {
        resolve(chrome.runtime.lastError ? true : Boolean(r[STORAGE_KEY]));
      });
    });
  }

  async function main() {
    if (!(await isFeatureEnabled())) return;
    poll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main, { once: true });
  } else {
    main();
  }
})();
