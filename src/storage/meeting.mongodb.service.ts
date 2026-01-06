import * as MongoDB from "mongodb"

import { ActiveLanguage, ActiveType, MeetingView } from "./storage.types.js"

import {
  configuredMongoDatabase,
  useCollection,
} from "./mongodb-storage-service.js"

export const meetingCollection = useCollection<MeetingView>("meeting")(
  configuredMongoDatabase,
)

const meetingViewSorted = useCollection<MeetingView>("meeting-view-sorted-rtc")(
  configuredMongoDatabase,
)

const pipelineView = (pipeline: MongoDB.Document[]) =>
  meetingViewSorted.aggregate(
    pipeline,
  ) as MongoDB.AggregationCursor<MeetingView>

const loadPipelineView = (pipeline: MongoDB.Document[]) =>
  pipelineView(pipeline).toArray()

export const query = async (queryPipeline: MongoDB.Document[]) =>
  loadPipelineView(queryPipeline)

export const bySlug = async (slug: string) =>
  meetingViewSorted.findOne({ slug })

export const byGroup = async (groupID: string) =>
  meetingViewSorted.find({ groupID: new MongoDB.ObjectId(groupID) }).toArray()

const meetingLanguages = useCollection<ActiveLanguage>("unique-languages-view")(
  configuredMongoDatabase,
)

const meetingTypes = useCollection<ActiveType>("unique-types-view")(
  configuredMongoDatabase,
)

export const getActiveTypes = async (): Promise<ActiveType[]> => {
  return meetingTypes.find({}, { projection: { _id: 0 } }).toArray() as Promise<
    ActiveType[]
  >
}

export const getActiveLanguages = async (): Promise<ActiveLanguage[]> => {
  return meetingLanguages
    .find({}, { projection: { _id: 0 } })
    .toArray() as Promise<ActiveLanguage[]>
}
