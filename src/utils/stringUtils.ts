export const toUpper = (val?: string) =>
  typeof val === "string" ? val.toUpperCase() : val

export const arrayToUpper = (arr?: string[]) =>
  Array.isArray(arr) ? arr.map(s => s.toUpperCase()) : arr

export function makeQuoteFlexibleRegex(query: string): string {
  let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  escaped = escaped.replace(/'/g, "['']")  // straight apostrophe → matches both ' and '
  escaped = escaped.replace(/"/g, '[""]')  // straight quote → matches both " and "

  return escaped
}