# StructureToBAT

A Windows desktop application that converts a folder tree structure into a `.bat` file.

## Technology

- Electron
- HTML
- CSS
- JavaScript
- Node.js

## Requirements

- Windows
- Node.js 18+ recommended
- npm

## Install

Open CMD or PowerShell in the project directory:

```bash
npm install
```

## Run

```bash
npm start
```

## Build Windows EXE

```bash
npm run build
```

The generated installer will be placed in:

```text
dist/
```

## How it works

Paste a tree structure such as:

```text
my-project/
├── src/
│   ├── app.js
│   └── style.css
├── public/
│   └── images/
└── package.json
```

Then click **Generate**.

The app generates a Windows batch file that creates the same folders and empty files.

## Important

The parser determines files primarily from their extensions. Names such as `README`, `LICENSE`, `Dockerfile`, `.gitignore`, and `.env` are also treated as files.

For the most reliable result, use standard tree output similar to:

```text
├── folder/
│   └── file.js
└── package.json
```
