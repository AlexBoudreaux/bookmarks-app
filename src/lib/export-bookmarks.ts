/**
 * Export keeper bookmarks to Chrome's Netscape bookmark format HTML.
 * Preserves folder structure from chrome_folder_path.
 */

interface KeeperBookmark {
  url: string
  title: string | null
  add_date: string | null
  chrome_folder_path: string | null
}

interface FolderNode {
  name: string
  children: Map<string, FolderNode>
  bookmarks: KeeperBookmark[]
}

/**
 * Escape HTML special characters to prevent XSS and malformed HTML
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Convert ISO date string to Unix timestamp in seconds
 */
function toUnixTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000)
}

/**
 * Build a tree structure from flat bookmark list based on folder paths
 */
function buildFolderTree(keepers: KeeperBookmark[]): FolderNode {
  const root: FolderNode = {
    name: '',
    children: new Map(),
    bookmarks: [],
  }

  for (const bookmark of keepers) {
    const folderPath = bookmark.chrome_folder_path

    // No folder path or empty string means root level
    if (!folderPath || folderPath === '') {
      root.bookmarks.push(bookmark)
      continue
    }

    // Split path into folder names
    const folders = folderPath.split('/')
    let current = root

    for (const folderName of folders) {
      if (!folderName) continue

      if (!current.children.has(folderName)) {
        current.children.set(folderName, {
          name: folderName,
          children: new Map(),
          bookmarks: [],
        })
      }
      current = current.children.get(folderName)!
    }

    current.bookmarks.push(bookmark)
  }

  return root
}

/**
 * Render a single bookmark as HTML
 */
function renderBookmark(bookmark: KeeperBookmark, indent: string): string {
  const title = bookmark.title ? escapeHtml(bookmark.title) : escapeHtml(bookmark.url)
  const addDateAttr = bookmark.add_date
    ? ` ADD_DATE="${toUnixTimestamp(bookmark.add_date)}"`
    : ''

  return `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}"${addDateAttr}>${title}</A>`
}

/**
 * Recursively render a folder and its contents
 */
function renderFolder(node: FolderNode, indent: string, isToolbarFolder: boolean = false): string {
  const lines: string[] = []
  const childIndent = indent + '    '

  // Open folder header (skip for root)
  if (node.name) {
    const toolbarAttr = isToolbarFolder ? ' PERSONAL_TOOLBAR_FOLDER="true"' : ''
    lines.push(`${indent}<DT><H3${toolbarAttr}>${escapeHtml(node.name)}</H3>`)
    lines.push(`${indent}<DL><p>`)
  }

  // Render child folders first
  for (const [, childNode] of node.children) {
    lines.push(renderFolder(childNode, node.name ? childIndent : indent))
  }

  // Then render bookmarks
  for (const bookmark of node.bookmarks) {
    lines.push(renderBookmark(bookmark, node.name ? childIndent : indent))
  }

  // Close folder (skip for root)
  if (node.name) {
    lines.push(`${indent}</DL><p>`)
  }

  return lines.join('\n')
}

/**
 * Export keeper bookmarks to Chrome's Netscape bookmark format HTML.
 *
 * @param keepers Array of keeper bookmarks with url, title, add_date, chrome_folder_path
 * @returns HTML string in Chrome bookmark export format
 */
export function exportToChrome(keepers: KeeperBookmark[]): string {
  const tree = buildFolderTree(keepers)

  const header = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>`

  const footer = `</DL><p>`

  // Render all folders and bookmarks
  const content: string[] = []

  // Check if we have a "Bookmarks Bar" folder at the root
  const bookmarksBar = tree.children.get('Bookmarks Bar')
  if (bookmarksBar) {
    // Render Bookmarks Bar with PERSONAL_TOOLBAR_FOLDER attribute
    content.push(renderFolder(bookmarksBar, '    ', true))
    tree.children.delete('Bookmarks Bar')
  } else {
    // Create an empty Bookmarks Bar placeholder
    content.push('    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>')
    content.push('    <DL><p>')
    content.push('    </DL><p>')
  }

  // Render any other root-level folders
  for (const [, childNode] of tree.children) {
    content.push(renderFolder(childNode, '    '))
  }

  // Render root-level bookmarks (those without folder path)
  for (const bookmark of tree.bookmarks) {
    content.push(renderBookmark(bookmark, '    '))
  }

  return [header, ...content, footer].join('\n')
}
