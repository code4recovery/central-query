import * as MongoDB from "mongodb"

import { ActiveLanguage, ActiveType, MeetingView } from "./storage.types.js"

import {
  configuredMongoDatabase,
  useCollection,
} from "./mongodb-storage-service.js"

export type MeetingViewType = "scheduled" | "unscheduled"

export const meetingCollection = useCollection<MeetingView>("meeting")(
  configuredMongoDatabase,
)

export const query = async (
  queryPipeline: MongoDB.Document[],
  viewType: MeetingViewType = "scheduled",
) => loadPipelineView(queryPipeline, viewType)

export const bySlug = async (
  slug: string,
  viewType: MeetingViewType = "scheduled",
): Promise<MeetingView | null> => {
  return getCollection(viewType).findOne({ slug })
}

export const byGroup = async (
  groupID: string,
  viewType: MeetingViewType = "scheduled",
): Promise<MeetingView[]> => {
  return getCollection(viewType)
    .find({ groupID: new MongoDB.ObjectId(groupID) })
    .toArray()
}

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

const scheduled = useCollection<MeetingView>("scheduled-meetings")(
  configuredMongoDatabase,
)

const unscheduled = useCollection<MeetingView>("unscheduled-meetings")(
  configuredMongoDatabase,
)

const meetingLanguages = useCollection<ActiveLanguage>("unique-languages-view")(
  configuredMongoDatabase,
)

const meetingTypes = useCollection<ActiveType>("unique-types-view")(
  configuredMongoDatabase,
)

const getCollection = (viewType: MeetingViewType) =>
  viewType === "scheduled" ? scheduled : unscheduled

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
