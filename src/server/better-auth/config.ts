import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { env } from "~/env";
import { db } from "~/server/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
      redirectURI: env.BETTER_AUTH_REDIRECT_URI,
    },
  },
  // advanced: {
  //   defaultCookieAttributes: {
  //     sameSite: "lax",
  //     secure: process.env.NODE_ENV === "production",
  //   },
  // },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;