const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const MAX_FILE_BYTES = 5000 * 1024 * 1024; // 5GB
const MAX_FILES = 2000;

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Reject absolute paths, NUL bytes, and any ".." segment, then confirm the
// resolved path still sits inside uploads/. Busboy only keeps this path when
// multer is created with preservePath: true.
function safeRelativePath(originalName) {
  if (typeof originalName !== 'string' || originalName.length === 0) {
    throw new Error('Missing filename');
  }
  if (originalName.includes('\0')) {
    throw new Error('Invalid path');
  }

  const slashNormalized = originalName.replace(/\\/g, '/');
  if (path.posix.isAbsolute(slashNormalized) || path.win32.isAbsolute(originalName)) {
    throw new Error('Invalid path');
  }

  const parts = slashNormalized.split('/');
  if (parts.some((part) => part === '..')) {
    throw new Error('Invalid path');
  }

  const cleaned = parts.filter((part) => part && part !== '.');
  if (cleaned.length === 0) {
    throw new Error('Invalid path');
  }

  const relative = cleaned.join(path.sep);
  const root = path.resolve(uploadDir);
  const dest = path.resolve(root, relative);
  const rel = path.relative(root, dest);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Invalid path');
  }
  return relative;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    try {
      const relative = file.safeRelativePath || safeRelativePath(file.originalname);
      const full = path.resolve(uploadDir, relative);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      cb(null, relative);
    } catch (err) {
      cb(err);
    }
  }
});

const upload = multer({
  storage: storage,
  preservePath: true,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_FILES
  },
  fileFilter: (req, file, cb) => {
    try {
      file.safeRelativePath = safeRelativePath(file.originalname);
      cb(null, true);
    } catch (err) {
      cb(err);
    }
  }
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>File Upload</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
        }
        .drop-zone {
          border: 3px dashed #ccc;
          padding: 48px 24px;
          border-radius: 8px;
          text-align: center;
          background-color: #f9f9f9;
          transition: border-color 0.2s ease, background-color 0.2s ease;
          cursor: pointer;
        }
        .drop-zone:hover,
        .drop-zone:focus-visible {
          border-color: #4CAF50;
          background-color: #f0f8f0;
          outline: none;
        }
        .drop-zone.dragover {
          border-color: #4CAF50;
          background-color: #e8f5e9;
        }
        .drop-zone.reading {
          cursor: progress;
        }
        .drop-zone-icon {
          font-size: 48px;
          color: #4CAF50;
          margin-bottom: 10px;
        }
        .drop-zone-text {
          font-size: 18px;
          color: #555;
          margin-bottom: 10px;
        }
        .drop-zone-hint,
        .drop-zone-limit {
          font-size: 14px;
          color: #888;
        }
        .folder-btn {
          background: none;
          border: none;
          color: #2e7d32;
          font-size: 14px;
          cursor: pointer;
          text-decoration: underline;
          padding: 8px;
          margin: 4px 0;
        }
        .folder-btn:hover {
          color: #1b5e20;
        }
        input[type="file"] {
          display: none;
        }
        .file-info {
          margin: 20px 0;
          padding: 15px;
          background-color: #e3f2fd;
          border-radius: 4px;
          display: none;
        }
        .file-info.show {
          display: block;
        }
        .file-summary {
          margin-bottom: 8px;
        }
        .file-list {
          max-height: 240px;
          overflow: auto;
        }
        .file-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
          padding: 4px 0;
          border-bottom: 1px solid #d0e6f7;
        }
        .file-row .path {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .file-row .size {
          flex: none;
          color: #555;
        }
        #uploadBtn {
          background-color: #4CAF50;
          color: white;
          padding: 12px 40px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 10px;
          display: none;
        }
        #uploadBtn.show {
          display: inline-block;
        }
        #uploadBtn:hover {
          background-color: #45a049;
        }
        #uploadBtn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .message {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
          white-space: pre-line;
        }
        .success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .warning {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeeba;
        }
        #progress {
          width: 100%;
          height: 25px;
          margin-top: 15px;
          display: none;
          border-radius: 4px;
        }
        .progress-text {
          margin-top: 5px;
          font-size: 14px;
          color: #666;
        }
        @media (max-width: 640px) {
          body {
            margin: 16px auto;
            padding: 12px;
          }
          .drop-zone {
            padding: 32px 16px;
          }
        }
      </style>
    </head>
    <body>
      <h1>Upload Files</h1>

      <div class="drop-zone" id="dropZone" tabindex="0">
        <div class="drop-zone-icon">📁</div>
        <div class="drop-zone-text" id="dropZoneText">Drag and drop files or a folder</div>
        <div class="drop-zone-hint">or click to browse files</div>
        <button type="button" class="folder-btn" id="folderBtn">choose a folder</button>
        <div class="drop-zone-limit">Max 5GB each, up to ${MAX_FILES} files</div>
      </div>

      <input type="file" id="fileInput" multiple>
      <input type="file" id="folderInput" webkitdirectory>

      <div class="file-info" id="fileInfo">
        <div class="file-summary" id="fileSummary"></div>
        <div class="file-list" id="fileList"></div>
      </div>

      <button type="button" id="uploadBtn">Upload</button>
      <progress id="progress" value="0" max="100"></progress>
      <div class="progress-text" id="progressText"></div>
      <div id="message"></div>

      <script>
        const MAX_FILES = ${MAX_FILES};
        const MAX_FILE_BYTES = ${MAX_FILE_BYTES};

        const dropZone = document.getElementById('dropZone');
        const dropZoneText = document.getElementById('dropZoneText');
        const fileInput = document.getElementById('fileInput');
        const folderInput = document.getElementById('folderInput');
        const folderBtn = document.getElementById('folderBtn');
        const fileInfo = document.getElementById('fileInfo');
        const fileSummary = document.getElementById('fileSummary');
        const fileList = document.getElementById('fileList');
        const uploadBtn = document.getElementById('uploadBtn');
        const messageDiv = document.getElementById('message');
        const progressBar = document.getElementById('progress');
        const progressText = document.getElementById('progressText');

        let selectedFiles = [];
        let dragDepth = 0;
        let readGeneration = 0;
        let reading = false;

        dropZone.addEventListener('click', (e) => {
          if (e.target.closest('#folderBtn')) return;
          if (reading) return;
          fileInput.click();
        });

        dropZone.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!reading) fileInput.click();
          }
        });

        folderBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!reading) folderInput.click();
        });

        fileInput.addEventListener('change', () => {
          const items = [];
          for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            items.push({ file: file, relativePath: file.name });
          }
          fileInput.value = '';
          if (!items.length) return;
          acceptSelection(items, { emptyFolder: false, truncated: false });
        });

        folderInput.addEventListener('change', () => {
          const items = [];
          for (let i = 0; i < folderInput.files.length; i++) {
            const file = folderInput.files[i];
            items.push({
              file: file,
              relativePath: file.webkitRelativePath || file.name
            });
          }
          folderInput.value = '';
          if (!items.length) {
            acceptSelection(items, { emptyFolder: true, truncated: false });
            return;
          }
          acceptSelection(items, { emptyFolder: false, truncated: false });
        });

        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => {
          if (!e.target.closest || !e.target.closest('#dropZone')) e.preventDefault();
        });

        dropZone.addEventListener('dragenter', (e) => {
          e.preventDefault();
          dragDepth++;
          dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });

        dropZone.addEventListener('dragleave', () => {
          dragDepth--;
          if (dragDepth <= 0) {
            dragDepth = 0;
            dropZone.classList.remove('dragover');
          }
        });

        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dragDepth = 0;
          dropZone.classList.remove('dragover');
          handleDrop(e.dataTransfer);
        });

        function readAllEntries(reader) {
          return new Promise((resolve, reject) => {
            const all = [];
            // readEntries returns at most 100 entries per call.
            const readBatch = () => {
              reader.readEntries((entries) => {
                if (!entries.length) {
                  resolve(all);
                } else {
                  for (let i = 0; i < entries.length; i++) all.push(entries[i]);
                  readBatch();
                }
              }, reject);
            };
            readBatch();
          });
        }

        function fileFromEntry(entry) {
          return new Promise((resolve, reject) => {
            entry.file(resolve, reject);
          });
        }

        async function walkEntry(entry, prefix, state) {
          if (state.truncated) return;
          if (entry.isFile) {
            const relativePath = prefix + entry.name;
            const file = await fileFromEntry(entry);
            if (file.size > MAX_FILE_BYTES) {
              state.skipped.push(relativePath);
              return;
            }
            if (state.items.length >= MAX_FILES) {
              state.truncated = true;
              return;
            }
            state.items.push({ file: file, relativePath: relativePath });
          } else if (entry.isDirectory) {
            state.sawDirectory = true;
            const reader = entry.createReader();
            const entries = await readAllEntries(reader);
            const nextPrefix = prefix + entry.name + '/';
            for (let i = 0; i < entries.length; i++) {
              if (state.truncated) return;
              await walkEntry(entries[i], nextPrefix, state);
            }
          }
        }

        async function handleDrop(dataTransfer) {
          const generation = ++readGeneration;
          const itemsApi = dataTransfer && dataTransfer.items;
          const entries = [];
          let canWalk = false;

          if (itemsApi && itemsApi.length) {
            for (let i = 0; i < itemsApi.length; i++) {
              const item = itemsApi[i];
              if (item.kind && item.kind !== 'file') continue;
              if (item.webkitGetAsEntry) {
                const entry = item.webkitGetAsEntry();
                if (entry) entries.push(entry);
              }
            }
            canWalk = entries.length > 0;
          }

          if (!canWalk) {
            const flat = [];
            const files = dataTransfer && dataTransfer.files;
            if (files) {
              for (let i = 0; i < files.length; i++) {
                flat.push({ file: files[i], relativePath: files[i].name });
              }
            }
            acceptSelection(flat, { emptyFolder: false, truncated: false });
            return;
          }

          setReading(true);
          const state = { items: [], skipped: [], truncated: false, sawDirectory: false };
          try {
            for (let i = 0; i < entries.length; i++) {
              await walkEntry(entries[i], '', state);
            }
            if (generation !== readGeneration) return;
            const skippedNotes = notesForSkipped(state.skipped);
            acceptSelection(state.items, {
              emptyFolder: state.sawDirectory && state.items.length === 0 && state.skipped.length === 0,
              truncated: state.truncated,
              extraNotes: skippedNotes
            });
          } catch (err) {
            if (generation !== readGeneration) return;
            showMessage('error', 'Could not read the dropped items');
          } finally {
            if (generation === readGeneration) setReading(false);
          }
        }

        function notesForSkipped(skipped) {
          if (!skipped.length) return [];
          const shown = skipped.slice(0, 8);
          let text = 'Skipped ' + skipped.length + ' file' + (skipped.length === 1 ? '' : 's') + ' over 5GB: ' + shown.join(', ');
          if (skipped.length > shown.length) {
            text += ', and ' + (skipped.length - shown.length) + ' more';
          }
          return [text];
        }

        function duplicatePaths(items) {
          const seen = Object.create(null);
          const dupes = [];
          for (let i = 0; i < items.length; i++) {
            const rel = items[i].relativePath;
            if (seen[rel] && dupes.indexOf(rel) === -1) dupes.push(rel);
            seen[rel] = true;
          }
          return dupes;
        }

        function acceptSelection(items, options) {
          clearMessage();
          const skipped = [];
          const accepted = [];
          let extra = 0;
          for (let i = 0; i < items.length; i++) {
            if (items[i].file.size > MAX_FILE_BYTES) {
              skipped.push(items[i].relativePath);
              continue;
            }
            if (accepted.length >= MAX_FILES) {
              extra++;
              continue;
            }
            accepted.push(items[i]);
          }

          selectedFiles = accepted;
          renderSelection();

          const notes = (options.extraNotes || []).concat(notesForSkipped(skipped));
          if (options.truncated || extra > 0) {
            const leftover = extra > 0 ? String(extra) + ' more file' + (extra === 1 ? '' : 's') + ' were left out.' : 'Additional files were left out.';
            notes.push('Only the first ' + MAX_FILES + ' files were kept. ' + leftover);
          }
          const dupes = duplicatePaths(accepted);
          if (dupes.length) {
            notes.push('Duplicate paths will overwrite: ' + dupes.slice(0, 8).join(', '));
          }

          if (!accepted.length && !notes.length) {
            showMessage('error', options.emptyFolder ? 'That folder has no files' : 'Nothing to upload');
            return;
          }
          if (!notes.length) return;

          const onlyWarning = !skipped.length && !(options.extraNotes && options.extraNotes.length) && (dupes.length || options.truncated || extra > 0);
          showMessage(skipped.length || (options.extraNotes && options.extraNotes.length) ? 'error' : (onlyWarning ? 'warning' : 'error'), notes.join('\\n'));
        }

        function renderSelection() {
          fileList.textContent = '';
          if (!selectedFiles.length) {
            fileInfo.classList.remove('show');
            uploadBtn.classList.remove('show');
            fileSummary.textContent = '';
            return;
          }

          let total = 0;
          for (let i = 0; i < selectedFiles.length; i++) {
            const item = selectedFiles[i];
            total += item.file.size;
            const row = document.createElement('div');
            row.className = 'file-row';
            const pathEl = document.createElement('span');
            pathEl.className = 'path';
            pathEl.textContent = item.relativePath;
            pathEl.title = item.relativePath;
            const sizeEl = document.createElement('span');
            sizeEl.className = 'size';
            sizeEl.textContent = formatSize(item.file.size);
            row.appendChild(pathEl);
            row.appendChild(sizeEl);
            fileList.appendChild(row);
          }

          const noun = selectedFiles.length === 1 ? 'file' : 'files';
          fileSummary.textContent = selectedFiles.length + ' ' + noun + ' · ' + formatSize(total);
          uploadBtn.textContent = 'Upload ' + selectedFiles.length + ' ' + noun;
          fileInfo.classList.add('show');
          uploadBtn.classList.add('show');
        }

        function formatSize(bytes) {
          if (bytes < 1024) return bytes + ' B';
          if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
          if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
          return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }

        function setReading(isReading) {
          reading = isReading;
          dropZone.classList.toggle('reading', isReading);
          dropZoneText.textContent = isReading ? 'Reading folder…' : 'Drag and drop files or a folder';
          dropZone.setAttribute('aria-busy', isReading ? 'true' : 'false');
        }

        uploadBtn.addEventListener('click', uploadFiles);

        function uploadFiles() {
          if (!selectedFiles.length || reading) return;

          const formData = new FormData();
          for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files', selectedFiles[i].file, selectedFiles[i].relativePath);
          }

          clearMessage();
          progressBar.style.display = 'block';
          progressBar.value = 0;
          progressText.textContent = '0%';
          uploadBtn.disabled = true;

          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              progressBar.value = percentComplete;
              progressText.textContent = percentComplete.toFixed(1) + '%';
            }
          });

          xhr.addEventListener('load', () => {
            progressBar.style.display = 'none';
            progressText.textContent = '';
            uploadBtn.disabled = false;

            if (xhr.status === 200) {
              let response;
              try {
                response = JSON.parse(xhr.responseText);
              } catch (err) {
                showMessage('error', 'Upload failed');
                return;
              }
              const count = response.count;
              const noun = count === 1 ? 'file' : 'files';
              showMessage('success', 'Uploaded ' + count + ' ' + noun + ' (' + formatSize(response.totalSize) + ')');
              resetForm();
            } else {
              let errorText = 'Upload failed';
              try {
                const error = JSON.parse(xhr.responseText);
                if (error.error) errorText = error.error;
              } catch (err) {}
              showMessage('error', errorText);
            }
          });

          xhr.addEventListener('error', () => {
            progressBar.style.display = 'none';
            progressText.textContent = '';
            uploadBtn.disabled = false;
            showMessage('error', 'Network error occurred');
          });

          xhr.open('POST', '/upload');
          xhr.send(formData);
        }

        function showMessage(type, text) {
          messageDiv.className = 'message ' + type;
          messageDiv.textContent = text;
        }

        function clearMessage() {
          messageDiv.className = '';
          messageDiv.textContent = '';
        }

        function resetForm() {
          selectedFiles = [];
          fileInput.value = '';
          folderInput.value = '';
          renderSelection();
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/upload', upload.array('files', MAX_FILES), (req, res) => {
  try {
    const uploaded = req.files || [];
    if (uploaded.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const files = uploaded.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      path: file.path
    }));
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    res.json({
      message: 'Uploaded ' + files.length + (files.length === 1 ? ' file' : ' files'),
      count: files.length,
      totalSize: totalSize,
      files: files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5GB limit' });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Too many files (max ' + MAX_FILES + ')' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
  console.log('Upload directory: ' + path.resolve(uploadDir));
});
