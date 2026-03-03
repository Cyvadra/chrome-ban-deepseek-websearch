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
