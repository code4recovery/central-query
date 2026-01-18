import { ObjectId } from "mongodb"

import { GroupView } from "./storage.types.js"

import { byId } from "./group.mongodb.service.js"
import {
  configuredMongoDatabase,
  mongoClient,
  useCollection,
} from "./mongodb-storage-service.js"

const testGroupViewCollection = useCollection<GroupView>("group-view")(
  configuredMongoDatabase,
)

beforeEach(async () => {
  await testGroupViewCollection.deleteMany({})
})

afterAll(async () => {
  await mongoClient.close()
})

test("returns group when valid ID exists", async () => {
  const testId = new ObjectId()
  await testGroupViewCollection.insertOne({
    _id: testId,
    name: "Test Group",
    email: "test@example.com",
    website: "https://example.com",
  })

  const result = await byId(testId.toString())

  expect(result).not.toBeNull()
  expect(result!._id).toEqual(testId)
  expect(result!.name).toBe("Test Group")
  expect(result!.email).toBe("test@example.com")
})

test("returns null when ID does not exist", async () => {
  const nonExistentId = new ObjectId()

  const result = await byId(nonExistentId.toString())

  expect(result).toBeNull()
})

test("handles invalid ObjectId format gracefully", async () => {
  await expect(byId("invalid-id")).rejects.toThrow()
})

test("returns group with only required fields when optional fields absent", async () => {
  const testId = new ObjectId()
  await testGroupViewCollection.insertOne({
    _id: testId,
    name: "Minimal Group",
  })

  const result = await byId(testId.toString())

  expect(result).not.toBeNull()
  expect(result!.name).toBe("Minimal Group")
  expect(result!.email).toBeUndefined()
  expect(result!.website).toBeUndefined()
})

test("queries group-view collection not group collection", async () => {
  const groupCollection = useCollection<GroupView>("group")(
    configuredMongoDatabase,
  )
  const testId = new ObjectId()

  await groupCollection.insertOne({
    _id: testId,
    name: "Should Not Be Found",
  })

  const result = await byId(testId.toString())

  expect(result).toBeNull()
})
