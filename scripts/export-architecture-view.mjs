import { spawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";
import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4173;
const URL = `http://${HOST}:${PORT}/`;
const OUT = process.argv[2] || "architecture-view.png";

function waitForPreviewReady(proc, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let buf = "";

    const onData = (chunk) => {
      buf += chunk.toString();
      if (buf.includes("Local:") || buf.includes(URL)) resolve();
      if (Date.now() - startedAt > timeoutMs) reject(new Error("Timed out waiting for Vite preview to start."));
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("exit", (code) => reject(new Error(`Vite preview exited early (code ${code ?? "unknown"}).`)));
  });
}

async function main() {
  const preview = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "preview", "--", "--host", HOST, "--port", String(PORT), "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, BROWSER: "none" } }
  );

  try {
    await waitForPreviewReady(preview);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.screenshot({ path: OUT, fullPage: true });

    await browser.close();
  } finally {
    preview.kill("SIGTERM");
    await Promise.race([once(preview, "exit"), new Promise((r) => setTimeout(r, 3000))]);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

