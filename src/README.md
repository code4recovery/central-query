# Central Query

## API Definition of Meeting

This API now provides `Meeting` and `Group` interfaces better aligned to the terms used by Meeting Guide and, hopefully, Central.

These should still be considered unstable:

```ts
interface Meeting {
  slug: string
  name: string
  timezone: string
  day: number
  time: string
  duration: Minutes
  start?: DateTime
  end?: DateTime
  conference_provider?: string
  conference_url?: string
  conference_url_notes?: string
  conference_phone?: string
  conference_phone_notes?: string
  notes?: string[]
  languages: string[]
  features: Feature[]
  formats: Format[]
  type: Type
  communities: Community[]
  groupID: string
  tags: string[]
  search: string
  edit_url?: string
}
```

```ts
interface Group {
  name: string
  recordID: string
  accountID: string
  createdAt: Date
  updatedAt: Date
  email?: string
  website?: string
}
```

## Endpoints

### /meetings/next

Gets the next hour of meetings based on the UTC time when the request is received. The controller limits the fetch to 100 meetings.

To Do:

- [ ] If the fetched results are <10 meetings, re-fetch for the next two hours.

### /meetings/:slug

Uses the slug to determine and provide the associated group details.

==================

*\*\*The remainder of this document remains for historical context. It *may\* be of use to help understand the motivation and challenge behind this project. It is no longer being updated and might be removed in the future.

The current README.md is in the projects' root directory.\*\*\*\

## Fixing Time for Recovery

## Problem

Recovery meetings aren't tied to specific dates, instead they are defined by a day of the week (for example, Monday) and a local time (say, 5pm). Meetings today are managed locally through a spreadsheet, a website focused on the local community and nearby areas, or through a tool like the 12-Step-Meeting-List plugin. Regardless, all of the pieces are in the same timezone and the ordering of meetings is trivial.

An exception to this rule has been online or telephone meetings that people around the globe can attend. The number of these occurring every day have exploded since COVID. An effective system to manage and provide the [Online Intergroup](https://aa-intergroup.org/) meeting lists requires knowing meeting days, times and timezones, both of the meeting (host) and for the attendee (managed by local computer). Observance of daylight savings time (DST) by some parts of the world, and not other, and myriad offset adjustments (30, 45, 60, 90 minutes) increases the complexity even more.

Because of how meeting data is viewed, and the timezone/DST complications, the solution for this has been to record basic meeting details (i.e., day of the week, local time, timezone) in a database, and then load the entire file to the client (user) for sorting and filtering locally. This works reasonably well with a few hundred meetings, but as the number of meetings being managed grows significantly, performance suffers and transfer costs of the JSON file increase. Currently, the total data transfer of the Online Intergroup's set of data is pushing 3TB/month.

One potential solution is to take advantage of server-side processing to sort and filter meetings so that only the relevant set is transferred to the client. To accomplish this, we need a consistent way (think UTC/Zulu) to sort the data (essential to present the user with the next X meetings matching criteria Y and Z) regardless of timezone and daylight savings time observance at the host's location. It turns out, this is hard:

| Name | Time   | TZ                 | Offset <br> non-DST | Offset <br> DST |
| :--- | :----- | :----------------- | :------------------ | :-------------- |
| E1   | 6:30pm | America/New_York   | -5                  | -4              |
| E2   | 11pm   | Atlantic/Reykjavik | 0                   | 0               |

[Note] The Atlantic/Reykjavik timezone follows UTC without observing DST.

First question: Was DST in effect when the E1 was entered? From the local view of the world, 6:30pm is 6:30pm regardless of whether or not DST is in effect. The very next question is whether or not DST is in effect when the meeting needs to be sorted?

The answers are crucial because we need to use a UTC-like timestamp as the basis for sorting meetings on the server. Assume both meetings were entered on March 1, 2023. The UTC time for E1 is 18:30 _EST_ + 5 hours = 23:30Z. In sorting the meetings on March 2, the order would be E2, then E1. So let's capture UTC in the dataset.

| Name | Time   | TZ                 | Offset <br> non-DST | Offset <br> DST | UTC                           |
| :--- | :----- | :----------------- | :------------------ | :-------------- | :---------------------------- |
| E1   | 6:30pm | America/New_York   | -5                  | -4              | 2023-03-01T23:30:00.000-00:00 |
| E2   | 11pm   | Atlantic/Reykjavik | 0                   | 0               | 2023-03-01T23:00:00.000-00:00 |

Splendid. But wait! On March 31st, The meeting in New York is now held at 6:30pm **EDT** (i.e., DST is in effect and the correct offset should be -4). The meeting time, relative to host locations that did not shift to DST in the US (i.e., Phoenix) should be listed an hour earlier to still be 6:30pm. During DST, the correct UTC time for E1 _should_ be 22:30Z, and the sorted order E1 followed by E2.

Possible solutions discussed so far have include some form or rewriting the database every few hours to update the recorded UTC of each meeting. This sounds expensive.

I may have developed a solution that involves MongoDB Views and a relatively new feature their database engine provides.

## Experiment

MongoDB provides the [`$hour`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/hour/) expression for use in the [Aggregation feature](https://www.mongodb.com/docs/manual/reference/operator/aggregation/). Prior to my discovery of this, my thinking had been to set up a collection that would track daylight savings time implementation globally, then use `$lookup`'s to determine and adjust the normalized time of a particular meeting during aggregation for a defined [View](https://www.mongodb.com/docs/manual/core/views/). It turns out, this solution may be significantly easier.

If a timestamp noting the effective first occurrence of a meeting is recorded in the database, the `$hour` expression can be used in a created View to return the hour portion adjusted for daylight savings time. Basic example:

| DST in <br> effect | Code                                                                                                          | Output |
| :----------------- | :------------------------------------------------------------------------------------------------------------ | :----- |
| Yes                | <pre>"$hour": { <br> &nbsp;date: new Date("August 14, 2023Z"), <br> &nbsp;timezone: "America/New_York" <br>}  | 20     |
| No                 | <pre>"$hour": { <br> &nbsp;date: new Date("November 14, 2023Z"),<br> &nbsp;timezone: "America/New_York" <br>} | 19     |

`new Date()` without a time uses midnight Zulu, and so `-4` is the correct offset for EDT and `-5` for EST.

We can use our current timestamp `new Date()` and the original timestamp reflecting the first occurrence of the meeting to generate an adjusted UTC.

Non-optimized code for the aggregation pipeline, probably an [`$addFields` expression](https://www.mongodb.com/docs/v7.0/reference/operator/aggregation/addFields/).

```json
{
  adjustedUTC: { $dateFromParts: {
    "year": ISODate().getUTCFullYear(),
    "month": { $add: [ISODate().getUTCMonth(), 1]},
    "day": ISODate().getUTCDate(),
    "hour": { $hour:
      {
        date: "$effectiveDateTimeUTC",
        timezone: "$timezone"
      }
    },
    "minute": { $minute: "$effectiveDateTimeUTC"},
    "timezone": "$timezone"
  }}
}
```

But, we don't want the entire date from the timestamp, as sorting by date isn't accurate for our purpose. What we do want is the day of the week for this meeting to preface the adjusted UTC time. We simply want something sortable that includes the day of the week: `d:H:M`. And we might call this Coordinated Recovery Time (RTC) :-)

As long as we've recorded the effective UTC of the first meeting in the series, we can use this to determine the correct UTC day of the week, and then build RTC for sorting. When a meeting is first saved, `effectiveUTC` can be calculated to match the date of the first meeting and its time in UTC.Some examples:

| TZ               | Time  | Day    | Date Entered | `effectiveUTC`                |
| :--------------- | :---- | :----- | :----------- | :---------------------------- |
| America/New_York | 15:00 | Sunday | Mar 1, 2023  | 2023-03-05T20:00:00.000-00:00 |
| America/New_York | 22:00 | Sunday | Mar 1, 2023  | 2023-03-06T03:00:00.000-00:00 |

#### Filters/Options

```json
{
  limit: number
}
```
