# cms-drupal — decisions

The choices that shape this repository, one line each, with where the full
reasoning lives. Superseded decisions stay listed, marked, so the history
reads in order.

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | OpenNext on Workers + Static Assets; the template's Pages Router kept | The template is a Pages Router app (SSG with `fallback: "blocking"`, API routes, i18n routing, preview mode): OpenNext runs every piece of it in the Worker, proven in the spike | `specs/epics/cms-drupal/design.md` §2, §4 |
| 2 | Every rendered page in R2 (`NEXT_INC_CACHE_R2_BUCKET`), a memory queue, no tag cache, no Durable Objects | The Pages Router revalidates by path and the template has no time-based revalidation; nothing reads a tag | design.md §3 |
| 3 | A `WORKER_SELF_REFERENCE` service binding to the environment's own Worker | `res.revalidate` renders the page by requesting it from the Worker; @opennextjs/cloudflare sends that request through the binding, because a Worker cannot fetch its own workers.dev hostname | design.md §4 |
| 4 | Next.js 16.3.8, React 19, next-drupal 2.0.1 (its `next` pinned to the app's with a pnpm override) | @opennextjs/cloudflare 1.20.11 refuses Next 15.5 and fails on 16.4.x; next-drupal lists `next ^14 \|\| ^15` as a dependency and would bundle a second Next | risk DR-D |
| 5 | `next build --webpack` | The spike's proven build; the Worker is 1.3 MiB gzipped | design.md §4 |
| 6 | The Drupal URL and site id inlined at build (`next.config.ts` `env`) | The build pre-renders every page Drupal lists, so it needs the URL; on Workers `process.env` at request time holds only the Worker's vars and secrets | design.md §5 |
| 7 | No Drupal, the sample Drupal: next-drupal's own `fetcher` answered in the Worker by `lib/sample-drupal.mjs` (the template's content model, JSON:API-shaped), the browser's view search through `/api/sample-drupal` | A baseline goes live with no key the platform cannot broker; the same requests and the same code render the same pages, and a connected Drupal replaces only the content | design.md §6 |
| 8 | The URL and site id are OPTIONAL build secrets; the OAuth consumer and the revalidation secret are Orun secrets kept out of the build (`env -u`) and put on the Worker by the deploy (`tooling/wire/worker-secrets.mjs`) | The build inlines the URL; the other three are read per request and must not be in the bundle | design.md §6 |
| 9 | `/api/revalidate` refuses every call while `DRUPAL_REVALIDATE_SECRET` is unset | Upstream compared `secret !== process.env.DRUPAL_REVALIDATE_SECRET`, so with no secret set a call with no `secret` passed (undefined === undefined) and anyone could re-render any page | design.md §7 |
| 10 | The multi-site filter (`field_site`) only when `DRUPAL_SITE_ID` is set | The template's Drupal tags every node with its site; a Drupal without that field would answer every filtered request with an error | design.md §7 |
| 11 | One site-name seam (`SITE_NAME`, `site.ts`, the template's navbar brand "Marketing"); the navbar, the titles and the footer read it | The rename rewrites one line; upstream wrote "Marketing", "Next.js for Drupal" and "Next.js + Drupal" in three places | risk DR-H |
| 12 | Each environment builds for its own origin: `NEXT_PUBLIC_SITE_URL` = `SITE_URL` or the workers.dev URL, read as the template's `NEXT_PUBLIC_BASE_URL` | Canonical and Open Graph links need an absolute origin | design.md §5 |
| 13 | Images unoptimized | Workers has no Next.js image optimizer | risk DR-E |
| 14 | The Next 12-era code moved to the current APIs: `next/link` without the inner `<a>`, `next/image` without `layout`/`objectFit` (the codemod's styles), TanStack Query 5, `Element` from html-react-parser, the menu tree serialised | Next 16 and React 19 refuse or warn on the old forms; the look is kept | IMPLEMENTATION-STATUS |
| 15 | The e2e connects a stand-in Drupal (`tests/web/fake-drupal.mjs`, the sample Drupal over HTTP plus OAuth, `/next/draft-url` and drafts), which the unit tests use too | Offline and deterministic; the real Drupal is the owner's | design.md §8 |
| 16 | The commerce baselines' machinery (R2 root, wiring, Worker secrets, the connected e2e) on cms-sanity's CMS shape | The CMS baselines have no R2 cache; sfcc-commerce's settled R2 + self-reference + stand-in shape is the closest | `specs/epics/cms-drupal/design.md` §2 |
| 17 | stack-tectonic 0.19.0, `ci.yml` as cms-sanity's, no `checks.yml`, the domain not asked, the subdomain from the Cloudflare connection | The settled baseline shape | `intent.yaml`, `blueprint.yaml` |
