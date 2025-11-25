/**
 * Shortens a string by keeping N characters from the start and M from the end.
 * Adds ".." (or any separator) in between.
 */
export function shortenString(str: string, start: number = 4, end: number = 4, separator: string = '..'): string {
  if (!str || str.length <= start + end) return str;
  return `${str.slice(0, start)}${separator}${str.slice(-end)}`;
}
