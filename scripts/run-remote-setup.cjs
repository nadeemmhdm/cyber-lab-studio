/* eslint-disable @typescript-eslint/no-require-imports */
const childProcess = require("node:child_process");
const { syncBuiltinESMExports } = require("node:module");
const { platform } = require("node:os");

const isWindows = platform() === "win32";

if (isWindows) {
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

if (process.argv.includes("--process-smoke")) {
  const npmCommand = isWindows ? "npm.cmd" : "npm";
  const result = childProcess.spawnSync(npmCommand, ["--version"], { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    console.error(result.error?.message || result.stderr || `${npmCommand} smoke check failed`);
    process.exit(1);
  }
  console.log(`installer child-process smoke OK: npm ${String(result.stdout).trim()}`);
  process.exit(0);
}

import("./remote-setup.mjs").catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});
