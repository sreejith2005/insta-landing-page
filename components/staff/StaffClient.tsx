"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Reply = { ok: boolean; message?: string };

async function postJson(url: string, body: unknown): Promise<Reply> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const reply = (await response.json().catch(() => ({}))) as Reply;
    return { ok: response.ok && reply.ok !== false, message: reply.message };
  } catch {
    return { ok: false, message: "No connection. Please try again." };
  }
}

/** Store, PIN and the staff member's name. Remembered on this phone for 30 days. */
export function StaffLogin({ stores }: { stores: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const reply = await postJson("/api/staff/login", {
      store: form.get("store"),
      pin: form.get("pin"),
      staffName: form.get("staffName"),
    });
    setBusy(false);
    if (!reply.ok) return setError(reply.message ?? "Could not log in.");
    router.refresh();
  }

  return (
    <form className="staff-card staff-form" onSubmit={submit}>
      <h1>Staff login</h1>
      <p className="staff-muted">Log in once on this phone to check customer store passes.</p>
      <label>
        Store
        <select name="store" required defaultValue="">
          <option value="" disabled>Choose your store</option>
          {stores.map((store) => (
            <option key={store} value={store}>{store}</option>
          ))}
        </select>
      </label>
      <label>
        Store PIN
        <input name="pin" type="password" inputMode="numeric" autoComplete="off" required maxLength={12} />
      </label>
      <label>
        Your name
        <input name="staffName" type="text" autoComplete="name" required minLength={2} maxLength={40} />
      </label>
      {error ? <p className="staff-error" role="alert">{error}</p> : null}
      <button className="staff-button" type="submit" disabled={busy}>{busy ? "Checking…" : "Log in"}</button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="staff-link"
      type="button"
      onClick={async () => {
        await postJson("/api/staff/logout", {});
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}

/**
 * "Customer visited" logs a walk-in and leaves the pass usable; "Purchased"
 * asks for the invoice and uses the pass up. Both refresh the screen from the
 * sheet afterwards, so what staff see is always what was saved.
 */
export function VisitActions({ code, canPurchase }: { code: string; canPurchase: boolean }) {
  const router = useRouter();
  const [purchasing, setPurchasing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    const reply = await postJson("/api/staff/visit", { code, ...body });
    setBusy(false);
    setMessage({ ok: reply.ok, text: reply.ok ? done : (reply.message ?? "Could not save. Please try again.") });
    if (reply.ok) {
      setPurchasing(false);
      router.refresh();
    }
  }

  async function purchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const billAmount = Number(String(form.get("billAmount") ?? "").replace(/[,\s₹]/g, ""));
    if (!Number.isFinite(billAmount) || billAmount <= 0) {
      setMessage({ ok: false, text: "Enter the bill amount in rupees." });
      return;
    }
    await send(
      { action: "purchased", invoiceNumber: String(form.get("invoiceNumber") ?? ""), billAmount },
      "Purchase saved. The pass is now used.",
    );
  }

  return (
    <div className="staff-actions">
      <div className="staff-action-row">
        <button className="staff-button is-secondary" type="button" disabled={busy} onClick={() => send({ action: "visited" }, "Visit saved.")}>
          Customer visited
        </button>
        {canPurchase ? (
          <button
            className="staff-button"
            type="button"
            disabled={busy}
            aria-expanded={purchasing}
            onClick={() => setPurchasing((open) => !open)}
          >
            Purchased with discount
          </button>
        ) : null}
      </div>
      {purchasing ? (
        <form className="staff-form staff-purchase" onSubmit={purchase}>
          <label>
            Invoice number
            <input name="invoiceNumber" type="text" required maxLength={40} autoComplete="off" />
          </label>
          <label>
            Bill amount (₹)
            <input name="billAmount" type="text" inputMode="decimal" required autoComplete="off" />
          </label>
          <button className="staff-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Confirm purchase"}</button>
        </form>
      ) : null}
      {message ? (
        <p className={message.ok ? "staff-success" : "staff-error"} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
