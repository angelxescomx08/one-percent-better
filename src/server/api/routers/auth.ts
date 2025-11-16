import { headers } from "next/headers";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { auth } from "~/server/better-auth";

export const authRouter = createTRPCRouter({
  getSession: protectedProcedure.query(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  }),
});
