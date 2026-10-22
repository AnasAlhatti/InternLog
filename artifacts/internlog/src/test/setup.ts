import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => { cleanup(); localStorage.clear(); });

// jsdom has no Web Locks API. Serialize same-origin writers as browsers do.
const queues = new Map<string, Promise<unknown>>();
Object.defineProperty(navigator, 'locks', {
  configurable: true,
  value: {
    request(name: string, callback: () => unknown) {
      const next = (queues.get(name) ?? Promise.resolve()).then(callback);
      queues.set(name, next.catch(() => {}));
      return next;
    },
  },
});
