// Parse a YouTube video ID from many URL forms (watch, youtu.be, shorts)
function extractVideoId(urlString) {
  try {
    const url = new URL(urlString);
    const host = url.hostname.replace(/^www\./, "");

    // 1) Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    const vParam = url.searchParams.get("v");
    if (vParam) return vParam;

    // 2) Shorts: https://www.youtube.com/shorts/VIDEO_ID
    if (host.endsWith("youtube.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx !== -1 && parts[shortsIdx + 1]) {
        return parts[shortsIdx + 1];
      }
    }

    // 3) youtu.be short links: https://youtu.be/VIDEO_ID
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id) return id;
    }

    return null;
  } catch {
    return null;
  }
}

function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    callback(tabs[0]);
  });
}

function loadForVideo(videoId, cb) {
  chrome.storage.local.get("youtubeTimers", (data) => {
    const timers = data.youtubeTimers || {};
    cb(timers[videoId] || { start: "", end: "" });
  });
}

function saveForVideo(videoId, start, end, cb) {
  chrome.storage.local.get("youtubeTimers", (data) => {
    const timers = data.youtubeTimers || {};
    timers[videoId] = { start, end };
    chrome.storage.local.set({ youtubeTimers: timers }, cb);
  });
}

function clearForVideo(videoId, cb) {
  chrome.storage.local.get("youtubeTimers", (data) => {
    const timers = data.youtubeTimers || {};
    delete timers[videoId];
    chrome.storage.local.set({ youtubeTimers: timers }, cb);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const startEl = document.getElementById("start");
  const endEl = document.getElementById("end");
  const saveBtn = document.getElementById("save");
  const clearBtn = document.getElementById("clear");

  getActiveTab((tab) => {
    const videoId = extractVideoId(tab.url || "");
    if (!videoId) {
      statusEl.innerHTML = '<span class="warn">This tab is not a YouTube video page.</span>';
      startEl.disabled = true;
      endEl.disabled = true;
      saveBtn.disabled = true;
      clearBtn.disabled = true;
      return;
    }

    statusEl.innerHTML = `Video ID: <b>${videoId}</b>`;
    loadForVideo(videoId, ({ start, end }) => {
      startEl.value = start ?? "";
      endEl.value = end ?? "";
    });

    saveBtn.addEventListener("click", () => {
      const start = parseInt(startEl.value, 10) || 0;
      const end = parseInt(endEl.value, 10) || 0;
      if (end && start >= end) {
        statusEl.innerHTML = '<span class="warn">End must be greater than Start.</span>';
        return;
      }
      saveForVideo(videoId, start, end, () => {
        statusEl.innerHTML = '<span class="ok">Saved for this video.</span>';
      });
    });

    clearBtn.addEventListener("click", () => {
      clearForVideo(videoId, () => {
        startEl.value = "";
        endEl.value = "";
        statusEl.innerHTML = '<span class="ok">Cleared for this video.</span>';
      });
    });
  });
});
