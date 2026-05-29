import * as MongoDB from "mongodb"
import { MongoMemoryServer } from "mongodb-memory-server"

import dbConfig from "./dbConfig"

export default async function globalSetup() {
  if (dbConfig.Memory) {
    // Config to decided if an mongodb-memory-server instance should be used
    // it's needed in global space, because we don't want to create a new instance every test-suite
    const instance = await MongoMemoryServer.create()
    const uri = instance.getUri()
    ;(global as any).__MONGOINSTANCE = instance
    process.env.MONGO_URI = uri.slice(0, uri.lastIndexOf("/"))
  } else {
    process.env.MONGO_URI = `mongodb://${dbConfig.IP}:${dbConfig.Port}`
  }

  // Set the database name for tests
  process.env.MONGO_DB_NAME = dbConfig.Database

  // The following is to make sure the database is clean before an test starts
  const connection = await MongoDB.MongoClient.connect(
    `${process.env.MONGO_URI}`,
  )
  await connection.db(`${dbConfig.Database}`).dropDatabase()
  await connection.close()
}
