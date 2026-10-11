"use client";

/**
 * Search box that keeps its text in the URL (?q=… on the list, ?find=… on a PO page), so a
 * search is a shareable link and the server renders the results. Client Component: it waits
 * for a short pause in typing, then replaces the URL in a transition, keeping every other
 * parameter. × clears it; Escape clears it too.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";

/** A labelled search input bound to one URL parameter. */
export function SearchBox({ param, label, placeholder }: { param: string; label: string; placeholder: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(params.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When the URL changes from elsewhere (back button, a link), show its value.
  const fromUrl = params.get(param) ?? "";
  useEffect(() => setText(fromUrl), [fromUrl]);

  /** Writes the text to the URL. replace(), not push(), so typing doesn't fill the back history. */
  function commit(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set(param, value.trim());
    else next.delete(param);
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function onChange(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(value), 250); // wait for a pause in typing
  }

  return (
    <div className="relative flex min-w-0 items-center">
      <Icon name="search" className="pointer-events-none absolute left-2.5 size-4 text-muted" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        maxLength={60}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
        className="min-h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface py-1 pr-8 pl-8 text-sm placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {isPending ? (
        <Spinner className="absolute right-2.5 size-3.5 text-accent" />
      ) : (
        text && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-1 grid size-7 place-items-center rounded-md text-muted hover:bg-subtle hover:text-ink"
          >
            ×
          </button>
        )
      )}
    </div>
  );
}
