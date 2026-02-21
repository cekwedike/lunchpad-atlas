/**
 * Generates ATLAS PWA icons and favicon using Sharp (bundled with Next.js).
 * Run from the frontend/ directory: node generate-pwa-icons.mjs
 *
 * Design concept:
 *  - Deep navy-to-indigo gradient background (brand colour)
 *  - Bold geometric "A" in white  (ATLAS)
 *  - Gold five-pointed star in upper-right  (achievement / gamification)
 *  - Amber underline accent beneath the "A"  (momentum / LaunchPad)
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── SVG templates ───────────────────────────────────────────────────────────

/**
 * Full icon: gradient background + bold "A" + gold star + amber accent.
 * Designed on a 512×512 viewBox; Sharp renders + resizes to the target size.
 *
 * "A" anatomy (on 512×512 grid):
 *   Apex spans x 220-292 at y 108
 *   Left outer bottom:  (110, 445)   Left inner bottom:  (175, 445)
 *   Right inner bottom: (337, 445)   Right outer bottom: (402, 445)
 *   Crossbar: x 150-362, y 254-306
 *
 * Star: five-pointed, centre (376, 118), outer r=52, inner r=22
 *   Vertices computed with standard star polygon formula.
 */
const FULL_SVG = /* xml */ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <!-- Soft highlight in upper-left corner -->
    <radialGradient id="hl" cx="25%" cy="20%" r="55%">
      <stop offset="0%"   stop-color="#3b82f6" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#hl)"/>

  <!-- ── Bold geometric "A" ─────────────────────────────── -->
  <!-- Left leg -->
  <polygon points="220,108 256,108 175,445 110,445" fill="white"/>
  <!-- Right leg -->
  <polygon points="256,108 292,108 402,445 337,445" fill="white"/>
  <!-- Crossbar (horizontal rectangle bridging both legs) -->
  <rect x="150" y="254" width="212" height="52" fill="white" rx="4"/>

  <!-- ── Amber underline accent ─────────────────────────── -->
  <rect x="148" y="458" width="216" height="14" fill="#f59e0b" rx="7"/>

  <!-- ── Gold five-pointed star (upper-right) ───────────── -->
  <!--
    Centre (376, 118), outer r=52, inner r=22
    Outer vertices at angles: -90°, -18°, 54°, 126°, 198°
    Inner vertices at angles: -54°,  18°, 90°, 162°, 234°
    Computed: cos/sin in JS → rounded to 1 decimal
  -->
  <polygon
    points="376.0,66.0  388.9,100.2  425.4,101.9  397.2,124.8  407.1,160.1
            376.0,140.0  344.9,160.1  354.8,124.8  326.6,101.9  363.1,100.2"
    fill="#fbbf24"
  />
  <!-- Small sparkle dots for energy -->
  <circle cx="92"  cy="92"  r="6" fill="#60a5fa" opacity="0.5"/>
  <circle cx="74"  cy="118" r="4" fill="#93c5fd" opacity="0.35"/>
  <circle cx="118" cy="74"  r="4" fill="#93c5fd" opacity="0.35"/>
</svg>`.trim();

/**
 * Favicon-only icon: same design but without the star and accent
 * (they'd be invisible at 32×32).
 */
const SMALL_SVG = /* xml */ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- Slightly centred "A" for favicon (apex raised to give breathing room) -->
  <polygon points="220,90 256,90 168,450 108,450" fill="white"/>
  <polygon points="256,90 292,90 404,450 344,450" fill="white"/>
  <rect x="148" y="248" width="216" height="58" fill="white" rx="3"/>
</svg>`.trim();

// ─── ICO wrapper (PNG-in-ICO, accepted by all modern browsers) ───────────────

function wrapInICO(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(1, 4); // image count: 1

  const dir = Buffer.alloc(16);
  dir[0] = size >= 256 ? 0 : size; // width  (0 means 256)
  dir[1] = size >= 256 ? 0 : size; // height
  dir[2] = 0; // colour count (0 = not palette-based)
  dir[3] = 0; // reserved
  dir.writeUInt16LE(1, 4);                  // colour planes
  dir.writeUInt16LE(32, 6);                 // bits per pixel (RGBA)
  dir.writeUInt32LE(pngBuffer.length, 8);   // size of image data
  dir.writeUInt32LE(22, 12);               // offset of image data (6 + 16)

  return Buffer.concat([header, dir, pngBuffer]);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function generate() {
  const iconsDir = join(__dirname, 'public', 'icons');
  mkdirSync(iconsDir, { recursive: true });

  const svgBuf = Buffer.from(FULL_SVG);
  const smallBuf = Buffer.from(SMALL_SVG);

  // 512×512 — PWA manifest (purpose: any + maskable)
  const png512 = await sharp(svgBuf).resize(512, 512).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(iconsDir, 'icon-512x512.png'), png512);
  console.log('✓ public/icons/icon-512x512.png');

  // 192×192 — PWA manifest (purpose: any)
  const png192 = await sharp(svgBuf).resize(192, 192).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(iconsDir, 'icon-192x192.png'), png192);
  console.log('✓ public/icons/icon-192x192.png');

  // 180×180 — Apple touch icon (also written to public/ for direct access)
  const png180 = await sharp(svgBuf).resize(180, 180).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(iconsDir, 'icon-180x180.png'), png180);
  writeFileSync(join(__dirname, 'public', 'apple-touch-icon.png'), png180);
  console.log('✓ public/icons/icon-180x180.png');
  console.log('✓ public/apple-touch-icon.png');

  // 32×32 PNG-in-ICO — browser favicon.ico
  const png32 = await sharp(smallBuf).resize(32, 32).png().toBuffer();
  const icoBuffer = wrapInICO(png32, 32);
  writeFileSync(join(__dirname, 'public', 'favicon.ico'), icoBuffer);
  console.log('✓ public/favicon.ico');

  console.log('\nAll assets generated. Replace with final brand artwork before production.');
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
