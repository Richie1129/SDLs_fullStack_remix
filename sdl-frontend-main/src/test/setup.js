import { vi } from 'vitest';

// Mock window and localStorage for testing environment
if (typeof window !== 'undefined') {
  // Ensure we have a clean state for each test
  beforeEach(() => {
    if (window.__STAGE_MANAGER_SINGLETON__) {
      delete window.__STAGE_MANAGER_SINGLETON__;
    }
  });
}