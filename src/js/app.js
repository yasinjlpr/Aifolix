const input = document.getElementById("structureInput");
const output = document.getElementById("batOutput");
const preview = document.getElementById("preview");
const inputStatus = document.getElementById("inputStatus");
const outputStatus = document.getElementById("outputStatus");
const countStatus = document.getElementById("countStatus");
const dropZone = document.getElementById("dropZone");
const toast = document.getElementById("toast");
const languageSelect = document.getElementById("languageSelect");
const outputTitle = document.getElementById("outputTitle");
const saveBtn = document.getElementById("saveBtn");

const example = `Website/
├── public/
│   ├── images/
│   └── favicon.ico
│
├── src/
│   ├── styles/
│   │   ├── _variables.css
│   │   ├── _reset.css
│   │   ├── _palettes.css
│   │   ├── _components.css
│   │   ├── _sections.css
│   │   ├── _utilities.css
│   │   └── main.css
│   │
│   ├── scripts/
│   │   ├── core/
│   │   │   ├── config.js
│   │   │   ├── types.js
│   │   │   └── utils.js
│   │   │
│   │   ├── modules/
│   │   │   ├── cart/
│   │   │   │   ├── cart.js
│   │   │   │   └── cart-ui.js
│   │   │   ├── products/
│   │   │   │   ├── products.js
│   │   │   │   └── products-ui.js
│   │   │   ├── orders/
│   │   │   │   ├── orders.js
│   │   │   │   └── orders-ui.js
│   │   │   └── admin/
│   │   │       ├── admin.js
│   │   │       └── admin-ui.js
│   │   └── app.js
│   │
│   ├── pages/
│   │   ├── index.html
│   │   ├── products.html
│   │   ├── product-detail.html
│   │   ├── cart.html
│   │   └── checkout.html
│   │
│   ├── components/
│   │   ├── header/
│   │   │   ├── header.html
│   │   │   └── header.css
│   │   └── product-card/
│   │       ├── product-card.html
│   │       └── product-card.css
│   │
│   └── data/
│       ├── products.json
│       └── categories.json
│
├── dist/
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md`;

let toastTimer;
let updateTimer;

function showToast(message, type = "") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 2200);
}

function update() {
  const nodes = StructureParser.parse(input.value);
  renderPreview(nodes);

  const language = languageSelect.value;
  const languageInfo = CodeGenerator.getLanguage(language);

  output.textContent = CodeGenerator.generate(nodes, language);

  outputTitle.textContent = `Generated ${languageInfo.name}`;
  saveBtn.textContent = `Save .${languageInfo.extension}`;

  inputStatus.textContent = nodes.length
    ? `${nodes.length} items detected`
    : "Paste or open a structure";

  outputStatus.textContent = nodes.length ? "Generated successfully" : "Ready";

  countStatus.textContent = `${nodes.length} item${nodes.length === 1 ? "" : "s"}`;
}

function scheduleUpdate() {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(update, 80);
}

function renderPreview(nodes) {
  if (!nodes.length) {
    preview.innerHTML = `<div class="empty">Nothing detected yet.</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const node of nodes) {
    const row = document.createElement("div");
    row.className = "tree-row";
    row.style.setProperty("--depth", node.depth);

    const icon = document.createElement("span");
    icon.className = "tree-icon";
    icon.textContent = StructureParser.isFile(node.name) ? "📄" : "📁";

    const name = document.createElement("span");
    name.className = StructureParser.isFile(node.name)
      ? "tree-file"
      : "tree-folder";
    name.textContent = node.name;

    row.append(icon, name);
    fragment.appendChild(row);
  }

  preview.replaceChildren(fragment);
}

async function copyText(text) {
  // Clipboard API is preferred in modern Electron.
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for restricted clipboard environments.
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      helper.remove();
    }

    return copied;
  }
}

document.getElementById("generateBtn").addEventListener("click", () => {
  update();
  showToast(`${CodeGenerator.getLanguage(languageSelect.value).name} generated.`, "success");
});

document.getElementById("exampleBtn").addEventListener("click", () => {
  input.value = example;
  update();
  input.focus();
  showToast("Example loaded.", "success");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  input.value = "";
  update();
  input.focus();
  showToast("Cleared.", "success");
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  const copied = await copyText(output.textContent);

  showToast(
    copied ? "BAT copied to clipboard." : "Could not copy.",
    copied ? "success" : "error",
  );
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const language = languageSelect.value;
  const result = await window.api.saveScript(output.textContent, language);

  if (!result.canceled) {
    const extension = CodeGenerator.getLanguage(language).extension;
    showToast(`.${extension} file saved.`, "success");
  }
});

languageSelect.addEventListener("change", () => {
  update();
  showToast(`Output language: ${CodeGenerator.getLanguage(languageSelect.value).name}`, "success");
});

document.getElementById("openBtn").addEventListener("click", async () => {
  const result = await window.api.openText();

  if (result.canceled) return;

  input.value = result.content;
  update();
  input.focus();
  showToast("Structure opened.", "success");
});

input.addEventListener("input", scheduleUpdate);

input.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
    // Let Chromium perform native Select All.
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
    return;
  }
});

output.addEventListener("dblclick", () => {
  const range = document.createRange();
  range.selectNodeContents(output);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");

  const file = event.dataTransfer.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    input.value = String(reader.result ?? "");
    update();
    input.focus();
    showToast("Structure loaded.", "success");
  };

  reader.onerror = () => {
    showToast("Could not read the file.", "error");
  };

  reader.readAsText(file);
});

input.value = example;
update();

// مدیریت دکمه Paste (دریافت از کلیپ‌بورد)
document.addEventListener("DOMContentLoaded", () => {
  const pasteBtn = document.getElementById("pasteBtn");
  const structureInput = document.getElementById("structureInput");
  const toast = document.getElementById("toast");
const languageSelect = document.getElementById("languageSelect");
const outputTitle = document.getElementById("outputTitle");
const saveBtn = document.getElementById("saveBtn");

  if (pasteBtn) {
    pasteBtn.addEventListener("click", async () => {
      try {
        // درخواست خواندن متن از کلیپ‌بورد
        const text = await navigator.clipboard.readText();

        if (text && text.trim() !== "") {
          structureInput.value = text;

          // 🔥 این خط مهمه! اگر موتور شما روی رویداد 'input' گوش می‌ده،
          // باید این رویداد رو دیسپچ کنیم تا ساختار به‌روز بشه.
          structureInput.dispatchEvent(new Event("input"));

          // نمایش پیام موفقیت
          toast.textContent = "✅ Structure pasted successfully!";
          toast.className = "toast show success";
        } else {
          toast.textContent = "⚠️ Clipboard is empty!";
          toast.className = "toast show error";
        }
      } catch (err) {
        // اگر دسترسی به کلیپ‌بورد رد بشه یا متن نباشه
        toast.textContent =
          "❌ Failed to read clipboard. Please copy some text first.";
        toast.className = "toast show error";
        console.error("Clipboard error:", err);
      }

      // مخفی کردن توست بعد از 3 ثانیه
      setTimeout(() => {
        toast.className = "toast";
      }, 3000);
    });
  }
});

// ============================================
// اثر انگشت مخفی برای اثبات مالکیت
// ============================================
console.log(
  "%c⚠️ PathForge is protected by copyright!",
  "font-size: 20px; color: #f87171; font-weight: bold;",
);
console.log(
  "%c© 2026 Yasin. Unauthorized copying or claiming ownership is strictly prohibited.",
  "font-size: 14px; color: #e5e7eb;",
);
console.log(
  "%cIf you see this in someone else's app, they have stolen this code!",
  "font-size: 14px; color: #38bdf8; font-weight: bold;",
);
