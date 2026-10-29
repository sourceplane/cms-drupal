# apps/web

Vercel's Drupal Marketing Site — next-drupal's `example-marketing` (MIT,
`LICENSE`) — on Next.js 16's Pages Router: pages built in Drupal and read
with next-drupal over JSON:API, pre-rendered and kept in R2, re-rendered on
Drupal's call, drafts in preview. Built by `@opennextjs/cloudflare` into one
Worker with Static Assets.

- `pages/[[...slug]].tsx` — every path Drupal's decoupled router resolves
  (landing pages, basic pages, articles; `/` is Drupal's `/home`), in English
  and under `/es`
- `pages/blog/page/[page].tsx` — the blog, two articles a page (`/blog` is page 0)
- `pages/api/revalidate.ts`, `preview.ts`, `exit-preview.ts` — the routes
  Drupal calls; `pages/api/health.ts`; `pages/api/sample-drupal/` — the sample
  Drupal for the browser's properties search
- `site.ts` — the site's name
- `lib/drupal.ts` — the next-drupal client; `lib/sample-drupal.mjs` — what it
  reads before a Drupal is connected; `lib/get-params.ts` — what each content
  type includes; `lib/get-menus.ts`
- `components/` — the template's paragraphs, nodes, media, the properties
  view, the navbar, footer and locale switcher
- `public/sample/` — the sample's photos (Payload's, MIT, `LICENSE.md`)

```bash
pnpm dev        # next dev on http://localhost:3001
pnpm build      # next build --webpack + opennextjs-cloudflare build → .open-next/
pnpm preview    # wrangler dev over the built Worker and a local R2 bucket
```

The cache's bucket is not hand-written. `wrangler.template.jsonc` names it as
a wiring token; `wrangler.jsonc` is that template rendered from
`wiring.fixture.json` (placeholder names, for local work and verification),
and every deploy renders it again from the name the `cloudflare-r2` Terraform
root published for the environment (`component.yaml`'s `buildCommand`).

## Drupal

| `DRUPAL_BASE_URL` | pages | revalidation and preview |
| ----------------- | ----- | ------------------------ |
| unset (a fresh deploy) | the bundled sample Drupal, under a "No Drupal site is connected" notice | `/api/preview` 401; `/api/revalidate` 401 until its secret is set |
| set (read by the build) | Drupal's, pre-rendered and kept in R2 | `/api/revalidate` re-renders a path with `DRUPAL_REVALIDATE_SECRET`; preview reads drafts with `DRUPAL_CLIENT_ID` / `DRUPAL_CLIENT_SECRET` |

Connecting Drupal is one Orun secret and a redeploy, and revalidation and
preview three more — the repository's README, "Connecting Drupal".
