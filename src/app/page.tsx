import { redirect } from "next/navigation";
import { auth } from "~/server/better-auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-[#2e026d] to-[#15162c] text-white">
        <form>
          <button
            className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
            formAction={async () => {
              "use server";
              const res = await auth.api.signInSocial({
                body: {
                  provider: "google",
                  callbackURL: "/pa",
                },
              });
              if (!res.url) {
                throw new Error("No URL returned from signInSocial");
              }
              redirect(res.url);
            }}
            type="submit"
          >
            Sign in with Google
          </button>
        </form>
      </main>
    </HydrateClient>
  );
}
