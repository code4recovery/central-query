export const toUpper = (val?: string) =>
  typeof val === "string" ? val.toUpperCase() : val

export const arrayToUpper = (arr?: string[]) =>
  Array.isArray(arr) ? arr.map(s => s.toUpperCase()) : arr