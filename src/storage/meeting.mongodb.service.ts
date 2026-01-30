import * as MongoDB from "mongodb"

import { ActiveLanguage, ActiveType, MeetingView } from "./storage.types.js"

import {
  configuredMongoDatabase,
  useCollection,
} from "./mongodb-storage-service.js"

export type MeetingViewType = "scheduled" | "unscheduled" | "combined"

export const meetingCollection = useCollection<MeetingView>("meeting")(
  configuredMongoDatabase,
)

export const query = async (
  queryPipeline: MongoDB.Document[],
  viewType: MeetingViewType = "combined",
) => loadPipelineView(queryPipeline, viewType)

export const bySlug = async (slug: string): Promise<MeetingView | null> => {
  return combined.findOne({ slug })
}

export const byGroup = async (
  groupID: string,
  viewType: MeetingViewType = "combined",
): Promise<MeetingView[]> => {
  return getCollection(viewType)
    .find({ groupID: new MongoDB.ObjectId(groupID) })
    .toArray()
}

export const getActiveTypes = async (
  viewType: MeetingViewType = "combined",
): Promise<ActiveType[]> => {
  let collection: MongoDB.Collection<ActiveType>
  switch (viewType) {
    case "scheduled":
      collection = meetingTypesScheduled
      break
    case "unscheduled":
      collection = meetingTypesUnscheduled
      break
    case "combined":
    default:
      collection = meetingTypes
  }
  return collection.find({}, { projection: { _id: 0 } }).toArray() as Promise<
    ActiveType[]
  >
}

export const getActiveLanguages = async (
  viewType: MeetingViewType = "combined",
): Promise<ActiveLanguage[]> => {
  let collection: MongoDB.Collection<ActiveLanguage>
  switch (viewType) {
    case "scheduled":
      collection = meetingLanguagesScheduled
      break
    case "unscheduled":
      collection = meetingLanguagesUnscheduled
      break
    case "combined":
    default:
      collection = meetingLanguages
  }
  return collection.find({}, { projection: { _id: 0 } }).toArray() as Promise<
    ActiveLanguage[]
  >
}

const scheduled = useCollection<MeetingView>("scheduled-meetings")(
  configuredMongoDatabase,
)

const unscheduled = useCollection<MeetingView>("unscheduled-meetings")(
  configuredMongoDatabase,
)

const combined = useCollection<MeetingView>("combined-meetings")(
  configuredMongoDatabase,
)

const meetingLanguages = useCollection<ActiveLanguage>("unique-languages-view")(
  configuredMongoDatabase,
)

const meetingLanguagesScheduled = useCollection<ActiveLanguage>(
  "unique-languages-scheduled",
)(configuredMongoDatabase)

const meetingLanguagesUnscheduled = useCollection<ActiveLanguage>(
  "unique-languages-unscheduled",
)(configuredMongoDatabase)

const meetingTypes = useCollection<ActiveType>("unique-types-view")(
  configuredMongoDatabase,
)

const meetingTypesScheduled = useCollection<ActiveType>(
  "unique-types-scheduled",
)(configuredMongoDatabase)

const meetingTypesUnscheduled = useCollection<ActiveType>(
  "unique-types-unscheduled",
)(configuredMongoDatabase)

const getCollection = (viewType: MeetingViewType) =>
  viewType === "scheduled"
    ? scheduled
    : viewType === "unscheduled"
    ? unscheduled
    : combined

const pipelineView = (
  pipeline: MongoDB.Document[],
  viewType: MeetingViewType,
) => {
  return getCollection(viewType).aggregate(
    pipeline,
  ) as MongoDB.AggregationCursor<MeetingView>
}

const loadPipelineView = (
  pipeline: MongoDB.Document[],
  viewType: MeetingViewType,
) => pipelineView(pipeline, viewType).toArray()
