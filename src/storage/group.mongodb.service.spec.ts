import fs from "fs"
import { ObjectId } from "mongodb"

import { byId } from "./group.mongodb.service.js"
import {
  configuredMongoDatabase,
  mongoClient,
  useCollection,
} from "./mongodb-storage-service.js"
import { GroupModel } from "./storage.types.js"

const groupsTestData = JSON.parse(
  fs.readFileSync("cypress/fixtures/groups.json", "utf-8"),
)
const cleanedGroupsTestData = groupsTestData.map((group) => {
  group._id = new ObjectId(group._id.$oid)
  return group
})
const testGroupsCollection = useCollection("group")<GroupModel>(
  configuredMongoDatabase,
)

async function resetDatabase() {
  await testGroupsCollection.deleteMany({})
}

describe("group.mongodb.service - byId", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterEach(async () => {
    await mongoClient.close()
  })

  test("should return a group when a valid ID is provided", async () => {
    await testGroupsCollection.insertMany(cleanedGroupsTestData)
    const testGroupId = cleanedGroupsTestData[0]._id

    const result = await byId(testGroupId.toString())

    expect(result).not.toBeNull()
    expect(result!.name).toBe("Global Men's Meditation")
  })
})
