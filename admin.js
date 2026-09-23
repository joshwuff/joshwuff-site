const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'temp_uploads/' });

app.use(express.urlencoded({ extended: true }));

app.use('/Photos', express.static(path.join(__dirname, 'Photos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

['Photos', 'thumbnails'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const getPhotos = () => fs.existsSync('photos.json') ? JSON.parse(fs.readFileSync('photos.json')) : [];
const getThumbs = () => fs.existsSync('thumbnails.json') ? JSON.parse(fs.readFileSync('thumbnails.json')) : {};

app.get('/', (req, res) => {
    const photos = getPhotos();
    const thumbs = getThumbs();

    let galleryHtml = photos.map(p => {
        const thumbPath = thumbs[p.src] || p.src;
        return `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; display: flex; gap: 15px; align-items: center; margin-bottom: 15px;">
            <img src="/${thumbPath}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
            <div style="flex-grow: 1;">
                <form action="/edit" method="POST" style="display: flex; gap: 10px; margin: 0; align-items: center;">
                    <input type="hidden" name="src" value="${p.src}">
                    <input type="text" name="title" value="${p.title}" required style="padding: 10px; border-radius: 8px; border: none; background: #1a1a24; color: white; flex-grow: 1;">
                    <select name="category" required style="padding: 10px; border-radius: 8px; border: none; background: #1a1a24; color: white;">
                        <option value="nature" ${p.category === 'nature' ? 'selected' : ''}>Nature</option>
                        <option value="furry" ${p.category === 'furry' ? 'selected' : ''}>Furry</option>
                        <option value="other" ${p.category === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                    <button type="submit" style="padding: 10px 15px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Save</button>
                </form>
            </div>
            <form action="/delete" method="POST" style="margin: 0;" onsubmit="return confirm('Are you absolutely sure you want to delete this photo?');">
                <input type="hidden" name="src" value="${p.src}">
                <button type="submit" style="padding: 10px 15px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Delete</button>
            </form>
        </div>
        `;
    }).join('');

    res.send(`
        <html>
            <head><title>Joshwuff Admin</title></head>
            <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; background: #0d0d12; color: #fff; padding: 20px;">
                <h2 style="color: #f8fafc; text-align: center;">Joshwuff Upload Portal</h2>
                
                <form action="/upload" method="POST" enctype="multipart/form-data" style="display: flex; flex-direction: column; gap: 15px; background: rgba(255,255,255,0.03); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 40px;">
                    <!-- Added 'multiple' so you can select a whole batch of photos -->
                    <input type="file" name="photos" accept="image/*" multiple required style="padding: 10px; background: #1a1a24; border-radius: 8px; color: white;">
                    <input type="text" name="title" placeholder="Photo Title (e.g., Megaplex 2026)" required style="padding: 15px; border-radius: 8px; border: none; background: #1a1a24; color: white;">
                    <select name="category" required style="padding: 15px; border-radius: 8px; border: none; background: #1a1a24; color: white;">
                        <option value="nature">Nature</option>
                        <option value="furry" selected>Furry</option>
                        <option value="other">Other</option>
                    </select>
                    <button type="submit" style="padding: 15px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem; margin-top: 10px;">Upload Batch to Gallery</button>
                </form>

                <h3 style="color: #f8fafc; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">Manage Gallery (${photos.length} Photos)</h3>
                ${galleryHtml}
            </body>
        </html>
    `);
});

// Batch Upload Processor
app.post('/upload', upload.array('photos', 50), async (req, res) => {
    try {
        const title = req.body.title;
        const category = req.body.category;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        let photos = getPhotos();
        let thumbs = getThumbs();

        for (const file of files) {
            // Generate a unique filename using timestamp and random suffix to prevent overlaps
            const filename = Date.now() + '-' + Math.round(Math.random() * 10000) + '.jpg';
            
            const originalPath = path.join('Photos', filename);
            const thumbPath = path.join('thumbnails', filename);

            await sharp(file.path).jpeg({ quality: 85 }).toFile(originalPath);
            await sharp(file.path).resize(600, 600, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbPath);
            fs.unlinkSync(file.path);

            const photoSrc = 'Photos/' + filename;

            photos.unshift({ src: photoSrc, title: title, category: category, alt: title });
            thumbs[photoSrc] = 'thumbnails/' + filename;
        }

        fs.writeFileSync('photos.json', JSON.stringify(photos, null, 4));
        fs.writeFileSync('thumbnails.json', JSON.stringify(thumbs, null, 4));

        res.redirect('/');
    } catch (err) {
        res.status(500).send('<h2 style="color: red;">Error uploading batch: ' + err.message + '</h2>');
    }
});

app.post('/edit', (req, res) => {
    try {
        const src = req.body.src;
        const newTitle = req.body.title;
        const newCategory = req.body.category;
        
        let photos = getPhotos();
        const photoIndex = photos.findIndex(p => p.src === src);
        
        if (photoIndex !== -1) {
            photos[photoIndex].title = newTitle;
            photos[photoIndex].alt = newTitle;
            photos[photoIndex].category = newCategory;
            fs.writeFileSync('photos.json', JSON.stringify(photos, null, 4));
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send('<h2 style="color: red;">Error saving edit: ' + err.message + '</h2>');
    }
});

app.post('/delete', (req, res) => {
    try {
        const src = req.body.src;
        
        let photos = getPhotos();
        photos = photos.filter(p => p.src !== src);
        fs.writeFileSync('photos.json', JSON.stringify(photos, null, 4));

        let thumbs = getThumbs();
        const thumbSrc = thumbs[src];
        delete thumbs[src];
        fs.writeFileSync('thumbnails.json', JSON.stringify(thumbs, null, 4));

        if (fs.existsSync(src)) fs.unlinkSync(src);
        if (thumbSrc && fs.existsSync(thumbSrc)) fs.unlinkSync(thumbSrc);

        res.redirect('/');
    } catch (err) {
        res.status(500).send('<h2 style="color: red;">Error deleting: ' + err.message + '</h2>');
    }
});

app.listen(3000, () => console.log('Upload portal is live at http://localhost:3000'));
