// ========================================================
// ⚡ V2.3 — Electron Entry (Freeze-Safe & Async Hardening)
// ========================================================
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
let cy_win = null;
let cy_memoryInterval = null;
let cy_enableMemoryLog = false; // toggle for dev only

// --------------------------------------------------------
// 🧠 Create Window
// --------------------------------------------------------
function cy_createFlyoverWindow(payload = {}) {
  const { coords = { x: 100, y: 100 }, theme = {} } = payload;
  const display =
    coords && typeof coords.x === "number" && typeof coords.y === "number"
      ? screen.getDisplayNearestPoint({ x: coords.x, y: coords.y })
      : screen.getPrimaryDisplay();

  const w = 420, h = 240;
  const safeX = Math.min(Math.max(display.bounds.x, coords.x - w / 2), display.bounds.x + display.bounds.width - w);
  const safeY = Math.min(Math.max(display.bounds.y, coords.y - h / 2), display.bounds.y + display.bounds.height - h);

  cy_win = new BrowserWindow({
    x: safeX,
    y: safeY,
    width: w,
    height: h,
    title: "Holy Flyover",
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    transparent: true,
    resizable: true,
    backgroundColor: "#00000000",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false, // 💡 keeps timers active when unfocused
    },
  });

  cy_win.once("ready-to-show", () => {
    cy_win.show();
    cy_win.webContents.send("init-flyo", { coords, theme });
    console.log("Electron: Flyover window launched", { coords, theme });
    if (cy_enableMemoryLog) setTimeout(() => cy_logMemoryUsage("post-window-show"), 5000);
  });

  cy_win.loadFile(path.join(__dirname, "flyo", "flyo_SKELETON.html"));

  cy_win.on("closed", () => {
    cy_cleanupWindowResources();
  });
}

// --------------------------------------------------------
// 🪐 IPC Handler
// --------------------------------------------------------
ipcMain.on("flyo-action", (_event, msg) => {
  if (!cy_win) return;
  if (msg.type === "cancel") cy_win.hide();
  if (msg.type === "close") cy_win.close();
});

// --------------------------------------------------------
// 🚀 App Lifecycle
// --------------------------------------------------------
app.whenReady().then(() => {
  console.log("Electron: app ready");

  // If launched directly (manual dev test)
  let payload = {};
  try {
    const arg = process.argv[2];
    if (arg) payload = JSON.parse(arg);
  } catch (e) {
    console.warn("Electron: bad payload", e.message);
  }

  cy_createFlyoverWindow(payload);

  // disable periodic logs unless toggle is on
  if (cy_enableMemoryLog) {
    cy_memoryInterval = setInterval(() => cy_logMemoryUsage("interval"), 10000);
  }

  // 🧩 macOS handler – reopen window when clicking dock icon
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      cy_createFlyoverWindow(payload);
    }
  });
});

app.on("window-all-closed", () => {
  cy_cleanupWindowResources();
  console.log("Electron: all windows closed");
  if (process.platform !== "darwin") app.exit(0);
});

// --------------------------------------------------------
// 🧹 Helpers
// --------------------------------------------------------
async function cy_logMemoryUsage(stage = "") {
  try {
    const info = process.getProcessMemoryInfo
      ? await process.getProcessMemoryInfo()
      : process.memoryUsage();
    console.log(
      `Electron Memory [${stage}]: workingSet=${info.workingSetSize || info.rss || "?"} KB`
    );
  } catch (err) {
    // swallow to avoid AE hang
  }
}

function cy_cleanupWindowResources() {
  if (cy_memoryInterval) {
    clearInterval(cy_memoryInterval);
    cy_memoryInterval = null;
  }
  cy_win = null;
  console.log("Electron: cleanup complete");
}

// --------------------------------------------------------
// ⚙️ Global Error Guards
// --------------------------------------------------------
process.on("unhandledRejection", (err) => console.warn("Electron unhandledRejection:", err && err.message));
process.on("uncaughtException", (err) => console.warn("Electron uncaughtException:", err && err.message));
