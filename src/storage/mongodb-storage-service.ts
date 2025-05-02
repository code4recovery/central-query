import * as dotenv from "dotenv"
import * as MongoDB from "mongodb"

dotenv.config()

const useMongoDb = async () => {
  const env = process.env.NODE_ENV || "development"
  const isDevelopment = env === "development" || env === "test"
  let mongoClientOptions: MongoDB.MongoClientOptions = {}
  if (!isDevelopment) {
    mongoClientOptions = {
      maxPoolSize: 50,
      w: "majority",
      wtimeoutMS: 2500,
    }
  }
  const uri = process.env.MONGO_URI
  if (uri === undefined) throw new Error("Undefined database URI.")
  const connectedClient = await new MongoDB.MongoClient(
    uri,
    mongoClientOptions,
  ).connect()
  return connectedClient
}

const useAppProvidedDatabaseNameWithMongoDB = (
  connectedClient: MongoDB.MongoClient,
) => {
  const dbName = process.env.MONGO_DB_NAME
  if (dbName === undefined) throw new Error("Undefined database name.")
  return useDatabase(dbName)(connectedClient)
}

const useDatabase = (name: string) => (client: MongoDB.MongoClient) =>
  client.db(name)

const mongoClient = await useMongoDb()

const configuredMongoDatabase =
  useAppProvidedDatabaseNameWithMongoDB(mongoClient)

const useCollection =
  <TSchema extends MongoDB.Document = MongoDB.Document>(collName: string) =>
  (database: MongoDB.Db) =>
    database.collection<TSchema>(collName)

export { configuredMongoDatabase, mongoClient, useCollection }
