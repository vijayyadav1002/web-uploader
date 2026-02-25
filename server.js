const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Create uploads directory if it doesn't exist
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep the original filename
    cb(null, file.originalname);
  }
});

// Configure multer with 5GB limit
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5000 * 1024 * 1024 // 5GB in bytes
  }
});

// Serve static HTML form
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>File Upload</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
        }
        .drop-zone {
          border: 3px dashed #ccc;
          padding: 60px;
          border-radius: 8px;
          text-align: center;
          background-color: #f9f9f9;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .drop-zone:hover {
          border-color: #4CAF50;
          background-color: #f0f8f0;
        }
        .drop-zone.dragover {
          border-color: #4CAF50;
          background-color: #e8f5e9;
          transform: scale(1.02);
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
        .drop-zone-hint {
          font-size: 14px;
          color: #888;
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
        button {
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
        button.show {
          display: inline-block;
        }
        button:hover {
          background-color: #45a049;
        }
        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .message {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
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
      </style>
    </head>
    <body>
      <h1>Upload File</h1>
      
      <div class="drop-zone" id="dropZone">
        <div class="drop-zone-icon">📁</div>
        <div class="drop-zone-text">Drag & Drop your file here</div>
        <div class="drop-zone-hint">or click to browse (Max 5GB)</div>
      </div>
      
      <input type="file" id="fileInput">
      
      <div class="file-info" id="fileInfo">
        <strong>Selected file:</strong> <span id="fileName"></span><br>
        <strong>Size:</strong> <span id="fileSize"></span>
      </div>
      
      <button id="uploadBtn">Upload File</button>
      <progress id="progress" value="0" max="100"></progress>
      <div class="progress-text" id="progressText"></div>
      <div id="message"></div>

      <script>
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const uploadBtn = document.getElementById('uploadBtn');
        const messageDiv = document.getElementById('message');
        const progressBar = document.getElementById('progress');
        const progressText = document.getElementById('progressText');
        
        let selectedFile = null;

        // Click to browse
        dropZone.addEventListener('click', () => {
          fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
          handleFile(e.target.files[0]);
        });

        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
          dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.classList.remove('dragover');
          
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            handleFile(files[0]);
          }
        });

        function handleFile(file) {
          messageDiv.innerHTML = '';
          
          if (!file) return;

          // Validate file size (5GB limit)
          if (file.size > 5000 * 1024 * 1024) {
            showMessage('error', 'File size exceeds 5GB limit');
            return;
          }

          selectedFile = file;
          fileName.textContent = file.name;
          fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
          fileInfo.classList.add('show');
          uploadBtn.classList.add('show');
        }

        uploadBtn.addEventListener('click', uploadFile);

        function uploadFile() {
          if (!selectedFile) return;

          const formData = new FormData();
          formData.append('file', selectedFile);

          messageDiv.innerHTML = '';
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
              const response = JSON.parse(xhr.responseText);
              showMessage('success', 
                '<strong>✓ Upload successful!</strong><br>' + 
                'File: ' + response.originalName + '<br>' +
                'Saved as: ' + response.filename + '<br>' +
                'Size: ' + (response.size / (1024 * 1024)).toFixed(2) + ' MB'
              );
              resetForm();
            } else {
              const error = JSON.parse(xhr.responseText);
              showMessage('error', '✗ ' + (error.error || 'Upload failed'));
            }
          });

          xhr.addEventListener('error', () => {
            progressBar.style.display = 'none';
            progressText.textContent = '';
            uploadBtn.disabled = false;
            showMessage('error', '✗ Network error occurred');
          });

          xhr.open('POST', '/upload');
          xhr.send(formData);
        }

        function showMessage(type, text) {
          messageDiv.className = 'message ' + type;
          messageDiv.innerHTML = text;
        }

        function resetForm() {
          selectedFile = null;
          fileInput.value = '';
          fileInfo.classList.remove('show');
          uploadBtn.classList.remove('show');
        }
      </script>
    </body>
    </html>
  `);
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5GB limit' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  
  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Upload directory: ${path.resolve(uploadDir)}`);
});