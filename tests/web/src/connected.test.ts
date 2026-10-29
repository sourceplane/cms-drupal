import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { CLIENT, PREVIEW_SECRET, startStandIn } from "./stand-in";

// A connected site: DRUPAL_BASE_URL inlined at build (here, set before the
// module loads) and the OAuth client as Worker secrets. next-drupal reads the
// stand-in Drupal over HTTP; a draft needs the client's token.
let standIn: Awaited<ReturnType<typeof startStandIn>>;
let lib: typeof import("lib/drupal");

beforeAll(async () => {
  standIn = await startStandIn();
  vi.stubEnv("NEXT_PUBLIC_DRUPAL_BASE_URL", standIn.origin);
  vi.stubEnv("DRUPAL_CLIENT_ID", CLIENT.id);
  vi.stubEnv("DRUPAL_CLIENT_SECRET", CLIENT.secret);
  vi.resetModules();
  lib = await import("lib/drupal");
});
afterAll(() => {
  vi.unstubAllEnvs();
  standIn?.stop();
});

const en = { locale: "en", defaultLocale: "en" };

describe("a connected Drupal", () => {
  it("is read over HTTP, not from the sample", async () => {
    expect(lib.connected).toBe(true);
    await fetch(`${standIn.origin}/__reset`, { method: "POST" });
    const path = await lib.drupal.translatePathFromContext({ params: { slug: ["about"] }, ...en });
    const node = await lib.drupal.getResourceFromContext<any>(path!, { params: { slug: ["about"] }, ...en });
    expect(node.title).toBe("About");
    const calls = await (await fetch(`${standIn.origin}/__calls`)).json();
    expect(calls).toMatchObject({ translate: 1, node: 1 });
  });

  it("reads a draft only in preview, with the client's token", async () => {
    const path = await lib.drupal.translatePathFromContext({ params: { slug: ["about"] }, ...en });
    const preview = { params: { slug: ["about"] }, ...en, preview: true, previewData: { resourceVersion: "id:7", plugin: "simple_oauth" } };
    const draft = await lib.drupal.getResourceFromContext<any>(path!, preview as any);
    expect(draft).toMatchObject({ title: "About (draft)", status: false });
    // Without preview there is no token, and Drupal refuses the revision.
    await expect(
      lib.drupal.getResourceFromContext<any>(path!, { params: { slug: ["about"] }, ...en }, { params: { resourceVersion: "id:7" } }),
    ).rejects.toThrow();
  });

  it("validates the preview link's secret with Drupal", async () => {
    const ok = await lib.drupal.validateDraftUrl(new URLSearchParams({ path: "/about", secret: PREVIEW_SECRET }));
    expect(ok.status).toBe(200);
    const bad = await lib.drupal.validateDraftUrl(new URLSearchParams({ path: "/about", secret: "nope" }));
    expect(bad.status).toBe(401);
  });

  it("refuses a wrong OAuth client", async () => {
    const res = await fetch(`${standIn.origin}/oauth/token`, {
      method: "POST",
      headers: { authorization: `Basic ${Buffer.from(`${CLIENT.id}:wrong`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    expect(res.status).toBe(401);
  });
});
