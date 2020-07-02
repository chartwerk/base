export function uid(): string {
  const len = 10;
  // https://stackoverflow.com/a/19964557
  return Math.random().toString(36).substr(2, len + 2);
}
