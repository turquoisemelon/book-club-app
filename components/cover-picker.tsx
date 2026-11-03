"use client";

import { useEffect, useRef, useState } from "react";
import { searchCovers, shrinkImage, type CoverOption } from "@/lib/books";
import type { Book } from "@/lib/types";
import { BookCover, Button, cx, inputClass } from "./ui";

// Lets a host give a book a cover: pick one found online by title and author,
// upload a photo, or paste an image link.
export function CoverPicker({ title, author, value, onChange }: { title: string; author: string; value?: string; onChange: (cover?: string) => void }) {
  const [options, setOptions] = useState<CoverOption[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [pasting, setPasting] = useState(false);
  const [link, setLink] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = title.trim().length >= 2;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState("loading");
      try {
        setOptions(await searchCovers(title, author, controller.signal));
        setState("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title, author, ready]);

  const preview: Book = { id: "preview", title: title.trim() || "Your book", author: author.trim(), cover: value, sections: 1, sectionLabel: "Chapter" };

  return (
    <div>
      <span className="mb-1 block text-sm font-medium">Cover</span>
      <div className="flex items-start gap-3">
        <BookCover book={preview} width={64} />
        <div className="flex flex-1 flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            Upload photo
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setPasting((p) => !p)}>
            Paste link
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(undefined)}>
              Remove
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploadError("");
              try {
                onChange(await shrinkImage(file));
              } catch {
                setUploadError("Couldn't read that image. Try a JPEG or PNG.");
              }
            }}
          />
        </div>
      </div>
      {uploadError && <p className="mt-2 text-sm text-danger">{uploadError}</p>}
      {pasting && (
        <div className="mt-2 flex gap-2">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/cover.jpg" inputMode="url" className={inputClass} />
          <Button
            type="button"
            size="sm"
            className="self-center"
            disabled={!/^https?:\/\/\S+$/.test(link.trim())}
            onClick={() => {
              onChange(link.trim());
              setLink("");
              setPasting(false);
            }}
          >
            Use
          </Button>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        {!ready
          ? "Type the title and we'll look for covers online."
          : state === "loading"
            ? "Looking for covers…"
            : state === "error"
              ? "Couldn't reach the book databases. You can still upload a photo."
              : options.length
                ? "Found online. Tap one to use it."
                : "No covers found online. Try adding the author, or upload a photo."}
      </p>
      {ready && options.length > 0 && (
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {options.map((o) => (
            <button
              key={o.url}
              type="button"
              onClick={() => onChange(o.url)}
              title={`${o.title}${o.author ? ` by ${o.author}` : ""} (${o.source})`}
              className={cx("shrink-0 rounded-lg p-0.5", value === o.url ? "ring-2 ring-accent" : "ring-1 ring-transparent")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.url} alt={`Cover of ${o.title}`} loading="lazy" className="h-[72px] w-12 rounded-md bg-line object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// A bottom sheet for changing the cover of a book that's already saved.
export function CoverSheet({ book, onSave, onClose }: { book: Book; onSave: (cover?: string) => void; onClose: () => void }) {
  const [cover, setCover] = useState(book.cover);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-paper p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="font-serif text-xl font-semibold">{book.title}</h2>
        {book.author && <p className="mb-4 text-sm text-muted">{book.author}</p>}
        <CoverPicker title={book.title} author={book.author} value={cover} onChange={setCover} />
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => onSave(cover)}>
            Save cover
          </Button>
        </div>
      </div>
    </div>
  );
}
