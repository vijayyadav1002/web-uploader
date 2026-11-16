# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install   # install dependencies
npm start     # start server on http://localhost:3000
```

No lint or test setup exists in this project.

## Architecture

Single-file Express server (`server.js`) with no separate frontend assets. The HTML, CSS, and client-side JavaScript are all rendered inline via `res.send()` in the `GET /` route.

**Key routes:**
- `GET /` — serves the full UI as an inline HTML string
- `POST /upload` — receives `multipart/form-data` via multer (`upload.array('files')`), saves each file under `./uploads/` using its relative path, returns JSON with the file list, count, and total size

**Dependencies:**
- `express` v5 — HTTP server
- `multer` v2 — multipart file handling; `diskStorage` to `./uploads/`, `preservePath` enabled, 5GB per file, 2,000 files per request

**Upload flow:** The drop zone accepts many files or a folder. Folder drops are walked with `webkitGetAsEntry` (calling `readEntries` until it returns an empty batch) and uploaded with their relative paths. Clicking the zone opens a multi-file picker; "choose a folder" uses a `webkitdirectory` input. The client posts one `XMLHttpRequest` (not fetch) to `/upload` so it can track aggregate progress via `xhr.upload.progress`. The progress bar and file list are shown and hidden with the `show` class. Filenames are checked with `safeRelativePath` so a path cannot write outside `uploads/`.

The `uploads/` directory is gitignored and auto-created on server start if missing. Nested folders from an upload are created on demand.
