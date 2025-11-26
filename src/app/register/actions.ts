"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/server/better-auth";

export async function signInWithGoogleAction() {
  const res = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL: "/panel",
    },
    headers: await headers(),
  });

  if (!res.url) {
    throw new Error("No se pudo obtener la URL de Google Auth");
  }

  redirect(res.url);
}
