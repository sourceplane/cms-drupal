import { describe, expect, it } from "vitest";

import { connected, drupal } from "lib/drupal";
import { getMenus } from "lib/get-menus";
import { getParams } from "lib/get-params";

// With no Drupal connected (no DRUPAL_BASE_URL at build), next-drupal reads
// the bundled sample site: the same calls the pages make, answered in the
// Worker, deserialised by next-drupal itself.
const en = { locale: "en", defaultLocale: "en" };
const es = { locale: "es", defaultLocale: "en" };

describe("the sample Drupal, read through next-drupal", () => {
  it("is what an unconnected site reads", () => {
    expect(connected).toBe(false);
  });

  it("resolves the front page to a landing page built from paragraphs", async () => {
    const path = await drupal.translatePathFromContext({ params: {}, ...en });
    expect(path?.jsonapi?.resourceName).toBe("node--landing_page");
    const node = await drupal.getResourceFromContext<any>(path!, { params: {}, ...en }, { params: getParams("node--landing_page") });
    expect(node.title).toBe("Home");
    const types = node.field_sections.map((p: any) => p.type);
    expect(types).toEqual(["paragraph--hero", "paragraph--feature", "paragraph--cards", "paragraph--faq"]);
    const hero = node.field_sections[0];
    expect(hero.field_heading).toBe("Build Something Amazing");
    expect(hero.field_media.field_media_image.uri.url).toBe("/sample/hero.webp");
    expect(hero.field_media.field_media_image.resourceIdObjMeta).toMatchObject({ alt: "Hero", width: 3200, height: 1800 });
    expect(node.field_sections[3].field_items[0].field_heading).toBe("Move weight here just either attorney?");
  });

  it("serves the Spanish translation under /es", async () => {
    const path = await drupal.translatePathFromContext({ params: { slug: ["home"] }, ...es });
    expect(path?.entity?.langcode).toBe("es");
    const node = await drupal.getResourceFromContext<any>(path!, { params: { slug: ["home"] }, ...es }, { params: getParams("node--landing_page") });
    expect(node.field_sections[0].field_heading).toBe("Construye Algo Asombroso");
  });

  it("does not resolve a path Drupal has no node at", async () => {
    expect(await drupal.translatePathFromContext({ params: { slug: ["no-such-page"] }, ...en })).toBeNull();
  });

  it("lists the articles newest first, two to a page, with their author", async () => {
    const result = await drupal.getResourceCollectionFromContext<any>("node--article", { params: {}, ...en }, {
      deserialize: false,
      params: { "filter[status]": "1", sort: "-created", include: "uid,field_image", "page[limit]": 2, "page[offset]": 0 },
    });
    expect(result.meta.count).toBe(3);
    const nodes = drupal.deserialize(result) as any[];
    expect(nodes.map((n) => n.title)).toEqual([
      "Learn How to Pre-render Pages Using Static Generation with Next.js",
      "Dynamic Routing and Static Generation",
    ]);
    expect(nodes[0].uid.field_name).toBe("Arshad");
  });

  it("gives every page path to getStaticPaths, in both languages", async () => {
    const paths = await drupal.getStaticPathsFromContext(["node--page", "node--landing_page", "node--article"], { locales: ["en", "es"], defaultLocale: "en" });
    const es = paths.filter((p: any) => p.locale === "es").map((p: any) => (p.params.slug as string[]).join("/"));
    expect(es).toContain("about");
    expect(paths).toHaveLength(12);
  });

  it("answers the properties view four at a time, and its filters", async () => {
    const view = await drupal.getView<any>("properties--listing", { params: { include: "field_location,field_images.field_media_image" } });
    expect(view.meta.count).toBe(12);
    expect(view.results).toHaveLength(4);
    expect(view.results[0].title).toBe("484 Robert Crest Apt. 875");
    expect(view.results[0].field_location.name).toBe("San Francisco, CA");
    // The browser follows the view's own link: on this site for the sample.
    expect((view.links.self as { href: string }).href.startsWith("/api/sample-drupal/jsonapi/views/properties/listing")).toBe(true);
    const filtered = await drupal.getView<any>("properties--listing", {
      params: { "views-filter[location]": "1", "views-filter[status]": "sale", "views-filter[beds]": "4" },
    });
    expect(filtered.results.map((r: any) => r.title)).toEqual(["17 Grand View Avenue"]);
  });

  it("builds both menus, localised, as data getStaticProps can serialise", async () => {
    const menus = await getMenus({ ...es } as any);
    expect(menus.main.map((l: any) => l.title)).toEqual(["Inicio", "Blog", "Propiedades", "Acerca", "GitHub"]);
    expect(JSON.parse(JSON.stringify(menus))).toEqual(menus);
    expect(Object.values(menus.main[0]).includes(undefined)).toBe(false);
  });
});
