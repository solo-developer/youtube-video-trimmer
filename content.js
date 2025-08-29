// Robustly extract video ID for watch, youtu.be and shorts URLs
function getCurrentVideoId() {
  try {
    const url = new URL(window.location.href);
    const host = url.hostname.replace(/^www\./, "");

    const v = url.searchParams.get("v");
    if (v) return v;

    if (host.endsWith("youtube.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx !== -1 && parts[shortsIdx + 1]) {
        return parts[shortsIdx + 1];
      }
    }

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id) return id;
    }
  } catch {}
  return null;
}

let currentVideo = null;
let currentVideoId = null;
let timers = { start: 0, end: 0 };
let timeupdateHandlerBound = false;

// Load timers from storage for the current video
function loadTimersForCurrentVideo() {
  const vid = getCurrentVideoId();
  currentVideoId = vid;
  if (!vid) {
    timers = { start: 0, end: 0 };
    return;
    }
  chrome.storage.local.get("youtubeTimers", (data) => {
    const map = data.youtubeTimers || {};
    const t = map[vid] || {};
    timers.start = Number.isFinite(t.start) ? t.start : (parseInt(t.start, 10) || 0);
    timers.end = Number.isFinite(t.end) ? t.end : (parseInt(t.end, 10) || 0);
    // If we already have a video element, enforce immediately
    enforceStartIfNeeded();
  });
}

// Find the <video> element; YouTube replaces this across navigations
function findVideoElement() {
  const el = document.querySelector("video");
  return el || null;
}

// Attach timeupdate listener exactly once per <video> element instance
function attachHandlers(videoEl) {
  if (!videoEl) return;
  if (currentVideo === videoEl && timeupdateHandlerBound) return;

  // If switching to a new <video> element, remove old handlers
  if (currentVideo && timeupdateHandlerBound) {
    try {
      currentVideo.removeEventListener("timeupdate", onTimeUpdate);
      currentVideo.removeEventListener("playing", onPlaying);
    } catch {}
    timeupdateHandlerBound = false;
  }

  currentVideo = videoEl;
  currentVideo.addEventListener("timeupdate", onTimeUpdate);
  currentVideo.addEventListener("playing", onPlaying);
  timeupdateHandlerBound = true;

  // Enforce immediately on attach
  enforceStartIfNeeded();
}

function onPlaying() {
  enforceStartIfNeeded();
}

function onTimeUpdate() {
  enforceBounds();
}

function enforceStartIfNeeded() {
  if (!currentVideo) return;
  const { start } = timers;
  if (start > 0 && currentVideo.currentTime < start) {
    // Jump forward to start
    currentVideo.currentTime = start;
  }
}

function enforceBounds() {
  if (!currentVideo) return;
  const { start, end } = timers;

  // Prevent playing earlier than start
  if (start > 0 && currentVideo.currentTime < start) {
    currentVideo.currentTime = start;
    return;
  }

  // Stop at end (if set and valid)
  if (end > 0 && currentVideo.currentTime >= end) {
    currentVideo.pause();
    // Snap exactly to end to avoid flicker
    currentVideo.currentTime = end;
  }
}

// Observe DOM for video element changes (YouTube is an SPA)
const observer = new MutationObserver(() => {
  attachHandlers(findVideoElement());
});
observer.observe(document.documentElement, { childList: true, subtree: true });

// Listen to YouTube's internal navigation events if available
window.addEventListener("yt-navigate-finish", () => {
  loadTimersForCurrentVideo();
  attachHandlers(findVideoElement());
});

// Also catch history navigation/popstate changes
window.addEventListener("popstate", () => {
  loadTimersForCurrentVideo();
  attachHandlers(findVideoElement());
});

// Initial boot
loadTimersForCurrentVideo();
attachHandlers(findVideoElement());

// React instantly when user updates timers from the popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.youtubeTimers) {
    // Only reload if it’s the current video ID that changed
    const newVal = changes.youtubeTimers.newValue || {};
    if (!currentVideoId) return;
    const t = newVal[currentVideoId];
    if (t) {
      timers.start = parseInt(t.start, 10) || 0;
      timers.end = parseInt(t.end, 10) || 0;
      enforceStartIfNeeded();
      enforceBounds();
    } else {
      // Cleared for this video
      timers = { start: 0, end: 0 };
    }
  }
});
