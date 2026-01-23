import type { Bookmark, ParsedBookmark } from './parse-bookmarks'

export interface BoundaryResult {
  boundaryFound: boolean
  keeperCount: number
  toCategorizeCount: number
  bookmarks: ParsedBookmark[]
}

/**
 * Detects the boundary between "keeper" bookmarks and "to categorize" bookmarks.
 *
 * The boundary is defined as the last bookmark in the "Tools" folder with the URL
 * "https://byebyepaywall.com/en/". Everything up to and including this bookmark
 * is considered a "keeper", and everything after is "to categorize".
 *
 * @param bookmarks - Array of parsed bookmarks
 * @returns BoundaryResult with counts, whether boundary was found, and bookmarks with isKeeper flag
 */
export function detectBoundary(bookmarks: Bookmark[]): BoundaryResult {
  if (bookmarks.length === 0) {
    return {
      boundaryFound: false,
      keeperCount: 0,
      toCategorizeCount: 0,
      bookmarks: [],
    }
  }

  const targetUrl = 'https://byebyepaywall.com/en/'
  let boundaryIndex = -1

  // Find the last occurrence of the target URL in a folder path containing "Tools"
  for (let i = bookmarks.length - 1; i >= 0; i--) {
    const bookmark = bookmarks[i]
    const folderPathLower = bookmark.folderPath.toLowerCase()

    // Check if folder path contains "Tools" (case-insensitive)
    // Match "Tools" as a complete folder name, not just substring
    const folderParts = folderPathLower.split('/')
    const hasToolsFolder = folderParts.some(part => part === 'tools')

    if (hasToolsFolder && bookmark.url === targetUrl) {
      boundaryIndex = i
      break
    }
  }

  if (boundaryIndex === -1) {
    // No boundary found, all bookmarks are to categorize
    const bookmarksWithKeeper = bookmarks.map(b => ({ ...b, isKeeper: false }))
    return {
      boundaryFound: false,
      keeperCount: 0,
      toCategorizeCount: bookmarks.length,
      bookmarks: bookmarksWithKeeper,
    }
  }

  // Apply isKeeper flag based on boundary
  const bookmarksWithKeeper = bookmarks.map((b, i) => ({
    ...b,
    isKeeper: i <= boundaryIndex,
  }))

  return {
    boundaryFound: true,
    keeperCount: boundaryIndex + 1, // Include the boundary bookmark itself
    toCategorizeCount: bookmarks.length - (boundaryIndex + 1),
    bookmarks: bookmarksWithKeeper,
  }
}
