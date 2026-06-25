const { app, BrowserWindow, session, shell, Menu } = require("electron");
const path = require("path");
const Store = require("electron-store");

// ─── Config ──────────────────────────────────────────────────────────────────
const ADMIN_URL  = "https://aqasports.com/admin";
const APP_TOKEN  = "655B3D5B26D302F8B768A89A063051EB7F049D0BD58C1E899782684341DB8643";
const TOKEN_URLS = ["https://*.aqasports.com/*", "https://*.netlify.app/*"];

// ─── Persistent window state ──────────────────────────────────────────────────
const store = new Store({
  defaults: { bounds: { width: 1280, height: 820 }, maximized: false },
});

let mainWin  = null;
let splashWin = null;

// ─── Single-instance lock ─────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
  });
}

// ─── Inject token BEFORE any window is created ───────────────────────────────
// Uses the default session so the header goes on every matching request.
function setupTokenInjection() {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: TOKEN_URLS },
    (details, callback) => {
      callback({
        requestHeaders: { ...details.requestHeaders, "X-Admin-App-Token": APP_TOKEN },
      });
    }
  );
}

// ─── Splash window ────────────────────────────────────────────────────────────
function createSplash() {
  splashWin = new BrowserWindow({
    width: 400,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWin.loadFile(path.join(__dirname, "splash.html"));
  splashWin.center();
}

function closeSplash() {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.close();
    splashWin = null;
  }
}

// ─── Main window ──────────────────────────────────────────────────────────────
function createMainWindow() {
  const saved = store.get("bounds");

  mainWin = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: saved.x,
    y: saved.y,
    minWidth: 900,
    minHeight: 600,
    show: false,             // shown on 'ready-to-show' — prevents black flash
    title: "AQA Admin",
    backgroundColor: "#0b0f19",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      // NOTE: sandbox intentionally disabled — required for webRequest to work
      sandbox: false,
    },
  });

  if (store.get("maximized")) mainWin.maximize();

  // ── Show window once first paint is ready (no black flash) ─────────────────
  mainWin.once("ready-to-show", () => {
    closeSplash();
    mainWin.show();
    mainWin.focus();
  });

  // ── Fallback: show after 8 s even if ready-to-show never fires ─────────────
  const showFallback = setTimeout(() => {
    if (mainWin && !mainWin.isVisible()) {
      closeSplash();
      mainWin.show();
    }
  }, 8000);
  mainWin.once("ready-to-show", () => clearTimeout(showFallback));

  // ── Lock navigation inside allowed domains ─────────────────────────────────
  mainWin.webContents.on("will-navigate", (e, url) => {
    const ok = url.startsWith("https://aqasports.com") ||
               url.startsWith("https://delightful-torte-bcca6a.netlify.app");
    if (!ok) { e.preventDefault(); shell.openExternal(url); }
  });

  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    const ok = url.startsWith("https://aqasports.com") ||
               url.startsWith("https://delightful-torte-bcca6a.netlify.app");
    if (ok) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  // ── Persist window state ───────────────────────────────────────────────────
  mainWin.on("close", () => {
    if (!mainWin.isMaximized()) store.set("bounds", mainWin.getBounds());
    store.set("maximized", mainWin.isMaximized());
  });
  mainWin.on("closed", () => { mainWin = null; });

  // ── Menu ───────────────────────────────────────────────────────────────────
  const menu = Menu.buildFromTemplate([
    {
      label: "AQA Admin",
      submenu: [
        { label: "Reload",          accelerator: "CmdOrCtrl+R", click: () => mainWin.webContents.reload() },
        { label: "Back",            accelerator: "Alt+Left",    click: () => mainWin.webContents.canGoBack() && mainWin.webContents.goBack() },
        { type: "separator" },
        { label: "Open in Browser", click: () => shell.openExternal(ADMIN_URL) },
        { type: "separator" },
        { label: "Quit",            accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle Full Screen", accelerator: "F11",        click: () => mainWin.setFullScreen(!mainWin.isFullScreen()) },
        { label: "Zoom In",            accelerator: "CmdOrCtrl+=", click: () => mainWin.webContents.setZoomFactor(Math.min(mainWin.webContents.getZoomFactor() + 0.1, 3)) },
        { label: "Zoom Out",           accelerator: "CmdOrCtrl+-", click: () => mainWin.webContents.setZoomFactor(Math.max(mainWin.webContents.getZoomFactor() - 0.1, 0.5)) },
        { label: "Reset Zoom",         accelerator: "CmdOrCtrl+0", click: () => mainWin.webContents.setZoomFactor(1) },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  // ── Load the admin portal ──────────────────────────────────────────────────
  mainWin.loadURL(ADMIN_URL);
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  setupTokenInjection();   // must run before any window creation
  createSplash();
  createMainWindow();
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
