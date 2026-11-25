#!/usr/bin/env node
// Starts the server in production mode, serving the optimised build in dist/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('No production build found. Run "npm run build" first.');
  process.exit(1);
}
process.env.NODE_ENV = 'production';
process.env.STATIC_DIR ||= 'dist';
process.argv[1] = path.join(root, 'server', 'index.js');
await import('../server/index.js');
