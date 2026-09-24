import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandHeader } from "@/components/brand/BrandHeader";
import { PassCard } from "@/components/pass/PassCard";
import { passConfig } from "@/config/pass";
import { serverEnv } from "@/lib/config/env";
import { verifyPassToken } from "@/lib/passes/code";
import { formatPassDateTime } from "@/lib/passes/format";
import { passStatus } from "@/lib/passes/status";
import { repository } from "@/lib/providers/repository";
import { currentStaff } from "@/lib/staff/current";

export const metadata: Metadata = { title: `${passConfig.title} | MK Jewels` };

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="shell">
      <BrandHeader />
      <main className="context-state">
        <p className="state-mark" aria-hidden="true">◇</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </main>
    </div>
  );
}

/**
 * What the QR opens. Customers see their pass; logged-in staff are sent
 * straight to the verification screen for this code.
 */
export default async function PassPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const env = serverEnv();
  const code = env.passes.secret ? verifyPassToken(token, env.passes.secret) : null;
  if (!code) {
    return <Message title="This pass link is not valid" text="Please use the pass link or code you received from MK Jewels." />;
  }

  const data = await repository();
  let view;
  try {
    if (await currentStaff(data)) view = "staff" as const;
    else {
      const pass = await data.findPassByCode(code);
      view = pass ? { pass, status: passStatus(pass, await data.listStoreVisits(pass.customerId), env.passes.validityDays) } : null;
    }
  } catch (error) {
    console.error("Pass page lookup failed:", (error as Error).message);
    return <Message title="We could not load this pass" text="Please check your connection and try again in a moment." />;
  }
  if (view === "staff") redirect(`/staff?code=${encodeURIComponent(code)}`);
  if (!view) {
    return <Message title="We could not find this pass" text="Please contact MK Jewels on WhatsApp and share your code." />;
  }

  const { pass, status } = view;
  return (
    <div className="shell">
      <BrandHeader />
      <main className="pass-page">
        <PassCard
          code={pass.passCode}
          qrSrc={`/p/${token}/qr`}
          validUntil={status.validUntil.toISOString()}
          firstName={pass.customerName}
          state={status.state}
          note={status.usedBy ? `${formatPassDateTime(status.usedBy.createdAt)} at ${status.usedBy.store}` : undefined}
        />
        <a className="pass-page-staff" href={`/staff?code=${encodeURIComponent(pass.passCode)}`}>
          MK Jewels staff login
        </a>
      </main>
    </div>
  );
}
