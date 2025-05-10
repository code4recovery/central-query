/** These test are designed to provide data for comparison with OIAA website.
 * Ensure the faked time of the MongoDB server is off. */
import { DateTime } from "luxon"

describe("Basic queries", () => {
  it.only("provides a default the next hours of meetings when not query string parameters are received.", () => {
    cy.request({
      method: "GET",
      url: "/meetings",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(
        response.body.every((meeting: { timeUTC: string }) => {
          const meetingTime = DateTime.fromISO(meeting.timeUTC)
          const now = DateTime.utc()
          const isWithinNextHours = meetingTime <= now.plus({ hours: 1 })
          const isWithinPast10Minutes =
            meetingTime >= now.minus({ minutes: 10 })
          return isWithinNextHours && isWithinPast10Minutes
        }),
      ).to.be.true
      console.log(response.body)
    })
  })
  it("provides the next x=limit meetings. Use to manually compare to OIAA website listing.", () => {
    const reqQuery = {
      limit: 25,
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body).to.have.length(25)
      console.log(response.body)
    })
  })
  it("returns open discussion Big Book meetings.", () => {
    const testFormats = ["D", "B"]
    const testType = "O"
    const reqQuery = {
      formats: JSON.stringify(testFormats),
      type: testType,
    }
    console.log("The query: ", reqQuery)
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body
      console.log(meetings)
      expect(meetings.length).to.be.greaterThan(0)
      expect(
        meetings.every(
          (meeting: { type: string; formats: string[] }) =>
            testFormats.every((format) => meeting.formats.includes(format)) &&
            meeting.type === testType,
        ),
      ).to.be.true
    })
  })
  it("gracefully handles the shift from Sunday (day 7) to Monday (day 1)", () => {
    const reqQuery = {
      start: new Date("2023-09-10T23:45:00Z").toISOString(),
      limit: 25,
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body).to.have.length(25)
    })
  })
  it("reflects types binned into desired categories", () => {
    const reqQuery = {
      limit: 25,
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      response.body.forEach((mtg) => {
        cy.wrap(mtg).should("not.have.property", "types")
      })
    })
  })
  it("provides meetings over the next four hours.", () => {
    const now = DateTime.utc()
    console.log("The time is now: ", now.toISO())
    const fourHoursLater = now.plus({ hours: 4 })
    console.log("Four hours later: ", fourHoursLater.toISO())

    const reqQuery = {
      start: now.toISO(),
      hours: 4,
    }

    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body
      expect(meetings.length).to.be.greaterThan(0)
      console.log(meetings)

      expect(
        meetings.every((meeting: { rtc: string }) => {
          const [rtcWeekday, rtcHour, rtcMinute] = meeting.rtc
            .split(":")
            .map(Number)

          const meetingTime = now
            .set({
              weekday: rtcWeekday,
              hour: rtcHour,
              minute: rtcMinute,
              second: 0,
              millisecond: 0,
            })
            .plus({ days: rtcWeekday < now.weekday ? 7 : 0 }) // Handle week wrap-around

          console.log("Meeting time: ", meetingTime.toISO())

          const isMeetingInFuture = meetingTime >= now.minus({ minutes: 9 })
          const isMeetingWithinFourHours = meetingTime <= fourHoursLater

          console.log("Is meeting in future: ", isMeetingInFuture)
          console.log(
            "Is meeting within four hours: ",
            isMeetingWithinFourHours,
          )

          return isMeetingInFuture && isMeetingWithinFourHours
        }),
      ).to.be.true
    })
  })
  it("handles a single format with more than one character in the value.", () => {
    const reqQuery = {
      formats: "LIT",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body
      expect(meetings.length).to.be.greaterThan(0)
      expect(
        meetings.every((meeting: { formats: string[] }) => {
          console.log(meeting)
          return meeting.formats.includes("LIT")
        }),
      ).to.be.true
    })
  })
  it.skip("provides the next 10 meetings at 0500 PDT that match the expected array.", () => {
    const expectedMeetings = [
      "`As Bill Sees It` Cavan Lunchtime Meeting",
      "1st Things 1st",
      "757 Breakfast Club Online",
      "AA Acceptance and Gratitude",
      "AA Breakfast Club",
      "AA Women Listening to God",
      "AA-Alive",
      "Agnes Water",
      "Castleknock Dublin",
      "Daily reflections",
    ]
    const now = new Date("2023-09-10T05:00:00-07:00")
    const reqQuery = {
      time: now.toISOString(),
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body).to.have.length(10)
      expect(response.body).to.equal(expectedMeetings)
    })
  })
  it.skip("handles more generic queries", () => {
    const reqQuery = {
      weekday: "TUESDAY",
      timezone: "America/New_York",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
    })
  })
})
