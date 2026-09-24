import type { Metadata } from "next";

import { BrandHeader } from "@/components/brand/BrandHeader";
import { LogoutButton, StaffLogin, VisitActions } from "@/components/staff/StaffClient";
import { serverEnv } from "@/lib/config/env";
import type { PassRecord } from "@/lib/leads/contracts";
import { normalizePassCode } from "@/lib/passes/code";
import { formatPassDate, formatPassDateTime, phoneLastFour } from "@/lib/passes/format";
import { passStatus, type PassStatus } from "@/lib/passes/status";
import { repository } from "@/lib/providers/repository";
import { currentStaff } from "@/lib/staff/current";

export const metadata: Metadata = { title: "Store pass check | MK Jewels" };

type Search = Record<string, string | string[] | undefined>;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell staff-shell">
      <BrandHeader />
      <main className="staff-main">{children}</main>
    </div>
  );
}

function StatusBanner({ status }: { status: PassStatus }) {
  if (status.state === "used" && status.usedBy) {
    const used = status.usedBy;
    return (
      <div className="staff-status is-used" role="status">
        <strong>Already used</strong>
        <span>
          {formatPassDateTime(used.createdAt)} at {used.store}
          {used.invoiceNumber ? ` · Invoice ${used.invoiceNumber}` : ""}
          {used.staffName ? ` · by ${used.staffName}` : ""}
        </span>
      </div>
    );
  }
  if (status.state === "expired") {
    return (
      <div className="staff-status is-expired" role="status">
        <strong>Expired</strong>
        <span>Valid till {formatPassDate(status.validUntil)}</span>
      </div>
    );
  }
  return (
    <div className="staff-status is-valid" role="status">
      <strong>Valid pass</strong>
      <span>30% off making charges · valid till {formatPassDate(status.validUntil)}</span>
    </div>
  );
}

function PassDetails({ pass, status }: { pass: PassRecord; status: PassStatus }) {
  return (
    <section className="staff-card" aria-label={`Pass ${pass.passCode}`}>
      <p className="staff-code">{pass.passCode}</p>
      <StatusBanner status={status} />
      {status.otherPassUsed ? (
        <p className="staff-warning">
          This customer already used a benefit with {status.otherPassUsed.passCode} on{" "}
          {formatPassDate(status.otherPassUsed.createdAt)} at {status.otherPassUsed.store}.
        </p>
      ) : null}
      <dl className="staff-details">
        <div><dt>Customer</dt><dd>{pass.customerName}</dd></div>
        <div><dt>Mobile ends</dt><dd className="staff-phone">{phoneLastFour(pass.phone)}</dd></div>
        <div><dt>City</dt><dd>{pass.city}</dd></div>
        <div><dt>Enquired</dt><dd>{pass.productName || pass.productId} ({pass.productId})</dd></div>
        <div><dt>From</dt><dd>Instagram reel {pass.reelId} · {pass.campaignId}</dd></div>
        <div><dt>Issued</dt><dd>{formatPassDate(pass.issuedAt)}</dd></div>
      </dl>
      <p className="staff-muted">Ask the customer for the last 4 digits of their mobile number and match them above.</p>
      <VisitActions code={pass.passCode} canPurchase={status.state === "valid"} />
      {status.history.length ? (
        <div className="staff-history">
          <h2>History</h2>
          <ol>
            {status.history.map((visit, index) => (
              <li key={`${visit.createdAt}-${index}`}>
                <strong>{visit.action === "purchased" ? "Purchased" : "Visited"}</strong> ·{" "}
                {formatPassDateTime(visit.createdAt)} · {visit.store}
                {visit.staffName ? ` · ${visit.staffName}` : ""}
                {visit.invoiceNumber ? ` · Invoice ${visit.invoiceNumber} · ₹${Number(visit.billAmount).toLocaleString("en-IN")}` : ""}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Staff screen: log in once per phone, then check a pass by scanning its QR
 * (which lands here) or typing its code.
 */
export default async function StaffPage({ searchParams }: { searchParams: Promise<Search> }) {
  // Read first: it makes the page render per request. Returning before it
  // would let the build freeze whatever the build machine's settings produced.
  const query = await searchParams;
  const rawCode = typeof query.code === "string" ? query.code : undefined;
  const env = serverEnv();
  if (!env.passes.secret) {
    return <Shell><section className="staff-card"><h1>Store passes are switched off</h1></section></Shell>;
  }

  const data = await repository();
  let stores;
  let staff;
  try {
    stores = await data.listStores();
    staff = await currentStaff(data);
  } catch (error) {
    console.error("Staff page could not load stores:", (error as Error).message);
    return <Shell><section className="staff-card"><h1>Could not load the store list</h1><p>Please try again in a moment.</p></section></Shell>;
  }

  if (!staff) {
    return <Shell><StaffLogin stores={stores.filter((store) => store.active).map((store) => store.name)} /></Shell>;
  }

  const code = rawCode ? normalizePassCode(rawCode) : null;
  let result: { pass: PassRecord; status: PassStatus } | null | "error" = null;
  if (code) {
    try {
      const pass = await data.findPassByCode(code);
      result = pass ? { pass, status: passStatus(pass, await data.listStoreVisits(pass.customerId), env.passes.validityDays) } : null;
    } catch (error) {
      console.error("Staff pass lookup failed:", (error as Error).message);
      result = "error";
    }
  }

  return (
    <Shell>
      <div className="staff-bar">
        <span><strong>{staff.store}</strong> · {staff.staffName}</span>
        <LogoutButton />
      </div>
      <form className="staff-card staff-search" action="/staff" method="get">
        <label htmlFor="staff-code">Scan the customer&apos;s QR with the phone camera, or type their code</label>
        <div className="staff-search-row">
          <input id="staff-code" name="code" type="text" defaultValue={rawCode ?? ""} placeholder="MK30-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" />
          <button className="staff-button" type="submit">Check</button>
        </div>
      </form>
      {rawCode && !code ? <p className="staff-error staff-card">That is not a valid pass code. Please check and try again.</p> : null}
      {code && result === null ? <p className="staff-error staff-card">No pass found for {code}.</p> : null}
      {result === "error" ? <p className="staff-error staff-card">Could not reach the sheet. Please try again.</p> : null}
      {result && result !== "error" ? <PassDetails pass={result.pass} status={result.status} /> : null}
    </Shell>
  );
}
