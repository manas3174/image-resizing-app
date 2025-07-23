const express = require('express');
const multer = require('multer');
const cors = require('cors');
const xml2js = require('xml2js');
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

async function resizeSvg(filePath, width, height, outputPath) {
  const svgContent = fs.readFileSync(filePath, 'utf-8');

  const parser = new xml2js.Parser();
  const builder = new xml2js.Builder();

  const svgObj = await parser.parseStringPromise(svgContent);

  if (svgObj.svg) {
    svgObj.svg.$ = svgObj.svg.$ || {};
    svgObj.svg.$.width = width;
    svgObj.svg.$.height = height;

    if (!svgObj.svg.$.viewBox) {
      svgObj.svg.$.viewBox = `0 0 ${width} ${height}`;
    }

    const updatedSvg = builder.buildObject(svgObj);
    fs.writeFileSync(outputPath, updatedSvg);
  }
}


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
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const formattedTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    for (const file of files) {
      const originalName = path.parse(file.originalname).name;
      const extension = path.extname(file.originalname).toLowerCase();
      const outputFileName = `${originalName}_${formattedTimestamp}${extension}`;
      const outputPath = path.join(__dirname, 'output', outputFileName);

      if (extension === '.svg') {
        // outputFileName = `${originalName}_${formattedTimestamp}.svg`;
        // outputPath = path.join(__dirname, 'output', outputFileName);
      
        await resizeSvg(file.path, width, height, outputPath);
      }
      else {
        await sharp(file.path)
          .resize(width, height)
          .toFile(outputPath);
      }

      resizedFiles.push({ path: outputPath, name: outputFileName });
    }

    // If single file, return directly
    if (resizedFiles.length === 1) {
      const file = resizedFiles[0];
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      return res.download(file.path);
    }

    // If multiple, zip the files
    const zipName = `resized_${formattedTimestamp}.zip`;
    const zipPath = path.join(__dirname, 'output', zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip');

    archive.on('error', (err) => { throw err; });
    archive.pipe(output);

    for (const file of resizedFiles) {
      archive.file(file.path, { name: file.name });
    }

    output.on('close', () => {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
      res.download(zipPath, (err) => {
        if (err) console.error('Download failed:', err);
        else console.log('Download completed.');
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
