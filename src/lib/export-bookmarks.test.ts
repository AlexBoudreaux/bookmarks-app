import { describe, it, expect } from 'vitest'
import { exportToChrome } from './export-bookmarks'

// Type for keeper bookmarks (subset of database Bookmark)
interface KeeperBookmark {
  url: string
  title: string | null
  add_date: string | null
  chrome_folder_path: string | null
}

describe('exportToChrome', () => {
  it('should return valid Chrome bookmark HTML structure', () => {
    const keepers: KeeperBookmark[] = []
    const result = exportToChrome(keepers)

    expect(result).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    expect(result).toContain('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">')
    expect(result).toContain('<TITLE>Bookmarks</TITLE>')
    expect(result).toContain('<H1>Bookmarks</H1>')
    expect(result).toContain('PERSONAL_TOOLBAR_FOLDER="true"')
    expect(result).toContain('Bookmarks Bar')
  })

  it('should export a single bookmark with no folder path', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://example.com',
        title: 'Example Site',
        add_date: '2024-01-15T10:30:00.000Z',
        chrome_folder_path: null,
      },
    ]
    const result = exportToChrome(keepers)

    expect(result).toContain('HREF="https://example.com"')
    expect(result).toContain('>Example Site</A>')
    // ADD_DATE should be Unix timestamp in seconds
    expect(result).toContain('ADD_DATE="1705314600"')
  })

  it('should export bookmarks in a single folder', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://work.example.com',
        title: 'Work Site',
        add_date: '2024-02-01T12:00:00.000Z',
        chrome_folder_path: 'Bookmarks Bar/Work',
      },
      {
        url: 'https://docs.example.com',
        title: 'Work Docs',
        add_date: '2024-02-02T12:00:00.000Z',
        chrome_folder_path: 'Bookmarks Bar/Work',
      },
    ]
    const result = exportToChrome(keepers)

    // Should have Work folder
    expect(result).toContain('<H3')
    expect(result).toContain('>Work</H3>')
    // Both bookmarks should be inside
    expect(result).toContain('HREF="https://work.example.com"')
    expect(result).toContain('HREF="https://docs.example.com"')
  })

  it('should export nested folder structure', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://deep.example.com',
        title: 'Deep Bookmark',
        add_date: '2024-03-01T00:00:00.000Z',
        chrome_folder_path: 'Bookmarks Bar/Work/Projects/Alpha',
      },
    ]
    const result = exportToChrome(keepers)

    // Should have nested folder structure
    expect(result).toContain('>Work</H3>')
    expect(result).toContain('>Projects</H3>')
    expect(result).toContain('>Alpha</H3>')
    expect(result).toContain('HREF="https://deep.example.com"')
  })

  it('should handle multiple bookmarks across different folders', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://a.com',
        title: 'Bookmark A',
        add_date: '2024-01-01T00:00:00.000Z',
        chrome_folder_path: 'Bookmarks Bar/Folder1',
      },
      {
        url: 'https://b.com',
        title: 'Bookmark B',
        add_date: '2024-01-02T00:00:00.000Z',
        chrome_folder_path: 'Bookmarks Bar/Folder2',
      },
      {
        url: 'https://c.com',
        title: 'Bookmark C',
        add_date: '2024-01-03T00:00:00.000Z',
        chrome_folder_path: 'Bookmarks Bar/Folder1',
      },
    ]
    const result = exportToChrome(keepers)

    expect(result).toContain('>Folder1</H3>')
    expect(result).toContain('>Folder2</H3>')
    expect(result).toContain('HREF="https://a.com"')
    expect(result).toContain('HREF="https://b.com"')
    expect(result).toContain('HREF="https://c.com"')
  })

  it('should handle bookmarks with null title using URL as fallback', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://notitle.example.com',
        title: null,
        add_date: '2024-01-01T00:00:00.000Z',
        chrome_folder_path: null,
      },
    ]
    const result = exportToChrome(keepers)

    expect(result).toContain('>https://notitle.example.com</A>')
  })

  it('should handle bookmarks with null add_date by omitting ADD_DATE attribute', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://nodate.example.com',
        title: 'No Date Bookmark',
        add_date: null,
        chrome_folder_path: null,
      },
    ]
    const result = exportToChrome(keepers)

    // Should have the bookmark but without ADD_DATE
    expect(result).toContain('HREF="https://nodate.example.com"')
    expect(result).toContain('>No Date Bookmark</A>')
    // The line with this URL should not have ADD_DATE
    const lines = result.split('\n')
    const bookmarkLine = lines.find(l => l.includes('https://nodate.example.com'))
    expect(bookmarkLine).not.toContain('ADD_DATE')
  })

  it('should handle empty folder path as root level bookmark', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://root.example.com',
        title: 'Root Bookmark',
        add_date: '2024-01-01T00:00:00.000Z',
        chrome_folder_path: '',
      },
    ]
    const result = exportToChrome(keepers)

    expect(result).toContain('HREF="https://root.example.com"')
    expect(result).toContain('>Root Bookmark</A>')
  })

  it('should escape HTML special characters in title', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://escape.example.com',
        title: 'Test <script> & "quotes"',
        add_date: '2024-01-01T00:00:00.000Z',
        chrome_folder_path: null,
      },
    ]
    const result = exportToChrome(keepers)

    expect(result).toContain('&lt;script&gt;')
    expect(result).toContain('&amp;')
    expect(result).toContain('&quot;')
  })

  it('should preserve folder hierarchy outside Bookmarks Bar', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://other.example.com',
        title: 'Other Bookmark',
        add_date: '2024-01-01T00:00:00.000Z',
        chrome_folder_path: 'Other Bookmarks/Archive',
      },
    ]
    const result = exportToChrome(keepers)

    expect(result).toContain('>Other Bookmarks</H3>')
    expect(result).toContain('>Archive</H3>')
    expect(result).toContain('HREF="https://other.example.com"')
  })

  it('should produce well-formed HTML with proper indentation', () => {
    const keepers: KeeperBookmark[] = [
      {
        url: 'https://example.com',
        title: 'Test',
        add_date: '2024-01-01T00:00:00.000Z',
        chrome_folder_path: 'Bookmarks Bar/Test Folder',
      },
    ]
    const result = exportToChrome(keepers)

    // Should have balanced DL and /DL tags
    const dlOpens = (result.match(/<DL>/gi) || []).length
    const dlCloses = (result.match(/<\/DL>/gi) || []).length
    expect(dlOpens).toBe(dlCloses)

    // Should have <p> after each <DL>
    expect(result).toMatch(/<DL><p>/gi)
  })
})
