window.StructureParser = (() => {
  function parse(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const nodes = [];

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;

      const root = rawLine.trim();

      if (nodes.length === 0 && !rawLine.includes("├──") && !rawLine.includes("└──")) {
        nodes.push({
          name: cleanName(root),
          depth: 0
        });
        continue;
      }

      const treeMatch = rawLine.match(/^((?:│   |    |\t)*)(?:├──|└──)\s*(.+)$/);

      if (!treeMatch) continue;

      const prefix = treeMatch[1];
      const name = cleanName(treeMatch[2]);

      if (!name) continue;

      const depth = Math.max(1, Math.floor(prefix.length / 4) + 1);

      nodes.push({ name, depth });
    }

    return nodes;
  }

  function cleanName(name) {
    return name
      .replace(/←.*$/, "")
      .trim()
      .replace(/\/$/, "");
  }

  function isFile(name) {
    const base = name.split(/[\\/]/).pop();

    const knownFiles = [
      "Dockerfile",
      "Makefile",
      "LICENSE",
      "README",
      ".gitignore",
      ".npmrc",
      ".env"
    ];

    if (knownFiles.includes(base)) return true;

    return /\.[A-Za-z0-9_-]+$/.test(base);
  }

  function escapeBat(value) {
    return value.replace(/%/g, "%%");
  }

  return {
    parse,
    isFile,
    escapeBat
  };
})();
