import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IncomingInstagramContext } from "@/types/funnel";
import { LeadForm } from "./LeadForm";

const context: IncomingInstagramContext = {
  productId: "MKBR639",
  reelId: "R123",
  campaignId: "RAKHI26",
  source: "instagram",
};

async function fillValidLead() {
  await userEvent.type(screen.getByLabelText("Full Name"), "Ananya Shah");
  await userEvent.type(screen.getByLabelText("Mobile Number"), "9876543210");
  await userEvent.type(screen.getByLabelText("PIN Code"), "400001");
  await userEvent.type(screen.getByLabelText("City"), "Mumbai");
}

describe("LeadForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses accessible mobile-friendly fields", () => {
    render(<LeadForm context={context} onAccepted={() => undefined} />);
    expect(screen.getByLabelText("Full Name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Mobile Number")).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText("PIN Code")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByRole("button", { name: "Unlock my selected piece" })).toBeEnabled();
  });

  it("keeps the honeypot out of the accessibility tree and tab order", () => {
    const { container } = render(<LeadForm context={context} onAccepted={() => undefined} />);
    const honeypot = container.querySelector<HTMLInputElement>("#company");
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot?.closest("[aria-hidden='true']")).not.toBeNull();
    // aria-hidden removes it from the accessibility tree, so no role query finds it.
    expect(screen.queryByRole("textbox", { name: "Company" })).not.toBeInTheDocument();
  });

  it("shows inline errors without submitting invalid fields", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<LeadForm context={context} onAccepted={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: "Unlock my selected piece" }));
    expect(await screen.findByText("Enter your full name.")).toBeVisible();
    expect(fetchSpy.mock.calls.filter(([url]) => url === "/api/lead")).toHaveLength(0);
  });

  it("submits validated attribution with the lead", async () => {
    const fetchSpy = vi.fn((...args: [string, RequestInit?]) =>
      Promise.resolve(
        new Response(
          JSON.stringify({ ok: true, inquiryId: "inq_1", customerId: "cus_1", isRepeatCustomer: false, product: {} }),
          { status: args[0] === "/api/lead" ? 201 : 202, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    render(
      <LeadForm
        context={{ ...context, utmSource: "instagram", utmCampaign: "rakhi26" }}
        onAccepted={() => undefined}
      />,
    );
    await fillValidLead();
    await userEvent.click(screen.getByRole("button", { name: "Unlock my selected piece" }));

    await waitFor(() =>
      expect(fetchSpy.mock.calls.filter(([url]) => url === "/api/lead")).toHaveLength(1),
    );
    const leadCall = fetchSpy.mock.calls.find(([url]) => url === "/api/lead");
    const body = JSON.parse(String(leadCall?.[1]?.body));
    expect(body).toMatchObject({
      source: "instagram",
      utmSource: "instagram",
      utmCampaign: "rakhi26",
      // The replay key must carry the whole triple. Keyed on the product alone,
      // the same piece arriving from a different Reel or campaign in one session
      // was treated as a duplicate tap and its attribution was lost.
      idempotencyKey: expect.stringContaining("MKBR639:R123:RAKHI26"),
    });
    expect(body.company).toBe("");
    expect(typeof body.elapsedMs).toBe("number");
  });

  it("reveals only after an accepted response and protects double submit", async () => {
    let resolveRequest!: (value: Response) => void;
    const fetchSpy = vi.fn((url: string) =>
      url === "/api/events"
        ? Promise.resolve(new Response(null, { status: 202 }))
        : new Promise<Response>((resolve) => (resolveRequest = resolve)),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const accepted = vi.fn();
    render(<LeadForm context={context} onAccepted={accepted} />);
    await fillValidLead();
    await userEvent.click(screen.getByRole("button", { name: "Unlock my selected piece" }));
    expect(screen.getByRole("button", { name: "Saving your details" })).toBeDisabled();
    expect(fetchSpy.mock.calls.filter(([url]) => url === "/api/lead")).toHaveLength(1);
    resolveRequest(
      new Response(
        JSON.stringify({
          ok: true,
          inquiryId: "inq_1",
          customerId: "cus_1",
          isRepeatCustomer: false,
          product: { productId: "MKBR639" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    await waitFor(() => expect(accepted).toHaveBeenCalledOnce());
  });

  it("retains values and withholds reveal after a server failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ ok: false, message: "We could not save your details. Please try again." }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const accepted = vi.fn();
    render(<LeadForm context={context} onAccepted={accepted} />);
    await fillValidLead();
    await userEvent.click(screen.getByRole("button", { name: "Unlock my selected piece" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not save");
    expect(screen.getByLabelText("Full Name")).toHaveValue("Ananya Shah");
    expect(accepted).not.toHaveBeenCalled();
  });
});
