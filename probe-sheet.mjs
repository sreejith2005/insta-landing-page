import { google } from "googleapis";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/^"|"$/g, "").replace(/\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });
const meta = await sheets.spreadsheets.get({ spreadsheetId: env.GOOGLE_SPREADSHEET_ID });
console.log("TABS:", meta.data.sheets.map((s) => s.properties.title).join(" | "));

for (const tab of ["Products", "Reel_Product_Map"]) {
  try {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: env.GOOGLE_SPREADSHEET_ID, range: `'${tab}'!A:ZZ` });
    const [headers = [], ...rows] = r.data.values ?? [];
    console.log(`\n=== ${tab} === headers:`, JSON.stringify(headers));
    console.log(`rows: ${rows.length}`);
    rows.slice(0, 12).forEach((row, i) => {
      const rec = Object.fromEntries(headers.map((h, j) => [h.trim(), row[j] ?? ""]));
      console.log(`  [${i}]`, JSON.stringify(rec));
    });
  } catch (e) { console.log(`${tab}: ERROR ${e.message}`); }
}
