import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportButton } from './export-button'

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/test')
const mockRevokeObjectURL = vi.fn()

// Mock fetch
const mockFetch = vi.fn()

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
    global.fetch = mockFetch
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test html'], { type: 'text/html' })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders export button with icon', () => {
    render(<ExportButton />)
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('calls API to fetch export HTML on click', async () => {
    const user = userEvent.setup()
    render(<ExportButton />)

    await user.click(screen.getByRole('button', { name: /export/i }))

    expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/export')
  })

  it('triggers file download with blob URL', async () => {
    const user = userEvent.setup()

    render(<ExportButton />)
    await user.click(screen.getByRole('button', { name: /export/i }))

    await waitFor(() => {
      // Verify blob URL was created from the response
      expect(mockCreateObjectURL).toHaveBeenCalled()
      // Verify blob URL was cleaned up
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })
  })

  it('shows loading state while exporting', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: unknown) => void
    mockFetch.mockImplementation(() => new Promise(resolve => {
      resolvePromise = resolve
    }))

    render(<ExportButton />)
    const button = screen.getByRole('button', { name: /export/i })

    // Start export
    user.click(button)

    // Wait for button to become disabled
    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    // Resolve the promise to clean up
    resolvePromise!({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test'], { type: 'text/html' })),
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ExportButton />)
    await user.click(screen.getByRole('button', { name: /export/i }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })
})
