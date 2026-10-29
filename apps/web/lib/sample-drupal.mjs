// The sample Drupal: what the site reads before a Drupal site is connected.
//
// The template's pages are built in Drupal (landing pages from paragraphs, a
// blog, a properties view, two menus, English and Spanish) and read with
// next-drupal over JSON:API, the decoupled router and the menu and views
// endpoints. With no Drupal connected, lib/drupal.ts hands next-drupal this
// module as its `fetcher`: every request the pages make is answered here, in
// the Worker, in the shapes those Drupal modules return — so the same code
// renders the same pages, and a connected Drupal replaces this file's content
// and nothing else. The browser's properties search (the view's own `self`
// link) reaches it through pages/api/sample-drupal.
//
// The content is the template's content model (the example's Drupal config:
// node--landing_page with hero, feature, cards, faq and view paragraphs,
// node--article, node--page, node--property_listing, media--image,
// taxonomy_term--property_location) with sample words — the headings, the
// author and the dates are the ones the template's own tests look for. The
// photos are public/sample (Payload's website template, MIT).
//
// Plain JavaScript with no dependencies, so the stand-in Drupal the tests run
// (tests/web/fake-drupal.mjs) serves exactly this over HTTP.

export const LOCALES = ["en", "es"];
export const DEFAULT_LOCALE = "en";
export const PROPERTIES_PER_PAGE = 4;

// ── Content ────────────────────────────────────────────────────────────────

const files = {
  hero: image("f0d4b1e2-0001-4000-8000-000000000001", "hero.webp", 3200, 1800),
  photo1: image("f0d4b1e2-0001-4000-8000-000000000002", "photo-1.webp", 1920, 1080),
  photo2: image("f0d4b1e2-0001-4000-8000-000000000003", "photo-2.webp", 1920, 1080),
  photo3: image("f0d4b1e2-0001-4000-8000-000000000004", "photo-3.webp", 1920, 1080),
};

function image(id, name, width, height) {
  return {
    type: "file--file",
    id,
    attributes: {
      filename: name,
      filemime: "image/webp",
      uri: { value: `public://sample/${name}`, url: `/sample/${name}` },
    },
    dims: { width, height },
  };
}

function media(id, file, alt) {
  return {
    type: "media--image",
    id,
    attributes: { name: alt },
    relationships: {
      field_media_image: one(file, { alt, title: alt, width: file.dims.width, height: file.dims.height }),
    },
  };
}

const medias = {
  hero: media("a1b2c3d4-0002-4000-8000-000000000001", files.hero, "Hero"),
  feature: media("a1b2c3d4-0002-4000-8000-000000000002", files.photo1, "Feature"),
  home1: media("a1b2c3d4-0002-4000-8000-000000000003", files.photo1, "A living room with tall windows"),
  home2: media("a1b2c3d4-0002-4000-8000-000000000004", files.photo2, "An open kitchen"),
  home3: media("a1b2c3d4-0002-4000-8000-000000000005", files.photo3, "A bright bedroom"),
};

const author = {
  type: "user--user",
  id: "b2c3d4e5-0003-4000-8000-000000000001",
  attributes: { display_name: "Arshad", field_name: "Arshad" },
};

const locations = [
  term("c3d4e5f6-0004-4000-8000-000000000001", 1, "San Francisco, CA"),
  term("c3d4e5f6-0004-4000-8000-000000000002", 2, "Oakland, CA"),
  term("c3d4e5f6-0004-4000-8000-000000000003", 3, "San Jose, CA"),
];

function term(id, tid, name) {
  return { type: "taxonomy_term--property_location", id, attributes: { name, drupal_internal__tid: tid } };
}

function one(resource, meta) {
  return { data: { type: resource.type, id: resource.id, ...(meta ? { meta } : {}) } };
}
function many(resources) {
  return { data: resources.map((r) => ({ type: r.type, id: r.id })) };
}
function text(html) {
  return { value: html, format: "basic_html", processed: html };
}

let uuidSeq = 0;
function uuid(prefix) {
  uuidSeq += 1;
  return `${prefix}-0005-4000-8000-${String(uuidSeq).padStart(12, "0")}`;
}
function paragraph(type, attributes, relationships = {}, es = {}) {
  return { type: `paragraph--${type}`, id: uuid("d4e5f6a7"), attributes, relationships, es };
}

const cards = [];
function card(heading, body, es) {
  const c = paragraph("card", { field_heading: heading, field_text: text(`<p>${body}</p>`) }, {}, es ? { field_heading: es[0], field_text: text(`<p>${es[1]}</p>`) } : {});
  cards.push(c);
  return c;
}

const homeSections = [
  paragraph(
    "hero",
    {
      field_heading: "Build Something Amazing",
      field_text: text("<p>Must today firm from bag. Investment try cold a when capital. Everything wait person service.</p>"),
      field_links: [
        { title: "Find a property", uri: "/properties", options: [] },
        { title: "Read the blog", uri: "/blog", options: [] },
      ],
    },
    { field_media: one(medias.hero) },
    {
      field_heading: "Construye Algo Asombroso",
      field_text: text("<p>Dicta laboriosam magnam possimus ad. Ratione rem nihil nostrum dolore reiciendis enim.</p>"),
      field_links: [
        { title: "Buscar una propiedad", uri: "/es/properties", options: [] },
        { title: "Leer el blog", uri: "/es/blog", options: [] },
      ],
    },
  ),
  paragraph(
    "feature",
    {
      field_heading: "Marketing Strategy",
      field_text: text("<p>Every section of this page is a paragraph in Drupal: reorder them, add one, translate it, and the page follows.</p>"),
      field_media_position: "left",
      field_background_color: "muted",
      field_link: { title: "About us", uri: "/about", options: [] },
    },
    { field_media: one(medias.feature) },
    {
      field_text: text("<p>Cada sección de esta página es un párrafo en Drupal: reordénalos, añade uno, tradúcelo y la página lo sigue.</p>"),
      field_link: { title: "Acerca de nosotros", uri: "/es/about", options: [] },
    },
  ),
  paragraph(
    "cards",
    {
      field_heading: "Why Drupal and Next.js",
      field_text: text("<p>Editors keep their CMS. Visitors get a fast site.</p>"),
    },
    {
      field_items: many([
        card("Structured content", "Landing pages, articles and listings are content types and paragraphs.", ["Contenido estructurado", "Las páginas, los artículos y los listados son tipos de contenido y párrafos."]),
        card("Pre-rendered pages", "Pages are generated once and refreshed when an editor saves.", ["Páginas pre-renderizadas", "Las páginas se generan una vez y se actualizan cuando un editor guarda."]),
        card("Preview before publishing", "Editors see a draft on the real site before anyone else does.", ["Vista previa antes de publicar", "Los editores ven un borrador en el sitio real antes que nadie."]),
      ]),
    },
    { field_heading: "Por qué Drupal y Next.js", field_text: text("<p>Los editores conservan su CMS. Los visitantes obtienen un sitio rápido.</p>") },
  ),
  paragraph(
    "faq",
    { field_heading: "Frequently Asked Questions", field_text: text("<p>Answers to what visitors ask most.</p>") },
    {
      field_items: many([
        card("Move weight here just either attorney?", "Over discover they nature far. Material sit among difference sea form sit."),
        card("Can I edit this page?", "Yes: connect a Drupal site and every heading, text and image here comes from it."),
        card("Is the site translated?", "Every page has an English and a Spanish version; the switcher in the header changes language."),
        card("How fast do edits show?", "Drupal tells the site when content changes, and the page is regenerated on the next visit."),
      ]),
    },
  ),
];

const propertiesSections = [
  paragraph(
    "hero",
    { field_heading: "Find your place", field_text: text("<p>Homes for sale and for rent across the Bay Area.</p>") },
    {},
    { field_heading: "Encuentra tu lugar", field_text: text("<p>Casas en venta y en alquiler en toda el Área de la Bahía.</p>") },
  ),
  paragraph("view", { field_view: "properties--listing" }),
];

function node(bundle, nid, idSuffix, en, es, relationships = {}) {
  return {
    type: `node--${bundle}`,
    id: `e5f6a7b8-0006-4000-8000-${idSuffix}`,
    nid,
    attributes: { langcode: "en", status: true, metatag: null, ...en },
    es: es ? { langcode: "es", ...es } : null,
    relationships,
  };
}

const ARTICLE_BODY = (topic) =>
  text(
    `<p>${topic} is one of the ideas this site is built on. A page is generated from Drupal content when it is first needed, kept, and served to every visitor after that.</p>` +
      "<p>When an editor saves, Drupal tells the site which path changed and the next visitor gets the new page. Nothing else is rebuilt.</p>",
  );

const nodes = [
  node("landing_page", 1, "000000000001", { title: "Home", path: { alias: "/home", langcode: "en" } }, { title: "Inicio", path: { alias: "/home", langcode: "es" } }, { field_sections: many(homeSections) }),
  node("landing_page", 2, "000000000002", { title: "Properties", path: { alias: "/properties", langcode: "en" } }, { title: "Propiedades", path: { alias: "/properties", langcode: "es" } }, { field_sections: many(propertiesSections) }),
  node(
    "page",
    3,
    "000000000003",
    {
      title: "About",
      path: { alias: "/about", langcode: "en" },
      body: text(
        "<p>We help people find a home they love. This page is a basic page in Drupal: its body is the editor's formatted text, images included.</p>" +
          '<figure role="group"><img src="/sample/photo-2.webp" alt="An open kitchen" width="1920" height="1080" data-entity-type="file" /><figcaption>This is the caption</figcaption></figure>' +
          '<p>Links inside the text, like <a href="/properties">our properties</a>, stay on the site.</p>',
      ),
    },
    {
      title: "Acerca",
      path: { alias: "/about", langcode: "es" },
      body: text(
        "<p>Ayudamos a las personas a encontrar un hogar que les encante. Esta página es una página básica en Drupal.</p>" +
          '<figure role="group"><img src="/sample/photo-2.webp" alt="Una cocina abierta" width="1920" height="1080" data-entity-type="file" /><figcaption>Este es el pie de foto</figcaption></figure>' +
          '<p>Los enlaces dentro del texto, como <a href="/es/properties">nuestras propiedades</a>, se quedan en el sitio.</p>',
      ),
    },
  ),
  node(
    "article",
    4,
    "000000000004",
    {
      title: "Learn How to Pre-render Pages Using Static Generation with Next.js",
      path: { alias: "/blog/learn-how-pre-render-pages-using-static-generation-nextjs", langcode: "en" },
      created: "2021-06-13T15:00:00+00:00",
      body: { ...ARTICLE_BODY("Static generation"), summary: "Pages generated once from Drupal content and served to everyone." },
    },
    {
      title: "Aprenda a pre-renderizar páginas con generación estática en Next.js",
      path: { alias: "/blog/learn-how-pre-render-pages-using-static-generation-nextjs", langcode: "es" },
      created: "2021-06-14T15:00:00+00:00",
      body: { ...text("<p>La generación estática es una de las ideas sobre las que se construye este sitio.</p>"), summary: "Páginas generadas una vez a partir del contenido de Drupal." },
    },
    { uid: one(author), field_image: one(files.photo1, { alt: "A living room with tall windows", title: "", width: 1920, height: 1080 }) },
  ),
  node(
    "article",
    5,
    "000000000005",
    {
      title: "Dynamic Routing and Static Generation",
      path: { alias: "/blog/dynamic-routing-and-static-generation", langcode: "en" },
      created: "2021-06-13T12:00:00+00:00",
      body: { ...ARTICLE_BODY("Dynamic routing"), summary: "One route for every page Drupal knows about." },
    },
    {
      title: "Enrutamiento dinámico y Generación Estática",
      path: { alias: "/blog/dynamic-routing-and-static-generation", langcode: "es" },
      created: "2021-06-14T12:00:00+00:00",
      body: { ...text("<p>Una sola ruta para cada página que Drupal conoce.</p>"), summary: "Una sola ruta para cada página que Drupal conoce." },
    },
    { uid: one(author), field_image: one(files.photo2, { alt: "An open kitchen", title: "", width: 1920, height: 1080 }) },
  ),
  node(
    "article",
    6,
    "000000000006",
    {
      title: "Previewing Drafts Before They Go Live",
      path: { alias: "/blog/previewing-drafts-before-they-go-live", langcode: "en" },
      created: "2021-06-10T12:00:00+00:00",
      body: { ...ARTICLE_BODY("Preview"), summary: "Editors see unpublished changes on the real site." },
    },
    {
      title: "Vista previa de borradores antes de publicarlos",
      path: { alias: "/blog/previewing-drafts-before-they-go-live", langcode: "es" },
      created: "2021-06-11T12:00:00+00:00",
      body: { ...text("<p>Los editores ven los cambios no publicados en el sitio real.</p>"), summary: "Los editores ven los cambios no publicados." },
    },
    { uid: one(author), field_image: one(files.photo3, { alt: "A bright bedroom", title: "", width: 1920, height: 1080 }) },
  ),
];

// Twelve listings, four to a page; one four-bedroom house for sale in San
// Francisco (the template's own filter test finds exactly one).
const LISTINGS = [
  ["484 Robert Crest Apt. 875", 0, "sale", 3, 2, 1850],
  ["2050 Pine Street", 0, "rent", 2, 1, 980],
  ["17 Grand View Avenue", 0, "sale", 4, 3, 2600],
  ["315 Lakeshore Drive", 1, "sale", 4, 2, 2200],
  ["88 Telegraph Place", 1, "rent", 1, 1, 640],
  ["1209 Harrison Street", 1, "sale", 3, 2, 1700],
  ["740 Almaden Boulevard", 2, "rent", 2, 2, 1100],
  ["56 Willow Glen Way", 2, "sale", 5, 4, 3200],
  ["901 Santa Clara Street", 2, "rent", 3, 2, 1450],
  ["12 Ocean Avenue", 0, "rent", 3, 2, 1500],
  ["4400 Broadway", 1, "rent", 2, 1, 900],
  ["630 Saratoga Road", 2, "sale", 4, 2, 2400],
];
const listingMedia = [medias.home1, medias.home2, medias.home3];
LISTINGS.forEach(([title, loc, status, beds, baths, size], i) => {
  nodes.push(
    node(
      "property_listing",
      100 + i,
      String(100 + i).padStart(12, "0"),
      {
        title,
        path: { alias: `/properties/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`, langcode: "en" },
        field_status: status,
        field_beds: beds,
        field_baths: baths,
        field_size: size,
        field_teaser: `${beds} bedrooms and ${baths} ${baths === 1 ? "bathroom" : "bathrooms"} in ${locations[loc].attributes.name.split(",")[0]}.`,
        created: `2021-06-${String(1 + i).padStart(2, "0")}T12:00:00+00:00`,
      },
      null,
      { field_location: one(locations[loc]), field_images: many([listingMedia[i % 3], listingMedia[(i + 1) % 3]]) },
    ),
  );
});

const menus = {
  main: [
    ["Home", "Inicio", "/", "/es"],
    ["Blog", "Blog", "/blog", "/es/blog"],
    ["Properties", "Propiedades", "/properties", "/es/properties"],
    ["About", "Acerca", "/about", "/es/about"],
    ["GitHub", "GitHub", "https://github.com/chapter-three/next-drupal", "https://github.com/chapter-three/next-drupal"],
  ],
  footer: [
    ["About", "Acerca", "/about", "/es/about"],
    ["Blog", "Blog", "/blog", "/es/blog"],
  ],
};

// ── The store ──────────────────────────────────────────────────────────────

const all = [
  ...Object.values(files),
  ...Object.values(medias),
  author,
  ...locations,
  ...homeSections,
  ...cards,
  ...propertiesSections,
  ...nodes,
];

/**
 * Build a sample Drupal. `overrides(resource, locale, revision)` may replace a
 * resource's attributes (the stand-in Drupal's edits and drafts use it).
 *
 * @param {{ overrides?: (r: object, locale: string, revision: string | null, authed: boolean) => object | null | undefined }} [options]
 */
export function createSampleDrupal(options = {}) {
  const byKey = new Map();
  for (const r of all) if (r.type) byKey.set(`${r.type}:${r.id}`, r);
  // The cards are stored under their references: resolve them to the objects.
  for (const p of homeSections) {
    for (const ref of p.relationships.field_items?.data ?? []) {
      if (!byKey.has(`${ref.type}:${ref.id}`)) throw new Error(`sample: missing ${ref.type} ${ref.id}`);
    }
  }

  function view(r, locale, revision, authed) {
    const attrs = { ...r.attributes, ...(locale !== DEFAULT_LOCALE && r.es ? r.es : {}) };
    const over = options.overrides?.(r, locale, revision, authed);
    if (over === null) return null;
    const out = { type: r.type, id: r.id, attributes: { ...attrs, ...(over ?? {}) } };
    if (r.nid) out.attributes.drupal_internal__nid = r.nid;
    if (r.relationships && Object.keys(r.relationships).length) out.relationships = r.relationships;
    return out;
  }

  function includes(primaries, include, locale) {
    const seen = new Set(primaries.map((r) => `${r.type}:${r.id}`));
    const out = [];
    for (const pathSpec of (include || "").split(",").filter(Boolean)) {
      let frontier = primaries.map((r) => byKey.get(`${r.type}:${r.id}`)).filter(Boolean);
      for (const field of pathSpec.split(".")) {
        const next = [];
        for (const r of frontier) {
          const rel = r.relationships?.[field]?.data;
          for (const ref of rel ? (Array.isArray(rel) ? rel : [rel]) : []) {
            const target = byKey.get(`${ref.type}:${ref.id}`);
            if (!target) continue;
            next.push(target);
            const key = `${target.type}:${target.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              out.push(view(target, locale, null, false));
            }
          }
        }
        frontier = next;
      }
    }
    return out;
  }

  function aliasOf(n, locale) {
    return (locale !== DEFAULT_LOCALE && n.es ? n.es.path : n.attributes.path).alias;
  }

  function translate(path) {
    const m = path.match(/^\/(es)(\/.*)?$/);
    const locale = m ? m[1] : DEFAULT_LOCALE;
    const alias = m ? m[2] || "/" : path;
    const n = nodes.find((x) => x.type !== "node--property_listing" && aliasOf(x, locale) === alias && (locale === DEFAULT_LOCALE || x.es));
    return n ? { n, locale } : null;
  }

  /** @param {string} origin @param {string} locale */
  function base(origin, locale) {
    return `${origin}${locale !== DEFAULT_LOCALE ? `/${locale}` : ""}/jsonapi`;
  }

  function json(status, body) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/vnd.api+json" } });
  }

  function collection(list, url, locale, { limit, offset }) {
    const total = list.length;
    const page = list.slice(offset, offset + limit);
    const links = { self: { href: url.toString() } };
    if (offset + limit < total) {
      const next = new URL(url);
      next.searchParams.set("page[offset]", String(offset + limit));
      links.next = { href: next.toString() };
    }
    return { jsonapi: { version: "1.0" }, data: page, included: includes(page, url.searchParams.get("include"), locale), meta: { count: total }, links };
  }

  function propertiesView(url, locale, viewBase) {
    const p = url.searchParams;
    const f = (k) => p.get(`views-filter[${k}]`);
    let list = nodes.filter((n) => n.type === "node--property_listing");
    const loc = f("location");
    if (loc && loc !== "All") list = list.filter((n) => String(byKey.get(`taxonomy_term--property_location:${n.relationships.field_location.data.id}`).attributes.drupal_internal__tid) === loc);
    const status = f("status");
    if (status && status !== "All") list = list.filter((n) => n.attributes.field_status === status);
    if (f("beds")) list = list.filter((n) => n.attributes.field_beds >= Number(f("beds")));
    if (f("baths")) list = list.filter((n) => n.attributes.field_baths >= Number(f("baths")));
    const page = Math.max(0, Number(p.get("page") || 0));
    const rows = list.slice(page * PROPERTIES_PER_PAGE, (page + 1) * PROPERTIES_PER_PAGE).map((n) => view(n, locale, null, false));
    const self = new URL(`${viewBase}${locale !== DEFAULT_LOCALE ? `/${locale}` : ""}/jsonapi/views/properties/listing`, "http://x");
    for (const [k, v] of p) self.searchParams.set(k, v);
    const href = (u) => (viewBase.startsWith("http") ? u.toString() : `${u.pathname}${u.search}`);
    const links = { self: { href: href(self) } };
    if ((page + 1) * PROPERTIES_PER_PAGE < list.length) {
      const next = new URL(self);
      next.searchParams.set("page", String(page + 1));
      links.next = { href: href(next) };
    }
    return { jsonapi: { version: "1.0" }, data: rows, included: includes(rows, p.get("include"), locale), meta: { count: list.length }, links };
  }

  /**
   * Answer one request the way a Drupal site with jsonapi, decoupled_router,
   * jsonapi_menu_items and jsonapi_views does.
   *
   * @param {Request} request
   * @param {{ viewBase?: string, authed?: boolean }} [ctx] viewBase: where the
   *   browser reaches the view endpoint (its `self` link); authed: the request
   *   carried a valid token (a draft revision needs one).
   */
  async function handle(request, ctx = {}) {
    const url = new URL(request.url);
    const origin = url.origin;
    const viewBase = ctx.viewBase ?? origin;
    let path = url.pathname;
    let locale = DEFAULT_LOCALE;
    const lm = path.match(/^\/(es)(\/.*)$/);
    if (lm) {
      locale = lm[1];
      path = lm[2];
    }
    if (request.method !== "GET") return json(405, { errors: [{ status: "405", title: "Method Not Allowed" }] });

    if (path === "/router/translate-path") {
      const t = translate(url.searchParams.get("path") || "/");
      if (!t) return json(404, { message: `Unable to resolve path ${url.searchParams.get("path")}.`, details: "None of the available methods were able to find a match for this path." });
      const { n, locale: l } = t;
      const bundle = n.type.split("--")[1];
      const individual = `${base(origin, l)}/node/${bundle}/${n.id}`;
      return json(200, {
        resolved: `${origin}${l !== DEFAULT_LOCALE ? `/${l}` : ""}${aliasOf(n, l)}`,
        isHomePath: aliasOf(n, l) === "/home",
        entity: { canonical: `${origin}${aliasOf(n, l)}`, type: "node", bundle, id: String(n.nid), uuid: n.id, langcode: l },
        label: (l !== DEFAULT_LOCALE && n.es ? n.es : n.attributes).title,
        jsonapi: { individual, resourceName: n.type, pathPrefix: "jsonapi", basePath: "/jsonapi", entryPoint: base(origin, DEFAULT_LOCALE) },
      });
    }

    if (path === "/jsonapi") {
      const types = ["node--landing_page", "node--page", "node--article", "node--property_listing", "media--image", "file--file", "user--user", "taxonomy_term--property_location"];
      const links = Object.fromEntries(types.map((t) => [t, { href: `${base(origin, locale)}/${t.replace("--", "/")}` }]));
      links.self = { href: base(origin, locale) };
      return json(200, { jsonapi: { version: "1.0" }, data: [], links });
    }

    let m;
    if ((m = path.match(/^\/jsonapi\/menu_items\/([\w-]+)$/))) {
      const items = menus[m[1]];
      if (!items) return json(404, { errors: [{ status: "404", title: "Not Found" }] });
      return json(200, {
        jsonapi: { version: "1.0" },
        data: items.map(([en, es, enUrl, esUrl], i) => ({
          type: "menu_link_content--menu_link_content",
          id: `menu_link_content:${m[1]}-${i}`,
          attributes: { description: null, enabled: true, expanded: false, menu_name: m[1], meta: {}, options: {}, parent: "", provider: "menu_link_content", route: { name: "", parameters: [] }, title: locale === "es" ? es : en, url: locale === "es" ? esUrl : enUrl, weight: i },
        })),
      });
    }

    if (path === "/jsonapi/views/properties/listing") return json(200, propertiesView(url, locale, viewBase));

    if ((m = path.match(/^\/jsonapi\/node\/(\w+)\/([\w-]+)$/))) {
      const n = nodes.find((x) => x.type === `node--${m[1]}` && x.id === m[2]);
      if (!n || (locale !== DEFAULT_LOCALE && !n.es)) return json(404, { errors: [{ status: "404", title: "Not Found" }] });
      const v = view(n, locale, url.searchParams.get("resourceVersion"), Boolean(ctx.authed));
      if (!v) return json(403, { errors: [{ status: "403", title: "Forbidden", detail: "The current user is not allowed to view this revision." }] });
      return json(200, { jsonapi: { version: "1.0" }, data: v, included: includes([v], url.searchParams.get("include"), locale) });
    }

    if ((m = path.match(/^\/jsonapi\/node\/(\w+)$/))) {
      const p = url.searchParams;
      let list = nodes.filter((x) => x.type === `node--${m[1]}` && (locale === DEFAULT_LOCALE || x.es)).map((n) => view(n, locale, null, false)).filter(Boolean);
      if (p.get("filter[status]") === "1") list = list.filter((n) => n.attributes.status);
      const sort = p.get("sort");
      if (sort) {
        const key = sort.replace(/^-/, "");
        const dir = sort.startsWith("-") ? -1 : 1;
        list.sort((a, b) => (a.attributes[key] > b.attributes[key] ? dir : a.attributes[key] < b.attributes[key] ? -dir : 0));
      }
      const limit = Number(p.get("page[limit]") || 50);
      const offset = Number(p.get("page[offset]") || 0);
      return json(200, collection(list, url, locale, { limit, offset }));
    }

    return json(404, { errors: [{ status: "404", title: "Not Found", detail: `No sample resource at ${url.pathname}` }] });
  }

  return { handle, nodes, translate };
}
