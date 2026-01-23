import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

// Mock Supabase
const mockSelect = vi.fn(() => Promise.resolve({ count: 0, error: null }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

describe('Home Page', () => {
  beforeEach(() => {
    mockSelect.mockClear();
  });

  it('renders the dropzone area', async () => {
    mockSelect.mockResolvedValue({ count: 0, error: null });
    const page = await Home();
    render(page);

    // There are multiple instances of "Drop your Chrome" text
    const dropTexts = screen.getAllByText(/Drop your Chrome/i);
    expect(dropTexts.length).toBeGreaterThan(0);
  });

  it('shows instructions for exporting from Chrome', async () => {
    mockSelect.mockResolvedValue({ count: 0, error: null });
    const page = await Home();
    render(page);

    expect(screen.getByText(/How to export from Chrome/i)).toBeInTheDocument();
  });

  it('has a file input for selecting files', async () => {
    mockSelect.mockResolvedValue({ count: 0, error: null });
    const page = await Home();
    render(page);

    const input = screen.getByLabelText(/drop.*bookmarks/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', '.html');
  });

  it('shows link to browse page if bookmarks exist', async () => {
    mockSelect.mockResolvedValue({ count: 10, error: null });
    const page = await Home();
    render(page);

    // Should show browse link in header when bookmarks exist
    expect(screen.getByRole('link', { name: /browse/i })).toBeInTheDocument();
  });
});
