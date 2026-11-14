import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'dist-yijing');
const dest = join(root, 'public', 'yijing');
if (!existsSync(join(src, 'yijing.html'))) {
  throw new Error('dist-yijing/yijing.html missing');
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
renameSync(join(dest, 'yijing.html'), join(dest, 'index.html'));
console.log('yijing embed ready: public/yijing');
