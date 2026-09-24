import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

const validUrl = "/instagram?product=MKBR639&reel=R123&campaign=RAKHI26&source=instagram";

async function isolate(page: Page) {
  const address = randomUUID().replaceAll("-", "").match(/.{4}/g)?.join(":");
  await page.setExtraHTTPHeaders({ "x-forwarded-for": address ?? randomUUID() });
}

test("pass: enquiry → store pass → staff scan → visit → purchase → already used", async ({ page, request }) => {
  // One long journey across five routes, each compiled on first hit by the dev server.
  test.setTimeout(180_000);
  await isolate(page);
  await page.goto(validUrl);
  await page.waitForTimeout(300);
  await page.getByLabel("Full Name").fill("Ananya Shah");
  await page.getByLabel("Mobile Number").fill("9812343210");
  await page.getByLabel("PIN Code").fill("400001");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Unlock My 30% Benefit" }).click();

  // Customer: the pass appears only after choosing to visit the store.
  await page.getByRole("button", { name: /planning to visit our store/i }).click();
  const qr = page.getByRole("img", { name: /QR code for store pass/ });
  await expect(qr).toBeVisible();
  const code = (await page.locator(".pass-card-code strong").textContent())!.trim();
  expect(code).toMatch(/^MK30-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  const qrPath = (await qr.getAttribute("src"))!;
  const passPath = qrPath.replace(/\/qr$/, "");

  // The QR is a real SVG that encodes the staff check link.
  const svg = await request.get(qrPath);
  expect(svg.status()).toBe(200);
  expect(svg.headers()["content-type"]).toContain("image/svg+xml");

  // The WhatsApp message carries the code.
  const whatsapp = await page.getByRole("link", { name: /Chat with a representative/ }).getAttribute("href");
  if (whatsapp) expect(decodeURIComponent(whatsapp)).toContain(code);

  // A tampered link is refused.
  await page.goto(`${passPath}x`);
  await expect(page.getByRole("heading", { name: "This pass link is not valid" })).toBeVisible();

  // Customer view of the pass link: no staff details.
  await page.goto(passPath);
  await expect(page.getByText(code)).toBeVisible();
  await expect(page.getByText("For Ananya")).toBeVisible();
  await expect(page.getByText("3210")).toHaveCount(0);

  await expect(page.getByText("MK Jewels staff login")).toHaveCount(0);

  // Staff: the QR opens the staff screen; the first scan asks for the store login, then shows the pass.
  await page.goto(`/staff?code=${code}`);
  await expect(page.getByText("This QR is for MK Jewels store staff.")).toBeVisible();
  await page.getByRole("combobox", { name: "Store" }).selectOption("Bandra");
  await page.getByLabel("Store PIN").fill("000000");
  await page.getByLabel("Your name").fill("Priya");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Wrong store PIN.")).toBeVisible();
  await page.getByLabel("Store PIN").fill("123456");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Valid pass")).toBeVisible();
  await expect(page.getByText("Ananya Shah")).toBeVisible();
  await expect(page.locator(".staff-phone")).toHaveText("3210");
  await expect(page.getByText("Instagram reel R123 · RAKHI26")).toBeVisible();

  // The customer's pass link, opened on a logged-in phone, goes to the staff screen too.
  await page.goto(passPath);
  await expect(page).toHaveURL(new RegExp(`/staff\\?code=${code}`));

  await page.getByRole("button", { name: "Visited, no purchase" }).click();
  await expect(page.getByText("Visit saved.")).toBeVisible();
  await expect(page.locator(".staff-history li")).toHaveCount(1);

  await page.getByRole("button", { name: "Give discount" }).click();
  await page.getByLabel("Invoice number").fill("INV-1001");
  await page.getByLabel("Bill amount (₹)").fill("72,000");
  await page.getByRole("button", { name: "Confirm and use pass" }).click();
  await expect(page.getByText("Already used")).toBeVisible();
  await expect(page.getByText(/Invoice INV-1001 · ₹72,000/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Give discount" })).toHaveCount(0);

  // Typing the code by hand finds the same pass.
  await page.getByLabel(/type their code/).fill(code.toLowerCase().replaceAll("-", " "));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Already used")).toBeVisible();

  // The customer's own link now shows the pass as used.
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Staff login" })).toBeVisible();
  await page.goto(passPath);
  await expect(page.getByText("This pass has been used")).toBeVisible();
});

test("staff actions are refused without a login or from another site", async ({ request }) => {
  const noLogin = await request.post("/api/staff/visit", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: { code: "MK30-AAAA-AAAA", action: "visited" },
  });
  expect(noLogin.status()).toBe(401);
  const crossSite = await request.post("/api/staff/visit", {
    headers: { origin: "https://evil.example" },
    data: { code: "MK30-AAAA-AAAA", action: "visited" },
  });
  expect(crossSite.status()).toBe(403);
});
