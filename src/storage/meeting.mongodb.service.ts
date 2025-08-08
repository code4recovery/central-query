import * as MongoDB from "mongodb"

import { Weekdays } from "../utils/dates.js"
import {
  configuredMongoDatabase,
  useCollection,
} from "./mongodb-storage-service.js"
import { ActiveLanguage, ActiveType, MeetingView } from "./storage.types.js"

export const meetingCollection = useCollection<MeetingView>("meeting")(
  configuredMongoDatabase,
)

const meetingView = useCollection<MeetingView>("meeting-view")(
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

export const bySlug = async (slug: string) => meetingView.findOne({ slug })

/** The following are not fully implemented yet. */
export const byDay = async (day: Weekdays) => {
  const searchDay = day.toString()
  return loadPipelineView([
    {
      $match: { rtc: { $regex: `^${searchDay}` } },
    },
  ])
}

export const byGroup = async (groupID: string) =>
  meetingView.find({ groupID: new MongoDB.ObjectId(groupID) }).toArray()

const meetingLanguages = useCollection<ActiveLanguage>("unique-languages-view")(
  configuredMongoDatabase,
)

const meetingTypes = useCollection<ActiveType>("unique-types-view")(
  configuredMongoDatabase,
)

export const getActiveTypes = async () => {
  return meetingTypes.find({}).toArray()
}

export const getActiveLanguages = async () => {
  return meetingLanguages.find({}).toArray()
}
