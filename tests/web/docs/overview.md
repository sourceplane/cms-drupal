# web-tests

The port's vitest suite — the sample Drupal read through next-drupal, a connected Drupal over HTTP (the stand-in fake-drupal.mjs, with drafts behind an OAuth token and preview links validated by Drupal), the revalidation and preview routes, the site-name seam and the multi-site filter

The test suite for **web**. It deploys nothing: its lane installs, builds and runs the tests.

|              |                      |
| ------------ | -------------------- |
| Type         | `turbo-package`      |
| Source       | `tests/web`          |
| Package      | `@app/web-tests`     |
| Environments | `dev`: `quick-check` |

## Depends on

- (none)

## Depended on by

- (none)
