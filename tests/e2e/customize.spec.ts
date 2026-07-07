import { expect, test, type Page } from "@playwright/test";

/**
 * Customize (spec §10): pick the character's gallery lighting, see it live,
 * and have it stick on Home. One user ("e2e-artist").
 */

const HANDLE = "e2e-artist";

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

test.describe.serial("customize the character", () => {
  test("onboard, then Customize offers the ambiances with Studio active", async ({
    page,
  }) => {
    await signIn(page);
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    await page.getByRole("button", { name: /Generate my program/ }).click();
    await expect(page.getByTestId("day-number")).toHaveText("1", {
      timeout: 20_000,
    });

    await page.goto("/customize");
    await expect(page.getByTestId("ambiance-studio")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("ambiance-neon")).toBeVisible();
  });

  test("§10: picking an ambiance persists and re-lights Home", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/customize");

    await page.getByTestId("ambiance-neon").click();
    await expect(page.getByTestId("ambiance-neon")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // The choice survives a full reload (persisted, not just client state).
    await page.reload();
    await expect(page.getByTestId("ambiance-neon")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("ambiance-studio")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Home's character card now carries the Neon display-case color.
    await page.goto("/");
    const scene = page.getByLabel("Character and current week");
    await expect(scene).toBeVisible();
    await expect(scene).toHaveCSS("background-color", "rgb(227, 226, 244)");
  });

  test("switching back to Studio clears the wash", async ({ page }) => {
    await signIn(page);
    await page.goto("/customize");
    await page.getByTestId("ambiance-studio").click();
    await expect(page.getByTestId("ambiance-studio")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.goto("/");
    const scene = page.getByLabel("Character and current week");
    await expect(scene).toHaveCSS("background-color", "rgb(233, 234, 236)");
  });
});
