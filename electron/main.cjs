const path = require("node:path");
const fs = require("node:fs/promises");
const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");

let mainWindow = null;
const appIconPath = path.join(__dirname, "..", "assets", "icons", "app-icon.ico");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: "#f6f2e9",
    autoHideMenuBar: false,
    title: "hot-vs-nice",
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
  buildMenu();
}

async function openSvgDialog() {
  if (!mainWindow) {
    return null;
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open SVG",
    properties: ["openFile"],
    filters: [{ name: "SVG", extensions: ["svg"] }]
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  const content = await fs.readFile(filePath, "utf8");
  return { filePath, fileName, content };
}

async function saveSvgDialog(payload) {
  if (!mainWindow || !payload?.content) {
    return null;
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export SVG",
    defaultPath: payload.suggestedName || "vector-color-export.svg",
    filters: [{ name: "SVG", extensions: ["svg"] }]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await fs.writeFile(result.filePath, payload.content, "utf8");
  return { filePath: result.filePath };
}

async function readAppManifest() {
  const manifestPath = path.join(__dirname, "..", "app.manifest.json");
  const raw = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(raw);
}

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open SVG",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const file = await openSvgDialog();
            if (file && mainWindow) {
              mainWindow.webContents.send("desktop:file-opened", file);
            }
          }
        },
        {
          label: "Export Active SVG",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("desktop:request-export");
            }
          }
        },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "toggledevtools" }, { role: "resetzoom" }]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle("desktop:open-svg", openSvgDialog);
ipcMain.handle("desktop:save-svg", (_, payload) => saveSvgDialog(payload));
ipcMain.handle("desktop:get-meta", () => ({
  platform: process.platform,
  version: app.getVersion()
}));
ipcMain.handle("desktop:get-app-manifest", readAppManifest);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
