import type { Page } from '@playwright/test';

/** Set the React-controlled input value */
export async function setInputValue(page: Page, selector: string, value: string) {
  await page.evaluate(
    ({ sel, val }) => {
      const input = document.querySelector(sel) as HTMLInputElement;
      if (!input) throw new Error(`Input not found: ${sel}`);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, val);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    { sel: selector, val: value },
  );
}

/** Wait for navigation to a path pattern */
export async function waitForPath(page: Page, pattern: RegExp, timeout = 10000) {
  await page.waitForURL(pattern, { timeout });
}

/** Click a button by its text content */
export async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text }).click();
}

/** Get room code from the lobby URL */
export function getRoomCodeFromUrl(url: string): string {
  const match = url.match(/\/lobby\/([A-Z0-9]+)/);
  return match?.[1] ?? '';
}
