import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

const validUrl =
  "/instagram?product=MKBR639&reel=R123&campaign=RAKHI26&source=manychat&utm_source=instagram&utm_medium=reel&utm_campaign=rakhi26";
const secondProductUrl =
  "/instagram?product=RG5074&reel=R456&campaign=BRIDAL26&source=manychat&utm_source=instagram&utm_medium=reel&utm_content=position_2";

async function isolate(page: Page) {
  const address = randomUUID().replaceAll("-", "").match(/.{4}/g)?.join(":");
  await page.setExtraHTTPHeaders({ "x-forwarded-for": address ?? randomUUID() });
}

async function submitLead(page: Page, phone: string) {
  await page.getByLabel("Full Name").fill("Ananya Shah");
  await page.getByLabel("Mobile Number").fill(phone);
  await page.getByLabel("PIN Code").fill("400001");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Unlock my offer" }).click();
}

test("valid context captures a lead and shows only generic confirmation", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  await expect(
    page.getByRole("heading", { name: "Share your details with MK Jewels" }),
  ).toBeVisible();
  await expect(page.getByText(/MKBR639|Gold Open-Back|Purity|price/i)).toHaveCount(0);

  await submitLead(page, "9876543210");

  await expect(
    page.getByRole("heading", { name: "Your promotional offer has been unlocked." }),
  ).toBeVisible();
  await expect(page.getByText(/representative will contact you shortly/i)).toBeVisible();
  await expect(
    page.getByText(/MKBR639|Gold Open-Back|Purity|Store Visit|Video Consultation|WhatsApp|Callback/i),
  ).toHaveCount(0);
});

test("a repeat phone creates another enquiry without exposing the new product", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  await submitLead(page, "9812345678");
  await expect(page.getByRole("heading", { name: /offer has been unlocked/i })).toBeVisible();

  await page.goto(secondProductUrl);
  await submitLead(page, "9812345678");
  await expect(page.getByText(/Welcome back/)).toBeVisible();
  await expect(page.getByText(/RG5074|Selected Diamond Solitaire Ring/i)).toHaveCount(0);
});

test("missing and inactive contexts fail safely", async ({ page }) => {
  await page.goto("/instagram");
  await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
  await page.goto("/instagram?product=INACTIVE01&reel=R999&campaign=ARCHIVE");
  await expect(page.getByRole("heading", { name: "This piece is currently unavailable" })).toBeVisible();
});

test("a tampered product parameter cannot resolve another mapping", async ({ page }) => {
  await page.goto("/instagram?product=RG5074&reel=R123&campaign=RAKHI26");
  await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
});

test("an unapproved source is rejected", async ({ page }) => {
  await page.goto("/instagram?product=MKBR639&reel=R123&campaign=RAKHI26&source=facebook");
  await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
});

test("invalid input remains gated", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  await page.getByRole("button", { name: "Unlock my offer" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /offer has been unlocked/i })).toHaveCount(0);
});
