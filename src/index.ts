import * as dotenv from "dotenv"
import { join } from "path"
import { readFileSync } from "fs"

import Logger from "./common/logger.js"

import {
  configuredMongoDatabase,
  mongoClient,
} from "./storage/mongodb-storage-service.js"

import app from "./server.js"

// Read version from package.json
const { version } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8"),
)

dotenv.config()
const port = 5001

try {
  app.listen(port, () => {
    Logger.info(
      `Server v${version} listening on port ${port} with database connected to ${configuredMongoDatabase.namespace}.`,
    )
    console.log(`listening on port ${port} (v${version})`)
  })
} catch (error) {
  console.error(error)
  mongoClient.close()
}
