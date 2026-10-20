/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const childProcess = require('node:child_process');
const { existsSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { syncBuiltinESMExports } = require('node:module');

if (process.platform === 'win32') {
  const originalSpawnSync = childProcess.spawnSync;
  const originalSpawn = childProcess.spawn;
  const comspec = process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';

  function npmCliFor(command) {
    const base = dirname(process.execPath);
    const lower = String(command).toLowerCase();
    const cli = lower.endsWith('npx.cmd')
      ? join(base, 'node_modules', 'npm', 'bin', 'npx-cli.js')
      : lower.endsWith('npm.cmd')
        ? join(base, 'node_modules', 'npm', 'bin', 'npm-cli.js')
        : null;
    return cli && existsSync(cli) ? cli : null;
  }

  function quoteArg(value) {
    const text = String(value);
    if (!text) return '""';
    if (!/[\s"&|<>^]/.test(text)) return text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function wrap(command, args = []) {
    const line = [command, ...args.map(quoteArg)].join(' ');
    return [comspec, ['/d', '/s', '/c', `"${line}"`]];
  }

  childProcess.spawnSync = function patchedSpawnSync(command, args, options) {
    if (typeof command === 'string' && /\.(?:cmd|bat)$/i.test(command)) {
      const npmCli = npmCliFor(command);
      if (npmCli) {
        return originalSpawnSync.call(childProcess, process.execPath, [npmCli, ...(Array.isArray(args) ? args : [])], {
          ...(options || {}),
          shell: false,
        });
      }
      const [shellCommand, shellArgs] = wrap(command, Array.isArray(args) ? args : []);
      return originalSpawnSync.call(childProcess, shellCommand, shellArgs, {
        ...(options || {}),
        shell: false,
      });
    }
    return originalSpawnSync.apply(childProcess, arguments);
  };

  childProcess.spawn = function patchedSpawn(command, args, options) {
    if (typeof command === 'string' && /\.(?:cmd|bat)$/i.test(command)) {
      const npmCli = npmCliFor(command);
      if (npmCli) {
        return originalSpawn.call(childProcess, process.execPath, [npmCli, ...(Array.isArray(args) ? args : [])], {
          ...(options || {}),
          shell: false,
        });
      }
      const [shellCommand, shellArgs] = wrap(command, Array.isArray(args) ? args : []);
      return originalSpawn.call(childProcess, shellCommand, shellArgs, {
        ...(options || {}),
        shell: false,
      });
    }
    return originalSpawn.apply(childProcess, arguments);
  };

  syncBuiltinESMExports();
}
