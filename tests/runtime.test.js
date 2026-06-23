const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class ToggleElement {
  constructor(text, classNames = []) {
    this.textContent = text;
    this.clickCount = 0;
    this.classList = {
      contains: (className) => classNames.includes(className),
    };
  }

  click() {
    this.clickCount += 1;
  }
}

function loadRuntime({ elements = [], storageError = null, storageValue = true } = {}) {
  const listeners = new Map();
  const context = {
    clearInterval,
    console,
    document: {
      readyState: "loading",
      addEventListener: (eventName, handler) => listeners.set(eventName, handler),
      querySelectorAll: () => elements,
    },
    setInterval,
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
}

run().then(
  () => console.log("runtime tests passed"),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);