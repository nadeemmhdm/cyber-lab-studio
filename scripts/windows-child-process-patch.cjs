/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const childProcess = require('node:child_process');
const { existsSync } = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const { dirname, join } = require('node:path');

if (process.platform === 'win32') {
  const originalSpawnSync = childProcess.spawnSync;
  const originalSpawn = childProcess.spawn;
  const comspec = process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
  const nodeDir = process.env.CYBERLAB_NODE_DIR || dirname(process.execPath);

  function quoteArg(value) {
    const text = String(value);
    if (!text) return '""';
    if (!/[\s"&|<>^]/.test(text)) return text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function resolveBatchCommand(command) {
    if (typeof command !== 'string') return command;
    const lower = command.toLowerCase();
    if (lower !== 'npm.cmd' && lower !== 'npx.cmd') return command;
    const local = join(nodeDir, lower);
    return existsSync(local) ? local : command;
  }

  function wrap(command, args = []) {
    const resolved = resolveBatchCommand(command);
    // cmd.exe requires the batch file to run through /c. Quote the resolved command
    // path because the Node installation directory may contain spaces.
    const line = [quoteArg(resolved), ...args.map(quoteArg)].join(' ');
    return [comspec, ['/d', '/s', '/c', line]];
  }

  childProcess.spawnSync = function patchedSpawnSync(command, args, options) {
    if (typeof command === 'string' && /\.(?:cmd|bat)$/i.test(command)) {
      const [shellCommand, shellArgs] = wrap(command, Array.isArray(args) ? args : []);
      return originalSpawnSync.call(childProcess, shellCommand, shellArgs, { ...(options || {}), shell: false });
    }
    return originalSpawnSync.apply(childProcess, arguments);
  };

  childProcess.spawn = function patchedSpawn(command, args, options) {
    if (typeof command === 'string' && /\.(?:cmd|bat)$/i.test(command)) {
      const [shellCommand, shellArgs] = wrap(command, Array.isArray(args) ? args : []);
      return originalSpawn.call(childProcess, shellCommand, shellArgs, { ...(options || {}), shell: false });
    }
    return originalSpawn.apply(childProcess, arguments);
  };

  // remote-setup.mjs imports named bindings from node:child_process.
  syncBuiltinESMExports();
}
