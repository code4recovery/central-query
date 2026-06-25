#!/usr/bin/env tsx

import { createManagedViewsForDatabase } from "../src/storage/view-bootstrap.ts"

const uri = process.env.MONGO_URI
const dbName = process.env.MONGO_DB_NAME

if (uri === undefined || dbName === undefined) {
  console.error(
    "MONGO_URI and MONGO_DB_NAME must both be set before running migrate:views.",
  )
  process.exit(1)
}

try {
  const definitions = await createManagedViewsForDatabase(uri, dbName)
  console.log(
    `\n✅ Recreated ${definitions.length} managed views in ${dbName}.`,
  )
} catch (error) {
  console.error("\n❌ Failed to recreate managed views:", error)
  process.exit(1)
}
