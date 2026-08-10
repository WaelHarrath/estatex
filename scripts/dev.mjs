/**
 * Dev launcher — starts the web and socket apps together.
 * Cross-platform (Windows/macOS/Linux): spawns each workspace's `dev`
 * script as a child process, forwards output, and tears both down on exit.
 *
 *   npm run dev           # web (3000) + socket (3001)
 *   npm run dev:web       # web only
 *   npm run dev:socket    # socket only
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const targets = process.argv[2] ?? "both"; // both | web | socket

function start(workspace) {
  const child = spawn(npm, ["run", "dev", "-w", workspace], {
    cwd: root,
    // Windows .cmd shims (npm.cmd) need a shell to launch; args here have no
    // spaces/quotes so shell quoting is a non-issue.
    shell: true,
    stdio: "inherit"
  });
  child.on("exit", (code) => {
    console.log(`[dev] ${workspace} exited with code ${code ?? 0}`);
    shutdown(code ?? 0);
  });
  return child;
}

const children = [];
if (targets === "web") {
  children.push(start("@estatex/web"));
} else if (targets === "socket") {
  children.push(start("@estatex/socket"));
} else {
  children.push(start("@estatex/web"), start("@estatex/socket"));
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child && !child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
