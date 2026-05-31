#!/usr/bin/env tsx
/**
 * Start the application server with MongoDB Memory Server for e2e testing
 * This eliminates the need for Docker or a local MongoDB installation
 * 
 * Usage: npm run e2e:start
 */

import { MongoMemoryServer } from "mongodb-memory-server"
import { MongoClient, ObjectId } from "mongodb"
import { readFile } from "fs/promises"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { spawn } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let memoryServer: MongoMemoryServer | null = null
let appProcess: any = null

// Convert MongoDB extended JSON to native JavaScript objects
function convertExtendedJSON(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  if (Array.isArray(obj)) {
    return obj.map(convertExtendedJSON)
  }
  
  if (typeof obj === "object") {
    // Handle MongoDB extended JSON types
    if (obj.$oid) return new ObjectId(obj.$oid)
    if (obj.$date) return new Date(obj.$date)
    
    // Recursively convert nested objects
    const converted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertExtendedJSON(value)
    }
    return converted
  }
  
  return obj
}

async function loadFixture(filename: string) {
  const path = join(__dirname, "..", "cypress", "fixtures", filename)
  const content = await readFile(path, "utf-8")
  const parsed = JSON.parse(content)
  return convertExtendedJSON(parsed)
}

async function loadViewPipeline(filename: string) {
  const path = join(__dirname, "..", "docs", "views", filename)
  const content = await readFile(path, "utf-8")
  return JSON.parse(content)
}

async function seedDatabase(uri: string, dbName: string) {
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    const db = client.db(dbName)

    console.log("📦 Seeding test data...")
    
    // Load and insert groups
    const groups = await loadFixture("groups.json")
    if (groups.length > 0) {
      await db.collection("group").insertMany(groups)
      console.log(`   ✅ Inserted ${groups.length} groups`)
    }

    // Load and insert meetings
    const meetings = await loadFixture("meetings.json")
    if (meetings.length > 0) {
      await db.collection("meeting").insertMany(meetings)
      console.log(`   ✅ Inserted ${meetings.length} meetings`)
    }
  } finally {
    await client.close()
  }
}

async function seedReferenceData(uri: string, dbName: string) {
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    const db = client.db(dbName)

    console.log("📚 Seeding reference data...")
    
    // Load and insert languages (for facet views)
    const languages = await loadFixture("language.json")
    if (languages.length > 0) {
      await db.collection("language").insertMany(languages)
      console.log(`   ✅ Inserted ${languages.length} languages`)
    }

    // Load and insert types (for facet views)
    const types = await loadFixture("type.json")
    if (types.length > 0) {
      await db.collection("type").insertMany(types)
      console.log(`   ✅ Inserted ${types.length} types`)
    }
  } finally {
    await client.close()
  }
}

async function createViews(uri: string, dbName: string) {
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    const db = client.db(dbName)

    console.log("🔭 Creating MongoDB views...")
    
    const viewDefinitions = [
      // Main meeting views
      { name: "scheduled-meetings", on: "meeting", pipeline: await loadViewPipeline("scheduled-meetings.json") },
      { name: "unscheduled-meetings", on: "meeting", pipeline: await loadViewPipeline("unscheduled-meetings.json") },
      { name: "combined-meetings", on: "meeting", pipeline: await loadViewPipeline("combined-meetings.json") },
      
      // Group view
      { name: "group-view", on: "group", pipeline: await loadViewPipeline("group-view.json") },
      
      // Language facet views
      { name: "unique-languages-view", on: "meeting", pipeline: await loadViewPipeline("unique-languages-view.json") },
      { name: "unique-languages-scheduled", on: "meeting", pipeline: await loadViewPipeline("unique-languages-scheduled.json") },
      { name: "unique-languages-unscheduled", on: "meeting", pipeline: await loadViewPipeline("unique-languages-unscheduled.json") },
      
      // Type facet views
      { name: "unique-types-view", on: "meeting", pipeline: await loadViewPipeline("unique-types-view.json") },
      { name: "unique-types-scheduled", on: "meeting", pipeline: await loadViewPipeline("unique-types-scheduled.json") },
      { name: "unique-types-unscheduled", on: "meeting", pipeline: await loadViewPipeline("unique-types-unscheduled.json") },
    ]

    for (const { name, on, pipeline } of viewDefinitions) {
      await db.createCollection(name, { viewOn: on, pipeline })
      console.log(`   ✅ Created view: ${name}`)
    }
    
    // Verify views are working
    const scheduledCount = await db.collection("scheduled-meetings").countDocuments()
    const unscheduledCount = await db.collection("unscheduled-meetings").countDocuments()
    console.log(`   ✅ Verified: ${scheduledCount} scheduled, ${unscheduledCount} unscheduled meetings`)
    
  } finally {
    await client.close()
  }
}

async function startE2EEnvironment() {
  try {
    console.log("🚀 Starting e2e test environment...\n")
    
    // Start MongoDB Memory Server
    console.log("🔧 Starting MongoDB Memory Server...")
    memoryServer = await MongoMemoryServer.create()
    const uri = memoryServer.getUri()
    const dbName = "central-query-e2e"
    
    console.log("   ✅ Memory server started")
    console.log(`   URI: ${uri}`)
    console.log(`   Database: ${dbName}\n`)
    
    await seedDatabase(uri, dbName)
    await seedReferenceData(uri, dbName)
    await createViews(uri, dbName)

    console.log("\n🚀 Starting application server...")
    console.log("   Port: 5001\n")
    
    // Start the application with the in-memory database
    appProcess = spawn("npm", ["run", "start-dev"], {
      stdio: "inherit",
      env: {
        ...process.env,
        MONGO_URI: uri,
        MONGO_DB_NAME: dbName,
        PORT: "5001",
        NODE_ENV: "development"
      }
    })
    
    appProcess.on("exit", (code: number) => {
      console.log(`\n📊 Application exited with code ${code}`)
      cleanup()
    })
    
    console.log("✅ E2E environment ready!")
    console.log("   Application: http://localhost:5001")
    console.log("   Press Ctrl+C to stop\n")
    
  } catch (error) {
    console.error("❌ Failed to start e2e environment:", error)
    cleanup()
    process.exit(1)
  }
}

async function cleanup() {
  console.log("\n🧹 Cleaning up...")
  
  if (appProcess) {
    appProcess.kill()
  }
  
  if (memoryServer) {
    await memoryServer.stop()
    console.log("   ✅ Memory server stopped")
  }
  
  process.exit(0)
}

// Handle graceful shutdown
process.on("SIGINT", cleanup)
process.on("SIGTERM", cleanup)

startE2EEnvironment()
