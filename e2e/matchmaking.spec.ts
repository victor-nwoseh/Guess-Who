import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { setInputValue, waitForPath, clickButton } from './helpers';

test.describe('Matchmaking', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let player1: Page;
  let player2: Page;

  test.beforeEach(async ({ browser }) => {
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    player1 = await context1.newPage();
    player2 = await context2.newPage();
  });

  test.afterEach(async () => {
    await context1.close();
    await context2.close();
  });

  test('two players are matched via Quick Match', async () => {
    // Both players go to home page
    await player1.goto('/');
    await player2.goto('/');

    // Enter names
    await setInputValue(player1, '#display-name', 'Alice');
    await setInputValue(player2, '#display-name', 'Bob');

    // Both click Quick Match
    await clickButton(player1, 'Quick Match');

    // Player 1 should see "Finding an opponent..."
    await expect(player1.getByText('Finding an opponent...')).toBeVisible({ timeout: 3000 });

    await clickButton(player2, 'Quick Match');

    // Both should be matched and navigate to lobby
    await waitForPath(player1, /\/lobby\//, 10000);
    await waitForPath(player2, /\/lobby\//, 10000);

    // Both should be in the same lobby — verify player count
    await expect(player1.getByText('Players (2/2)')).toBeVisible({ timeout: 5000 });
    await expect(player2.getByText('Players (2/2)')).toBeVisible({ timeout: 5000 });

    // Both players should see each other's names
    await expect(player1.getByText('Bob')).toBeVisible();
    await expect(player2.getByText('Alice')).toBeVisible();
  });
});
