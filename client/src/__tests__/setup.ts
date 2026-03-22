import '@testing-library/jest-dom/vitest';

// Mock sessionStorage and localStorage for tests
const storageMap = new Map<string, string>();

const mockStorage: Storage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, value); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => [...storageMap.keys()][index] ?? null,
};

Object.defineProperty(globalThis, 'sessionStorage', { value: mockStorage });
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage });

// Clear storage between tests
beforeEach(() => {
  storageMap.clear();
});
