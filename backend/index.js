const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const archiver = require('archiver');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/output', express.static(path.join(__dirname, 'output')));

const corsOptions = {
  origin: '*',
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));

// Ensure uploads/ and output/ folders exist
['uploads', 'output'].forEach(folder => {
  const dirPath = path.join(__dirname, folder);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
});

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

app.post('/resize', upload.array('images'), async (req, res) => {
  try {
    const files = req.files;
    const width = parseInt(req.body.width);
    const height = parseInt(req.body.height);

    if (!files?.length) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    if (isNaN(width) || isNaN(height)) {
      return res.status(400).json({ message: 'Invalid width or height' });
    }

    const resizedFiles = [];

    for (const file of files) {
      const originalName = path.parse(file.originalname).name;
      const extension = path.extname(file.originalname);
    
      const now = new Date();
    
      const pad = (n) => n.toString().padStart(2, '0');
      const formattedTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
      const outputFileName = `${originalName}_${formattedTimestamp}${extension}`;
      const outputPath = path.join(__dirname, 'output', outputFileName);
    
      await sharp(file.path)
        .resize(width, height)
        .toFile(outputPath);
    
      resizedFiles.push({ path: outputPath, name: outputFileName });
    }

    // Return a single image file directly
    if (resizedFiles.length === 1) {
      const file = resizedFiles[0];
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      return res.download(file.path);
    }    

    // Return a .zip for multiple files
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const formattedTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const zipName = `resized_${formattedTimestamp}.zip`;
    const zipPath = path.join(__dirname, 'output', zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip');
    // // Handle archive errors
    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    for (const file of resizedFiles) {
      archive.file(file.path, { name: file.name });
    }

    output.on('close', () => {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
      res.download(zipPath, (err) => {
        if (err) {
          console.error('Download failed:', err);
        } else {
          console.log('Download completed.');
        }
      });
    });
    

    await archive.finalize();

  } catch (err) {
    console.error('Resize error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
