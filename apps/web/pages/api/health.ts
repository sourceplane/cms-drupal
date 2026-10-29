import type { NextApiRequest, NextApiResponse } from "next"

import { connected } from "lib/drupal"

// The Worker's own answer (no static file can give it), for the deployment
// record: whether this build reads a Drupal site or the bundled sample.
export default function health(_: NextApiRequest, response: NextApiResponse) {
  response.setHeader("cache-control", "no-store")
  response.json({ ok: true, connected })
}
