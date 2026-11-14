import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const env = { ...process.env };
// DSH / IDE shells sometimes set this for Electron's own tooling; it makes
// electron.exe run as plain Node and prevents app.requestSingleInstanceLock().
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});
child.on('exit', (code) => process.exit(code ?? 0));
