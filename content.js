(() => {
  "use strict";

  const { storageKey } = globalThis.DeepSeekSearchToggle;
  const MAX_ATTEMPTS = 100;
  const POLL_INTERVAL_MS = 200;
  const SEARCH_LABEL_PATTERN =
    /\b(web\s*)?search\b|联网搜索|网络搜索|網路搜尋|網絡搜尋|搜索/i;
  const SELECTED_CLASS_PATTERN =
    /(^|[\s_-])(?:selected|active|checked|pressed|enabled|on)(?:$|[\s_-])/i;
  const SELECTED_STATE_VALUES = new Set([
    "active",
    "checked",
    "on",
    "pressed",
    "selected",
    "true",
  ]);

  let observer = null;
  let scheduled = false;

  function normalize(value) {
    return String(value || "").trim();
  }

  function getClassText(el) {
    if (typeof el.className === "string") return el.className;
    return normalize(el.getAttribute?.("class"));
  }

  function getSearchText(el) {
    return [
      el.textContent,
      el.getAttribute?.("aria-label"),
      el.getAttribute?.("title"),
      el.getAttribute?.("data-testid"),
      el.getAttribute?.("data-test-id"),
      el.getAttribute?.("data-ds-component"),
      getClassText(el),
    ]
      .map(normalize)
      .filter(Boolean)
      .join(" ");
  }

  function isProbablyVisible(el) {
    if (!el.isConnected) return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect) return true;
    return rect.width > 0 && rect.height > 0;
  }

  function isSearchControl(el) {
    return SEARCH_LABEL_PATTERN.test(getSearchText(el));
  }

  function clickableAncestor(el) {
    return el.closest?.(
      'button,[role="button"],[aria-pressed],[aria-checked],[data-state],.ds-toggle-button'
    );
  }

  function findSearchToggle() {
    const candidates = document.querySelectorAll(
      [
        "button",
        '[role="button"]',
        "[aria-pressed]",
        "[aria-checked]",
        "[data-state]",
        ".ds-toggle-button",
        '[aria-label*="search" i]',
        '[title*="search" i]',
        '[data-testid*="search" i]',
      ].join(",")
    );

    for (const el of candidates) {
      if (isProbablyVisible(el) && isSearchControl(el)) {
        return clickableAncestor(el) || el;
      }
    }

    return null;
  }

  function isSelected(el) {
    const selectedValues = [
      el.getAttribute?.("aria-pressed"),
      el.getAttribute?.("aria-checked"),
      el.getAttribute?.("aria-selected"),
      el.getAttribute?.("data-state"),
      el.getAttribute?.("data-selected"),
      el.getAttribute?.("data-active"),
      el.getAttribute?.("data-checked"),
      el.getAttribute?.("data-enabled"),
    ];

    if (
      selectedValues.some((value) =>
        SELECTED_STATE_VALUES.has(normalize(value).toLowerCase())
      )
    ) {
      return true;
    }

    return (
      el.classList?.contains("ds-toggle-button--selected") ||
      SELECTED_CLASS_PATTERN.test(getClassText(el))
    );
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

  function scheduleDisable() {
    if (scheduled) return;
    scheduled = true;

    const run = () => {
      scheduled = false;
      tryDisable();
    };

    if (globalThis.requestAnimationFrame) {
      globalThis.requestAnimationFrame(run);
    } else {
      globalThis.setTimeout(run, 0);
    }
  }

  function observeChanges() {
    if (observer || !document.body || !globalThis.MutationObserver) return;

    observer = new MutationObserver(scheduleDisable);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
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
    observeChanges();
    document.addEventListener("visibilitychange", scheduleDisable);
    globalThis.addEventListener?.("focus", scheduleDisable);
  }

  globalThis.DeepSeekSearchToggleRuntime = Object.freeze({
    findSearchToggle,
    isSearchControl,
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
