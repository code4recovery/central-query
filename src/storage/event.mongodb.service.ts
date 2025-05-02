import * as MongoDB from "mongodb"

import {
  configuredMongoDatabase,
  useCollection,
} from "./mongodb-storage-service.js"

interface EventModel {
  name: string
}

export const getAllEvents = async () => await eventView.find({}).toArray()

const eventView = useCollection<EventModel>("events-view")(
  configuredMongoDatabase,
)

// export const addMeetings = async (resources: Meeting[]) =>
//   await meetingCollection.insertMany(resources)

// export const dayOfWeek = async (day: number) =>
//   await meetingCollection.find({ day: day }).toArray()

const pipelineView = (pipeline: MongoDB.Document[], options = {}) =>
  eventView.aggregate(pipeline, options)

const loadPipelineView = (
  pipeline: MongoDB.Document[],
  options?: MongoDB.Document,
) => pipelineView(pipeline, options).toArray()

export const query = async (
  queryPipeline: MongoDB.Document[],
  options?: MongoDB.Document,
) => loadPipelineView(queryPipeline, options)
