import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

const url = "/instagram?product=MKBR639&reel=R123&campaign=RAKHI26";
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
];
let nextPhone = 9700100000;

async function noOverflow(page: Page, label: string) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${label} overflows horizontally`).toBeLessThanOrEqual(clientWidth);
}

for (const viewport of viewports) {
  const size = `${viewport.width}x${viewport.height}`;

  test(`temporary form and confirmation do not overflow at ${size}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const address = randomUUID().replaceAll("-", "").match(/.{4}/g)?.join(":");
    await page.setExtraHTTPHeaders({ "x-forwarded-for": address ?? randomUUID() });
    await page.goto(url);
    await noOverflow(page, `form at ${size}`);
    await expect(page.getByRole("button", { name: "Unlock my offer" })).toBeVisible();

    await page.getByLabel("Full Name").fill("Ananya Shah");
    await page.getByLabel("Mobile Number").fill(String(nextPhone++));
    await page.getByLabel("PIN Code").fill("400001");
    await page.getByLabel("City").fill("Navi Mumbai");
    await page.getByRole("button", { name: "Unlock my offer" }).click();
    await expect(page.getByRole("heading", { name: /offer has been unlocked/i })).toBeVisible();
    await noOverflow(page, `confirmation at ${size}`);

    const overflowing = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      return Array.from(document.querySelectorAll("button, a, input"))
        .map((element) => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && (box.left < -1 || box.right > width + 1))
        .map(
          ({ element, box }) =>
            `${element.tagName}.${element.className}@${Math.round(box.left)}-${Math.round(box.right)}`,
        );
    });
    expect(overflowing, `controls outside the viewport at ${size}`).toEqual([]);
  });
}
