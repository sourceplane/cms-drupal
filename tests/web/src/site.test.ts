import * as fs from "node:fs";
import * as path from "node:path";
import { DrupalJsonApiParams } from "drupal-jsonapi-params";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteFilter } from "lib/get-params";
import { absoluteURL } from "lib/utils/absolute-url";
import { SITE_NAME } from "site";

const app = path.resolve(__dirname, "../../../apps/web");
afterEach(() => vi.unstubAllEnvs());

describe("the site's name", () => {
  it("is one literal line, which the rename finds", () => {
    expect(fs.readFileSync(path.join(app, "site.ts"), "utf8")).toMatch(/^export const SITE_NAME = ".+";$/m);
    expect(SITE_NAME.length).toBeGreaterThan(0);
  });

  it("is what the navbar, the titles and the footer say", () => {
    for (const f of ["components/navbar.tsx", "components/meta.tsx", "components/footer.tsx"]) {
      expect(fs.readFileSync(path.join(app, f), "utf8")).toContain("SITE_NAME");
    }
  });
});

describe("Drupal's files", () => {
  it("load from this site for the sample photos", () => {
    expect(absoluteURL("/sample/hero.webp")).toBe("/sample/hero.webp");
    expect(absoluteURL("sample/hero.webp")).toBe("/sample/hero.webp");
  });
});

describe("the multi-site filter", () => {
  it("applies only when DRUPAL_SITE_ID is set", () => {
    vi.stubEnv("DRUPAL_SITE_ID", "");
    expect(siteFilter(new DrupalJsonApiParams()).getQueryString()).toBe("");
    vi.stubEnv("DRUPAL_SITE_ID", "example_marketing");
    expect(decodeURIComponent(siteFilter(new DrupalJsonApiParams()).getQueryString())).toBe(
      "filter[field_site.meta.drupal_internal__target_id]=example_marketing",
    );
  });
});
