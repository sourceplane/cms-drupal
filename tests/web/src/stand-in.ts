import { spawn, type ChildProcess } from "node:child_process";
import * as net from "node:net";
import * as path from "node:path";

// The stand-in Drupal (fake-drupal.mjs) on a free port, for the tests that
// read a connected site over HTTP. Spawned async: a child that talks to this
// process's own fetches must not block it.
export const CLIENT = { id: "site-client", secret: "client-secret" };
export const PREVIEW_SECRET = "preview-secret";

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
  });
}

export async function startStandIn(): Promise<{ origin: string; stop: () => void }> {
  const port = await freePort();
  const child: ChildProcess = spawn(
    process.execPath,
    [
      path.join(__dirname, "../fake-drupal.mjs"),
      "--port", String(port),
      "--client", CLIENT.id,
      "--client-secret", CLIENT.secret,
      "--preview-secret", PREVIEW_SECRET,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  await new Promise<void>((resolve, reject) => {
    child.stdout!.on("data", (b: Buffer) => b.toString().includes("stand-in Drupal on") && resolve());
    child.on("exit", (code) => reject(new Error(`fake-drupal exited ${code}`)));
  });
  return { origin: `http://127.0.0.1:${port}`, stop: () => child.kill() };
}
