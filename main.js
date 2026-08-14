const {
  app,
  BrowserWindow,
  BrowserView,
  Menu,
  dialog,
  ipcMain,
} = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    show: false,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Electron does not always expose the native edit menu in the way users
  // expect. Provide a real Windows-style context menu for editable content
  // and selectable output.
  mainWindow.webContents.on("context-menu", (_event, params) => {
    const menuTemplate = [];

    const isEditable = Boolean(params.isEditable);
    const hasSelection = Boolean(params.selectionText);

    if (isEditable) {
      menuTemplate.push(
        { role: "cut", enabled: true },
        { role: "copy", enabled: hasSelection },
        { role: "paste", enabled: true },
        { type: "separator" },
        { role: "selectAll" },
      );
    } else if (hasSelection) {
      menuTemplate.push(
        { role: "copy", enabled: true },
        { type: "separator" },
        { role: "selectAll" },
      );
    }

    if (!menuTemplate.length) {
      menuTemplate.push({ role: "selectAll" });
    }

    Menu.buildFromTemplate(menuTemplate).popup({
      window: mainWindow,
    });
  });
}

function registerIpcHandlers() {
  ipcMain.handle("save-script", async (_event, { content, language }) => {
    const configs = {
      batch: { title: "Save Batch file", defaultPath: "create-structure.bat", extensions: ["bat"], name: "Windows Batch File" },
      powershell: { title: "Save PowerShell script", defaultPath: "create-structure.ps1", extensions: ["ps1"], name: "PowerShell Script" },
      bash: { title: "Save Bash script", defaultPath: "create-structure.sh", extensions: ["sh"], name: "Bash Script" },
      zsh: { title: "Save Zsh script", defaultPath: "create-structure.zsh", extensions: ["zsh"], name: "Zsh Script" },
    };

    const config = configs[language] || configs.batch;

    const result = await dialog.showSaveDialog({
      title: config.title,
      defaultPath: config.defaultPath,
      filters: [{ name: config.name, extensions: config.extensions }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, String(content ?? ""), "utf8");
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("save-bat", async (_event, content) => {
    const result = await dialog.showSaveDialog({
      title: "Save BAT file",
      defaultPath: "create-structure.bat",
      filters: [{ name: "Windows Batch File", extensions: ["bat"] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, String(content ?? ""), "utf8");
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("save-text", async (_event, content) => {
    const result = await dialog.showSaveDialog({
      title: "Save structure text",
      defaultPath: "structure.txt",
      filters: [{ name: "Text File", extensions: ["txt"] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, String(content ?? ""), "utf8");
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("open-text", async () => {
    const result = await dialog.showOpenDialog({
      title: "Open structure file",
      properties: ["openFile"],
      filters: [
        { name: "Text Files", extensions: ["txt", "md", "tree"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true };
    }

    return {
      canceled: false,
      filePath: result.filePaths[0],
      content: fs.readFileSync(result.filePaths[0], "utf8"),
    };
  });

  ipcMain.handle("create-project", async (_event, { rootPath, content }) => {
    try {
      if (!rootPath) {
        throw new Error("No output directory selected.");
      }

      const result = createFromStructure(rootPath, content);

      return {
        success: true,
        created: result.created,
        root: result.root,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
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

function parseStructure(text) {
  const lines = String(text ?? "")
    .replace(/\r/g, "")
    .split("\n");
  const nodes = [];

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;

    const line = rawLine.replace(/\t/g, "│   ");

    if (nodes.length === 0 && !/[├└]──/.test(line)) {
      const root = cleanName(line);
      if (root) {
        nodes.push({ name: root, depth: 0 });
      }
      continue;
    }

    const match = line.match(/^((?:│   |    )*)(?:├──|└──)\s*(.+)$/);
    if (!match) continue;

    const prefix = match[1] || "";
    const name = cleanName(match[2]);

    if (!name) continue;

    const depth = Math.max(1, Math.floor(prefix.length / 4) + 1);
    nodes.push({ name, depth });
  }

  return nodes;
}

function cleanName(name) {
  return String(name)
    .split("←")[0]
    .trim()
    .replace(/[\/\\]+$/, "");
}

function isFile(name) {
  const base = name.split(/[\\/]/).pop();

  const knownFiles = new Set([
    "Dockerfile",
    "Makefile",
    "LICENSE",
    "README",
    ".gitignore",
    ".npmrc",
    ".env",
  ]);

  return knownFiles.has(base) || /\.[A-Za-z0-9_-]+$/.test(base);
}

function normalizeName(name) {
  return String(name)
    .replace(/[<>:"|?*]/g, "_")
    .replace(/[\\/]+/g, path.sep)
    .trim();
}

function createFromStructure(outputDirectory, text) {
  const nodes = parseStructure(text);

  if (!nodes.length) {
    throw new Error("No valid structure was found.");
  }

  const rootName = normalizeName(nodes[0].name);

  if (!rootName) {
    throw new Error("The root folder name is invalid.");
  }

  const projectRoot = path.join(outputDirectory, rootName);
  fs.mkdirSync(projectRoot, { recursive: true });

  const stack = [{ depth: 0, path: projectRoot }];
  let created = 1;

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    const cleanName = normalizeName(node.name);

    if (!cleanName) continue;

    while (stack.length && stack[stack.length - 1].depth >= node.depth) {
      stack.pop();
    }

    const parent = stack.length ? stack[stack.length - 1].path : projectRoot;
    const target = path.join(parent, cleanName);

    if (isFile(cleanName)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });

      if (!fs.existsSync(target)) {
        fs.writeFileSync(target, "", "utf8");
      }
    } else {
      fs.mkdirSync(target, { recursive: true });
      stack.push({ depth: node.depth, path: target });
    }

    created++;
  }

  return { created, root: projectRoot };
}

// ============================================
// Integrity marker
// ============================================
const AUTHOR_MARKER = "Yasin_PathForge_2026";

function verifyIntegrity() {
  const hiddenKey = "PathForge_Owned_By_Yasin";
  if (AUTHOR_MARKER !== "Yasin_PathForge_2026" || !hiddenKey.includes("Yasin")) {
    console.error("Integrity check failed.");
  }
}

verifyIntegrity();
