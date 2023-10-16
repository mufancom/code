export function difference<T>(a: T[], b: T[]): T[] {
  const excludeSet = new Set(b);

  return a.filter(x => !excludeSet.has(x));
}
