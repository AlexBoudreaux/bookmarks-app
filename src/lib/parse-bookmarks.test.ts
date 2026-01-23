import { describe, it, expect } from 'vitest'
import { parseBookmarksHtml, type Bookmark } from './parse-bookmarks'

describe('parseBookmarksHtml', () => {
  it('parses basic bookmark with URL and title', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><A HREF="https://example.com" ADD_DATE="1234567890">Example Site</A>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      url: 'https://example.com',
      title: 'Example Site',
      addDate: new Date(1234567890 * 1000),
      folderPath: '',
      isTweet: false,
    })
  })

  it('detects tweet URLs from twitter.com', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><A HREF="https://twitter.com/naval/status/1234567890">Tweet</A>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0].isTweet).toBe(true)
  })

  it('detects tweet URLs from x.com', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><A HREF="https://x.com/elonmusk/status/9876543210">Tweet on X</A>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0].isTweet).toBe(true)
  })

  it('handles nested folders correctly', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><H3>Work</H3>
        <DL><p>
          <DT><H3>Projects</H3>
          <DL><p>
            <DT><A HREF="https://project.com">Project Link</A>
          </DL><p>
        </DL><p>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0].folderPath).toBe('Work/Projects')
  })

  it('handles multiple bookmarks in same folder', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><H3>Favorites</H3>
        <DL><p>
          <DT><A HREF="https://first.com">First</A>
          <DT><A HREF="https://second.com">Second</A>
          <DT><A HREF="https://third.com">Third</A>
        </DL><p>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(3)
    expect(result[0].folderPath).toBe('Favorites')
    expect(result[1].folderPath).toBe('Favorites')
    expect(result[2].folderPath).toBe('Favorites')
  })

  it('handles bookmarks in Bookmarks Bar folder', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>
        <DL><p>
          <DT><A HREF="https://toolbar.com">Toolbar Link</A>
        </DL><p>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0].folderPath).toBe('Bookmarks Bar')
  })

  it('handles top-level bookmarks without folder', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><A HREF="https://toplevel.com">Top Level</A>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0].folderPath).toBe('')
  })

  it('handles malformed HTML gracefully', () => {
    const html = `
      <DT><A HREF="https://example.com">Broken</A>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com')
  })

  it('handles missing ADD_DATE attribute', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><A HREF="https://nodate.com">No Date</A>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0].addDate).toBeNull()
  })

  it('handles empty title', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><A HREF="https://notitle.com"></A>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('')
  })

  it('returns empty array for empty HTML', () => {
    const html = ``

    const result = parseBookmarksHtml(html)

    expect(result).toEqual([])
  })

  it('handles complex nested structure with mixed folders and bookmarks', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><A HREF="https://root.com">Root Bookmark</A>
        <DT><H3>Folder A</H3>
        <DL><p>
          <DT><A HREF="https://a1.com">A1</A>
          <DT><H3>Subfolder B</H3>
          <DL><p>
            <DT><A HREF="https://b1.com">B1</A>
          </DL><p>
          <DT><A HREF="https://a2.com">A2</A>
        </DL><p>
        <DT><A HREF="https://root2.com">Root Bookmark 2</A>
      </DL><p>
    `

    const result = parseBookmarksHtml(html)

    expect(result).toHaveLength(5)
    expect(result[0]).toMatchObject({ url: 'https://root.com', folderPath: '' })
    expect(result[1]).toMatchObject({ url: 'https://a1.com', folderPath: 'Folder A' })
    expect(result[2]).toMatchObject({ url: 'https://b1.com', folderPath: 'Folder A/Subfolder B' })
    expect(result[3]).toMatchObject({ url: 'https://a2.com', folderPath: 'Folder A' })
    expect(result[4]).toMatchObject({ url: 'https://root2.com', folderPath: '' })
  })
})
