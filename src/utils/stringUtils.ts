export const toUpper = (val?: string) =>
  typeof val === "string" ? val.toUpperCase() : val

export const arrayToUpper = (arr?: string[]) =>
  Array.isArray(arr) ? arr.map(s => s.toUpperCase()) : arr

/**
 * Transforms a search query to match both straight and curly quote variants in regex.
 * Escapes regex special characters and replaces quotes with character classes.
 *
 * @param query - The search string to transform
 * @returns A regex pattern that matches both quote types
 * @example
 * makeQuoteFlexibleRegex("Joe's") // returns "Joe['']s"
 * makeQuoteFlexibleRegex('Say "Hello"') // returns 'Say ["""]Hello["""]'
 */
export function makeQuoteFlexibleRegex(query: string): string {
  // Escape regex special characters except quotes
  let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Replace straight quotes with character classes that match both variants
  escaped = escaped.replace(/'/g, "['']")  // straight apostrophe → matches both ' and '
  escaped = escaped.replace(/"/g, '[""]')  // straight quote → matches both " and "

  return escaped
}