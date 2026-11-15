export function pick<T>(arr: readonly T[]): T {
  const v = arr[Math.floor(Math.random() * arr.length)];
  if (v === undefined) throw new Error("pick() on empty array");
  return v;
}
