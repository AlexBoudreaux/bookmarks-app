/**
 * Extract tweet ID from twitter.com or x.com URL
 * @param url - Tweet URL
 * @returns Tweet ID or null if not a valid tweet URL
 */
export function getTweetId(url: string): string | null {
  if (!url) return null

  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return match ? match[1] : null
}
