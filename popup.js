// popup.js - shows current video editor + list of all saved trims with remove ability

/* Utility: extract video id from URL forms */
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

/* DOM */
const statusEl = document.getElementById("status");
const startEl = document.getElementById("start");
const endEl = document.getElementById("end");
const saveBtn = document.getElementById("save");
const clearBtn = document.getElementById("clear");
const refreshBtn = document.getElementById("refresh");
const listEl = document.getElementById("list");
const clearAllBtn = document.getElementById("clearAll");

/* Active tab info */
let activeTab = null;
let activeVideoId = null;

/* Helpers for storage */
function getAllTimers(cb) {
  chrome.storage.local.get("youtubeTimers", (data) => {
    cb(data.youtubeTimers || {});
  });
}

function saveTimersMap(map, cb) {
  chrome.storage.local.set({ youtubeTimers: map }, cb);
}

/* Load active tab and populate fields */
function initForActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    activeTab = tabs[0];
    if (!activeTab) {
      statusEl.innerHTML = '<span class="warn">No active tab found.</span>';
      disableInputs(true);
      renderList(); // still render list
      return;
    }

    activeVideoId = extractVideoId(activeTab.url || "");
    if (!activeVideoId) {
      statusEl.innerHTML = '<span class="warn">This tab is not a YouTube video page.</span>';
      disableInputs(false); // allow refresh/list operations
      startEl.disabled = true;
      endEl.disabled = true;
      saveBtn.disabled = true;
      clearBtn.disabled = true;
      renderList();
      return;
    }

    // set status + populate saved values
    statusEl.innerHTML = `Video ID: <b>${activeVideoId}</b><br><span style="font-size:12px;color:#666">${(activeTab.title || "").replace(/\s*- YouTube$/, "")}</span>`;
    startEl.disabled = false;
    endEl.disabled = false;
    saveBtn.disabled = false;
    clearBtn.disabled = false;

    // Populate inputs for this video
    getAllTimers((timers) => {
      const t = timers[activeVideoId] || { start: "", end: "" };
      startEl.value = (t.start || t.start === 0) ? t.start : "";
      endEl.value = (t.end || t.end === 0) ? t.end : "";
    });

    renderList();
  });
}

function disableInputs(flag) {
  startEl.disabled = flag;
  endEl.disabled = flag;
  saveBtn.disabled = flag;
  clearBtn.disabled = flag;
}

/* Save current video settings (store title too) */
saveBtn.addEventListener("click", () => {
  if (!activeVideoId) return;
  const start = parseInt(startEl.value, 10) || 0;
  const end = parseInt(endEl.value, 10) || 0;
  if (end && start >= end) {
    statusEl.innerHTML = '<span class="warn">End must be greater than Start.</span>';
    return;
  }

  // derive a good title - use tab.title if available; strip "- YouTube"
  let title = (activeTab && activeTab.title) ? activeTab.title.replace(/\s*- YouTube$/, "").trim() : activeVideoId;

  getAllTimers((timers) => {
    timers[activeVideoId] = { start, end, title };
    saveTimersMap(timers, () => {
      statusEl.innerHTML = '<span class="ok">Saved for this video.</span>';
      renderList();
      // notify (storage.onChanged will fire for content scripts too)
    });
  });
});

/* Clear current video's saved trim (only this one) */
clearBtn.addEventListener("click", () => {
  if (!activeVideoId) return;
  getAllTimers((timers) => {
    if (timers[activeVideoId]) {
      delete timers[activeVideoId];
      saveTimersMap(timers, () => {
        statusEl.innerHTML = '<span class="ok">Cleared for this video.</span>';
        startEl.value = "";
        endEl.value = "";
        renderList();
      });
    } else {
      statusEl.innerHTML = '<span class="warn">Nothing saved for this video.</span>';
    }
  });
});

/* Clear all saved trims */
clearAllBtn.addEventListener("click", () => {
  if (!confirm("Remove all saved trims? This cannot be undone.")) return;
  saveTimersMap({}, () => {
    statusEl.innerHTML = '<span class="ok">All cleared.</span>';
    renderList();
  });
});

/* Refresh list and active tab data */
refreshBtn.addEventListener("click", () => {
  initForActiveTab();
});

/* Render list of all saved trims */
function renderList() {
  getAllTimers((timers) => {
    listEl.innerHTML = "";
    const keys = Object.keys(timers);
    if (keys.length === 0) {
      listEl.innerHTML = '<div class="empty">No trimmed videos saved.</div>';
      return;
    }

    keys.sort((a, b) => {
      // sort by title (if present) else by id
      const ta = (timers[a].title || a).toLowerCase();
      const tb = (timers[b].title || b).toLowerCase();
      return ta.localeCompare(tb);
    });

    for (const vid of keys) {
      const t = timers[vid];
      const item = document.createElement("div");
      item.className = "item";

      const left = document.createElement("div");
      left.className = "left";

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = t.title || vid;

      const meta = document.createElement("div");
      meta.className = "metaSmall";
      meta.textContent = `ID: ${vid} • start: ${t.start ?? ""}s • end: ${t.end ?? ""}s`;

      left.appendChild(title);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "8px";
      right.style.alignItems = "center";

      // go-to button (opens video in a new tab)
      const openBtn = document.createElement("button");
      openBtn.textContent = "Open";
      openBtn.className = "smallBtn";
      openBtn.addEventListener("click", () => {
        const url = `https://www.youtube.com/watch?v=${vid}`;
        chrome.tabs.create({ url });
      });

      // remove button
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.className = "remove";
      removeBtn.addEventListener("click", () => {
        if (!confirm(`Remove trim for "${t.title || vid}"?`)) return;
        getAllTimers((map) => {
          delete map[vid];
          saveTimersMap(map, () => {
            statusEl.innerHTML = '<span class="ok">Removed.</span>';
            // if removed item is the active tab, clear inputs too
            if (vid === activeVideoId) {
              startEl.value = "";
              endEl.value = "";
            }
            renderList();
          });
        });
      });

      right.appendChild(openBtn);
      right.appendChild(removeBtn);

      item.appendChild(left);
      item.appendChild(right);

      listEl.appendChild(item);
    }
  });
}

/* Keep popup in sync with storage changes (in case another window saves) */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.youtubeTimers) {
    renderList();
    // if current video's entry changed, update inputs
    if (activeVideoId) {
      const newMap = changes.youtubeTimers.newValue || {};
      const t = newMap[activeVideoId];
      if (t) {
        startEl.value = t.start ?? "";
        endEl.value = t.end ?? "";
      } else {
        startEl.value = "";
        endEl.value = "";
      }
    }
  }
});

/* Boot */
document.addEventListener("DOMContentLoaded", () => {
  initForActiveTab();
});
