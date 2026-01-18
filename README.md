# YouTube Start-End Controller

Automatically play YouTube videos only between specified start and end times (per video). This extension helps you focus on the most relevant parts of a video by skipping intros, outros, or irrelevant sections.

## Features

- **Custom Start & End Times:** Set specific start and end points (in seconds) for any YouTube video.
- **Auto-Enforcement:** The video automatically jumps to your start time and pauses at your end time.
- **Works on Shorts:** Supports YouTube Shorts as well as standard videos.
- **Manage Trims:** View a list of all your saved video trims in the extension popup. You can open them or delete them directly from the list.
- **Sync:** Settings are saved locally to your browser.

## Installation

**Note: This extension is not available on the Chrome Web Store.** You can install it manually in developer mode.

1.  **Download the Code:**
    *   Clone this repository or download the source code to a folder on your computer.

2.  **Open Chrome Extensions:**
    *   Open Google Chrome.
    *   Navigate to `chrome://extensions/` in the address bar.

3.  **Enable Developer Mode:**
    *   Toggle the **Developer mode** switch in the top right corner of the page.

4.  **Load the Extension:**
    *   Click the **Load unpacked** button that appears in the top left.
    *   Select the folder where you saved this project (the directory containing `manifest.json`).

The extension icon should now appear in your browser toolbar.

## Usage

1.  **Open a YouTube Video:**
    *   Go to YouTube and play any video or Short.

2.  **Set Trim Times:**
    *   Click the **YouTube Start-End Controller** extension icon in the toolbar.
    *   The popup will show the current Video ID and Title.
    *   Enter the **Start** time (in seconds).
    *   Enter the **End** time (in seconds).
    *   Click **Save**.

3.  **Playback:**
    *   The extension will now automatically manage playback for that video.
    *   If the video tries to play before the Start time, it will jump to the Start.
    *   When the video reaches the End time, it will automatically pause.

4.  **Manage Saved Videos:**
    *   Open the extension popup at any time.
    *   Scroll down to see a list of all videos with saved trim settings.
    *   Click **Open** to navigate to a saved video.
    *   Click **Remove** to delete the settings for a specific video.
    *   Use the **Clear All** button to remove all saved attributes.

## Permissions

This extension uses the following permissions:
- `storage`: To save your start/end time preferences for each video.
- `activeTab` & `tabs`: To detect the current video URL and title.
- `scripting` (via content scripts): To control the video player on YouTube pages.

## License

This project is for personal use and is not published on the Chrome Web Store.
