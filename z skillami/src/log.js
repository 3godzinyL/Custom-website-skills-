import fs from 'node:fs';
import path from 'node:path';

export function createLog(config, { quiet = false } = {}) {
  fs.mkdirSync(config.logDir, { recursive: true });
  const file = () => path.join(config.logDir, `server-${new Date().toISOString().slice(0, 10)}.log`);
  const write = (level, scope, msg) => {
    const line = `${new Date().toISOString()} ${level} ${scope} ${msg}\n`;
    try { fs.appendFileSync(file(), line); } catch {}
    if (!quiet) (level === 'ERROR' ? process.stderr : process.stdout).write(line);
  };
  let onError = null;
  return {
    info: (msg) => write('INFO', '-', msg),
    error: (scope, err) => {
      write('ERROR', scope, err?.stack || String(err));
      try { onError?.(scope, err); } catch {}
    },
    setErrorSink(fn) { onError = fn; },
  };
}
