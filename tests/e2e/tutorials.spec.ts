import { expect, test, type Page } from "@playwright/test";

/**
 * Tutorials library (spec §11) — seed once, filter by language/topic,
 * curate (add/edit/delete), and open the link. One user ("e2e-learner").
 */

const HANDLE = "e2e-learner";

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

test.describe.serial("the tutorials library", () => {
  test("first open seeds the curated shelf — once", async ({ page }) => {
    await signIn(page);
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    await page.getByRole("button", { name: /Generate my program/ }).click();
    await expect(page.getByTestId("day-number")).toHaveText("1", {
      timeout: 20_000,
    });

    await page.goto("/tutorials");
    await expect(page.getByTestId("tutorial-row")).toHaveCount(10);
    await expect(page.getByText("Build Your Own X")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("tutorial-row")).toHaveCount(10);
  });

  test("§11: language and topic filters combine and toggle", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/tutorials");

    await page.getByTestId("chip-Language-C#").click();
    await expect(page.getByTestId("tutorial-row")).toHaveCount(2);

    await page.getByTestId("chip-Topic-Web").click();
    await expect(page.getByTestId("tutorial-row")).toHaveCount(1);
    await expect(page.getByTestId("tutorial-row")).toContainText(
      "ASP.NET Core Fundamentals",
    );

    // Toggle the language chip off: topic filter alone remains.
    await page.getByTestId("chip-Language-C#").click();
    await expect(page.getByTestId("tutorial-row")).toHaveCount(2);
  });

  test("the link opens the resource in a new tab", async ({ page }) => {
    await signIn(page);
    await page.goto("/tutorials");
    const link = page.getByTestId("tutorial-link").first();
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("href", /^https:\/\//);
  });

  test("curate: add a resource with a fresh language and topic", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/tutorials/add");
    await page.getByTestId("tutorial-title").fill("Crafting Interpreters");
    await page.getByTestId("tutorial-url").fill("https://craftinginterpreters.com/");
    await page.getByTestId("tutorial-language").fill("Java");
    await page.getByTestId("tutorial-topic").fill("Compilers");
    await page.getByTestId("add-tutorial-submit").click();

    await page.waitForURL(/\/tutorials$/, { timeout: 20_000 });
    await expect(page.getByTestId("tutorial-row")).toHaveCount(11);
    // The new vocabulary becomes filter chips.
    await page.getByTestId("chip-Topic-Compilers").click();
    await expect(page.getByTestId("tutorial-row")).toHaveCount(1);
    await expect(page.getByTestId("tutorial-row")).toContainText(
      "Crafting Interpreters",
    );
  });

  test("curate: a bad link is refused inline", async ({ page }) => {
    await signIn(page);
    await page.goto("/tutorials/add");
    await page.getByTestId("tutorial-title").fill("Sketchy resource");
    await page.getByTestId("tutorial-url").fill("javascript:alert(1)");
    await page.getByTestId("tutorial-language").fill("JS");
    await page.getByTestId("tutorial-topic").fill("Web");
    await page.getByTestId("add-tutorial-submit").click();
    await expect(page.getByTestId("form-error")).toContainText(
      "real http(s) link",
    );
    await expect(page).toHaveURL(/\/tutorials\/add/);
  });

  test("curate: edit retitles, delete removes — even a seeded entry", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/tutorials");

    const sqlRow = page.getByTestId("tutorial-row").filter({
      hasText: "SQLBolt",
    });
    await sqlRow.getByLabel(/Edit/).click();
    await page.getByTestId("edit-title").fill("SQLBolt, but better");
    await page.getByTestId("save-tutorial").click();
    await expect(page.getByText("SQLBolt, but better")).toBeVisible();

    const renamed = page.getByTestId("tutorial-row").filter({
      hasText: "SQLBolt, but better",
    });
    await renamed.getByLabel(/Edit/).click();
    await page.getByTestId("delete-tutorial").click();
    await expect(page.getByText("SQLBolt, but better")).toHaveCount(0);
    await expect(page.getByTestId("tutorial-row")).toHaveCount(10);
  });
});
