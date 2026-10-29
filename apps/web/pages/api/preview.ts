import type { NextApiRequest, NextApiResponse } from "next"

import { connected, drupal } from "lib/drupal"

// Drupal's preview link lands here: next-drupal asks the Drupal site to
// validate the link's secret (its `next` module holds it), then turns on
// preview mode and redirects to the page, which reads the draft revision.
export default async function preview(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (!connected) {
    return response
      .status(401)
      .json({ message: "No Drupal site is connected: there is nothing to preview." })
  }
  return drupal.preview(request, response)
}
