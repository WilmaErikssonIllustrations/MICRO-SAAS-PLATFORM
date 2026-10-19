// Picks black or white text depending on which reads better on `hex`,
// using the WCAG relative luminance formula.
export function getContrastText(hex: string): "#000000" | "#ffffff" {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.179 ? "#000000" : "#ffffff";
}
