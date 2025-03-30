import * as MongoDB from "mongodb"

import {
  configuredMongoDatabase,
  useCollection,
} from "./mongodb-storage-service.js"

export const groupCollection = useCollection("group")(configuredMongoDatabase)

export const byId = async (id: string) => {
  return await groupCollection.findOne({ _id: new MongoDB.ObjectId(id) })
}
