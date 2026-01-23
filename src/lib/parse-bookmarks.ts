export interface Bookmark {
  url: string
  title: string
  addDate: Date | null
  folderPath: string
  isTweet: boolean
}

// Extended bookmark type with isKeeper flag (set after boundary detection)
export interface ParsedBookmark extends Bookmark {
  isKeeper: boolean
}

/**
 * Parses Chrome's Netscape bookmark format HTML and extracts bookmarks
 * with their metadata and folder structure.
 */
export function parseBookmarksHtml(html: string): Bookmark[] {
  if (!html || html.trim().length === 0) {
    return []
  }

  const bookmarks: Bookmark[] = []
  const folderStack: string[] = []

  // Use DOMParser if available (browser), otherwise parse manually
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    parseNode(doc.body)
  } else {
    // Manual parsing for Node.js environment
    parseManually(html)
  }

  function parseNode(node: Node): void {
    const children = Array.from(node.childNodes)

    for (let i = 0; i < children.length; i++) {
      const child = children[i]

      if (child.nodeType !== Node.ELEMENT_NODE) continue

      const element = child as Element

      if (element.tagName === 'DT') {
        const firstChild = element.firstElementChild

        if (firstChild?.tagName === 'H3') {
          // This is a folder declaration
          const folderName = firstChild.textContent?.trim() || ''
          folderStack.push(folderName)

          // In happy-dom, the folder's DL is a CHILD of the DT element
          // Look for DL among the DT's children
          Array.from(element.children).forEach(dtChild => {
            if (dtChild.tagName === 'DL') {
              parseNode(dtChild)
            }
          })

          folderStack.pop()
        } else if (firstChild?.tagName === 'A') {
          // This is a bookmark
          const anchor = firstChild as HTMLAnchorElement
          const url = anchor.getAttribute('HREF') || ''
          const title = anchor.textContent?.trim() || ''
          const addDateStr = anchor.getAttribute('ADD_DATE')
          const addDate = addDateStr ? new Date(parseInt(addDateStr, 10) * 1000) : null
          const isTweet = /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url)

          bookmarks.push({
            url,
            title,
            addDate,
            folderPath: folderStack.join('/'),
            isTweet,
          })
        }
      } else if (element.tagName === 'DL') {
        // Direct DL without a parent DT (e.g., root level)
        parseNode(element)
      }
    }
  }

  function parseManually(htmlString: string): void {
    // State machine parser for Node.js environment
    let currentFolder: string | null = null
    let inFolderContent = false

    const lines = htmlString.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Check for folder (H3 tag) - this starts a folder declaration
      const folderMatch = line.match(/<H3[^>]*>(.*?)<\/H3>/i)
      if (folderMatch) {
        currentFolder = folderMatch[1].trim()
        inFolderContent = false
        continue
      }

      // Check for opening DL tag after a folder - this means we're entering folder content
      if (currentFolder && !inFolderContent && line.includes('<DL>')) {
        folderStack.push(currentFolder)
        currentFolder = null
        inFolderContent = true
        continue
      }

      // Check for closing DL tag - end of current folder level
      if (line.includes('</DL>')) {
        if (folderStack.length > 0) {
          folderStack.pop()
        }
        inFolderContent = folderStack.length > 0
        continue
      }

      // Check for bookmark (A tag)
      const bookmarkMatch = line.match(/<A\s+([^>]*?)>(.*?)<\/A>/i)
      if (bookmarkMatch) {
        const attributes = bookmarkMatch[1]
        const title = bookmarkMatch[2].trim()

        const hrefMatch = attributes.match(/HREF="([^"]*)"/i)
        const url = hrefMatch ? hrefMatch[1] : ''

        const addDateMatch = attributes.match(/ADD_DATE="(\d+)"/i)
        const addDate = addDateMatch ? new Date(parseInt(addDateMatch[1], 10) * 1000) : null

        const isTweet = /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url)

        bookmarks.push({
          url,
          title,
          addDate,
          folderPath: folderStack.join('/'),
          isTweet,
        })
      }
    }
  }

  return bookmarks
}
