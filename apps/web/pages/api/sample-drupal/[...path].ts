import type { NextApiRequest, NextApiResponse } from "next"

import { connected } from "lib/drupal"
import { createSampleDrupal } from "lib/sample-drupal.mjs"

// The sample Drupal over HTTP, for the one request the browser makes itself:
// the properties search, which follows the view's own `self` link. Gone once
// a Drupal site is connected (the link then points at Drupal).
const sample = connected ? null : createSampleDrupal()

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (!sample) {
    return response.status(404).json({ message: "A Drupal site is connected." })
  }
  const segments = ([] as string[]).concat(request.query.path ?? [])
  const query = request.url?.split("?")[1]
  const answer = await sample.handle(
    new Request(
      `https://sample-drupal.invalid/${segments.join("/")}${query ? `?${query}` : ""}`
    ),
    { viewBase: "/api/sample-drupal" }
  )
  response.status(answer.status)
  response.setHeader("content-type", "application/vnd.api+json")
  response.send(await answer.text())
}
