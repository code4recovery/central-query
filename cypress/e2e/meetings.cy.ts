/** These test are designed to provide data for comparison with OIAA website.
 * Ensure the faked time of the MongoDB server is off. */
import { DateTime } from "luxon"

describe("Basic queries", () => {
  it("provides the next hours worth of meetings when no query string parameters are received.", () => {
    cy.request({
      method: "GET",
      url: "/meetings",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(
        response.body.every((meeting: { timeUTC: string }) => {
          console.log(meeting)
          const meetingTime = DateTime.fromISO(meeting.timeUTC)
          const now = DateTime.utc()
          console.log("The time is now: ", now.toISO())
          const isWithinNextHours = meetingTime <= now.plus({ hours: 1 })
          console.log("Is within next hours: ", isWithinNextHours)
          const isWithinPast10Minutes =
            meetingTime >= now.minus({ minutes: 10 })
          console.log("Is within past 10 minutes: ", isWithinPast10Minutes)
          return isWithinNextHours || isWithinPast10Minutes
        }),
      ).to.be.true
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
  it("handles languages query string parameter with OR logic", () => {
    const reqQuery = {
      languages: JSON.stringify(["en", "es"]),
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
      const langs = JSON.parse(reqQuery.languages)

      // At least one meeting for each language (OR logic)
      const hasEn = meetings.some((meeting: { languages: string[] }) =>
        meeting.languages.includes("en"),
      )
      const hasEs = meetings.some((meeting: { languages: string[] }) =>
        meeting.languages.includes("es"),
      )
      expect(hasEn || hasEs).to.be.true

      // Ensure all meetings have at least one of the requested languages
      expect(
        meetings.every((meeting: { languages: string[] }) =>
          meeting.languages.some((lang) => langs.includes(lang)),
        ),
      ).to.be.true
    })
  })
  it("returns meetings whose name matches nameQuery (case-insensitive, partial match)", () => {
    const reqQuery = {
      nameQuery: "serenity",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body
      console.log(meetings.length)
      expect(meetings.length).to.be.greaterThan(0)
      meetings.forEach((meeting: { name: string }) => {
        expect(meeting.name.toLowerCase()).to.include("serenity")
      })
    })
  })

  it("returns no meetings if nameQuery does not match any meeting name", () => {
    const reqQuery = {
      nameQuery: "unlikelytobefound123",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body.length).to.equal(0)
    })
  })

  it("returns meetings matching nameQuery combined with other filters", () => {
    const reqQuery = {
      nameQuery: "step",
      formats: "D",
      type: "O",
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
      meetings.forEach(
        (meeting: { name: string; formats: string[]; type: string }) => {
          expect(meeting.name.toLowerCase()).to.include("step")
          expect(meeting.formats).to.include("D")
          expect(meeting.type).to.equal("O")
        },
      )
    })
  })
})

describe("Hours parameter validation", () => {
  it("respects valid hours parameter within bounds", () => {
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: { hours: 48 },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
    })
  })

  it("accepts hours at boundary value 1 and returns meetings within 1 hour", () => {
    const now = DateTime.utc()
    const oneHourLater = now.plus({ hours: 1 })

    cy.request({
      method: "GET",
      url: "/meetings",
      qs: { start: now.toISO(), hours: 1 },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body
      expect(meetings.length).to.be.greaterThan(0)

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
            .plus({ days: rtcWeekday < now.weekday ? 7 : 0 })

          return meetingTime >= now.minus({ minutes: 9 }) && meetingTime <= oneHourLater
        }),
      ).to.be.true
    })
  })

  it("accepts hours at boundary value 168 and returns meetings within 168 hours", () => {
    const now = DateTime.utc()
    const maxHoursLater = now.plus({ hours: 168 })

    cy.request({
      method: "GET",
      url: "/meetings",
      qs: { start: now.toISO(), hours: 168 },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body
      expect(meetings.length).to.be.greaterThan(0)

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
            .plus({ days: rtcWeekday < now.weekday ? 7 : 0 })

          return meetingTime >= now.minus({ minutes: 9 }) && meetingTime <= maxHoursLater
        }),
      ).to.be.true
    })
  })

  it("clamps hours above max (999) to fallback (24)", () => {
    const now = DateTime.utc()
    const twentyFourHoursLater = now.plus({ hours: 24 })

    cy.request({
      method: "GET",
      url: "/meetings",
      qs: { start: now.toISO(), hours: 999 },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body

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
            .plus({ days: rtcWeekday < now.weekday ? 7 : 0 })

          return meetingTime >= now.minus({ minutes: 9 }) && meetingTime <= twentyFourHoursLater
        }),
      ).to.be.true
    })
  })

  it("clamps hours below min (0) to fallback (24)", () => {
    const now = DateTime.utc()
    const twentyFourHoursLater = now.plus({ hours: 24 })

    cy.request({
      method: "GET",
      url: "/meetings",
      qs: { start: now.toISO(), hours: 0 },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body

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
            .plus({ days: rtcWeekday < now.weekday ? 7 : 0 })

          return meetingTime >= now.minus({ minutes: 9 }) && meetingTime <= twentyFourHoursLater
        }),
      ).to.be.true
    })
  })
})
