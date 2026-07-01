import * as MongoDB from "mongodb"

import {
  loadManagedViewDefinitions,
  ManagedViewDefinition,
} from "./managed-view-definitions.js"

type ViewBootstrapLogger = Pick<Console, "log">

const isNamespaceNotFound = (error: unknown) => {
  return (
    error instanceof MongoDB.MongoServerError &&
    (error.code === 26 || error.codeName === "NamespaceNotFound")
  )
}

const dropManagedViewIfPresent = async (db: MongoDB.Db, name: string) => {
  const [info] = await db.listCollections({ name }).toArray()

  if (!info) {
    return false
  }

  if (info.type !== "view") {
    throw new Error(
      `Refusing to drop non-view namespace "${name}" while bootstrapping managed views.`,
    )
  }

  try {
    await db.collection(name).drop()
    return true
  } catch (error) {
    if (isNamespaceNotFound(error)) {
      return false
    }

    throw error
  }
}

const createManagedView = async (
  db: MongoDB.Db,
  definition: ManagedViewDefinition,
  logger: ViewBootstrapLogger,
) => {
  const droppedExistingView = await dropManagedViewIfPresent(
    db,
    definition.name,
  )

  if (droppedExistingView) {
    logger.log(`   ♻️ Recreating view: ${definition.name}`)
  }

  await db.createCollection(definition.name, {
    viewOn: definition.viewOn,
    pipeline: definition.pipeline,
  })

  logger.log(`   ✅ Created view: ${definition.name}`)
}

export const createManagedViews = async (
  db: MongoDB.Db,
  logger: ViewBootstrapLogger = console,
) => {
  logger.log("🔭 Creating MongoDB views...")

  const definitions = await loadManagedViewDefinitions()

  for (const definition of definitions) {
    await createManagedView(db, definition, logger)
  }

  return definitions
}

export const createManagedViewsForDatabase = async (
  uri: string,
  dbName: string,
  logger: ViewBootstrapLogger = console,
) => {
  const client = new MongoDB.MongoClient(uri)

  try {
    await client.connect()
    return await createManagedViews(client.db(dbName), logger)
  } finally {
    await client.close()
  }
}
