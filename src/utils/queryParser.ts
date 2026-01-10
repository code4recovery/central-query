export function parsedQueryParams<T>(
  query: Record<string, string>,
  keys: string[],
  types: Record<string, "string" | "number" | "array" | "boolean"> = {},
): Partial<T> {
  return keys.reduce(
    (acc, key) => {
      const value = query[key]
      if (types[key] === "number" && value !== undefined) {
        const num = Number(value)
        acc[key] = !isNaN(num) ? num : undefined
      } else if (types[key] === "boolean" && value !== undefined) {
        acc[key] = value === "true"
      } else if (types[key] === "array" && value !== undefined) {
        try {
          acc[key] = JSON.parse(value)
        } catch {
          acc[key] = [value]
        }
      } else {
        acc[key] = value
      }
      return acc
    },
    {} as Record<string, unknown>,
  ) as Partial<T>
}
