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
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080

process.on("unhandledRejection", (reason) => {
  Logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.stack : reason}`)
})

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
