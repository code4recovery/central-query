export const toUpper = (val?: string) =>
  typeof val === "string" ? val.toUpperCase() : val

export const arrayToUpper = (arr?: string[]) =>
  Array.isArray(arr) ? arr.map(s => s.toUpperCase()) : arr

// Each entry groups a base Latin letter with its common diacritic variants
// (lowercase). Search should treat accented letters as their base letter so
// that e.g. "ret" matches "Rétablissement" (issue #30). Covers Latin-1
// Supplement + Latin Extended-A, which spans the languages OIAA serves.
// Base letter is leading ASCII; accented variants are written as \u escapes so
// the source bytes are unambiguous (see central-query #31).
const DIACRITIC_GROUPS = [
  "aàáâãäåāăą",
  "eèéêëēĕėęě",
  "iìíîïĩīĭįı",
  "oòóôõöøōŏő",
  "uùúûüũūŭůűų",
  "yýÿŷ",
  "cçćĉċč",
  "dďđ",
  "gĝğġģ",
  "lĺļľŀł",
  "nñńņňŉ",
  "rŕŗř",
  "sśŝşš",
  "tţťŧ",
  "zźżž",
]

// Map every variant (both cases) to the full character-class body it belongs
// to. We include both cases explicitly rather than relying on the regex "i"
// flag to case-fold accented codepoints, whose folding is engine-dependent.
const accentClassByChar = new Map<string, string>()
for (const group of DIACRITIC_GROUPS) {
  const classBody = group + group.toUpperCase()
  for (const ch of classBody) accentClassByChar.set(ch, classBody)
}
const accentCharPattern = new RegExp(
  `[${[...accentClassByChar.keys()].join("")}]`,
  "g",
)

// Build a forgiving regex source for meeting-name search: literal text, but
// tolerant of curly/straight quote variants and of diacritics in either the
// query or the stored name. Intended to be used with the "i" option.
export function makeFlexibleRegex(query: string): string {
  let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  escaped = escaped.replace(/['‘’]/g, "['‘’]")
  escaped = escaped.replace(/["“”]/g, "[\"“”]")

  escaped = escaped.replace(
    accentCharPattern,
    ch => `[${accentClassByChar.get(ch)}]`,
  )

  return escaped
}
