import type { NextApiRequest, NextApiResponse } from "next"

// Drupal calls this when content changes (its `next` module's on-demand
// revalidation): the page at `path` is rendered again and replaces the cached
// copy. DRUPAL_REVALIDATE_SECRET is a Worker secret; without it revalidation
// is off and every call is refused.
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  let path = request.query.path as string
  const secret = request.query.secret as string
  const expected = process.env.DRUPAL_REVALIDATE_SECRET

  // Validate secret.
  if (!expected || secret !== expected) {
    return response.status(401).json({ message: "Invalid secret." })
  }

  // Validate path.
  if (!path) {
    return response.status(400).json({ message: "Invalid path." })
  }

  // Fix for homepage.
  if (path === (process.env.DRUPAL_FRONT_PAGE || "/home")) {
    path = "/"
  }

  try {
    await response.revalidate(path)

    return response.json({})
  } catch (error) {
    return response.status(404).json({
      message: (error as Error).message,
    })
  }
}
