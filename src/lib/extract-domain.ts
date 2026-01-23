/**
 * Extracts the domain from a URL, removing www. prefix and handling edge cases.
 * Returns empty string for invalid URLs.
 */
export function extractDomain(url: string): string {
  if (!url || url.trim().length === 0) {
    return ''
  }

  try {
    // Add protocol if missing for URL parsing
    const urlToParse = url.startsWith('http') ? url : `https://${url}`
    const parsed = new URL(urlToParse)
    let hostname = parsed.hostname

    // Remove www. prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }

    return hostname
  } catch {
    // Invalid URL
    return ''
  }
}
