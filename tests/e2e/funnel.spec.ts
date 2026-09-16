import { expect, test, type Page } from "@playwright/test";

const validUrl = "/instagram?product=MKBR639&reel=R123&campaign=RAKHI26";
const secondProductUrl =
  "/instagram?product=RG5074&reel=R456&campaign=BRIDAL26&source=manychat&utm_source=instagram&utm_medium=reel";

/** Keeps each case in its own submission rate-limit bucket. See overflow.spec. */
let nextAddress = 1;

async function isolate(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${100 + nextAddress++}` });
}

async function submitLead(page: Page, phone: string) {
  await page.getByLabel("Full Name").fill("Ananya Shah");
  await page.getByLabel("Mobile Number").fill(phone);
  await page.getByLabel("PIN Code").fill("400001");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Unlock my selected piece" }).click();
}

test("valid preview lead reveals the selected product and conversion choices", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  await expect(page.getByRole("heading", { name: "Your selected piece is waiting" })).toBeVisible();
  await submitLead(page, "9876543210");
  await expect(page.getByRole("heading", { name: "Meet your selected piece" })).toBeVisible();
  await expect(page.getByText("Gold Open-Back Diamond Accented Bracelet")).toBeVisible();
  await expect(page.getByRole("button", { name: /Store Visit/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Video Consultation/ })).toBeVisible();
  await expect(page.getByText(/₹/)).toHaveCount(0);
  await expect(page.getByText(/Visit Website/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Request a Callback" }).click();
  await expect(page.getByRole("status")).toContainText("contact you");
  await page.getByRole("button", { name: /Store Visit/ }).click();
  await expect(page.getByText(/Online scheduling is currently unavailable/)).toBeVisible();
});

test("a returning phone number is recognised while the new product still creates an enquiry", async ({
  page,
}) => {
  // First enquiry establishes the customer.
  await isolate(page);
  await page.goto(validUrl);
  await expect(page.getByRole("heading", { name: "Your selected piece is waiting" })).toBeVisible();
  await submitLead(page, "9812345678");
  await expect(page.getByRole("heading", { name: "Meet your selected piece" })).toBeVisible();
  await expect(page.getByText(/Welcome back/)).toHaveCount(0);

  // Same customer, different Reel, campaign and product.
  await page.goto(secondProductUrl);
  await expect(page.getByRole("heading", { name: "Your selected piece is waiting" })).toBeVisible();
  await submitLead(page, "9812345678");
  await expect(page.getByRole("heading", { name: "Meet your selected piece" })).toBeVisible();
  await expect(page.getByText(/Welcome back/)).toBeVisible();
  await expect(page.getByText("Selected Diamond Solitaire Ring")).toBeVisible();
});

test("missing and inactive contexts fail safely", async ({ page }) => {
  await page.goto("/instagram");
  await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
  await page.goto("/instagram?product=INACTIVE01&reel=R999&campaign=ARCHIVE");
  await expect(page.getByRole("heading", { name: "This piece is currently unavailable" })).toBeVisible();
});

test("a tampered product parameter cannot resolve another product", async ({ page }) => {
  await page.goto("/instagram?product=RG5074&reel=R123&campaign=RAKHI26");
  await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
});

test("an unapproved source is rejected", async ({ page }) => {
  await page.goto(`${validUrl}&source=facebook`);
  await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
});

test("invalid input remains gated", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  await page.getByRole("button", { name: "Unlock my selected piece" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meet your selected piece" })).toHaveCount(0);
});
