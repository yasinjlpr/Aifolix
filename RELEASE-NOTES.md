# StructureToBAT - Optimized Build

## Fixed

- Added a native Windows-style right-click context menu.
- Copy, Cut, Paste and Select All now work in editable fields.
- Copy also works from the generated BAT output.
- Added a clipboard fallback for restricted clipboard environments.
- Preserved normal Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+A behavior.
- Improved text selection in the generated output.
- Reduced unnecessary DOM rebuilding in the preview.
- Added safer file reading/writing behavior.
- Improved parser consistency between the renderer and Electron main process.
- Improved window startup behavior.

## Run

```bash
npm install
npm start
```

## Build

```bash
npm run build
```
