import { Err, Ok } from "ts-results-es"

import Logger from "./common/logger.js"
import {
  ActiveCommunity,
  ActiveFeature,
  ActiveFormat,
  COMMUNITIES,
  Community,
  Feature,
  FEATURES,
  Format,
  FORMATS,
  Type,
  TYPE,
} from "./common/types.js"
import { MeetingsOptions } from "./endpoint-options.types.js"
import { Group, GroupDetails, Meeting } from "./endpoints.types.js"
import * as groupStore from "./storage/group.mongodb.service.js"
import * as meetingStore from "./storage/meeting.mongodb.service.js"
import {
  ActiveLanguage,
  ActiveType,
  MeetingView,
} from "./storage/storage.types.js"
import { categorizedMeeting, intersection } from "./utils/categorizeMeeting.js"
import { convertRTCtoUTC, lowerUpperLimits } from "./utils/dates.js"
import { pipelineFromQuery } from "./utils/pipelineFromQuery.js"

const preparedMeetings = (meetings: MeetingView[]): Meeting[] =>
  meetings.map(categorizedMeeting).map(({ groupID, ...rest }) => ({
    ...rest,
    groupID: groupID.toString(),
    timeUTC: convertRTCtoUTC(rest.rtc).toString(),
  }))

export const getMeetings = async (
  options: MeetingsOptions,
): Promise<Ok<Meeting[]>> => {
  Logger.debug(`Time is now: ${options.start}`)
  Logger.debug(`Hours is: ${options.hours}`)
  Logger.debug(`Getting meetings with options: ${JSON.stringify(options)}`)
  const limits = options.start
    ? lowerUpperLimits(options.start, options.hours)
    : []
  Logger.debug(`Limits: ${JSON.stringify(limits)}`)
  const pipeline = pipelineFromQuery({
    ...options,
    rtcRanges: limits,
  })
  Logger.debug(`Pipeline: ${JSON.stringify(pipeline)}, ${typeof pipeline}`)
  const result = await meetingStore.query(pipeline)
  Logger.debug(`meetingStore fetch ${result.length} meetings.`)

  return Ok(preparedMeetings(result))
}

export const getFacets = async (): Promise<
  Ok<{
    categories: {
      communities: ActiveCommunity[]
      features: ActiveFeature[]
      formats: ActiveFormat[]
      type: ActiveType[]
    }
    languages: ActiveLanguage[]
  }>
> => {
  Logger.debug("Getting facets (categories and languages)")
  const [activeTypes, languages] = await Promise.all([
    meetingStore.getActiveTypes(),
    meetingStore.getActiveLanguages(),
  ])

  const categories = {
    communities: activeTypes
      .filter((t) => intersection([t.code], [...COMMUNITIES]).length > 0)
      .map((t) => ({
        code: t.code as Community,
        desc: t.desc,
      })) as ActiveCommunity[],
    features: activeTypes
      .filter((t) => intersection([t.code], [...FEATURES]).length > 0)
      .map((t) => ({
        code: t.code as Feature,
        desc: t.desc,
      })) as ActiveFeature[],
    formats: activeTypes
      .filter((t) => intersection([t.code], [...FORMATS]).length > 0)
      .map((t) => ({ code: t.code as Format, desc: t.desc })) as ActiveFormat[],
    type: activeTypes
      .filter((t) => intersection([t.code], [...TYPE]).length > 0)
      .map((t) => ({ code: t.code as Type, desc: t.desc })) as ActiveType[],
  }

  Logger.debug(
    `Facets result: categories=${JSON.stringify(categories)}, languages=${
      languages.length
    }`,
  )

  return Ok({
    categories,
    languages,
  })
}

export const getBySlug = async (
  slug: string,
): Promise<Ok<Meeting> | Err<string>> => {
  Logger.debug(`Getting meeting with slug ${slug}`)
  const result = await meetingStore.bySlug(slug)
  if (!result) {
    Logger.error(`Meeting with slug ${slug} not found`)
    return Err("Meeting not found")
  }
  Logger.debug(`Meeting with slug ${slug}: ${JSON.stringify(result)}`)

  const meeting = {
    ...categorizedMeeting(result),
    timeUTC: convertRTCtoUTC(result.rtc).toString(),
    groupID: result.groupID.toString(),
  } as Meeting

  return Ok(meeting)
}

export const getRelatedGroupInfo = async (slug: string) => {
  const { err, val } = await getBySlug(slug)
  if (err) {
    Logger.error(`Meeting with slug ${slug} not found`)
    return Err("Meeting not found")
  }
  const meeting = val as Meeting
  const groupID = meeting.groupID.toString()
  const groupInfo = await groupStore.byId(groupID)
  Logger.debug(
    `Group info for meeting with slug ${slug}: ${JSON.stringify(
      groupInfo,
    )} using groupID ${groupID}`,
  )
  const groupMeetings = await meetingStore.byGroup(groupID)
  Logger.debug(
    `Group meetings for group with ID ${groupID}: ${JSON.stringify(
      groupMeetings,
    )}`,
  )

  return Ok({
    groupInfo: groupInfo as Group, // ToDo: Confirm that `_id` should be removed or if not, add to the interface
    groupMeetings: preparedMeetings(groupMeetings) as Meeting[],
  } as GroupDetails)
}

/** The following functions are not fully implemented yet. */
// export const getDay = async (options: DayOptions) => {
//   Logger.debug(`Getting all meetings for day ${options.weekday}`)
//   const limits = dayLimits(options.weekday, options.offset)
//   const result = await meetingStore.query(
//     pipelineFromQuery({
//       rtcRanges: limits,
//     }),
//   )
//   Logger.debug(`meetingStore fetch ${result.length} meetings.`)
//   return Ok(result)
// }

// export const getByGroup = async (groupID: string) => {
//   Logger.debug(`Getting all meetings for group ${groupID}`)
//   const result = await meetingStore.byGroup(groupID)
//   if (!result) {
//     Logger.error(`Group with ID ${groupID} not found`)
//     return Err("Group not found")
//   }
//   Logger.debug(`Meetings for group ${groupID}: ${JSON.stringify(result)}`)
//   return Ok(result)
// }
