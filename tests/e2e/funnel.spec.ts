import { expect, test } from "@playwright/test";

const validUrl = "/instagram?product=MKBR639&reel=R123&campaign=RAKHI26";

test("valid preview lead reveals the selected product and conversion choices", async ({ page }) => {
  await page.goto(validUrl);
  await expect(page.getByRole("heading", { name: "Your selected piece is waiting" })).toBeVisible();
  await page.getByLabel("Full Name").fill("Ananya Shah");
  await page.getByLabel("Mobile Number").fill("9876543210");
  await page.getByLabel("PIN Code").fill("400001");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Unlock my selected piece" }).click();
  await expect(page.getByRole("heading", { name: "Meet your selected piece" })).toBeVisible();
  await expect(page.getByText("Gold Open-Back Diamond Accented Bracelet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Store Visit" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Video Consultation" })).toBeVisible();
  await expect(page.getByText(/₹/)).toHaveCount(0);
  await expect(page.getByText(/Visit Website/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Request a Callback" }).click();
  await expect(page.getByRole("status")).toContainText("contact you");
  await page.getByRole("button", { name: "Store Visit" }).click();
  await expect(page.getByText(/Online scheduling is currently unavailable/)).toBeVisible();
});

test("missing and inactive contexts fail safely", async ({ page }) => {
  await page.goto("/instagram");
  await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
  await page.goto("/instagram?product=INACTIVE01&reel=R999&campaign=ARCHIVE");
  await expect(page.getByRole("heading", { name: "This piece is currently unavailable" })).toBeVisible();
});

test("invalid input remains gated", async ({ page }) => {
  await page.goto(validUrl);
  await page.getByRole("button", { name: "Unlock my selected piece" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meet your selected piece" })).toHaveCount(0);
});
