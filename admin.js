const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'temp_uploads/' });

// Enable form data parsing for the Edit and Delete buttons
app.use(express.urlencoded({ extended: true }));

// Allow the admin portal to display the actual images
app.use('/photos', express.static(path.join(__dirname, 'photos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

// Ensure destination folders exist
['photos', 'thumbnails'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Helper functions to read JSON safely
const getPhotos = () => fs.existsSync('photos.json') ? JSON.parse(fs.readFileSync('photos.json')) : [];
const getThumbs = () => fs.existsSync('thumbnails.json') ? JSON.parse(fs.readFileSync('thumbnails.json')) : {};

// 1. The Admin Interface & Dashboard
app.get('/', (req, res) => {
    const photos = getPhotos();
    const thumbs = getThumbs();

    // Generate the HTML for the existing gallery list
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
                    <input type="file" name="photo" accept="image/*" required style="padding: 10px; background: #1a1a24; border-radius: 8px; color: white;">
                    <input type="text" name="title" placeholder="Photo Title" required style="padding: 15px; border-radius: 8px; border: none; background: #1a1a24; color: white;">
                    <select name="category" required style="padding: 15px; border-radius: 8px; border: none; background: #1a1a24; color: white;">
                        <option value="nature">Nature</option>
                        <option value="furry">Furry</option>
                        <option value="other">Other</option>
                    </select>
                    <button type="submit" style="padding: 15px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem; margin-top: 10px;">Upload to Gallery</button>

                </form>

                <h3 style="color: #f8fafc; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">Manage Gallery (${photos.length} Photos)</h3>
                ${galleryHtml}
            </body>
        </html>
    `);
});

// 2. The Upload Processor
app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        const title = req.body.title;
        const category = req.body.category;
        const file = req.file;
        const filename = Date.now() + '.jpg';
        
        const originalPath = path.join('photos', filename);
        const thumbPath = path.join('thumbnails', filename);

        await sharp(file.path).jpeg({ quality: 85 }).toFile(originalPath);
        await sharp(file.path).resize(600, 600, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbPath);
        fs.unlinkSync(file.path);

        let photos = getPhotos();
        photos.unshift({ src: 'photos/' + filename, title: title, category: category, alt: title });
        fs.writeFileSync('photos.json', JSON.stringify(photos, null, 4));

        let thumbs = getThumbs();
        thumbs['photos/' + filename] = 'thumbnails/' + filename;
        fs.writeFileSync('thumbnails.json', JSON.stringify(thumbs, null, 4));

        res.redirect('/'); // Instantly reloads the page to show the new photo
    } catch (err) {
        res.status(500).send('<h2 style="color: red;">Error uploading: ' + err.message + '</h2>');
    }
});

// 3. The Edit Route
app.post('/edit', (req, res) => {
    try {
        const src = req.body.src;
        const newTitle = req.body.title;
        const newCategory = req.body.category;
        
        let photos = getPhotos();
        const photoIndex = photos.findIndex(p => p.src === src);
        
        if (photoIndex !== -1) {
            photos[photoIndex].title = newTitle;
            photos[photoIndex].alt = newTitle; // Update alt text for accessibility
            photos[photoIndex].category = newCategory;
            fs.writeFileSync('photos.json', JSON.stringify(photos, null, 4));
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send('<h2 style="color: red;">Error saving edit: ' + err.message + '</h2>');
    }
});

// 4. The Delete Route
app.post('/delete', (req, res) => {
    try {
        const src = req.body.src;
        
        // Remove from photos.json
        let photos = getPhotos();
        photos = photos.filter(p => p.src !== src);
        fs.writeFileSync('photos.json', JSON.stringify(photos, null, 4));

        // Get thumb path and remove from thumbnails.json
        let thumbs = getThumbs();
        const thumbSrc = thumbs[src];
        delete thumbs[src];
        fs.writeFileSync('thumbnails.json', JSON.stringify(thumbs, null, 4));

        // Delete the physical .jpg files from the folders
        if (fs.existsSync(src)) fs.unlinkSync(src);
        if (thumbSrc && fs.existsSync(thumbSrc)) fs.unlinkSync(thumbSrc);

        res.redirect('/');
    } catch (err) {
        res.status(500).send('<h2 style="color: red;">Error deleting: ' + err.message + '</h2>');
    }
});

app.listen(3000, () => console.log('Upload portal is live at http://localhost:3000'));
