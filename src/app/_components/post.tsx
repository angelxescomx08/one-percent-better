"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export function LatestPost() {
  //const [latestPost] = api.post.getLatest.useSuspenseQuery();

  const utils = api.useUtils();
  const [name, setName] = useState("");
  /*const createPost = api.post.create.useMutation({
		onSuccess: async () => {
			await utils.post.invalidate();
			setName("");
		},
	});*/

  return (
    <div className="w-full max-w-xs">
      <form className="flex flex-col gap-2">
        <input
          className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
          onChange={(e) => setName(e.target.value)}
          placeholder="Title"
          type="text"
          value={name}
        />
        <button
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          //disabled={createPost.isPending}
          type="submit"
        >
          Hola
        </button>
      </form>
    </div>
  );
}
