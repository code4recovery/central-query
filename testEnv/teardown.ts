import { MongoMemoryServer } from "mongodb-memory-server"

import dbConfig from "./dbConfig"

type GlobalWithMongoInstance = typeof globalThis & {
  __MONGOINSTANCE?: MongoMemoryServer
}

export default async function globalTeardown() {
  if (dbConfig.Memory) {
    // Config to decided if an mongodb-memory-server instance should be used
    const instance = (global as GlobalWithMongoInstance).__MONGOINSTANCE
    if (instance) {
      await instance.stop()
    }
  }
}
