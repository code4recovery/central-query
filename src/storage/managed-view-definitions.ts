import { join } from "path"
import * as MongoDB from "mongodb"
import { readFile } from "fs/promises"

export type ManagedViewDefinition = {
  name: string
  viewOn: string
  pipeline: MongoDB.Document[]
}

const managedViewFiles = [
  "scheduled-meetings.json",
  "unscheduled-meetings.json",
  "combined-meetings.json",
  "group-view.json",
  "unique-languages-view.json",
  "unique-languages-scheduled.json",
  "unique-languages-unscheduled.json",
  "unique-types-view.json",
  "unique-types-scheduled.json",
  "unique-types-unscheduled.json",
] as const

const docsViewsDirectory = join(process.cwd(), "docs", "views")

const isManagedViewDefinition = (
  value: unknown,
): value is ManagedViewDefinition => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.name === "string" &&
    typeof candidate.viewOn === "string" &&
    Array.isArray(candidate.pipeline)
  )
}

const parseManagedViewDefinition = (
  value: unknown,
  fileName: string,
): ManagedViewDefinition => {
  if (!isManagedViewDefinition(value)) {
    throw new Error(`Invalid managed view definition in ${fileName}.`)
  }

  return {
    name: value.name,
    viewOn: value.viewOn,
    pipeline: value.pipeline,
  }
}

export const loadManagedViewDefinitions = async (): Promise<
  ManagedViewDefinition[]
> => {
  return Promise.all(
    managedViewFiles.map(async (fileName) => {
      const content = await readFile(
        join(docsViewsDirectory, fileName),
        "utf-8",
      )
      return parseManagedViewDefinition(JSON.parse(content), fileName)
    }),
  )
}
