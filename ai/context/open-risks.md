# cms-drupal — open risks

What is not yet proven or not yet decided. The full write-up of every risk,
including the accepted and resolved ones, is
`specs/epics/cms-drupal/risks-and-open-questions.md`; this page lists only what
is still live, so it should be short.

| ID | Risk | State | What closes it |
|---|---|---|---|
| DR-A | No live bootstrap yet: the repository created and linked, the two tokens minted, a real `terraform apply`, a real `wrangler deploy` with the R2 and self-reference bindings and the Worker secrets, the probes, and a real Drupal site connected | OPEN | One bootstrap from a tag against a workspace, then a Drupal site with the template's content model connected, a node saved and a draft previewed |
| DR-B | The template's content model: a Drupal without the template's content types, paragraphs, menus and the `properties` view renders pages the components do not know (an unknown paragraph renders nothing; `/properties` needs the view) | OPEN — the owner's, stated in the README ("Connecting Drupal") | The owner's Drupal carries the model (next-drupal's repository ships it as configuration) |
| DR-C | The properties search runs in the browser against Drupal's own view link: a connected Drupal must allow the site's origin (CORS) | WATCH | The first connected deployment's `/properties` search |
| DR-M | Preview's cookies are `SameSite=None; Secure` (next-drupal's), for Drupal's iframe preview: proven over HTTP on wrangler dev, not yet inside Drupal's preview iframe | WATCH | A preview from a real Drupal |

Accepted, and worth knowing before you change them: DR-D (Next pinned to
16.3.8 with the adapter, next-drupal's own Next overridden), DR-E (images
unoptimized), DR-F (a deploy starts from fresh pages), DR-G (the stand-in is
not a Drupal), DR-H (the site-name seam; gated), DR-I (the sample content is
written in the template's model, not exported from a Drupal), DR-J
(`node-cache`'s timer in next-drupal, created on the first request).
