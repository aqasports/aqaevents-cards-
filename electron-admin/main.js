const { app, BrowserWindow, session, shell, Menu, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store");

// ─── Config ──────────────────────────────────────────────────────────────────
const ADMIN_URL = "https://aqasports.com/admin";
const ADMIN_APP_TOKEN = "655B3D5B26D302F8B768A89A063051EB7F049D0BD58C1E899782684341DB8643";
const ALLOWED_ORIGINS = ["https://aqasports.com", "https://delightful-torte-bcca6a.netlify.app"];

// ─── Persistent window state ──────────────────────────────────────────────────
const store = new Store({
  defaults: {
    windowBounds: { width: 1280, height: 820, x: undefined, y: undefined },
    windowMaximized: false,
  },
});

let mainWindow = null;
let splashWindow = null;

// ─── Prevent multiple instances ───────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Create splash window ─────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.center();
}

// ─── Create main admin window ─────────────────────────────────────────────────
function createMainWindow() {
  const saved = store.get("windowBounds");

  mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: saved.x,
    y: saved.y,
    minWidth: 900,
    minHeight: 600,
    show: false,                // shown after dom-ready
    title: "AQA Admin",
    backgroundColor: "#0b0f19",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Restore maximized state
  if (store.get("windowMaximized")) mainWindow.maximize();

  // ── Inject X-Admin-App-Token on every request to admin domain ──────────────
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["https://aqasports.com/*", "https://delightful-torte-bcca6a.netlify.app/*"] },
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          "X-Admin-App-Token": ADMIN_APP_TOKEN,
        },
      });
    }
  );

  // ── Lock navigation inside admin domain ────────────────────────────────────
  mainWindow.webContents.on("will-navigate", (e, url) => {
    const isAllowed = ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
    if (!isAllowed) {
      e.preventDefault();
      shell.openExternal(url); // open external links in browser
    }
  });

  // Same for new-window / target=_blank
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isAllowed = ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
    if (isAllowed) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  // ── Show window once page is ready, close splash ───────────────────────────
  mainWindow.webContents.once("dom-ready", () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
    }, 600); // small delay so splash feels intentional
  });

  // ── Save window state on close ─────────────────────────────────────────────
  mainWindow.on("close", () => {
    if (!mainWindow.isMaximized()) {
      store.set("windowBounds", mainWindow.getBounds());
    }
    store.set("windowMaximized", mainWindow.isMaximized());
  });

  mainWindow.on("closed", () => { mainWindow = null; });

  // ── Build minimal application menu ─────────────────────────────────────────
  const menu = Menu.buildFromTemplate([
    {
      label: "AQA Admin",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => mainWindow.webContents.reload() },
        { label: "Back", accelerator: "Alt+Left", click: () => { if (mainWindow.webContents.canGoBack()) mainWindow.webContents.goBack(); } },
        { type: "separator" },
        { label: "Open in Browser", click: () => shell.openExternal(ADMIN_URL) },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle Full Screen", accelerator: "F11", click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { label: "Zoom In",  accelerator: "CmdOrCtrl+=", click: () => { const z = mainWindow.webContents.getZoomFactor(); mainWindow.webContents.setZoomFactor(Math.min(z + 0.1, 3)); } },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => { const z = mainWindow.webContents.getZoomFactor(); mainWindow.webContents.setZoomFactor(Math.max(z - 0.1, 0.5)); } },
        { label: "Reset Zoom", accelerator: "CmdOrCtrl+0", click: () => mainWindow.webContents.setZoomFactor(1) },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  // ── Load the admin portal ──────────────────────────────────────────────────
  mainWindow.loadURL(ADMIN_URL);
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createSplash();
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
