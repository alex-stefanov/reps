import { expect, test, type Page } from "@playwright/test";

/**
 * UX-004: with OS Reduce Motion on, the app honors it — decorative CSS
 * keyframe loops are neutralized (global rule) and the character stops
 * breathing / parallaxing (framer-motion useReducedMotion + MotionConfig).
 * Verified under Playwright's real prefers-reduced-motion emulation.
 */

const HANDLE = "e2e-motion";
const MOCK_GITHUB = "http://127.0.0.1:4799";

async function onboardToHome(page: Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
  // Grind gives Day 1 a Commit task, which stays pending (mock commit null)
  // and renders the pulsing verification dot we assert on.
  await page.getByText("Grind", { exact: true }).click();
  await page.getByRole("button", { name: /Generate my program/ }).click();
  await expect(page.getByTestId("day-number")).toHaveText("1", {
    timeout: 20_000,
  });
}

test("honors prefers-reduced-motion: dot pulse off, character static", async ({
  page,
}) => {
  // Commit unverified → the commit task is pending → pulse dot shows.
  await fetch(`${MOCK_GITHUB}/__set`, {
    method: "POST",
    body: JSON.stringify({ handle: HANDLE, pushedAt: null }),
  });

  // Baseline: motion allowed — the decorative dot animation is live.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await onboardToHome(page);
  const dot = page.locator(".animate-pulse-dot").first();
  await expect(dot).toBeVisible();
  const livePulse = await dot.evaluate(
    (el) => getComputedStyle(el).animationDuration,
  );
  expect(livePulse).toBe("1.8s");

  // Now turn Reduce Motion on and reload.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByTestId("day-number")).toHaveText("1", {
    timeout: 20_000,
  });
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);

  // The global rule collapses the keyframe loop to ~0 (browsers serialize the
  // 0.001ms reset as "1e-06s"); assert it's no longer the live 1.8s.
  const reducedPulse = await page
    .locator(".animate-pulse-dot")
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(reducedPulse).not.toBe("1.8s");
  expect(parseFloat(reducedPulse)).toBeLessThan(0.01);

  // The character no longer breathes: its transform is unchanged over time.
  const figure = page.getByTestId("character-figure");
  const t1 = await figure.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(800);
  const t2 = await figure.evaluate((el) => getComputedStyle(el).transform);
  expect(t2).toBe(t1);
});
