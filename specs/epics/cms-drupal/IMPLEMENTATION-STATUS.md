# cms-drupal — implementation status

| Milestone | State | Landed |
|---|---|---|
| DR0 — the spec | ✅ | DR-1 |
| DR1 — the site on Workers | ✅ | DR-2 |
| DR2 — a baseline | planned | DR-3 |

## Departures from the upstream template

Everything not listed here is chapter-three/next-drupal
`examples/example-marketing` as it is at `80a89f1`.

| # | What | Why |
|---|---|---|
| 1 | The app lives in `apps/web` of a pnpm workspace (`@app/web`); `dev`/`start` on port 3001 as upstream | The workspace's shape |
| 2 | `next` ^14.2.2 → 16.3.8, `react` 18 → 19.2.8, `next-drupal` ^2.0.0-beta.0 → 2.0.1 (its own `next` dependency overridden to 16.3.8), `@tanstack/react-query` 4 → 5, `html-react-parser` 4 → 5, `drupal-jsonapi-params` 2.3.1; dependencies pinned | @opennextjs/cloudflare 1.20.11 refuses Next 15.5 and fails on 16.4.x; React 19 needs Query 5 |
| 3 | `next build --webpack`; `output: "standalone"`, `outputFileTracingRoot` at the workspace root, `images.unoptimized` (was `images.domains`), `swcMinify` dropped, `initOpenNextCloudflareForDev()`; `open-next.config.ts` (R2 cache, memory queue), `wrangler.template.jsonc` (R2, `WORKER_SELF_REFERENCE`), `wiring.fixture.json`, `@opennextjs/cloudflare` and `wrangler` added | OpenNext's build and bindings |
| 4 | `next.config.ts` (from `.js`) `env` inlines `NEXT_PUBLIC_DRUPAL_BASE_URL` (from `DRUPAL_BASE_URL`), `DRUPAL_SITE_ID`, `DRUPAL_FRONT_PAGE` and `NEXT_PUBLIC_BASE_URL` (from `NEXT_PUBLIC_SITE_URL`); i18n and rewrites as upstream | A Worker's `process.env` holds only its vars and secrets |
| 5 | `lib/drupal.ts`: no URL → next-drupal's `fetcher` is `lib/sample-drupal.mjs` (new), the sample Drupal; the OAuth client only when both its id and secret are set; `connected` exported. `pages/api/sample-drupal/[...path].ts` (new) serves the sample to the browser's view search; `components/layout.tsx` shows the notice | A product deploys before its owner connects a Drupal; upstream fails its build without one |
| 6 | `pages/api/preview.ts`: 401 with no Drupal connected | Nothing to preview |
| 7 | `pages/api/revalidate.ts`: refuses every call while `DRUPAL_REVALIDATE_SECRET` is unset; the front page from `DRUPAL_FRONT_PAGE` or `/home` | Upstream let a call with no secret through when none was set (`undefined !== undefined` is false) |
| 8 | `lib/get-params.ts` `siteFilter`: the `field_site` filter only with `DRUPAL_SITE_ID`; the catch-all's `getStaticPaths` and the blog use it | A Drupal without the template's site field |
| 9 | `lib/get-menus.ts` returns a JSON copy of the menus | next-drupal 2's menu tree marks leaves `items: undefined`, which `getStaticProps` refuses to serialise |
| 10 | `site.ts` (new): `SITE_NAME = "Marketing"`; the navbar's brand, the titles' suffix (was "Next.js for Drupal") and the footer (was "Next.js + Drupal") read it; the default description says "site" (was "blog"); `og:image` is `/meta.jpg` (was `/images/meta.jpg`, which upstream never shipped) | One rename seam |
| 11 | `next/link` without the inner `<a>` (its attributes moved onto `Link`) in nine places; `next/image` without `layout`/`objectFit` (the codemod's `style`), with `alt`s; the inline-image sizes parsed as numbers and their URL built with `absoluteURL` (upstream added a second `/`); `Element` imported from html-react-parser (was `domhandler/lib/node`); `React.JSX`; the unused `components/link.tsx` typed for React 19 | Next 13+ and React 19 APIs; the look is kept |
| 12 | `components/view--properties_listing.tsx`: TanStack Query 5's object form (`placeholderData: keepPreviousData`, `isPlaceholderData`, `invalidateQueries({ queryKey })`); the view link resolved against the page (`new URL(url, location.href)`); `pages/_app.tsx`: `HydrationBoundary` | Query 5; the sample's link is site-relative |
| 13 | `lib/utils/absolute-url.ts` reads `drupalBaseUrl` and adds a leading `/` when missing; the property images use it | The sample's photos are on the site |
| 14 | `pages/api/health.ts` (new): `{ok, connected}` | The deployment record's probe |
| 15 | `types/next-globals.d.ts` (new), `tsconfig.json` (bundler resolution, `react-jsx`, `baseUrl` kept, `strict` off as upstream); `eslint.config.mjs` (the workspace's; upstream used `next lint`, gone in Next 16) | The workspace's checks run before a build |
| 16 | `public/sample/` (new): four photos and their licence | The sample Drupal's media |
| 17 | Not carried: `cypress/`, `cypress.json`, `CHANGELOG.md`, `next-env.d.ts`, `.env.example`'s example OAuth client (replaced by empty settings) | Upstream's Cypress needs its gone demo Drupal (its assertions are the e2e's); credentials are Orun secrets |

## Verified

- The spike (design.md §4): next-drupal's router, on-demand revalidation
  through `WORKER_SELF_REFERENCE` and preview on OpenNext 1.20.11 with the R2
  cache.
- `pnpm typecheck`, `lint`, `test` (tests/web's 19) and `build` green with
  no Drupal; the Worker is 1253.38 KiB gzipped (5542.44 KiB raw).
- Unconnected under `wrangler dev`: `/`, `/es`, `/about`, `/blog` (both
  pages), `/es/blog`, an article and `/properties` render the sample with the
  notice; the view's search answers (12, four a page; one 4-bed San
  Francisco sale); unknown paths 404; `/api/revalidate` and `/api/preview`
  401.
- Connected (a stand-in Drupal), under `wrangler dev` and in Baseline CI's
  e2e: pages from Drupal with no notice; a second visit reads Drupal not at
  all; an edit waits for `/api/revalidate`, wrong secrets refused, then shows
  and is cached; Drupal's preview link opens the draft (`no-store`), and
  leaving preview restores the published page; neither the OAuth client nor
  the revalidation secret is in the build.
