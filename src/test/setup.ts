import '@testing-library/jest-dom'

// Mock IntersectionObserver for infinite scroll tests
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []

  constructor(private callback: IntersectionObserverCallback) {}

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  // Helper to trigger intersection from tests
  triggerIntersect(): void {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this)
  }
}

global.IntersectionObserver = MockIntersectionObserver
