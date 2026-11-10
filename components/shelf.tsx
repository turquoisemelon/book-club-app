import type { Book, ShelfEntry } from "@/lib/types";
import { BookCover } from "./ui";

export function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <span className="text-[11px] tracking-tight text-accent" aria-label={`Rated ${rating} out of 5`}>
      {"★".repeat(rating)}
      <span className="text-line">{"★".repeat(5 - rating)}</span>
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
