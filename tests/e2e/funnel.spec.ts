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
  await expect(page.getByText(/MKBR639|Gold Open-Back|Purity|Callback/i)).toHaveCount(0);
  // The booking choice is offered by name; the piece behind it still is not.
  // (The wa.me href carries the product id on purpose — see SuccessState's
  // own test that its pre-filled text never reaches the page.)
  // WhatsApp, the store pass, and the two booking choices.
  await expect(page.locator(".success-booking .cta-whatsapp, .booking-option")).toHaveCount(4);
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

  // Below the form, where the bar is the only way back to it.
  await page.locator(".stories-band").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-visible", "true");

  await page.locator("#enquire").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-visible", "false");
  await page.getByText(/Your details are shared only with MK Jewels/).first().scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-visible", "false");

  await submitLead(page, "9811112222");
  await expect(page.getByRole("heading", { name: /benefit is unlocked/i })).toBeVisible();
  await expect(sticky).toHaveCount(0);
});

test("the supplied local brand film opens the page full-width, autoplaying muted with an unmute control", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(validUrl);
  const film = page.locator(".hero-film");
  test.skip((await film.count()) === 0, "No brand film present in public/brand");

  expect(await film.evaluate((node) => node.parentElement?.firstElementChild === node)).toBe(true);
  expect(await film.evaluate((node) => node.nextElementSibling?.id)).toBe("hero");
  const box = await film.boundingBox();
  expect(box!.width).toBe(390);
  const video = film.locator("video");
  await expect(video.locator("source")).toHaveAttribute("src", /^\/brand\/.+\.mp4$/);
  await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.muted)).toBe(true);

  await film.getByRole("button", { name: "Unmute" }).click();
  await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.muted)).toBe(false);
  await expect(film.getByRole("button", { name: "Mute" })).toBeVisible();
});

test("development placeholders are labelled wherever they appear", async ({ page }) => {
  await isolate(page);
  await page.goto(validUrl);
  for (const section of await page.locator("[data-placeholder]").all()) {
    await expect(section.getByText(/Development placeholder · not approved for production/)).toBeVisible();
  }
});

test("nothing overflows a 360px phone, and the booking choice stacks full-width", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(validUrl);

  const overflows = () =>
    page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

  // Pre-submit: trust bar, hero film, form and the testimonial strip.
  await expect.poll(overflows).toBe(false);
  // The films are a swipeable strip, so the strip scrolls sideways, not the page.
  const strip = page.locator(".stories-strip");
  await strip.scrollIntoViewIfNeeded();
  expect(await strip.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await expect.poll(overflows).toBe(false);

  await page.locator(`#${"enquire"}`).scrollIntoViewIfNeeded();
  await submitLead(page, "9822223333");
  await expect(page.getByRole("heading", { name: /benefit is unlocked/i })).toBeVisible();

  // All four choices are offered (WhatsApp first, then the store pass), stacked one per row and full width.
  const choices = page.locator(".success-booking .cta-whatsapp, .booking-option");
  await expect(choices).toHaveCount(4);
  const boxes = await choices.evaluateAll((nodes) =>
    nodes.map((node) => {
      const { width, left, top } = node.getBoundingClientRect();
      return { width, left, top };
    }),
  );
  expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(4);
  for (const box of boxes) expect(box.width).toBeGreaterThan(280);

  // The store pass opens in place and fits the phone.
  await page.getByRole("button", { name: /planning to visit our store/i }).click();
  await expect(page.getByRole("img", { name: /QR code for store pass/ })).toBeVisible();
  expect(await page.locator(".pass-card").evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(360);
  await expect.poll(overflows).toBe(false);

  // Choosing one shows a single scheduler that fits the viewport.
  await page.getByRole("button", { name: /Video call demo/ }).click();
  const embed = page.locator(".booking-panel:not(.is-preloading) .calendly-embed");
  await expect(embed).toHaveCount(1);
  expect(await embed.evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(360);
  await expect.poll(overflows).toBe(false);

  // Swapping replaces it rather than showing a second one.
  await page.getByRole("button", { name: /Store visit/ }).click();
  await expect(page.locator(".booking-panel:not(.is-preloading) .calendly-embed")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Store visit" })).toBeVisible();
  await expect.poll(overflows).toBe(false);
});

test.describe("Reel-level links", () => {
  const pickerHeading = "Which piece were you asking about?";

  test("a Reel with several active products asks which piece, then continues as that product's link", async ({ page }) => {
    await isolate(page);
    const events: Record<string, unknown>[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/api/events")) events.push(request.postDataJSON());
    });

    await page.goto("/instagram?reel=R456&campaign=BRIDAL26&source=manychat&utm_source=instagram&u=ananya.s");
    await expect(page.getByRole("heading", { name: pickerHeading })).toBeVisible();
    await expect(page.getByRole("link", { name: "Selected Gold Ring" })).toBeVisible();
    await expect.poll(() => events.find((event) => event.eventName === "product_picker_shown")).toMatchObject({
      reelId: "R456",
      campaignId: "BRIDAL26",
    });
    expect(events.find((event) => event.eventName === "product_picker_shown")).not.toHaveProperty("productId");

    await page.getByRole("link", { name: "Selected Diamond Solitaire Ring" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /You found the piece/ })).toBeVisible();
    const url = new URL(page.url());
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      product: "RG5074",
      reel: "R456",
      campaign: "BRIDAL26",
      source: "manychat",
      utm_source: "instagram",
      u: "ananya.s",
    });
    await expect.poll(() => events.find((event) => event.eventName === "product_picker_selected")).toMatchObject({
      productId: "RG5074",
    });
    await expect.poll(() => events.find((event) => event.eventName === "context_resolved")).toMatchObject({
      productId: "RG5074",
    });
  });

  test("a Reel with one active product skips the picker", async ({ page }) => {
    await page.goto("/instagram?reel=R123&campaign=RAKHI26");
    await expect(page.getByRole("heading", { level: 1, name: /You found the piece/ })).toBeVisible();
    await expect(page.getByText(pickerHeading)).toHaveCount(0);
  });

  test("a Reel with no active product is missing", async ({ page }) => {
    await page.goto("/instagram?reel=R999&campaign=ARCHIVE");
    await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
  });

  test("a link that names a product never shows the picker, even on a multi-product Reel", async ({ page }) => {
    await page.goto(secondProductUrl);
    await expect(page.getByRole("heading", { level: 1, name: /You found the piece/ })).toBeVisible();
    await expect(page.getByText(pickerHeading)).toHaveCount(0);
    await page.goto("/instagram?product=RG5074&reel=R456&campaign=OTHER");
    await expect(page.getByRole("heading", { name: "We could not find this selection" })).toBeVisible();
    await expect(page.getByText(pickerHeading)).toHaveCount(0);
  });
});
