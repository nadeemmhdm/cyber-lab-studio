/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const childProcess = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');

if (process.platform === 'win32') {
  const originalSpawnSync = childProcess.spawnSync;
  const originalSpawn = childProcess.spawn;
  const comspec = process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';

  function quoteArg(value) {
    const text = String(value);
    if (!text) return '""';
    if (!/[\s"&|<>^]/.test(text)) return text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function wrap(command, args = []) {
    // npm.cmd/npx.cmd are command names supplied by repository code. Do not quote
    // the command token itself; cmd.exe would treat embedded quotes as part of the
    // executable name. Quote only arguments that actually require it.
    const line = [command, ...args.map(quoteArg)].join(' ');
    return [comspec, ['/d', '/c', line]];
  }

  childProcess.spawnSync = function patchedSpawnSync(command, args, options) {
    if (typeof command === 'string' && /\.(?:cmd|bat)$/i.test(command)) {
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
      const [shellCommand, shellArgs] = wrap(command, Array.isArray(args) ? args : []);
      return originalSpawn.call(childProcess, shellCommand, shellArgs, {
        ...(options || {}),
        shell: false,
      });
    }
    return originalSpawn.apply(childProcess, arguments);
  };

  // remote-setup.mjs imports named bindings from node:child_process.
  // Synchronize those ESM bindings with the patched CommonJS exports.
  syncBuiltinESMExports();
}
