const fs = require('fs');
const path = require('path');

// Create simple SVG images and convert to PNG-compatible format
// For Selenium testing, we'll create minimal valid image files

const createTestImage = (filename, width, height, label, color) => {
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${color}"/>
  <text x="50%" y="50%" font-family="Arial" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;

    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, svg);
    console.log(`Created: ${filepath}`);
};

// Create logo (200x200)
createTestImage('logo.svg', 200, 200, 'LOGO', '#2563eb');

// Create 5 test images (800x600)
const colors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
for (let i = 1; i <= 5; i++) {
    createTestImage(`image${i}.svg`, 800, 600, `IMAGE ${i}`, colors[i - 1]);
}

console.log('\nTest assets created successfully!');
console.log('Note: SVG files can be used directly with Selenium file uploads.');
