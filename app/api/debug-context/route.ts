import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/config/env";
import { repository } from "@/lib/providers/repository";

/**
 * TEMPORARY DIAGNOSTIC ROUTE — DELETE BEFORE REAL PRODUCTION TRAFFIC.
 * Unauthenticated and exposes raw sheet rows. Read-only: it only calls the same
 * repository().findByContext() path as app/instagram/page.tsx, plus the
 * repository's own cached product read to show the raw rows behind it.
 */
export const dynamic = "force-dynamic";

type Row = Record<string, string>;
type SheetsInternals = {
  productData?: () => Promise<{ rows: Row[]; mapRows: Row[] | null }>;
};

const trimmed = (value: string | undefined) => value?.trim() ?? "";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = {
    productId: url.searchParams.get("product") ?? "",
    reelId: url.searchParams.get("reel") ?? "",
    campaignId: url.searchParams.get("campaign") ?? "",
  };
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const result: Record<string, unknown> = {
    warning: "TEMPORARY DEBUG ROUTE - delete before production traffic",
    env: {
      raw: {
        DATA_PROVIDER: process.env.DATA_PROVIDER ?? null,
        GOOGLE_SPREADSHEET_ID_last6: spreadsheetId ? spreadsheetId.trim().slice(-6) : null,
        GOOGLE_SPREADSHEET_ID_length: spreadsheetId?.length ?? null,
        GOOGLE_PRODUCT_SHEET: process.env.GOOGLE_PRODUCT_SHEET ?? null,
        GOOGLE_REEL_MAP_SHEET: process.env.GOOGLE_REEL_MAP_SHEET ?? null,
      },
    },
    params,
  };

  try {
    const env = serverEnv();
    result.env = {
      ...(result.env as object),
      resolved: {
        dataProvider: env.dataProvider,
        spreadsheetId_last6: env.google.spreadsheetId ? env.google.spreadsheetId.slice(-6) : null,
        productSheet: env.google.sheets.products,
        reelMapSheet: env.google.sheets.reelMap ?? null,
      },
    };

    const repo = await repository();
    result.repositoryClass = repo.constructor.name;

    const record = await repo.findByContext(params);
    result.found = Boolean(record);
    result.findByContextResult = record ?? null;

    const internals = repo as unknown as SheetsInternals;
    if (typeof internals.productData !== "function") {
      result.note = "Repository has no productData(); raw sheet rows unavailable (not the Sheets provider).";
      return NextResponse.json(result);
    }

    const { rows, mapRows } = await internals.productData.call(repo);
    result.productRowCount = rows.length;
    result.productHeaders = rows[0] ? Object.keys(rows[0]) : [];
    result.reelMapLoaded = mapRows !== null;
    result.reelMapRowCount = mapRows?.length ?? null;
    result.reelMapHeaders = mapRows?.[0] ? Object.keys(mapRows[0]) : null;

    const matchesTriple = (row: Row) =>
      trimmed(row.product_id) === params.productId &&
      trimmed(row.reel_id) === params.reelId &&
      trimmed(row.campaign_id) === params.campaignId;

    result.rawMatchingProductRows = rows.filter((row) => trimmed(row.product_id) === params.productId);
    result.rawExactTripleProductRow = rows.find(matchesTriple) ?? null;
    if (mapRows) result.rawMatchingReelMapRow = mapRows.find(matchesTriple) ?? null;

    if (!record) {
      result.firstFiveProductRows = rows.slice(0, 5);
      if (mapRows) result.firstFiveReelMapRows = mapRows.slice(0, 5);
    }
    return NextResponse.json(result);
  } catch (error) {
    result.error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      code: (error as { code?: unknown })?.code ?? null,
    };
    return NextResponse.json(result);
  }
}
