const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  saveScript: (content, language) => ipcRenderer.invoke("save-script", { content, language }),
  saveBat: (content) => ipcRenderer.invoke("save-bat", content),
  saveText: (content) => ipcRenderer.invoke("save-text", content),
  openText: () => ipcRenderer.invoke("open-text"),
  createProject: (rootPath, content) =>
    ipcRenderer.invoke("create-project", { rootPath, content })
});
