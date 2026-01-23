import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ImportSummary } from './import-summary';

describe('ImportSummary', () => {
  it('renders summary counts when boundary is found', () => {
    const onStartCategorizing = vi.fn();

    render(
      <ImportSummary
        open={true}
        onOpenChange={() => {}}
        keeperCount={42}
        toCategorizeCount={1847}
        tweetCount={1558}
        boundaryFound={true}
        onStartCategorizing={onStartCategorizing}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('bookmarks to keep')).toBeInTheDocument();
    expect(screen.getByText('1,847')).toBeInTheDocument();
    expect(screen.getByText('bookmarks to categorize')).toBeInTheDocument();
    expect(screen.getByText('1,558 tweets')).toBeInTheDocument();
  });

  it('shows start categorizing button', async () => {
    const user = userEvent.setup();
    const onStartCategorizing = vi.fn();

    render(
      <ImportSummary
        open={true}
        onOpenChange={() => {}}
        keeperCount={42}
        toCategorizeCount={1847}
        tweetCount={1558}
        boundaryFound={true}
        onStartCategorizing={onStartCategorizing}
      />
    );

    const button = screen.getByRole('button', { name: /start categorizing/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onStartCategorizing).toHaveBeenCalledTimes(1);
  });

  it('shows alert when boundary is not found', () => {
    render(
      <ImportSummary
        open={true}
        onOpenChange={() => {}}
        keeperCount={0}
        toCategorizeCount={2065}
        tweetCount={1558}
        boundaryFound={false}
        onStartCategorizing={() => {}}
      />
    );

    expect(screen.getByText('Boundary not found')).toBeInTheDocument();
    expect(screen.getByText(/set a new end of bookmarks/i)).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <ImportSummary
        open={false}
        onOpenChange={() => {}}
        keeperCount={42}
        toCategorizeCount={1847}
        tweetCount={1558}
        boundaryFound={true}
        onStartCategorizing={() => {}}
      />
    );

    expect(screen.queryByText(/bookmarks to keep/i)).not.toBeInTheDocument();
  });

  it('formats numbers with commas for readability', () => {
    render(
      <ImportSummary
        open={true}
        onOpenChange={() => {}}
        keeperCount={1234}
        toCategorizeCount={5678}
        tweetCount={3456}
        boundaryFound={true}
        onStartCategorizing={() => {}}
      />
    );

    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('5,678')).toBeInTheDocument();
    expect(screen.getByText('3,456 tweets')).toBeInTheDocument();
  });
});
