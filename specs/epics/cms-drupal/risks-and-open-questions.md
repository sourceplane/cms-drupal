# cms-drupal — risks and open questions

| ID | Risk | State | Notes |
|---|---|---|---|
| DR-A | No live bootstrap yet (tokens, a real R2 apply, a real deploy with the R2 and self-reference bindings and the Worker secrets, the probes, a real Drupal) | OPEN | Closed by one bootstrap from a tag, a Drupal with the template's model connected, a node saved, a draft previewed |
| DR-B | The template's content model is the owner's to provide: unknown paragraph types render nothing, `/properties` needs the `properties` view | OPEN — the owner's | README, "Connecting Drupal"; next-drupal ships the model as Drupal configuration (`drupal/`) |
| DR-C | The properties search is a browser request to Drupal's view link: the Drupal must allow the site's origin (CORS) | WATCH | As upstream; with no Drupal it is the site's own `/api/sample-drupal` |
| DR-D | Next pinned to 16.3.8 (the adapter refuses 15.5 and fails on 16.4.x); next-drupal 2.0.1's own `next ^14 \|\| ^15` dependency overridden to the app's | ACCEPTED | `pnpm-workspace.yaml` `overrides`; one Next in the bundle |
| DR-E | Images unoptimized | ACCEPTED | Workers has no Next.js image optimizer; Drupal's image styles are the place to size images |
| DR-F | A deploy starts from fresh pages: the cache is keyed by build, so the first visit to each page after a deploy reads Drupal | ACCEPTED | As on Vercel, where a deploy is a new build |
| DR-G | The stand-in Drupal answers the shapes next-drupal reads, for the sample content; it is not a Drupal | ACCEPTED | DR-A closes it |
| DR-H | The site-name seam: the navbar, titles and footer read `SITE_NAME`; the leak and placement gates fail on the name spelled anywhere else | ACCEPTED, gated | `testing/leak.test.sh`, `testing/placement.test.sh` |
| DR-I | The sample content is written in the template's content model (field names from next-drupal's Drupal configuration, headings, author and dates from its Cypress tests), not exported from a running Drupal: the template's demo backend is gone and its Drupal ships no content | ACCEPTED | Every shape is read back through next-drupal's own deserializer in `tests/web` |
| DR-J | next-drupal creates a `node-cache` (a timer) when it loads; on workerd that happens during the first request, not at global scope | ACCEPTED | Proven in the spike and the e2e; no errors in the Worker's log |
| DR-M | Preview's cookies are `SameSite=None; Secure` for Drupal's iframe preview: proven over HTTP on wrangler dev, not inside Drupal's iframe | WATCH | A preview from a real Drupal |
