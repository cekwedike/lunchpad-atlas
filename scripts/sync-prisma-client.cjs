/**
 * Copy `backend/node_modules/.prisma/client` into the pnpm-hoisted `@prisma/client`
 * package so `require('@prisma/client')` resolves a generated client at runtime.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'backend', 'node_modules', '.prisma', 'client');
const pnpmDir = path.join(root, 'node_modules', '.pnpm');

if (!fs.existsSync(src)) {
  console.warn('[sync-prisma-client] Skipping — no generated client at', src);
  process.exit(0);
}
if (!fs.existsSync(pnpmDir)) {
  console.warn('[sync-prisma-client] Skipping — no pnpm store at', pnpmDir);
  process.exit(0);
}

const entries = fs.readdirSync(pnpmDir);
const prismaClientPkg = entries.find((e) => e.startsWith('@prisma+client@'));
if (!prismaClientPkg) {
  console.warn('[sync-prisma-client] Skipping — no @prisma+client@* in .pnpm');
  process.exit(0);
}

const dest = path.join(
  pnpmDir,
  prismaClientPkg,
  'node_modules',
  '.prisma',
  'client',
);

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('[sync-prisma-client] Copied', src, '→', dest);
