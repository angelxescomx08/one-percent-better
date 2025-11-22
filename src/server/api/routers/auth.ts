import { headers } from "next/headers";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { auth } from "~/server/better-auth";

export const authRouter = createTRPCRouter({
  getSession: protectedProcedure.query(({ ctx }) => {
    const { session } = ctx;
    return session;
  }),
  signOut: protectedProcedure.mutation(async () => {
    await auth.api.signOut({
      headers: await headers(),
    });
  }),
});
