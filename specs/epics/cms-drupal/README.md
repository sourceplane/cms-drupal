# cms-drupal — Vercel's Drupal Marketing Site on Cloudflare Workers

**Vercel's Drupal Marketing Site is next-drupal's `example-marketing`: a
Next.js Pages Router site whose pages are built in Drupal — landing pages from
paragraphs, a blog, a properties listing with a filterable view, menus,
English and Spanish — pre-rendered, refreshed when Drupal says a page
changed, and previewed from Drupal before publishing. The port keeps that
whole model and moves it onto Cloudflare: one Worker, every page in R2, the
re-render going through the Worker's own service binding. Drupal's router,
on-demand revalidation and preview were the unproven part; a spike proved
all three on the adapter before anything was built on it. A product built
from it deploys with sample content in the template's content model before
its owner connects a Drupal, and renders theirs once they set its URL.**

| | |
|---|---|
| Status | In progress — DR0 on main |
| Upstream | [chapter-three/next-drupal](https://github.com/chapter-three/next-drupal) `examples/example-marketing` (MIT), at `80a89f1` (2026-10-23) — the template [Vercel lists](https://vercel.com/templates/next.js/drupal-nextjs-marketing-site) |
| Reference | [cms-sanity](https://github.com/sourceplane/cms-sanity) (the CMS-frontend baseline shape, an unconnected state), [sfcc-commerce](https://github.com/sourceplane/sfcc-commerce) (the R2 cache root, the wiring, Worker secrets and a connected e2e against a stand-in) |
| Key | `DR` |

## Read in this order

1. [design.md](design.md) — the site, how each Vercel piece maps to
   Cloudflare, the cache and the spike that proved it, build-time settings,
   the sample Drupal, revalidation and preview, the tests, and the
   alternatives rejected.
2. [implementation-plan.md](implementation-plan.md) — the milestones and
   what each one lands.
3. [risks-and-open-questions.md](risks-and-open-questions.md) — what is not
   proven, and what was accepted.
4. [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) — what shipped, and
   every departure from upstream.

## Milestones

| Milestone | What it lands | Task |
|---|---|---|
| DR0 — the spec | this doc set and the three task contracts | DR-1 |
| DR1 — the site on Workers | `apps/web`, the R2 root, `tests/web` | DR-2 |
| DR2 — a baseline | the card, the build document, the rename, the tiers | DR-3 |
