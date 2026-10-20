'use strict';

const childProcess = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');

if (process.platform === 'win32') {
  const originalSpawnSync = childProcess.spawnSync;
  const originalSpawn = childProcess.spawn;
  const comspec = process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';

  function quoteForCmd(value) {
    const text = String(value);
    if (!text) return '""';
    // All npm/npx arguments used by CyberLab are controlled by repository code.
    // Still quote every token so spaces in paths are handled correctly.
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function wrap(command, args = []) {
    const line = [quoteForCmd(command), ...args.map(quoteForCmd)].join(' ');
    return [comspec, ['/d', '/s', '/c', line]];
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
