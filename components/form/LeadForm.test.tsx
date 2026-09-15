import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LeadForm } from "./LeadForm";

const context = { productId: "MKBR639", reelId: "R123", campaignId: "RAKHI26" };

describe("LeadForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses accessible mobile-friendly fields", () => {
    render(<LeadForm context={context} onAccepted={() => undefined} />);
    expect(screen.getByLabelText("Full Name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Mobile Number")).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText("PIN Code")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByRole("button", { name: "Unlock my selected piece" })).toBeEnabled();
  });

  it("shows inline errors without submitting invalid fields", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<LeadForm context={context} onAccepted={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: "Unlock my selected piece" }));
    expect(await screen.findByText("Enter your full name.")).toBeVisible();
    expect(fetchSpy.mock.calls.filter(([url]) => url === "/api/lead")).toHaveLength(0);
  });

  it("reveals only after an accepted response and protects double submit", async () => {
    let resolveRequest!: (value: Response) => void;
    const fetchSpy = vi.fn((url: string) => url === "/api/events" ? Promise.resolve(new Response(null, { status: 202 })) : new Promise<Response>((resolve) => (resolveRequest = resolve)));
    vi.stubGlobal("fetch", fetchSpy);
    const accepted = vi.fn();
    render(<LeadForm context={context} onAccepted={accepted} />);
    await userEvent.type(screen.getByLabelText("Full Name"), "Ananya Shah");
    await userEvent.type(screen.getByLabelText("Mobile Number"), "9876543210");
    await userEvent.type(screen.getByLabelText("PIN Code"), "400001");
    await userEvent.type(screen.getByLabelText("City"), "Mumbai");
    await userEvent.click(screen.getByRole("button", { name: "Unlock my selected piece" }));
    expect(screen.getByRole("button", { name: "Saving your details" })).toBeDisabled();
    expect(fetchSpy.mock.calls.filter(([url]) => url === "/api/lead")).toHaveLength(1);
    resolveRequest(new Response(JSON.stringify({ ok: true, inquiryId: "inq_1", customerId: "cus_1", isRepeatCustomer: false, product: { productId: "MKBR639" } }), { status: 201, headers: { "Content-Type": "application/json" } }));
    await waitFor(() => expect(accepted).toHaveBeenCalledOnce());
  });

  it("retains values and withholds reveal after a server failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, message: "We could not save your details. Please try again." }), { status: 503, headers: { "Content-Type": "application/json" } })));
    const accepted = vi.fn();
    render(<LeadForm context={context} onAccepted={accepted} />);
    await userEvent.type(screen.getByLabelText("Full Name"), "Ananya Shah");
    await userEvent.type(screen.getByLabelText("Mobile Number"), "9876543210");
    await userEvent.type(screen.getByLabelText("PIN Code"), "400001");
    await userEvent.type(screen.getByLabelText("City"), "Mumbai");
    await userEvent.click(screen.getByRole("button", { name: "Unlock my selected piece" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not save");
    expect(screen.getByLabelText("Full Name")).toHaveValue("Ananya Shah");
    expect(accepted).not.toHaveBeenCalled();
  });
});
