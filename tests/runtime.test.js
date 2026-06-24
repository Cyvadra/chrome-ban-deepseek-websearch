const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class ToggleElement {
  constructor(text, classNames = [], attributes = {}) {
    this.textContent = text;
    this.clickCount = 0;
    this.isConnected = true;
    this.attributes = attributes;
    this.className = classNames.join(" ");
    this.classList = {
      contains: (className) => classNames.includes(className),
    };
  }

  closest() {
    return this;
  }

  getAttribute(name) {
    if (name === "class") return this.className;
    return this.attributes[name] ?? null;
  }

  getBoundingClientRect() {
    return { width: 100, height: 32 };
  }

  click() {
    this.clickCount += 1;
  }
}

function loadRuntime({ elements = [], storageError = null, storageValue = true } = {}) {
  const listeners = new Map();
  const globalListeners = new Map();
  let mutationObserverCreations = 0;
  const context = {
    clearInterval,
    console,
    MutationObserver: class {
      constructor() {
        mutationObserverCreations += 1;
      }

      observe() {}
    },
    document: {
      body: {},
      readyState: "loading",
      addEventListener: (eventName, handler) => listeners.set(eventName, handler),
      querySelectorAll: () => elements,
    },
    requestAnimationFrame: (callback) => callback(),
    setInterval,
    setTimeout,
    addEventListener: (eventName, handler) => globalListeners.set(eventName, handler),
    chrome: {
      runtime: { lastError: storageError },
      storage: {
        sync: {
          get(defaults, callback) {
            const storageKey = Object.keys(defaults)[0];
            callback({ [storageKey]: storageValue });
          },
        },
      },
    },
  };
  context.globalThis = context;

  const rootDir = path.join(__dirname, "..");
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "constants.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "content.js"), "utf8"), context);

  context.__listeners = listeners;
  context.__globalListeners = globalListeners;
  context.__mutationObserverCreations = () => mutationObserverCreations;

  return context;
}

async function run() {
  const selectedToggle = new ToggleElement("Search", [
    "ds-toggle-button--selected",
  ]);
  let context = loadRuntime({ elements: [selectedToggle] });
  assert.equal(context.DeepSeekSearchToggleRuntime.tryDisable(), true);
  assert.equal(selectedToggle.clickCount, 1);

  const unselectedToggle = new ToggleElement("Search");
  context = loadRuntime({ elements: [unselectedToggle] });
  assert.equal(context.DeepSeekSearchToggleRuntime.tryDisable(), false);
  assert.equal(unselectedToggle.clickCount, 0);

  const ariaSelectedToggle = new ToggleElement("", [], {
    "aria-label": "Search",
    "aria-pressed": "true",
  });
  context = loadRuntime({ elements: [ariaSelectedToggle] });
  assert.equal(context.DeepSeekSearchToggleRuntime.tryDisable(), true);
  assert.equal(ariaSelectedToggle.clickCount, 1);

  const dataStateSelectedToggle = new ToggleElement("联网搜索", [], {
    "data-state": "checked",
  });
  context = loadRuntime({ elements: [dataStateSelectedToggle] });
  assert.equal(context.DeepSeekSearchToggleRuntime.tryDisable(), true);
  assert.equal(dataStateSelectedToggle.clickCount, 1);

  const inactiveChineseToggle = new ToggleElement("网络搜索", [], {
    "aria-pressed": "false",
  });
  context = loadRuntime({ elements: [inactiveChineseToggle] });
  assert.equal(context.DeepSeekSearchToggleRuntime.tryDisable(), false);
  assert.equal(inactiveChineseToggle.clickCount, 0);

  const uploadToggle = new ToggleElement("Upload");
  context = loadRuntime({ elements: [uploadToggle] });
  assert.equal(context.DeepSeekSearchToggleRuntime.findSearchToggle(), null);

  const wrongToggle = new ToggleElement("Upload", ["ds-toggle-button--selected"]);
  selectedToggle.clickCount = 0;
  context = loadRuntime({ elements: [wrongToggle, selectedToggle] });
  assert.equal(context.DeepSeekSearchToggleRuntime.tryDisable(), true);
  assert.equal(wrongToggle.clickCount, 0);
  assert.equal(selectedToggle.clickCount, 1);

  context = loadRuntime({ storageValue: false });
  assert.equal(await context.DeepSeekSearchToggleRuntime.isFeatureEnabled(), false);

  context = loadRuntime({ storageError: { message: "sync unavailable" } });
  assert.equal(await context.DeepSeekSearchToggleRuntime.isFeatureEnabled(), false);

  context = loadRuntime();
  assert.equal(context.__listeners.has("visibilitychange"), false);
  assert.equal(context.__globalListeners.has("focus"), false);
  assert.equal(context.__mutationObserverCreations(), 0);
}

run().then(
  () => console.log("runtime tests passed"),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
