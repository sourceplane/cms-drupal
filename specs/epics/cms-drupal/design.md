# cms-drupal — design

## 1. The site

Vercel's Drupal Marketing Site (chapter-three/next-drupal
`examples/example-marketing` at `80a89f1`): a Next.js Pages Router app read
from a headless Drupal with next-drupal. One catch-all page,
`pages/[[...slug]].tsx`, resolves every path through Drupal's decoupled
router (`/router/translate-path`) and renders the node it names —
`node--landing_page` (a list of paragraphs: hero, feature, cards, FAQ, and a
`view` paragraph that embeds the `properties--listing` view), `node--page`
(formatted text, inline images turned into `next/image`) or `node--article`.
`getStaticPaths` lists every node's path in both languages (en, es) and
`fallback: "blocking"` renders a path Drupal adds later; `getStaticProps`
reads the node with its includes (`lib/get-params.ts`), the menus
(`jsonapi_menu_items`) and, for a view paragraph, the view's first page
(`jsonapi_views`). `/blog` is `/blog/page/0` (two articles a page). The
properties view is re-queried in the browser with TanStack Query against the
view's own `self` link, with the filters as `views-filter[...]`.
`/api/revalidate?path&secret` calls `res.revalidate(path)`;
`/api/preview` is next-drupal's `preview()` — it asks Drupal to validate the
link (`/next/draft-url`, where Drupal's `next` module holds the secret),
then sets Next's preview cookies and redirects; a page in preview reads the
draft revision (`resourceVersion`) with the OAuth consumer's token.

## 2. Vercel → Cloudflare

| Vercel | Here |
|---|---|
| Next.js hosting | `@opennextjs/cloudflare` 1.20.11: one Worker (`.open-next/worker.js`) + Static Assets |
| ISR cache | R2 (`NEXT_INC_CACHE_R2_BUCKET`), a bucket per environment from `infra/terraform/cloudflare-r2` |
| `res.revalidate` | the same; the adapter routes its self-request through `WORKER_SELF_REFERENCE` |
| Preview mode | unchanged |
| Image Optimization | off — Drupal's files served as Drupal sends them |
| Env vars | `DRUPAL_BASE_URL` and `DRUPAL_SITE_ID` as optional build secrets, inlined; the OAuth consumer and `DRUPAL_REVALIDATE_SECRET` as Worker secrets the deploy sets |
| `NEXT_PUBLIC_BASE_URL` | `NEXT_PUBLIC_SITE_URL`: the environment's `SITE_URL`, else its workers.dev URL |

The scaffolding is cms-sanity's CMS-frontend shape with sfcc-commerce's
cache root: the CMS baselines (cms-sanity, cms-contentful, cms-wordpress)
render per request or statically and have no R2 cache; sfcc-commerce carries
the settled R2 root, the wiring render, the Worker-secret hand-over and a
connected e2e against a stand-in, which this site needs as they are.

## 3. The cache

`open-next.config.ts`: the R2 incremental cache and the in-isolate memory
queue. No tag cache and no Durable Objects: the Pages Router revalidates by
path, the template sets no time-based `revalidate`, and nothing reads a tag.
Entries are keyed by build ID, so a deploy starts from fresh pages. The
Worker binds itself (`services: WORKER_SELF_REFERENCE` → its own name, per
environment) for `res.revalidate` and the queue.

## 4. The router, ISR and preview on Workers — the spike

The template's backend is gone (cms.next-drupal.org is an Umami demo without
the marketing content model), so the spike ran the whole example — upgraded to
Next 16.3.8, React 19 and next-drupal 2.0.1 — on OpenNext 1.20.11 with the R2
cache under `wrangler dev`, against a stand-in Drupal answering the
decoupled router, JSON:API, the menus, OAuth and `/next/draft-url`
(`~/orunbase/spikes/cms-drupal.md` holds the log):

- **router**: `/` and `/about` served from the cache; unknown paths 404 in
  both languages (`translate-path` 404 → `notFound`); `/es/about` asked
  Drupal for `/es/about` (the locale prefix kept), and after the stand-in
  learned that alias a revalidation turned the cached 404 into the page.
- **ISR**: an edit in Drupal stayed cached; `/api/revalidate` with a wrong
  secret 401, with the right one `{}`; the next visit had the edit, still a
  cache hit. It works because @opennextjs/cloudflare's `patch-res-revalidate`
  rewrites Next's `fetch(https://${host}${path}, HEAD)` into
  `WORKER_SELF_REFERENCE.fetch` — the binding is required.
- **preview**: a wrong secret 401 (Drupal's answer); the right one 307 with
  both cookies; the page with them was the draft revision, `private,
  no-store`; without them the published page; exit-preview expired both.
- the Worker 1.2 MiB gzipped; no workerd errors (next-drupal's module-scope
  `node-cache` timer is created inside the first request).

It also found what the port had to change (§7, IMPLEMENTATION-STATUS).

## 5. Build-time settings

`next.config.ts` `env` inlines `NEXT_PUBLIC_DRUPAL_BASE_URL` (from the
`DRUPAL_BASE_URL` secret, trailing slashes dropped), `DRUPAL_SITE_ID`,
`DRUPAL_FRONT_PAGE` and `NEXT_PUBLIC_BASE_URL` (from `NEXT_PUBLIC_SITE_URL`).
The build pre-renders every page Drupal lists, so it reads Drupal; at request
time a Worker's `process.env` holds only its vars and secrets, which is
where the OAuth consumer and the revalidation secret are read.

## 6. Before a Drupal, and after

With no `DRUPAL_BASE_URL` the client is constructed with a never-contacted
origin and next-drupal's own `fetcher` option set to
`lib/sample-drupal.mjs`: every request the pages make — the router, nodes
with includes, collections with sorting and paging, the menus, the view with
its filters — is answered in the Worker in the shapes those Drupal modules
return, from the template's content model with sample words (the headings,
the author and the dates the template's Cypress tests look for) and four
photos (`public/sample`, Payload's, MIT). The same code renders the same
pages; a layout notice says no Drupal is connected; `/api/preview` answers
401; the browser's view search reaches the sample at `/api/sample-drupal`.
The module is plain JavaScript so the stand-in Drupal the tests run serves
exactly it over HTTP. With a URL set, the sample route answers 404 and the
view links point at Drupal.

## 7. Revalidation and preview

`/api/revalidate` is upstream's, with one change: it refuses every call
while `DRUPAL_REVALIDATE_SECRET` is unset. Upstream compared
`secret !== process.env.DRUPAL_REVALIDATE_SECRET`, so with no secret set a
call without one passed and anyone could re-render any page. Drupal's front
page path (`/home`) is revalidated as `/`. Preview is next-drupal's, unchanged;
the OAuth consumer is given to the client only when both its id and secret
are set. The multi-site filter (`field_site`) is applied only when
`DRUPAL_SITE_ID` is set, so a Drupal without the template's site field works.

## 8. Tests

`tests/web` (vitest): the sample Drupal read through next-drupal's own
client — the front page's paragraphs with their media, the Spanish
translation, an unknown path, the articles' order and paging, every static
path in both languages, the view and its filters, the menus as serialisable
data; a connected Drupal over HTTP (`fake-drupal.mjs` on a free port) — read
over the network, a draft only in preview with a token, the preview secret
validated by Drupal, a wrong OAuth client refused; the two routes Drupal
calls; the name seam and the multi-site filter. The e2e tier
(`testing/e2e.test.sh`) builds the product in the stage lane's staged tree,
serves it as born and reads every route through `testing/lib/e2e-visit.py`,
then builds it again connected to the stand-in and proves the cache, the
revalidation and preview end to end.

## 9. The rename

`SITE_NAME` in `apps/web/site.ts` (the template's navbar brand,
"Marketing") is the one name seam; the slug `cms-drupal` appears only in its
identity forms (the Worker, the buckets, the secret project, the
repository link), and its Pascal form nowhere.

## 10. Alternatives rejected

- **Static-assets cache with `force-dynamic` pages** (cms-wordpress's shape):
  drops the template's ISR and makes Drupal's revalidation meaningless.
- **Durable Object tag cache and queue** (the commerce shape): nothing in a
  Pages Router site reads a tag, and no page revalidates on a timer.
- **Rendering the self-request in-process instead of the service binding**:
  the adapter already routes `res.revalidate` through `WORKER_SELF_REFERENCE`;
  a binding to the Worker's own name is configuration, not code.
- **A sample-content branch in every page**: the fetcher seam keeps the
  template's pages untouched and makes the sample answer exactly what a Drupal
  answers.
- **Running a real Drupal for the sample or the tests**: needs PHP and a
  database (a container), which the platform has no composition for; the
  stand-in is deterministic and offline.
