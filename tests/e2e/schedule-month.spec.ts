import { expect, test, type Page } from "@playwright/test";

/**
 * Schedule month view (Phase 3, spec §8.4 P1): the whole-program overview
 * and its Week ⇄ Month toggle. One user ("e2e-planner").
 */

const HANDLE = "e2e-planner";

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

test.describe.serial("the schedule month view", () => {
  test("onboard, then Month shows every week as a row", async ({ page }) => {
    await signIn(page);
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    await page.getByRole("button", { name: /Generate my program/ }).click();
    await expect(page.getByTestId("day-number")).toHaveText("1", {
      timeout: 20_000,
    });

    await page.goto("/schedule?v=month");
    // Default program is 12 weeks.
    await expect(page.getByTestId("month-week-row")).toHaveCount(12);
    await expect(page.getByTestId("month-today")).toBeVisible();
    await expect(page.getByTestId("view-month")).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("§8.1: the Week ⇄ Month toggle round-trips", async ({ page }) => {
    await signIn(page);
    await page.goto("/schedule");
    // Week view by default; flip to Month.
    await expect(page.getByTestId("schedule-grid")).toBeVisible();
    await page.getByTestId("view-month").click();
    await expect(page).toHaveURL(/v=month/);
    await expect(page.getByTestId("month-week-row")).toHaveCount(12);

    // Back to Week.
    await page.getByTestId("view-week").click();
    await expect(page.getByTestId("schedule-grid")).toBeVisible();
  });

  test("tapping a week opens its editable detail", async ({ page }) => {
    await signIn(page);
    await page.goto("/schedule?v=month");
    // Week 3 row → week index 2.
    await page.locator('[data-testid="month-week-row"][data-week="2"]').click();
    await expect(page).toHaveURL(/w=2/);
    await expect(page.getByTestId("schedule-grid")).toBeVisible();
    await expect(page.getByText("Week 3 of 12")).toBeVisible();
  });

  test("completing today lights its tile in the month overview", async ({
    page,
  }) => {
    await signIn(page);
    // Mark a task done on Home first.
    await page.goto("/");
    const firstTask = page.getByTestId("task-linkedin");
    await firstTask.click();
    await expect(firstTask).toHaveAttribute("aria-pressed", "true");

    // Today's tile in the month view is now tinted (level ≥ 1).
    await page.goto("/schedule?v=month");
    const today = page.getByTestId("month-today");
    await expect(today).toBeVisible();
    await expect(today).toHaveClass(/bg-cell-[1-4]/);
  });
});
