# YouTube Speed Controller

Control YouTube video playback speed with precision. This Chrome extension adds a custom, draggable overlay to YouTube videos, allowing granular speed control from **0.1x to 10x**.

## Features

- **Granular Control**: Slider and buttons to adjust speed in `0.1x` or custom increments.
- **Extended Range**: Go beyond YouTube's default 2x limit, up to **10x**.
- **Draggable UI**: Move the controller anywhere on the video player; it remembers its position.
- **Glassmorphism Design**: Modern, translucent UI that blends seamlessly with the video player.
- **Keyboard Shortcuts**: Use `Shift + ArrowUp` and `Shift + ArrowDown` to adjust speed globally.
- **Persistence**: Remembers your preferred speed and minimized state across videos and reloads.
- **Auto-Hide**: The controller fades out after 5 seconds of inactivity to keep your view unobstructed.
- **Reliable Enforcement**: A background loop ensures your custom speed is maintained even if YouTube tries to reset it (e.g., during ads or quality changes).

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked**.
5. Select the `youtube-speed-controller` folder.

## Usage

- **Slider**: Drag to set speed between 0.1x and 10x.
- **Quick Buttons**: Click presets (1.0x, 2.0x, etc.) or relative adjustments (+0.15x).
- **Minimize**: Click the dash (`−`) icon to collapse the panel into a small pill. Click the box (`⛶`) to expand.
- **Keyboard**:
  - `Shift` + `↑`: Increase speed by 0.1x.
  - `Shift` + `↓`: Decrease speed by 0.1x.

## Technical Implementation

This project uses **Manifest V3** and purely vanilla JavaScript (no frameworks) for maximum performance and compatibility.

### Architecture

- **Content Script (`content.js`)**: The core logic. It runs on `youtube.com` pages.
  - **Shadow DOM**: The UI is injected into a `ShadowRoot` (`#yt-speed-controller-host`). This strictly isolates the extension's CSS from YouTube's styles, preventing conflicts.
  - **MutationObserver**: Monitors the document body. Since YouTube is a Single Page Application (SPA), the video player is often replaced dynamically. The observer re-attaches the controller whenever the player is re-rendered.
  - **Speed Enforcement Loop**: A `setInterval` runs every second to check `video.playbackRate`. If it deviates from the user's target speed (by > 0.05), it forcibly resets it. This overrides YouTube's native behavior of resetting speed on navigating or ad breaks.

- **Popup (`popup.js`)**: A lightweight control menu in the toolbar.
  - It communicates with the content script via `chrome.tabs.sendMessage` to update speed or "wake up" the UI.

- **Persistence**: 
  - Uses `chrome.storage.local` to save the `ytSpeed` and `isMinimized` state.
  - On page load, the content script retrieves these values to restore the user's previous context immediately.

### Styling (`styles.css`)

- Uses **Glassmorphism** techniques (`backdrop-filter: blur(16px)`) to create a premium, native-app feel.
- Imported **Inter** font via Google Fonts for modern typography.
- CSS Variables and Flexbox/Grid are used for responsive layout within the panel.
- **Drag & Drop**: Implemented using standard Mouse Events (`mousedown`, `mousemove`, `mouseup`) on the window object to prevent tracking loss when moving the mouse quickly.

### Asset Generation

- **`resize_icons.py`**: A Python utility script using `Pillow` to automatically generate all required icon sizes (`16`, `32`, `48`, `128`) from a single `icon.png` source file.
  - **Requirement**: `pip install Pillow` to run this script if you change the source icon.

## Project Structure

```
├── manifest.json       # Extension configuration (Permissions, Matches)
├── content.js          # Main logic (UI injection, Speed control)
├── styles.css          # Visual styling (Glassmorphism, Shadow DOM styles)
├── popup.html          # Toolbar popup structure
├── popup.js            # Toolbar popup logic
├── resize_icons.py     # Dev tool to generate icons
├── icons/              # Generated icons for the browser
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # Project documentation
```

## Privacy & Permissions

- **Storage**: Used only to save your speed preference locally.
- **ActiveTab / Host Permissions**: Requested only for `*.youtube.com` to inject the controller script. No data is collected or sent to external servers.
