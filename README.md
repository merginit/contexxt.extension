# Contexxt

<div align="center">
    <img src="./assets/logo.png" alt="icon" width="150" />
</div>

<div align="center" style="margin-bottom: 2.5rem;">
    <span style="font-size: 2.5rem;">
      <b><strong style="font-size: 5rem;">Contexxt</strong></b>
      <br>"The ultimate tool for developers and designers<br>to inspect, measure, and extract web assets."
    </span>
</div>

## Why Contexxt?

Modern web development requires constant inspection of assets and styles. Contexxt simplifies this process by providing a powerful, overlay-based tool to inspect images, videos, and element styles directly on the page without digging through the developer tools.

## Features

* **Multimedia Inspection:** Instantly view details for images and videos:
  * Source URL and file name.
  * Natural vs. Displayed dimensions.
  * File size and MIME type (heads-up fetch).
  * Video duration and resolution.
* **Element Insights:** inspect any HTML element to see:
  * Font family and weight.
  * Font size.
  * Text color (Computed RGB and Hex).
  * CSS Class names.
* **One-Click Actions:**
  * **Download:** Direct download button for images and videos.
  * **Open in Tab:** Quickly open the asset source in a new tab.
  * **Ctrl/Cmd + Click:** Shortcut to immediately open the asset in a new tab.
* **Smart Overlay:**
  * Non-intrusive metadata popup positioned near your cursor.
  * Interactive padding and controls.
* **Customizable:**
  * Toggle overlay visibility preferences.
  * Enable/Disable keyboard shortcuts.

## How to Use

1. **Activate:** Right-click on any element on a webpage.
2. **Inspect:** Select **"Inspect Asset / Element"** from the context menu.
3. **View:** An overlay will appear with all relevant details about the element.
4. **Interact:** content.
   * Click "Download" to save the asset.
   * Click "Open" to view it in a new tab.
   * Use `Ctrl` (or `Cmd`) + `Click` on an element to quick-open it (if enabled in settings).

## Installation

**1. From Source**

1. Clone this repository.
2. Install dependencies: `npm install` (or `bun install`).
3. Build the extension: `npm run build`.
4. Load unpacked extension in Chrome/Edge/Firefox via Developer Mode.

## Privacy & Permissions

- **`activeTab` & `scripting`**: To inject the inspection overlay only when you request it.
- **`contextMenus`**: To provide the "Inspect Asset" right-click option.
- **`downloads`**: To save images/videos to your device.
- **`storage`**: To save your preferences (e.g., Ctrl+Click behavior).

No remote analytics or tracking.

## License

This project is licensed under the GPLv3 License. See the `LICENSE` file for details.

Copyright © 2025 Jonas Fröller
