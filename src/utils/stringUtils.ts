export const toUpper = (val?: string) =>
  typeof val === "string" ? val.toUpperCase() : val

export const arrayToUpper = (arr?: string[]) =>
  Array.isArray(arr) ? arr.map(s => s.toUpperCase()) : arr

export function makeQuoteFlexibleRegex(query: string): string {
  let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  escaped = escaped.replace(/['\u2018\u2019]/g, "['\u2018\u2019]")
  escaped = escaped.replace(/["\u201C\u201D]/g, '["\u201C\u201D]')

  return escaped
}
