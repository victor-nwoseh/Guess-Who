import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { setInputValue, waitForPath, clickButton, getRoomCodeFromUrl } from './helpers';

test.describe('Disconnect and reconnect', () => {
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

  test('disconnect modal appears and leave works', async () => {
    // Setup: get both players into a game
    await player1.goto('/');
    await setInputValue(player1, '#display-name', 'Alice');
    await clickButton(player1, 'Create Room');
    await waitForPath(player1, /\/lobby\//);

    const roomCode = getRoomCodeFromUrl(player1.url());

    await player2.goto('/');
    await setInputValue(player2, '#display-name', 'Bob');
    await clickButton(player2, 'Join Room');
    await setInputValue(player2, '#room-code', roomCode);
    await clickButton(player2, 'Join');
    await waitForPath(player2, /\/lobby\//);

    // Start game
    await player1.getByText('Actors').click();
    await clickButton(player1, 'Start Game');
    await waitForPath(player1, /\/game\//, 10000);
    await waitForPath(player2, /\/game\//, 10000);

    // Both select characters
    await player1.locator('.grid button').first().click();
    await player1.getByRole('button', { name: /Confirm/ }).click();
    await player2.locator('.grid button').nth(1).click();
    await player2.getByRole('button', { name: /Confirm/ }).click();

    // Wait for playing phase
    await expect(player1.getByText('vs')).toBeVisible({ timeout: 10000 });

    // Player 2 disconnects (close the page)
    await player2.close();

    // Player 1 should see the disconnect modal
    await expect(player1.getByText('Opponent Disconnected')).toBeVisible({ timeout: 10000 });
    await expect(player1.getByText(/Waiting for them to reconnect/)).toBeVisible();

    // Player 1 clicks Leave
    await clickButton(player1, 'Leave');

    // Should navigate back to home
    await expect(player1).toHaveURL(/localhost:\d+\/$/, { timeout: 10000 });
  });

  test('invite link join flow', async () => {
    // Player 1 creates a room
    await player1.goto('/');
    await setInputValue(player1, '#display-name', 'Alice');
    await clickButton(player1, 'Create Room');
    await waitForPath(player1, /\/lobby\//);

    const roomCode = getRoomCodeFromUrl(player1.url());

    // Player 2 visits the invite link directly (no prior session)
    await player2.goto(`/lobby/${roomCode}`);

    // Should see name entry prompt
    await expect(player2.getByText("You've been invited to join a game")).toBeVisible({ timeout: 5000 });
    await setInputValue(player2, '#invite-name', 'Bob');
    await clickButton(player2, 'Join Game');

    // Both should see each other in the lobby
    await expect(player1.getByText('Bob')).toBeVisible({ timeout: 5000 });
    await expect(player2.getByText('Alice')).toBeVisible({ timeout: 5000 });
  });
});
