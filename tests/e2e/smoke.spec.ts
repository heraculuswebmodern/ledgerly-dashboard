import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke tests for the four flows the demo has to get right. Each test logs in through the
 * real form, so every test gets its own session (and its own copy of the seeded ledger).
 */

async function login(page: Page) {
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("button", { name: /Use demo/ }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/overview/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function operatingAvailable(page: Page) {
  const accounts = (await (await page.request.get("/api/accounts")).json()) as {
    name: string;
    availableCents: number;
  }[];
  return accounts.find((a) => a.name === "Operating")!.availableCents;
}

test("login, send a payment, and see the balance and ledger update", async ({ page }) => {
  await login(page);
  const before = await operatingAvailable(page);

  await page.goto("/payments");
  await page.getByRole("button", { name: "Send money" }).first().click();
  await page.getByLabel("To", { exact: true }).click();
  await page.getByRole("option", { name: /Lumen Design Studio/ }).click();
  await page.getByLabel("Amount").fill("1,250.50");
  await page.getByLabel("Memo").fill("E2E smoke");
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: /^Send \$1,250\.50/ }).click();
  await expect(page.getByRole("heading", { name: "Money on its way" })).toBeVisible();

  expect(await operatingAvailable(page)).toBe(before - 125_050);
  const page1 = await (await page.request.get("/api/transactions?pageSize=25")).json();
  expect(page1.items[0]).toMatchObject({
    counterparty: "Lumen Design Studio",
    amountCents: -125_050,
    status: "pending",
  });
});

test("filter transactions by search and status, reflected in the URL", async ({ page }) => {
  await login(page);
  await page.goto("/transactions");
  await page.getByLabel("Search transactions").fill("aws");
  await expect(page).toHaveURL(/q=aws/);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Posted").click();
  await expect(page).toHaveURL(/status=posted/);
  await page.keyboard.press("Escape");

  const rows = page.locator("tbody tr");
  await expect(rows.first()).toContainText(/Amazon Web Services/i);
});

test("freeze and unfreeze a card", async ({ page }) => {
  await login(page);
  await page.goto("/cards?filter=virtual");
  const tile = page.getByRole("button", { name: /Software subscriptions/ });
  await tile.click();
  await expect(tile).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Freeze", exact: true }).click();
  await expect(page.getByRole("button", { name: /Software subscriptions.*frozen/ })).toBeVisible();
  await page.getByRole("button", { name: "Unfreeze", exact: true }).click();
  await expect(page.getByRole("button", { name: /Software subscriptions.*active/ })).toBeVisible();
});

test("protected routes redirect to login and the API rejects anonymous calls", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login\?next=%2Ftransactions/);
  expect((await page.request.get("/api/accounts")).status()).toBe(401);
});
