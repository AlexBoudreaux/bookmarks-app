import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Drizzle db with chainable API
const mockFrom = vi.fn()
const mockWhere = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: mockFrom })),
  },
}));

vi.mock('@/db/schema', () => ({
  bookmarks: {
    isCategorized: 'bookmarks.is_categorized',
    isKeeper: 'bookmarks.is_keeper',
    isSkipped: 'bookmarks.is_skipped',
    chromeFolderPath: 'bookmarks.chrome_folder_path',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  ne: vi.fn(),
  count: vi.fn(() => 'count_fn'),
}));

// Mock Next.js navigation (redirect throws NEXT_REDIRECT like the real one)
class RedirectError extends Error {
  digest: string
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`)
    this.digest = 'NEXT_REDIRECT'
  }
}
const mockRedirect = vi.fn((url: string) => { throw new RedirectError(url) });
vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock components
vi.mock('@/components/import/dropzone', () => ({
  Dropzone: () => <div data-testid="dropzone">Drop your Chrome bookmarks file</div>,
}));

import Home from './page';

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ where: mockWhere });
  });

  it('renders the dropzone area', async () => {
    // First call: uncategorized count = 0 (no redirect)
    // Second call: categorized count = 0
    mockWhere
      .mockResolvedValueOnce([{ value: 0 }])
      .mockResolvedValueOnce([{ value: 0 }]);

    const page = await Home();
    render(page);

    const dropTexts = screen.getAllByText(/Drop your Chrome/i);
    expect(dropTexts.length).toBeGreaterThan(0);
  });

  it('has a file input or dropzone for selecting files', async () => {
    mockWhere
      .mockResolvedValueOnce([{ value: 0 }])
      .mockResolvedValueOnce([{ value: 0 }]);

    const page = await Home();
    render(page);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('shows link to browse page if bookmarks exist', async () => {
    // First call: uncategorized count = 0
    // Second call: categorized count = 10
    mockWhere
      .mockResolvedValueOnce([{ value: 0 }])
      .mockResolvedValueOnce([{ value: 10 }]);

    const page = await Home();
    render(page);

    expect(screen.getByRole('link', { name: /browse/i })).toBeInTheDocument();
  });

  it('redirects to categorize when uncategorized bookmarks exist', async () => {
    // First call: uncategorized count = 5 (should redirect)
    mockWhere.mockResolvedValueOnce([{ value: 5 }]);

    await expect(Home()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/categorize');
  });
});
