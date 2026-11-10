// Reading progress is tracked in quarters of the book, as a percentage
// (0, 25, 50, 75, 100), so it works the same for any book whatever its
// chapters. Member progress, spoiler gates on talk topics and "read up to"
// on meetups all use this scale.

export const STEPS = [25, 50, 75, 100] as const;

// Snap any number onto the scale. Progress rounds down so nobody unlocks a
// spoiler they haven't reached; gates round up so a spoiler never opens early.
export function snapDown(pct: number) {
  return Math.max(0, Math.min(100, Math.floor(pct / 25) * 25));
}

export function snapUp(pct: number) {
  return Math.max(0, Math.min(100, Math.ceil(pct / 25) * 25));
}

// "Halfway", for where a reader is.
export function progressLabel(pct: number) {
  const p = snapDown(pct);
  if (p === 0) return "Not started";
  if (p === 25) return "A quarter of the way in";
  if (p === 50) return "Halfway through";
  if (p === 75) return "Three quarters of the way in";
  return "Finished";
}

// "the first half", for how much of the book something covers.
export function spanLabel(pct: number) {
  const p = snapUp(pct);
  if (p === 0) return "none of the book";
  if (p === 25) return "the first quarter";
  if (p === 50) return "the first half";
  if (p === 75) return "the first three quarters";
  return "the whole book";
}

// "Up to 50%", for a compact pill or menu option.
export function gateLabel(pct: number) {
  const p = snapUp(pct);
  if (p === 0) return "No spoilers";
  if (p === 100) return "The whole book";
  return `Up to ${p}%`;
}
