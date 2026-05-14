const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  openSvg: () => ipcRenderer.invoke("desktop:open-svg"),
  saveSvg: (payload) => ipcRenderer.invoke("desktop:save-svg", payload),
  getMeta: () => ipcRenderer.invoke("desktop:get-meta"),
  getAppManifest: () => ipcRenderer.invoke("desktop:get-app-manifest"),
  onFileOpened: (callback) => {
    ipcRenderer.on("desktop:file-opened", (_, payload) => callback(payload));
  },
  onExportRequested: (callback) => {
    ipcRenderer.on("desktop:request-export", () => callback());
  }
});
