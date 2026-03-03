# Disable DeepSeek Web Search (Chrome Extension)

This extension turns **off** the `Search` toggle on `https://chat.deepseek.com` during page start/refresh.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `chrome-ban-deepseek-websearch`

## What it does

- Runs a content script on `chat.deepseek.com`
- Detects whether `Search` is active
- Clicks the `Search` toggle only when active
- Re-checks briefly after startup to handle delayed UI rendering

## Popup toggle

- Click the extension icon in Chrome to open the popup.
- Turn **Auto-disable Search on startup** on/off.
- Setting is saved with `chrome.storage.sync`.

## Build upload zip (Chrome Web Store)

Use the helper script to create a clean upload zip (removes common macOS metadata and excludes dev-only folders):

```bash
./scripts/patch-cws-zip.sh
```

Output:

- `dist/chrome-web-store-upload.zip`

Optional: patch extension version in `manifest.json` inside the output zip:

```bash
./scripts/patch-cws-zip.sh --version 1.0.1
```

Optional: patch an existing zip and write a cleaned output zip:

```bash
./scripts/patch-cws-zip.sh --input-zip ./my-extension.zip --output-zip ./dist/upload.zip
```
