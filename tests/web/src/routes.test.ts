import { afterEach, describe, expect, it, vi } from "vitest";

import preview from "../../../apps/web/pages/api/preview";
import revalidate from "../../../apps/web/pages/api/revalidate";

// The two routes Drupal calls, with a stand-in for Next's API response.
function response() {
  const res: any = { statusCode: 200, body: undefined as unknown, revalidated: [] as string[] };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.revalidate = async (p: string) => void res.revalidated.push(p);
  return res;
}
const call = async (handler: any, query: Record<string, string>) => {
  const res = response();
  await handler({ query } as any, res);
  return res;
};
afterEach(() => vi.unstubAllEnvs());

describe("/api/revalidate", () => {
  it("is off without DRUPAL_REVALIDATE_SECRET — even for a call with no secret", async () => {
    vi.stubEnv("DRUPAL_REVALIDATE_SECRET", "");
    for (const query of [{ path: "/about" }, { path: "/about", secret: "" }, { path: "/about", secret: "x" }]) {
      const res = await call(revalidate, query);
      expect(res.statusCode).toBe(401);
      expect(res.revalidated).toEqual([]);
    }
  });

  it("refuses a wrong secret and revalidates the path with the right one", async () => {
    vi.stubEnv("DRUPAL_REVALIDATE_SECRET", "s3cret");
    expect((await call(revalidate, { path: "/about", secret: "nope" })).statusCode).toBe(401);
    expect((await call(revalidate, { secret: "s3cret" })).statusCode).toBe(400);
    const ok = await call(revalidate, { path: "/about", secret: "s3cret" });
    expect([ok.statusCode, ok.revalidated]).toEqual([200, ["/about"]]);
    // Drupal names the front page by its own path.
    expect((await call(revalidate, { path: "/home", secret: "s3cret" })).revalidated).toEqual(["/"]);
  });
});

describe("/api/preview", () => {
  it("has nothing to preview before a Drupal site is connected", async () => {
    const res = await call(preview, { path: "/about", secret: "anything" });
    expect(res.statusCode).toBe(401);
    expect((res.body as { message: string }).message).toMatch(/No Drupal site is connected/);
  });
});
