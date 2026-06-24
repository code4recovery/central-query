import { makeFlexibleRegex } from "./stringUtils.js"

// Explicit \u escapes — the source bytes cannot be confused with ASCII
// quotes regardless of editor font, smart-quote autocorrect, etc.
const CURLY_OPEN_SINGLE = "\u2018"
const CURLY_CLOSE_SINGLE = "\u2019"
const CURLY_OPEN_DOUBLE = "\u201C"
const CURLY_CLOSE_DOUBLE = "\u201D"

const buildRegex = (input: string) =>
  new RegExp(makeFlexibleRegex(input), "i")

describe("makeFlexibleRegex — single quotes", () => {
  test("straight-quote input matches straight-quote target", () => {
    expect(buildRegex("Joe's").test("Joe's Place")).toBe(true)
  })

  test("straight-quote input matches curly-quote target", () => {
    expect(
      buildRegex("Joe's").test(`Joe${CURLY_CLOSE_SINGLE}s Place`)
    ).toBe(true)
  })

  test("curly-quote input matches straight-quote target", () => {
    expect(
      buildRegex(`Joe${CURLY_CLOSE_SINGLE}s`).test("Joe's Place")
    ).toBe(true)
  })

  test("curly-quote input matches curly-quote target", () => {
    expect(
      buildRegex(`Joe${CURLY_CLOSE_SINGLE}s`).test(
        `Joe${CURLY_CLOSE_SINGLE}s Place`
      )
    ).toBe(true)
  })
})

describe("makeFlexibleRegex — double quotes", () => {
  test("straight-quote input matches straight-quote target", () => {
    expect(buildRegex('"Hello"').test('Say "Hello" now')).toBe(true)
  })

  test("straight-quote input matches curly-quote target", () => {
    expect(
      buildRegex('"Hello"').test(
        `Say ${CURLY_OPEN_DOUBLE}Hello${CURLY_CLOSE_DOUBLE} now`
      )
    ).toBe(true)
  })

  test("curly-quote input matches straight-quote target", () => {
    expect(
      buildRegex(
        `${CURLY_OPEN_DOUBLE}Hello${CURLY_CLOSE_DOUBLE}`
      ).test('Say "Hello" now')
    ).toBe(true)
  })
})

describe("makeFlexibleRegex — pattern shape", () => {
  test("apostrophe character class includes both straight and curly codepoints", () => {
    const pattern = makeFlexibleRegex("'")
    expect(pattern).toContain("'")
    expect(pattern).toContain(CURLY_OPEN_SINGLE)
    expect(pattern).toContain(CURLY_CLOSE_SINGLE)
  })

  test("double-quote character class includes both straight and curly codepoints", () => {
    const pattern = makeFlexibleRegex('"')
    expect(pattern).toContain('"')
    expect(pattern).toContain(CURLY_OPEN_DOUBLE)
    expect(pattern).toContain(CURLY_CLOSE_DOUBLE)
  })
})

describe("makeFlexibleRegex — regex special character escaping", () => {
  test("parentheses are escaped (literal match, not group)", () => {
    const regex = buildRegex("Meeting (Group)")
    expect(regex.test("Weekly Meeting (Group) tonight")).toBe(true)
    expect(regex.test("Weekly Meeting Group tonight")).toBe(false)
  })

  test("dot is escaped (literal match, not any-char)", () => {
    const regex = buildRegex("A.A.")
    expect(regex.test("A.A. members")).toBe(true)
    expect(regex.test("AXAX members")).toBe(false)
  })

  test("plain text without specials is unchanged in behavior", () => {
    expect(buildRegex("Tuesday Night").test("Tuesday Night Group")).toBe(true)
  })
})

describe("makeFlexibleRegex — accent insensitivity", () => {
  test("base-letter query matches accented target (issue #30 example)", () => {
    expect(buildRegex("ret").test("Rétablissement")).toBe(true)
  })

  test("accented query matches base-letter target", () => {
    expect(buildRegex("rét").test("Retablissement")).toBe(true)
  })

  test("accented query matches accented target", () => {
    expect(buildRegex("rét").test("Rétablissement")).toBe(true)
  })

  test("base-letter query matches accented + uppercase target", () => {
    expect(buildRegex("uber").test("Über Gruppe")).toBe(true)
    expect(buildRegex("cafe").test("Café Group")).toBe(true)
  })

  test("non-adjacent base letters do not over-match", () => {
    // guards against the equivalence classes leaking into a looser match
    expect(buildRegex("ret").test("rest")).toBe(false)
  })

  test("letters with no diacritic group match literally", () => {
    expect(buildRegex("bk").test("Book")).toBe(false)
    expect(buildRegex("book").test("Book Club")).toBe(true)
  })

  test("query letter expands to a class containing its accented variants", () => {
    const pattern = makeFlexibleRegex("e")
    expect(pattern).toContain("é")
    expect(pattern).toContain("è")
  })
})
