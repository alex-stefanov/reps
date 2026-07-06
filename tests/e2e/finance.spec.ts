import { expect, test, type Page } from "@playwright/test";

/**
 * Finance hub (spec §7) — the §7.4 acceptance cases: entries recompute every
 * chart when the period changes, and a new user-created type joins the
 * dropdown and the Sankey. Serial: one user ("e2e-money") logging their week.
 */

const HANDLE = "e2e-money";

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

async function addEntry(
  page: Page,
  opts: {
    direction: "income" | "spending";
    amount: string;
    newType?: string;
  },
) {
  await page.goto("/finance/add");
  await expect(page.getByTestId("amount-input")).toBeVisible();
  await page.getByTestId(`direction-${opts.direction}`).click();
  await page.getByTestId("amount-input").fill(opts.amount);
  if (opts.newType) {
    await page.getByTestId("category-select").selectOption("__new__");
    await page.getByTestId("new-category-input").fill(opts.newType);
  }
  await page.getByTestId("add-entry-submit").click();
  await page.waitForURL(/\/finance$/, { timeout: 20_000 });
}

test.describe.serial("the finance hub", () => {
  test("first open: onboard, then the hub shows seeded state, all zeros", async ({
    page,
  }) => {
    await signIn(page);
    // A fresh user lands on onboarding; generate the default program.
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    await page.getByRole("button", { name: /Generate my program/ }).click();
    await expect(page.getByTestId("day-number")).toHaveText("1", {
      timeout: 20_000,
    });

    await page.goto("/finance");
    await expect(page.getByTestId("total-income")).toHaveText("€0");
    await expect(page.getByTestId("total-spending")).toHaveText("€0");
    // Seeded default categories exist in the Add form's dropdown.
    await page.goto("/finance/add");
    const options = page.getByTestId("category-select").locator("option");
    await expect(options).toContainText([/Food/, /Housing/]);
  });

  test("§7.4: manual income and spending entries land in the totals", async ({
    page,
  }) => {
    await signIn(page);
    await addEntry(page, { direction: "income", amount: "2500" });
    await addEntry(page, { direction: "spending", amount: "45,50" });

    await expect(page.getByTestId("total-income")).toHaveText("€2,500");
    await expect(page.getByTestId("total-spending")).toHaveText("€45.50");
    await expect(page.getByTestId("total-net")).toContainText("+€2,454.50");
    await expect(page.getByTestId("finance-entry")).toHaveCount(2);
  });

  test("§7.4: a new spending type joins the dropdown and the Sankey", async ({
    page,
  }) => {
    await signIn(page);
    await addEntry(page, {
      direction: "spending",
      amount: "30",
      newType: "Education",
    });

    // Sankey node for the new category, plus gross → net accounting.
    const sankey = page.getByTestId("finance-sankey");
    await expect(sankey).toContainText("Education");
    await expect(sankey).toContainText("Net");

    // Available next time in the dropdown (spec acceptance).
    await page.goto("/finance/add");
    await expect(
      page.getByTestId("category-select").locator("option", {
        hasText: "Education",
      }),
    ).toHaveCount(1);
  });

  test("§7.4: switching the carousel recomputes every chart", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/finance");

    // This month contains today's entries.
    // (.last(): the outgoing label lingers in the DOM while it animates out.)
    await page.getByTestId("period-month").click();
    await expect(page.getByTestId("period-label").last()).toHaveText(
      "This month",
    );
    await expect(page.getByTestId("total-income")).toHaveText("€2,500");

    // Last month is empty — every chart recomputes to zero.
    await page.getByLabel("Previous period").click();
    await expect(page.getByTestId("total-income")).toHaveText("€0");
    await expect(page.getByTestId("total-spending")).toHaveText("€0");
    await expect(page.getByTestId("finance-entry")).toHaveCount(0);

    // Back to the year view: entries reappear.
    await page.getByTestId("period-year").click();
    await expect(page.getByTestId("period-label").last()).toHaveText(
      "This year",
    );
    await expect(page.getByTestId("total-spending")).toHaveText("€75.50");
  });

  test("the add form refuses garbage amounts without losing the form", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/finance/add");
    await page.getByTestId("amount-input").fill("abc");
    await page.getByTestId("add-entry-submit").click();
    await expect(page.getByTestId("form-error")).toHaveText(
      "Enter a real amount.",
    );
    await expect(page).toHaveURL(/\/finance\/add/);
  });

  test("deleting an entry recomputes the readout", async ({ page }) => {
    await signIn(page);
    await page.goto("/finance");
    await expect(page.getByTestId("finance-entry")).toHaveCount(3);

    // Newest first: the €30 Education entry sits on top.
    await page
      .getByTestId("finance-entry")
      .first()
      .getByLabel("Delete entry")
      .click();
    await expect(page.getByTestId("finance-entry")).toHaveCount(2);
    await expect(page.getByTestId("total-spending")).toHaveText("€45.50");
  });
});
