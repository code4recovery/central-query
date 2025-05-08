import { DateTime } from "luxon"

import Logger from "../common/logger.js"
import { RTCRange } from "../endpoint-options.types.js"

export enum Weekdays {
  MONDAY = 1,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
  SUNDAY,
}

export const prevWeekday = {
  0: Weekdays.SUNDAY,
  1: Weekdays.MONDAY,
  2: Weekdays.TUESDAY,
  3: Weekdays.WEDNESDAY,
  4: Weekdays.THURSDAY,
  5: Weekdays.FRIDAY,
  6: Weekdays.SATURDAY,
}

export type PrevWeekday = keyof typeof prevWeekday

export const newWeekday = (previous: PrevWeekday) => prevWeekday[previous]

export const dstAware = (time: string, tz: string) => {
  const localTimeParts = time.split(":")
  const now = DateTime.utc()
  const date = {
    year: now.year,
    month: now.month,
    day: now.day,
    hour: Number(localTimeParts[0]),
    minute: Number(localTimeParts[1]),
  }

  return DateTime.fromObject(date, { zone: tz })
}

export const nextOccurrence = (dayOfWeek: Weekdays, dateTime: DateTime) => {
  const adjustedDayOfWeek = dayOfWeek
  const advance = (adjustedDayOfWeek + (7 - dateTime.get("weekday"))) % 7
  const newOrdinalDate = dateTime.ordinal + advance
  return dateTime.set({ ordinal: newOrdinalDate })
}

const rtcFromTimestamp = (time: DateTime) =>
  time.weekday + ":" + time.toFormat("HH:mm")

export const lowerUpperLimits = (time: string, hours: number) => {
  Logger.debug(`lowerUpperLimits Params: time = ${time}, hours = ${hours}`)
  const rqstTime = DateTime.fromISO(time).toUTC()
  const lower = rqstTime.minus({ minutes: 9 })
  const upper = rqstTime.plus({ hours })
  Logger.debug(
    `lowerUpperLimits set: lower = ${lower.toString()}, upper = ${upper.toString()}`,
  )
  let ranges: RTCRange[] = []
  if (lower.weekday === upper.weekday) {
    ranges = [
      { lowerRTC: rtcFromTimestamp(lower), upperRTC: rtcFromTimestamp(upper) },
    ]
  } else {
    ranges = [
      {
        lowerRTC: rtcFromTimestamp(lower),
        upperRTC: `${lower.weekday}:24:00`,
      },
      {
        lowerRTC: `${upper.weekday}:00:00`,
        upperRTC: rtcFromTimestamp(upper),
      },
    ]
  }

  return ranges
}

const zeroPad = (num: number, places: number) =>
  String(num).padStart(places, "0")

const dayFromOffset = (weekday: number, offset: number) =>
  correctedDay(offset > 0 ? weekday - 1 : weekday)

const correctedDay = (num: number) => {
  if (num === 0) return 7
  if (num === 8) return 1
  return num
}

const hrsMinsFromOffset = (offset: number) => {
  const hourAdj = Math.floor((0 - offset) / 60)
  return {
    localHour: hourAdj < 0 ? hourAdj + 24 : hourAdj,
    localMin: offset % 60,
  }
}

const startParts = (weekday: number, offset: number) => {
  const { localHour, localMin } = hrsMinsFromOffset(offset)
  return {
    day: dayFromOffset(weekday, offset),
    hour: zeroPad(localHour, 2),
    mins: zeroPad(localMin, 2),
  }
}

export const dayLimits = (weekday: number, offset: number) => {
  const { day, hour, mins } = startParts(weekday, offset)
  const endDay = correctedDay(day + 1)
  return [
    {
      lowerRTC: `${day}:${hour}:${mins}`,
      upperRTC: `${day}:24:00`,
    },
    {
      lowerRTC: `${endDay}:00:00`,
      upperRTC: `${endDay}:${hour}:${mins}`,
    },
  ]
}

const dayOffsetFromWeekday = (timeStamp: DateTime, weekday: Weekdays) => {
  const dayOfWeek = timeStamp.weekday
  const offset = weekday - dayOfWeek
  return offset >= 0 ? offset : offset + 7
}

export const convertRTCtoUTC = (rtc: string) => {
  const [rtcWeekDay, hour, mins] = rtc.split(":")
  const now = DateTime.utc()

  const todayAtRTCTime = now.set({
    hour: Number(hour),
    minute: Number(mins),
    second: 0,
    millisecond: 0,
  })

  const hasRTCTimePassedForToday = todayAtRTCTime < now
  const weekday = hasRTCTimePassedForToday
    ? Number(rtcWeekDay) + 7
    : Number(rtcWeekDay)

  return todayAtRTCTime.plus({
    days: dayOffsetFromWeekday(todayAtRTCTime, weekday),
  })
}
