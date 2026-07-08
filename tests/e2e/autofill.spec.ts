import { expect, test, type Page } from "@playwright/test";

/**
 * Schedule autofill (Phase 3, spec §9.4): auto-plan the Project Work weeks
 * from the pool. One user ("e2e-autoplanner").
 */

const HANDLE = "e2e-autoplanner";

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

test.describe.serial("auto-plan from the pool", () => {
  test("onboard so there's a plan and a seeded pool", async ({ page }) => {
    await signIn(page);
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    await page.getByRole("button", { name: /Generate my program/ }).click();
    await expect(page.getByTestId("day-number")).toHaveText("1", {
      timeout: 20_000,
    });
    await page.goto("/ideas");
    await expect(page.getByTestId("idea-card")).toHaveCount(9);
    await expect(page.getByTestId("autoplan")).toBeVisible();
  });

  test("§9.4: auto-plan spreads several ideas across the project weeks", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/ideas");
    await page.getByTestId("autoplan").click();

    // Reports a multi-idea, multi-week placement (not one idea eating all).
    const result = page.getByTestId("autoplan-result");
    await expect(result).toContainText(/Placed \d+ ideas across \d+ weeks/);
    await expect(result).not.toContainText("Placed 1 idea across");

    // Different idea names now label project sessions in different weeks.
    const w0 = await page.request.get("/schedule?w=0");
    const w0html = await w0.text();
    const w6 = await page.request.get("/schedule?w=6");
    const w6html = await w6.text();

    const seeds = [
      "Build your own Redis",
      "Build your own Git",
      "Build your own HTTP server",
      "Text-to-SQL IDE",
      "Vector database",
    ];
    const inW0 = seeds.filter((s) => w0html.includes(s));
    const inW6 = seeds.filter((s) => w6html.includes(s));
    expect(inW0.length).toBeGreaterThan(0);
    expect(inW6.length).toBeGreaterThan(0);
    // The weeks carry different projects.
    expect(inW0[0]).not.toBe(inW6[0]);
  });

  test("auto-plan refuses gracefully with an empty pool", async ({ page }) => {
    await signIn(page);
    // Delete every idea, then the bar disappears (nothing to plan from).
    await page.goto("/ideas");
    let cards = await page.getByTestId("idea-card").count();
    while (cards > 0) {
      await page.getByTestId("idea-card").first().click();
      await page.getByTestId("delete-idea").click();
      await expect(page.getByTestId("idea-card")).toHaveCount(cards - 1);
      cards -= 1;
    }
    await expect(page.getByTestId("autoplan")).toHaveCount(0);
  });
});
