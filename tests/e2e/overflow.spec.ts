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

/** Distinct numbers keep each case a new customer and a new inquiry. */
let nextPhone = 9700100000;

/**
 * The submission limiter buckets by `x-forwarded-for`, so without a distinct
 * address per case the later viewports would be rejected as one flooding client
 * rather than measured.
 */
let nextAddress = 1;

async function noOverflow(page: Page, label: string) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${label} overflows horizontally`).toBeLessThanOrEqual(clientWidth);
}

for (const viewport of viewports) {
  const size = `${viewport.width}x${viewport.height}`;

  test(`form has no horizontal overflow at ${size}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await noOverflow(page, `form at ${size}`);
    await expect(page.getByRole("button", { name: "Unlock my selected piece" })).toBeVisible();
  });

  // The reveal carries the specifications, appointment chooser and scheduling
  // region, and was previously never checked at any viewport.
  test(`reveal has no horizontal overflow at ${size}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${nextAddress++}` });
    await page.goto(url);
    await page.getByLabel("Full Name").fill("Ananya Shah");
    await page.getByLabel("Mobile Number").fill(String(nextPhone++));
    await page.getByLabel("PIN Code").fill("400001");
    await page.getByLabel("City").fill("Navi Mumbai");
    await page.getByRole("button", { name: "Unlock my selected piece" }).click();
    await expect(page.getByRole("heading", { name: "Meet your selected piece" })).toBeVisible();
    await noOverflow(page, `reveal at ${size}`);

    await page.getByRole("button", { name: /Store Visit/ }).click();
    await expect(page.getByRole("button", { name: /Store Visit/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await noOverflow(page, `appointment at ${size}`);

    // Every interactive control must stay reachable within the viewport width.
    const overflowing = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      return Array.from(document.querySelectorAll("button, a, input"))
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && (box.left < -1 || box.right > width + 1))
        .map(({ el, box }) => `${el.tagName}.${el.className}@${Math.round(box.left)}-${Math.round(box.right)}`);
    });
    expect(overflowing, `controls outside the viewport at ${size}`).toEqual([]);
  });
}
