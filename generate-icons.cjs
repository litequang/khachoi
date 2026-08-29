const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb" />
  <path d="M152 268l74 74L360 170" fill="none" stroke="#ffffff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#2563eb" />
  <path d="M152 268l74 74L360 170" fill="none" stroke="#ffffff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

// Also a favicon with a transparent background
const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#2563eb" />
  <path d="M152 268l74 74L360 170" fill="none" stroke="#ffffff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

const publicDir = path.join(__dirname, 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Write the main SVG
fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg.trim());

async function generate() {
  // standard
  await sharp(Buffer.from(standardSvg.trim()))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
    
  await sharp(Buffer.from(standardSvg.trim()))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
    
  // maskable
  await sharp(Buffer.from(maskableSvg.trim()))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-192.png'));
    
  await sharp(Buffer.from(maskableSvg.trim()))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
    
  // apple-touch-icon
  await sharp(Buffer.from(standardSvg.trim()))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
    
  // favicon (create a 64x64 PNG and just write it as .ico - it usually works, but if not we can use png)
  // standard practice: write as .ico, browsers read the PNG magic bytes anyway
  await sharp(Buffer.from(standardSvg.trim()))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Icons generated successfully.');
}

generate().catch(console.error);
