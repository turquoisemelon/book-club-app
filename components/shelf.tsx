import type { Book, ShelfEntry } from "@/lib/types";
import { BookCover } from "./ui";

export function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  // Fractional ratings (e.g. 2.25) fill the stars partway.
  const pct = `${(rating / 5) * 100}%`;
  return (
    <span className="inline-flex items-center gap-1 text-[11px]" aria-label={`Rated ${rating} out of 5`}>
      <span className="relative tracking-tight text-line">
        ★★★★★
        <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-accent" style={{ width: pct }}>
          ★★★★★
        </span>
      </span>
      {!Number.isInteger(rating) && <span className="text-muted">{rating}</span>}
    </span>
  );
}

// A cover with its title, author and (if any) your rating underneath.
export function ShelfBook({ book, entry, width = 84 }: { book: Book; entry: ShelfEntry; width?: number }) {
  return (
    <div style={{ width }} className="shrink-0">
      <BookCover book={book} width={width} />
      <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug">{book.title}</p>
      <p className="truncate text-xs text-muted">{book.author}</p>
      <Stars rating={entry.rating} />
    </div>
  );
}
