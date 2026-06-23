const fs = require('fs');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;

const logoPath = `M 99.678 41.656 C 99.305 42.028, 99 52.946, 99.001 65.917 L 99.001 89.500 94.251 89.198 C 77.657 88.141, 69.020 108.566, 83.316 115.057 C 88.585 117.449, 93.384 117.468, 98.500 115.119 C 107.727 110.882, 108.900 107.082, 108.956 81.250 C 108.980 70.112, 109.338 61.004, 109.750 61.009 C 110.162 61.015, 112.881 62.384, 115.791 64.053 C 123.045 68.213, 125.213 71.900, 124.740 79.272 C 124.524 82.629, 124.766 84.911, 125.316 84.728 C 125.837 84.554, 127.667 82.475, 129.382 80.108 C 132.188 76.234, 132.500 75.080, 132.500 68.574 C 132.500 58.428, 130.510 56.063, 115.314 48.147 C 102.198 41.314, 100.658 40.675, 99.678 41.656 M 83.416 58.956 C 76.130 61.549, 71.149 64.963, 65.281 71.383 C 47.653 90.671, 54.407 121.772, 78.725 133.291 C 84.872 136.202, 86.381 136.500, 95 136.500 C 103.591 136.500, 105.139 136.197, 111.180 133.335 C 120.477 128.931, 126.267 123.262, 130.765 114.160 C 134.304 107.001, 134.500 106.093, 134.500 96.885 C 134.500 91.540, 134.194 86.860, 133.819 86.486 C 133.445 86.111, 131.757 86.621, 130.069 87.618 C 127.164 89.334, 127 89.766, 127 95.681 C 127 119.995, 103.998 135.368, 81.863 125.846 C 75.639 123.168, 67.767 114.700, 65.606 108.357 C 63.167 101.200, 63.510 90.595, 66.378 84.435 C 70.855 74.820, 77.384 69.207, 87.836 65.984 C 93.242 64.317, 93.514 64.073, 93.810 60.619 C 94.101 57.231, 93.941 57.005, 91.310 57.073 C 89.765 57.113, 86.212 57.960, 83.416 58.956`;

const publicDir = 'd:\\AntiGravity\\public';

const defs = `
  <defs>
    <!-- Brand Gradient -->
    <linearGradient id="brand" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF5E00" />
      <stop offset="100%" stop-color="#E100FF" />
    </linearGradient>
    
    <!-- Premium Glow -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComponentTransfer in="blur" result="glowLayer">
        <feFuncA type="linear" slope="0.6"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="glowLayer"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
`;

async function generate() {
  // Transparent Icon (Unchanged, 192x192 viewBox with glow)
  const svgTransparent = `
    <svg width="512" height="512" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      ${defs}
      <g filter="url(#glow)">
        <path d="${logoPath}" fill="url(#brand)" />
      </g>
    </svg>
  `;

  // Favicon SVG (Tightly cropped, no glow to ensure maximum clarity at 16x16)
  // Bounding box of path is approx 47 to 134 in X, and 41 to 136 in Y.
  // Using viewBox="44 38 90 98" to perfectly frame the logo with ~2px margin.
  const svgFavicon = `
    <svg width="256" height="256" viewBox="45 39 90 98" xmlns="http://www.w3.org/2000/svg">
      ${defs}
      <path d="${logoPath}" fill="url(#brand)" />
    </svg>
  `;
  const iconBuf = Buffer.from(svgFavicon);

  // Favicons
  await sharp(iconBuf).resize(16, 16).png().toFile(`${publicDir}\\favicon-16x16.png`);
  await sharp(iconBuf).resize(32, 32).png().toFile(`${publicDir}\\favicon-32x32.png`);
  
  // Favicon ICO
  const icoBuf = await pngToIco([`${publicDir}\\favicon-16x16.png`, `${publicDir}\\favicon-32x32.png`]);
  fs.writeFileSync(`${publicDir}\\favicon.ico`, icoBuf);

  // PWA Glass Icons (Unchanged)
  const svgGlass = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      ${defs}
      <rect x="32" y="32" width="448" height="448" rx="100" fill="#121216" stroke="rgba(255,255,255,0.08)" stroke-width="4" />
      <path d="M 132 32 L 380 32 C 435.228 32 480 76.772 480 132 L 480 180 C 480 120 400 36 256 36 C 112 36 32 120 32 180 L 32 132 C 32 76.772 76.772 32 132 32 Z" fill="rgba(255,255,255,0.05)" />
      <g transform="translate(64, 64) scale(2)" filter="url(#glow)">
        <path d="${logoPath}" fill="url(#brand)" />
      </g>
    </svg>
  `;
  await sharp(Buffer.from(svgGlass)).resize(192, 192).png().toFile(`${publicDir}\\pwa-192x192.png`);
  await sharp(Buffer.from(svgGlass)).png().toFile(`${publicDir}\\pwa-512x512.png`);

  // Sidebar Wordmark SVG (Unchanged)
  const svgWordmark = `<svg width="220" height="48" viewBox="0 0 220 48" xmlns="http://www.w3.org/2000/svg">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600&amp;display=swap');
    .text { 
      font-family: 'Inter', sans-serif; 
      font-weight: 600; 
      font-size: 26px; 
      fill: #FFFFFF;
      letter-spacing: -0.01em;
    }
  </style>
  ${defs}
  <g transform="translate(0, 0) scale(0.25)" filter="url(#glow)">
    <path d="${logoPath}" fill="url(#brand)" />
  </g>
  <text x="56" y="33" class="text">TuneHina</text>
</svg>`;

  fs.writeFileSync(`${publicDir}\\sidebar-logo.svg`, svgWordmark);
  fs.writeFileSync(`${publicDir}\\icon-transparent.svg`, svgTransparent);

  console.log('Favicons tightly cropped and all assets generated!');
}

generate().catch(console.error);
