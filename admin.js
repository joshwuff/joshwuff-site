const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'temp_uploads/' });

// Ensure destination folders exist
['photos', 'thumbnails'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// The Admin Interface
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="font-family: sans-serif; max-width: 500px; margin: 60px auto; background: #0d0d12; color: #fff;">
                <h2 style="color: #f8fafc; text-align: center;">Joshwuff Upload Portal</h2>
                <form action="/upload" method="POST" enctype="multipart/form-data" style="display: flex; flex-direction: column; gap: 15px; background: rgba(255,255,255,0.03); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
                    <input type="file" name="photo" accept="image/*" required style="padding: 10px; background: #1a1a24; border-radius: 8px; color: white;">
                    <input type="text" name="title" placeholder="Photo Title" required style="padding: 15px; border-radius: 8px; border: none; background: #1a1a24; color: white;">
                    <select name="category" required style="padding: 15px; border-radius: 8px; border: none; background: #1a1a24; color: white;">
                        <option value="nature">Nature</option>
                        <option value="furry">Furry</option>
                        <option value="other">Other</option>
                    </select>
                    <button type="submit" style="padding: 15px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem; margin-top: 10px;">Upload to Gallery</button>
                </form>
            </body>
        </html>
    `);
});

// The Upload Processor
app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        const { title, category } = req.body;
        const file = req.file;
        const filename = Date.now() + '.jpg'; 
        
        const originalPath = path.join('photos', filename);
        const thumbPath = path.join('thumbnails', filename);

        // Compress and save the original full-size image
        await sharp(file.path).jpeg({ quality: 85 }).toFile(originalPath);
        
        // Generate and save a cropped 600x600 thumbnail
        await sharp(file.path).resize(600, 600, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbPath);
        
        // Clean up the temporary upload file
        fs.unlinkSync(file.path);

        // Update photos.json
        const photosJsonPath = 'photos.json';
        let photos = fs.existsSync(photosJsonPath) ? JSON.parse(fs.readFileSync(photosJsonPath)) : [];
        photos.unshift({ src: `photos/${filename}`, title: title, category: category, alt: title });
        fs.writeFileSync(photosJsonPath, JSON.stringify(photos, null, 4));

        // Update thumbnails.json
        const thumbsJsonPath = 'thumbnails.json';
        let thumbs = fs.existsSync(thumbsJsonPath) ? JSON.parse(fs.readFileSync(thumbsJsonPath)) : {};
        thumbs[`photos/${filename}`] = `thumbnails/${filename}`;
        fs.writeFileSync(thumbsJsonPath, JSON.stringify(thumbs, null, 4));

        res.send('<body style="background: #0d0d12; color: #fff; text-align: center; margin-top: 100px; font-family: sans-serif;"><h2 style="color: #22c55e;">Photo Uploaded & Resized!</h2><a href="/" style="color: #ef4444; text-decoration: none; font-weight: bold;">Upload Another Photo</a></body>');
    } catch (err) {
        res.status(500).send('<h2 style="color: red;">Error processing upload: ' + err.message + '</h2>');
    }
});

app.listen(3000, () => console.log('Upload portal is live at http://localhost:3000'));
