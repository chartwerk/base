export function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function uid(): string {
  const len = 10;
  // https://stackoverflow.com/a/19964557
  return Math.random().toString(36).substr(2, len + 2);
}
