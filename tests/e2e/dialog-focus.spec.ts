import { expect, test, type Page } from "@playwright/test";

/**
 * UX-006: the bottom-sheet dialogs are keyboard-operable. Opening moves focus
 * into the sheet, Tab is trapped within it, Escape closes it, and focus
 * returns to the trigger. Driven keyboard-only against the Ideas sheet.
 */

const HANDLE = "e2e-focus";

async function onboard(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
  await page.getByRole("button", { name: /Generate my program/ }).click();
  await expect(page.getByTestId("day-number")).toHaveText("1", {
    timeout: 20_000,
  });
}

test("idea sheet is keyboard-operable: focus in, trap, Escape, restore", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/ideas");

  // Clicking the trigger button focuses it (Chromium) and opens the sheet;
  // focus then moves into the sheet's first field.
  const card = page.getByTestId("idea-card").first();
  await card.click();
  const name = page.getByTestId("sheet-name");
  await expect(name).toBeFocused();

  // Tab is trapped: after cycling, focus is still inside the dialog.
  for (let i = 0; i < 14; i++) await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => document.activeElement?.closest('[role="dialog"]') !== null,
    ),
  ).toBe(true);

  // Escape closes the sheet and returns focus to the trigger.
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("sheet-name")).toHaveCount(0);
  await expect(card).toBeFocused();
});
