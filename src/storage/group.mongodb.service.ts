import * as MongoDB from "mongodb"

import {
  configuredMongoDatabase,
  useCollection,
} from "./mongodb-storage-service.js"
import { GroupView } from "./storage.types.js"

export const groupView = useCollection<GroupView>("group-view")(
  configuredMongoDatabase,
)

export const byId = async (id: string) => {
  return await groupView.findOne({
    _id: new MongoDB.ObjectId(id),
  })
}
