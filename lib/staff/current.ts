import { cookies } from "next/headers";

import { serverEnv } from "@/lib/config/env";
import type { FunnelRepository } from "@/lib/leads/contracts";
import { readStaffSession, staffCookieName, type StaffSession } from "./session";

/** The signed-in staff member for this request, or null. Server-only. */
export async function currentStaff(repository: Pick<FunnelRepository, "listStores">): Promise<StaffSession | null> {
  const env = serverEnv();
  const secret = env.passes.secret;
  if (!secret) return null;
  const value = (await cookies()).get(staffCookieName(env.nodeEnv === "production"))?.value;
  if (!value) return null;
  return readStaffSession(value, await repository.listStores(), secret);
}
