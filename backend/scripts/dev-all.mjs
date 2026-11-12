/**
 * One-command local launch: embedded Postgres (no Docker) -> backend (Nest, watch
 * mode) -> frontend (Vite). Ctrl+C stops all three.
 *
 * Usage: npm run dev:all     (from backend/)
 *
 * Needs `npm install` done in both backend/ and frontend/ beforehand.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(here, '..');
const frontendDir = path.join(backendDir, '..', 'frontend');

const nestBin = path.join(backendDir, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js');
const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
for (const [dir, bin] of [
  [backendDir, nestBin],
  [frontendDir, viteBin],
]) {
  if (!existsSync(bin)) {
    console.error(`Missing dependencies in ${dir} - run "npm install" there first.`);
    process.exit(1);
  }
}

const COLORS = { db: 36, api: 32, web: 35 }; // cyan, green, magenta
const children = [];
let stopping = false;

function run(name, args, cwd, { onLine } = {}) {
  const child = spawn(process.execPath, args, { cwd, stdio: ['inherit', 'pipe', 'pipe', 'ipc'] });
  child.label = name;
  children.push(child);
  const prefix = `\x1b[${COLORS[name]}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) {
        out.write(prefix + line + '\n');
        onLine?.(line);
      }
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${prefix}exited with code ${code} - shutting everything down`);
      shutdown(code ?? 1);
    }
  });
  return child;
}

// Nest --watch and Vite spawn their own children; on Windows kill() would orphan them.
function killTree(child) {
  if (child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGKILL');
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (child.label === 'db') child.send('stop'); // lets Postgres shut down cleanly
    else killTree(child);
  }
  setTimeout(() => {
    for (const child of children) killTree(child);
    process.exit(code);
  }, 8000).unref();
  Promise.all(children.map((c) => new Promise((res) => (c.exitCode !== null ? res() : c.once('exit', res))))).then(() =>
    process.exit(code),
  );
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

let appStarted = false;
function startApps() {
  if (appStarted) return;
  appStarted = true;
  run('api', [nestBin, 'start', '--watch'], backendDir);
  run('web', [viteBin, '--port', '5173', '--strictPort'], frontendDir);
  console.log('\n  Frontend: http://localhost:5173   API: http://localhost:3000   (Ctrl+C to stop)\n');
}

// Probe by connecting: on Windows, binding the wildcard address succeeds even when
// another process already listens on a specific one (e.g. Vite on [::1]).
function accepts(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1000);
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('timeout', () => (socket.destroy(), resolve(false)));
    socket.once('error', () => resolve(false));
  });
}
async function portBusy(port) {
  return (await Promise.all(['127.0.0.1', '::1'].map((h) => accepts(port, h)))).some(Boolean);
}

const busy = [];
for (const [port, what] of [[3000, 'API'], [5173, 'frontend']]) if (await portBusy(port)) busy.push(`${port} (${what})`);
if (busy.length) {
  console.error(
    `Port(s) already in use: ${busy.join(', ')}. Stop whatever holds them (an old dev:all, "npm start", a Vite server) and retry.`,
  );
  process.exit(1);
}

// Postgres already on 5433 (docker compose up, or a leftover demo DB): reuse it.
if (await portBusy(5433)) {
  console.log('Postgres is already running on :5433 - using it instead of starting the embedded one.');
  startApps();
} else {
  run('db', [path.join(here, 'demo-db.mjs')], backendDir, {
    onLine: (line) => line.includes('demo Postgres ready') && startApps(),
  });
}
