import { expect, test } from "@playwright/test";

/**
 * The Phase 1 daily loop, end to end — including the §6.5 acceptance cases
 * for commit verification, the credibility mechanic of the whole product.
 *
 * Runs serially as one user ("e2e-alex") walking through their first day.
 * (Known flake window: a run that crosses midnight UTC can shift "today".)
 */

const HANDLE = "e2e-alex";
const MOCK_GITHUB = "http://127.0.0.1:4799";

async function setMockCommit(pushedAt: string | null) {
  const res = await fetch(`${MOCK_GITHUB}/__set`, {
    method: "POST",
    body: JSON.stringify({ handle: HANDLE, pushedAt }),
  });
  expect(res.ok).toBe(true);
}

/** Each test runs in a fresh browser context — sign the user back in. */
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/signin");
  await page.fill("#dev-handle", HANDLE);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

/** Runs the sync endpoint the way Vercel Cron would (force-checks GitHub). */
async function runCronSync(baseURL: string) {
  const res = await fetch(`${baseURL}/api/sync`, {
    headers: { Authorization: "Bearer e2e-cron-secret" },
  });
  expect(res.status).toBe(200);
  return (await res.json()) as { users: number; outcomes: Record<string, number> };
}

test.describe.serial("the daily loop", () => {
  test("sign in and onboard: answers generate the program, Home shows Day 1", async ({
    page,
  }) => {
    await setMockCommit(null);

    await page.goto("/");
    await expect(page).toHaveURL(/\/signin/);

    await page.fill("#dev-handle", HANDLE);
    await page.getByRole("button", { name: "Enter" }).click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });
    // Defaults: 10h/week steady, all tracks on. Grind gives Day 1 a Project task.
    await page.getByText("Grind", { exact: true }).click();
    await page.getByRole("button", { name: /Generate my program/ }).click();

    await expect(page.getByTestId("day-number")).toHaveText("1", {
      timeout: 20_000,
    });
    // Day 1 (grind): project + linkedin + leetcode + commit + gym
    await expect(page.getByTestId("task-commit")).toBeVisible();
    await expect(page.getByTestId("done-count")).toHaveText("0");
  });

  test("§6.5: Commit refuses manual check-off and stays pending while no public commit exists", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/");
    const commit = page.getByTestId("task-commit");

    await expect(commit).toHaveAttribute("aria-pressed", "false");
    await expect(commit).toContainText(/awaiting/i);

    await commit.click();
    // The refusal: message appears, task does NOT check off.
    await expect(
      page.getByText("Commit checks itself off — push a public commit."),
    ).toBeVisible();
    await expect(commit).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("done-count")).toHaveText("0");
  });

  test("§6.5: a real public commit auto-checks Commit and lights the grid", async ({
    page,
    baseURL,
  }) => {
    await setMockCommit(new Date().toISOString());

    const sync = await runCronSync(baseURL!);
    expect(sync.outcomes.verified).toBe(1);

    await signIn(page);
    await page.goto("/");
    const commit = page.getByTestId("task-commit");
    await expect(commit).toHaveAttribute("aria-pressed", "true");
    await expect(commit).toContainText(/verified/i);
    await expect(commit).toContainText("e2e-alex/daily-grind@e2e0c0f");
    await expect(page.getByTestId("done-count")).toHaveText("1");

    // Today's floor tile is lit now (level ≥ 1).
    await expect(page.getByTestId("today-tile")).toHaveClass(/bg-cell-[1-4]/);
  });

  test("verification is idempotent: cron reports already-verified, state holds", async ({
    page,
    baseURL,
  }) => {
    const sync = await runCronSync(baseURL!);
    expect(sync.outcomes["already-verified"]).toBe(1);

    await signIn(page);
    await page.goto("/");
    await expect(page.getByTestId("task-commit")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("§6.5: marking a task done on Home reflects immediately in the Schedule", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/");
    const project = page.getByTestId("task-project");
    await expect(project).toHaveAttribute("aria-pressed", "false");
    await project.click();
    await expect(project).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("done-count")).toHaveText("2");

    await page.goto("/schedule");
    const grid = page.getByTestId("schedule-grid");
    await expect(grid).toBeVisible();
    // Today's row: the project cell button is pressed.
    const pressedCells = grid.locator('button[aria-pressed="true"]');
    await expect(pressedCells).toHaveCount(1);
  });

  test("settings toggle genuinely removes the track from Home and Schedule", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/schedule");
    await expect(
      page.getByTestId("schedule-grid").getByText("LeetCode").first(),
    ).toBeVisible();

    await page.goto("/settings");
    await page.getByTestId("toggle-leetcodeOn").uncheck();
    await expect(page.getByText(/saved — tracks updated/)).toBeVisible();

    await page.goto("/");
    await expect(page.getByTestId("task-leetcode")).toHaveCount(0);

    await page.goto("/schedule");
    await expect(page.getByTestId("schedule-grid")).toBeVisible();
    await expect(
      page.getByTestId("schedule-grid").getByText("LeetCode"),
    ).toHaveCount(0);

    // Back on: the track returns — removed, not destroyed.
    await page.goto("/settings");
    await page.getByTestId("toggle-leetcodeOn").check();
    await expect(page.getByText(/saved — tracks updated/)).toBeVisible();
    await page.goto("/");
    await expect(page.getByTestId("task-leetcode")).toHaveCount(1);
  });

  test("cron endpoint rejects unauthorized callers", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/sync`);
    expect(res.status).toBe(401);
    const bad = await fetch(`${baseURL}/api/sync`, {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(bad.status).toBe(401);
  });
});
