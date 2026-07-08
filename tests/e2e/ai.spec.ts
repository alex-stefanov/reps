import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 3 AI assists (spec §7.4 receipt scan, §9.3 brainstorm) end to end,
 * driven by the mock Claude API (tests/e2e/mock-anthropic.ts). Proves the
 * wiring — vision request → prefilled entry, chat → suggestion → prefilled
 * idea — deterministically, without a real key. One user ("e2e-ai").
 *
 * A 1×1 PNG stands in for a receipt photo; the mock returns a canned
 * {€12.99, Food} regardless of pixels, so this tests our plumbing, not OCR.
 */

const HANDLE = "e2e-ai";

// Smallest valid PNG (1×1, transparent).
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64",
);

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

test.describe.serial("the AI assists", () => {
  test("onboard so the hubs exist", async ({ page }) => {
    await signIn(page);
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    await page.getByRole("button", { name: /Generate my program/ }).click();
    await expect(page.getByTestId("day-number")).toHaveText("1", {
      timeout: 20_000,
    });
  });

  test("§7.4: scanning a receipt prefills amount and semantic category", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/finance/add");

    // With a key configured, the button is live (not the disabled label).
    const scan = page.getByTestId("scan-receipt");
    await expect(scan).toBeEnabled();
    await expect(scan).toContainText("Scan a receipt");

    await page.getByTestId("receipt-input").setInputFiles({
      name: "receipt.png",
      mimeType: "image/png",
      buffer: PNG_1PX,
    });

    // The mock returns €12.99 / Food — the form should reflect it.
    await expect(page.getByTestId("scan-note")).toContainText("Food", {
      timeout: 20_000,
    });
    await expect(page.getByTestId("amount-input")).toHaveValue("12.99");

    await page.getByTestId("add-entry-submit").click();
    await page.waitForURL(/\/finance$/, { timeout: 20_000 });

    const entry = page.getByTestId("finance-entry").first();
    await expect(entry).toContainText("Food");
    await expect(entry).toContainText("€12.99");
  });

  test("§9.3: brainstorm suggests a buildable idea that prefills Add Idea", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/ideas/add");

    const open = page.getByTestId("brainstorm-open");
    await expect(open).toBeEnabled();
    await open.click();

    // Greeting bubble from the agent.
    await expect(page.getByTestId("bubble-assistant").first()).toBeVisible();

    await page.getByTestId("brainstorm-input").fill("Something in databases");
    await page.getByTestId("brainstorm-send").click();

    // The mock replies with a suggestion card.
    const suggestion = page.getByTestId("suggestion").first();
    await expect(suggestion).toContainText("Realtime multiplayer backend", {
      timeout: 20_000,
    });

    await suggestion.click();
    // Accepting prefills the form and closes the sheet.
    await expect(page.getByTestId("idea-name")).toHaveValue(
      "Realtime multiplayer backend",
    );
    await expect(page.getByTestId("idea-hours")).toHaveValue("45");

    await page.getByTestId("add-idea-submit").click();
    await page.waitForURL(/\/ideas$/, { timeout: 20_000 });
    await expect(page.getByText("Realtime multiplayer backend")).toBeVisible();
  });

  test("a bad image format is refused before spending a call", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/finance/add");
    await page.getByTestId("receipt-input").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    await expect(page.getByTestId("scan-note")).toContainText(/format/i, {
      timeout: 20_000,
    });
  });
});
