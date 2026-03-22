import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { setInputValue, waitForPath, clickButton, getRoomCodeFromUrl } from './helpers';

test.describe('Full game flow', () => {
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

  test('create → join → select → question → answer → snipe → results', async () => {
    // --- Player 1: Create room ---
    await player1.goto('/');
    await setInputValue(player1, '#display-name', 'Alice');
    await clickButton(player1, 'Create Room');
    await waitForPath(player1, /\/lobby\//);

    const roomCode = getRoomCodeFromUrl(player1.url());
    expect(roomCode).toHaveLength(4);

    // --- Player 2: Join room ---
    await player2.goto('/');
    await setInputValue(player2, '#display-name', 'Bob');
    // Show join input
    await clickButton(player2, 'Join Room');
    await setInputValue(player2, '#room-code', roomCode);
    await clickButton(player2, 'Join');
    await waitForPath(player2, /\/lobby\//);

    // Both players should be in lobby
    await expect(player1.getByText('Bob')).toBeVisible({ timeout: 5000 });
    await expect(player2.getByText('Alice')).toBeVisible({ timeout: 5000 });

    // --- Player 1 (host): Configure and start game ---
    // Select category
    await player1.getByText('Actors').click();
    await clickButton(player1, 'Start Game');

    // Both should navigate to game page
    await waitForPath(player1, /\/game\//, 10000);
    await waitForPath(player2, /\/game\//, 10000);

    // --- Both players: Select characters ---
    await expect(player1.getByText('Choose Your Secret Character')).toBeVisible({ timeout: 5000 });
    await expect(player2.getByText('Choose Your Secret Character')).toBeVisible({ timeout: 5000 });

    // Player 1 selects first character
    const p1Cards = player1.locator('.grid button');
    await p1Cards.first().click();
    // Confirm selection
    const p1ConfirmBtn = player1.getByRole('button', { name: /Confirm/ });
    await p1ConfirmBtn.click();

    // Player 2 selects second character
    const p2Cards = player2.locator('.grid button');
    await p2Cards.nth(1).click();
    const p2ConfirmBtn = player2.getByRole('button', { name: /Confirm/ });
    await p2ConfirmBtn.click();

    // Both should see the playing phase
    await expect(player1.getByText('vs')).toBeVisible({ timeout: 10000 });
    await expect(player2.getByText('vs')).toBeVisible({ timeout: 10000 });

    // --- Determine whose turn it is ---
    const p1HasTurn = await player1.getByText('Your Turn').isVisible().catch(() => false);
    const asker = p1HasTurn ? player1 : player2;
    const answerer = p1HasTurn ? player2 : player1;

    // --- Remote mode: Ask a question ---
    await setInputValue(asker, '#question-input', 'Is it a female?');
    await clickButton(asker, 'Send');

    // Answerer should see the question
    await expect(answerer.getByText('Is it a female?')).toBeVisible({ timeout: 5000 });
    // Answer "Yes"
    await clickButton(answerer, 'Yes');

    // Now it's the answerer's turn — they snipe
    await expect(answerer.getByText('Your Turn')).toBeVisible({ timeout: 5000 });
    await clickButton(answerer, 'Guess (Snipe)');

    // Snipe modal should appear
    await expect(answerer.getByText("Guess Opponent's Character")).toBeVisible({ timeout: 3000 });

    // Select the first character in the snipe modal grid
    const snipeCards = answerer.locator('[aria-label="Guess opponent\'s character"] .grid button');
    await snipeCards.first().click();

    // Confirm the guess
    await clickButton(answerer, 'Guess!');

    // A snipe result should appear (correct or wrong)
    // Either way, after the result, the game proceeds
    // Wait for either round-over modal or snipe result overlay
    const resultVisible = await answerer.getByText(/Correct|Wrong/).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(resultVisible).toBe(true);
  });

  test('character elimination toggle works', async () => {
    // Quick setup to get to game
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

    await player1.getByText('Actors').click();
    await clickButton(player1, 'Start Game');

    await waitForPath(player1, /\/game\//, 10000);
    await waitForPath(player2, /\/game\//, 10000);

    // Select characters
    const p1Cards = player1.locator('.grid button');
    await p1Cards.first().click();
    await player1.getByRole('button', { name: /Confirm/ }).click();

    const p2Cards = player2.locator('.grid button');
    await p2Cards.nth(1).click();
    await player2.getByRole('button', { name: /Confirm/ }).click();

    // Wait for playing phase
    await expect(player1.getByText('vs')).toBeVisible({ timeout: 10000 });

    // Get the first card in the game grid and tap to eliminate
    const gameCards = player1.locator('.grid button');
    const firstCard = gameCards.first();
    const firstCardLabel = await firstCard.getAttribute('aria-label');

    // Tap to eliminate
    await firstCard.click();

    // Should now show as eliminated
    const updatedLabel = await firstCard.getAttribute('aria-label');
    expect(updatedLabel).toContain('(eliminated)');

    // Tap again to restore
    await firstCard.click();
    const restoredLabel = await firstCard.getAttribute('aria-label');
    expect(restoredLabel).toBe(firstCardLabel);
  });
});
