import { AdminBootstrapError, provisionInitialAdmin } from "../lib/setup/admin-bootstrap";
import { prisma } from "../lib/prisma";

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return JSON.parse(input || "{}");
}

async function main() {
  const input = await readStdin();
  try {
    const result = await provisionInitialAdmin({
      setupToken: String(input.setupToken ?? ""),
      email: String(input.email ?? ""),
      displayName: String(input.displayName ?? ""),
      password: String(input.password ?? ""),
    });
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    if (error instanceof AdminBootstrapError && error.code === "ALREADY_CONFIGURED") {
      process.stdout.write(JSON.stringify({ alreadyConfigured: true }));
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
