import { expect, test, type Page } from "@playwright/test";

/**
 * Ideas Pool (spec §9) — the §9.6 acceptance cases: filter shows only the
 * chosen type, and assigning an idea to a schedule stretch makes it that
 * stretch's Project Work. Serial: one user ("e2e-builder") curating a pool.
 */

const HANDLE = "e2e-builder";

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

test.describe.serial("the ideas pool", () => {
  test("first open seeds the curated pool — once", async ({ page }) => {
    await signIn(page);
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    await page.getByRole("button", { name: /Generate my program/ }).click();
    await expect(page.getByTestId("day-number")).toHaveText("1", {
      timeout: 20_000,
    });

    await page.goto("/ideas");
    await expect(page.getByTestId("idea-card")).toHaveCount(9);
    await expect(page.getByText("Build your own Redis")).toBeVisible();

    // Reload: still nine — the seed is one-time, not per-visit.
    await page.reload();
    await expect(page.getByTestId("idea-card")).toHaveCount(9);
  });

  test("§9.6: filtering by SaaS shows only SaaS ideas", async ({ page }) => {
    await signIn(page);
    await page.goto("/ideas");
    await page.getByTestId("filter-saas").click();
    await expect(page.getByTestId("idea-card")).toHaveCount(3);
    for (const card of await page.getByTestId("idea-card").all()) {
      await expect(card.locator("span").first()).toHaveText("SaaS");
    }
    await page.getByTestId("filter-all").click();
    await expect(page.getByTestId("idea-card")).toHaveCount(9);
  });

  test("add a new idea through the Add screen", async ({ page }) => {
    await signIn(page);
    await page.goto("/ideas/add");
    await page.getByTestId("idea-name").fill("Reps mobile client");
    await page.getByTestId("idea-type-project").click();
    await page
      .getByTestId("idea-description")
      .fill("The native client the architecture was built for.");
    await page.getByTestId("idea-hours").fill("60");
    await page.getByTestId("add-idea-submit").click();

    await page.waitForURL(/\/ideas$/, { timeout: 20_000 });
    await expect(page.getByTestId("idea-card")).toHaveCount(10);
    await expect(page.getByText("Reps mobile client")).toBeVisible();
  });

  test("garbage input is refused with the form intact", async ({ page }) => {
    await signIn(page);
    await page.goto("/ideas/add");
    await page.getByTestId("idea-name").fill("x");
    await page.getByTestId("add-idea-submit").click();
    await expect(page.getByTestId("form-error")).toHaveText(
      "An idea needs a real name and a type.",
    );
    await expect(page).toHaveURL(/\/ideas\/add/);
  });

  test("§9.6: placing an idea makes it the stretch's Project Work", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/ideas");
    await page.getByText("Text-to-SQL IDE").click();
    await expect(page.getByTestId("sheet-name")).toHaveValue("Text-to-SQL IDE");

    await page.getByTestId("place-idea").click();
    await expect(page.getByTestId("place-result")).toContainText(
      /Placed into \d+ Project Work session/,
    );

    // The schedule's project sessions now carry the idea's name.
    await page.goto("/schedule");
    const grid = page.getByTestId("schedule-grid");
    await expect(grid).toBeVisible();
    await expect(grid.getByText("Text-to-SQL IDE").first()).toBeVisible();
  });

  test("deleting a placed idea restores the generic Project Work label", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/ideas");
    await page.getByText("Text-to-SQL IDE").click();
    await expect(page.getByTestId("sheet-name")).toHaveValue("Text-to-SQL IDE");
    await page.getByTestId("delete-idea").click();

    await expect(page.getByTestId("idea-card")).toHaveCount(9);
    await expect(page.getByText("Text-to-SQL IDE")).toHaveCount(0);

    await page.goto("/schedule");
    const grid = page.getByTestId("schedule-grid");
    await expect(grid).toBeVisible();
    await expect(grid.getByText("Text-to-SQL IDE")).toHaveCount(0);
    await expect(grid.getByText("Project work").first()).toBeVisible();
  });
});
