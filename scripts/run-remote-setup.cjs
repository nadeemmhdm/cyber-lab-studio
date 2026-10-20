const childProcess = require("node:child_process");
const { syncBuiltinESMExports } = require("node:module");
const { platform } = require("node:os");

if (platform() === "win32") {
  const originalSpawnSync = childProcess.spawnSync;
  const originalSpawn = childProcess.spawn;
  const needsShell = (command, options = {}) => {
    if (typeof options.shell === "boolean") return options.shell;
    return /\.(?:cmd|bat)$/i.test(String(command));
  };

  childProcess.spawnSync = function patchedSpawnSync(command, args, options = {}) {
    return originalSpawnSync(command, args, { ...options, shell: needsShell(command, options) });
  };
  childProcess.spawn = function patchedSpawn(command, args, options = {}) {
    return originalSpawn(command, args, { ...options, shell: needsShell(command, options) });
  };
  syncBuiltinESMExports();
}

import("./remote-setup.mjs").catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});
