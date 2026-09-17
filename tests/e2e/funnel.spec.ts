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
  // A person cannot finish the form within the server's 150 ms bot-timing guard.
  await page.waitForTimeout(300);
  await page.getByLabel("Full Name").fill("Ananya Shah");
  await page.getByLabel("Mobile Number").fill(phone);
  await page.getByLabel("PIN Code").fill("400001");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Unlock My 30% Benefit" }).click();
}

test("valid context captures a lead and shows only generic confirmation", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  await expect(page.getByRole("heading", { level: 1, name: /You found the piece/ })).toBeVisible();
  await expect(page.getByText(/MKBR639|R123|RAKHI26|Gold Open-Back|Purity|price/i)).toHaveCount(0);
  expect(await page.content()).not.toMatch(/Gold Open-Back|Purity/);

  await submitLead(page, "9876543210");

  await expect(
    page.getByRole("heading", { name: "Your exclusive benefit is unlocked." }),
  ).toBeVisible();
  await expect(page.getByText("Thank you, Ananya.")).toBeVisible();
  await expect(page.getByText(/representative will contact you shortly/i)).toBeVisible();
  await expect(
    page.getByText(/MKBR639|Gold Open-Back|Purity|Store Visit|Video Consultation|WhatsApp|Callback/i),
  ).toHaveCount(0);
});

test("a repeat phone creates another enquiry without exposing the new product", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  await submitLead(page, "9812345678");
  await expect(page.getByRole("heading", { name: /benefit is unlocked/i })).toBeVisible();

  await page.goto(secondProductUrl);
  await submitLead(page, "9812345678");
  await expect(page.getByText("Welcome back.")).toBeVisible();
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
  await page.getByRole("button", { name: "Unlock My 30% Benefit" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /benefit is unlocked/i })).toHaveCount(0);
});

test("every call to action leads to the one lead form", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(validUrl);
  await expect(page.locator("form")).toHaveCount(1);
  const ctas = page.locator("a[data-cta]");
  expect(await ctas.count()).toBeGreaterThanOrEqual(3);
  for (const href of await ctas.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    expect(href).toBe("#enquire");
  }

  await page.locator("a[data-cta]:visible").first().click();
  await expect(page.getByLabel("Full Name")).toBeFocused();
  await expect(page.locator("#enquire")).toBeInViewport();
});

test("the mobile sticky call to action never covers the form", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(validUrl);
  const sticky = page.locator(".sticky-cta");
  await expect(sticky).toHaveAttribute("data-visible", "false");

  await page.evaluate(() => window.scrollTo(0, document.querySelector(".why-band")!.getBoundingClientRect().top + window.scrollY + 200));
  await expect(sticky).toHaveAttribute("data-visible", "true");

  await page.locator("#enquire").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-visible", "false");
  await page.getByText(/Your details are shared only with MK Jewels/).first().scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-visible", "false");

  await submitLead(page, "9811112222");
  await expect(page.getByRole("heading", { name: /benefit is unlocked/i })).toBeVisible();
  await expect(sticky).toHaveCount(0);
});

test("the supplied local brand film is a large section directly after the hero", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(validUrl);
  const film = page.locator(".video-band");
  test.skip((await film.count()) === 0, "No brand film present in public/brand");

  expect(await film.evaluate((node) => node.previousElementSibling?.id)).toBe("hero");
  const player = film.locator(".video-card");
  const box = await player.boundingBox();
  expect(box!.width).toBeGreaterThan(340);
  expect(box!.height).toBeGreaterThan(box!.width * 0.5);
  await expect(film.locator("video")).toHaveCount(0);

  await film.getByRole("button", { name: /Play video/ }).click();
  await expect(film.locator("video source")).toHaveAttribute("src", /^\/brand\/.+\.mp4$/);
});

test("development placeholders are labelled wherever they appear", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  for (const section of await page.locator("[data-placeholder]").all()) {
    await expect(section.getByText(/Development placeholder · not approved for production/)).toBeVisible();
  }
});
