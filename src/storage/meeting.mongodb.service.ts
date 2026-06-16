import * as MongoDB from "mongodb"

import { ActiveLanguage, ActiveType, MeetingView } from "./storage.types.js"

import {
  configuredMongoDatabase,
  useCollection,
} from "./mongodb-storage-service.js"

export type MeetingViewType = "scheduled" | "unscheduled" | "combined"

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
  return getCollectionByCategoryAndViewType("meetings", viewType)
    .find({ groupID: new MongoDB.ObjectId(groupID) })
    .toArray()
}

export const getActiveTypes = async (
  viewType: MeetingViewType = "combined",
): Promise<ActiveType[]> => {
  return getCollectionByCategoryAndViewType("types", viewType)
    .find({}, { projection: { _id: 0 } })
    .toArray()
}

export const getActiveLanguages = async (
  viewType: MeetingViewType = "combined",
): Promise<ActiveLanguage[]> => {
  return getCollectionByCategoryAndViewType("languages", viewType)
    .find({}, { projection: { _id: 0 } })
    .toArray()
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

const collections = {
  meetings: {
    scheduled,
    unscheduled,
    combined,
  },
  types: {
    scheduled: meetingTypesScheduled,
    unscheduled: meetingTypesUnscheduled,
    combined: meetingTypes,
  },
  languages: {
    scheduled: meetingLanguagesScheduled,
    unscheduled: meetingLanguagesUnscheduled,
    combined: meetingLanguages,
  },
} as const

const getCollectionByCategoryAndViewType = <
  K extends keyof typeof collections,
  V extends keyof (typeof collections)[K],
>(
  category: K,
  viewType: V,
) => {
  return collections[category][viewType]
}

const pipelineView = (
  pipeline: MongoDB.Document[],
  viewType: MeetingViewType,
) => {
  return getCollectionByCategoryAndViewType("meetings", viewType).aggregate(
    pipeline,
  ) as MongoDB.AggregationCursor<MeetingView>
}

const loadPipelineView = (
  pipeline: MongoDB.Document[],
  viewType: MeetingViewType,
) => pipelineView(pipeline, viewType).toArray()
