declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

function gtag(...args: any[]) {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

/** Track a page view (called on every route change) */
export function trackPageView(path: string) {
  gtag('event', 'page_view', { page_path: path });
}

/** Track a custom event */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  gtag('event', eventName, params);
}
