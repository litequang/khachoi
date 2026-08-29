const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create high-res SVG for standard app icon
const appIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background rounded rectangle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Clipboard body / Document card -->
  <g filter="url(#dropShadow)">
    <rect x="116" y="106" width="280" height="320" rx="36" fill="#ffffff" />
    
    <!-- Top clip -->
    <rect x="186" y="80" width="140" height="52" rx="22" fill="#1e40af" />
    <circle cx="256" cy="106" r="12" fill="#ffffff" />
    
    <!-- Checkmark & Task lines -->
    <path d="M176 216 L224 264 L336 152" fill="none" stroke="#2563eb" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
    
    <line x1="176" y1="310" x2="336" y2="310" stroke="#94a3b8" stroke-width="24" stroke-linecap="round" />
    <line x1="176" y1="360" x2="280" y2="360" stroke="#cbd5e1" stroke-width="24" stroke-linecap="round" />
  </g>
</svg>
`;

// Maskable SVG with safe-area margins (fill 100% of canvas with background)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Full canvas background for maskable -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Center content scaled to fit within 65% safe zone -->
  <g transform="translate(64, 64) scale(0.75)" filter="url(#dropShadow)">
    <rect x="116" y="106" width="280" height="320" rx="36" fill="#ffffff" />
    <rect x="186" y="80" width="140" height="52" rx="22" fill="#1e40af" />
    <circle cx="256" cy="106" r="12" fill="#ffffff" />
    
    <path d="M176 216 L224 264 L336 152" fill="none" stroke="#2563eb" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="176" y1="310" x2="336" y2="310" stroke="#94a3b8" stroke-width="24" stroke-linecap="round" />
    <line x1="176" y1="360" x2="280" y2="360" stroke="#cbd5e1" stroke-width="24" stroke-linecap="round" />
  </g>
</svg>
`;

/**
 * Creates a valid multi-image ICO binary buffer from an array of PNG buffers.
 */
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  // Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  // Directory entries: 16 bytes each
  const dirSize = 16 * count;
  let offset = 6 + dirSize;
  const dirBuffers = [];

  for (const item of pngBuffers) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    dir.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    dir.writeUInt8(0, 2); // Color palette
    dir.writeUInt8(0, 3); // Reserved
    dir.writeUInt16LE(1, 4); // Color planes
    dir.writeUInt16LE(32, 6); // Bits per pixel
    dir.writeUInt32LE(item.buffer.length, 8); // Size
    dir.writeUInt32LE(offset, 12); // Offset

    offset += item.buffer.length;
    dirBuffers.push(dir);
  }

  return Buffer.concat([header, ...dirBuffers, ...pngBuffers.map(p => p.buffer)]);
}

async function run() {
  const publicDir = path.join(__dirname, 'public');
  const iconsDir = path.join(publicDir, 'icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Write SVGs
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), appIconSvg.trim());
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), appIconSvg.trim());

  const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 384, 512];
  const pngMap = {};

  for (const size of sizes) {
    const buf = await sharp(Buffer.from(appIconSvg.trim()))
      .resize(size, size)
      .png()
      .toBuffer();
    pngMap[size] = buf;

    // Save to /public/icons/
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), buf);
  }

  // Save specific named PNGs in /public/ and /public/icons/
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngMap[192]);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pngMap[512]);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngMap[180]);
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), pngMap[180]);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), pngMap[16]);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), pngMap[32]);
  fs.writeFileSync(path.join(iconsDir, 'favicon-16x16.png'), pngMap[16]);
  fs.writeFileSync(path.join(iconsDir, 'favicon-32x32.png'), pngMap[32]);

  // Maskable icons
  const maskable192 = await sharp(Buffer.from(maskableSvg.trim())).resize(192, 192).png().toBuffer();
  const maskable512 = await sharp(Buffer.from(maskableSvg.trim())).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), maskable192);
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), maskable512);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-192.png'), maskable192);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), maskable512);

  // Generate real multi-size binary ICO containing 16, 32, 48, 64 sizes
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: pngMap[16] },
    { width: 32, height: 32, buffer: pngMap[32] },
    { width: 48, height: 48, buffer: pngMap[48] },
    { width: 64, height: 64, buffer: pngMap[64] }
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(iconsDir, 'favicon.ico'), icoBuffer);

  console.log('All icons generated successfully with valid ICO format and multiple sizes!');
}

run().catch(console.error);
